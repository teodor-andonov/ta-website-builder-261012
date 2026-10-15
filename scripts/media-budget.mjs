// Build-time verification of the actual local image assets shipped in static output.
// No external resources or user credentials required.
import {stat,realpath,readFile} from 'node:fs/promises';
import {resolve,relative,sep,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const maxSingle=12*1024*1024,maxTotal=32*1024*1024;

export async function inspectMedia(data,dataRoot=root){
 const base=resolve(dataRoot,'assets'),safeBase=await realpath(base);
 const results=[],seen=new Set();
 for(const asset of data.assets||[]){
  const src=asset.src;
  if(typeof src!=='string'||!/^\/assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:png|jpg|jpeg|webp|gif|svg)$/.test(src))
    throw Error('Unsafe or unsupported local asset path: '+asset.id);
  const filepath=resolve(dataRoot,'.'+src);
  const resolved=await realpath(filepath).catch(()=>{throw Error('Missing image file for '+asset.id+': '+src)});
  if(resolved===safeBase||!resolved.startsWith(safeBase+sep))
    throw Error('Asset escapes the approved media folder: '+asset.id);
  const file=await stat(resolved);
  if(!file.isFile()||!file.size||file.size>maxSingle)throw Error('Media size budget exceeded for '+asset.id+': '+file.size+' bytes');
  if(!seen.has(resolved)){
   seen.add(resolved);
   results.push({src,bytes:file.size});
  }
 }
 const total=results.reduce((sum,x)=>sum+x.bytes,0);
 if(total>maxTotal)throw Error('Total media budget exceeded: '+total+' bytes');
 return {files:results.length,bytes:total,limitPerFile:maxSingle,limitTotal:maxTotal};
}
const invoked=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 const dataRoot=resolve(process.env.TA_DATA_ROOT||root);
 try{
  const data=JSON.parse(await readFile(resolve(dataRoot,'content/site.json'),'utf8'));
  const result=await inspectMedia(data,dataRoot);
  console.log('Media budget OK: '+result.files+' files, '+result.bytes+' bytes (12 MiB/file, 32 MiB total)');
 }catch(error){console.error('Media budget failure: '+error.message);process.exitCode=1}
}
