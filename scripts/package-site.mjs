// Host-independent, no-dependency static site ZIP packager.
// A package is always a *local* deliverable, never a deployment.
// By default it is noindex preview; production requires the existing gated build.
import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,readdir,lstat,realpath,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {deflateRawSync} from 'node:zlib';
import {resolve,join,relative,sep,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const utf8=name=>Buffer.from(name,'utf8');
function crc32(buffer){
 let crc=-1;
 for(const value of buffer){
  crc^=value;
  for(let b=0;b<8;b++)crc=(crc>>>1)^(crc&1?0xedb88320:0);
 }
 return (crc^(-1))>>>0;
}
async function walk(directory,base=directory,files=[]){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const full=join(directory,entry.name);
  if(entry.isSymbolicLink())throw Error('Packaging refuses symlinks: '+full);
  if(entry.isDirectory())await walk(full,base,files);
  else if(entry.isFile())files.push({name:relative(base,full).split(sep).join('/'),full});
  else throw Error('Packaging refuses non-file entries: '+full);
 }
 return files;
}
function zipEntries(entries){
 if(entries.length>65535)throw Error('Too many files for a simple ZIP');
 let offset=0;
 const locals=[],central=[];
 for(const {name,bytes} of entries){
  const path=utf8(name);
  if(path.length>65535||name.startsWith('/')||name.split('/').includes('..'))throw Error('Unsafe ZIP entry');
  const packed=deflateRawSync(bytes,{level:6}),checksum=crc32(bytes),flags=0x800;
  if(packed.length>0xffffffff||bytes.length>0xffffffff)throw Error('File too large for ZIP32');
  const local=Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);
  local.writeUInt16LE(flags,6);local.writeUInt16LE(8,8);local.writeUInt16LE(0x21,12); // DOS date 1980-01-01
  local.writeUInt32LE(checksum,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(bytes.length,22);
  local.writeUInt16LE(path.length,26);
  const cd=Buffer.alloc(46);
  cd.writeUInt32LE(0x02014b50,0);cd.writeUInt16LE(20,4);cd.writeUInt16LE(20,6);
  cd.writeUInt16LE(flags,8);cd.writeUInt16LE(8,10);cd.writeUInt16LE(0x21,14);
  cd.writeUInt32LE(checksum,16);cd.writeUInt32LE(packed.length,20);cd.writeUInt32LE(bytes.length,24);
  cd.writeUInt16LE(path.length,28);cd.writeUInt32LE(offset,42);
  locals.push(local,path,packed);central.push(cd,path);
  offset+=local.length+path.length+packed.length;
 }
 const cdSize=central.reduce((n,x)=>n+x.length,0);
 if(offset>0xffffffff||cdSize>0xffffffff)throw Error('ZIP archive exceeds ZIP32 bounds');
 const end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);
 end.writeUInt32LE(cdSize,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...locals,...central,end]);
}
export async function packageSite({dist=join(root,'dist'),destination,build=true,env=process.env}={}){
 dist=resolve(dist);
 if(!destination)throw Error('An explicit ZIP output filename is required');
 destination=resolve(destination);
 if(destination===dist||destination.startsWith(dist+sep))throw Error('ZIP must be outside the public folder');
 if(build){
  // Root-relative archive works with an independent static host, not a repo subpath.
  const result=spawnSync(process.execPath,['src/build.mjs'],{
   cwd:root,encoding:'utf8',timeout:120000,
   env:{...env,TA_BASE_PATH:'/',TA_OUTPUT_DIR:dist}
  });
  if(result.status!==0)throw Error('Static build rejected: '+(result.stderr||result.stdout||'unknown error').slice(0,1000));
 }
 const files=(await walk(dist)).sort((a,b)=>a.name.localeCompare(b.name));
 if(!files.some(f=>f.name==='index.html')||!files.some(f=>f.name==='site.css')||!files.some(f=>f.name==='404.html'))
  throw Error('Missing required public site files');
 if(files.some(f=>/(^|\/)(?:studio|content|src|backups|logs)(\/|$)/.test(f.name)||/\.(?:mjs|map)$/.test(f.name)))
  throw Error('Private editor or source file is present in static output');
 const html=await readFile(join(dist,'index.html'),'utf8');
 if(!html.includes('<meta name="robots" content="index, follow">'))
  throw Error('ZIP requires a normally published static website');
 let size=0;
 const entries=[],manifestFiles=[];
 for(const file of files){
  const bytes=await readFile(file.full);
  size+=bytes.length;
  if(size>64*1024*1024)throw Error('Static release package exceeds 64 MiB (uncompressed)');
  entries.push({name:file.name,bytes});
  manifestFiles.push({path:file.name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 const manifest={format:1,kind:'TA static site',indexable:true,files:manifestFiles};
 entries.push({name:'release-manifest.json',bytes:Buffer.from(JSON.stringify(manifest,null,2)+'\n')});
 const zip=zipEntries(entries);
 await mkdir(dirname(destination),{recursive:true});
 // Explicit package paths can be replaced (unlike a live content restore).
 await writeFile(destination,zip);
 return {destination,files:manifestFiles.length,bytes:size,zipBytes:zip.length,indexable:true};
}
const invoked=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 const destination=resolve(process.argv[2]||join(root,'release','website.zip'));
 try{console.log('STATIC PACKAGE OK '+JSON.stringify(await packageSite({destination})))}
 catch(error){console.error(error.message);process.exitCode=1}
}
