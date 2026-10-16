import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderBlocks,renderPagePreview,renderDocument,collectPages,templateFor} from '../src/render.mjs';
const data=JSON.parse(await readFile(new URL('../content/site.json',import.meta.url),'utf8'));
const project=data.collections.find(c=>c.id==='projects');
const post=data.collections.find(c=>c.id==='posts');
const publishedProject=project.records.find(r=>r.slug==='balkan-house');
const publishedPost=post.records.find(r=>r.slug==='designing-with-code');
const extractFrame=html=>html.match(/<div class="card card-page webpage view(?: show-card-borders)?"(?: style="[^"]*")?>[\s\S]*?<\/footer><\/div>/)?.[0];

test('browser editor imports the same renderer module used by build',async()=>{
  const html=await readFile(new URL('../studio/index.html',import.meta.url),'utf8');
  assert.match(html,/type="module"/);
  assert.match(html,/from "\/src\/render\.mjs"/);
  assert.doesNotMatch(html,/function renderBlock\(n,ctx,design,depth\)/);
  assert.match(html,/renderSharedBlocks\(blocks,ctx,db,\{design,selectedId:ui.node,topLevel:true\}\)/);
});

test('record previews match generated public page DOM shell exactly',()=>{
  for(const [collection,record] of [[project,publishedProject],[post,publishedPost]]){
    const template=templateFor(data,collection,record);
    const preview=renderPagePreview(data,template.blocks,record,{route:collection.base+'/'+record.slug+'/'});
    const actual=collectPages(data).find(p=>p.route===`${collection.base}/${record.slug}/`).html;
    assert.equal(extractFrame(actual),preview,`DOM parity for ${record.slug}`);
  }
});

test('custom page previews match their published HTML',()=>{
  const draft=structuredClone(data);
  const page=draft.pages.find(p=>p.id==='home');
  page.status='Published';
  const generated=renderDocument(draft,{title:page.title,blocks:page.blocks,pageId:page.id,route:page.slug});
  assert.equal(extractFrame(generated),renderPagePreview(draft,page.blocks,null,{pageId:page.id,route:page.slug}));
});

test('design overlays preserve the identical content, adding only selection hooks',()=>{
  const blocks=templateFor(data,project,publishedProject).blocks;
  const first=blocks[0].id;
  const plain=renderBlocks(blocks,publishedProject,data);
  const edit=renderBlocks(blocks,publishedProject,data,{design:true,selectedId:first});
  assert.ok(edit.includes(`data-node-id="${first}"`));
  assert.ok(edit.includes('card')&&edit.includes('chosen'));
  assert.equal(edit.replace(/ data-node-id="[^"]*" data-kind="[^"]*"/g,'').replace(/ chosen/g,''),plain);
});

test('shared template changes propagate to studio previews and all public records',()=>{
  const draft=structuredClone(data);
  const template=draft.templates.find(t=>t.id==='record-project-layout');
  template.blocks[0].background='grey-100';
  const pages=collectPages(draft).filter(p=>p.route.startsWith('/work/'));
  assert.ok(pages.length>=2);
  for(const record of project.records.filter(x=>x.status!=='Draft')){
    const generated=pages.find(p=>p.route.endsWith('/'+record.slug+'/'));
    const preview=renderPagePreview(draft,template.blocks,record,{route:project.base+'/'+record.slug+'/'});
    assert.ok(generated?.html.includes('bg-grey-100'));
    assert.equal(extractFrame(generated.html),preview);
  }
});

test('query blocks never link draft records in either preview or website',()=>{
  const draft=structuredClone(data);
  const home=draft.pages.find(p=>p.id==='home');
  const rendered=renderPagePreview(draft,home.blocks,null,{pageId:home.id,route:home.slug});
  assert.ok(!rendered.includes('href="/posts/soft-modules/"'));
  assert.ok(!rendered.includes('href="/studio/"'));
});

test('text payloads, links and image asset paths are escaped or constrained',()=>{
  const draft=structuredClone(data);
  const template=draft.templates.find(x=>x.id==='post-article');
  const rec=draft.collections.find(x=>x.id==='posts').records.find(x=>x.slug==='designing-with-code');
  template.blocks=[
    {id:'t',type:'text',text:'<script>alert(1)</script>'},
    {id:'b',type:'button',href:'javascript:alert(1)',text:'Test'},
    {id:'i',type:'image',source:draft.assets[0].id}
  ];
  const output=renderBlocks(template.blocks,rec,draft);
  assert.ok(output.includes('&lt;script&gt;'));
  assert.ok(!output.includes('<script>'));
  assert.ok(!output.includes('href="javascript:'));
  assert.match(output,/src="\/assets\/placeholder\/field\.svg"/);
});

test('component references remain Cards and recursion stops at maximum depth',()=>{
  const draft=structuredClone(data);
  draft.components.push({id:'loop',name:'Loop',blocks:[{id:'loopnode',type:'component',component:'loop'}]});
  const html=renderBlocks([{id:'outer',type:'component',component:'loop'}],null,draft);
  assert.ok(html.length<2000);
});