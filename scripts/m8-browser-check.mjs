// Browser end-to-end test for the local visual grid editor. Uses a disposable
// copy of site.json: neither the user's content nor GitHub Pages is modified.
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,copyFile,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

const root=resolve('.');
const tmp=await mkdtemp(join(tmpdir(),'ta-grid-editor-'));
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
 const selected=await evaluate("(()=>{const x=document.querySelector('[data-node-id=\"m6-hero-title\"]');if(!x)return false;x.click();return true})()");
 if(!selected)throw Error('Hero Item is not selectable');
 const toggled=await evaluate("(()=>{const x=document.querySelector('[data-act=\"toggle-grid\"]');if(!x)return false;x.click();return true})()");
 if(!toggled)throw Error('Edit Grid control missing');
 let state;
 for(let i=0;i<30;i++){
  state=await evaluate("(()=>{const e=document.querySelector('.m8-grid-overlay');return e?{id:e.dataset.m8Grid,rows:e.querySelectorAll('.m8-grid-cell').length,selected:e.querySelectorAll('.m8-selected').length}:null})()");
  if(state)break;await sleep(100);
 }
 console.log('M8 GRID',JSON.stringify(state));
 if(!state||state.id!=='m6-hero-copy'||state.rows!==8||state.selected!==4)
   throw Error('Overlay not attached to the selected Item parent grid');
 const positions=await evaluate("(()=>{const root=document.querySelector('.m8-grid-overlay');const locate=y=>{const e=root.querySelector('[data-x=\"1\"][data-y=\"'+y+'\"]');const r=e.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};};return {start:locate(3),end:locate(4)};})()");
 if(!positions?.start||!positions.end)throw Error('Could not locate grid cell centers');
 await mkdir(join(root,'screenshots'),{recursive:true});
 const screenshot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(join(root,'screenshots','m8-editor-grid.png'),Buffer.from(screenshot.data,'base64'));
 await command('Input.dispatchMouseEvent',{type:'mouseMoved',...positions.start});
 await command('Input.dispatchMouseEvent',{type:'mousePressed',...positions.start,button:'left',clickCount:1});
 await command('Input.dispatchMouseEvent',{type:'mouseMoved',...positions.end,buttons:1});
 await command('Input.dispatchMouseEvent',{type:'mouseReleased',...positions.end,button:'left',clickCount:1});
 await sleep(1100);
 const after=JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8'));
 const title=after.pages.find(p=>p.id==='home').blocks.find(b=>b.id==='m6-hero')
   .children.find(b=>b.id==='m6-hero-copy').children.find(b=>b.id==='m6-hero-title');
 console.log('M8 DRAG AREA',JSON.stringify(title.area));
 if(title.area.y1!==3||title.area.y2!==5)throw Error('Drag did not save correct grid area');
 const undo=await evaluate("(()=>{const x=document.querySelector('[data-act=\"grid-undo\"]');if(!x)return false;x.click();return true;})()");
 if(!undo)throw Error('Undo button was not shown');
 await sleep(900);
 const restored=JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8'));
 const restoredTitle=restored.pages.find(p=>p.id==='home').blocks.find(b=>b.id==='m6-hero')
   .children.find(b=>b.id==='m6-hero-copy').children.find(b=>b.id==='m6-hero-title');
 if(restoredTitle.area.y1!==2||restoredTitle.area.y2!==6)throw Error('Undo did not restore previous area');
 console.log('M8_STUDIO_OK grid overlay, drag resize, temporary JSON save and undo');
}finally{
 ws?.close();chrome?.kill('SIGKILL');server.kill('SIGTERM');
 await sleep(170);await rm(tmp,{recursive:true,force:true}).catch(()=>{});
}
