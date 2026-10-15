// Publishing gate: preview/staging is always noindex. Search indexing requires
// explicit deployment intent, a verified HTTPS origin and clean editorial audit.
// This pure module is reusable in CLI tests and the static build.
import {auditContent} from '../scripts/content-readiness.mjs';

export function parsePublicOrigin(value){
  if(typeof value!=='string'||!value.trim())throw Error('TA_PUBLIC_ORIGIN must be a verified HTTPS domain URL');
  let origin;
  try{origin=new URL(value)}catch{throw Error('TA_PUBLIC_ORIGIN must be a valid HTTPS URL')}
  if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||origin.port||
     !origin.hostname.includes('.')||/(^localhost$|\.localhost$|\.local$|\.test$|\.example$|\.invalid$|\.example\.(com|org|net)$)/i.test(origin.hostname) ||
     /^\d+\.\d+\.\d+\.\d+$/.test(origin.hostname))
    throw Error('TA_PUBLIC_ORIGIN must be a verified public HTTPS origin without credentials, port, path, query or fragment');
  return origin.origin;
}

export function publicationSettings(data,env={}){
  const requested=env.TA_ENABLE_INDEXING;
  if(requested!==undefined&&requested!=='0'&&requested!=='1')
    throw Error('TA_ENABLE_INDEXING must be 0 or 1');
  const indexing=requested==='1';
  // A domain alone does not change the staging site's noindex behavior.
  if(!indexing)return {indexing:false,origin:null};
  const origin=parsePublicOrigin(env.TA_PUBLIC_ORIGIN);
  const findings=auditContent(data);
  if(findings.length)throw Error('Public indexing blocked: '+findings.length+' outstanding content approval, placeholder or contact issue(s)');
  return {indexing:true,origin};
}

export function absolutePageUrl(origin,route){
  if(!origin)return null;
  if(typeof route!=='string'||!/^\/(?:[a-z0-9-]+\/)*$/.test(route))
    throw Error('Invalid canonical route');
  return origin+route;
}
