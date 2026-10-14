import test from 'node:test';
import assert from 'node:assert/strict';
import {moveTreeNode,nodePath} from '../src/tree-editor.mjs';

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
