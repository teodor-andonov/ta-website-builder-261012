import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validate} from '../src/model.mjs';
import {collectPages} from '../src/render.mjs';
const source=validate(JSON.parse(await readFile(new URL('../content/site.json',import.meta.url),'utf8')));
test('M10 public pages expose one named main landmark, real headings and keyboard skip link',()=>{
 const pages=collectPages(source);
 for(const {route,html} of pages){
   const count=(needle)=>(html.match(needle)||[]).length;
   assert.equal(count(/<h1\b/g),1,route+' must have exactly one main heading');
   assert.ok(count(/<h2\b/g)>=0);
   assert.match(html,/<a class="skip-link" href="#main-content">Skip to content<\/a>/,route);
   assert.match(html,/<main id="main-content" tabindex="-1"/,route);
   assert.match(html,/<nav\b[^>]*aria-label="Main navigation"/,route);
   assert.match(html,/<footer\b/,route);
   assert.equal(count(/<main\b/g),1,route);
   const imgs=[...html.matchAll(/<img\b[^>]*>/g)];
   for(const [img] of imgs){
     assert.match(img,/\balt="[^"]*"/,route+' image missing alt attribute');
     assert.match(img,/\bdecoding="async"/,route+' image must decode asynchronously');
   }
   assert.ok(html.includes('meta name="robots" content="noindex, nofollow"'),route);
 }
});
test('M10 semantic heading level only applies to authored text Items',()=>{
 const d=structuredClone(source);
 const title=d.templates.find(t=>t.id==='post-note');
 const locate=(nodes)=>{for(const n of nodes){if(n.type==='text'&&n.headingLevel===1)return n;const found=locate(n.children||[]);if(found)return found}return null};
 const node=locate(title.blocks);
 assert.ok(node);
 node.headingLevel=4;
 assert.throws(()=>validate(d),/Invalid semantic heading level/);
 node.headingLevel=1;
 assert.doesNotThrow(()=>validate(d));
});
