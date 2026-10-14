// Pure helpers for desktop Studio's fixed Card-grid area editor.
// Grid line indices are 1-based. End lines are exclusive. No pixel geometry
// belongs to the canonical JSON; pointer interactions snap to equal tracks.
export function gridRect(x1,y1,x2,y2,columns,rows){
  if(![x1,y1,x2,y2,columns,rows].every(Number.isInteger) ||
    columns<1 || rows<1 || x1<1 || y1<1 || x2<=x1 || y2<=y1 ||
    x2>columns+1 || y2>rows+1)return null;
  return {x1,y1,x2,y2};
}
export function areaFromDrag(start,end,columns,rows){
  if(!start||!end)return null;
  return gridRect(Math.min(start.x,end.x),Math.min(start.y,end.y),
    Math.max(start.x,end.x)+1,Math.max(start.y,end.y)+1,columns,rows);
}
export function moveAreaToCell(area,cell,columns,rows){
  if(!gridRect(area?.x1,area?.y1,area?.x2,area?.y2,columns,rows))return null;
  if(!cell||!Number.isInteger(cell.x)||!Number.isInteger(cell.y))return null;
  const w=area.x2-area.x1,h=area.y2-area.y1;
  const x1=Math.min(Math.max(cell.x,1),columns-w+1);
  const y1=Math.min(Math.max(cell.y,1),rows-h+1);
  return gridRect(x1,y1,x1+w,y1+h,columns,rows);
}
export function childAtCell(children,cell){
  if(!cell)return null;
  return (children||[]).find(x=>{
    const a=x.area;
    return a && cell.x>=a.x1 && cell.x<a.x2 && cell.y>=a.y1 && cell.y<a.y2;
  })||null;
}
export function cellAtPixel(px,py,widths,heights,gapX=0,gapY=0){
  if(!Number.isFinite(px)||!Number.isFinite(py)||!widths?.length||!heights?.length)return null;
  const find=(v,sizes,gap)=>{
    let pos=0;
    for(let i=0;i<sizes.length;i++){
      const high=pos+sizes[i]+(i===sizes.length-1?0:gap/2);
      if(v<high)return i+1;
      pos+=sizes[i]+gap;
    }
    return sizes.length;
  };
  return {x:find(Math.max(0,px),widths,Math.max(0,gapX)),
    y:find(Math.max(0,py),heights,Math.max(0,gapY))};
}
