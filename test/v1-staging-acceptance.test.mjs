import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assessV1Staging} from '../scripts/v1-staging-acceptance.mjs';

const current=JSON.parse(await readFile(new URL('../content/site.json',import.meta.url),'utf8'));
test('V1 staging accepts explicitly flagged editable placeholders but not external production',()=>{
 const result=assessV1Staging(structuredClone(current));
 assert.equal(result.stagingReady,true);
 assert.equal(result.productionReady,false);
 assert.equal(result.routes,10);
 assert.ok(result.allowedPlaceholders>=10);
 assert.ok(result.productionBlockers.includes('missing-booking-url'));
});
test('V1 staging refuses unflagged temporary imagery even if content superficially looks final',()=>{
 const d=structuredClone(current);
 d.assets[0].placeholder=false;
 assert.throws(()=>assessV1Staging(d),/Unexpected content issue: placeholder-source/);
});
test('V1 staging rejects contradictory record editorial states',()=>{
 const d=structuredClone(current);
 const record=d.collections.find(c=>c.id==='projects').records[0];
 record.approvedForPublication=true;
 assert.throws(()=>assessV1Staging(d),/Record simultaneously marked approved and placeholder/);
});
test('V1 staging rejects missing essential content routes',()=>{
 const d=structuredClone(current);
 d.pages=d.pages.filter(p=>p.id!=='home');
 assert.throws(()=>assessV1Staging(d),/Missing essential route/);
});
