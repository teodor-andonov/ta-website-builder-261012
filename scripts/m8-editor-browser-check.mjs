import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

const root=resolve('.');
const dir=await mkdtemp(join(tmpdir(),'ta-m8-studio-'));
const home=join(dir,'content','site.json');
const chromeDir=join(dir,'chrome');
const port=4178;
await mkdir(join(dir,'content'),{recursive:true});
await mkdir(chromeDir,{recursive:true});
const source=JSON.parse(await readFile(join(root,'content','site.json'),'utf8'));
source.pages.find(p=>p.id==='home').blocks.push({
 id:'m8-test-card',type:'card',variant:'m8-test',columns:4,rows:3,
 padding:'x1',gap:'x1',background:'grey-100',border:false,constrainHeight:true,heightFactor:.24,
 children:[
  {id:'m8-test-title',type:'text',text:'Grid editor interaction test',
   style:'heading',area:{x1:1,y1:1,x2:2,y2:2}},
  {id:'m8-test-other',type:'text',text:'Occupied cell',style:'body',
   area:{x1:4,y1:3,x2:5,y2:4}}
 ]
});
await writeFile(home,JSON.stringify(source,null,2)+'\n');
const server=spawn(process.execPath,['src/server.mjs'],{
 cwd:root,env:{...process.env,TA_DATA_ROOT:dir,PORT:String(port)},stdio:'ignore'
});

let serverReady=false;
for(let attempt=0;attempt<100;attempt++){
 try{const response=await fetch('http://127.0.0.1:'+port+'/api/data');
  if(response.ok){serverReady=true;break;}
 }catch{}
 await sleep(100);
}
if(!serverReady){server.kill('SIGTERM');throw Error('Temporary Studio server did not become ready');}
const chrome=spawn(process.env.CHROME||'chromium',[
 '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
 '--remote-allow-origins=*','--remote-debugging-port=0',
 '--window-size=1600,980','--user-data-dir='+chromeDir,
 'http://127.0.0.1:'+port+'/'
],{stdio:'ignore'});
let ws=null;
try{
 let debugPort;
 for(let i=0;i<100;i++){try{debugPort=Number((await readFile(join(chromeDir,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{await sleep(120)}}
 if(!debugPort)throw Error('Browser debugger unavailable');
 let tab;
 for(let i=0;i<100;i++){
  try{const tabs=await (await fetch('http://127.0.0.1:'+debugPort+'/json')).json();
   tab=tabs.find(x=>x.type==='page'&&x.url.includes('127.0.0.1'));}
  catch{}
  if(tab)break;
  await sleep(100);
 }
 if(!tab)throw Error('Browser tab did not open');
 ws=new WebSocket(tab.webSocketDebuggerUrl);
 await new Promise((ok,no)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',no,{once:true})});
 const pending=new Map();let seq=0;
 ws.addEventListener('message',evt=>{const msg=JSON.parse(evt.data);if(msg.id&&pending.has(msg.id)){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.no(Error(JSON.stringify(msg.error))):p.ok(msg.result)}});
 const cmd=(method,params={})=>new Promise((ok,no)=>{const id=++seq;pending.set(id,{ok,no});ws.send(JSON.stringify({id,method,params}))});
 const evalJS=async expression=>{
  const x=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(x.exceptionDetails)throw Error('Browser script: '+JSON.stringify(x.exceptionDetails));
  return x.result?.value;
 };
 await cmd('Page.enable');await cmd('Runtime.enable');
 for(let i=0;i<80;i++){if(await evalJS('Boolean(window.__TA_STUDIO__)'))break;await sleep(100)}
 if(!await evalJS('Boolean(window.__TA_STUDIO__)')){
  console.error('TA_STUDIO_DIAGNOSTIC',await evalJS("({url:location.href,title:document.title,body:document.body?.innerText?.slice(0,420),error:document.querySelector('.workbody')?.innerText?.slice(0,240)})"));
  throw Error('Studio failed to initialise');
 }
 const state=await evalJS("(()=>{const page=document.querySelector('[data-act=\"navigate\"][data-section=\"page\"][data-id=\"home\"]');page?.click();const heading=document.querySelector('[data-node-id=\"m6-work-heading\"]');heading?.click();document.querySelector('[data-act=\"toggle-grid-edit\"]')?.click();const overlay=document.querySelector('.grid-edit-overlay');overlay?.scrollIntoView({block:'center'});return {found:!!overlay,target:overlay?.dataset.gridEditing,columns:overlay?.style.gridTemplateColumns,rows:overlay?.style.gridTemplateRows};})()");
 if(!state?.found||state.target!=='m6-work-heading')throw Error('Could not mount Work grid overlay: '+JSON.stringify(state));
 await sleep(300);
 await mkdir(join(root,'screenshots'),{recursive:true});
 const image=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(join(root,'screenshots','05-studio-grid-editor.png'),Buffer.from(image.data,'base64'));
 console.log('TA_M8_SCREENSHOT_OK',JSON.stringify(state));
 const ready=await evalJS("(()=>{document.querySelector('[data-act=\"toggle-grid-edit\"]')?.click();document.querySelector('[data-node-id=\"m8-test-title\"]')?.click();document.querySelector('[data-act=\"toggle-grid-edit\"]')?.click();const overlay=document.querySelector('.grid-edit-overlay');overlay?.scrollIntoView({block:'center'});return overlay?.dataset.gridEditing==='m8-test-title' &&overlay.querySelectorAll('.grid-edit-cell').length===12;})()");
 if(!ready)throw Error('Fixture grid editor failed to mount');
 await sleep(230);
 const cell=async(x,y)=>await evalJS("(()=>{const cells=[...document.querySelectorAll('.grid-edit-overlay .grid-edit-cell')];const el=cells.find(n=>getComputedStyle(n).gridColumnStart==='"+x+"'&&getComputedStyle(n).gridRowStart==='"+y+"');if(!el)return null;const r=el.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()");
 const move=async(x1,y1,x2,y2)=>{
  const a=await cell(x1,y1),b=await cell(x2,y2);
  if(!a||!b)throw Error('Grid cell bounding boxes missing');
  await cmd('Input.dispatchMouseEvent',{type:'mouseMoved',x:a.x,y:a.y});
  await cmd('Input.dispatchMouseEvent',{type:'mousePressed',x:a.x,y:a.y,button:'left',clickCount:1});
  await cmd('Input.dispatchMouseEvent',{type:'mouseMoved',x:b.x,y:b.y,button:'left',buttons:1});
  await cmd('Input.dispatchMouseEvent',{type:'mouseReleased',x:b.x,y:b.y,button:'left',clickCount:1});
  await sleep(300);
 };
 await move(2,2,3,2);
 const stored=JSON.parse(await readFile(home,'utf8'));
 const edited=stored.pages.find(p=>p.id==='home').blocks.find(b=>b.id==='m8-test-card').children[0];
 if(JSON.stringify(edited.area)!==JSON.stringify({x1:2,y1:2,x2:4,y2:3}))throw Error('Drag did not persist area: '+JSON.stringify(edited.area));
 await move(4,3,4,3);
 const again=JSON.parse(await readFile(home,'utf8'));
 const rejected=again.pages.find(p=>p.id==='home').blocks.find(b=>b.id==='m8-test-card').children[0];
 if(JSON.stringify(rejected.area)!==JSON.stringify(edited.area))throw Error('Overlapping edit wrongly persisted');
 console.log('TA_M8_DRAG_OK',JSON.stringify(edited.area));
 console.log('TA_M8_OVERLAP_REJECTED');
} finally{
 ws?.close();chrome.kill('SIGKILL');server.kill('SIGTERM');
 await sleep(220);await rm(dir,{recursive:true,force:true}).catch(()=>{});
}
