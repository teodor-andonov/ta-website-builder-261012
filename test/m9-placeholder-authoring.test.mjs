import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {validate} from '../src/model.mjs';
import {assetSrc,collectPages} from '../src/render.mjs';
import {auditContent} from '../scripts/content-readiness.mjs';

const base=JSON.parse(await readFile(new URL('../content/site.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(base);
test('M9 neutral media is stored once as real files and preserves existing asset references',async()=>{
 const d=validate(copy());
 assert.equal(d.assets.length,4);
 for(const a of d.assets){
   assert.equal(a.placeholder,true);
   assert.match(a.src,/^\/assets\/placeholder\/[a-z-]+\.svg$/);
   assert.equal(assetSrc(a),a.src);
   const media=await readFile(new URL('..'+a.src,import.meta.url),'utf8');
   assert.match(media,/<rect width="1200" height="900" fill="#[0-9a-f]{6}"\/>/);
   assert.doesNotMatch(media,/<script|onload=|<foreignObject/i);
 }
 const pages=collectPages(d);
 assert.equal(pages.length,10,'All existing routes and record covers remain intact');
 assert.ok(pages.find(x=>x.route==='/work/balkan-house/').html.includes('/assets/placeholder/house.svg'));
});
test('M9 project codes are optional but must be unique stable strings',()=>{
 const d=copy();
 const projects=d.collections.find(x=>x.id==='projects');
 projects.records[0].projectCode='4424';
 projects.records[1].projectCode='4378';
 assert.doesNotThrow(()=>validate(d));
 projects.records[1].projectCode='4424';
 assert.throws(()=>validate(d),/Duplicate projectCode: 4424/);
 projects.records[1].projectCode='44 24';
 assert.throws(()=>validate(d),/Invalid projectCode/);
 projects.records[1].projectCode='';
 assert.doesNotThrow(()=>validate(d));
});
test('M9 asset project codes are ordinary editable metadata, not special relationships',()=>{
 const d=copy();
 const a=d.assets[0];
 a.properties.projectCode='4424';
 assert.doesNotThrow(()=>validate(d));
 a.properties.projectCode='bad code!';
 assert.throws(()=>validate(d),/Invalid asset projectCode/);
 a.properties.projectCode='';
 assert.doesNotThrow(()=>validate(d));
});
test('M9 release cannot silently declare unresolved placeholders publication-ready',()=>{
 const d=copy();
 const f=auditContent(d);
 assert.ok(f.some(x=>x.kind==='placeholder'));
 assert.ok(f.some(x=>x.code==='missing-booking-url'));
 // Even after approving an editorial record, a referenced temporary cover remains flagged.
 const p=d.collections[0].records[0];
 p.placeholder=false;p.approvedForPublication=true;
 assert.ok(auditContent(d).some(x=>x.code==='placeholder-cover'));
});
