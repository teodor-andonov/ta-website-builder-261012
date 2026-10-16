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
const roots=scope=>scope.composition?[scope.composition]:scope.blocks;
const scopes=data=>[...data.pages,...data.templates,...data.components,...data.collections.flatMap(c=>c.records.filter(r=>r.composition))];

test('all canonical Page/Template/Component Cards use strict equal grid and explicit child cells',async()=>{
 const data=validate(await load());
 for(const scope of scopes(data)){
  assert.ok(roots(scope).every(x=>x.type==='card'),scope.id);
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
  visit(roots(scope));
 }
});
test('grid CSS uses fixed equal tracks, child cell positions and constrained width-factor height',async()=>{
 const data=validate(await load()),home=data.pages.find(p=>p.id==='home');
 const hero=home.composition.children.find(b=>b.id==='m6-hero');
 assert.equal(hero.constrainHeight,true);
 assert.equal(hero.heightFactor,.48);
 assert.match(cardGridStyle(hero),/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(cardGridStyle(hero),/grid-template-rows:repeat\(1,minmax\(0,1fr\)\)/);
 assert.match(cardGridStyle(hero),/aspect-ratio:1 \/ 0.48/);
 assert.match(cardGridStyle(home.composition),/grid-template-rows:repeat\(8,max-content\)/,'unconstrained sections use content heights rather than the tallest sibling height');
 const html=renderPagePreview(data,home.blocks,null,{route:'/',pageId:home.id});
 assert.match(html,/grid-column:2\/3;grid-row:1\/2/);
 assert.match(html,/semantic-header/);assert.match(html,/semantic-page/);assert.match(html,/semantic-footer/);
 assert.match(html,/<nav class="[^"]*semantic-header[^"]*"[^>]*aspect-ratio:1 \/ 0\.06/);
 assert.match(html,/<footer class="[^"]*semantic-footer[^"]*"[^>]*aspect-ratio:1 \/ 0\.05/);
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
  d=>d.pages[0].composition.columns=0,
  d=>d.pages[0].composition.children[0].area.x2=999,
  d=>d.pages[0].composition.heightFactor=-1,
  d=>d.site.design.palette.ink='#112233',
  d=>d.site.design.frame.header.heightFactor=0,
 ];
 for(const update of cases){const d=clone(good);update(d);assert.throws(()=>validate(d));}
});
test('the current project/posts still publish unchanged, noindex, and public route path audit remains',async()=>{
 const pages=collectPages(validate(await load()));
 assert.ok(pages.some(x=>x.route==='/work/balkan-house/'));
 assert.ok(pages.some(x=>x.route==='/posts/designing-with-code/'));
 assert.ok(pages.every(x=>x.html.includes('noindex, nofollow')));
});


test('global and per-Card outlines are translucent, non-layout, and configurable',async()=>{
 const data=validate(await load());
 assert.equal(data.site.design.cardBorders,true,'global outlines should be on');
 const home=data.pages.find(p=>p.id==='home');
 const html=renderPagePreview(data,home.blocks,null,{route:'/',pageId:home.id});
 assert.match(html,/class="card card-page webpage view show-card-borders"/);
 const stylesheet=await readFile(path.join(root,'src/public.css'),'utf8');
 assert.match(stylesheet,/outline:1px solid color-mix\(in srgb, currentColor var\(--ta-outline-opacity\), transparent\)/);
 assert.match(stylesheet,/outline-offset:-1px/);
 assert.doesNotMatch(stylesheet,/border:1px solid transparent/,'a hidden border would change geometry');
 assert.match(stylesheet,/\.show-card-borders \.card/,'all nested, header and footer Cards must be included');
 assert.match(stylesheet,/\.webpage\.show-card-borders/,'the master Page Card should be included');
 const off=clone(data);
 off.site.design.cardBorders=false;
 off.pages.find(p=>p.id==='home').composition.border=true;
 const offHtml=renderPagePreview(off,off.pages.find(p=>p.id==='home').blocks,null,{route:'/',pageId:'home'});
 assert.doesNotMatch(offHtml,/show-card-borders/);
 assert.match(offHtml,/has-border/,'single Card override remains available');
});


test('every Card has nonzero 1x/2x/4x padding and gap, including single-object wrappers',async()=>{
 const data=validate(await load());
 assert.equal(data.site.design.pad,1);
 assert.equal(data.site.design.gap,1);
 let single=0,cards=0;
 for(const scope of scopes(data)){
  const visit=blocks=>{for(const b of blocks){
   if(b.type!=='card')continue;
   cards++;
   assert.ok(['x1','x2','x4'].includes(b.padding),b.id+' padding '+b.padding);
   assert.ok(['x1','x2','x4'].includes(b.gap),b.id+' gap '+b.gap);
   if(b.children.length===1){single++;assert.notEqual(b.padding,'none',b.id)}
   visit(b.children);
  }};
  visit(roots(scope));
 }
 assert.ok(cards>30);
 assert.ok(single>5);
});

test('site pad and gap scale independently; Card items and nested Cards fill grid cells',async()=>{
 const data=validate(await load()),home=data.pages.find(p=>p.id==='home');
 const css=await readFile(path.join(root,'src/public.css'),'utf8');
 const html=renderPagePreview(data,home.blocks,null,{route:'/',pageId:home.id});
 assert.match(html,/--ta-pad:1cqw;--ta-gap:1cqw/);
 for(const cls of ['pad-x1','pad-x2','gap-x1','gap-x2'])assert.ok(html.includes(cls),cls);
 for(const expr of [
  /--ta-pad:1cqw/,/--ta-gap:1cqw/,
  /\.card\.pad-x1\{padding:var\(--ta-pad\)\}/,
  /\.card\.pad-x2\{padding:calc\(2 \* var\(--ta-pad\)\)\}/,
  /\.card\.pad-x4\{padding:calc\(4 \* var\(--ta-pad\)\)\}/,
  /\.card\.gap-x1\{gap:var\(--ta-gap\)\}/,
  /\.card\.gap-x2\{gap:calc\(2 \* var\(--ta-gap\)\)\}/,
  /\.card\.gap-x4\{gap:calc\(4 \* var\(--ta-gap\)\)\}/,
  /\.card>\.card\{width:100%;height:100%/,
  /\.item\{[\s\S]*?overflow:clip/,
  /\.web-content\.semantic-page\{[\s\S]*?padding:var\(--ta-pad\)/
 ])assert.match(css,expr,String(expr));
 const mutated=clone(data);
 mutated.site.design.pad=1.5;mutated.site.design.gap=0.75;
 const other=renderPagePreview(mutated,mutated.pages.find(p=>p.id==='home').blocks,null,{route:'/',pageId:'home'});
 assert.match(other,/--ta-pad:1.5cqw;--ta-gap:0.75cqw/);
 assert.doesNotMatch(css,/@media|@container|clamp\(/);
});

test('master spacing rejects negative, zero, infinite, and oversized values',async()=>{
 const good=validate(await load());
 for(const [key,value] of [['pad',0],['gap',-1],['pad',5],['gap',Infinity]]){
  const d=clone(good);d.site.design[key]=value;
  assert.throws(()=>validate(d),/Invalid master/,key+' '+value);
 }
});
