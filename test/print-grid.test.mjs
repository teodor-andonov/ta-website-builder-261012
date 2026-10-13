import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {validate} from '../src/model.mjs';
import {renderPagePreview,cardGridStyle,collectPages} from '../src/render.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const load=async()=>JSON.parse(await readFile(path.join(root,'content/site.json'),'utf8'));
const clone=x=>JSON.parse(JSON.stringify(x));

test('all canonical Page/Template/Component Cards use strict equal grid and explicit child cells',async()=>{
 const data=validate(await load());
 for(const scope of [...data.pages,...data.templates,...data.components]){
  assert.ok(scope.blocks.every(x=>x.type==='card'),scope.id);
  function visit(blocks){
   for(const b of blocks)if(b.type==='card'){
    assert.ok(Number.isInteger(b.columns)&&b.columns>=1,b.id);
    assert.ok(Number.isInteger(b.rows)&&b.rows>=1,b.id);
    for(const child of b.children){
     assert.ok(child.area,'missing cell in '+b.id+': '+child.id);
     assert.ok(child.area.x2<=b.columns+1);
     assert.ok(child.area.y2<=b.rows+1);
    }
    visit(b.children);
   }
  }
  visit(scope.blocks);
 }
});
test('grid CSS uses fixed equal tracks, child cell positions and constrained width-factor height',async()=>{
 const data=validate(await load()),home=data.pages.find(p=>p.id==='home');
 const hero=home.blocks.find(b=>b.id==='m6-hero');
 assert.equal(hero.constrainHeight,true);
 assert.equal(hero.heightFactor,.48);
 assert.match(cardGridStyle(hero),/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(cardGridStyle(hero),/grid-template-rows:repeat\(1,minmax\(0,1fr\)\)/);
 assert.match(cardGridStyle(hero),/aspect-ratio:1 \/ 0.48/);
 const html=renderPagePreview(data,home.blocks,null,{route:'/'});
 assert.match(html,/grid-column:2\/3;grid-row:1\/2/);
 assert.match(html,/semantic-header/);assert.match(html,/semantic-page/);assert.match(html,/semantic-footer/);
 assert.ok(!html.includes('b-divider'));
});
test('CSS is width proportional, grayscale and has no adaptive breakpoints',async()=>{
 const css=await readFile(path.join(root,'src/public.css'),'utf8');
 assert.match(css,/1cqw = page width \/ 100/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(css,/@media|@container|clamp\(/);
 for(const m of css.matchAll(/#([0-9a-f]{6})\b/gi)){ const x=m[1].toLowerCase();assert.equal(x.slice(0,2),x.slice(2,4));assert.equal(x.slice(2,4),x.slice(4,6));}
});
test('validator rejects invalid area, over-large grids, invalid height and tinted palette',async()=>{
 const good=validate(await load());
 const cases=[
  d=>d.pages[0].blocks[0].columns=0,
  d=>d.pages[0].blocks[0].children[0].area.x2=999,
  d=>d.pages[0].blocks[0].heightFactor=-1,
  d=>d.site.design.palette.ink='#112233',
 ];
 for(const update of cases){const d=clone(good);update(d);assert.throws(()=>validate(d));}
});
test('the current project/posts still publish unchanged, noindex, and public route path audit remains',async()=>{
 const pages=collectPages(validate(await load()));
 assert.ok(pages.some(x=>x.route==='/work/balkan-house/'));
 assert.ok(pages.some(x=>x.route==='/posts/designing-with-code/'));
 assert.ok(pages.every(x=>x.html.includes('noindex, nofollow')));
});
