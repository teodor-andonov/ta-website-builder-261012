import http from 'node:http';
import { readFile, writeFile, rename, unlink, mkdir } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validate } from './model.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataRoot = process.env.TA_DATA_ROOT ? path.resolve(process.env.TA_DATA_ROOT) : root;
const contentFile = path.join(dataRoot, 'content', 'site.json');
const uploadsDir = path.join(dataRoot, 'assets', 'uploads');
const studioFile = path.join(root, 'studio', 'index.html');
const port = Number(process.env.PORT || 5173);
const host = '127.0.0.1'; // Never bind this writable API to a network interface.
const maxBytes = 4 * 1024 * 1024;
const maxUploadBytes = 12 * 1024 * 1024;
let mutationQueue = Promise.resolve();
const mutate = operation => { const next=mutationQueue.then(operation); mutationQueue=next.catch(()=>{}); return next; };
const allowedImages = new Map([['image/png','png'],['image/jpeg','jpg'],['image/webp','webp'],['image/gif','gif']]);
function fileType(buffer) {
  if(buffer.length>=24 && buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && buffer.toString('ascii',12,16)==='IHDR' && buffer.readUInt32BE(16)>0 && buffer.readUInt32BE(20)>0)return 'image/png';
  if(buffer.length>=4 && buffer[0]===0xff && buffer[1]===0xd8 && buffer[2]===0xff)return 'image/jpeg';
  if(buffer.length>=12 && buffer.toString('ascii',0,4)==='RIFF' && buffer.toString('ascii',8,12)==='WEBP')return 'image/webp';
  if(buffer.length>=13 && ['GIF87a','GIF89a'].includes(buffer.toString('ascii',0,6)))return 'image/gif';
  return '';
}
async function readBinary(req,limit){
  let size=0;const chunks=[];
  for await (const chunk of req){size+=chunk.length;if(size>limit){const err=new Error('Image exceeds 12 MB');err.status=413;throw err;}chunks.push(chunk);}
  return Buffer.concat(chunks);
}
function cleanFilename(value){
  const name=String(value||'').normalize('NFC').trim();
  return name.slice(0,160);
}

function revision(content) {
  return '"'+createHash('sha256').update(content).digest('hex')+'"';
}
function conflictStatus(requestTag,current) {
  if (!requestTag) return {status:428,error:'Reload to obtain the current file revision before saving.'};
  if (requestTag!==revision(current)) return {status:409,error:'JSON changed in another tab or process. Export unsaved JSON before reloading and reconciling.'};
  return null;
}
function respond(res, status, content, type='application/json; charset=utf-8', extra={}) {
  res.writeHead(status, {'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});
  res.end(content);
}
async function readBody(req) {
  let size=0;
  const chunks=[];
  for await (const chunk of req) {
    size+=chunk.length;
    if (size>maxBytes) { const err=new Error('Maximum JSON size is 4 MB');err.status=413;throw err; }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}
async function atomicSave(payload) {
  const temporary=`${contentFile}.${randomUUID()}.tmp`;
  const content=JSON.stringify(payload,null,2)+'\n';
  try { await writeFile(temporary,content,{flag:'wx'}); await rename(temporary,contentFile); }
  finally { await unlink(temporary).catch(()=>{}); }
  return revision(content);
}
const server = http.createServer(async (req,res)=>{
  const origin=req.headers.origin;
  const expectedOrigins = new Set([`http://127.0.0.1:${port}`,`http://localhost:${port}`]);
  if (origin && !expectedOrigins.has(origin)) return respond(res,403,JSON.stringify({error:'Origin not allowed'}));
  let pathname;
  try { pathname=new URL(req.url,`http://${host}:${port}`).pathname; }
  catch { return respond(res,400,JSON.stringify({error:'Invalid URL'})); }
  try {
    if (req.method==='GET' && (pathname==='/' || pathname==='/studio/' || pathname==='/studio/index.html'))
      return respond(res,200,await readFile(studioFile),'text/html; charset=utf-8');
    // Shared styling for the public site and the editor preview, not arbitrary file serving.
    if(req.method==='GET' && pathname==='/src/public.css')
      return respond(res,200,await readFile(path.join(root,'src','public.css')),'text/css; charset=utf-8');
    // Explicit helper allowlist for Studio-only tree editing logic.
    if(req.method==='GET' && pathname==='/src/editor-history.mjs')
      return respond(res,200,await readFile(path.join(root,'src','editor-history.mjs')),'text/javascript; charset=utf-8');
    if(req.method==='GET' && pathname==='/src/tree-editor.mjs')
      return respond(res,200,await readFile(path.join(root,'src','tree-editor.mjs')),'text/javascript; charset=utf-8');
    if(req.method==='GET' && pathname==='/src/model.mjs')
      return respond(res,200,await readFile(path.join(root,'src','model.mjs')),'text/javascript; charset=utf-8');
    if(req.method==='GET' && pathname==='/src/page-assembly.mjs')
      return respond(res,200,await readFile(path.join(root,'src','page-assembly.mjs')),'text/javascript; charset=utf-8');
    if(req.method==='GET' && ['/src/style-system.mjs','/src/asset-query.mjs','/src/asset-usage.mjs'].includes(pathname))
      return respond(res,200,await readFile(path.join(root,'src',path.posix.basename(pathname))),'text/javascript; charset=utf-8');
    // Allow the editor to import the *same* ESM renderer that the static build uses.
    if(req.method==='GET' && pathname==='/src/render.mjs')
      return respond(res,200,await readFile(path.join(root,'src','render.mjs')),'text/javascript; charset=utf-8');
    // Uploaded files are served read-only by opaque, server-generated filenames.
    if(req.method==='GET' && /^\/assets\/uploads\/[a-f0-9]{32}\.(png|jpg|webp|gif)$/.test(pathname)) {
      const name=path.posix.basename(pathname);
      try {return respond(res,200,await readFile(path.join(uploadsDir,name)),{png:'image/png',jpg:'image/jpeg',webp:'image/webp',gif:'image/gif'}[name.split('.').pop()]);}
      catch(err){if(err.code==='ENOENT')return respond(res,404,JSON.stringify({error:'Not found'}));throw err;}
    }
    // Checked-in, inert SVGs are served from a narrow path allowlist. User uploads
    // stay raster-only to avoid executing untrusted SVG content.
    if(req.method==='GET' && /^\/assets\/(?:demo|placeholder)\/[a-z0-9-]+\.svg$/.test(pathname)) {
      const name=path.posix.basename(pathname);
      const group=pathname.startsWith('/assets/placeholder/')?'placeholder':'demo';
      const file=path.join(root,'assets',group,name);
      try{return respond(res,200,await readFile(file),'image/svg+xml; charset=utf-8');}
      catch(err){if(err.code==='ENOENT')return respond(res,404,JSON.stringify({error:'Not found'}));throw err;}
    }
    if (pathname==='/api/data' && req.method==='GET') {
      const content=await readFile(contentFile,'utf8');
      validate(JSON.parse(content));
      return respond(res,200,content,undefined,{'ETag':revision(content)});
    }
    if(pathname==='/api/assets' && req.method==='POST') {
      const mediaType=String(req.headers['content-type']||'').split(';')[0].toLowerCase();
      const ext=allowedImages.get(mediaType);
      if(!ext)return respond(res,415,JSON.stringify({error:'Use PNG, JPEG, WebP or GIF images (SVG is not supported for upload)'}));
      const params=new URL(req.url,`http://${host}:${port}`).searchParams;
      const filename=cleanFilename(params.get('filename'));
      const replaceId=params.get('replaceId');
      if(replaceId!==null&&!/^[a-zA-Z0-9_-]{1,120}$/.test(replaceId))
        return respond(res,400,JSON.stringify({error:'Unsafe asset replacement ID'}));
      if(!filename || /[\/\\\x00-\x1f]/.test(filename) || filename.includes('..'))return respond(res,400,JSON.stringify({error:'Unsafe or missing file name'}));
      const suffix=path.extname(filename).toLowerCase();
      if(!(ext==='jpg'?['.jpg','.jpeg'].includes(suffix):suffix==='.'+ext))return respond(res,415,JSON.stringify({error:'File extension does not match image type'}));
      const bytes=await readBinary(req,maxUploadBytes);
      if(fileType(bytes)!==mediaType)return respond(res,415,JSON.stringify({error:'Image contents do not match its declared type'}));
      const result=await mutate(async()=>{
        const content=await readFile(contentFile,'utf8');
        const conflict=conflictStatus(req.headers['if-match'],content);
        if(conflict){const err=new Error(conflict.error);err.status=conflict.status;throw err;}
        const data=validate(JSON.parse(content));
        const key=randomUUID().replaceAll('-','');
        const dest=path.join(uploadsDir,`${key}.${ext}`);
        const old=replaceId===null?null:data.assets.find(a=>a.id===replaceId);
        if(replaceId!==null&&!old){const err=new Error('Asset to replace was not found');err.status=404;throw err;}
        const asset=old?{
          ...old,
          src:`/assets/uploads/${key}.${ext}`,
          alt:old.placeholder?'':old.alt,
          caption:old.placeholder?'':old.caption,
          credit:old.placeholder?'':old.credit,
          tags:old.placeholder?(old.tags||[]).filter(tag=>tag!=='Placeholder'):old.tags,
          placeholder:false,
          properties:{...(old.properties||{}),filename,mime:mediaType,bytes:bytes.length}
        }:{id:`asset_${key}`,name:filename.replace(/\.[^.]+$/,'').slice(0,120),src:`/assets/uploads/${key}.${ext}`,alt:'',caption:'',credit:'',tags:[],properties:{filename,mime:mediaType,bytes:bytes.length}};
        const next={...data,assets:old?data.assets.map(a=>a.id===old.id?asset:a):[...data.assets,asset]};
        validate(next);
        await mkdir(uploadsDir,{recursive:true});
        let nextRevision;
        try {await writeFile(dest,bytes,{flag:'wx'});nextRevision=await atomicSave(next);}
        catch(error){await unlink(dest).catch(()=>{});throw error;}
        return {asset,etag:nextRevision};
      });
      return respond(res,replaceId===null?201:200,JSON.stringify({ok:true,asset:result.asset}),undefined,{'ETag':result.etag});
    }
    if (pathname==='/api/data' && req.method==='PUT') {
      if (!String(req.headers['content-type']||'').startsWith('application/json'))
        return respond(res,415,JSON.stringify({error:'Content-Type must be application/json'}));
      const payload=JSON.parse(await readBody(req));
      validate(payload);
      const newRevision=await mutate(async()=>{
        const content=await readFile(contentFile,'utf8');
        const conflict=conflictStatus(req.headers['if-match'],content);
        if(conflict){const err=new Error(conflict.error);err.status=conflict.status;throw err;}
        return atomicSave(payload);
      });
      return respond(res,200,JSON.stringify({ok:true}),undefined,{'ETag':newRevision});
    }
    if (req.method!=='GET' && req.method!=='HEAD')
      return respond(res,405,JSON.stringify({error:'Method not allowed'}));
    return respond(res,404,JSON.stringify({error:'Not found'}));
  }catch(error){
    const status=error.status||((error instanceof SyntaxError||/^Invalid |^Missing |^Duplicate |^Unsupported | must /.test(error.message))?400:500);
    if(status===500)console.error(error);
    return respond(res,status,JSON.stringify({error:status===500?'Server error':error.message}));
  }
});
server.listen(port,host,()=>console.log(`TA Content Studio: http://${host}:${port}/`));
