/**
 * M10 local file-first snapshots.
 * create: copy validated JSON and assets to an immutable, dated backup folder.
 * verify: compare the whole folder to SHA-256 manifest (including missing/extra files).
 * restore: restore into a NEW, non-existing folder; never overwrite live data.
 */
import {readFile,writeFile,mkdir,readdir,lstat,cp,rename,rm,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve,join,relative,sep,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validate} from '../src/model.mjs';

const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manifestName='snapshot-manifest.json';
const portable=p=>p.split(sep).join('/');
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

function safePath(root,short){
 if(typeof short!=='string'||short.startsWith('/')||short.includes('\\')||short.split('/').some(s=>!s||s==='.'||s==='..'))throw Error('Unsafe snapshot path');
 const file=resolve(root,...short.split('/'));
 if(!file.startsWith(root+sep))throw Error('Snapshot path escaped the backup');
 return file;
}
async function walk(root,sub='',result=[]){
 const dir=resolve(root,sub);
 for(const item of await readdir(dir,{withFileTypes:true})){
  const name=portable(join(sub,item.name));
  if(item.isDirectory())await walk(root,name,result);
  else if(item.isFile())result.push(name);
  else throw Error('Snapshot rejects symlinks or special files: '+name);
 }
 return result;
}
async function inspect(folder){
 const json=await readFile(join(folder,'content','site.json'),'utf8');
 const data=validate(JSON.parse(json));
 const listed=['content/site.json',...(await walk(folder,'assets'))].sort();
 for(const asset of data.assets){
  if(!String(asset.src||'').startsWith('/assets/'))continue;
  const file=asset.src.slice(1);
  if(!listed.includes(file))throw Error('Source image missing from snapshot: '+file);
 }
 const files=[];
 for(const name of listed){
  const bytes=await readFile(safePath(folder,name));
  files.push({path:name,bytes:bytes.length,sha256:sha256(bytes)});
 }
 return files;
}
function filename(){
 const date=new Date(),pad=x=>String(x).padStart(2,'0');
 return String(date.getFullYear()).slice(-2)+pad(date.getMonth()+1)+pad(date.getDate())+'-'+pad(date.getHours())+pad(date.getMinutes())+'_site-backup';
}
export async function createSnapshot(dataRoot=projectRoot,destRoot=join(dataRoot,'backups')){
 dataRoot=resolve(dataRoot);destRoot=resolve(destRoot);
 const fromContent=join(dataRoot,'content/site.json'),fromAssets=join(dataRoot,'assets');
 validate(JSON.parse(await readFile(fromContent,'utf8')));
 await lstat(fromAssets);
 await mkdir(destRoot,{recursive:true});
 let destination;
 for(let i=0;i<100;i++){
  const name=filename()+(i?'-'+String(i+1).padStart(2,'0'):'');
  const dir=join(destRoot,name);
  try{await access(dir)}catch{destination=dir;break}
 }
 if(!destination)throw Error('No free snapshot name');
 const temporary=destination+'.tmp-'+process.pid;
 await mkdir(temporary,{recursive:false});
 try{
  await mkdir(join(temporary,'content'));
  await cp(fromContent,join(temporary,'content/site.json'),{force:false});
  await cp(fromAssets,join(temporary,'assets'),{recursive:true,force:false});
  const files=await inspect(temporary);
  const manifest={format:1,createdAt:new Date().toISOString(),files};
  await writeFile(join(temporary,manifestName),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  await rename(temporary,destination);
  return {path:destination,fileCount:files.length,bytes:files.reduce((n,x)=>n+x.bytes,0)};
 }catch(err){await rm(temporary,{recursive:true,force:true});throw err}
}
export async function verifySnapshot(directory){
 const root=resolve(directory);
 const manifest=JSON.parse(await readFile(join(root,manifestName),'utf8'));
 if(manifest.format!==1||!Array.isArray(manifest.files))throw Error('Unsupported snapshot manifest');
 const actual=await inspect(root);
 const expected=[...manifest.files].sort((a,b)=>String(a.path).localeCompare(String(b.path)));
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Snapshot checksum or file list mismatch');
 return {path:root,fileCount:actual.length,bytes:actual.reduce((n,x)=>n+x.bytes,0)};
}
export async function restoreSnapshot(source,target){
 source=resolve(source);target=resolve(target);
 await verifySnapshot(source);
 try{await access(target);throw Error('Restore destination already exists; refusing to overwrite')}catch(error){
  if(error.code!=='ENOENT')throw error;
 }
 await mkdir(target,{recursive:false});
 try{
  await cp(join(source,'content'),join(target,'content'),{recursive:true,force:false});
  await cp(join(source,'assets'),join(target,'assets'),{recursive:true,force:false});
  // Restored folder is a stand-alone TA_DATA_ROOT, not another overwritten site.
  await inspect(target);
  return {path:target};
 }catch(error){await rm(target,{recursive:true,force:true});throw error}
}
const direct=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){
 const dataRoot=resolve(process.env.TA_DATA_ROOT||projectRoot),action=process.argv[2];
 try{
  let result;
  if(action==='create')result=await createSnapshot(dataRoot,process.argv[3]||join(dataRoot,'backups'));
  else if(action==='verify'&&process.argv[3])result=await verifySnapshot(process.argv[3]);
  else if(action==='restore'&&process.argv[3]&&process.argv[4])result=await restoreSnapshot(process.argv[3],process.argv[4]);
  else throw Error('Usage: node scripts/site-snapshot.mjs create [backup-parent] | verify <snapshot-path> | restore <snapshot-path> <new-empty-target-path>');
  console.log(action.toUpperCase()+' OK '+JSON.stringify(result));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
