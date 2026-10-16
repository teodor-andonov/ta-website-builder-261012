// Optional canonical origin for a future custom domain. Publishing is NOT
// coupled to content approval, local tests, GitHub CI or a hosting provider.
// An explicit site-wide JSON switch controls indexing for Pages, dist and ZIP.
export function parsePublicOrigin(value){
  if(typeof value!=='string'||!value.trim())throw Error('TA_PUBLIC_ORIGIN must be an HTTPS domain URL');
  let origin;
  try{origin=new URL(value)}catch{throw Error('TA_PUBLIC_ORIGIN must be a valid HTTPS URL')}
  if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||
     origin.search||origin.hash||origin.port||!origin.hostname.includes('.')||
     /(^localhost$|\.localhost$|\.local$|\.test$|\.example$|\.invalid$|(?:^|\.)example\.(com|org|net)$)/i.test(origin.hostname)||
     /^\d+\.\d+\.\d+\.\d+$/.test(origin.hostname))
    throw Error('TA_PUBLIC_ORIGIN must be a public HTTPS origin without path, credentials or port');
  return origin.origin;
}

export function publicationSettings(_data,env={}){
  return {indexing:_data.site?.publishing?.indexing===true,origin:env.TA_PUBLIC_ORIGIN?parsePublicOrigin(env.TA_PUBLIC_ORIGIN):null};
}

export function absolutePageUrl(origin,route){
  if(!origin)return null;
  if(typeof route!=='string'||!/^\/(?:[a-z0-9-]+\/)*$/.test(route))
    throw Error('Invalid canonical route');
  return origin+route;
}
