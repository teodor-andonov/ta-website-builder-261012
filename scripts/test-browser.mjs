// Optional LOCAL browser regression suite — no GitHub Actions, screenshots or network.
// Requires Chrome or Chromium installed. Set CHROME to the executable path if needed.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,writeFile,rm,stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,dirname,extname,sep,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dist=join(root,'dist');
const candidateBrowsers=[
 process.env.CHROME,
 ...(process.platform==='win32' ? [
  join(process.env['PROGRAMFILES']||'C:\\Program Files','Google','Chrome','Application','chrome.exe'),
  join(process.env['PROGRAMFILES(X86)']||'C:\\Program Files (x86)','Google','Chrome','Application','chrome.exe'),
  join(process.env.LOCALAPPDATA||'C:\\Users','Google','Chrome','Application','chrome.exe'),
  join(process.env['PROGRAMFILES']||'C:\\Program Files','Microsoft','Edge','Application','msedge.exe')
 ] : ['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']),
 'chromium','google-chrome','chromium-browser'
].filter(Boolean);
function run(program,args,env=process.env,timeout=120000){
 return new Promise((done,fail)=>{
  const child=spawn(program,args,{cwd:root,env,stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='',finished=false;
  const limit=setTimeout(()=>{child.kill();if(!finished)fail(Error('Browser test timed out: '+program))},timeout);
  child.stdout.on('data',part=>stdout+=part.toString());
  child.stderr.on('data',part=>stderr+=part.toString());
  child.on('error',error=>{if(!finished){finished=true;clearTimeout(limit);fail(error)}});
  child.on('exit',code=>{if(!finished){finished=true;clearTimeout(limit);code===0?done(stdout):fail(Error('Browser command failed: '+program+' ('+code+')\n'+stderr.slice(-1500)+'\n'+stdout.slice(-800)))}})
 });
}
async function chooseBrowser(){
 for(const exe of candidateBrowsers){
  if(exe.includes('/')||exe.includes('\\')){if(existsSync(exe))return exe;continue;}
  try{await run(exe,['--version'],process.env,5000);return exe}catch{}
 }
 throw Error('No local Chrome/Chromium found. Install Chrome or set CHROME=/path/to/browser');
}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const rel=decodeURIComponent(url.pathname);
  if(rel.includes('\\')||rel.includes('\0'))throw Error('Invalid path');
  let file=resolve(dist,'.'+rel);
  if(file!==dist&&!file.startsWith(dist+sep))throw Error('Out of bounds');
  if((await stat(file)).isDirectory())file=join(file,'index.html');
  const bytes=await readFile(file);
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found')}
});
let listening=false;
try{
 const chrome=await chooseBrowser();
 console.log('Browser: '+chrome);
 await run(process.execPath,['src/build.mjs']);
 await run(process.execPath,['scripts/browser-dom-check.mjs']);
 await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)});
 listening=true;
 const port=server.address().port;
 const html=await run(chrome,[
  '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--virtual-time-budget=3500','--window-size=1400,850','--dump-dom',
  'http://127.0.0.1:'+port+'/__layoutcheck.html'
 ],process.env,30000);
 if(!html.includes('<pre id="ta-dom-result">TA_DOM_OK')){
  await writeFile('browser-dom-failure-local.log',html);
  throw Error('Public page DOM checks failed: '+(html.match(/<pre id="ta-dom-result">([^<]*)/)?.[1]||'No result; see browser-dom-failure-local.log'));
 }
 console.log('TA_DOM_OK local browser');
 await run(process.execPath,['scripts/real-wheel-check.mjs'],{...process.env,CHROME:chrome});
 console.log('TA_WHEEL_OK local browser');
 await run(process.execPath,['scripts/m8-structure-check.mjs'],{...process.env,CHROME:chrome});
 console.log('M8_STRUCTURE_OK local browser');
 console.log('LOCAL_BROWSER_TESTS_OK');
}catch(error){console.error(error.message);process.exitCode=1}
finally{
 if(listening)await new Promise(ok=>server.close(ok));
 await rm(join(dist,'__layoutcheck.html'),{force:true}).catch(()=>{});
}
