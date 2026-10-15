import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {auditContent} from '../scripts/content-readiness.mjs';

const content=JSON.parse(await readFile(new URL('../content/site.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(content);
test('M9 audit finds demonstration assets, placeholder contacts and unreviewed real-world claims',()=>{
 const issues=auditContent(copy());
 assert.ok(issues.some(i=>i.code==='demo-media'&&i.path==='assets/house'));
 assert.ok(issues.some(i=>i.code==='placeholder-contact'));
 assert.ok(issues.some(i=>i.code==='review-required'&&i.path.includes('/projects/')));
 assert.ok(issues.some(i=>i.code==='page-review'&&i.path==='pages/home'));
});
test('M9 audit does not block unpublished draft records and honors explicit record approval',()=>{
 const d=copy(),projects=d.collections.find(c=>c.id==='projects'),posts=d.collections.find(c=>c.id==='posts');
 const post=posts.records.find(r=>r.status==='Draft');
 assert.ok(post);
 const original=auditContent(d);
 assert.ok(!original.some(i=>i.code==='review-required'&&i.path.endsWith('/'+post.id)));
 projects.records[0].approvedForPublication=true;
 d.pages.find(p=>p.id==='home').approvedForPublication=true;
 const revised=auditContent(d);
 assert.ok(!revised.some(i=>i.code==='review-required'&&i.path.endsWith('/'+projects.records[0].id)));
 assert.ok(!revised.some(i=>i.code==='page-review'&&i.path==='pages/home'));
 assert.ok(revised.length<original.length);
});
test('M9 audit distinguishes missing cover from an existing demo cover',()=>{
 const d=copy(),project=d.collections[0].records[0];
 project.cover='unknown-asset';
 assert.ok(auditContent(d).some(i=>i.code==='missing-cover'&&i.path.endsWith('/'+project.id)));
 project.cover='house';
 assert.ok(auditContent(d).some(i=>i.code==='demo-cover'&&i.path.endsWith('/'+project.id)));
});
test('M9 audit flags missing accessibility and attribution metadata on actual assets',()=>{
 const d=copy();const asset=d.assets[0];asset.src='/assets/uploads/aabb.png';asset.alt='';asset.credit='';
 const issues=auditContent(d);
 assert.ok(issues.some(i=>i.code==='missing-alt'&&i.path==='assets/'+asset.id));
 assert.ok(issues.some(i=>i.code==='missing-credit'&&i.path==='assets/'+asset.id));
 assert.ok(!issues.some(i=>i.code==='demo-media'&&i.path==='assets/'+asset.id));
});
