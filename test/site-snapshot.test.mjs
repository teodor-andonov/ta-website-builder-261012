import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,cp,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createSnapshot,verifySnapshot,restoreSnapshot} from '../scripts/site-snapshot.mjs';
import {validate} from '../src/model.mjs';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
test('M10 verified snapshots restore JSON+media to a separate data folder without overwriting originals',{timeout:20000},async()=>{
 const tmp=await mkdtemp(path.join(tmpdir(),'ta-backup-'));
 try{
  const data=path.join(tmp,'working');
  await mkdir(path.join(data,'content'),{recursive:true});
  await cp(path.join(root,'content/site.json'),path.join(data,'content/site.json'));
  await cp(path.join(root,'assets'),path.join(data,'assets'),{recursive:true});
  const original=await readFile(path.join(data,'content/site.json'));
  const snapshot=await createSnapshot(data);
  assert.match(path.basename(snapshot.path),/^\d{6}-\d{4}_site-backup$/);
  assert.ok(snapshot.fileCount>=5,'JSON and four placeholder media files should be captured');
  const verified=await verifySnapshot(snapshot.path);
  assert.equal(verified.fileCount,snapshot.fileCount);
  const target=path.join(tmp,'restored');
  await restoreSnapshot(snapshot.path,target);
  const recovered=await readFile(path.join(target,'content/site.json'));
  assert.deepEqual(recovered,original);
  validate(JSON.parse(recovered));
  assert.ok((await stat(path.join(target,'assets/placeholder/house.svg'))).isFile());
  await assert.rejects(restoreSnapshot(snapshot.path,target),/destination already exists/);
  assert.deepEqual(await readFile(path.join(data,'content/site.json')),original);
  const replacement=JSON.parse(await readFile(path.join(target,'content/site.json')));
  replacement.site.name='Restored site copy';
  await writeFile(path.join(target,'content/site.json'),JSON.stringify(replacement));
  assert.notDeepEqual(await readFile(path.join(target,'content/site.json')),original);
  assert.deepEqual(await readFile(path.join(data,'content/site.json')),original);
  assert.equal((await verifySnapshot(snapshot.path)).fileCount,snapshot.fileCount);
  // Deliberate tampering must fail rather than yield a supposedly verified backup.
  await writeFile(path.join(snapshot.path,'assets/placeholder/house.svg'),'tampered media');
  await assert.rejects(verifySnapshot(snapshot.path),/checksum or file list mismatch/);
 }finally{await rm(tmp,{recursive:true,force:true})}
});
