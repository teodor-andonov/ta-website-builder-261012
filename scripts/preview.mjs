// One-command, dependency-free preview of the generated PUBLIC website.
// Builds exactly the root-hosted static output and serves it on loopback only.
// Use npm run dev for the desktop Content Studio editor instead.
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'dist');
const port=Number(process.env.TA_PREVIEW_PORT)||4173;
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid preview port');
const build=spawnSync(process.execPath,['src/build.mjs'],{
  cwd:root,stdio:'inherit',env:{...process.env,TA_BASE_PATH:'/',TA_OUTPUT_DIR:''}
});
if(build.status!==0)process.exit(build.status||1);
const mime={
  '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg',
  '.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif',
  '.ico':'image/x-icon','.json':'application/json; charset=utf-8'
};
const server=http.createServer(async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){
    res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;
  }
  try{
    const reqUrl=new URL(req.url,'http://127.0.0.1');
    const name=decodeURIComponent(reqUrl.pathname);
    if(name.includes('\0')||name.includes('\\'))throw new Error('Invalid path');
    let target=path.resolve(out,'.'+name);
    if(target!==out&&!target.startsWith(out+path.sep))throw new Error('Outside preview');
    let info=await stat(target).catch(()=>null);
    if(info?.isDirectory()){target=path.join(target,'index.html');info=await stat(target).catch(()=>null);}
    if(!info?.isFile()){
      res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});
      res.end('404 — Not found');return;
    }
    const bytes=await readFile(target);
    res.writeHead(200,{'Content-Type':mime[path.extname(target).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(req.method==='HEAD'?undefined:bytes);
  }catch(error){
    res.writeHead(400,{'Content-Type':'text/plain; charset=utf-8'});
    res.end('Bad request');
  }
});
server.on('error',error=>{console.error('Unable to start the preview server:',error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{
  console.log('Public site preview: http://127.0.0.1:'+port+'/');
  console.log('This is LOCAL ONLY and does not publish anything to GitHub.');
  console.log('Stop with Ctrl+C or stop the VS Code npm script task.');
});
