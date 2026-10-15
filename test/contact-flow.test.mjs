import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validate} from '../src/model.mjs';
import {renderBlocks,bind} from '../src/render.mjs';
import {auditContent} from '../scripts/content-readiness.mjs';

const original=JSON.parse(await readFile(new URL('../content/site.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(original);
const home=data=>data.pages.find(p=>p.id==='home');

test('M9 homepage keeps agreed services, three arrangements and one contact CTA',()=>{
  const d=copy();
  assert.doesNotThrow(()=>validate(d));
  const html=renderBlocks(home(d).blocks,null,d);
  for(const label of ['FACADES & RESEARCH','HOW WE WORK','FIXED PACKAGES','SUBSCRIPTION','CUSTOM PROJECT'])
    assert.ok(html.includes(label),label);
  assert.equal(home(d).blocks.filter(b=>b.reference==='contact-cta').length,1);
});

test('M9 empty booking destination must never expose a misleading clickable contact link',()=>{
  const d=copy();
  assert.deepEqual(d.site.contact,{email:'',bookingUrl:''});
  const html=renderBlocks(home(d).blocks,null,d);
  assert.match(html,/15-minute introduction · booking link pending/);
  assert.match(html,/aria-disabled="true"/);
  assert.doesNotMatch(html,/href="mailto:hello@example\.com"/);
  assert.doesNotMatch(html,/href="#"/);
  assert.ok(auditContent(d).some(item=>item.code==='missing-booking-url'));
});

test('M9 configured booking link is bound into contact component across templates',()=>{
  const d=copy();
  d.site.contact={email:'studio@example.org',bookingUrl:'https://calendar.example.org/teo/intro'};
  assert.doesNotThrow(()=>validate(d));
  assert.equal(bind('{{site.contact.bookingUrl}}',null,d),d.site.contact.bookingUrl);
  const html=renderBlocks(home(d).blocks,null,d);
  assert.match(html,/href="https:\/\/calendar\.example\.org\/teo\/intro"/);
  assert.match(html,/target="_blank" rel="noopener noreferrer"/);
  assert.match(html,/Book a 15-minute introduction/);
  assert.doesNotMatch(html,/aria-disabled="true"/);
  // A configured link is still independently reviewed for placeholders.
  assert.ok(auditContent(d).some(item=>item.code==='placeholder-contact'));
  assert.ok(!auditContent(d).some(item=>item.code==='missing-booking-url'));
});

test('M9 invalid or missing optional contact inputs reject safely',()=>{
  for(const value of ['javascript:alert(1)','http://example.com/slot','https://localhost/slot','https://example.com@evil.com/slot']){
    const d=copy();
    d.site.contact.bookingUrl=value;
    assert.throws(()=>validate(d),/Booking URL must be empty or a valid HTTPS address/);
  }
  const invalidEmail=copy();invalidEmail.site.contact.email='wrong @';
  assert.throws(()=>validate(invalidEmail),/Contact email must be empty or valid/);
  const legacy=copy();delete legacy.site.contact;
  assert.doesNotThrow(()=>validate(legacy));
});
