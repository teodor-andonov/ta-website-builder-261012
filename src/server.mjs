import http from 'node:http';
import { readFile, writeFile, rename, unlink, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
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

function respond(res, status, content, type='application/json; charset=utf-8') {
  res.writeHead(status, {'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
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
  try { await writeFile(temporary,JSON.stringify(payload,null,2)+'\n',{flag:'wx'}); await rename(temporary,contentFile); }
  finally { await unlink(temporary).catch(()=>{}); }
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
    // Fixed, allowlisted module: pure canvas grid editor math; no arbitrary file serving.
    if(req.method==='GET' && pathname==='/src/grid-editor.mjs')
      return respond(res,200,await readFile(path.join(root,'src','grid-editor.mjs')),'text/javascript; charset=utf-8');
    // Allow the editor to import the *same* ESM renderer that the static build uses.
    if(req.method==='GET' && pathname==='/src/render.mjs')
      return respond(res,200,await readFile(path.join(root,'src','render.mjs')),'text/javascript; charset=utf-8');
    // Uploaded files are served read-only by opaque, server-generated filenames.
    if(req.method==='GET' && /^\/assets\/uploads\/[a-f0-9]{32}\.(png|jpg|webp|gif)$/.test(pathname)) {
      const name=path.posix.basename(pathname);
      try {return respond(res,200,await readFile(path.join(uploadsDir,name)),{png:'image/png',jpg:'image/jpeg',webp:'image/webp',gif:'image/gif'}[name.split('.').pop()]);}
      catch(err){if(err.code==='ENOENT')return respond(res,404,JSON.stringify({error:'Not found'}));throw err;}
    }
    // Shared asset path, strictly allow-listed to known demo SVGs (no file traversal).
    if(req.method==='GET' && /^\/assets\/demo\/[a-z0-9-]+\.svg$/.test(pathname)) {
      const name=path.posix.basename(pathname);
      const file=path.join(root,'assets','demo',name);
      try{return respond(res,200,await readFile(file),'image/svg+xml; charset=utf-8');}
      catch(err){if(err.code==='ENOENT')return respond(res,404,JSON.stringify({error:'Not found'}));throw err;}
    }
    if (pathname==='/api/data' && req.method==='GET') {
      const content=await readFile(contentFile,'utf8');
      validate(JSON.parse(content));
      return respond(res,200,content);
    }
    if(pathname==='/api/assets' && req.method==='POST') {
      const mediaType=String(req.headers['content-type']||'').split(';')[0].toLowerCase();
      const ext=allowedImages.get(mediaType);
      if(!ext)return respond(res,415,JSON.stringify({error:'Use PNG, JPEG, WebP or GIF images (SVG is not supported for upload)'}));
      const filename=cleanFilename(new URL(req.url,`http://${host}:${port}`).searchParams.get('filename'));
      if(!filename || /[\/\\\x00-\x1f]/.test(filename) || filename.includes('..'))return respond(res,400,JSON.stringify({error:'Unsafe or missing file name'}));
      const suffix=path.extname(filename).toLowerCase();
      if(!(ext==='jpg'?['.jpg','.jpeg'].includes(suffix):suffix==='.'+ext))return respond(res,415,JSON.stringify({error:'File extension does not match image type'}));
      const bytes=await readBinary(req,maxUploadBytes);
      if(fileType(bytes)!==mediaType)return respond(res,415,JSON.stringify({error:'Image contents do not match its declared type'}));
      const newAsset=await mutate(async()=>{
        const data=validate(JSON.parse(await readFile(contentFile,'utf8')));
        const key=randomUUID().replaceAll('-','');
        const dest=path.join(uploadsDir,`${key}.${ext}`);
        const asset={id:`asset_${key}`,name:filename.replace(/\.[^.]+$/,'').slice(0,120),src:`/assets/uploads/${key}.${ext}`,alt:'',caption:'',credit:'',tags:[],properties:{filename,mime:mediaType,bytes:bytes.length}};
        const next={...data,assets:[...data.assets,asset]};
        validate(next);
        await mkdir(uploadsDir,{recursive:true});
        try {await writeFile(dest,bytes,{flag:'wx'});await atomicSave(next);}
        catch(error){await unlink(dest).catch(()=>{});throw error;}
        return asset;
      });
      return respond(res,201,JSON.stringify({ok:true,asset:newAsset}));
    }
    if (pathname==='/api/data' && req.method==='PUT') {
      if (!String(req.headers['content-type']||'').startsWith('application/json'))
        return respond(res,415,JSON.stringify({error:'Content-Type must be application/json'}));
      const payload=JSON.parse(await readBody(req));
      validate(payload);
      await mutate(()=>atomicSave(payload));
      return respond(res,200,JSON.stringify({ok:true}));
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