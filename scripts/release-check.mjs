/**
 * M17 LOCAL release audit (not a deploy/publish/merge command).
 * Exercises real Node tests, Chromium authoring tests, snapshots, restore,
 * two indexing modes, root/Pages paths, and independently verified ZIPs.
 * Keeps live content intact: restored data and release fixtures use a temp dir.
 */
import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,mkdtemp,readdir,rm,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validate} from '../src/model.mjs';
import {collectPages} from '../src/render.mjs';
import {createSnapshot,verifySnapshot,restoreSnapshot} from './site-snapshot.mjs';
import {packageSite} from './package-site.mjs';
import {verifySitePackage} from './verify-site-package.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const stamp=()=>{
 const d=new Date(),p=n=>String(n).padStart(2,'0');
 return String(d.getFullYear()).slice(-2)+p(d.getMonth()+1)+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes());
};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const pathExists=async p=>Boolean(await stat(p).catch(()=>null));
const noIndex='<meta name="robots" content="noindex, nofollow">';
const yesIndex='<meta name="robots" content="index, follow">';
function run(label,args,env,timeout=180000){
 const outcome=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout,maxBuffer:12*1024*1024,env});
 if(outcome.error||outcome.status!==0){
  const diagnostic=((outcome.stderr||'')+'\n'+(outcome.stdout||'')).slice(-4500);
  throw Error(label+' failed ('+(outcome.status??'spawn')+'): '+(outcome.error?.message||diagnostic));
 }
 return {command:'node '+args.join(' '),output:((outcome.stdout||'')+'\n'+(outcome.stderr||'')).slice(-2200)};
}
function ensure(condition,message){if(!condition)throw Error(message)}
export function routeFile(route){
 ensure(/^\/(?:[a-z0-9-]+\/)*$/.test(route),'Unsafe generated route: '+route);
 return route==='/'?'index.html':route.slice(1)+'index.html';
}
export async function checkOutput(dir,data,{base='/',indexing=false,origin=null}={}){
 const routes=collectPages(data).map(p=>p.route),required=new Set(routes.map(routeFile));
 const mode=indexing?yesIndex:noIndex;
 for(const name of required){
  const html=await readFile(path.join(dir,name),'utf8');
  ensure(html.includes(mode),'Wrong indexing metadata: '+name);
  ensure(html.includes('href="'+base+'site.css"'),'Incorrect stylesheet base in '+name);
  if(origin)ensure(html.includes('rel="canonical"'),'Missing canonical tag: '+name);
  // Verify local links & asset paths in the built bytes, not the source DOM.
  for(const [,attribute,url] of html.matchAll(/\b(href|src|poster)="([^"]+)"/g)){
   if(url.startsWith('#')||/^(?:https?:|mailto:|tel:|data:)/i.test(url))continue;
   if(!url.startsWith('/'))continue;
   ensure(url.startsWith(base),'Wrong base prefix '+name+' -> '+url);
   const rest=url.slice(base.length).split(/[?#]/,1)[0];
   if(!rest)continue;
   const target=path.join(dir,rest.endsWith('/')?rest+'index.html':rest);
   ensure(await pathExists(target),'Broken '+attribute+' in '+name+': '+url);
  }
 }
 const sitemap=await pathExists(path.join(dir,'sitemap.xml'));
 const robots=await readFile(path.join(dir,'robots.txt'),'utf8');
 ensure(indexing&&origin? sitemap:!sitemap,'Unexpected sitemap for selected publication mode');
 ensure(robots.includes('Allow: /'),'Crawler accessibility changed');
 if(indexing&&origin)ensure(robots.includes('Sitemap: '+origin+'/sitemap.xml'),'Incorrect sitemap origin');
 else ensure(!robots.includes('Sitemap:'),'Unexpected robots sitemap');
 for(const privatePath of ['studio','content','src','test','backups']){
  ensure(!(await pathExists(path.join(dir,privatePath))),'Private files in static output: '+privatePath);
 }
 return {pages:required.size,robots:indexing?'index, follow':'noindex, nofollow',
   base,origin,sitemap,verifiedLinks:true};
}
function contentSnapshot(data){
 return {pages:data.pages.length,records:data.collections.reduce((n,c)=>n+c.records.length,0),
  assets:data.assets.length,routes:collectPages(data).length};
}
export async function runReleaseCheck({browser=true,outputRoot=path.join(root,'release','reports')}={}){
 const started=new Date().toISOString(),id=stamp(),steps=[],report={
  kind:'TA V2 M17 local release audit',started,mode:browser?'full':'partial-no-browser',
  status:'INCOMPLETE',visualReview:'REQUIRES HUMAN SIGNOFF',steps
 };
 const record=(name,fn)=>fn().then(result=>{steps.push({name,status:'PASS',result});return result})
  .catch(error=>{steps.push({name,status:'FAIL',error:String(error.message||error)});throw error});
 const work=await mkdtemp(path.join(tmpdir(),'ta-m17-release-'));
 let problem=null;
 try{
  const data=await record('validate live JSON',async()=>{
   const json=await readFile(path.join(root,'content','site.json'),'utf8');
   const value=validate(JSON.parse(json));
   return {sha256:sha(Buffer.from(json)),...contentSnapshot(value)};
  });
  await record('real Node regression suite',async()=>{
   const files=(await readdir(path.join(root,'test'))).filter(x=>x.endsWith('.test.mjs')).sort()
     .map(name=>path.join('test',name));
   ensure(files.length>=10,'Repository test suite is unexpectedly incomplete');
   return {...run('Node suite',['--test',...files],process.env,300000),files:files.length};
  });
  if(browser)await record('real local Chromium authoring/DOM suite',async()=>
    run('Browser suite',['scripts/test-browser.mjs'],process.env,300000));
  else steps.push({name:'real local Chromium authoring/DOM suite',status:'SKIPPED',
    reason:'Explicit --no-browser; release cannot be fully accepted'});
  const recovered=await record('snapshot + checksum verification + isolated restore',async()=>{
   const source=(await readFile(path.join(root,'content','site.json')));
   const snapshot=await createSnapshot(root,path.join(work,'backups'));
   await verifySnapshot(snapshot.path);
   const restored=path.join(work,'restored');
   await restoreSnapshot(snapshot.path,restored);
   ensure(sha(source)===sha(await readFile(path.join(restored,'content','site.json'))),
     'Restored JSON does not match live source bytes');
   const rebuilt=validate(JSON.parse(await readFile(path.join(restored,'content','site.json'),'utf8')));
   ensure(contentSnapshot(rebuilt).routes===data.routes,'Restored routes differ');
   await verifySnapshot(snapshot.path);
   return {snapshot,root:restored,summary:contentSnapshot(rebuilt)};
  });
  const baseData=validate(JSON.parse(await readFile(path.join(recovered.root,'content','site.json'),'utf8')));
  // Indexing changes affect the restored copy only; live content is untouched.
  baseData.site.publishing={...(baseData.site.publishing||{}),indexing:false};
  await writeFile(path.join(recovered.root,'content','site.json'),JSON.stringify(baseData,null,2)+'\n');
  const rootDist=path.join(work,'noindex-dist');
  await record('root-hosted noindex build and link scan',async()=>{
   const env={...process.env,TA_DATA_ROOT:recovered.root,TA_OUTPUT_DIR:rootDist,
     TA_BASE_PATH:'/',TA_PUBLIC_ORIGIN:''};
   run('Root build',['src/build.mjs'],env);
   return checkOutput(rootDist,baseData);
  });
  await record('host-independent noindex ZIP + hash verification',async()=>{
   const destination=path.join(work,'noindex.zip');
   const packed=await packageSite({dist:rootDist,destination,build:false});
   const verified=await verifySitePackage(destination);
   ensure(verified.valid&&!verified.indexable,'Noindex ZIP verification failed');
   return {packed,verified};
  });
  await record('GitHub Pages project-subpath build and link scan',async()=>{
   const base='/ta-website-builder-261012/',dist=path.join(work,'pages-dist');
   run('Pages build',['src/build.mjs'],{...process.env,TA_DATA_ROOT:recovered.root,
     TA_OUTPUT_DIR:dist,TA_BASE_PATH:base,TA_PUBLIC_ORIGIN:''});
   return checkOutput(dist,baseData,{base});
  });
  const indexed={...baseData,site:{...baseData.site,publishing:{...baseData.site.publishing,indexing:true}}};
  validate(indexed);
  await writeFile(path.join(recovered.root,'content','site.json'),JSON.stringify(indexed,null,2)+'\n');
  const indexedDist=path.join(work,'indexable-dist'),origin='https://ta-studio.com';
  await record('indexable custom-domain build, canonical URLs and sitemap',async()=>{
   run('Indexable build',['src/build.mjs'],{...process.env,TA_DATA_ROOT:recovered.root,
     TA_OUTPUT_DIR:indexedDist,TA_BASE_PATH:'/',TA_PUBLIC_ORIGIN:origin});
   return checkOutput(indexedDist,indexed,{indexing:true,origin});
  });
  await record('indexable ZIP + manifest/content verification',async()=>{
   const destination=path.join(work,'indexable.zip');
   const packed=await packageSite({dist:indexedDist,destination,build:false});
   const verified=await verifySitePackage(destination);
   ensure(verified.valid&&verified.indexable,'Indexable ZIP verification failed');
   return {packed,verified};
  });
  await record('snapshot/source immutability',async()=>{
   ensure(sha(await readFile(path.join(root,'content','site.json')) )===data.sha256,
     'Live JSON changed during release validation');
   await verifySnapshot(recovered.snapshot.path);
   return {liveContentUnchanged:true,sourceSnapshotStillValid:true};
  });
  report.status=browser?'AUTOMATED_CHECKS_PASSED_VISUAL_SIGNOFF_PENDING':'PARTIAL_BROWSER_SKIPPED';
 }catch(error){problem=error;report.status='FAILED';report.error=String(error.message||error)}
 finally{
  report.completed=new Date().toISOString();
  try{
   await mkdir(outputRoot,{recursive:true});
   const basename=id+'_m17-release-audit.json';
   const destination=path.join(outputRoot,basename);
   await writeFile(destination,JSON.stringify(report,null,2)+'\n');
   console.log('M17_AUDIT_REPORT '+destination);
  }catch(error){problem??=error;console.error('Audit report write failed: '+error.message)}
  await rm(work,{recursive:true,force:true});
 }
 if(problem)throw problem;
 return report;
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 try{
  const browser=!process.argv.includes('--no-browser');
  const report=await runReleaseCheck({browser});
  console.log('M17_AUDIT_STATUS '+report.status);
  console.log('M17_AUTOMATED_STEPS '+report.steps.filter(x=>x.status==='PASS').length);
  if(!browser)process.exitCode=2; // a deliberate partial audit cannot mark release ready
 }catch(error){console.error('M17_AUDIT_FAILED '+error.message);process.exitCode=1}
}
