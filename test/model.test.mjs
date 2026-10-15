import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validate } from '../src/model.mjs';
const fixture=JSON.parse(await readFile(new URL('../content/site.json', import.meta.url),'utf8'));
const copy = () => structuredClone(fixture);
test('initial content is valid',()=>assert.equal(validate(copy()).version,2));
test('M8 rejects duplicate IDs across a Card and its descendant within one page',()=>{
  const d=copy();
  const parent=d.pages[0].blocks.find(n=>n.type==='card'&&n.children?.length);
  assert.ok(parent);
  parent.children[0].id=parent.id;
  assert.throws(()=>validate(d),/Duplicate node ID in home: /);
});
test('M8 rejects duplicate sibling IDs in one authoring scope',()=>{
  const d=copy();
  const parent=d.pages[0].blocks.find(n=>n.type==='card'&&n.children?.length>1);
  assert.ok(parent);
  parent.children[1].id=parent.children[0].id;
  assert.throws(()=>validate(d),/Duplicate node ID in home: /);
});
test('M8 rejects duplicate node IDs in a component independently of pages',()=>{
  const d=copy();
  const parent=d.components.find(x=>x.blocks.some(n=>n.type==='card'&&n.children?.length));
  const card=parent.blocks.find(n=>n.type==='card'&&n.children?.length);
  card.children[0].id=card.id;
  assert.throws(()=>validate(d),new RegExp('Duplicate node ID in '+parent.id+': '));
});
test('M8 allows node IDs reused in independent page scopes',()=>{
  const d=copy();
  d.pages[1].blocks[0].id=d.pages[0].blocks[0].id;
  assert.doesNotThrow(()=>validate(d));
});
test('M8 rejects direct self-reference in reusable components',()=>{
  const d=copy(),component=d.components[0];
  component.blocks[0].reference=component.id;
  assert.throws(()=>validate(d),/Circular component reference: contact-cta -> contact-cta/);
});
test('M8 rejects indirect cycles across two reusable components',()=>{
  const d=copy(),[first,second]=d.components;
  first.blocks[0].reference=second.id;
  second.blocks[0].reference=first.id;
  assert.throws(()=>validate(d),/Circular component reference:/);
});
test('M8 rejects a collection Card that recursively instantiates its own component',()=>{
  const d=copy(),component=d.components[0];
  component.blocks[0].source={
    collection:d.collections[0].id,
    template:component.id,
    layout:'grid',sort:'newest',filter:'featured',count:4
  };
  assert.throws(()=>validate(d),/Circular component reference:/);
});
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
  const pages=collectPages(d).filter(p=>p.route.startsWith('/work/') && p.route!=='/work/');
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

test('public navigation includes three live indexes but excludes the draft Studio page',()=>{
  const pages=collectPages(copy());
  const post=pages.find(p=>p.route==='/posts/designing-with-code/');
  assert.ok(post);
  for(const href of ['/', '/work/', '/posts/'])assert.ok(post.html.includes(`href="${href}"`));
  assert.ok(!post.html.includes('href="/studio/"'));
  for(const route of ['/', '/work/', '/posts/'])assert.ok(pages.some(p=>p.route===route));
  assert.ok(!pages.some(p=>p.route==='/studio/'));
  const d=copy();d.pages.find(p=>p.id==='work').status='Draft';
  const hidden=collectPages(d).find(p=>p.route==='/posts/designing-with-code/');
  assert.ok(!hidden.html.includes('href="/work/"'));
});