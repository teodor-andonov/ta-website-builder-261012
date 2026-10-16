/** M15 — typed, deterministic asset query evaluation.
 * Asset matching reads only canonical metadata; no relation table or scripting.
 */
export const ASSET_FILTERS=Object.freeze({projectCode:['eq'],tags:['contains'],name:['eq','contains']});
const MAX_FILTERS=8;
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export function validateAssetSource(source,fail){
 if(!isObject(source)||source.kind!=='assets'||
    Object.keys(source).some(k=>!['kind','where','sort','count','layout','caption'].includes(k))||
    !Array.isArray(source.where)||source.where.length<1||source.where.length>MAX_FILTERS||
    !Number.isInteger(source.count)||source.count<1||source.count>200||
    !['original','name'].includes(source.sort)||
    !['grid','three','list'].includes(source.layout)||
    (source.caption!==undefined&&typeof source.caption!=='boolean'))
    fail('Invalid asset query source');
 for(const predicate of source.where){
  if(!isObject(predicate)||Object.keys(predicate).some(k=>!['field','op','value'].includes(k))||
     !Object.hasOwn(ASSET_FILTERS,predicate.field)||
     !ASSET_FILTERS[predicate.field].includes(predicate.op)||
     typeof predicate.value!=='string'||!predicate.value.trim()||predicate.value.length>128)
    fail('Invalid asset query predicate');
  // Field values are single literal tokens or a simple typed record property.
  // Never interpret these values as arbitrary expressions or object paths.
  if(/\{\{/.test(predicate.value)&&!/^(?:\{\{\s*(?:projectCode|title|category|status)\s*\}\})$/.test(predicate.value))
    fail('Unsupported asset query record binding');
 }
}
function resolveValue(value,context){
 const match=value.match(/^\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}$/);
 const resolved=match?context?.[match[1]]:value;
 return typeof resolved==='string'?resolved.trim():typeof resolved==='number'?String(resolved):'';
}
function fieldValue(asset,field){
 if(field==='projectCode')return asset.properties?.projectCode||'';
 if(field==='tags')return asset.tags;
 if(field==='name')return asset.name||'';
 return null;
}
/** All predicates are ANDed. Empty values (including missing context) never match. */
export function queryAssets(source,assets,context=null){
 validateAssetSource(source,message=>{throw Error(message)});
 const filters=source.where.map(p=>({...p,resolved:resolveValue(p.value,context).toLocaleLowerCase('en')}));
 if(filters.some(p=>!p.resolved))return [];
 const matches=(assets||[]).filter(asset=>filters.every(({field,op,resolved})=>{
  const value=fieldValue(asset,field);
  if(field==='tags'){
    return Array.isArray(value)&&value.some(tag=>typeof tag==='string'&&tag.toLocaleLowerCase('en')===resolved);
  }
  if(typeof value!=='string'||!value.trim())return false;
  const hay=value.toLocaleLowerCase('en');
  return op==='eq'?hay===resolved:hay.includes(resolved);
 }));
 const ordered=source.sort==='name'?matches.slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),'en')||String(a.id).localeCompare(String(b.id),'en')):matches;
 return ordered.slice(0,source.count);
}
