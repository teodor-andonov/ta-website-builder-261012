import test from 'node:test';
import assert from 'node:assert/strict';
import {moveTreeByIntent,moveTreeNode,nodePath,findFreeArea} from '../src/tree-editor.mjs';

const item=(id,area)=>({id,type:'text',text:id,area});
const card=(id,children,area,columns=2,rows=2)=>({
 id,type:'card',area,columns,rows,children,background:'transparent',padding:'x1',gap:'x1',border:false,constrainHeight:false,heightFactor:.5
});
function sample(){
 return [
  card('hero',[card('group',[item('a',{x1:1,y1:1,x2:2,y2:2}),item('b',{x1:2,y1:1,x2:3,y2:2})],{x1:1,y1:1,x2:2,y2:2}),card('empty',[],{x1:2,y1:1,x2:3,y2:2})]),
  card('work',[])
 ];
}
test('M8 sibling reorder keeps each child in its original grid position',()=>{
 const before=sample(),snapshot=structuredClone(before);
 const res=moveTreeNode(before,'b','a','before');
 assert.equal(res.ok,true);
 assert.deepEqual(res.blocks[0].children[0].children.map(x=>x.id),['b','a']);
 assert.deepEqual(res.blocks[0].children[0].children[0].area,{x1:2,y1:1,x2:3,y2:2});
 assert.deepEqual(before,snapshot,'original JSON untouched');
});
test('M8 reparent assigns a free cell inside destination Card',()=>{
 const res=moveTreeNode(sample(),'a','empty','inside');
 assert.equal(res.ok,true);
 assert.equal(res.blocks[0].children[0].children.length,1);
 const moved=res.blocks[0].children[1].children[0];
 assert.equal(moved.id,'a');
 assert.deepEqual(moved.area,{x1:1,y1:1,x2:2,y2:2});
});
test('M8 reparent extends rows when target Card grid has no free cells',()=>{
 const root=sample();
 root[0].children[1].children=[item('one',{x1:1,y1:1,x2:3,y2:3})];
 const res=moveTreeNode(root,'a','empty','inside');
 assert.equal(res.ok,true);
 assert.equal(res.blocks[0].children[1].rows,3);
 assert.equal(res.blocks[0].children[1].children.at(-1).area.y1,3);
});
test('M8 allows moving a Card to the Page root but not an Item',()=>{
 const yes=moveTreeNode(sample(),'empty','work','before');
 assert.equal(yes.ok,true);
 assert.deepEqual(yes.blocks.map(n=>n.id),['hero','empty','work']);
 assert.equal(yes.blocks[1].area,undefined);
 const no=moveTreeNode(sample(),'a','work','after');
 assert.equal(no.ok,false);
});
test('M8 rejects cycles, self-drops and generated query/reference Cards',()=>{
 assert.equal(moveTreeNode(sample(),'hero','group','inside').ok,false);
 assert.equal(moveTreeNode(sample(),'a','a','inside').ok,false);
 const d=sample();d[0].children[1].source={collection:'projects'};
 assert.equal(moveTreeNode(d,'a','empty','inside').ok,false);
 const e=sample();e[0].children[1].reference='some-component';
 assert.equal(moveTreeNode(e,'a','empty','inside').ok,false);
});
test('M8 returns ancestral IDs useful for selection breadcrumbs',()=>{
 assert.deepEqual(nodePath(sample(),'a'),['hero','group','a']);
 assert.equal(nodePath(sample(),'missing'),null);
});

test('M8 duplicate placement finds an existing free cell before extending rows',()=>{
 const t=sample(),group=t[0].children[0],original=group.children[0];
 const slot=findFreeArea(group,group.children,original);
 assert.ok(slot);
 assert.deepEqual(slot.area,{x1:1,y1:2,x2:2,y2:3});
 assert.equal(slot.rows,2);
 assert.deepEqual(t[0].children[0].children.map(x=>x.id),['a','b']);
});
test('M8 duplicate expands a full target by the copied Item height',()=>{
 const source=item('a',{x1:1,y1:1,x2:2,y2:2});
 const full=card('full',[source,item('b',{x1:1,y1:2,x2:2,y2:3})],null,1,2);
 const slot=findFreeArea(full,full.children,source);
 assert.deepEqual(slot.area,{x1:1,y1:3,x2:2,y2:4});
 assert.equal(slot.rows,3);
});
test('M8 duplicate refuses non-authorable source Cards and impossible grid sizes',()=>{
 const t=sample(),g=t[0].children[1];g.reference='reusable';
 assert.equal(findFreeArea(g,g.children,item('x',{x1:1,y1:1,x2:2,y2:2})),null);
 const c=card('full',[item('taken',{x1:1,y1:1,x2:2,y2:65})],null,1,64);
 assert.equal(findFreeArea(c,c.children,item('other',{x1:1,y1:1,x2:2,y2:2})),null);
});


test('keyboard Up/Down reorders siblings without changing authored grid areas',()=>{
 const a=sample();
 const before=structuredClone(a[0].children[0].children);
 const up=moveTreeByIntent(a,'b','up');
 assert.equal(up.ok,true);
 assert.deepEqual(up.blocks[0].children[0].children.map(n=>n.id),['b','a']);
 assert.deepEqual(up.blocks[0].children[0].children[0].area,before[1].area);
 const down=moveTreeByIntent(up.blocks,'b','down');
 assert.equal(down.ok,true);
 assert.deepEqual(down.blocks[0].children[0].children.map(n=>n.id),['a','b']);
 assert.equal(moveTreeByIntent(a,'a','up').ok,false);
 assert.deepEqual(a[0].children[0].children,before,'pure operation must not mutate input');
});
test('keyboard indent nests into preceding editable sibling Card; outdent reverses the parent',()=>{
 const a=sample();
 const nested=moveTreeByIntent(a,'empty','indent');
 assert.equal(nested.ok,true);
 assert.equal(nested.parentId,'group');
 assert.equal(nested.blocks[0].children[0].children.at(-1).id,'empty');
 const lifted=moveTreeByIntent(nested.blocks,'empty','outdent');
 assert.equal(lifted.ok,true);
 assert.equal(lifted.parentId,'hero');
 assert.deepEqual(lifted.blocks[0].children.map(n=>n.id),['group','empty']);
 assert.equal(lifted.blocks[0].children[1].area.x1>=1,true);
});
test('keyboard moves reject illegal indentation, root outdent and unknown intents',()=>{
 const a=sample();
 assert.equal(moveTreeByIntent(a,'a','indent').ok,false,'preceding Item is not a Card');
 assert.equal(moveTreeByIntent(a,'hero','outdent').ok,false);
 assert.equal(moveTreeByIntent(a,'missing','down').ok,false);
 assert.equal(moveTreeByIntent(a,'a','weird').ok,false);
 const d=sample();d[0].children[0].source={collection:'projects'};
 assert.equal(moveTreeByIntent(d,'empty','indent').ok,false,'cannot drop in data source Card');
 assert.equal(moveTreeByIntent(a,'a','outdent').ok,true,'outdent to hero parent is allowed');
 assert.equal(moveTreeByIntent(a,'group','outdent').ok,true,'Card outdent to root is allowed');
});
