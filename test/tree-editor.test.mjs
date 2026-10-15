import test from 'node:test';
import assert from 'node:assert/strict';
import {moveTreeByIntent,moveTreeNode,nodePath,findFreeArea,findAreaConflicts} from '../src/tree-editor.mjs';

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

test('M8 collision diagnostics report overlapping sibling areas without changing the tree',()=>{
 const original=sample(),parent=original[0].children[0];
 parent.children[0].label='First Item';
 const exact=findAreaConflicts(parent,'b',{x1:1,y1:1,x2:3,y2:2});
 assert.deepEqual(exact,[{id:'a',label:'First Item',cells:1}]);
 assert.deepEqual(parent.children.map(x=>x.id),['a','b']);
 assert.deepEqual(findAreaConflicts(parent,'b',{x1:2,y1:2,x2:3,y2:3}),[],
   'adjacent edges must not count as overlap');
});
test('M8 collision diagnostics can report several overlaps and skip malformed siblings',()=>{
 const p=card('p',[
  item('a',{x1:1,y1:1,x2:3,y2:3}),
  item('b',{x1:2,y1:2,x2:4,y2:4}),
  item('bad',{x1:NaN,y1:1,x2:2,y2:2})
 ],null,4,4);
 assert.deepEqual(findAreaConflicts(p,'new',{x1:2,y1:2,x2:3,y2:3}),[
  {id:'a',label:'a',cells:1},{id:'b',label:'b',cells:1}
 ]);
 assert.deepEqual(findAreaConflicts(p,'new',{x1:2.5,y1:2,x2:3,y2:3}),[]);
 assert.deepEqual(findAreaConflicts(null,'new',{x1:1,y1:1,x2:2,y2:2}),[]);
});

test('M8 stress: 320 authored Items retain unique IDs and valid paths through repeated reparenting',()=>{
 const groups=Array.from({length:8},(_,g)=>{
   const children=Array.from({length:40},(_,i)=>item('item-'+g+'-'+i,{
     x1:i%8+1,y1:Math.floor(i/8)+1,x2:i%8+2,y2:Math.floor(i/8)+2
   }));
   return card('group-'+g,children,{x1:g+1,y1:1,x2:g+2,y2:2},8,5);
 });
 const original=[card('stress-root',groups,undefined,8,1)],unchanged=structuredClone(original);
 let current=original;
 for(let i=0;i<18;i++){
   const id='item-0-'+i;
   const moved=moveTreeNode(current,id,'group-1','inside');
   assert.equal(moved.ok,true,'move '+id+': '+moved.error);
   current=moved.blocks;
   assert.deepEqual(nodePath(current,id),['stress-root','group-1',id]);
 }
 assert.deepEqual(original,unchanged,'all 18 moves are immutable');
 assert.equal(current[0].children[0].children.length,22);
 assert.equal(current[0].children[1].children.length,58);
 assert.equal(current[0].children[1].rows,8,'full target grid grows within validated maximum');
 const group=current[0].children[1];
 const seen=new Set();
 for(const n of group.children){
   assert.equal(seen.has(n.id),false,'no duplicate authored ID');
   seen.add(n.id);
   assert.ok(n.area.x1>=1&&n.area.x2<=group.columns+1&&n.area.y2<=group.rows+1);
 }
 const selected=moveTreeByIntent(current,'group-4','up');
 assert.equal(selected.ok,true);
 assert.deepEqual(selected.blocks[0].children.slice(2,5).map(x=>x.id),['group-2','group-4','group-3']);
 assert.deepEqual(selected.blocks[0].children[3].area,{x1:5,y1:1,x2:6,y2:2},
   'keyboard reorder affects reading order but never the authored grid cell');
});
test('M8 stress: long nested ancestry and safe deep outdent',()=>{
 const leaf=item('deep-leaf',{x1:1,y1:1,x2:2,y2:2});
 let root=leaf;
 for(let depth=13;depth>=0;depth--){
   root=card('level-'+depth,[root],{x1:1,y1:1,x2:2,y2:2},1,1);
 }
 delete root.area;
 const before=[root],path=nodePath(before,'deep-leaf');
 assert.equal(path.length,15);
 const moved=moveTreeByIntent(before,'deep-leaf','outdent');
 assert.equal(moved.ok,true);
 assert.equal(nodePath(moved.blocks,'deep-leaf').length,14);
 assert.deepEqual(nodePath(before,'deep-leaf'),path,'original deep structure unchanged');
});
