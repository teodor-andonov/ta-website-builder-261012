import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validate} from '../src/model.mjs';
import {collectPages,renderPagePreview,templateFor} from '../src/render.mjs';
import {assemblePage} from '../src/page-assembly.mjs';

const seed=JSON.parse(await readFile(new URL('../content/site.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(seed);
const collection=(d,id)=>d.collections.find(c=>c.id===id);
const record=(d,c,id)=>collection(d,c).records.find(r=>r.id===id);
const html=(d,route)=>collectPages(d).find(p=>p.route===route).html;
const root=(id)=>({id,type:'card',label:'Record composition',columns:1,rows:2,
 background:'transparent',padding:'x1',gap:'x1',border:false,constrainHeight:false,heightFactor:.5,
 children:[
 {id:id+'-title',type:'text',style:'display',text:'{{title}}',area:{x1:1,y1:1,x2:2,y2:2}},
 {id:id+'-summary',type:'text',style:'body',text:'{{summary}}',area:{x1:1,y1:2,x2:2,y2:3}}
 ]});
function composeProject(d,id){
 const r=record(d,'projects',id);r.template='record-project-layout';r.composition=root('composition-'+id);return r;
}

test('M14 supports independent Project and Post detail slot templates with draft exemplar',()=>{
 const d=validate(copy());
 assert.equal(collection(d,'projects').compositionTemplate,'record-project-layout');
 assert.equal(collection(d,'posts').compositionTemplate,'record-post-layout');
 const draft=record(d,'posts','post-four');
 assert.equal(draft.status,'Draft');
 assert.equal(draft.template,'record-post-layout');
 assert.equal(draft.composition.type,'card');
 assert.equal(draft.composition.children.length,4);
 assert.equal(templateFor(d,collection(d,'posts'),draft).id,'record-post-layout');
 assert.equal(collectPages(d).length,10);
 assert.ok(!collectPages(d).some(p=>p.route==='/posts/soft-modules/'));
 const preview=renderPagePreview(d,templateFor(d,collection(d,'posts'),draft).blocks,draft,{route:'/posts/soft-modules/'});
 assert.ok(preview.includes('main-content'));
 assert.ok(preview.includes('card-main'));
 assert.ok(preview.includes('Soft modules')||preview.includes('Soft Modules')||preview.includes(draft.title));
});

test('M14 opt-in Project composition has stable route, live field bindings and public/preview parity',()=>{
 const d=copy(),r=composeProject(d,'p-balkan'),before=structuredClone(d);
 validate(d);
 const route='/work/balkan-house/';
 assert.equal(collectPages(d).length,10);
 const rendered=html(d,route);
 assert.match(rendered,/Balkan/);
 assert.match(rendered,/card-main/);
 assert.ok(rendered.includes(r.summary));
 assert.ok(rendered.includes(renderPagePreview(d,templateFor(d,collection(d,'projects'),r).blocks,r,{route})));
 assert.deepEqual(d,before,'build must never mutate the unique root or template');
});

test('M14 editing one Project root never edits another Project, Post or shared template',()=>{
 const d=copy(),before=collectPages(d);
 const r=composeProject(d,'p-balkan'),layout=d.templates.find(t=>t.id===r.template);
 const oldTemplate=structuredClone(layout);
 r.composition.children[0].text='ONLY THIS PROJECT';
 validate(d);
 assert.match(html(d,'/work/balkan-house/'),/ONLY THIS PROJECT/);
 for(const page of before.filter(x=>x.route!=='/work/balkan-house/'))
   assert.equal(html(d,page.route),page.html,page.route);
 assert.deepEqual(layout,oldTemplate);
 assert.equal(record(d,'projects','p-facade').composition,undefined);
});

test('M14 shared record slot template changes all assigned records while leaving legacy routes intact',()=>{
 const d=copy(),before=collectPages(d);
 composeProject(d,'p-balkan');composeProject(d,'p-facade');
 const t=d.templates.find(t=>t.id==='record-project-layout');
 t.blocks[0].background='grey-100';
 validate(d);
 assert.match(html(d,'/work/balkan-house/'),/bg-grey-100/);
 assert.match(html(d,'/work/responsive-envelope/'),/bg-grey-100/);
 for(const page of before.filter(x=>!['/work/balkan-house/','/work/responsive-envelope/'].includes(x.route)))
   assert.equal(html(d,page.route),page.html,page.route);
});

test('M14 supports record template override independently of format default',()=>{
 const d=copy(),post=record(d,'posts','post-one');
 assert.equal(templateFor(d,collection(d,'posts'),post).id,'post-note');
 post.template='post-news';
 validate(d);
 assert.equal(templateFor(d,collection(d,'posts'),post).id,'post-news');
 const changed=html(d,'/posts/designing-with-code/');
 assert.match(changed,/NEWS/);
 assert.match(changed,/og:type/);
 assert.equal(templateFor(d,collection(d,'posts'),record(d,'posts','post-two')).id,'post-news');
});

test('M14 record composition assembly nests rather than flattens and is immutable',()=>{
 const d=copy(),post=record(d,'posts','post-four');
 const layout=templateFor(d,collection(d,'posts'),post);
 const before=structuredClone(d);
 const combined=assemblePage(layout,post.composition);
 const slot=combined[0].children.find(x=>x.slot==='main');
 assert.equal(slot.children.length,1);
 assert.equal(slot.children[0].id,post.composition.id);
 assert.deepEqual(slot.children[0].area,{x1:1,y1:1,x2:2,y2:2});
 assert.deepEqual(slot.children[0].children,post.composition.children);
 assert.deepEqual(d,before);
});

test('M14 legacy Project/Post HTML stays unchanged with unrelated draft record migration',()=>{
 const d=copy(),old=copy();
 const draft=record(old,'posts','post-four');
 delete draft.template;delete draft.composition;
 assert.doesNotThrow(()=>validate(old));
 assert.deepEqual(collectPages(d),collectPages(old));
});

test('M14 refuses unsupported record template/geometry/reference combinations',()=>{
 const variants=[
 d=>{record(d,'posts','post-four').template='missing'},
 d=>{record(d,'posts','post-four').template='project-detail'},
 d=>{record(d,'posts','post-four').template='record-project-layout'},
 d=>{delete record(d,'posts','post-four').template},
 d=>{record(d,'posts','post-one').template='record-post-layout'},
 d=>{record(d,'posts','post-four').composition.area={x1:1,y1:1,x2:2,y2:2}},
 d=>{record(d,'posts','post-four').composition.slot='main'},
 d=>{record(d,'posts','post-four').composition.type='text'},
 d=>{record(d,'posts','post-four').composition.children[0].id=record(d,'posts','post-four').composition.children[1].id},
 d=>{record(d,'posts','post-four').composition.source={collection:'posts',template:'post-row'}},
 d=>{collection(d,'posts').compositionTemplate='project-detail'},
 d=>{collection(d,'posts').compositionTemplate='record-project-layout'},
 d=>{d.templates.find(t=>t.id==='record-post-layout').blocks[0].children.push({id:'duplicate-slot',type:'card',slot:'main',columns:1,rows:1,background:'transparent',padding:'x1',gap:'x1',border:false,constrainHeight:false,heightFactor:.5,children:[],area:{x1:1,y1:1,x2:2,y2:2}})}
 ];
 for(const mutate of variants){
   const d=copy();mutate(d);
   assert.throws(()=>validate(d),undefined,String(mutate));
 }
});
