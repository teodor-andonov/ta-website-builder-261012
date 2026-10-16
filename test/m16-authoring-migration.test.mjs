import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validate} from '../src/model.mjs';
import {collectPages,renderPagePreview,templateFor} from '../src/render.mjs';
import {findAssetUses} from '../src/asset-usage.mjs';
const seed=JSON.parse(await readFile(new URL('../content/site.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(seed);

test('M16 all demo Pages and Project/Post records own one independent composition',()=>{
 const d=validate(copy());
 assert.equal(d.pages.length,4);
 for(const p of d.pages){
  assert.equal(p.blocks.length,0,p.id+' no duplicate legacy blocks');
  assert.equal(p.template,'page-general',p.id);
  assert.equal(p.composition.type,'card',p.id);
  assert.equal(p.composition.area,undefined,p.id);
  assert.ok(p.composition.children.length,p.id);
 }
 const roots=[];
 for(const c of d.collections)for(const r of c.records){
  assert.ok(r.composition,c.id+'/'+r.id);
  assert.equal(r.template,c.compositionTemplate,c.id+'/'+r.id);
  assert.equal(r.composition.area,undefined,c.id+'/'+r.id);
  roots.push(r.composition.id);
 }
 assert.equal(new Set(roots).size,roots.length);
 assert.equal(roots.length,8);
});
test('M16 all published demo routes retain full template/record preview parity',()=>{
 const d=copy(),pages=collectPages(d);
 assert.equal(pages.length,10);
 for(const p of d.pages.filter(x=>x.status!=='Draft')){
  const route=p.slug==='/'?'/':p.slug.replace(/\/$/,'')+'/';
  const rendered=pages.find(x=>x.route===route);
  assert.ok(rendered,route);
  assert.ok(rendered.html.includes(renderPagePreview(d,p.blocks,null,{pageId:p.id,route})),route);
 }
 for(const c of d.collections)for(const r of c.records.filter(x=>x.status!=='Draft')){
  const route=c.base+'/'+r.slug+'/',rendered=pages.find(x=>x.route===route);
  assert.ok(rendered,route);
  const t=templateFor(d,c,r);
  assert.ok(rendered.html.includes(renderPagePreview(d,t.blocks,r,{route})),route);
 }
});
test('M16 assets report field, direct Image and contextual gallery dependencies',()=>{
 const d=copy(),house=findAssetUses(d,'house'),facade=findAssetUses(d,'facade');
 assert.ok(house.some(x=>x.includes('Balkan House')&&x.includes('cover')));
 assert.ok(house.some(x=>x.includes('gallery balkan-highlights-query')));
 assert.ok(house.some(x=>x.includes('image')));
 assert.ok(facade.some(x=>x.includes('Responsive Envelope')&&x.includes('cover')));
 const unused={id:'unused-m16',name:'Unused sample',src:'/assets/placeholder/unused.svg',alt:'',tags:[],properties:{}};
 d.assets.push(unused);
 assert.deepEqual(findAssetUses(d,'unused-m16'),[],'safe to remove only unused metadata');
});
test('M16 asset scanner responds to metadata updates and fails closed on detached queries',()=>{
 const d=copy(),house=d.assets.find(x=>x.id==='house');
 assert.ok(findAssetUses(d,house.id).some(x=>x.includes('gallery')));
 house.properties.projectCode='detached';
 validate(d);
 assert.ok(!findAssetUses(d,house.id).some(x=>x.includes('gallery')),'no longer matches Balkan metadata');
 assert.ok(findAssetUses(d,house.id).some(x=>x.includes('cover')),'direct cover still protects metadata');
});
test('M16 direct asset references in reusable Components cannot be silently deleted',()=>{
 const d=copy(),card=d.components.find(x=>x.id==='contact-cta').blocks[0];
 if(!card.children)card.children=[];
 card.rows=Math.max(card.rows,2);
 card.children.push({id:'m16-direct-image',type:'image',source:'field',fit:'contain',area:{x1:1,y1:2,x2:2,y2:3}});
 validate(d);
 assert.ok(findAssetUses(d,'field').some(x=>x.includes('Component')&&x.includes('m16-direct-image')));
});
