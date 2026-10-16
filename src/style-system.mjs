/** M13: resolved appearance is site/legacy defaults → named style → local overrides.
 * A style never owns geometry, content, media or arbitrary CSS.
 */
export const CARD_PROPERTIES=['background','padding','gap','border'];
export const ITEM_PROPERTIES=['role','tone','weight'];
export const STYLE_OPTIONS={
  background:['transparent','white','grey-100','grey-200','grey-300','grey-600','black'],
  padding:['x1','x2','x4'],gap:['x1','x2','x4'],border:[false,true],
  role:['display','heading','body','eyebrow','caption'],
  tone:['inherit','ink','muted','inverse'],
  weight:['inherit','regular','medium','bold']
};
export const STYLE_TARGETS=['card','item'];
const defaults={card:{background:'transparent',padding:'x1',gap:'x1',border:false},
  item:{role:'body',tone:'inherit',weight:'inherit'}};
const properties=target=>target==='card'?CARD_PROPERTIES:ITEM_PROPERTIES;
export function styleFor(node,data){
  return node.styleRef?data?.site?.design?.styles?.find(s=>s.id===node.styleRef)||null:null;
}
export function resolveAppearance(node,data){
  const target=node.type==='card'?'card':'item';
  const base=target==='card'
    ?{...defaults.card,background:node.background??defaults.card.background,
       padding:node.padding??defaults.card.padding,gap:node.gap??defaults.card.gap,
       border:node.border??defaults.card.border}
    :{...defaults.item,role:node.style||'body'};
  const shared=styleFor(node,data);
  // Existing direct fields remain a compatibility fallback. Named styles take
  // precedence on opt-in; appearance alone stores explicit per-property changes.
  const computed={...base,...(shared?.properties||{}),...(node.appearance||{})};
  return Object.fromEntries(properties(target).map(key=>[key,computed[key]]));
}
export function validateStyleDefinitions(data,fail){
  const styles=data.site?.design?.styles;
  if(styles===undefined)return;
  if(!Array.isArray(styles)||styles.length>100)fail('Invalid named styles list');
  const seen=new Set();
  for(const style of styles){
    if(!style||typeof style!=='object'||Array.isArray(style)||
       typeof style.id!=='string'||!/^[A-Za-z0-9_-]+$/.test(style.id)||seen.has(style.id)||
       typeof style.name!=='string'||!style.name.trim()||style.name.length>70||
       !STYLE_TARGETS.includes(style.target)||
       !style.properties||typeof style.properties!=='object'||Array.isArray(style.properties)||
       Object.keys(style).some(key=>!['id','name','target','properties'].includes(key)))
      fail('Invalid or duplicate named style');
    seen.add(style.id);
    for(const [key,value] of Object.entries(style.properties)){
      if(!properties(style.target).includes(key)||!STYLE_OPTIONS[key].includes(value))
        fail('Invalid named style property: '+style.id+'.'+key);
    }
  }
}
export function validateNodeStyle(node,data,fail){
  const target=node.type==='card'?'card':'item',allowed=properties(target);
  if(node.styleRef!==undefined){
    const style=styleFor(node,data);
    if(typeof node.styleRef!=='string'||!style||style.target!==target)
      fail('Unknown or wrong-target named style: '+node.id);
  }
  if(node.appearance!==undefined){
    if(!node.appearance||typeof node.appearance!=='object'||Array.isArray(node.appearance))
      fail('Invalid local appearance overrides: '+node.id);
    for(const [key,value] of Object.entries(node.appearance))
      if(!allowed.includes(key)||!STYLE_OPTIONS[key].includes(value))
        fail('Invalid local appearance property: '+node.id+'.'+key);
  }
}
/** Inline CSS variables are fixed allowlisted tokens, never user CSS strings. */
export function siteTokenStyle(data){
  const design=data.site?.design||{},palette=design.palette||{},tokens=design.tokens||{};
  const colors={
    paper:palette.paper||'#ffffff',ink:palette.ink||'#141414',
    'grey-100':palette.grey100||'#f2f2f2','grey-200':palette.grey200||'#e3e3e3',
    'grey-300':palette.grey300||'#bcbcbc','grey-600':palette.grey600||'#666666',
    black:palette.black||'#111111'
  };
  const declarations=[
    '--ta-pad:'+Number(design.pad||1)+'cqw',
    '--ta-gap:'+Number(design.gap||1)+'cqw',
    '--ta-radius:'+Number(tokens.radius??1.15)+'cqw',
    '--ta-outline-opacity:'+Math.round(Number(tokens.outlineOpacity??.2)*100)+'%',
    '--ta-mono:'+(tokens.fontFamily==='system'?'Arial,Helvetica,sans-serif':'"Geist Mono","PT Mono",Consolas,monospace')
  ];
  for(const [key,val] of Object.entries(colors))declarations.push('--ta-'+key+':'+val);
  return declarations.join(';');
}
