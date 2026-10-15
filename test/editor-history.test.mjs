import test from 'node:test';
import assert from 'node:assert/strict';
import {createEditorHistory} from '../src/editor-history.mjs';
const tree=title=>[{id:'section',type:'card',children:[{id:'title',type:'text',text:title,area:{x1:1,y1:1,x2:2,y2:2}}]}];

test('M8 multi-step undo/redo travels back and forth without aliasing snapshots',()=>{
 const h=createEditorHistory(),key='page:home';
 const a=tree('A'),b=tree('B'),c=tree('C');
 assert.equal(h.record(key,a,b,'title','title'),true);
 assert.equal(h.record(key,b,c,'title','section'),true);
 assert.deepEqual(h.undo(key),{blocks:b,selected:'title'});
 const old=h.undo(key);
 assert.deepEqual(old,{blocks:a,selected:'title'});
 old.blocks[0].children[0].text='EXTERNAL MUTATION';
 assert.deepEqual(h.redo(key),{blocks:b,selected:'title'});
 assert.deepEqual(h.redo(key),{blocks:c,selected:'section'});
 assert.equal(h.redo(key),null);
});
test('M8 rejects no-op history changes and clears redo after a new valid edit',()=>{
 const h=createEditorHistory(),key='page:home';
 assert.equal(h.record(key,tree('A'),tree('A')),false);
 assert.equal(h.canUndo(key),false);
 h.record(key,tree('A'),tree('B'));
 assert.ok(h.undo(key));
 assert.equal(h.canRedo(key),true);
 h.record(key,tree('A'),tree('New branch'));
 assert.equal(h.canRedo(key),false);
 assert.equal(h.canUndo(key),true);
});
test('M8 history is scoped to Page/Template/Component and can be cleared',()=>{
 const h=createEditorHistory();
 h.record('page:home',tree('A'),tree('B'));
 h.record('component:cta',tree('C'),tree('D'));
 assert.equal(h.canUndo('page:home'),true);
 h.undo('page:home');
 assert.equal(h.canUndo('page:home'),false);
 assert.equal(h.canUndo('component:cta'),true);
 h.clear('component:cta');
 assert.equal(h.canUndo('component:cta'),false);
});
test('M8 bounded history evicts oldest entries, not newer undo steps',()=>{
 const h=createEditorHistory({limit:2});
 h.record('page:home',tree('A'),tree('B'));
 h.record('page:home',tree('B'),tree('C'));
 h.record('page:home',tree('C'),tree('D'));
 assert.equal(h.undo('page:home').blocks[0].children[0].text,'C');
 assert.equal(h.undo('page:home').blocks[0].children[0].text,'B');
 assert.equal(h.undo('page:home'),null);
});
test('M8 history keeps a valid selection even when delete must restore the item',()=>{
 const h=createEditorHistory();
 const before=tree('A'),after=[{...tree('A')[0],children:[]}];
 h.record('page:home',before,after,'title',null);
 assert.equal(h.undo('page:home').selected,'title');
 assert.equal(h.redo('page:home').selected,null);
});
