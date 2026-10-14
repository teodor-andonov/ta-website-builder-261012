import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {validate} from '../src/model.mjs';
import {collectPages, renderPagePreview} from '../src/render.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=validate(JSON.parse(await readFile(path.join(root,'content/site.json'),'utf8')));
const home=data.pages.find(p=>p.id==='home');
const html=renderPagePreview(data,home.blocks,null,{route:'/'});

test('M6 homepage expresses integrated identity using the existing JSON blocks',()=>{
 assert.ok(home);
 assert.equal(home.status,'Published');
 const ids=new Set();
 function visit(items){for(const b of items){
  assert.match(b.id,/^[a-zA-Z0-9_-]+$/);
  assert.ok(!ids.has(b.id),'duplicate block id: '+b.id);
  ids.add(b.id);
  assert.ok(['text','card','image','button','divider','rich'].includes(b.type));
  if(b.type==='card')visit(b.children||[]);
 }}
 visit(home.blocks);
 for(const x of ['variant-hero','variant-intro','variant-work-section','variant-methods-section','variant-approach','variant-journal-list','variant-closer'])assert.ok(html.includes(x),x);
 assert.ok(html.includes('Architecture,'));
 assert.ok(html.includes('COMPUTATION'));
 assert.ok(html.includes('RESEARCH'));
 assert.ok(html.includes('FIXED PACKAGES'));
 assert.ok(html.includes('SUBSCRIPTION'));
 assert.ok(html.includes('CUSTOM PROJECT'));
});
test('M6 work and journal are driven by the original collections and valid links',()=>{
 const pages=collectPages(data);
 assert.ok(pages.some(x=>x.route==='/work/'));
 assert.ok(pages.some(x=>x.route==='/posts/'));
 assert.ok(html.includes('/work/balkan-house/'));
 assert.ok(html.includes('/posts/designing-with-code/'));
 assert.ok(!html.includes('/posts/soft-modules/'));
});
test('M6 designer and public output use the same semantic variants',()=>{
 const design=renderPagePreview(data,home.blocks,null,{route:'/',design:true,selectedId:'m6-hero'});
 assert.ok(design.includes('variant-hero chosen'));
 assert.ok(design.includes('data-node-id="m6-hero"'));
 assert.ok(!html.includes('data-node-id="m6-hero"'));
 assert.ok(html.includes('variant-hero'));
});
test('M6 has a compact token system and retains sample noindex protection',async()=>{
 const stylesheet=await readFile(path.join(root,'src/public.css'),'utf8');
 for(const token of ['--ta-paper','--ta-ink','--ta-radius','--ta-mono','--ta-site-max'])assert.ok(stylesheet.includes(token),token);
 assert.ok(stylesheet.includes('.editor-shell'));
 assert.ok(stylesheet.includes('No responsive breakpoints'));
 const built=collectPages(data).find(p=>p.route==='/');
 assert.ok(built.html.includes('noindex, nofollow'));
 assert.ok(!built.html.includes('hello@example.com'));
});
