import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,cp,rm,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parsePublicOrigin,publicationSettings} from '../src/publishing.mjs';
import {collectPages} from '../src/render.mjs';
import {inspectMedia} from '../scripts/media-budget.mjs';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const initial=JSON.parse(await readFile(path.join(root,'content/site.json'),'utf8'));
const clone=()=>structuredClone(initial);
const approvedFixture=()=>{
 const data=clone();
 data.site.contact.bookingUrl='https://calendly.com/owned-example/introduction';
 data.pages.forEach(p=>{p.placeholder=false;p.approvedForPublication=true});
 data.collections.forEach(c=>c.records.forEach(r=>{r.placeholder=false;r.approvedForPublication=true}));
 data.assets.forEach(a=>{a.placeholder=false});
 return data;
};
test('M10 preview always has noindex and useful escaped social metadata without unverified canonical',()=>{
 const d=clone();
 assert.deepEqual(publicationSettings(d,{}),{indexing:false,origin:null});
 assert.deepEqual(publicationSettings(d,{TA_PUBLIC_ORIGIN:'https://real-portfolio.com'}),{indexing:false,origin:null});
 for(const p of collectPages(d)){
  assert.match(p.html,/<meta name="robots" content="noindex, nofollow">/);
  assert.match(p.html,/<meta property="og:site_name"/);
  assert.match(p.html,/<meta property="og:title"/);
  assert.match(p.html,/<meta property="og:description"/);
  assert.match(p.html,/<meta name="twitter:card" content="summary">/);
  assert.doesNotMatch(p.html,/<link rel="canonical"/);
  assert.doesNotMatch(p.html,/<meta property="og:url"/);
 }
});
test('M10 rejects unsafe release origin and refuses indexing while sample content remains',()=>{
 for(const bad of ['','http://ta-studio.com','https://localhost','https://127.0.0.1','https://foo.local','https://name:pass@studio.com','https://studio.com/path','https://studio.com/?x=1','https://studio.com:443/','https://example.com','javascript:alert(1)']){
  assert.throws(()=>parsePublicOrigin(bad),/TA_PUBLIC_ORIGIN/);
 }
 assert.equal(parsePublicOrigin('https://portfolio.example.co.uk'),'https://portfolio.example.co.uk');
 assert.throws(()=>publicationSettings(clone(),{TA_ENABLE_INDEXING:'1',TA_PUBLIC_ORIGIN:'https://ta-studio.com'}),/Public indexing blocked/);
 assert.throws(()=>publicationSettings(clone(),{TA_ENABLE_INDEXING:'yes'}),/TA_ENABLE_INDEXING/);
});
test('M10 production-only metadata uses canonical route, article type and verified nonplaceholder image',()=>{
 const d=approvedFixture(),publication=publicationSettings(d,{TA_ENABLE_INDEXING:'1',TA_PUBLIC_ORIGIN:'https://ta-studio.com'});
 const pages=collectPages(d,{publication}),home=pages.find(p=>p.route==='/');
 const work=pages.find(p=>p.route==='/work/balkan-house/'),post=pages.find(p=>p.route==='/posts/designing-with-code/');
 assert.match(home.html,/<meta name="robots" content="index, follow">/);
 assert.match(home.html,/<link rel="canonical" href="https:\/\/ta-studio.com\/">/);
 assert.match(work.html,/<meta property="og:image" content="https:\/\/ta-studio.com\/assets\/placeholder\/house.svg">/);
 assert.match(post.html,/<meta property="og:type" content="article">/);
 assert.match(post.html,/<meta property="og:url" content="https:\/\/ta-studio.com\/posts\/designing-with-code\/">/);
 assert.ok(!pages.some(p=>p.html.includes('href="https://ta-studio.com//')));
});
test('M10 production build emits sitemap/robots only with external approval; preview is not indexed',async()=>{
 const tmp=await mkdtemp(path.join(tmpdir(),'ta-publish-'));
 try{
  const output=path.join(tmp,'published');
  let result=spawnSync(process.execPath,['src/build.mjs'],{
   cwd:root,encoding:'utf8',env:{...process.env,TA_OUTPUT_DIR:output,TA_ENABLE_INDEXING:'1',TA_PUBLIC_ORIGIN:'https://ta-studio.com'},timeout:20000
  });
  assert.notEqual(result.status,0,'Unapproved source should not be indexed');
  assert.match(result.stderr,/Public indexing blocked/);
  const dataRoot=path.join(tmp,'approved-data');
  await mkdir(path.join(dataRoot,'content'),{recursive:true});
  await cp(path.join(root,'assets'),path.join(dataRoot,'assets'),{recursive:true});
  await writeFile(path.join(dataRoot,'content/site.json'),JSON.stringify(approvedFixture()));
  result=spawnSync(process.execPath,['src/build.mjs'],{
   cwd:root,encoding:'utf8',env:{...process.env,TA_DATA_ROOT:dataRoot,TA_OUTPUT_DIR:output,TA_ENABLE_INDEXING:'1',TA_PUBLIC_ORIGIN:'https://ta-studio.com',TA_BASE_PATH:'/repo/'},timeout:20000
  });
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/TA_BASE_PATH=\//);
  result=spawnSync(process.execPath,['src/build.mjs'],{
   cwd:root,encoding:'utf8',env:{...process.env,TA_DATA_ROOT:dataRoot,TA_OUTPUT_DIR:output,TA_ENABLE_INDEXING:'1',TA_PUBLIC_ORIGIN:'https://ta-studio.com',TA_BASE_PATH:'/'},timeout:20000
  });
  assert.equal(result.status,0,result.stderr);
  const sitemap=await readFile(path.join(output,'sitemap.xml'),'utf8');
  const robots=await readFile(path.join(output,'robots.txt'),'utf8');
  const html=await readFile(path.join(output,'index.html'),'utf8');
  assert.match(sitemap,/<loc>https:\/\/ta-studio.com\/work\/balkan-house\/<\/loc>/);
  assert.match(robots,/Sitemap: https:\/\/ta-studio.com\/sitemap.xml/);
  assert.match(html,/<meta name="robots" content="index, follow">/);
  assert.ok((await stat(path.join(output,'posts/designing-with-code/index.html'))).isFile());
 }finally{await rm(tmp,{recursive:true,force:true})}
});
test('M10 media audit counts local files, rejects references that escape assets and missing binaries',async()=>{
 const data=clone();
 const result=await inspectMedia(data,root);
 assert.ok(result.files>=4);
 assert.ok(result.bytes>0 && result.bytes<1024*1024);
 data.assets[0].src='/assets/../../content/site.json';
 await assert.rejects(inspectMedia(data,root),/Unsafe or unsupported/);
 data.assets[0].src='/assets/placeholder/missing-file.svg';
 await assert.rejects(inspectMedia(data,root),/Missing image file/);
});
