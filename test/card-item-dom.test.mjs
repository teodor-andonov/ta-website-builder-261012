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
 for(const scope of [...data.pages,...data.components,...data.templates])walk(scope.blocks);
 assert.ok(all.filter(n=>n.type==='card'&&n.source).length>=4);
 assert.ok(all.some(n=>n.type==='card'&&n.reference));
 assert.ok(!all.some(n=>n.type==='query'||n.type==='component'||n.type==='block'));
});
test('semantic Page/Nav/Main/Footer and authored Cards occupy real DOM nodes',()=>{
 const html=renderPagePreview(data,home.blocks,null,{route:'/'});
 assert.match(html,/<div class="card card-page webpage view/);
 assert.match(html,/<nav class="card card-nav /);
 assert.match(html,/<main id="main-content" class="card card-main /);
 assert.match(html,/<footer class="card card-footer /);
 assert.match(html,/<section class="card grid-card /);
 assert.match(html,/<div class="item item-text b-text /);
 assert.match(html,/<figure class="item item-image b-figure /);
 assert.doesNotMatch(html,/class="block(?:\s|")|class="q-entry(?:\s|")|class="b-query/);
 assert.match(html,/card-hero[\s"]/);
 assert.match(html,/grid-column:2\/3;grid-row:1\/2/);
});
test('Work source Card generates linkable project Cards with direct cover and title Items',()=>{
 const html=renderPagePreview(data,work.blocks,null,{route:'/work/'});
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
