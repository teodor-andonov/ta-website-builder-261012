import test from 'node:test';
import assert from 'node:assert/strict';
import {areaFromDrag,moveAreaToCell,childAtCell,cellAtPixel,gridRect} from '../src/grid-editor.mjs';

test('M8 fixed-grid bounds are 1-based gridlines and reject invalid rectangles',()=>{
 assert.deepEqual(gridRect(2,1,5,3,8,4),{x1:2,y1:1,x2:5,y2:3});
 for(const a of [[0,1,2,3,8,4],[2,1,2,3,8,4],[1,1,10,3,8,4],[1,1,2,2.2,8,4]])
  assert.equal(gridRect(...a),null);
});
test('dragging across grid cells spans the exact rectangle, independent of drag direction',()=>{
 assert.deepEqual(areaFromDrag({x:2,y:3},{x:5,y:6},8,8),{x1:2,y1:3,x2:6,y2:7});
 assert.deepEqual(areaFromDrag({x:5,y:6},{x:2,y:3},8,8),{x1:2,y1:3,x2:6,y2:7});
 assert.deepEqual(areaFromDrag({x:2,y:2},{x:2,y:2},3,3),{x1:2,y1:2,x2:3,y2:3});
});
test('click moves a child to a cell without changing span or escaping its parent',()=>{
 const original={x1:2,y1:3,x2:4,y2:7};
 assert.deepEqual(moveAreaToCell(original,{x:3,y:7},5,8),{x1:3,y1:5,x2:5,y2:9});
 assert.deepEqual(moveAreaToCell(original,{x:1,y:1},5,8),{x1:1,y1:1,x2:3,y2:5});
 assert.equal(moveAreaToCell(original,{x:1,y:1},1,8),null);
});
test('selection resolves only direct children spanning the target cell',()=>{
 const nodes=[{id:'a',area:{x1:1,y1:1,x2:4,y2:3}},{id:'b',area:{x1:4,y1:1,x2:5,y2:3}}];
 assert.equal(childAtCell(nodes,{x:2,y:2}).id,'a');
 assert.equal(childAtCell(nodes,{x:4,y:1}).id,'b');
 assert.equal(childAtCell(nodes,{x:5,y:2}),null);
});
test('pointer positions snap to resolved CSS track sizes, including gaps',()=>{
 const widths=[80,120],heights=[40,50,60];
 assert.deepEqual(cellAtPixel(2,2,widths,heights,10,8),{x:1,y:1});
 assert.deepEqual(cellAtPixel(95,90,widths,heights,10,8),{x:2,y:2});
 assert.deepEqual(cellAtPixel(999,999,widths,heights,10,8),{x:2,y:3});
});
test('only desktop Studio loads grid-edit module; public CSS renderer remains unchanged',async()=>{
 const studio=await (await import('node:fs/promises')).readFile(new URL('../studio/index.html',import.meta.url),'utf8');
 assert.match(studio,/from "\/src\/grid-editor\.mjs"/);
 assert.match(studio,/function attachGridOverlay\(\)/);
 assert.match(studio,/data-act="toggle-grid"/);
 assert.match(studio,/case'grid-undo':/);
 const renderer=await (await import('node:fs/promises')).readFile(new URL('../src/render.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(renderer,/m8-grid-overlay/);
});
