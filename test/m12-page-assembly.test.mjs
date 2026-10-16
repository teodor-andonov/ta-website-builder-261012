import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validate} from '../src/model.mjs';
import {collectPages,renderPagePreview} from '../src/render.mjs';
import {assemblePage,assertSlotTemplate,slotsIn} from '../src/page-assembly.mjs';

const seed=JSON.parse(await readFile(new URL('../content/site.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(seed);
const area=(y=1)=>({x1:1,y1:y,x2:2,y2:y+1});
const card=(id,children=[],rows=1)=>({
 id,type:'card',columns:1,rows,background:'transparent',
 gap:'x1',padding:'x1',border:false,constrainHeight:false,heightFactor:.5,children
});
function slotTemplate(){
 return {id:'m12-general',name:'M12 General',layoutMode:'slot',blocks:[
  card('m12-template-root',[
   {id:'m12-template-label',type:'text',text:'M12 isolated template heading',style:'body',area:area(1)},
   {...card('m12-main-slot'),slot:'main',area:area(2)}
  ],2)
 ]};
}
function migratedPage(){
 const d=copy(),page=d.pages.find(p=>p.id==='work');
 const component=structuredClone(page.composition||page.blocks[0]);
 page.template='m12-general';page.composition=component;page.blocks=[];
 d.templates.push(slotTemplate());
 return {d,page};
}
test('M12 shared template serves Work and Journal without duplicating their content',()=>{
 const d=copy();
 assert.doesNotThrow(()=>validate(d));
 assert.deepEqual(collectPages(d),collectPages(copy()));
 const work=d.pages.find(p=>p.id==='work'),journal=d.pages.find(p=>p.id==='journal');
 assert.equal(work.template,journal.template);
 assert.equal(work.template,'page-general');
 assert.notEqual(work.composition.id,journal.composition.id);
 assert.equal(work.blocks.length,0);
 assert.equal(journal.blocks.length,0);
});
test('M12 one-slot template nests an independent page root Card without flattening grids',()=>{
 const {d,page}=migratedPage(),before=structuredClone(d);
 assert.doesNotThrow(()=>validate(d));
 const layout=d.templates.at(-1);
 assert.equal(assertSlotTemplate(layout).id,'m12-main-slot');
 const blocks=assemblePage(layout,page.composition);
 assert.equal(blocks.length,1);
 assert.equal(blocks[0].children[1].slot,'main');
 assert.equal(blocks[0].children[1].children.length,1);
 assert.equal(blocks[0].children[1].children[0].id,page.composition.id);
 assert.deepEqual(blocks[0].children[1].children[0].area,area());
 assert.equal(blocks[0].children[1].children[0].columns,page.composition.columns);
 assert.deepEqual(d,before,'both authored trees must remain immutable');
 const html=collectPages(d).find(x=>x.route==='/work/').html;
 const preview=renderPagePreview(d,page.blocks,null,{pageId:'work',route:'/work/'});
 assert.ok(html.includes(preview),'same assembled tree in editor full-page preview and static build');
 assert.ok(html.includes('M12 isolated template heading'));
 assert.equal(collectPages(d).length,collectPages(seed).length);
 const originals=collectPages(seed);
 for(const original of originals.filter(x=>x.route!=='/work/')){
  assert.equal(collectPages(d).find(x=>x.route===original.route).html,original.html,original.route);
 }
});
test('M12 shared page layout updates both Work and Journal, never duplicates their compositions',()=>{
 const d=copy();
 const general=d.templates.find(t=>t.id==='page-general');
 const journal=d.pages.find(p=>p.id==='journal'),work=d.pages.find(p=>p.id==='work');
 const beforeJournal=structuredClone(journal.composition),beforeWork=structuredClone(work.composition);
 const before=collectPages(d);
 general.blocks[0].background='grey-100';
 const after=collectPages(d);
 for(const route of ['/work/','/posts/']){
  const oldHtml=before.find(x=>x.route===route).html,newHtml=after.find(x=>x.route===route).html;
  assert.notEqual(newHtml,oldHtml,route+' should inherit shared template styling');
  assert.match(newHtml,/bg-grey-100/);
 }
 assert.equal(after.find(x=>x.route==='/').html,before.find(x=>x.route==='/').html);
 assert.deepEqual(journal.composition,beforeJournal);
 assert.deepEqual(work.composition,beforeWork);
 const journalClone=structuredClone(d);
 journalClone.pages.find(p=>p.id==='journal').composition.children[0].text='JOURNAL PAGE ONLY';
 const changed=collectPages(journalClone);
 assert.match(changed.find(x=>x.route==='/posts/').html,/JOURNAL PAGE ONLY/);
 assert.doesNotMatch(changed.find(x=>x.route==='/work/').html,/JOURNAL PAGE ONLY/);
});
test('M12 page authoring is isolated from the full assembled document',()=>{
 const d=copy();
 for(const id of ['work','journal']){
  const page=d.pages.find(p=>p.id===id);
  const isolatedHtml=renderPagePreview(d,[page.composition],null,{route:page.slug});
  const fullHtml=renderPagePreview(d,page.blocks,null,{pageId:id,route:page.slug});
  assert.ok(!isolatedHtml.includes('page-general-main'),'isolated root never embeds template slot');
  assert.notEqual(fullHtml,isolatedHtml);
  assert.ok(fullHtml.includes('card-grid')||fullHtml.includes('grid-card'));
  assert.ok(collectPages(d).find(p=>p.route===(page.slug.endsWith('/')?page.slug:page.slug+'/')).html.includes(fullHtml));
 }
});
test('M12 rejects missing, duplicated and malformed slot Cards',()=>{
 for(const variant of ['none','two','item','filled','referenced','wrong-grid']){
  const {d}=migratedPage(),template=d.templates.at(-1);
  const slot=template.blocks[0].children[1];
  if(variant==='none')delete slot.slot;
  if(variant==='two')template.blocks[0].children[0].slot='main';
  if(variant==='item'){slot.type='text';delete slot.children}
  if(variant==='filled')slot.children.push({...card('hidden'),area:area()});
  if(variant==='referenced')slot.reference='contact-cta';
  if(variant==='wrong-grid')slot.columns=2;
  assert.throws(()=>validate(d),/Slot template|Main slot/,variant);
 }
});
test('M12 rejects missing page content and unsupported template settings',()=>{
 const {d,page}=migratedPage();
 page.blocks=[card('hidden-block')];
 assert.throws(()=>validate(d),/must not duplicate blocks/);
 page.blocks=[];
 page.composition.area=area();
 assert.throws(()=>validate(d),/one root Card without area or slot/);
 delete page.composition.area;
 page.composition.slot='main';
 assert.throws(()=>validate(d),/one root Card without area or slot/);
 delete page.composition.slot;
 page.template='missing';
 assert.throws(()=>validate(d),/requires a known slot template/);
});
test('M12 rejects a slot in a legacy template, Page or reusable Component',()=>{
 const d=copy();
 d.templates[0].blocks[0].slot='main';
 assert.throws(()=>validate(d),/Legacy template cannot contain a main slot/);
 delete d.templates[0].blocks[0].slot;
 d.pages[0].blocks[0].slot='main';
 assert.throws(()=>validate(d),/Page authoring cannot contain a template slot/);
 delete d.pages[0].blocks[0].slot;
 d.components[0].blocks[0].slot='main';
 assert.throws(()=>validate(d),/Component cannot own a page slot/);
});
test('M12 slot templates require one root Card and reject nested lost content',()=>{
 const {d}=migratedPage(),template=d.templates.at(-1);
 template.blocks.push(card('second-root'));
 assert.throws(()=>validate(d),/requires one root Card/);
 template.blocks.pop();
 template.layoutMode='unsupported';
 assert.throws(()=>validate(d),/Unsupported template layout mode/);
});
