import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,cp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {collectPages} from '../src/render.mjs';
import {validate} from '../src/model.mjs';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/T3sAAAAASUVORK5CYII=','base64');
async function boot(url,server){
 for(let i=0;i<80;i++){
   if(server.exitCode!==null)throw Error('Server exited before startup');
   try{if((await fetch(url+'/api/data')).ok)return}catch{}
   await delay(80);
 }
 throw Error('Server did not start');
}
test('M9 replacing placeholder media is atomic and preserves asset identity, covers and ETags',{timeout:20000},async()=>{
 const rootData=await mkdtemp(path.join(tmpdir(),'ta-replace-media-'));
 const port=62000+(process.pid%2500);
 const url='http://127.0.0.1:'+port;
 await mkdir(path.join(rootData,'content'),{recursive:true});
 await cp(path.join(root,'content/site.json'),path.join(rootData,'content/site.json'));
 await cp(path.join(root,'assets/placeholder'),path.join(rootData,'assets/placeholder'),{recursive:true});
 const server=spawn(process.execPath,['src/server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),TA_DATA_ROOT:rootData},stdio:'ignore'});
 try{
  await boot(url,server);
  const response=await fetch(url+'/api/data');
  const tag=response.headers.get('etag'),before=await response.json();
  const house=before.assets.find(a=>a.id==='house');
  const refs=before.collections.flatMap(c=>c.records.filter(r=>r.cover==='house')).map(r=>r.id);
  assert.ok(refs.length>0);
  assert.equal(house.placeholder,true);
  assert.equal((await fetch(url+house.src)).status,200,'placeholder SVG available in local Studio');
  const replaced=await fetch(url+'/api/assets?filename=portfolio.png&replaceId=house',{
   method:'POST',headers:{'Content-Type':'image/png','If-Match':tag},body:png
  });
  assert.equal(replaced.status,200);
  const result=await replaced.json();
  const nextTag=replaced.headers.get('etag');
  assert.equal(result.asset.id,'house');
  assert.match(result.asset.src,/^\/assets\/uploads\/[a-f0-9]{32}\.png$/);
  assert.equal(result.asset.placeholder,false);
  assert.equal(result.asset.alt,'');
  assert.equal(result.asset.credit,'');
  assert.equal(result.asset.caption,'');
  assert.ok(!result.asset.tags.includes('Placeholder'));
  assert.equal(result.asset.properties.projectCode,'');
  const stored=validate(JSON.parse(await readFile(path.join(rootData,'content/site.json'),'utf8')));
  assert.equal(stored.assets.length,before.assets.length);
  assert.equal(stored.assets.find(a=>a.id==='house').src,result.asset.src);
  assert.deepEqual(stored.collections.flatMap(c=>c.records.filter(r=>r.cover==='house')).map(r=>r.id),refs);
  const page=collectPages(stored).find(p=>p.route==='/work/balkan-house/');
  assert.ok(page.html.includes('src="'+result.asset.src+'"'));
  const media=await fetch(url+result.asset.src);
  assert.equal(media.status,200);
  assert.deepEqual(Buffer.from(await media.arrayBuffer()),png);
  const stale=await fetch(url+'/api/assets?filename=stale.png&replaceId=house',{
    method:'POST',headers:{'Content-Type':'image/png','If-Match':tag},body:png
  });
  assert.equal(stale.status,409);
  assert.equal((await fetch(url+'/api/data')).headers.get('etag'),nextTag);
  const unsafe=await fetch(url+'/api/assets?filename=test.png&replaceId=../../secret',{
    method:'POST',headers:{'Content-Type':'image/png','If-Match':nextTag},body:png
  });
  assert.equal(unsafe.status,400);
  const missing=await fetch(url+'/api/assets?filename=test.png&replaceId=does-not-exist',{
    method:'POST',headers:{'Content-Type':'image/png','If-Match':nextTag},body:png
  });
  assert.equal(missing.status,404);
  assert.equal((await readdir(path.join(rootData,'assets/uploads'))).length,1);
 }finally{
  server.kill('SIGTERM');
  if(server.exitCode===null)await Promise.race([new Promise(ok=>server.once('exit',ok)),delay(1200)]);
  await rm(rootData,{recursive:true,force:true});
 }
});
