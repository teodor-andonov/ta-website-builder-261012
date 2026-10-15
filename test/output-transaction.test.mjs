import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {withAtomicStaticOutput} from '../src/output-transaction.mjs';

const writeSite=async(dir,version)=>{
 await writeFile(join(dir,'index.html'),'<html>'+version+'</html>');
 await writeFile(join(dir,'404.html'),'<html>Missing</html>');
 await writeFile(join(dir,'site.css'),'/* '+version+' */');
};
test('M11 failed mid-build preserves last-good static output and cleans partial staging',{timeout:10000},async()=>{
 const tmp=await mkdtemp(join(tmpdir(),'ta-static-txn-'));
 try{
  const destination=join(tmp,'public');
  const settings={projectRoot:join(tmp,'repo'),dataRoot:join(tmp,'data')};
  await withAtomicStaticOutput(destination,settings,dir=>writeSite(dir,'release-v1'));
  const before=await readFile(join(destination,'index.html'),'utf8');
  await assert.rejects(withAtomicStaticOutput(destination,settings,async dir=>{
   await writeFile(join(dir,'index.html'),'<html>PARTIAL</html>');
   throw Error('simulated static build failure');
  }),/simulated static build failure/);
  assert.equal(await readFile(join(destination,'index.html'),'utf8'),before);
  assert.deepEqual((await readdir(tmp)).filter(x=>x.includes('ta-staging')||x.includes('ta-prior')),[]);
  await withAtomicStaticOutput(destination,settings,dir=>writeSite(dir,'release-v2'));
  assert.match(await readFile(join(destination,'index.html'),'utf8'),/release-v2/);
  assert.deepEqual((await readdir(tmp)).filter(x=>x.includes('ta-staging')||x.includes('ta-prior')),[]);
 }finally{await rm(tmp,{recursive:true,force:true})}
});
test('M11 refuses a build inside protected source, media or an unrelated folder',{timeout:10000},async()=>{
 const tmp=await mkdtemp(join(tmpdir(),'ta-static-safe-'));
 try{
  const projectRoot=join(tmp,'repo'),dataRoot=join(tmp,'site-data');
  const settings={projectRoot,dataRoot};
  for(const destination of [projectRoot,dataRoot,join(projectRoot,'src','app'),join(dataRoot,'assets','bin'),tmp]){
   await assert.rejects(withAtomicStaticOutput(destination,settings,dir=>writeSite(dir,'bad')),
      /Refusing to/);
  }
  const unrelated=join(tmp,'custom-static');
  await mkdir(unrelated);
  await writeFile(join(unrelated,'keep.txt'),'important user data');
  await assert.rejects(withAtomicStaticOutput(unrelated,settings,dir=>writeSite(dir,'bad')),
    /not a recognised generated static site/);
  assert.equal(await readFile(join(unrelated,'keep.txt'),'utf8'),'important user data');
 }finally{await rm(tmp,{recursive:true,force:true})}
});
