import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp,mkdtemp,rm,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parsePublicOrigin,publicationSettings} from '../src/publishing.mjs';
import {collectPages} from '../src/render.mjs';
import {validate} from '../src/model.mjs';
import {inspectMedia} from '../scripts/media-budget.mjs';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const initial=JSON.parse(await readFile(path.join(root,'content/site.json'),'utf8'));
const clone=()=>structuredClone(initial);

test('placeholder website requests no indexing from the JSON publishing switch',()=>{
 const d=clone();
 assert.deepEqual(publicationSettings(d,{}),{indexing:false,origin:null});
 for(const page of collectPages(d)){
  assert.match(page.html,/<meta name="robots" content="noindex, nofollow">/);
  assert.match(page.html,/<meta property="og:site_name"/);
  assert.match(page.html,/<meta property="og:title"/);
  assert.match(page.html,/<meta property="og:description"/);
  assert.match(page.html,/<meta name="twitter:card" content="summary">/);
  assert.doesNotMatch(page.html,/<link rel="canonical"/);
  assert.doesNotMatch(page.html,/<meta property="og:url"/);
 }
});
test('switching indexing on and off is independent of editorial approval',()=>{
 const d=clone();
 assert.equal(publicationSettings(d,{}).indexing,false);
 d.site.publishing.indexing=true;
 assert.equal(publicationSettings(d,{}).indexing,true);
 assert.ok(collectPages(d).every(p=>p.html.includes('content="index, follow"')));
 delete d.site.publishing;
 assert.doesNotThrow(()=>validate(d)); // Legacy V1 content remains indexable unless explicitly switched off.
 assert.equal(publicationSettings(d,{}).indexing,true);
 for(const invalid of [null,true,{indexing:'no'},{indexing:0},{indexing:true,typo:false}]){
  d.site.publishing=invalid;
  assert.throws(()=>validate(d),/site.publishing.indexing/);
 }
});
test('optional HTTPS canonical origin is checked independently from editing or content approval',()=>{
 for(const bad of ['','http://ta-studio.com','https://localhost','https://127.0.0.1',
  'https://foo.local','https://name:pass@studio.com','https://studio.com/path',
  'https://studio.com/?x=1','https://example.com','javascript:alert(1)'])
   assert.throws(()=>parsePublicOrigin(bad),/TA_PUBLIC_ORIGIN/);
 assert.equal(parsePublicOrigin('https://portfolio.example.co.uk'),'https://portfolio.example.co.uk');
 assert.deepEqual(publicationSettings(clone(),{TA_PUBLIC_ORIGIN:'https://ta-studio.com'}),
   {indexing:false,origin:'https://ta-studio.com'});
});
test('optional root-domain metadata includes canonical page URLs and true article type',()=>{
 const d=clone();d.site.publishing.indexing=true;
 const publication=publicationSettings(d,{TA_PUBLIC_ORIGIN:'https://ta-studio.com'});
 const pages=collectPages(d,{publication});
 const home=pages.find(p=>p.route==='/'),post=pages.find(p=>p.route==='/posts/designing-with-code/');
 assert.match(home.html,/<link rel="canonical" href="https:\/\/ta-studio.com\/">/);
 assert.match(post.html,/<meta property="og:type" content="article">/);
 assert.match(post.html,/<meta property="og:url" content="https:\/\/ta-studio.com\/posts\/designing-with-code\/">/);
 assert.ok(pages.every(p=>p.html.includes('content="index, follow"')));
 assert.ok(!pages.some(p=>p.html.includes('href="https://ta-studio.com//')));
});
test('local and Pages builds preserve noindex; an explicitly indexable custom-domain build creates a sitemap',async()=>{
 const tmp=await mkdtemp(path.join(tmpdir(),'ta-public-output-'));
 try{
  const output=path.join(tmp,'website');
  let run=spawnSync(process.execPath,['src/build.mjs'],{
   cwd:root,encoding:'utf8',env:{...process.env,TA_OUTPUT_DIR:output,TA_PUBLIC_ORIGIN:'',TA_BASE_PATH:'/'},timeout:25000
  });
  assert.equal(run.status,0,run.stderr);
  assert.match(await readFile(path.join(output,'robots.txt'),'utf8'),/Allow: \/(?:\n|$)/);
  assert.match(await readFile(path.join(output,'index.html'),'utf8'),/name="robots" content="noindex, nofollow"/);
  await assert.rejects(stat(path.join(output,'sitemap.xml')));
  const pagesOutput=path.join(tmp,'pages-dist');
  run=spawnSync(process.execPath,['src/build.mjs'],{
   cwd:root,encoding:'utf8',env:{...process.env,TA_OUTPUT_DIR:pagesOutput,TA_BASE_PATH:'/ta-website-builder-261012/',TA_PUBLIC_ORIGIN:''},timeout:25000
  });
  assert.equal(run.status,0,run.stderr);
  assert.match(await readFile(path.join(pagesOutput,'index.html'),'utf8'),/href="\/ta-website-builder-261012\/site.css"/);
  assert.match(await readFile(path.join(pagesOutput,'robots.txt'),'utf8'),/Allow: \/(?:\n|$)/);
  assert.match(await readFile(path.join(pagesOutput,'index.html'),'utf8'),/name="robots" content="noindex, nofollow"/);
  run=spawnSync(process.execPath,['src/build.mjs'],{
   cwd:root,encoding:'utf8',env:{...process.env,TA_OUTPUT_DIR:path.join(tmp,'invalid'),TA_PUBLIC_ORIGIN:'https://ta-studio.com',TA_BASE_PATH:'/repo/'},timeout:25000
  });
  assert.notEqual(run.status,0);
  assert.match(run.stderr,/TA_PUBLIC_ORIGIN requires a root-domain build/);
  run=spawnSync(process.execPath,['src/build.mjs'],{
   cwd:root,encoding:'utf8',env:{...process.env,TA_OUTPUT_DIR:path.join(tmp,'custom'),TA_PUBLIC_ORIGIN:'https://ta-studio.com',TA_BASE_PATH:'/'},timeout:25000
  });
  assert.equal(run.status,0,run.stderr);
  assert.match(await readFile(path.join(tmp,'custom','index.html'),'utf8'),/name="robots" content="noindex, nofollow"/);
  await assert.rejects(stat(path.join(tmp,'custom','sitemap.xml')));
  const publishedRoot=path.join(tmp,'indexed-source');
  await mkdir(path.join(publishedRoot,'content'),{recursive:true});
  await cp(path.join(root,'assets'),path.join(publishedRoot,'assets'),{recursive:true});
  const indexed=clone();indexed.site.publishing.indexing=true;
  await writeFile(path.join(publishedRoot,'content','site.json'),JSON.stringify(indexed));
  run=spawnSync(process.execPath,['src/build.mjs'],{
   cwd:root,encoding:'utf8',env:{...process.env,TA_DATA_ROOT:publishedRoot,TA_OUTPUT_DIR:path.join(tmp,'indexed'),TA_PUBLIC_ORIGIN:'https://ta-studio.com',TA_BASE_PATH:'/'},timeout:25000
  });
  assert.equal(run.status,0,run.stderr);
  assert.match(await readFile(path.join(tmp,'indexed','index.html'),'utf8'),/name="robots" content="index, follow"/);
  assert.match(await readFile(path.join(tmp,'indexed','sitemap.xml'),'utf8'),/https:\/\/ta-studio.com\/work\/balkan-house\//);
  assert.match(await readFile(path.join(tmp,'indexed','robots.txt'),'utf8'),/Sitemap: https:\/\/ta-studio.com\/sitemap.xml/);
 }finally{await rm(tmp,{recursive:true,force:true})}
});
test('media audit still rejects unsafe and missing binaries, independently of publication',async()=>{
 const d=clone(),result=await inspectMedia(d,root);
 assert.ok(result.files>=4);assert.ok(result.bytes>0);
 d.assets[0].src='/assets/../../content/site.json';
 await assert.rejects(inspectMedia(d,root),/Unsafe or unsupported/);
 d.assets[0].src='/assets/placeholder/missing-file.svg';
 await assert.rejects(inspectMedia(d,root),/Missing image file/);
});
