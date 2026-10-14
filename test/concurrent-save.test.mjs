import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,copyFile,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

const root=resolve('.');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/T3sAAAAASUVORK5CYII=','base64');

test('M8 stale tabs and uploads cannot overwrite or bypass an atomic file revision', {timeout:15000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ta-m8-revision-'));
 await mkdir(join(dir,'content'),{recursive:true});
 await copyFile(join(root,'content','site.json'),join(dir,'content','site.json'));
 const port=38000+(process.pid%19000),url='http://127.0.0.1:'+port;
 const server=spawn(process.execPath,['src/server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),TA_DATA_ROOT:dir},stdio:'ignore'});
 const data=()=>readFile(join(dir,'content','site.json'),'utf8').then(JSON.parse);
 const get=()=>fetch(url+'/api/data');
 const put=(value,etag)=>fetch(url+'/api/data',{method:'PUT',headers:{
   'Content-Type':'application/json',...(etag?{'If-Match':etag}:{})
 },body:JSON.stringify(value)});
 try {
  let ready=false;
  for(let i=0;i<70;i++){try{if((await get()).ok){ready=true;break}}catch{}await delay(80)}
  assert.ok(ready,'server did not start');
  const one=await get(),two=await get();
  const firstTag=one.headers.get('etag'),secondTag=two.headers.get('etag');
  assert.ok(/^"[a-f0-9]{64}"$/.test(firstTag),'strong revision returned on GET');
  assert.equal(firstTag,secondTag);
  const initial=await one.json();
  const alpha=structuredClone(initial),beta=structuredClone(initial);
  alpha.site.name='Alpha edit';beta.site.name='Beta edit';
  assert.equal((await put(alpha)).status,428,'writes without revision are refused');
  const first=await put(alpha,firstTag);
  assert.equal(first.status,200);
  const secondTagValue=first.headers.get('etag');
  assert.ok(secondTagValue&&secondTagValue!==firstTag,'each successful save gets a new revision');
  const rejected=await put(beta,secondTag);
  assert.equal(rejected.status,409,'stale second tab must never overwrite the file');
  assert.match((await rejected.json()).error,/Export unsaved JSON/);
  assert.equal((await data()).site.name,'Alpha edit');
  const upload=await fetch(url+'/api/assets?filename=stale.png',{method:'POST',headers:{
   'Content-Type':'image/png','If-Match':secondTag
  },body:png});
  assert.equal(upload.status,409,'upload using stale revision is also rejected');
  assert.equal((await data()).assets.length,initial.assets.length);
  assert.deepEqual(await readdir(join(dir,'assets','uploads')).catch(()=>[]),[]);
  const fresh=await get();
  assert.equal(fresh.headers.get('etag'),secondTagValue);
  const recovered=await put(beta,fresh.headers.get('etag'));
  assert.equal(recovered.status,200,'reloading then saving with current revision succeeds');
  assert.equal((await data()).site.name,'Beta edit');
 }finally{
  server.kill('SIGTERM');
  if(server.exitCode===null)await Promise.race([new Promise(ok=>server.once('exit',ok)),delay(1500)]);
  await rm(dir,{recursive:true,force:true});
 }
});
