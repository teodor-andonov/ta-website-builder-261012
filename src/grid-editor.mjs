// Geometry rules shared by the desktop grid editor and its tests.
// Areas use one-based, start-inclusive/end-exclusive grid lines.
export const integer=(value)=>Number.isInteger(value)&&value>=1;
export function validArea(area,columns,rows){
  return !!area&&integer(columns)&&integer(rows)&&
   ['x1','y1','x2','y2'].every(k=>integer(area[k]))&&
   area.x1<area.x2&&area.y1<area.y2&&
   area.x2<=columns+1&&area.y2<=rows+1;
}
export function intersects(a,b){
  return Math.max(a.x1,b.x1)<Math.min(a.x2,b.x2)&&
   Math.max(a.y1,b.y1)<Math.min(a.y2,b.y2);
}
export function rectangleFromCells(a,b){
  return {x1:Math.min(a.x,b.x),y1:Math.min(a.y,b.y),
    x2:Math.max(a.x,b.x)+1,y2:Math.max(a.y,b.y)+1};
}
export function placementError(card,nodeId,area){
  if(!card||!validArea(area,card.columns,card.rows))return 'Area falls outside the Card grid';
  if((card.children||[]).some(sibling=>sibling.id!==nodeId&&
     sibling.area&&intersects(area,sibling.area)))return 'That area overlaps another child';
  return '';
}
// The overlay's track widths/heights are resolved by CSS. Map a pointer to
// whichever cell CENTRE is nearest so clicks inside gaps snap predictably.
export function nearestCell(position,trackSizes,gap=0){
  if(!Array.isArray(trackSizes)||!trackSizes.length)return 1;
  let offset=0,index=1,distance=Infinity;
  trackSizes.forEach((size,i)=>{
    const center=offset+size/2;
    const diff=Math.abs(position-center);
    if(diff<distance){distance=diff;index=i+1}
    offset+=size+gap;
  });
  return index;
}
export function parsePixelTracks(styleString){
  const arr=String(styleString||'').trim().split(/\s+/).map(x=>Number.parseFloat(x));
  return arr.length&&arr.every(x=>Number.isFinite(x)&&x>=0)?arr:[];
}


// Client-only overlay: lives INSIDE the selected node's parent Card and is
// position:absolute so it never becomes a third layout node or changes tracks.
export function mountGridOverlay({root,parentNode,selectedNode,onCommit}){
  if(!root||!parentNode||!selectedNode)return null;
  const card=[...root.querySelectorAll('[data-node-id]')].find(el=>el.dataset.nodeId===parentNode.id);
  if(!card)return null;
  const style=getComputedStyle(card);
  const columns=parentNode.columns,rows=parentNode.rows;
  const colTracks=parsePixelTracks(style.gridTemplateColumns);
  const rowTracks=parsePixelTracks(style.gridTemplateRows);
  if(colTracks.length!==columns||rowTracks.length!==rows)return null;
  const colGap=Number.parseFloat(style.columnGap)||0,rowGap=Number.parseFloat(style.rowGap)||0;
  const overlay=document.createElement('div');
  overlay.className='grid-edit-overlay';
  overlay.dataset.gridEditing=selectedNode.id;
  overlay.setAttribute('role','group');
  overlay.setAttribute('aria-label','Edit '+selectedNode.id+' on parent grid');
  Object.assign(overlay.style,{
    left:style.paddingLeft,right:style.paddingRight,
    top:style.paddingTop,bottom:style.paddingBottom,
    gridTemplateColumns:style.gridTemplateColumns,
    gridTemplateRows:style.gridTemplateRows,
    columnGap:style.columnGap,rowGap:style.rowGap
  });
  if(columns*rows<=512)for(let y=1;y<=rows;y++)for(let x=1;x<=columns;x++){
    const cell=document.createElement('div');
    cell.className='grid-edit-cell';
    cell.style.gridColumn=String(x);
    cell.style.gridRow=String(y);
    cell.title='Column '+x+', row '+y;
    overlay.append(cell);
  }
  const highlight=document.createElement('div');
  highlight.className='grid-edit-selection';
  overlay.append(highlight);
  const hint=document.createElement('div');
  hint.className='grid-edit-hint';
  hint.textContent=columns*rows>512?'Grid too dense for dragging. Use coordinates in the inspector.':'Drag across cells to place / resize selected object';
  overlay.append(hint);
  const show=(area,invalid=false)=>{
    highlight.style.gridColumn=area.x1+'/'+area.x2;
    highlight.style.gridRow=area.y1+'/'+area.y2;
    highlight.classList.toggle('grid-edit-invalid',invalid);
  };
  if(validArea(selectedNode.area,columns,rows))show(selectedNode.area);
  const cellAt=(event)=>{
    const rect=overlay.getBoundingClientRect();
    return {x:nearestCell(event.clientX-rect.left,colTracks,colGap),
      y:nearestCell(event.clientY-rect.top,rowTracks,rowGap)};
  };
  let anchor=null,draft=null,dragged=false;
  const areaFromEvent=e=>rectangleFromCells(anchor,cellAt(e));
  overlay.addEventListener('pointerdown',event=>{
    if(event.button!==0||columns*rows>512)return;
    event.preventDefault();
    anchor=cellAt(event);draft=rectangleFromCells(anchor,anchor);dragged=false;
    overlay.setPointerCapture(event.pointerId);
    show(draft,Boolean(placementError(parentNode,selectedNode.id,draft)));
  });
  overlay.addEventListener('pointermove',event=>{
    if(!anchor)return;
    const next=areaFromEvent(event);dragged=true;draft=next;
    show(next,Boolean(placementError(parentNode,selectedNode.id,next)));
  });
  const complete=event=>{
    if(!anchor)return;
    const next=areaFromEvent(event);
    const error=placementError(parentNode,selectedNode.id,next);
    anchor=null;draft=null;
    if(error){
      hint.textContent=error+'. Choose free cells or use the inspector.';
      show(selectedNode.area);
      return;
    }
    hint.textContent='Placed in x'+next.x1+'–'+(next.x2-1)+' / y'+next.y1+'–'+(next.y2-1);
    if(Object.keys(next).some(k=>next[k]!==selectedNode.area?.[k]))onCommit(next);
    else show(next);
  };
  overlay.addEventListener('pointerup',complete);
  overlay.addEventListener('pointercancel',()=>{anchor=null;show(selectedNode.area)});
  card.append(overlay);
  return overlay;
}
