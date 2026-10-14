import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validArea,intersects,rectangleFromCells,placementError,nearestCell,parsePixelTracks} from '../src/grid-editor.mjs';
import {validate} from '../src/model.mjs';

test('grid rectangle geometry uses inclusive starts and exclusive ends',()=>{
 assert.deepEqual(rectangleFromCells({x:3,y:6},{x:1,y:2}),{x1:1,y1:2,x2:4,y2:7});
 assert.deepEqual(rectangleFromCells({x:2,y:2},{x:2,y:2}),{x1:2,y1:2,x2:3,y2:3});
 assert.ok(validArea({x1:1,y1:1,x2:3,y2:5},2,4));
 for(const a of [{x1:0,y1:1,x2:2,y2:2},{x1:1,y1:2,x2:1,y2:3},{x1:1,y1:1,x2:5,y2:2},
   {x1:1,y1:1,x2:2.5,y2:3},null])assert.equal(validArea(a,3,3),false);
});
test('touching cells are not collisions; overlapping children are rejected',()=>{
 const a={x1:1,y1:1,x2:2,y2:2},b={x1:2,y1:1,x2:3,y2:2};
 assert.equal(intersects(a,b),false);
 const grid={columns:3,rows:2,children:[{id:'first',area:a},{id:'other',area:{x1:3,y1:1,x2:4,y2:3}}]};
 assert.equal(placementError(grid,'first',b),'');
 assert.match(placementError(grid,'first',{x1:2,y1:1,x2:4,y2:2}),/overlap/);
 assert.match(placementError(grid,'first',{x1:0,y1:1,x2:2,y2:2}),/outside/);
 assert.equal(placementError(grid,'first',a),'');
});
test('pointer snaps to nearest cell centre, including track gaps and uneven rows',()=>{
 assert.equal(nearestCell(3,[30,30],10),1);
 assert.equal(nearestCell(38,[30,30],10),2);
 assert.equal(nearestCell(-500,[30,30],10),1);
 assert.equal(nearestCell(999,[30,30],10),2);
 assert.deepEqual(parsePixelTracks('120px  180px 36.5px'),[120,180,36.5]);
 assert.deepEqual(parsePixelTracks(''),[]);
});
test('homepage uses minimal divisions without changing explicit arrangement',async()=>{
 const data=validate(JSON.parse(await readFile(new URL('../content/site.json',import.meta.url),'utf8')));
 const home=data.pages.find(p=>p.id==='home');
 const get=id=>home.blocks.find(x=>x.id===id);
 assert.equal(get('m6-work-title').columns,2);
 assert.equal(get('m6-methods-title').columns,3);
 assert.equal(get('m6-journal-title').columns,2);
 for(const id of ['work','journal'])assert.equal(data.pages.find(p=>p.id===id).blocks[0].columns,1);
 for(const card of [get('m6-work-title'),get('m6-methods-title'),get('m6-journal-title')])
   assert.ok(card.children.every(c=>validArea(c.area,card.columns,card.rows)),card.id);
});
test('Studio exposes editable grid selection and remains separate from published output',async()=>{
 const studio=await readFile(new URL('../studio/index.html',import.meta.url),'utf8');
 assert.match(studio,/mountGridOverlay/);
 assert.match(studio,/toggle-grid-edit/);
 assert.match(studio,/Edit area on canvas/);
 assert.match(studio,/grid-edit-overlay/);
 assert.match(studio,/placementError/);
 const publicStyles=await readFile(new URL('../src/public.css',import.meta.url),'utf8');
 assert.doesNotMatch(publicStyles,/grid-edit-overlay/);
});

test('inline Studio JavaScript is syntactically valid as an ES module',async()=>{
 const {spawnSync}=await import('node:child_process');
 const {mkdtemp,writeFile,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const studio=await readFile(new URL('../studio/index.html',import.meta.url),'utf8');
 const script=studio.split('<script type="module">')[1]?.split('</script>')[0];
 assert.ok(script,'Studio module script missing');
 const dir=await mkdtemp(join(tmpdir(),'ta-studio-parse-'));
 try{
  const file=join(dir,'studio.mjs');await writeFile(file,script);
  const run=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
 }finally{await rm(dir,{recursive:true,force:true});}
});
