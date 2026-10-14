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

 const picker=await evaluate('(()=>({cells:document.querySelectorAll(".area-grid-cell").length,inputs:document.querySelectorAll("[data-area-value]").length}))()');
 if(picker.cells!==8||picker.inputs!==4)throw Error('Atomic grid picker missing: '+JSON.stringify(picker));
 const invalid=await evaluate('(()=>{document.querySelector("[data-area-value=x1]").value="99";document.querySelector("[data-act=apply-area]").click();return document.querySelector("#areaError")?.textContent.includes("Invalid rectangle")})()');
 if(!invalid)throw Error('Invalid atomic rectangle was accepted');
 const formChange=await evaluate('(()=>{for(const [key,value] of Object.entries({x1:1,y1:3,x2:2,y2:5}))document.querySelector("[data-area-value="+key+"]").value=String(value);document.querySelector("[data-act=apply-area]").click();return true})()');
 if(!formChange)throw Error('Area numeric form unavailable');
 await sleep(700);
 const titleIn=data=>data.pages.find(p=>p.id==='home').blocks.find(b=>b.id==='m6-hero').children.find(b=>b.id==='m6-hero-copy').children.find(b=>b.id==='m6-hero-title');
 const changed=titleIn(JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8')));
 if(changed.area.y1!==3||changed.area.y2!==5)throw Error('Atomic area Apply did not persist full rectangle');
 await evaluate('(()=>{for(const [key,value] of Object.entries({x1:1,y1:2,x2:2,y2:6}))document.querySelector("[data-area-value="+key+"]").value=String(value);document.querySelector("[data-act=apply-area]").click();return true})()');
 await sleep(600);
 const again=titleIn(JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8')));
 if(again.area.y1!==2||again.area.y2!==6)throw Error('Atomic rectangle restore failed');

 const pickerPoints=await evaluate('(()=>{const grid=document.querySelector("#areaGrid");grid.scrollIntoView({block:"center"});const point=y=>{const cell=grid.querySelector("[data-area-x=\\"1\\"][data-area-y=\\""+y+"\\"]");if(!cell)return null;const r=cell.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}};return {a:point(3),b:point(4)}})()');
 if(!pickerPoints?.a||!pickerPoints?.b)throw Error('Grid picker cell coordinates missing');
 await command('Input.dispatchMouseEvent',{type:'mouseMoved',...pickerPoints.a});
 await command('Input.dispatchMouseEvent',{type:'mousePressed',...pickerPoints.a,button:'left',clickCount:1});
 await command('Input.dispatchMouseEvent',{type:'mouseMoved',...pickerPoints.b,buttons:1});
 await command('Input.dispatchMouseEvent',{type:'mouseReleased',...pickerPoints.b,button:'left',clickCount:1});
 await sleep(650);
 const pickerSaved=titleIn(JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8')));
 if(pickerSaved.area.y1!==3||pickerSaved.area.y2!==5)throw Error('Mini picker pointer drag did not commit a rectangle');
 await evaluate('(()=>{for(const [key,value] of Object.entries({x1:1,y1:2,x2:2,y2:6}))document.querySelector("[data-area-value="+key+"]").value=String(value);document.querySelector("[data-act=apply-area]").click();return true})()');
 await sleep(650);
 const reparented=await evaluate('(()=>{const source=document.querySelector(".structure-handle[data-drag-id=m6-hero-title]"),row=document.querySelector(".structure-row[data-row-id=m6-hero-graphic]");if(!source||!row)return false;row.scrollIntoView({block:"center"});const r=row.getBoundingClientRect(),dt=new DataTransfer();source.dispatchEvent(new DragEvent("dragstart",{bubbles:true,cancelable:true,dataTransfer:dt}));row.dispatchEvent(new DragEvent("dragover",{bubbles:true,cancelable:true,dataTransfer:dt,clientY:r.top+r.height/2}));row.dispatchEvent(new DragEvent("drop",{bubbles:true,cancelable:true,dataTransfer:dt,clientY:r.top+r.height/2}));return true})()');
 if(!reparented)throw Error('Tree drag-and-drop controls missing');
 await sleep(750);
 const dnd=JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8'));
 const hero=dnd.pages.find(p=>p.id==='home').blocks.find(b=>b.id==='m6-hero');
 if(!hero.children.find(x=>x.id==='m6-hero-graphic').children.some(x=>x.id==='m6-hero-title'))throw Error('Tree drop did not reparent authored Item');
 const undo=await evaluate('(()=>{const el=document.querySelector("[data-act=undo-structure]");if(!el||el.disabled)return false;el.click();return true})()');
 if(!undo)throw Error('Structure Undo unavailable');
 await sleep(650);
 const restored=JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8'));
 if(!restored.pages.find(p=>p.id==='home').blocks.find(b=>b.id==='m6-hero').children.find(x=>x.id==='m6-hero-copy').children.some(x=>x.id==='m6-hero-title'))throw Error('Structure Undo failed to restore source parent');
 console.log('M8_TREE_AREA_OK atomic four-value Apply, validation, reparent and Undo');
 // Traverse earlier rectangle edits: reparent undo restored the previous document.
 const invoke=async name=>{
   const ok=await evaluate('(()=>{const e=document.querySelector("[data-act='+name+']");if(!e||e.disabled)return false;e.click();return true})()');
   if(!ok)throw Error('History button unavailable: '+name);
   await sleep(300);
   return titleIn(JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8')));
 };
 const older=await invoke('undo-structure');
 if(older.area.y1!==3||older.area.y2!==5)throw Error('First history Undo did not restore the previous area');
 const oldest=await invoke('undo-structure');
 if(oldest.area.y1!==2||oldest.area.y2!==6)throw Error('Second history Undo did not restore the older area');
 const newer=await invoke('redo-structure');
 if(newer.area.y1!==3||newer.area.y2!==5)throw Error('First Redo did not restore the newer area');
 const newest=await invoke('redo-structure');
 if(newest.area.y1!==2||newest.area.y2!==6)throw Error('Second Redo did not return to current area');
 const noRedo=await evaluate('document.querySelector("[data-act=redo-structure]").disabled');
 if(!noRedo)throw Error('Redo should be exhausted after the last redo');
 console.log('M8_HISTORY_OK multi-step Undo x2, Redo x2, persisted JSON matches');

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
