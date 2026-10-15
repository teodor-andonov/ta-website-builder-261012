import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {auditContent} from '../scripts/content-readiness.mjs';

const content=JSON.parse(await readFile(new URL('../content/site.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(content);
test('M9 audit distinguishes explicitly authorized sample content from launch prerequisites',()=>{
 const issues=auditContent(copy());
 assert.ok(issues.some(i=>i.code==='placeholder-media'&&i.path==='assets/house'&&i.kind==='placeholder'));
 assert.ok(issues.some(i=>i.code==='missing-booking-url'&&i.kind==='release'));
 assert.ok(issues.some(i=>i.code==='placeholder-record'&&i.path.includes('/projects/')));
 assert.ok(issues.some(i=>i.code==='placeholder-page'&&i.path==='pages/home'));
 assert.ok(!issues.some(i=>i.code==='demo-media'));
});
test('M9 audit does not block unpublished draft records and honors explicit record approval',()=>{
 const d=copy(),projects=d.collections.find(c=>c.id==='projects'),posts=d.collections.find(c=>c.id==='posts');
 const post=posts.records.find(r=>r.status==='Draft');
 assert.ok(post);
 const original=auditContent(d);
 assert.ok(!original.some(i=>i.code==='review-required'&&i.path.endsWith('/'+post.id)));
 projects.records[0].placeholder=false;
 projects.records[0].approvedForPublication=true;
 d.pages.find(p=>p.id==='home').placeholder=false;
 d.pages.find(p=>p.id==='home').approvedForPublication=true;
 const revised=auditContent(d);
 assert.ok(!revised.some(i=>i.code==='placeholder-record'&&i.path.endsWith('/'+projects.records[0].id)));
 assert.ok(!revised.some(i=>i.code==='placeholder-page'&&i.path==='pages/home'));
 // The cover remains a placeholder and must still be replaced for production.
 assert.ok(revised.some(i=>i.code==='placeholder-cover'&&i.path.endsWith('/'+projects.records[0].id)));
});
test('M9 audit distinguishes missing cover from an existing demo cover',()=>{
 const d=copy(),project=d.collections[0].records[0];
 project.cover='unknown-asset';
 assert.ok(auditContent(d).some(i=>i.code==='missing-cover'&&i.path.endsWith('/'+project.id)));
 project.cover='house';project.placeholder=false;
 assert.ok(auditContent(d).some(i=>i.code==='placeholder-cover'&&i.path.endsWith('/'+project.id)));
});
test('M9 audit flags missing accessibility and attribution metadata on actual assets',()=>{
 const d=copy();const asset=d.assets[0];asset.src='/assets/uploads/aabb.png';asset.alt='';asset.credit='';
 const issues=auditContent(d);
 assert.ok(issues.some(i=>i.code==='missing-alt'&&i.path==='assets/'+asset.id));
 assert.ok(issues.some(i=>i.code==='missing-credit'&&i.path==='assets/'+asset.id));
 assert.ok(!issues.some(i=>i.code==='demo-media'&&i.path==='assets/'+asset.id));
});
