import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile, mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve, extname, sep} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
const dist=resolve('dist');
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  let rel=decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if(!rel || rel.endsWith('/'))rel+='index.html';
  const filename=resolve(dist,rel);
  if(!filename.startsWith(dist+sep)){res.writeHead(403).end();return;}
  try{const data=await readFile(filename);res.setHeader('Content-Type',extname(filename)==='.css'?'text/css':extname(filename)==='.svg'?'image/svg+xml':'text/html');res.end(data);}catch{res.writeHead(404).end('not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const port=server.address().port;
const dir=await mkdtemp(join(tmpdir(),'ta-wheel-'));
const chrome=spawn(process.env.CHROME||'chromium',['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-allow-origins=*','--remote-debugging-port=0','--window-size=1400,850','--user-data-dir='+dir,'http://127.0.0.1:'+port+'/'],{stdio:'ignore'});
let ws=null;
try{
 let debugPort;
 for(let tries=0;tries<100;tries++){
  try{debugPort=Number((await readFile(join(dir,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{await sleep(100)}
 }
 if(!debugPort)throw Error('Chrome DevTools did not start');
 let target;
 for(let tries=0;tries<80;tries++){
  const tabs=await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
  target=tabs.find(x=>x.type==='page'&&x.url.includes('127.0.0.1'));
  if(target)break;
  await sleep(100);
 }
 if(!target)throw Error('Browser did not load page');
 ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((ok,no)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',no,{once:true})});
 let nextId=0;const waits=new Map();
 ws.addEventListener('message',e=>{const msg=JSON.parse(e.data);if(msg.id&&waits.has(msg.id)){const {ok,no}=waits.get(msg.id);waits.delete(msg.id);msg.error?no(new Error(JSON.stringify(msg.error))):ok(msg.result);}});
 const cmd=(method,params={})=>new Promise((ok,no)=>{const id=++nextId;waits.set(id,{ok,no});ws.send(JSON.stringify({id,method,params}));});
 const expr=async js=>{const out=await cmd('Runtime.evaluate',{expression:js,returnByValue:true,awaitPromise:true});if(!out.result || out.exceptionDetails){console.log('EVAL ERROR',JSON.stringify(out));}return out.result?.value;};
 await cmd('Page.enable');await cmd('Runtime.enable');
 for(let tries=0;tries<50;tries++){if(await expr("Boolean(document.querySelector('.card-hero .item-text'))"))break;await sleep(100);}
 if(!await expr("Boolean(document.querySelector('.card-hero .item-text'))")) throw Error('Home hero was not loaded');
 for(const selector of ['.card-hero .item-text','.card-hero .item-image']){
  const bounding=await expr(`(()=>{scrollTo(0,0);const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(Math.max(25,Math.min(innerHeight-25,r.top+r.height/2))),height:document.scrollingElement.scrollHeight};})()`);
  console.log('box',selector,bounding);
  if(!bounding||bounding.height<=850)throw Error('Document has no scroll');
  await cmd('Input.dispatchMouseEvent',{type:'mouseMoved',x:bounding.x,y:bounding.y});
  await cmd('Input.dispatchMouseEvent',{type:'mouseWheel',x:bounding.x,y:bounding.y,deltaX:0,deltaY:550});
  await sleep(550);
  const scrolled=await expr('window.scrollY');
  console.log('wheel',selector,scrolled);
  if(scrolled<50)throw Error('Wheel event failed to scroll document over '+selector);
 }
 console.log('TA_WHEEL_OK over hero text and image Items');
 await cmd('Page.navigate',{url:'http://127.0.0.1:'+port+'/work/balkan-house/'});
 let heading;
 for(let tries=0;tries<50;tries++){
  heading=await expr(`(()=>{const h=document.querySelector('main h1');return h?.textContent==='Balkan House'?{top:h.getBoundingClientRect().top,height:h.getBoundingClientRect().height}:null})()`);
  if(heading)break;await sleep(100);
 }
 if(!heading||heading.top<0||heading.top>500||heading.height>150)
  throw Error('Unconstrained project composition hides its title below oversized grid rows: '+JSON.stringify(heading));
 console.log('TA_COMPOSITION_HEIGHT_OK project title remains above the fold');
} finally {
 ws?.close();chrome.kill('SIGKILL');server.close();await sleep(150);await rm(dir,{recursive:true,force:true}).catch(()=>{});
}
