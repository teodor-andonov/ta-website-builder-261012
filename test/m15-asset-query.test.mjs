import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validate} from '../src/model.mjs';
import {queryAssets,validateAssetSource} from '../src/asset-query.mjs';
import {collectPages,renderPagePreview,templateFor} from '../src/render.mjs';

const original=JSON.parse(await readFile(new URL('../content/site.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(original);
const balkan=d=>d.collections.find(c=>c.id==='projects').records.find(r=>r.id==='p-balkan');
const gallery=d=>balkan(d).composition.children.find(n=>n.source?.kind==='assets');
const html=(d,route)=>collectPages(d).find(p=>p.route===route)?.html;
test('M15 typed projectCode plus tag AND filters resolve against the active Project',()=>{
 const d=validate(copy()),b=balkan(d),q=gallery(d).source;
 assert.equal(b.projectCode,'4424');
 assert.deepEqual(q.where.map(p=>p.field),['projectCode','tags']);
 assert.deepEqual(queryAssets(q,d.assets,b).map(a=>a.id),['house']);
 assert.deepEqual(queryAssets(q,d.assets,null),[],'no record context must fail closed');
 assert.deepEqual(queryAssets(q,d.assets,{projectCode:''}),[],'empty code must not return unassociated assets');
 const other=d.collections.find(c=>c.id==='projects').records.find(r=>r.id==='p-facade');
 assert.deepEqual(queryAssets(q,d.assets,other).map(a=>a.id),[],'code matches facade but the Architecture tag excludes it');
});
test('M15 tags contains matches a tag as one array member, case insensitively',()=>{
 const d=copy(),q={kind:'assets',where:[{field:'tags',op:'contains',value:'rEsEaRcH'}],sort:'original',layout:'grid',count:10};
 assert.deepEqual(queryAssets(q,d.assets).map(a=>a.id),['facade']);
 q.where[0].value='sea';
 assert.deepEqual(queryAssets(q,d.assets),[],'contains on a tags array is membership, not string substring');
});
test('M15 name contains is substring, name eq is exact and sort/count are deterministic',()=>{
 const d=copy(),q={kind:'assets',where:[{field:'name',op:'contains',value:'placeholder'}],sort:'name',layout:'three',count:2};
 const match=queryAssets(q,d.assets);
 assert.equal(match.length,2);
 assert.deepEqual(match.map(x=>x.name),match.map(x=>x.name).sort((a,b)=>a.localeCompare(b,'en')));
 q.count=10;q.sort='original';
 assert.deepEqual(queryAssets(q,d.assets).map(x=>x.id),['house','facade']);
 q.where[0]={field:'name',op:'eq',value:'Housing study placeholder'};
 assert.deepEqual(queryAssets(q,d.assets).map(x=>x.id),['house']);
});
test('M15 AND is strict, empty values fail closed and query never mutates assets',()=>{
 const d=copy(),before=structuredClone(d.assets),q=gallery(d).source;
 const cloned=structuredClone(q);
 cloned.where.push({field:'name',op:'contains',value:'does not exist'});
 assert.deepEqual(queryAssets(cloned,d.assets,balkan(d)),[]);
 cloned.where[2].value='Housing';
 assert.deepEqual(queryAssets(cloned,d.assets,balkan(d)).map(a=>a.id),['house']);
 assert.deepEqual(d.assets,before);
 assert.deepEqual(cloned.where[0].value,'{{projectCode}}','query evaluation must not replace authored binding');
});
test('M15 Balkan House query uses real Image Items, alt text, caption and public-preview parity',()=>{
 const d=copy(),b=balkan(d),detail=html(d,'/work/balkan-house/');
 assert.match(detail,/HIGHLIGHTED ASSETS/);
 assert.match(detail,/card-query/);
 assert.match(detail,/src="\/assets\/placeholder\/house.svg"/);
 assert.match(detail,/alt="[^"]+"/);
 assert.ok(!detail.includes('No assets match this query'));
 const preview=renderPagePreview(d,templateFor(d,d.collections.find(c=>c.id==='projects'),b).blocks,b,{route:'/work/balkan-house/'});
 assert.ok(detail.includes(preview));
 assert.equal(collectPages(d).length,10);
});
test('M15 gallery reacts to asset metadata edits but unrelated Projects stay unchanged',()=>{
 const d=copy(),before=collectPages(d),house=d.assets.find(a=>a.id==='house');
 house.properties.projectCode='unassigned';
 validate(d);
 const changed=collectPages(d);
 const detail=changed.find(x=>x.route==='/work/balkan-house/').html;
 assert.match(detail,/No assets match this query/);
 assert.ok(!detail.includes('balkan-highlights-query_house_image'));
 assert.equal(changed.find(x=>x.route==='/work/responsive-envelope/').html,
   before.find(x=>x.route==='/work/responsive-envelope/').html);
 house.properties.projectCode='4424';
 assert.deepEqual(queryAssets(gallery(d).source,d.assets,balkan(d)).map(x=>x.id),['house']);
});
test('M15 query Cards validate a typed source, not arbitrary expressions or unbounded filters',()=>{
 const mutate=[
  src=>{src.kind='all'},
  src=>{src.where=[]},
  src=>{src.where[0].field='src'},
  src=>{src.where[0].field='properties.projectCode'},
  src=>{src.where[0].op='eval'},
  src=>{src.where[0].value=''},
  src=>{src.where[0].value='{{constructor}}'},
  src=>{src.where[0].value='{{projectCode}} OR 1=1'},
  src=>{src.where[0].value='{{ asset.projectCode }}'},
  src=>{src.where[0].value='x'.repeat(129)},
  src=>{src.count=500},
  src=>{src.layout='javascript'},
  src=>{src.sort='unknown'},
  src=>{src.caption='yes'},
  src=>{src.where=Array.from({length:9},()=>({field:'tags',op:'contains',value:'x'}))},
  src=>{src.where[1].op='eq'},
  src=>{src.template='project-tile'}
 ];
 for(const change of mutate){
   const d=copy();change(gallery(d).source);
   assert.throws(()=>validate(d),/asset query/i,String(change));
 }
});
test('M15 optional legacy Card query sources still render, and unrelated routes are present',()=>{
 const d=copy();assert.doesNotThrow(()=>validate(d));
 const routes=collectPages(d).map(p=>p.route);
 for(const route of ['/','/work/','/posts/','/work/balkan-house/','/posts/designing-with-code/'])
   assert.ok(routes.includes(route));
 assert.ok(html(d,'/').includes('card-query'));
});
