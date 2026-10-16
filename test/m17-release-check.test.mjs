import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {validate} from '../src/model.mjs';
import {collectPages} from '../src/render.mjs';
import {prefixSitePaths} from '../src/deploy-paths.mjs';
import {checkOutput,routeFile,fingerprintAuthoring} from '../scripts/release-check.mjs';
import {VISUAL_REVIEW_ROUTES,VISUAL_REVIEW_VIEWPORTS} from '../scripts/release-screenshots.mjs';

const sample=JSON.parse(await readFile(new URL('../content/site.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(sample);
async function fixture(dir,data,{base='/',origin=null}={}){
 await mkdir(dir,{recursive:true});
 await cp(new URL('../assets/',import.meta.url),join(dir,'assets'),{recursive:true});
 await writeFile(join(dir,'site.css'),'/* M17 fixture */');
 await writeFile(join(dir,'404.html'),'<meta name="robots" content="noindex">');
 const pages=collectPages(data,origin?{publication:{indexing:true,origin}}:{});
 for(const item of pages){
  const file=join(dir,routeFile(item.route));
  await mkdir(dirname(file),{recursive:true});
  await writeFile(file,prefixSitePaths(item.html,base));
 }
 if(origin){
  await writeFile(join(dir,'sitemap.xml'),'<urlset>\n'+pages.map(p=>'  <url><loc>'+origin+p.route+'</loc></url>').join('\n')+'\n</urlset>\n');
  await writeFile(join(dir,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: '+origin+'/sitemap.xml\n');
 }else await writeFile(join(dir,'robots.txt'),'User-agent: *\nAllow: /\n');
}
test('M17 route-to-file mapping rejects traversal while retaining all public paths',()=>{
 assert.equal(routeFile('/'),'index.html');
 assert.equal(routeFile('/work/'),'work/index.html');
 assert.equal(routeFile('/posts/geometry-as-language/'),'posts/geometry-as-language/index.html');
 for(const route of ['/../','/work/../','//evil/','/work','/work/%2e%2e/'])
   assert.throws(()=>routeFile(route),/Unsafe generated route/);
});
test('M17 release link scanner verifies real rendered route targets at both root and Pages subpath',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'ta-m17-links-'));
 try{
  const data=validate(copy()),base='/ta-website-builder-261012/';
  await fixture(join(temp,'root'),data);
  await fixture(join(temp,'pages'),data,{base});
  assert.equal((await checkOutput(join(temp,'root'),data)).pages,10);
  assert.equal((await checkOutput(join(temp,'pages'),data,{base})).pages,10);
  const target=join(temp,'root','assets','placeholder','house.svg');
  await rm(target);
  await assert.rejects(checkOutput(join(temp,'root'),data),/Broken src/);
 }finally{await rm(temp,{recursive:true,force:true})}
});
test('M17 release link scanner rejects inconsistent indexing mode or leaked editor files',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'ta-m17-invalid-'));
 try{
  const data=validate(copy());await fixture(temp,data);
  await assert.rejects(checkOutput(temp,data,{indexing:true}),/Wrong indexing metadata/);
  await mkdir(join(temp,'studio'));await writeFile(join(temp,'studio','index.html'),'private');
  await assert.rejects(checkOutput(temp,data),/Private files in static output/);
 }finally{await rm(temp,{recursive:true,force:true})}
});
test('M17 indexable custom-domain scanner accepts canonical metadata and sitemap',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'ta-m17-indexable-'));
 try{
  const data=copy();data.site.publishing.indexing=true;validate(data);
  const origin='https://ta-studio.com';await fixture(temp,data,{origin});
  const checked=await checkOutput(temp,data,{indexing:true,origin});
  assert.equal(checked.pages,10);
  assert.equal(checked.sitemap,true);
  assert.equal(checked.robots,'index, follow');
  await writeFile(join(temp,'sitemap.xml'),'<urlset/>');
  await assert.rejects(checkOutput(temp,data,{indexing:true,origin}),/Sitemap missing canonical route/);
 }finally{await rm(temp,{recursive:true,force:true})}
});

test('M17 fingerprints all editable JSON and media, including assets not referenced in JSON',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'ta-m17-fingerprint-'));
 try{
  await mkdir(join(temp,'content'));await mkdir(join(temp,'assets'));
  await writeFile(join(temp,'content','site.json'),'{"demo":true}\n');
  await writeFile(join(temp,'assets','image.svg'),'<svg/>');
  const original=await fingerprintAuthoring(temp);
  assert.equal(original.files,2);
  assert.deepEqual(await fingerprintAuthoring(temp),original);
  await writeFile(join(temp,'assets','image.svg'),'<svg><!-- modified --></svg>');
  assert.notEqual((await fingerprintAuthoring(temp)).sha256,original.sha256);
  await writeFile(join(temp,'assets','unreferenced.svg'),'<svg/>');
  assert.equal((await fingerprintAuthoring(temp)).files,3);
  await writeFile(join(temp,'content','site.json'),'{"demo":false}\n');
  assert.notEqual((await fingerprintAuthoring(temp)).sha256,original.sha256);
 }finally{await rm(temp,{recursive:true,force:true})}
});

test('M17 visual acceptance is desktop-only across five representative public routes',()=>{
 assert.deepEqual(VISUAL_REVIEW_VIEWPORTS,[['desktop',1440,900]]);
 assert.equal(VISUAL_REVIEW_ROUTES.length,5);
 assert.equal(new Set(VISUAL_REVIEW_ROUTES.map(([,route])=>route)).size,5);
 const routes=new Set(collectPages(copy()).map(p=>p.route));
 for(const [,route] of VISUAL_REVIEW_ROUTES)assert.ok(routes.has(route),route);
});
