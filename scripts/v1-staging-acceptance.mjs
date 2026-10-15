/**
 * V1 staging release acceptance — this approves only an unindexed static
 * preview and local Content Studio authoring, NEVER an external production
 * launch. Placeholder content is user-approved for software staging only.
 */
import {readFile,stat} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validate} from '../src/model.mjs';
import {auditContent} from './content-readiness.mjs';
import {collectPages} from '../src/render.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const fail=message=>{throw Error('V1 staging acceptance: '+message)};
export function assessV1Staging(data){
 validate(data);
 const issues=auditContent(data);
 const allowed=new Set(['placeholder-media','placeholder-record','placeholder-page','missing-booking-url']);
 const unexpected=issues.filter(i=>!allowed.has(i.code));
 if(unexpected.length)fail('Unexpected content issue: '+unexpected.map(i=>i.code+' '+i.path).join('; '));
 const pages=collectPages(data);
 const routes=new Set(pages.map(p=>p.route));
 for(const expected of ['/','/work/','/posts/'])
  if(!routes.has(expected))fail('Missing essential route '+expected);
 if(routes.size!==pages.length)fail('Duplicate public routes');
 if(data.pages.some(p=>p.status==='Published'&&p.approvedForPublication===true&&p.placeholder===true))
  fail('Published page simultaneously marked approved and placeholder');
 for(const collection of data.collections){
  for(const record of collection.records){
   if(record.status!=='Draft'&&record.placeholder===true&&record.approvedForPublication===true)
    fail('Record simultaneously marked approved and placeholder: '+record.id);
  }
 }
 for(const page of pages){
  if(!page.html.includes('<meta name="robots" content="noindex, nofollow">'))
   fail('Unindexed preview lost robots protection at '+page.route);
  if(/<link rel="canonical"|<meta property="og:url"/.test(page.html))
   fail('Unapproved canonical/og:url at '+page.route);
  if(/\/(?:studio|api)\//.test(page.route))
   fail('Editor or API route publicly rendered');
 }
 return {
  stagingReady:true,productionReady:false,
  routes:pages.length,
  allowedPlaceholders:issues.filter(i=>i.kind==='placeholder').length,
  productionBlockers:issues.filter(i=>i.kind!=='placeholder').map(i=>i.code),
  note:'Staging approval is not consent to index or deploy a public production website'
 };
}
export async function verifyStagingBuild(data,dist){
 const report=assessV1Staging(data);
 const required=['index.html','work/index.html','posts/index.html','404.html','site.css','robots.txt'];
 for(const name of required){
  const file=await stat(join(dist,...name.split('/'))).catch(()=>null);
  if(!file?.isFile())fail('Built static file is missing: '+name);
 }
 const robots=await readFile(join(dist,'robots.txt'),'utf8');
 if(robots!=='User-agent: *\nDisallow: /\n')fail('Staging robots.txt is not restrictive');
 if(await stat(join(dist,'sitemap.xml')).then(()=>true).catch(()=>false))
  fail('Staging must not include an indexable sitemap');
 const html=await readFile(join(dist,'index.html'),'utf8');
 if(!html.includes('<meta name="robots" content="noindex, nofollow">'))
  fail('Built HTML is not unindexed');
 for(const name of ['studio/index.html','content/site.json','src/server.mjs']){
  if(await stat(join(dist,...name.split('/'))).then(()=>true).catch(()=>false))
   fail('Private source leaked into public output: '+name);
 }
 return report;
}
const direct=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){
 try{
  const data=JSON.parse(await readFile(join(root,'content','site.json'),'utf8'));
  const output=resolve(process.env.TA_OUTPUT_DIR||join(root,'dist'));
  console.log('V1_STAGING_ACCEPTANCE_OK '+JSON.stringify(await verifyStagingBuild(data,output)));
 }catch(error){console.error(error.message);process.exitCode=1}
}
