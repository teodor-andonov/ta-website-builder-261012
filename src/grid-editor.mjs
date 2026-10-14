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
