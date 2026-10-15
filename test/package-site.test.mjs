import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {packageSite} from '../scripts/package-site.mjs';
import {verifySiteArchive,verifySitePackage} from '../scripts/verify-site-package.mjs';

// Decode the central directory with Node, independently of the ZIP writer.
// This verifies the delivered bytes, not only the source file inventory.
function unpack(zip){
 const end=zip.length-22;
 assert.equal(zip.readUInt32LE(end),0x06054b50);
 const count=zip.readUInt16LE(end+10),dir=zip.readUInt32LE(end+16),files=new Map();
 let pos=dir;
 for(let i=0;i<count;i++){
  assert.equal(zip.readUInt32LE(pos),0x02014b50);
  const expectedLength=zip.readUInt32LE(pos+24),size=zip.readUInt32LE(pos+20);
  const namesize=zip.readUInt16LE(pos+28),extra=zip.readUInt16LE(pos+30),comment=zip.readUInt16LE(pos+32);
  const localOffset=zip.readUInt32LE(pos+42),name=zip.toString('utf8',pos+46,pos+46+namesize);
  assert.equal(zip.readUInt32LE(localOffset),0x04034b50);
  const dataStart=localOffset+30+zip.readUInt16LE(localOffset+26)+zip.readUInt16LE(localOffset+28);
  const payload=inflateRawSync(zip.subarray(dataStart,dataStart+size));
  assert.equal(payload.length,expectedLength,name);
  assert.equal(files.has(name),false,'duplicate archive entry');
  files.set(name,payload);
  pos+=46+namesize+extra+comment;
 }
 assert.equal(files.size,count);
 return files;
}
test('M11 packages the actual preview site as a standalone public ZIP with SHA-256 manifest',{timeout:40000},async()=>{
 const tmp=await mkdtemp(join(tmpdir(),'ta-site-package-'));
 try{
  const dist=join(tmp,'dist'),destination=join(tmp,'handoff','ta-site-preview.zip');
  const result=await packageSite({dist,destination,env:{...process.env,TA_PUBLIC_ORIGIN:''}});
  assert.equal(result.indexable,true);
  assert.ok(result.files>14);
  const archiveBytes=await readFile(destination);
  const verified=await verifySitePackage(destination);
  assert.equal(verified.indexable,true);
  assert.equal(verified.valid,true);
  assert.equal(verified.files,result.files);
  const damaged=Buffer.from(archiveBytes);
  damaged[36]^=0xff;
  assert.throws(()=>verifySiteArchive(damaged),/Unsafe ZIP path|local and central|checksum|corrupt|ZIP/);
  const archive=unpack(archiveBytes);
  assert.ok(archive.has('index.html'));
  assert.ok(archive.has('work/balkan-house/index.html'));
  assert.ok(archive.has('assets/placeholder/field.svg'));
  assert.ok(archive.has('site.css'));
  assert.ok(archive.has('robots.txt'));
  assert.equal(archive.has('content/site.json'),false);
  assert.equal(archive.has('studio/index.html'),false);
  assert.equal(archive.has('src/server.mjs'),false);
  assert.match(archive.get('index.html').toString(),/name="robots" content="index, follow"/);
  const manifest=JSON.parse(archive.get('release-manifest.json'));
  assert.equal(manifest.indexable,true);
  assert.equal(manifest.files.length,result.files);
  for(const file of manifest.files){
   assert.equal(createHash('sha256').update(archive.get(file.path)).digest('hex'),file.sha256,file.path);
   assert.equal(archive.get(file.path).length,file.bytes,file.path);
  }
  assert.equal(archive.get('robots.txt').toString(),'User-agent: *\nAllow: /\n');
  // An invalid custom-domain setting cannot produce a misleading canonical URL.
  await assert.rejects(packageSite({
   dist:join(tmp,'bad-origin-dist'),destination:join(tmp,'handoff','bad-origin.zip'),
   env:{...process.env,TA_PUBLIC_ORIGIN:'https://example.com'}
  }),/Static build rejected:[\s\S]*TA_PUBLIC_ORIGIN/);
 }finally{await rm(tmp,{recursive:true,force:true})}
});
test('M11 packager refuses a private editor/source artifact in static output',{timeout:10000},async()=>{
 const tmp=await mkdtemp(join(tmpdir(),'ta-package-unsafe-'));
 try{
  await mkdir(join(tmp,'dist','studio'),{recursive:true});
  for(const name of ['index.html','404.html','site.css'])
   await writeFile(join(tmp,'dist',name),'<meta name="robots" content="index, follow">');
  await writeFile(join(tmp,'dist','studio','index.html'),'private editor');
  await assert.rejects(packageSite({dist:join(tmp,'dist'),destination:join(tmp,'site.zip'),build:false}),/Private editor or source/);
 }finally{await rm(tmp,{recursive:true,force:true})}
});
