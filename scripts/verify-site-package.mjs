/**
 * M11 third-party/static-host handoff verifier.
 * Reads actual ZIP bytes and validates every entry against release-manifest.json,
 * checks archive boundaries/CRC/size/path safety, and checks the document's indexing mode and optional sitemap consistency.
 * Read-only; does not extract anything or deploy to a host.
 */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const maxTotal=64*1024*1024,maxZip=80*1024*1024;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function crc32(buffer){
 let crc=-1;
 for(const n of buffer){crc^=n;for(let i=0;i<8;i++)crc=(crc>>>1)^(crc&1?0xedb88320:0)}
 return (crc^(-1))>>>0;
}
const requireBounds=(bytes,offset,length)=>{
 if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(length)||offset<0||length<0||offset+length>bytes.length)
  throw Error('Truncated or corrupt ZIP structure');
};
function secureName(name){
 if(!name||name.startsWith('/')||name.includes('\\')||name.includes('\0')||
    name.split('/').some(s=>!s||s==='.'||s==='..')||/[^\x20-\x7e]/.test(name))
   throw Error('Unsafe ZIP path: '+name);
 if(/(^|\/)(?:studio|content|src|backups|logs)(\/|$)/i.test(name)||/\.(?:mjs|map)$/i.test(name))
   throw Error('Private source file in release archive: '+name);
}
export function verifySiteArchive(bytes){
 if(!Buffer.isBuffer(bytes))throw Error('Package must be ZIP bytes');
 if(bytes.length>maxZip||bytes.length<22)throw Error('Invalid ZIP byte size');
 const end=bytes.length-22;
 requireBounds(bytes,end,22);
 if(bytes.readUInt32LE(end)!==0x06054b50||bytes.readUInt16LE(end+20)!==0)
  throw Error('ZIP central-directory trailer missing or unsupported');
 const count=bytes.readUInt16LE(end+10);
 if(bytes.readUInt16LE(end+8)!==count||bytes.readUInt16LE(end+4)!==0||
    bytes.readUInt16LE(end+6)!==0)throw Error('Multi-disk ZIP is unsupported');
 const directorySize=bytes.readUInt32LE(end+12),directoryStart=bytes.readUInt32LE(end+16);
 if(directoryStart+directorySize!==end)throw Error('ZIP central-directory size mismatch');
 requireBounds(bytes,directoryStart,directorySize);
 const found=new Map();let total=0,position=directoryStart;
 for(let i=0;i<count;i++){
  requireBounds(bytes,position,46);
  if(bytes.readUInt32LE(position)!==0x02014b50)throw Error('ZIP central-directory entry missing');
  const flags=bytes.readUInt16LE(position+8),method=bytes.readUInt16LE(position+10);
  const checksum=bytes.readUInt32LE(position+16),packed=bytes.readUInt32LE(position+20);
  const unpacked=bytes.readUInt32LE(position+24),nameSize=bytes.readUInt16LE(position+28);
  const extra=bytes.readUInt16LE(position+30),comment=bytes.readUInt16LE(position+32);
  const localOffset=bytes.readUInt32LE(position+42);
  requireBounds(bytes,position+46,nameSize+extra+comment);
  if(flags!==0x800||method!==8)throw Error('Unsupported ZIP compression/flags');
  const name=bytes.toString('utf8',position+46,position+46+nameSize);
  secureName(name);
  if(found.has(name))throw Error('Duplicate ZIP path: '+name);
  if(unpacked>maxTotal||total+unpacked>maxTotal)throw Error('Package size budget exceeded');
  requireBounds(bytes,localOffset,30);
  if(bytes.readUInt32LE(localOffset)!==0x04034b50)throw Error('ZIP local entry missing');
  const localNameSize=bytes.readUInt16LE(localOffset+26),localExtra=bytes.readUInt16LE(localOffset+28);
  requireBounds(bytes,localOffset+30,localNameSize+localExtra);
  const actualName=bytes.toString('utf8',localOffset+30,localOffset+30+localNameSize);
  if(actualName!==name||bytes.readUInt16LE(localOffset+6)!==flags||
     bytes.readUInt16LE(localOffset+8)!==method||
     bytes.readUInt32LE(localOffset+14)!==checksum||
     bytes.readUInt32LE(localOffset+18)!==packed||
     bytes.readUInt32LE(localOffset+22)!==unpacked)
    throw Error('ZIP local and central headers disagree: '+name);
  const dataOffset=localOffset+30+localNameSize+localExtra;
  requireBounds(bytes,dataOffset,packed);
  if(dataOffset+packed>directoryStart)throw Error('ZIP compressed data overlaps directory');
  let payload;
  try{payload=inflateRawSync(bytes.subarray(dataOffset,dataOffset+packed),{maxOutputLength:maxTotal+1})}
  catch{throw Error('Corrupt compressed file: '+name)}
  if(payload.length!==unpacked||crc32(payload)!==checksum)throw Error('ZIP content checksum mismatch: '+name);
  found.set(name,payload);
  total+=payload.length;
  position+=46+nameSize+extra+comment;
 }
 if(position!==end)throw Error('Unexpected central-directory bytes');
 const manifestBytes=found.get('release-manifest.json');
 if(!manifestBytes)throw Error('Missing release-manifest.json');
 let manifest;
 try{manifest=JSON.parse(manifestBytes.toString('utf8'))}catch{throw Error('Invalid release manifest JSON')}
 if(manifest.format!==1||manifest.kind!=='TA static site'||typeof manifest.indexable!=='boolean'||
    !Array.isArray(manifest.files)||manifest.files.length!==found.size-1)throw Error('Invalid release manifest');
 const expected=new Set();
 for(const entry of manifest.files){
  if(typeof entry.path!=='string')throw Error('Invalid release manifest path');
  secureName(entry.path);
  if(expected.has(entry.path)||entry.path==='release-manifest.json')throw Error('Duplicate manifest entry');
  expected.add(entry.path);
  const actual=found.get(entry.path);
  if(!actual||entry.bytes!==actual.length||entry.sha256!==hash(actual))
   throw Error('Release file hash mismatch or missing: '+entry.path);
 }
 if([...found.keys()].some(name=>name!=='release-manifest.json'&&!expected.has(name)))
  throw Error('Unlisted file in ZIP');
 for(const required of ['index.html','404.html','site.css','robots.txt']){
  if(!found.has(required))throw Error('Missing essential static file: '+required);
 }
 const htmlFiles=[...found.entries()].filter(([name])=>name.endsWith('.html'));
 const robots=found.get('robots.txt').toString('utf8');
 for(const [name,htmlBytes] of htmlFiles){
  const html=htmlBytes.toString('utf8');
  if(manifest.indexable){
   if(name!=='404.html'&&!html.includes('name="robots" content="index, follow"'))
    throw Error('Public page lacks indexable metadata: '+name);
  }else if(!html.includes('name="robots" content="noindex'))
    throw Error('Unindexed package contains indexable HTML: '+name);
 }
 if(manifest.indexable){
  if(!robots.includes('Allow: /'))throw Error('Public package must allow crawlers');
  if(found.has('sitemap.xml')!==robots.includes('Sitemap: https://'))
   throw Error('Sitemap and robots.txt disagree');
 }else if(found.has('sitemap.xml')||!robots.includes('Allow: /')||robots.includes('Sitemap:'))
  throw Error('Unindexed package must remain crawlable for noindex discovery, without a sitemap');
 return {files:manifest.files.length,bytes:total,indexable:manifest.indexable,valid:true};
}
export async function verifySitePackage(path){return verifySiteArchive(await readFile(resolve(path)))}
const invoked=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 try{
  const path=process.argv[2]||join(root,'release','website.zip');
  console.log('M11_PACKAGE_VERIFIED '+JSON.stringify(await verifySitePackage(path)));
 }catch(error){console.error('M11_PACKAGE_INVALID '+error.message);process.exitCode=1}
}
