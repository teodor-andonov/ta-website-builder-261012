import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validate } from '../src/model.mjs';
const fixture=JSON.parse(await readFile(new URL('../content/site.json', import.meta.url),'utf8'));
const copy = () => structuredClone(fixture);
test('initial content is valid',()=>assert.equal(validate(copy()).version,2));
test('duplicate slugs rejected',()=>{
  const d=copy();d.collections[1].records[1].slug=d.collections[1].records[0].slug;
  assert.throws(()=>validate(d),/Duplicate posts slug/);
});
test('duplicate page routes rejected',()=>{
  const d=copy();d.pages[1].slug=d.pages[0].slug;
  assert.throws(()=>validate(d),/Duplicate route/);
});
test('unsafe paths and slugs rejected',()=>{
  const d=copy();d.collections[0].records[0].slug='../secret';
  assert.throws(()=>validate(d),/Invalid projects slug/);
});
test('broken template links rejected',()=>{
  const d=copy();d.collections[0].defaultTemplate='nonexistent';
  assert.throws(()=>validate(d),/Missing default template/);
});
import { collectPages } from '../src/render.mjs';
test('builds real project and post routes but not drafts',()=>{
  const pages=collectPages(copy());
  assert.ok(pages.some(x=>x.route==='/posts/designing-with-code/' && x.html.includes('On designing with code')));
  assert.ok(pages.some(x=>x.route==='/work/balkan-house/' && x.html.includes('Balkan House')));
  assert.ok(!pages.some(x=>x.route==='/posts/soft-modules/'));
});
test('shared template edits update all project pages',()=>{
  const d=copy();
  d.templates.find(t=>t.id==='project-detail').blocks.unshift({id:'test-marker',type:'text',text:'TEST EDIT IN TEMPLATE',style:'caption'});
  const pages=collectPages(d).filter(p=>p.route.startsWith('/work/'));
  assert.ok(pages.length>=2);
  assert.ok(pages.every(p=>p.html.includes('TEST EDIT IN TEMPLATE')));
});
test('HTML injection in records is escaped',()=>{
  const d=copy();
  d.collections[1].records[0].title='<img src=x onerror=alert(1)>';
  const page=collectPages(d).find(p=>p.route==='/posts/designing-with-code/');
  assert.ok(page.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!page.html.includes('<img src=x onerror=alert(1)>'));
});

test('public pages do not link to unpublished indexes or studio',()=>{
  const pages=collectPages(copy());
  const post=pages.find(p=>p.route==='/posts/designing-with-code/');
  assert.ok(post);
  assert.ok(!post.html.includes('href="/"'));
  assert.ok(!post.html.includes('href="/work/"'));
  assert.ok(!post.html.includes('href="/posts/"'));
  assert.ok(!post.html.includes('href="/studio/"'));
  const d=copy();
  d.pages.find(p=>p.id==='home').status='Published';
  d.pages.find(p=>p.id==='work').status='Published';
  const live=collectPages(d).find(p=>p.route==='/posts/designing-with-code/');
  assert.ok(live.html.includes('href="/"'));
  assert.ok(live.html.includes('href="/work/"'));
  assert.ok(!live.html.includes('href="/posts/"'));
});