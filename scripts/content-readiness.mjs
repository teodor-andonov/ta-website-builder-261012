// M9 publication-readiness inventory. Read-only: never modifies authored JSON.
// Run `npm run audit:content` while authoring, or add --strict at release gate.
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

export function auditContent(data){
 const problems=[];
 const issue=(code,path,description,kind='release')=>problems.push({code,path,description,kind});
 const assets=new Map((data.assets||[]).map(a=>[a.id,a]));
 if(!data.site?.contact?.bookingUrl?.trim())issue('missing-booking-url','site/contact/bookingUrl','Configure a real HTTPS booking destination for the 15-minute introduction CTA.');
 for(const a of data.assets||[]){
  if(a.placeholder===true)
   issue('placeholder-media','assets/'+a.id,'Intentional neutral media fill; replace with real media before public launch.','placeholder');
  else if(typeof a.src==='string'&&a.src.startsWith('/assets/placeholder/'))
   issue('placeholder-source','assets/'+a.id,'Replace this neutral placeholder file before enabling public indexing.');
  else if(typeof a.src!=='string'||/^(?:demo:|\/assets\/demo\/)/.test(a.src))
   issue('demo-media','assets/'+a.id,'Replace demonstration media with an owned/licensed production file.');
  if(!a.alt?.trim())issue('missing-alt','assets/'+a.id,'Add descriptive alternative text or explicitly document decorative use.');
  if(!a.credit?.trim())issue('missing-credit','assets/'+a.id,'Record attribution/license or verify in-house ownership.');
 }
 const active=record=>record.status!=='Draft';
 for(const collection of data.collections||[]){
  for(const record of collection.records||[]){
   if(!active(record))continue;
   const path='collections/'+collection.id+'/'+record.id;
   if(record.placeholder===true)
    issue('placeholder-record',path,'Editable sample content; not cleared for production.','placeholder');
   else if(record.approvedForPublication!==true)
    issue('review-required',path,'Real project/post claims and permission to publish have not been approved.');
   if(!String(record.summary||'').trim())
    issue('missing-summary',path,'Add a factual summary and editorial context.');
   if(record.cover){
    const asset=assets.get(record.cover);
    if(!asset)issue('missing-cover',path,'Cover refers to an asset ID that is not in the library.');
    else if(asset.placeholder===true && record.placeholder!==true)
      issue('placeholder-cover',path,'Non-placeholder record uses a temporary cover image.');
    else if(/^(?:demo:|\/assets\/demo\/)/.test(asset.src||''))
      issue('demo-cover',path,'Published record is using demonstration imagery.');
   }
  }
 }
 for(const page of data.pages||[]){
  if(page.status!=='Published')continue;
  if(page.placeholder===true)
    issue('placeholder-page','pages/'+page.id,'Site page contains intentional draft copy; review before public launch.','placeholder');
  else if(page.approvedForPublication!==true)
    issue('page-review','pages/'+page.id,'Review this page copy, visual assets and calls to action before launch.');
 }
 const walk=(value,path)=>{
  if(typeof value==='string'&&/\b(?:[\w.+-]+@example\.(?:com|org|net)|https?:\/\/(?:www\.)?example\.(?:com|org|net))\b/i.test(value))
   issue('placeholder-contact',path,'Replace placeholder email/URL with a verified destination.');
  else if(Array.isArray(value))value.forEach((v,i)=>walk(v,path+'/'+i));
  else if(value&&typeof value==='object')for(const [key,v] of Object.entries(value))walk(v,path+'/'+key);
 };
 walk(data,'site');
 return problems;
}

const launched=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(launched){
 const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
 const data=JSON.parse(await readFile(resolve(repo,'content/site.json'),'utf8'));
 const findings=auditContent(data);
 const counts={};for(const f of findings)counts[f.code]=(counts[f.code]||0)+1;
 const release=findings.filter(f=>f.kind!=='placeholder').length;
 const placeholders=findings.length-release;
 console.log('TA website — content readiness: '+release+' release issue(s), '+placeholders+' intentional placeholder(s)');
 for(const [code,n] of Object.entries(counts))console.log('  '+code+': '+n);
 for(const f of findings)console.log('  ['+f.code+'] '+f.path+' — '+f.description);
 if(process.argv.includes('--strict')&&findings.length){
  console.error('Production launch blocked: replace approved placeholders and resolve release issues before removing noindex.');
  process.exitCode=1;
 }
}
