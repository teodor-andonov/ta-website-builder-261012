/**
 * M12.1/12.2 — pure Card-based template + composition assembly.
 * Optional on a page. Legacy V1 pages/templates are unchanged.
 * A slot is a Card behaviour, not a new graphical node type.
 */
const isCard = node => node && typeof node==='object' && !Array.isArray(node) && node.type==='card';
const childrenOf = node => Array.isArray(node?.children) ? node.children : [];
const oneCell = {x1:1,y1:1,x2:2,y2:2};

export function slotsIn(blocks){
  const found=[];
  const visit = list => {
    for(const node of list||[]){
      if(node && Object.hasOwn(node,'slot'))found.push(node);
      visit(childrenOf(node));
    }
  };
  visit(blocks);
  return found;
}
export function assertSlotTemplate(template){
  if(!template || template.layoutMode!=='slot')
    throw Error('Expected a slot-based page template');
  if(!Array.isArray(template.blocks) || template.blocks.length!==1 || !isCard(template.blocks[0]))
    throw Error('Slot template '+template.id+' requires one root Card');
  const slots=slotsIn(template.blocks);
  if(slots.length!==1 || !isCard(slots[0]) || slots[0].slot!=='main')
    throw Error('Slot template '+template.id+' must have exactly one main Card slot');
  const target=slots[0];
  if(target.source || target.reference || childrenOf(target).length || target.columns!==1 || target.rows!==1)
    throw Error('Main slot '+target.id+' must be an empty 1×1 authored Card without source or reference');
  return target;
}
export function assemblePage(template,composition){
  assertSlotTemplate(template);
  if(!isCard(composition)||Object.hasOwn(composition,'area')||Object.hasOwn(composition,'slot'))
    throw Error('Page composition must be one root Card without an area or slot');
  // Clone both trees; never mutate canonical page, template or component JSON.
  const roots=structuredClone(template.blocks);
  const root=structuredClone(composition);
  root.area={...oneCell};
  const insert=list=>{
    for(const node of list){
      if(node.slot==='main'){
        node.children=[root];
        return true;
      }
      if(insert(childrenOf(node)))return true;
    }
    return false;
  };
  if(!insert(roots))throw Error('Main slot disappeared during assembly');
  return roots;
}
