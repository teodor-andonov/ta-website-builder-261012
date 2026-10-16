import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validate} from '../src/model.mjs';
import {collectPages,renderPagePreview,renderChromeComponent} from '../src/render.mjs';

const canonical=JSON.parse(await readFile(new URL('../content/site.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(canonical);
const htmlAt=(data,route)=>collectPages(data).find(p=>p.route===route)?.html;
const node=(data,id)=>data.components.find(c=>c.id===id);

test('M12 semantic Navbar/Footer are referenced Cards, not additional published wrappers',()=>{
 const data=validate(copy());
 assert.equal(data.site.chrome.navigation,'site-navbar');
 assert.equal(data.site.chrome.footer,'site-footer');
 const nav=node(data,'site-navbar'),footer=node(data,'site-footer');
 assert.equal(nav.frameRole,'navigation');
 assert.equal(footer.frameRole,'footer');
 assert.equal(nav.blocks.length,1);
 assert.equal(footer.blocks.length,1);
 assert.equal(data.templates.find(t=>t.id==='page-general').chrome.navigation,nav.id);
 assert.equal(data.templates.find(t=>t.id==='page-general').chrome.footer,footer.id);
 for(const item of collectPages(data)){
  assert.equal((item.html.match(/<nav class="card card-nav /g)||[]).length,1,item.route);
  assert.equal((item.html.match(/<footer class="card card-footer /g)||[]).length,1,item.route);
  assert.match(item.html,/<main id="main-content" tabindex="-1"/);
  assert.match(item.html,/class="item item-logo web-logo/);
  assert.match(item.html,/class="item item-footer/);
 }
});
test('Navbar uses one canonical navigation list, filters drafts and tracks section on record pages',()=>{
 const data=copy();
 let page=htmlAt(data,'/work/balkan-house/');
 assert.match(page,/href="\/work\/" data-site-route="\/work\/" aria-current="page"/);
 assert.doesNotMatch(page,/href="\/studio\/"/);
 assert.match(page,/class="item item-link/);
 data.site.navigation[1].label='Portfolio';
 data.site.navigation[1].href='/work/';
 validate(data);
 page=htmlAt(data,'/work/balkan-house/');
 assert.match(page,/>Portfolio<\/a>/);
 assert.equal((page.match(/href="\/work\/"/g)||[]).length,1,'no duplicated authored Navbar link');
});
test('Shared Component edits flow through all routes without editing page bodies',()=>{
 const data=copy(),before=htmlAt(data,'/');
 node(data,'site-navbar').blocks[0].children[0].text='ARCH/';
 node(data,'site-footer').blocks[0].children[0].text='{{site.name}} / RESEARCH';
 validate(data);
 for(const route of ['/','/work/','/posts/','/work/balkan-house/']){
  const html=htmlAt(data,route);
  assert.match(html,/ARCH<span style="font-weight:300">\/<\/span>/,route);
  assert.match(html,/Design &amp; Research \/ RESEARCH/,route);
 }
 assert.notEqual(htmlAt(data,'/'),before);
 const isolated=renderChromeComponent(data,'navigation',{design:true,selectedId:'site-navbar-logo'});
 assert.match(isolated,/data-node-id="site-navbar-logo"/);
 assert.match(isolated,/class="item item-logo web-logo/);
});
test('Template overrides one Footer while reusing global Navbar across pages',()=>{
 const data=copy(),second=structuredClone(node(data,'site-footer'));
 second.id='studio-footer';second.name='Studio Footer';
 second.blocks[0].id='studio-footer-root';
 second.blocks[0].children.forEach((item,i)=>item.id='studio-footer-item-'+i);
 second.blocks[0].children[0].text='ALTERNATE FOOTER';
 data.components.push(second);
 const general=data.templates.find(t=>t.id==='page-general');
 general.chrome.footer=second.id;
 validate(data);
 for(const route of ['/work/','/posts/']){
  const html=htmlAt(data,route);
  assert.match(html,/ALTERNATE FOOTER/,route);
  assert.match(html,/TA<span style="font-weight:300">\/<\/span>/,route);
 }
 assert.match(htmlAt(data,'/'),/ALTERNATE FOOTER/,'Home now shares the General template');
 assert.doesNotMatch(htmlAt(data,'/work/balkan-house/'),/ALTERNATE FOOTER/,'record template inherits default');
 assert.match(renderPagePreview(data,data.pages.find(p=>p.id==='journal').blocks,null,{pageId:'journal',route:'/posts/'}),/ALTERNATE FOOTER/);
 assert.match(renderChromeComponent(data,'footer',{componentId:second.id}),/ALTERNATE FOOTER/);
});
test('Frame layout settings remain on the authored Card and render into semantic landmarks',()=>{
 const data=copy(),nav=node(data,'site-navbar').blocks[0],footer=node(data,'site-footer').blocks[0];
 nav.background='grey-100';nav.gap='x2';nav.padding='x2';nav.heightFactor=.08;
 footer.background='black';
 validate(data);
 const html=htmlAt(data,'/');
 assert.match(html,/<nav class="[^"]*bg-grey-100 gap-x2 pad-x2[^"]*"[^>]*aspect-ratio:1 \/ 0.08/);
 assert.match(html,/<footer class="[^"]*bg-black/);
 assert.match(html,/aria-label="Main navigation"/);
});
test('Invalid or dangling frame references are rejected before saving',()=>{
 const mutate=apply=>{const d=copy();apply(d);return d};
 const invalid=[
  d=>{d.site.chrome.navigation='missing';},
  d=>{d.site.chrome.footer='site-navbar';},
  d=>{d.site.chrome.unknown='site-navbar';},
  d=>{d.templates.find(t=>t.id==='page-general').chrome.footer='site-navbar';},
  d=>{d.templates.find(t=>t.id==='page-general').chrome={footer:'missing'};},
  d=>{node(d,'site-navbar').blocks[0].columns=6;},
  d=>{node(d,'site-footer').blocks.push(structuredClone(node(d,'site-footer').blocks[0]));},
  d=>{node(d,'site-navbar').blocks[0].children[0].href='/work/';},
  d=>{node(d,'site-navbar').blocks[0].children[0].variant='other';}
 ];
 for(const apply of invalid)assert.throws(()=>validate(mutate(apply)),/site.chrome|template|semantic site frame|Navigation component|Duplicate node/,String(apply));
});
test('Old sites without chrome refs retain the legacy shell without content loss',()=>{
 const data=copy();delete data.site.chrome;
 for(const t of data.templates)delete t.chrome;
 assert.doesNotThrow(()=>validate(data));
 const html=htmlAt(data,'/');
 assert.match(html,/<nav class="card card-nav web-nav grid-card semantic-header bg-transparent"/);
 assert.match(html,/<footer class="card card-footer web-footer grid-card semantic-footer bg-transparent"/);
 assert.match(html,/aria-current="page"/);
});
