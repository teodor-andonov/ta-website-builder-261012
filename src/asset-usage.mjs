import {queryAssets} from './asset-query.mjs';
/** M16: conservative, read-only asset dependency scan.
 * Include direct Image Items, asset fields and context-derived gallery queries.
 * Never rewrite references behind the editor's back.
 */
export function findAssetUses(data,assetId){
 const uses=new Set();
 const assets=Array.isArray(data.assets)?data.assets:[];
 const resolve=(value,record)=>{
  if(typeof value!=='string')return '';
  const match=value.match(/^\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}$/);
  return match?record?.[match[1]]:value;
 };
 const walk=(nodes,scope,record,stack=[])=>{
  for(const n of nodes||[]){
   if(n.type==='image'&&resolve(n.source,record)===assetId)uses.add(scope+' · image '+n.id);
   if(n.type==='card'&&n.source?.kind==='assets'&&
      queryAssets(n.source,assets,record).some(asset=>asset.id===assetId))
     uses.add(scope+' · gallery '+n.id);
   if(n.type==='card'&&n.reference&&!stack.includes(n.reference)){
     const component=data.components.find(c=>c.id===n.reference);
     if(component)walk(component.blocks,scope+' · '+component.name,record,[...stack,n.reference]);
   }
   if(n.children)walk(n.children,scope,record,stack);
  }
 };
 for(const page of data.pages)walk(page.composition?[page.composition]:page.blocks,'Page '+page.title,null);
 for(const component of data.components)walk(component.blocks,'Component '+component.name,null);
 for(const template of data.templates)walk(template.blocks,'Template '+template.name,null);
 for(const collection of data.collections){
  for(const record of collection.records){
   const scope=collection.name+' / '+record.title;
   for(const field of collection.fields||[]){
    if(field.type==='asset'&&record[field.key]===assetId)uses.add(scope+' · '+field.label);
   }
   if(record.cover===assetId)uses.add(scope+' · cover');
   if(record.composition)walk([record.composition],scope,record);
   const tid=record.template||collection.formatTemplates?.[record[collection.formatField]]||collection.defaultTemplate;
   const template=data.templates.find(t=>t.id===tid);
   if(template)walk(template.blocks,scope+' · template',record);
  }
 }
 return [...uses].sort((a,b)=>a.localeCompare(b,'en'));
}
