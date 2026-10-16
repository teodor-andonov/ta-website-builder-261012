import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderBlocks,renderPagePreview,collectPages} from '../src/render.mjs';
import {validate} from '../src/model.mjs';
const data=validate(JSON.parse(await readFile(new URL('../content/site.json',import.meta.url),'utf8')));
const home=data.pages.find(x=>x.id==='home');
const work=data.pages.find(x=>x.id==='work');

test('canonical graph contains Cards and atomic Items only, with source/reference Cards',()=>{
 const all=[];
 const walk=nodes=>{for(const node of nodes){
  all.push(node);
  assert.ok(['card','text','image','button','rich','divider'].includes(node.type),node.id+' uses '+node.type);
  if(node.type==='card')walk(node.children);
  else assert.equal(node.children,undefined,'Items cannot have children');
 }};
 for(const scope of [...data.pages,...data.components,...data.templates]){walk(scope.blocks);if(scope.composition)walk([scope.composition])}
 assert.ok(all.filter(n=>n.type==='card'&&n.source).length>=4);
 assert.ok(all.some(n=>n.type==='card'&&n.reference));
 assert.ok(!all.some(n=>n.type==='query'||n.type==='component'||n.type==='block'));
});
test('semantic Page/Nav/Main/Footer and authored Cards occupy real DOM nodes',()=>{
 const html=renderPagePreview(data,home.blocks,null,{route:'/'});
 assert.match(html,/<div class="card card-page webpage view/);
 assert.match(html,/<nav class="card card-nav /);
 assert.match(html,/<main id="main-content" tabindex="-1" class="card card-main /);
 assert.match(html,/<footer class="card card-footer /);
 assert.match(html,/<section class="card grid-card /);
 assert.match(html,/<div class="item item-text b-text /);
 assert.match(html,/<figure class="item item-image b-figure(?:\s|")/);
 assert.doesNotMatch(html,/class="block(?:\s|")|class="q-entry(?:\s|")|class="b-query/);
 assert.match(html,/card-hero[\s"]/);
 assert.match(html,/grid-column:2\/3;grid-row:1\/2/);
});
test('Work source Card generates linkable project Cards with direct cover and title Items',()=>{
 const html=renderPagePreview(data,work.blocks,null,{pageId:work.id,route:'/work/'});
 assert.match(html,/card-query/);
 const results=[...html.matchAll(/<a class="card grid-card [^"]*card-record[^"]*"[^>]*href="(\/work\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
 assert.ok(results.length>=4,'expected linked project Cards, found '+results.length);
 for(const [_,href,body] of results){
  assert.match(href,/^\/work\/[a-z0-9-]+\/$/);
  assert.match(body,/class="item item-image b-figure/);
  assert.match(body,/class="item item-text b-text eyebrow/);
  assert.match(body,/class="item item-text b-text body/);
  assert.doesNotMatch(body,/class="block|class="q-entry/);
 }
});
test('Journal rows also use grouped Cards rather than bare query entries',()=>{
 const html=collectPages(data).find(x=>x.route==='/posts/').html;
 assert.match(html,/card-journal-record/);
 assert.match(html,/card-record/);
 assert.doesNotMatch(html,/q-entry/);
});
test('items clip by default, scrolling is opt-in and does not block document wheel',async()=>{
 const css=await readFile(new URL('../src/public.css',import.meta.url),'utf8');
 assert.match(css,/\.item\{[^}]*overflow:clip/);
 assert.match(css,/\.item\.item-scroll\{overflow:auto;/);
 assert.match(css,/overscroll-behavior:auto/);
 assert.doesNotMatch(css,/overscroll-behavior:contain|\.grid-card>\.block/);
 const clip=renderBlocks([{id:'clip',type:'text',text:'Example'}],null,data);
 const scroll=renderBlocks([{id:'scroll',type:'text',text:'Example',overflow:'scroll'}],null,data);
 assert.ok(!clip.includes('item-scroll'));
 assert.ok(scroll.includes('item-scroll'));
 const invalid=structuredClone(data);
 invalid.pages[0].blocks[0].children[0].overflow='invented';
 assert.throws(()=>validate(invalid),/Invalid item overflow/);
});
test('editor uses the shared direct-Card renderer and source Card authoring',async()=>{
 const studio=await readFile(new URL('../studio/index.html',import.meta.url),'utf8');
 assert.match(studio,/source\.template/);
 assert.match(studio,/Clip to grid cell/);
 assert.match(studio,/topLevel:true/);
 assert.match(studio,/\.card\.chosen/);
});


test('annotated homepage has one Card per semantic section, with no redundant wrappers',()=>{
 const sections=home.blocks;
 assert.equal(sections.length,8);
 const byId=id=>{const s=sections.find(x=>x.id===id);assert.ok(s,id);return s};
 const work=byId('m6-work-title');
 assert.equal(work.children.length,4,'3 header Items + 1 record source Card');
 assert.equal(work.children.filter(x=>x.type!=='card').length,3);
 assert.equal(work.children.filter(x=>x.source?.collection==='projects').length,1);
 const journal=byId('m6-journal-title');
 assert.equal(journal.children.filter(x=>x.type!=='card').length,3);
 assert.equal(journal.children.filter(x=>x.source?.collection==='posts').length,1);
 const disciplines=byId('m6-methods-title');
 assert.equal(disciplines.children.length,5,'2 heading Items + 3 practice Cards');
 assert.equal(disciplines.children.filter(x=>x.type==='card').length,3);
 const approach=byId('m6-approach');
 assert.equal(approach.children.length,4,'intro and three format Cards');
 assert.ok(approach.children.every(x=>x.type==='card'));
 const close=byId('m6-close');
 assert.equal(close.children.filter(x=>x.type!=='card').length,3);
 const black=close.children.find(x=>x.type==='card'&&x.background==='black');
 assert.ok(black&&black.children.length===1&&black.children[0].type==='button');
 const html=renderPagePreview(data,sections,null,{route:'/'});
 assert.doesNotMatch(html,/card-nav-links/,'links should occupy the nav Card grid directly');
 assert.match(html,/card-work-section/);
 assert.match(html,/card-methods-section/);
 assert.match(html,/card-journal-section/);
 assert.match(html,/card-close-black/);
});
test('semantic Page, Nav, Main and Footer all have intrinsic rounded corners',async()=>{
 const css=await readFile(new URL('../src/public.css',import.meta.url),'utf8');
 assert.match(css,/\.card-page,[\s\S]*?\.card-nav,[\s\S]*?\.card-main,[\s\S]*?\.card-footer\{[\s\S]*?border-radius:var\(--ta-radius\)/);
 assert.match(css,/\.card-close-black>\.item-button\{[\s\S]*?font:550 3\.3cqw/);
});

test('Work and Journal index headings share a single Card with their collection Card',()=>{
 for(const id of ['work','journal']){
  const page=data.pages.find(p=>p.id===id);
  assert.equal(page.blocks.length,0,id+' uses a shared slot template');
  assert.equal(page.template,'page-general');
  const children=page.composition.children;
  assert.equal(children.length,4,id+' should have 3 Items and one source Card');
  assert.equal(children.filter(b=>b.type!=='card').length,3);
  assert.equal(children.filter(b=>b.type==='card'&&b.source).length,1);
  // One item or Card owns any given top-level grid cell; no accidental overlaps.
  for(let i=0;i<children.length;i++)for(let j=i+1;j<children.length;j++){
    const a=children[i].area,b=children[j].area;
    const collide=Math.max(a.x1,b.x1)<Math.min(a.x2,b.x2)&&
      Math.max(a.y1,b.y1)<Math.min(a.y2,b.y2);
    assert.equal(collide,false,id+' overlapping '+children[i].id+' / '+children[j].id);
  }
 }
});
