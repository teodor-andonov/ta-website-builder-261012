// Browser end-to-end test for the local visual grid editor. Uses a disposable
// copy of site.json: neither the user's content nor GitHub Pages is modified.
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,copyFile,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

const root=resolve('.');
const tmp=await mkdtemp(join(tmpdir(),'ta-structure-editor-'));
const contentRoot=join(tmp,'data'),chromeData=join(tmp,'chrome');
await mkdir(join(contentRoot,'content'),{recursive:true});
await copyFile(join(root,'content','site.json'),join(contentRoot,'content','site.json'));
const port=5274;
const server=spawn(process.execPath,['src/server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),TA_DATA_ROOT:contentRoot},stdio:'ignore'});
let chrome,ws;
try{
 let ready=false;
 for(let i=0;i<80;i++){
  if(server.exitCode!==null)throw Error('Local dev server exited');
  try{const response=await fetch('http://127.0.0.1:'+port+'/api/data');if(response.ok){ready=true;break;}}catch{}
  await sleep(100);
 }
 if(!ready)throw Error('Could not start local Content Studio server');
 chrome=spawn(process.env.CHROME||'chromium',['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-allow-origins=*','--remote-debugging-port=0','--window-size=1550,1000','--user-data-dir='+chromeData,'http://127.0.0.1:'+port+'/'],{stdio:'ignore'});
 let debugPort;
 for(let i=0;i<100;i++){
  try{debugPort=Number((await readFile(join(chromeData,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{await sleep(100);}
 }
 if(!debugPort)throw Error('Chrome DevTools did not start');
 let target;
 for(let i=0;i<80;i++){
  const tabs=await (await fetch('http://127.0.0.1:'+debugPort+'/json')).json();
  target=tabs.find(x=>x.type==='page'&&x.url.includes('127.0.0.1:'+port));
  if(target)break;await sleep(100);
 }
 if(!target)throw Error('Content Studio tab missing');
 ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((ok,no)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',no,{once:true})});
 let nextId=0;const waits=new Map();
 ws.addEventListener('message',event=>{
   const message=JSON.parse(event.data);
   if(message.id&&waits.has(message.id)){
    const {ok,no}=waits.get(message.id);waits.delete(message.id);
    message.error?no(Error(JSON.stringify(message.error))):ok(message.result);
   }
 });
 const command=(method,params={})=>new Promise((ok,no)=>{
  const id=++nextId;waits.set(id,{ok,no});ws.send(JSON.stringify({id,method,params}));
 });
 const evaluate=async expression=>{
  const v=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(v.exceptionDetails)throw Error('Runtime exception: '+JSON.stringify(v.exceptionDetails).slice(0,1500));
  return v.result.value;
 };
 await command('Page.enable');await command('Runtime.enable');
 let loaded=false;
 for(let i=0;i<100;i++){
  loaded=await evaluate('Boolean(window.__TA_STUDIO__&&document.querySelector("#saved")?.textContent.includes("LOADED"))');
  if(loaded)break;
  await sleep(100);
 }
 if(!loaded)throw Error('Studio did not load');
 await evaluate("window.__TA_STUDIO__.navigate('page','home'); true");
 const before=await evaluate("(()=>{const pane=document.querySelector('#structurePane');const app=document.querySelector('#studioApp');return {open:app.classList.contains('structure-open'),rows:pane.querySelectorAll('.structure-select').length,hasHome:!!pane.querySelector('[data-id=\"m6-hero\"]'),columns:getComputedStyle(app).gridTemplateColumns.split(' ').length};})()");
 if(!before.open||before.rows<20||!before.hasHome||before.columns!==4)throw Error('Four-panel tree not rendered: '+JSON.stringify(before));
 const treeSelect=await evaluate("(()=>{const x=document.querySelector('#structurePane [data-act=\"select-node\"][data-id=\"m6-hero\"]');if(!x)return false;x.click();return true;})()");
 if(!treeSelect)throw Error('Hero Card tree selection failed');
 const selected=await evaluate("(()=>{const hero=document.querySelector('.editor-shell [data-node-id=\"m6-hero\"]');return {chosen:!!hero?.classList.contains('chosen'),outline:hero?getComputedStyle(hero).outlineColor:'none',path:document.querySelector('.selection-path')?.textContent,active:document.querySelector('#structurePane .structure-row.is-active [data-id=\"m6-hero\"]')!==null};})()");
 if(!selected.chosen||!selected.active||!selected.path?.includes('hero')||!selected.outline.includes('82, 92, 187'))throw Error('Card selection does not synchronize: '+JSON.stringify(selected));
 const clickCanvas=await evaluate("(()=>{const el=document.querySelector('.editor-shell [data-node-id=\"m6-hero-title\"]');if(!el)return false;el.click();return true;})()");
 if(!clickCanvas)throw Error('Canvas Item missing');
 const selectedItem=await evaluate("(()=>({active:!!document.querySelector('#structurePane .structure-row.is-active [data-id=\"m6-hero-title\"]'),chosen:!!document.querySelector('.editor-shell [data-node-id=\"m6-hero-title\"].chosen'),path:document.querySelector('.selection-path')?.textContent}))()");
 if(!selectedItem.active||!selectedItem.chosen||!selectedItem.path?.includes('hero'))throw Error('Canvas/tree selection diverged: '+JSON.stringify(selectedItem));
 const fold=await evaluate("(()=>{const el=document.querySelector('#structurePane [data-act=\"structure-fold\"][data-id=\"m6-hero\"]');if(!el)return false;el.click();return !document.querySelector('#structurePane [data-id=\"m6-hero-title\"]');})()");
 if(!fold)throw Error('Structure collapsing failed');
 const unfold=await evaluate("(()=>{document.querySelector('#structurePane [data-act=\"structure-fold\"][data-id=\"m6-hero\"]').click();return !!document.querySelector('#structurePane [data-id=\"m6-hero-title\"]');})()");
 if(!unfold)throw Error('Structure expanding failed');
 const hidden=await evaluate("(()=>{document.querySelector('#structureToggle').click();return !document.querySelector('#studioApp').classList.contains('structure-open');})()");
 const shown=await evaluate("(()=>{document.querySelector('#structureToggle').click();return document.querySelector('#studioApp').classList.contains('structure-open');})()");
 if(!hidden||!shown)throw Error('Structure pane toggle failed');
 await mkdir(join(root,'screenshots'),{recursive:true});
 const screenshot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(join(root,'screenshots','m8-structure-editor.png'),Buffer.from(screenshot.data,'base64'));
 console.log('M8_STRUCTURE_OK '+JSON.stringify({before,selected,selectedItem,fold,unfold,hidden,shown}));
}finally{
 ws?.close();chrome?.kill('SIGKILL');server.kill('SIGTERM');
 await sleep(170);await rm(tmp,{recursive:true,force:true}).catch(()=>{});
}
