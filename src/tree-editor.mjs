// Pure, atomic operations on the canonical Card/Item authoring tree.
// Returns a new tree or an error. Never mutates caller's source tree.
const clone=value=>structuredClone(value);
const isCard=n=>n?.type==='card';
function locate(nodes,id,parent=null){
 for(let i=0;i<nodes.length;i++){
  const n=nodes[i];
  if(n.id===id)return {node:n,parent,array:nodes,index:i};
  if(isCard(n)){const found=locate(n.children||[],id,n);if(found)return found;}
 }
 return null;
}
function containsId(node,id){
 if(node.id===id)return true;
 return (node.children||[]).some(child=>containsId(child,id));
}
function areaFits(area,cols,rows){
 return area&&Number.isInteger(area.x1)&&Number.isInteger(area.y1)&&Number.isInteger(area.x2)&&Number.isInteger(area.y2)&&
   area.x1>=1&&area.y1>=1&&area.x2>area.x1&&area.y2>area.y1&&area.x2<=cols+1&&area.y2<=rows+1;
}
function vacantArea(card,children,moved){
 const cols=card.columns,rows=card.rows;
 if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<1||cols>64||rows<1||rows>64)return null;
 const old=moved.area||{x1:1,y1:1,x2:2,y2:2};
 const w=Math.max(1,Math.min(cols,(old.x2||2)-(old.x1||1)));
 const h=Math.max(1,Math.min(64,(old.y2||2)-(old.y1||1)));
 const taken=new Set();
 for(const c of children)for(let y=c.area?.y1||1;y<(c.area?.y2||2);y++)for(let x=c.area?.x1||1;x<(c.area?.x2||2);x++)taken.add(x+':'+y);
 const free=(x,y)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(taken.has(xx+':'+yy))return false;return true};
 for(let y=1;y<=rows-h+1;y++)for(let x=1;x<=cols-w+1;x++)if(free(x,y))return {x1:x,y1:y,x2:x+w,y2:y+h,rows};
 if(rows+h>64)return null;
 return {x1:1,y1:rows+1,x2:1+w,y2:rows+1+h,rows:rows+h};
}
// Public placement helper used by Structure duplicate, matching reparent rules.
export function findFreeArea(parent,children,node){
 if(!parent||parent.type!=='card'||parent.source||parent.reference)return null;
 const slot=vacantArea(parent,children,node);
 return slot?{area:{x1:slot.x1,y1:slot.y1,x2:slot.x2,y2:slot.y2},rows:slot.rows}:null;
}
export function moveTreeNode(blocks,sourceId,targetId,mode){
 if(!['before','after','inside'].includes(mode))return {ok:false,error:'Unknown drop mode'};
 if(!sourceId||!targetId||sourceId===targetId)return {ok:false,error:'Choose two different nodes'};
 const copy=clone(blocks);
 const src=locate(copy,sourceId),target=locate(copy,targetId);
 if(!src||!target)return {ok:false,error:'Missing source or destination'};
 if(containsId(src.node,targetId))return {ok:false,error:'Cannot move into your own descendants'};
 const destination=mode==='inside'?target.node:target.parent;
 if(mode==='inside'&&(!isCard(destination)||destination.source||destination.reference))
   return {ok:false,error:'Drop inside an ordinary authored Card'};
 if(mode!=='inside'&&target.array===copy&&!isCard(src.node))
   return {ok:false,error:'The Page root only contains section Cards'};
 if(destination!==src.parent){
   if(destination?.source||destination?.reference)return {ok:false,error:'Generated Cards cannot contain authored Items'};
   if(destination){
     const slot=vacantArea(destination,destination.children||[],src.node);
     if(!slot)return {ok:false,error:'No available cell in target Card'};
     src.node.area={x1:slot.x1,y1:slot.y1,x2:slot.x2,y2:slot.y2};
     destination.rows=slot.rows;
   }else delete src.node.area; // top-level section; no parent cell
 }
 src.array.splice(src.index,1);
 if(mode==='inside'){
   destination.children||(destination.children=[]);
   destination.children.push(src.node);
 }else{
   const reTarget=locate(copy,targetId);
   if(!reTarget)return {ok:false,error:'Destination moved during operation'};
   reTarget.array.splice(reTarget.index+(mode==='after'?1:0),0,src.node);
 }
 return {ok:true,blocks:copy,movedId:sourceId,parentId:destination?.id||null};
}
export function nodePath(blocks,id){
 const walk=(nodes,acc=[])=>{for(const n of nodes){
  const next=[...acc,n.id];if(n.id===id)return next;
  if(n.children){const value=walk(n.children,next);if(value)return value;}
 }return null};
 return walk(blocks);
}
