/**
 * M17 local visual review capture — no publishing, no external network.
 * Produces desktop-only PNGs and a hash/dimension manifest.
 * Narrow/mobile layouts are not a separate V2 visual acceptance target.
 * A human still needs to inspect the images; successful capture != approval.
 */
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join,dirname,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dist=join(root,'dist');
const stamp=()=>{
 const d=new Date(),f=n=>String(n).padStart(2,'0');
 return String(d.getFullYear()).slice(-2)+f(d.getMonth()+1)+f(d.getDate())+'-'+f(d.getHours())+f(d.getMinutes());
};
export const VISUAL_REVIEW_ROUTES=[
 ['home','/'],['work','/work/'],['journal','/posts/'],
 ['project','/work/balkan-house/'],['post','/posts/designing-with-code/']
];
export const VISUAL_REVIEW_VIEWPORTS=[['desktop',1440,900]];
function findBrowser(){
 const candidates=[process.env.CHROME,
  '/usr/bin/chromium','/usr/bin/google-chrome','chromium','google-chrome',
  ...(process.platform==='win32'?[join(process.env.PROGRAMFILES||'C:\\Program Files','Google','Chrome','Application','chrome.exe')]:[])
 ].filter(Boolean);
 for(const binary of candidates){
  if((binary.includes('/')||binary.includes('\\'))&&existsSync(binary))return binary;
  const version=spawnSync(binary,['--version'],{encoding:'utf8',timeout:5000});
  if(version.status===0)return binary;
 }
 throw Error('Chrome/Chromium not found; set CHROME to the executable path');
}
function capture(binary,args,timeout=45000){
 return new Promise((ok,fail)=>{
  const child=spawn(binary,args,{cwd:root,stdio:['ignore','pipe','pipe']});
  let stderr='',done=false;
  const limit=setTimeout(()=>{child.kill();if(!done){done=true;fail(Error('Chromium screenshot timed out'))}},timeout);
  child.stderr.on('data',part=>stderr=(stderr+part.toString()).slice(-1500));
  child.on('error',e=>{if(!done){done=true;clearTimeout(limit);fail(e)}});
  child.on('exit',code=>{if(!done){done=true;clearTimeout(limit);code===0?ok():fail(Error('Chromium screenshot failed: '+code+' '+stderr))}});
 });
}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml',
 '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://127.0.0.1').pathname;
  if(pathname.includes('\\')||pathname.includes('\0'))throw Error('Unsafe route');
  let target=resolve(dist,'.'+decodeURIComponent(pathname));
  if(target!==dist&&!target.startsWith(dist+sep))throw Error('Outside static folder');
  if((await stat(target)).isDirectory())target=join(target,'index.html');
  const bytes=await readFile(target);
  res.writeHead(200,{'Content-Type':mime[extname(target)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found')}
});
export async function captureVisualReview({
 output=join(root,'release','review',stamp()+'_m17-visual'),
 build=true
}={}){
 if(build){
  const result=spawnSync(process.execPath,['src/build.mjs'],{cwd:root,encoding:'utf8',timeout:120000,
   env:{...process.env,TA_BASE_PATH:'/',TA_PUBLIC_ORIGIN:''}});
  if(result.status!==0)throw Error('Static build failed before screenshots: '+(result.stderr||result.stdout||result.error?.message));
 }
 const browser=findBrowser();
 await mkdir(output,{recursive:true});
 const screenshots=[];
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
 try{
  const port=server.address().port;
  for(const [label,route] of VISUAL_REVIEW_ROUTES)for(const [viewport,width,height] of VISUAL_REVIEW_VIEWPORTS){
   const filename=stamp()+'_m17-'+label+'-'+viewport+'.png',filepath=join(output,filename);
   await capture(browser,[
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--hide-scrollbars','--force-device-scale-factor=1','--virtual-time-budget=2500',
    '--window-size='+width+','+height,'--screenshot='+filepath,
    'http://127.0.0.1:'+port+route
   ]);
   const bytes=await readFile(filepath);
   if(bytes.length<1000||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')
    throw Error('Missing/invalid PNG: '+filename);
   screenshots.push({file:filename,route,viewport,requested:[width,height],
    actual:[bytes.readUInt32BE(16),bytes.readUInt32BE(20)],bytes:bytes.length,
    sha256:createHash('sha256').update(bytes).digest('hex')});
  }
 }finally{await new Promise(ok=>server.close(ok))}
 const manifest={kind:'M17 visual review captures',createdAt:new Date().toISOString(),
  status:'PENDING HUMAN INSPECTION',visualScope:'desktop only',
  smallerScreens:'Same proportional composition; separate narrow/mobile visual review deferred',
  source:'locally built static website',screenshots};
 await writeFile(join(output,'review-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 return {output,captures:screenshots.length,status:manifest.status};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log('M17_VISUAL_CAPTURE '+JSON.stringify(await captureVisualReview()))}
 catch(error){console.error(error.message);process.exitCode=1}
}
