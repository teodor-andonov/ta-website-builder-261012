import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validate } from '../src/model.mjs';
import { collectPages, renderPagePreview, resolvePreviewRoute, templateFor } from '../src/render.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=validate(JSON.parse(await readFile(path.join(root,'content/site.json'),'utf8')));
const pages=collectPages(data);
const routes=new Set(pages.map(x=>x.route));

test('three JSON-composed public indexes exist alongside generated detail pages',()=>{
  assert.equal(pages.length,10);
  for(const route of ['/','/work/','/posts/'])assert.ok(routes.has(route),route);
  assert.ok(!routes.has('/studio/'));
  assert.ok(!routes.has('/posts/soft-modules/'));
});
test('every internal link on every public page resolves to a built page',()=>{
  for(const {route,html} of pages){
    for(const match of html.matchAll(/href="([^"#]+)"/g)){
      const href=match[1];
      if(!href.startsWith('/') || href==='/site.css')continue;
      const normalized=href==='/'?'/':`${href.replace(/\/+$/,'')}/`;
      assert.ok(routes.has(normalized),`Broken internal link ${route} -> ${href}`);
    }
    assert.ok(!html.includes('href="/studio/"'),route);
    assert.match(html,/<meta name="robots" content="noindex, nofollow">/);
  }
});
test('navigation highlights current top-level section on detail and index pages',()=>{
  for(const [route,section] of [['/','/'],['/work/','/work/'],['/work/balkan-house/','/work/'],['/posts/','/posts/'],['/posts/designing-with-code/','/posts/']]){
    const html=pages.find(x=>x.route===route)?.html;
    assert.ok(html,`missing ${route}`);
    assert.ok(html.includes(`href="${section}" data-site-route="${section}" aria-current="page"`) && /class="item item-link is-active"/.test(html),route);
  }
});
test('editor preview remains identical to published document for bespoke pages and records',()=>{
  for(const item of data.pages.filter(x=>x.status==='Published')){
    const page=pages.find(x=>x.route===resolvePreviewRoute(data,item.blocks));
    const preview=renderPagePreview(data,item.blocks);
    assert.ok(page?.html.includes(preview),item.id);
  }
  for(const collection of data.collections)for(const record of collection.records.filter(r=>r.status!=='Draft')){
    const template=templateFor(data,collection,record);
    const page=pages.find(x=>x.route===`${collection.base}/${record.slug}/`);
    assert.ok(page?.html.includes(renderPagePreview(data,template.blocks,record)),record.slug);
  }
});
test('JSON nav rejects invalid, duplicate and unsafe routes',()=>{
  for(const href of ['//evil.example','javascript:alert(1)','/work/../../','https://example.com','/work?abc']){
    const d=structuredClone(data);d.site.navigation[1].href=href;
    assert.throws(()=>validate(d),/Invalid navigation route/,href);
  }
  const d=structuredClone(data);d.site.navigation.push({label:'Duplicate',href:'/work'});
  assert.throws(()=>validate(d),/Duplicate navigation route/);
});
test('static build emits root and indexes, stylesheet, fallback and no editor',async()=>{
  const tmp=await mkdtemp(path.join(tmpdir(),'ta-m4-build-'));
  const output=path.join(tmp,'dist');
  try{
    const result=spawnSync(process.execPath,['src/build.mjs'],{cwd:root,encoding:'utf8',env:{...process.env,TA_OUTPUT_DIR:output},timeout:15000});
    assert.equal(result.status,0,result.stderr);
    for(const name of ['index.html','work/index.html','posts/index.html','work/balkan-house/index.html','404.html','site.css']){
      assert.ok((await stat(path.join(output,name))).isFile(),name);
    }
    await assert.rejects(stat(path.join(output,'studio/index.html')));
    assert.match(await readFile(path.join(output,'site.css'),'utf8'),/M7 \/ Print-native Card system/);
  }finally{await rm(tmp,{recursive:true,force:true});}
});