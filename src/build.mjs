import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './model.mjs';
import { collectPages } from './render.mjs';
import {publicationSettings} from './publishing.mjs';
import {inspectMedia} from '../scripts/media-budget.mjs';
import { normalizeBasePath, prefixSitePaths, prefixCssPaths } from './deploy-paths.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataRoot=process.env.TA_DATA_ROOT?path.resolve(process.env.TA_DATA_ROOT):root;
const output=process.env.TA_OUTPUT_DIR?path.resolve(process.env.TA_OUTPUT_DIR):path.join(root,'dist');
const basePath=normalizeBasePath(process.env.TA_BASE_PATH || '/');
const data=validate(JSON.parse(await readFile(path.join(dataRoot,'content','site.json'),'utf8')));
const publication=publicationSettings(data,process.env);
const media=await inspectMedia(data,dataRoot);
const pages=collectPages(data,{publication});
if(publication.indexing&&basePath!=='/')throw Error('External production release requires TA_BASE_PATH=/');
console.log('Media preflight: '+media.files+' assets, '+media.bytes+' bytes; indexing '+(publication.indexing?'enabled':'disabled'));
// Published CSS is independent of legacy editor chrome. Only strict grayscale print styles ship.
// Validation happens before cleanup of prior dist output.
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await writeFile(path.join(output,'site.css'),prefixCssPaths(await readFile(path.join(root,'src','public.css'),'utf8'),basePath));
await cp(path.join(dataRoot,'assets'),path.join(output,'assets'),{recursive:true});
for(const page of pages){
  const safeRoute=page.route==='/'?'':page.route.replace(/^\/+|\/+$/g,'');
  const folder=path.join(output,safeRoute);
  if(folder!==output && !folder.startsWith(output+path.sep))throw Error('Invalid build path');
  await mkdir(folder,{recursive:true});
  await writeFile(path.join(folder,'index.html'),prefixSitePaths(page.html,basePath));
}
console.log(`Built ${pages.length} static pages to dist/`);
if(publication.indexing){
  const urls=pages.map(({route})=>publication.origin+route).sort();
  const sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
    urls.map(loc=>'  <url><loc>'+loc+'</loc></url>').join('\n')+'\n</urlset>\n';
  await writeFile(path.join(output,'sitemap.xml'),sitemap);
  await writeFile(path.join(output,'robots.txt'),
    'User-agent: *\nAllow: /\nSitemap: '+publication.origin+'/sitemap.xml\n');
}else{
  // Staging remains intentionally hidden even if it lives on a public URL.
  await writeFile(path.join(output,'robots.txt'),'User-agent: *\nDisallow: /\n');
}

await writeFile(path.join(output,'404.html'),prefixSitePaths(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found — TA</title><link rel="stylesheet" href="/site.css"><meta name="robots" content="noindex"></head><body class="published-site"><div class="webpage"><nav class="web-nav"><a class="web-logo" href="/">TA/</a></nav><main class="web-content"><p class="b-text eyebrow">404 / PAGE NOT FOUND</p><h1 class="not-found-title">Nothing here.</h1><p>The address may have moved, or the page is still a draft.</p><p><a class="b-action" href="/">Back to the index →</a></p></main></div></body></html>`,basePath));
