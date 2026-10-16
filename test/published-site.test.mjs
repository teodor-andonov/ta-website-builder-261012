import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validate} from '../src/model.mjs';
import {collectPages} from '../src/render.mjs';

const source=JSON.parse(await readFile(new URL('../content/site.json',import.meta.url),'utf8'));
const clone=()=>structuredClone(source);
function inspect(data){
 validate(data);
 const pages=collectPages(data),routes=new Set(pages.map(p=>p.route));
 for(const route of ['/','/work/','/posts/'])
  if(!routes.has(route))throw Error('Missing public route: '+route);
 if(routes.size!==pages.length)throw Error('Duplicate public routes');
 for(const p of pages){
  const robots=data.site.publishing?.indexing===false?'noindex, nofollow':'index, follow';
  if(!p.html.includes('name="robots" content="'+robots+'"'))
   throw Error('Page robots indexing mode differs from site settings: '+p.route);
  if(/\/(?:studio|api)\//.test(p.route))throw Error('Private route exposed');
 }
 return pages.length;
}
test('public website builds independently from content approval and host configuration',()=>{
 const d=clone();
 assert.equal(inspect(d),10);
 assert.equal(d.site.contact.bookingUrl,'');
 assert.ok(d.assets.some(a=>a.placeholder));
});
test('normal HTML honors noindex JSON metadata without fabricated canonical domain',()=>{
 for(const page of collectPages(clone())){
  assert.match(page.html,/<meta name="robots" content="noindex, nofollow">/);
  assert.doesNotMatch(page.html,/<link rel="canonical"/);
 }
});
test('content approval flags do not block local publishing',()=>{
 const d=clone();
 d.pages.find(p=>p.id==='home').approvedForPublication=false;
 assert.equal(inspect(d),10);
});
test('public route smoke detects missing essential page',()=>{
 const d=clone();
 d.pages=d.pages.filter(p=>p.id!=='home');
 assert.throws(()=>inspect(d),/Missing public route/);
});
