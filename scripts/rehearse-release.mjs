/**
 * M11 dry run: snapshot -> package -> edit -> package -> failure -> restore ->
 * package -> verify rollback. Never touches the live JSON, media, or repo dist.
 * Staging/noindex only: any inherited production env is explicitly disabled.
 */
import {mkdtemp,mkdir,cp,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createSnapshot,verifySnapshot,restoreSnapshot} from './site-snapshot.mjs';
import {packageSite} from './package-site.mjs';
import {validate} from '../src/model.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=path=>readFile(path);
export async function rehearseRelease(){
 const temporary=await mkdtemp(join(tmpdir(),'ta-release-drill-'));
 try{
  const working=join(temporary,'working'),baselineZip=join(temporary,'original.zip');
  const modifiedZip=join(temporary,'edited.zip'),recoveredZip=join(temporary,'recovered.zip');
  await mkdir(join(working,'content'),{recursive:true});
  const canonical=await read(join(root,'content','site.json'));
  await writeFile(join(working,'content','site.json'),canonical);
  await cp(join(root,'assets'),join(working,'assets'),{recursive:true});
  // A verified backup is the durable rollback source, not an old dist folder.
  const snapshot=await createSnapshot(working,join(temporary,'snapshots'));
  await verifySnapshot(snapshot.path);
  const env={...process.env,TA_ENABLE_INDEXING:'0',TA_PUBLIC_ORIGIN:''};
  const bundle=async(dataRoot,out,name)=>packageSite({
    dist:join(temporary,out),destination:name,env:{...env,TA_DATA_ROOT:dataRoot}
  });
  const baseline=await bundle(working,'site-original',baselineZip);
  const baselineHash=hash(await read(baselineZip));
  const originalHTML=await read(join(temporary,'site-original','index.html'));
  if(!originalHTML.includes('noindex, nofollow'))throw Error('Rollback baseline was not an unindexed preview');
  // Simulate a real authoring update on the disposable data copy.
  const document=validate(JSON.parse((await read(join(working,'content','site.json'))).toString()));
  document.site.name='TA rehearsal updated content';
  validate(document);
  await writeFile(join(working,'content','site.json'),JSON.stringify(document,null,2)+'\n');
  const edited=await bundle(working,'site-edited',modifiedZip);
  if(hash(await read(modifiedZip))===baselineHash)throw Error('Draft edit did not change the static package');
  if(!(await read(join(temporary,'site-edited','index.html'))).toString().includes('TA rehearsal updated content'))
    throw Error('Edited static output did not reflect JSON change');
  // Fail a build by pointing one asset at a file that does not exist; the
  // previous successful package must survive this failed validation.
  document.assets[0].src='/assets/placeholder/missing-rehearsal.svg';
  await writeFile(join(working,'content','site.json'),JSON.stringify(document));
  const previousHash=hash(await read(modifiedZip));
  let rejected=false;
  try{await bundle(working,'site-invalid',modifiedZip)}
  catch(error){
   if(!/Missing image file|Source image missing/.test(error.message))throw error;
   rejected=true;
  }
  if(!rejected)throw Error('Invalid media was unexpectedly packaged');
  if(hash(await read(modifiedZip))!==previousHash)throw Error('Failed package overwrote last-good ZIP');
  // A different target is mandatory: recovery never mutates working or the
  // original source folder, and the recovered ZIP must be reproducible.
  const recovered=join(temporary,'restored');
  await restoreSnapshot(snapshot.path,recovered);
  const restore=await bundle(recovered,'site-restored',recoveredZip);
  if(hash(await read(recoveredZip))!==baselineHash)throw Error('Recovered static ZIP differs from baseline');
  if(!(await read(join(recovered,'content','site.json'))).equals(canonical))
    throw Error('Restored authoring JSON differs from source snapshot');
  let overwriteBlocked=false;
  try{await restoreSnapshot(snapshot.path,working)}
  catch(error){overwriteBlocked=/already exists/.test(error.message)}
  if(!overwriteBlocked)throw Error('Recovery overwrote the edited working folder');
  if(!(await read(join(root,'content','site.json'))).equals(canonical))
    throw Error('Repository canonical source unexpectedly changed');
  return {
   snapshotFiles:snapshot.fileCount,publicFiles:baseline.files,
   zipBytes:baseline.zipBytes,recoveredZipMatches:true,
   failedBuildRetainedLastGood:true,existingWorkingFolderUntouched:true,
   noindex:true
  };
 }finally{await rm(temporary,{recursive:true,force:true})}
}
const invoked=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 try{console.log('M11_ROLLBACK_DRILL_OK '+JSON.stringify(await rehearseRelease()))}
 catch(error){console.error('M11_ROLLBACK_DRILL_FAILED '+error.message);process.exitCode=1;}
}
