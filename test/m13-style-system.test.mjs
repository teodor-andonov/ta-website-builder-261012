import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validate} from '../src/model.mjs';
import {collectPages,renderPagePreview,renderBlocks} from '../src/render.mjs';
import {resolveAppearance,siteTokenStyle} from '../src/style-system.mjs';

const seed=JSON.parse(await readFile(new URL('../content/site.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(seed);
const route=(d,path)=>collectPages(d).find(p=>p.route===path).html;
const composition=(d,id)=>d.pages.find(p=>p.id===id).composition;
const named=(d,id)=>d.site.design.styles.find(s=>s.id===id);

test('M13 starter design tokens/styles validate and preserve legacy authored structure',()=>{
 const d=validate(copy());
 assert.equal(d.site.design.tokens.fontFamily,'mono');
 assert.equal(d.site.design.tokens.radius,1.15);
 assert.equal(named(d,'index-root').target,'card');
 assert.equal(named(d,'eyebrow-label').target,'item');
 assert.equal(composition(d,'work').styleRef,composition(d,'journal').styleRef);
 assert.equal(resolveAppearance(composition(d,'work'),d).background,'transparent');
 const direct=structuredClone(composition(d,'work'));
 delete direct.styleRef;
 assert.deepEqual(resolveAppearance(composition(d,'work'),d),resolveAppearance(direct,d));
 assert.equal(collectPages(d).length,10);
});

test('M13 named Card appearance propagates to Work and Journal but not Home',()=>{
 const d=copy(),before=route(d,'/');
 named(d,'index-root').properties.background='black';
 named(d,'index-root').properties.gap='x4';
 validate(d);
 for(const path of ['/work/','/posts/']){
  const html=route(d,path);
  assert.match(html,/named-style/);
  assert.match(html,/bg-black/);
  assert.match(html,/gap-x4/);
 }
 assert.equal(route(d,'/'),before,'unrelated legacy Home must remain unchanged');
});

test('M13 local override wins, resets to inherited and never mutates shared style',()=>{
 const d=copy();
 named(d,'index-root').properties.background='grey-100';
 composition(d,'journal').appearance={background:'black'};
 validate(d);
 assert.equal(resolveAppearance(composition(d,'work'),d).background,'grey-100');
 assert.equal(resolveAppearance(composition(d,'journal'),d).background,'black');
 assert.match(route(d,'/posts/'),/bg-black/);
 assert.equal(named(d,'index-root').properties.background,'grey-100');
 delete composition(d,'journal').appearance.background;
 delete composition(d,'journal').appearance;
 validate(d);
 assert.equal(resolveAppearance(composition(d,'journal'),d).background,'grey-100');
});

test('M13 Item styles resolve semantic text role, tone and emphasis',()=>{
 const d=copy(),item=composition(d,'work').children.find(n=>n.styleRef==='eyebrow-label');
 const before=renderBlocks([item],null,d);
 assert.match(before,/b-text eyebrow/);
 named(d,'eyebrow-label').properties.role='heading';
 named(d,'eyebrow-label').properties.tone='muted';
 named(d,'eyebrow-label').properties.weight='bold';
 validate(d);
 const updated=renderBlocks([item],null,d);
 assert.match(updated,/<h2 class="item item-text b-text heading/);
 assert.match(updated,/ta-tone-muted/);
 assert.match(updated,/ta-weight-bold/);
 item.appearance={role:'eyebrow',weight:'medium'};
 const overridden=renderBlocks([item],null,d);
 assert.match(overridden,/b-text eyebrow/);
 assert.match(overridden,/ta-weight-medium/);
 assert.equal(named(d,'eyebrow-label').properties.role,'heading');
});

test('M13 site tokens produce safe allowlisted CSS variables and no change to routes',()=>{
 const d=copy(),before=collectPages(d).map(p=>p.route);
 const tokens=siteTokenStyle(d);
 for(const expected of ['--ta-radius:1.15cqw','--ta-outline-opacity:20%','--ta-paper:#ffffff','--ta-ink:#141414','--ta-pad:1cqw','--ta-gap:1cqw'])
   assert.ok(tokens.includes(expected),expected);
 d.site.design.tokens.radius=2;
 d.site.design.tokens.outlineOpacity=.35;
 d.site.design.tokens.fontFamily='system';
 d.site.design.palette.grey100='#d0d0d0';
 validate(d);
 const generated=route(d,'/');
 assert.ok(generated.includes('--ta-radius:2cqw'));
 assert.ok(generated.includes('--ta-outline-opacity:35%'));
 assert.ok(generated.includes('--ta-grey-100:#d0d0d0'));
 assert.ok(generated.includes('--ta-mono:Arial,Helvetica,sans-serif'));
 assert.deepEqual(collectPages(d).map(p=>p.route),before);
});

test('M13 new style assignment must not affect independent scope render parity',()=>{
 const d=copy(),p=d.pages.find(p=>p.id==='journal');
 named(d,'index-root').properties.padding='x4';
 const preview=renderPagePreview(d,p.blocks,null,{pageId:p.id,route:p.slug});
 assert.ok(route(d,'/posts/').includes(preview));
 assert.match(preview,/pad-x4/);
});

test('M13 validation refuses unknown references, unsafe style fields and invalid palettes',()=>{
 const mutations=[
  d=>{composition(d,'work').styleRef='not-a-style'},
  d=>{composition(d,'work').styleRef='eyebrow-label'},
  d=>{composition(d,'work').appearance={tone:'muted'}},
  d=>{composition(d,'work').appearance={background:'url(javascript:evil)'}},
  d=>{composition(d,'work').appearance={border:'yes'}},
  d=>{composition(d,'work').appearance={background:null}},
  d=>{named(d,'index-root').properties.padding='x42'},
  d=>{named(d,'index-root').properties.customCSS='body{display:none}'},
  d=>{named(d,'eyebrow-label').properties.role='script'},
  d=>{d.site.design.styles.push(structuredClone(named(d,'index-root')))},
  d=>{d.site.design.tokens.fontFamily='evil'},
  d=>{d.site.design.tokens.radius=Infinity},
  d=>{d.site.design.tokens.outlineOpacity=3},
  d=>{d.site.design.palette.paper='#123abc'},
 ];
 for(const fn of mutations){
  const d=copy();fn(d);
  assert.throws(()=>validate(d),/style|appearance|design tokens|grayscale|Palette/i,String(fn));
 }
});

test('M13 existing sites without named styles or tokens continue to render',()=>{
 const d=copy();
 delete d.site.design.styles;delete d.site.design.tokens;
 for(const p of d.pages)if(p.composition){
  delete p.composition.styleRef;
  for(const item of p.composition.children)delete item.styleRef;
 }
 assert.doesNotThrow(()=>validate(d));
 assert.equal(collectPages(d).length,10);
});
