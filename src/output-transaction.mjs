/**
 * File-first static build publishing: write to a sibling staging directory and
 * replace the previous generated folder only after all files were written.
 * On error the last-good static output remains intact.
 */
import {mkdir,rm,rename,stat,lstat} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {resolve,dirname,join,basename,sep} from 'node:path';

const contains=(parent,child)=>child===parent||child.startsWith(parent+sep);
function assertSafeOutput(destination,projectRoot,dataRoot){
 const output=resolve(destination),project=resolve(projectRoot),data=resolve(dataRoot);
 if(output===project||output===data||contains(output,project)||contains(output,data))
  throw Error('Refusing to overwrite a source/data root with a static build');
 for(const root of [project,data]){
  for(const part of ['content','assets','src','studio','scripts','test','docs','.git','backups','prototype-v2']){
   if(contains(join(root,part),output))throw Error('Refusing to build into protected source/media path');
  }
 }
 return output;
}
const exists=async path=>{
 try{return await lstat(path)}catch(e){if(e.code==='ENOENT')return null;throw e}
};
async function generatedOutput(dir){
 for(const name of ['index.html','site.css','404.html']){
  const item=await stat(join(dir,name)).catch(()=>null);
  if(!item?.isFile())return false;
 }
 return true;
}
export async function withAtomicStaticOutput(destination,{projectRoot,dataRoot},build){
 const output=assertSafeOutput(destination,projectRoot,dataRoot);
 if(typeof build!=='function')throw Error('A build callback is required');
 await mkdir(dirname(output),{recursive:true});
 const id=process.pid+'-'+randomUUID();
 const temporary=join(dirname(output),'.'+basename(output)+'.ta-staging-'+id);
 const prior=join(dirname(output),'.'+basename(output)+'.ta-prior-'+id);
 await mkdir(temporary);
 let renamedOld=false,installedNew=false;
 try{
  await build(temporary);
  if(!(await generatedOutput(temporary)))throw Error('Static build missing required HTML, CSS or 404');
  const old=await exists(output);
  if(old){
   if(!old.isDirectory()||!(await generatedOutput(output)))
    throw Error('Refusing to replace a folder that is not a recognised generated static site');
   await rename(output,prior);
   renamedOld=true;
  }
  try{
   await rename(temporary,output);
   installedNew=true;
  }catch(error){
   if(renamedOld)await rename(prior,output);
   renamedOld=false;
   throw error;
  }
  if(renamedOld){await rm(prior,{recursive:true,force:true});renamedOld=false}
  return output;
 }finally{
  await rm(temporary,{recursive:true,force:true}).catch(()=>{});
  // If an error occurred after a partial swap, leave the old directory
  // untouched rather than silently deleting a recoverable copy.
  if(!installedNew&&renamedOld){
   const old=await exists(output);
   if(!old)await rename(prior,output);
  }
 }
}
