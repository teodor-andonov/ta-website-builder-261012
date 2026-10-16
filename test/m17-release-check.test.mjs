import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {validate} from '../src/model.mjs';
import {collectPages} from '../src/render.mjs';
import {prefixSitePaths} from '../src/deploy-paths.mjs';
import {checkOutput,routeFile} from '../scripts/release-check.mjs';

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
  await writeFile(join(dir,'sitemap.xml'),'<urlset/>\n');
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
 }finally{await rm(temp,{recursive:true,force:true})}
});
