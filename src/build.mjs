import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './model.mjs';
import { collectPages } from './render.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataRoot=process.env.TA_DATA_ROOT?path.resolve(process.env.TA_DATA_ROOT):root;
const output=process.env.TA_OUTPUT_DIR?path.resolve(process.env.TA_OUTPUT_DIR):path.join(root,'dist');
const data=validate(JSON.parse(await readFile(path.join(dataRoot,'content','site.json'),'utf8')));
const pages=collectPages(data);
const html=await readFile(path.join(root,'studio','index.html'),'utf8');
const css=html.match(/<style>([\s\S]*?)<\/style>/i)?.[1];
if(!css)throw Error('Missing prototype CSS');
// Validation happens before cleanup of prior dist output.
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await writeFile(path.join(output,'site.css'),css+'\nbody.published-site{background:white;margin:0}.published-site .webpage{max-width:1600px;margin:0 auto;border:0;box-shadow:none}.published-site .q-entry{text-decoration:none;display:block;}\n');
await cp(path.join(dataRoot,'assets'),path.join(output,'assets'),{recursive:true});
for(const page of pages){
  const safeRoute=page.route==='/'?'':page.route.replace(/^\/+|\/+$/g,'');
  const folder=path.join(output,safeRoute);
  if(!folder.startsWith(output))throw Error('Invalid build path');
  await mkdir(folder,{recursive:true});
  await writeFile(path.join(folder,'index.html'),page.html);
}
console.log(`Built ${pages.length} static pages to dist/`);