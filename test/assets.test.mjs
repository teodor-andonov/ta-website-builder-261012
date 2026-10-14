import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp, mkdir, cp, readFile, stat, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {assetSrc, collectPages} from '../src/render.mjs';
import {validate} from '../src/model.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
// A tiny valid PNG used for round trips, content-type checks and build verification.
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/T3sAAAAASUVORK5CYII=','base64');
async function waitFor(url,server){for(let n=0;n<60;n++){if(server.exitCode!==null)throw Error('Server failed to start');try{if((await fetch(url+'/api/data')).ok)return;}catch{}await delay(70);}throw Error('Server timeout');}

test('real image upload, metadata edits and published output survive reload', {timeout:20000},async()=>{
  const storage=await mkdtemp(path.join(tmpdir(),'ta-assets-'));
  const port=47000+(process.pid%14000);
  const url=`http://127.0.0.1:${port}`;
  await mkdir(path.join(storage,'content'),{recursive:true});
  await cp(path.join(root,'content','site.json'),path.join(storage,'content','site.json'));
  await mkdir(path.join(storage,'assets','demo'),{recursive:true});
  await cp(path.join(root,'assets','demo'),path.join(storage,'assets','demo'),{recursive:true});
  const server=spawn(process.execPath,['src/server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),TA_DATA_ROOT:storage},stdio:'ignore'});
  try{
    await waitFor(url,server);
    const start=await(await fetch(url+'/api/data')).json();
    const cases=[
      ['image/svg+xml','diagram.svg',Buffer.from('<svg onload="alert(1)"></svg>'),415],
      ['image/png','fake.png',Buffer.from('<script>alert(1)</script>'),415],
      ['image/jpeg','mismatch.jpg',png,415],
      ['image/png','../escape.png',png,400],
      ['image/png','wrong.jpg',png,415],
      ['image/png','large.png',Buffer.alloc(12*1024*1024+1),413],
    ];
    for(const [type,name,body,status] of cases){
      const response=await fetch(`${url}/api/assets?filename=${encodeURIComponent(name)}`,{method:'POST',headers:{'Content-Type':type},body});
      assert.equal(response.status,status,`Expected ${name} rejection`);
    }
    let latest=await fetch(url+'/api/data');
    let revision=latest.headers.get('etag');
    let current=await latest.json();
    assert.equal(current.assets.length,start.assets.length,'Invalid uploads must not alter metadata');
    assert.deepEqual(await readdir(path.join(storage,'assets','uploads')).catch(()=>[]),[]);
    const rejectedOrigin=await fetch(`${url}/api/assets?filename=valid.png`,{method:'POST',headers:{'Content-Type':'image/png','Origin':'https://attacker.example'},body:png});
    assert.equal(rejectedOrigin.status,403);
    const uploaded=await fetch(`${url}/api/assets?filename=Archive%20Photo.png`,{method:'POST',headers:{'Content-Type':'image/png','If-Match':revision},body:png});
    const result=await uploaded.json();
    revision=uploaded.headers.get('etag');
    assert.equal(uploaded.status,201,JSON.stringify(result));
    assert.equal(result.ok,true);
    const asset=result.asset;
    const onDisk=JSON.parse(await readFile(path.join(storage,'content','site.json'),'utf8'));
    assert.deepEqual(onDisk.assets.at(-1),asset);
    assert.match(asset.id,/^asset_[a-f0-9]{32}$/);
    assert.match(asset.src,/^\/assets\/uploads\/[a-f0-9]{32}\.png$/);
    assert.equal(asset.properties.filename,'Archive Photo.png');
    assert.equal(assetSrc(asset),asset.src);
    assert.ok(!JSON.stringify(asset).includes('data:image'));
    const media=await fetch(url+asset.src);
    assert.equal(media.status,200);
    assert.equal(media.headers.get('content-type'),'image/png');
    assert.deepEqual(Buffer.from(await media.arrayBuffer()),png);
    assert.equal((await stat(path.join(storage,asset.src))).size,png.length);
    assert.equal((await fetch(url+'/assets/uploads/../../content/site.json')).status,404);
    latest=await fetch(url+'/api/data');
    revision=latest.headers.get('etag');
    current=await latest.json();
    current.assets.find(a=>a.id===asset.id).alt='Minimal architectural test image';
    current.assets.find(a=>a.id===asset.id).credit='TA Test';
    const record=current.collections.find(c=>c.id==='projects').records.find(r=>r.slug==='balkan-house');
    record.cover=asset.id;
    const updated=await fetch(url+'/api/data',{method:'PUT',headers:{'Content-Type':'application/json','If-Match':revision},body:JSON.stringify(current)});
    assert.equal(updated.status,200);
    const reload=JSON.parse(await readFile(path.join(storage,'content','site.json'),'utf8'));
    validate(reload);
    assert.equal(reload.assets.find(a=>a.id===asset.id).alt,'Minimal architectural test image');
    assert.equal(reload.collections.find(c=>c.id==='projects').records.find(r=>r.slug==='balkan-house').cover,asset.id);
    const projectHtml=collectPages(reload).find(p=>p.route==='/work/balkan-house/').html;
    assert.ok(projectHtml.includes(`src="${asset.src}"`));
    assert.ok(projectHtml.includes('alt="Minimal architectural test image"'));
    const buildDir=path.join(storage,'built');
    const build=spawn(process.execPath,['src/build.mjs'],{cwd:root,env:{...process.env,TA_DATA_ROOT:storage,TA_OUTPUT_DIR:buildDir},stdio:['ignore','pipe','pipe']});
    let output='';for await (const data of build.stdout)output+=data;
    let errors='';for await (const data of build.stderr)errors+=data;
    const exit=await new Promise(res=>build.once('exit',res));
    assert.equal(exit,0,errors);
    assert.match(output,/Built 10 static pages/);
    const published=await readFile(path.join(buildDir,'work/balkan-house/index.html'),'utf8');
    assert.ok(published.includes(asset.src));
    assert.deepEqual(await readFile(path.join(buildDir,asset.src)),png);
  }finally{
    server.kill('SIGTERM');
    if(server.exitCode===null)await Promise.race([new Promise(res=>server.once('exit',res)),delay(1500)]);
    await rm(storage,{recursive:true,force:true});
  }
});