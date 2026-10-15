/** Check real deployment output rather than trusting build success alone. */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeBasePath } from '../src/deploy-paths.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','dist');
const base=normalizeBasePath(process.env.TA_BASE_PATH||'/');
const failures=[];
const checked=[];
async function walk(dir){
  for(const name of await readdir(dir)) {
    const file=path.join(dir,name);
    if((await stat(file)).isDirectory())await walk(file);
    else if(name.endsWith('.html'))checked.push(file);
  }
}
await walk(root);
for(const file of checked){
  const content=await readFile(file,'utf8');
  if(!file.endsWith('404.html') && !content.includes('name="robots" content="index, follow"'))failures.push(`${file}: missing public robots metadata`);
  for(const [,attr,href] of content.matchAll(/\b(href|src|poster|action)="([^"]+)"/g)){
    if(!href.startsWith('/') || href.startsWith('//'))continue;
    if(!href.startsWith(base)) {failures.push(`${file}: wrong-base ${attr}=${href}`);continue;}
    const p=href.slice(base.length).split(/[?#]/)[0];
    const safe=p.split('/').filter(Boolean);
    if(safe.includes('..')||safe.some(segment=>segment.includes('\\'))) {failures.push(`${file}: unsafe link ${href}`);continue;}
    let dest=path.join(root,...safe);
    if(!path.extname(dest))dest=path.join(dest,'index.html');
    try{if(!(await stat(dest)).isFile())failures.push(`${file}: missing ${href}`);}catch{failures.push(`${file}: broken ${href}`);}
  }
}
for(const must of ['index.html','work/index.html','posts/index.html','404.html','site.css','assets/demo/field.svg']) {
  try{await stat(path.join(root,must));}catch{failures.push(`Missing ${must}`);}
}
for(const mustNot of ['studio/index.html','src/server.mjs','content/site.json']){
  try{await stat(path.join(root,mustNot));failures.push(`Private editor/source leaked: ${mustNot}`);}catch{}
}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
else console.log(`Verified ${checked.length} HTML files and all internal paths under ${base}; editor/API not deployed.`);