import http from 'node:http';
import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validate } from './model.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentFile = path.join(root, 'content', 'site.json');
const studioFile = path.join(root, 'studio', 'index.html');
const port = Number(process.env.PORT || 5173);
const host = '127.0.0.1'; // Never bind this writable API to a network interface.
const maxBytes = 4 * 1024 * 1024;

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
    // Allow the editor to import the *same* ESM renderer that the static build uses.
    if(req.method==='GET' && pathname==='/src/render.mjs')
      return respond(res,200,await readFile(path.join(root,'src','render.mjs')),'text/javascript; charset=utf-8');
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
    if (pathname==='/api/data' && req.method==='PUT') {
      if (!String(req.headers['content-type']||'').startsWith('application/json'))
        return respond(res,415,JSON.stringify({error:'Content-Type must be application/json'}));
      const payload=JSON.parse(await readBody(req));
      validate(payload);
      await atomicSave(payload);
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