// Browser end-to-end test for the local visual grid editor. Uses a disposable
// copy of site.json: neither the user's content nor GitHub Pages is modified.
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,copyFile,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

const root=resolve('.');
const tmp=await mkdtemp(join(tmpdir(),'ta-structure-editor-'));
const contentRoot=join(tmp,'data'),chromeData=join(tmp,'chrome');
await mkdir(join(contentRoot,'content'),{recursive:true});
await copyFile(join(root,'content','site.json'),join(contentRoot,'content','site.json'));
// Synthetic stress content is written ONLY into disposable test JSON.
// A separate draft page avoids changing the established Home interaction flow.
const fixtureFile=join(contentRoot,'content','site.json');
const fixture=JSON.parse(await readFile(fixtureFile,'utf8'));
const makeCard=(id,children,area,columns=1,rows=1)=>({
  id,type:'card',columns,rows,children,...(area?{area}:{}),
  padding:'x1',gap:'x1',background:'transparent',border:false,constrainHeight:false,heightFactor:.5
});
const cell={x1:1,y1:1,x2:2,y2:2};
const groups=Array.from({length:8},(_,g)=>makeCard('stress-group-'+g,
 Array.from({length:40},(_,i)=>({
   id:'stress-item-'+g+'-'+i,type:'text',text:'Synthetic item '+i,
   area:{x1:i%8+1,y1:Math.floor(i/8)+1,x2:i%8+2,y2:Math.floor(i/8)+2}
 })),{x1:g+1,y1:1,x2:g+2,y2:2},8,5));
const stressRoot=makeCard('stress-root',groups,null,8,1);
let deepest={id:'stress-leaf',type:'text',text:'Deep nested authoring selection',area:{...cell}};
for(let depth=12;depth>=0;depth--)deepest=makeCard('stress-level-'+depth,[deepest],{...cell});
delete deepest.area;
const stressPage=fixture.pages.find(p=>p.id==='studio');
for(const [index,card] of [stressRoot,deepest].entries()){
 card.area={x1:1,y1:stressPage.composition.rows+index+1,x2:2,y2:stressPage.composition.rows+index+2};
 stressPage.composition.children.push(card);
}
stressPage.composition.rows+=2;
await writeFile(fixtureFile,JSON.stringify(fixture));
const port=5274;
const server=spawn(process.execPath,['src/server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),TA_DATA_ROOT:contentRoot},stdio:'ignore'});
let chrome,ws;
try{
 let ready=false;
 for(let i=0;i<80;i++){
  if(server.exitCode!==null)throw Error('Local dev server exited');
  try{const response=await fetch('http://127.0.0.1:'+port+'/api/data');if(response.ok){ready=true;break;}}catch{}
  await sleep(100);
 }
 if(!ready)throw Error('Could not start local Content Studio server');
 chrome=spawn(process.env.CHROME||'chromium',['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-allow-origins=*','--remote-debugging-port=0','--window-size=1550,1000','--user-data-dir='+chromeData,'http://127.0.0.1:'+port+'/'],{stdio:'ignore'});
 let debugPort;
 for(let i=0;i<100;i++){
  try{debugPort=Number((await readFile(join(chromeData,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{await sleep(100);}
 }
 if(!debugPort)throw Error('Chrome DevTools did not start');
 let target;
 for(let i=0;i<80;i++){
  const tabs=await (await fetch('http://127.0.0.1:'+debugPort+'/json')).json();
  target=tabs.find(x=>x.type==='page'&&x.url.includes('127.0.0.1:'+port));
  if(target)break;await sleep(100);
 }
 if(!target)throw Error('Content Studio tab missing');
 ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((ok,no)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',no,{once:true})});
 let nextId=0;const waits=new Map();
 ws.addEventListener('message',event=>{
   const message=JSON.parse(event.data);
   if(message.id&&waits.has(message.id)){
    const {ok,no}=waits.get(message.id);waits.delete(message.id);
    message.error?no(Error(JSON.stringify(message.error))):ok(message.result);
   }
 });
 const command=(method,params={})=>new Promise((ok,no)=>{
  const id=++nextId;waits.set(id,{ok,no});ws.send(JSON.stringify({id,method,params}));
 });
 const evaluate=async expression=>{
  const v=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(v.exceptionDetails)throw Error('Runtime exception: '+JSON.stringify(v.exceptionDetails).slice(0,1500));
  return v.result.value;
 };
 await command('Page.enable');await command('Runtime.enable');
 let loaded=false;
 for(let i=0;i<100;i++){
  loaded=await evaluate('Boolean(window.__TA_STUDIO__&&document.querySelector("#saved")?.textContent.includes("LOADED"))');
  if(loaded)break;
  await sleep(100);
 }
 if(!loaded)throw Error('Studio did not load');
 await evaluate("window.__qaAlerts=[];window.alert=value=>window.__qaAlerts.push(String(value));true");
 // Publishing mode is edited in the same local JSON as all other site settings.
 const indexing=await evaluate(`(()=>{
   window.__TA_STUDIO__.navigate('dashboard');
   const selector=document.querySelector('[data-site-indexing]');
   if(!selector)return {error:'Site indexing selector missing'};
   const original=window.__TA_STUDIO__.getData().site.publishing.indexing;
   selector.value='true';selector.dispatchEvent(new Event('change',{bubbles:true}));
   const enabled=window.__TA_STUDIO__.getData().site.publishing.indexing;
   const reset=document.querySelector('[data-site-indexing]');
   reset.value='false';reset.dispatchEvent(new Event('change',{bubbles:true}));
   const disabled=window.__TA_STUDIO__.getData().site.publishing.indexing;
   return {original,enabled,disabled,selected:document.querySelector('[data-site-indexing]').value};
 })()`);
 if(indexing.original!==false||indexing.enabled!==true||indexing.disabled!==false||indexing.selected!=='false')
   throw Error('Studio search indexing switch failed: '+JSON.stringify(indexing));
 console.log('SITE_INDEXING_OK local Studio supports reversible site-wide publishing mode');
 // M12: templated pages edit only their unique root, then assemble the shared layout on preview.
 const pageAssembly=await evaluate(`(()=>{
   const result={};
   for(const id of ['work','journal']){
     window.__TA_STUDIO__.navigate('page',id);
     const isolated=document.querySelector('#workbody .card-page');
     const root=window.__TA_STUDIO__.getData().pages.find(p=>p.id===id).composition.id;
     result[id]={root,isolated:!!isolated,hasNavbar:!!document.querySelector('#workbody nav.card-nav'),
       selectedRoot:!!document.querySelector('#workbody [data-node-id="'+root+'"]')};
     document.querySelector('[data-act="mode"][data-mode="preview"]')?.click();
     result[id].fullNavbar=!!document.querySelector('#workbody nav.card-nav');
     result[id].fullFooter=!!document.querySelector('#workbody footer.card-footer');
   }
   return result;
 })()`);
 for(const [id,state] of Object.entries(pageAssembly)){
   if(!state.isolated||state.hasNavbar||!state.selectedRoot||!state.fullNavbar||!state.fullFooter)
     throw Error('M12 isolated Page composition/full preview mismatch: '+id+' '+JSON.stringify(state));
 }
 console.log('M12_PAGE_PREVIEW_OK two Pages edit composition alone and preview assembled template');
 const sharedChrome=await evaluate(`(()=>{
   window.__TA_STUDIO__.navigate('dashboard');
   const navLabel=document.querySelector('[data-site-nav-index="1"][data-site-nav-field="label"]');
   if(!navLabel)return {error:'Editable site.navigation label missing'};
   navLabel.value='Portfolio';
   navLabel.dispatchEvent(new Event('change',{bubbles:true}));
   window.__TA_STUDIO__.navigate('page','work');
   document.querySelector('[data-act="mode"][data-mode="preview"]')?.click();
   const linkText=document.querySelector('#workbody nav.card-nav a[href="/work/"]')?.textContent;
   window.__TA_STUDIO__.navigate('component','site-navbar');
   const logo=!!document.querySelector('#workbody [data-node-id="site-navbar-logo"]');
   const navbar=!!document.querySelector('#workbody nav.card-nav');
   window.__TA_STUDIO__.navigate('component','site-footer');
   const footer=!!document.querySelector('#workbody footer.card-footer [data-node-id="site-footer-name"]');
   window.__TA_STUDIO__.navigate('template','page-general');
   const templateControls=!!document.querySelector('[data-template-chrome="navigation"]')&&
     !!document.querySelector('[data-template-chrome="footer"]');
   window.__TA_STUDIO__.navigate('dashboard');
   const reset=document.querySelector('[data-site-nav-index="1"][data-site-nav-field="label"]');
   reset.value='Work';reset.dispatchEvent(new Event('change',{bubbles:true}));
   return {linkText,logo,navbar,footer,templateControls,
     restored:window.__TA_STUDIO__.getData().site.navigation[1].label};
 })()`);
 if(sharedChrome.linkText!=='Portfolio'||!sharedChrome.logo||!sharedChrome.navbar||
    !sharedChrome.footer||!sharedChrome.templateControls||sharedChrome.restored!=='Work')
   throw Error('M12 shared chrome Studio controls failed: '+JSON.stringify(sharedChrome));
 console.log('M12_CHROME_OK editable site nav, semantic Navbar/Footer and template selectors');
 // M13: styles resolve from the shared JSON and local overrides reset to inheritance.
 const styleEditing=await evaluate(`(()=>{
   const get=()=>window.__TA_STUDIO__.getData();
   window.__TA_STUDIO__.navigate('styles','index-root');
   const prop=document.querySelector('[data-style-prop="background"]');
   if(!prop)return {error:'M13 Styles editor missing'};
   prop.value='grey-100';prop.dispatchEvent(new Event('change',{bubbles:true}));
   const changed=get().site.design.styles.find(s=>s.id==='index-root').properties.background;
   const reset=document.querySelector('[data-style-prop="background"]');
   reset.value='transparent';reset.dispatchEvent(new Event('change',{bubbles:true}));
   window.__TA_STUDIO__.navigate('page','work');
   document.querySelector('[data-act="select-node"][data-id="work-index-section"]')?.click();
   const reference=document.querySelector('[data-node-style-ref]')?.value||'';
   const field=document.querySelector('[data-node-appearance="background"]');
   if(!field)return {error:'M13 local override selector missing',reference};
   field.value='black';field.dispatchEvent(new Event('change',{bubbles:true}));
   const override=get().pages.find(p=>p.id==='work').composition.appearance?.background;
   const inherit=document.querySelector('[data-node-appearance="background"]');
   inherit.value='__inherit__';inherit.dispatchEvent(new Event('change',{bubbles:true}));
   const final=get().pages.find(p=>p.id==='work').composition;
   window.__TA_STUDIO__.navigate('styles','index-root');
   return {changed,reference,override,reset:final.appearance?.background,
     inherited:document.querySelector('[data-style-prop="background"]')?.value};
 })()`);
 if(styleEditing.error||styleEditing.changed!=='grey-100'||styleEditing.reference!=='index-root'||
    styleEditing.override!=='black'||styleEditing.reset!==undefined||styleEditing.inherited!=='transparent')
   throw Error('M13 Studio inheritance / local override reset failed: '+JSON.stringify(styleEditing));
 console.log('M13_STYLES_OK shared Card styles, local overrides and inherited reset in Studio');
 // M14: draft record compositions edit in isolation and new records use collection slot defaults.
 const recordComposition=await evaluate(`(()=>{
   const app=window.__TA_STUDIO__;
   app.navigate('record',{collection:'posts',record:'post-four'});
   const initial=app.getData().collections.find(c=>c.id==='posts').records.find(r=>r.id==='post-four');
   const hasDesignMode=!!document.querySelector('[data-act="mode"][data-mode="design"]');
   document.querySelector('[data-act="mode"][data-mode="design"]')?.click();
   const isolatedRoot=!!document.querySelector('#workbody [data-node-id="record-post-four-root"]');
   const hasNavInDesign=!!document.querySelector('#workbody nav.card-nav');
   document.querySelector('[data-act="mode"][data-mode="preview"]')?.click();
   const fullNav=!!document.querySelector('#workbody nav.card-nav');
   const fullFooter=!!document.querySelector('#workbody footer.card-footer');
   app.navigate('collection','projects');
   document.querySelector('[data-act="new-record"]')?.click();
   const created=app.getData().collections.find(c=>c.id==='projects').records[0];
   const hasNewDesign=!!document.querySelector('[data-act="mode"][data-mode="design"]');
   return {hasDesignMode,isolatedRoot,hasNavInDesign,fullNav,fullFooter,
     draft:initial.status,created:created.id,createdTemplate:created.template,
     createdHasRoot:created.composition?.type==='card',
     createdStatus:created.status,hasNewDesign};
 })()`);
 if(!recordComposition.hasDesignMode||!recordComposition.isolatedRoot||recordComposition.hasNavInDesign||
    !recordComposition.fullNav||!recordComposition.fullFooter||recordComposition.draft!=='Draft'||
    recordComposition.createdTemplate!=='record-project-layout'||!recordComposition.createdHasRoot||
    recordComposition.createdStatus!=='Draft'||!recordComposition.hasNewDesign)
   throw Error('M14 record composition Studio integration failed: '+JSON.stringify(recordComposition));
 console.log('M14_RECORDS_OK isolated draft record editor, assembled preview and independent new project root');
 // M15: the converted Balkan House Record uses a contextual asset gallery.
 const assetQueryEditing=await evaluate(`(()=>{
   const app=window.__TA_STUDIO__;
   app.navigate('record',{collection:'projects',record:'p-balkan'});
   document.querySelector('[data-act="mode"][data-mode="design"]')?.click();
   const query=document.querySelector('#workbody [data-node-id="balkan-highlights-query"]');
   const baselineImage=!!document.querySelector('#workbody img[src="/assets/placeholder/house.svg"]');
   document.querySelector('[data-act="select-node"][data-id="balkan-highlights-query"]')?.click();
   const field=document.querySelector('[data-asset-filter-index="1"][data-asset-filter-key="value"]');
   const filterControls=!!field&&!!document.querySelector('[data-node-prop="source.sort"]');
   if(!field)return {error:'M15 gallery predicate inspector missing',baselineImage,query:!!query};
   field.value='Systems';field.dispatchEvent(new Event('change',{bubbles:true}));
   const edited=app.getData().collections.find(c=>c.id==='projects').records.find(r=>r.id==='p-balkan').composition.children.at(-1).source.where[1].value;
   const empty=!!document.querySelector('#workbody .item-placeholder');
   const restore=document.querySelector('[data-asset-filter-index="1"][data-asset-filter-key="value"]');
   restore.value='Architecture';restore.dispatchEvent(new Event('change',{bubbles:true}));
   const restored=!!document.querySelector('#workbody img[src="/assets/placeholder/house.svg"]');
   const current=app.getData().collections.find(c=>c.id==='projects').records.find(r=>r.id==='p-balkan').composition.children.at(-1).source.where[1].value;
   return {query:!!query,baselineImage,filterControls,edited,empty,restored,current};
 })()`);
 if(assetQueryEditing.error||!assetQueryEditing.query||!assetQueryEditing.baselineImage||
    !assetQueryEditing.filterControls||assetQueryEditing.edited!=='Systems'||
    !assetQueryEditing.empty||!assetQueryEditing.restored||assetQueryEditing.current!=='Architecture')
   throw Error('M15 contextual Asset Gallery editor failed: '+JSON.stringify(assetQueryEditing));
 console.log('M15_ASSET_QUERIES_OK record context, AND predicate editing and gallery refresh');

 // M16: demo-wide compositions, context-aware insertion, safe drafts and media usage.
 const authoringPolish=await evaluate(`(()=>{
   const app=window.__TA_STUDIO__;
   const data=app.getData();
   const migrated=data.pages.every(p=>p.composition&&p.blocks.length===0)&&
     data.collections.every(c=>c.records.every(r=>r.composition));
   app.navigate('page','home');
   const select=document.querySelector('[data-act="select-node"][data-id="m6-hero-image"]');
   select?.click();
   const add=document.querySelector('#quickAdd');
   const quickAddVisible=!!add&&getComputedStyle(add).display!=='none';
   add?.click();
   const contextual=document.querySelector('#modalHost')?.textContent?.includes('Inside m6-hero');
   document.querySelector('[data-act="modal-close"]')?.click();
   app.navigate('page','home');
   document.querySelector('[data-act="duplicate-page"]')?.click();
   const page=app.getData().pages.at(-1),source=app.getData().pages.find(p=>p.id==='home');
   const pageSafe=page?.status==='Draft'&&page?.id!==source?.id&&
      page?.composition?.id!==source?.composition?.id&&page?.slug!==source?.slug;
   app.navigate('record',{collection:'projects',record:'p-facade'});
   document.querySelector('[data-act="duplicate-record"]')?.click();
   const copies=app.getData().collections.find(c=>c.id==='projects').records;
   const rec=copies[0],origin=copies.find(r=>r.id==='p-facade');
   const recordSafe=rec?.status==='Draft'&&rec?.id!==origin?.id&&
      rec?.composition?.id!==origin?.composition?.id&&rec?.slug!==origin?.slug&&rec?.projectCode==='';
   app.navigate('assets','house');
   const usedBy=!!document.querySelector('#inspectBody')?.textContent.includes('Balkan House');
   const deletionBlocked=!!document.querySelector('[data-act="delete-asset"]')?.disabled;
   app.navigate('dashboard');
   const built=document.querySelectorAll('#workbody .stat')[1]?.querySelector('b')?.textContent;
   return {migrated,quickAddVisible,contextual,pageSafe,recordSafe,usedBy,deletionBlocked,built};
 })()`);
 if(Object.entries(authoringPolish).some(([key,value])=>key==='built'?value!=='10':!value))
   throw Error('M16 authoring polish failed: '+JSON.stringify(authoringPolish));
 console.log('M16_AUTHORING_OK demo compositions, contextual add, safe drafts, asset dependencies and route count');
 // M9: verify the actual site-wide contact editor, typed URL guard, and CTA.
 const configured=await evaluate(`(()=>{
   window.__TA_STUDIO__.navigate('dashboard');
   const input=document.querySelector('[data-site-contact="bookingUrl"]');
   if(!input)return {error:'Booking input missing'};
   input.value='https://meet.example.test/intro';
   input.dispatchEvent(new Event('change',{bubbles:true}));
   window.__TA_STUDIO__.navigate('page','home');
   return {value:window.__TA_STUDIO__.getData().site.contact.bookingUrl,
     active:!!document.querySelector('#workbody a[href="https://meet.example.test/intro"]')};
 })()`);
 if(configured.value!=='https://meet.example.test/intro'||!configured.active)
   throw Error('Configured 15-minute CTA was not activated: '+JSON.stringify(configured));
 const contactInvalid=await evaluate(`(()=>{
   window.__TA_STUDIO__.navigate('dashboard');
   window.__M9_contactError='';
   window.alert=value=>window.__M9_contactError=String(value);
   const input=document.querySelector('[data-site-contact="bookingUrl"]');
   input.value='javascript:alert(1)';
   input.dispatchEvent(new Event('change',{bubbles:true}));
   return {error:window.__M9_contactError,
      value:window.__TA_STUDIO__.getData().site.contact.bookingUrl};
 })()`);
 if(!contactInvalid.error?.includes('Booking URL')||contactInvalid.value!=='https://meet.example.test/intro')
   throw Error('Invalid booking URL bypassed Studio validation: '+JSON.stringify(contactInvalid));
 await evaluate(`(()=>{
   const input=document.querySelector('[data-site-contact="bookingUrl"]');
   input.value='';input.dispatchEvent(new Event('change',{bubbles:true}));
   window.__TA_STUDIO__.navigate('page','home');return true;
 })()`);
 const pending=await evaluate(`(()=>({
   text:document.querySelector('#workbody .is-unavailable')?.textContent||'',
   links:document.querySelectorAll('#workbody a[href="https://meet.example.test/intro"]').length
 }))()`);
 if(!pending.text.includes('booking link pending')||pending.links!==0)
   throw Error('Empty booking URL should not be clickable: '+JSON.stringify(pending));
 console.log('M9_CONTACT_OK site-wide verified booking link activates CTA, invalid URLs rejected, unset CTA inert');
 // Asset/project matching remains simple property editing — no relation engine.
 const codeEdit=await evaluate(`(()=>{
   window.__TA_STUDIO__.navigate('assets','house');
   const code=document.querySelector('#inspector [data-asset-project-code="house"]');
   if(!code)return {error:'Asset project-code field unavailable'};
   code.value='4424';code.dispatchEvent(new Event('change',{bubbles:true}));
   window.__TA_STUDIO__.navigate('record',{collection:'projects',record:'p-balkan'});
   document.querySelector('[data-act="mode"][data-mode="fields"]')?.click();
   const project=document.querySelector('[data-record-field="projectCode"]');
   if(!project)return {error:'Project record code field unavailable'};
   project.value='4424';project.dispatchEvent(new Event('change',{bubbles:true}));
   return {asset:window.__TA_STUDIO__.getData().assets.find(x=>x.id==='house').properties.projectCode,
     project:window.__TA_STUDIO__.getData().collections.find(c=>c.id==='projects').records.find(r=>r.id==='p-balkan').projectCode};
 })()`);
 if(codeEdit.asset!=='4424'||codeEdit.project!=='4424')
   throw Error('Project and asset code editing failed: '+JSON.stringify(codeEdit));
 const duplicateCode=await evaluate(`(()=>{
   window.__TA_STUDIO__.navigate('record',{collection:'projects',record:'p-facade'});
   document.querySelector('[data-act="mode"][data-mode="fields"]')?.click();
   window.__M9CodeError='';window.alert=value=>window.__M9CodeError=String(value);
   const code=document.querySelector('[data-record-field="projectCode"]');
   const original=code.value;
   code.value='4424';code.dispatchEvent(new Event('change',{bubbles:true}));
   return {message:window.__M9CodeError,original,
     value:window.__TA_STUDIO__.getData().collections.find(c=>c.id==='projects').records.find(r=>r.id==='p-facade').projectCode};
 })()`);
 if(!duplicateCode.message?.includes('Duplicate projectCode')||duplicateCode.value!==duplicateCode.original)
   throw Error('Duplicate project code bypassed validation: '+JSON.stringify(duplicateCode));
 console.log('M9_PROJECT_CODE_OK typed asset/record matching and duplicate-code rejection');
 // Upload a REAL PNG as an in-place replacement; covers still reference 'house'.
 const replacementStart=await evaluate(`(()=>{
   window.__TA_STUDIO__.navigate('assets','house');
   const before=window.__TA_STUDIO__.getData().assets.length;
   const base64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/T3sAAAAASUVORK5CYII=';
   const raw=atob(base64),buf=Uint8Array.from(raw,c=>c.charCodeAt(0));
   const transfer=new DataTransfer();
   transfer.items.add(new File([buf],'actual.png',{type:'image/png'}));
   const input=document.querySelector('#replaceImageFile');
   if(!input)return {error:'Replace image file picker missing'};
   input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
   return {started:true,before};
 })()`);
 if(!replacementStart.started)throw Error('Image replacement not started: '+JSON.stringify(replacementStart));
 let replacement;
 for(let i=0;i<80;i++){
   replacement=await evaluate(`(()=>{
     const d=window.__TA_STUDIO__.getData(),a=d.assets.find(x=>x.id==='house');
     return {src:a?.src,placeholder:a?.placeholder,projectCode:a?.properties?.projectCode,
       count:d.assets.length,status:document.querySelector('#saved')?.textContent,
       cover:d.collections.find(c=>c.id==='projects').records.find(r=>r.id==='p-balkan').cover};
   })()`);
   if(replacement.src?.startsWith('/assets/uploads/')&&replacement.status==='JSON FILE · SAVED')break;
   await sleep(100);
 }
 if(!replacement.src?.startsWith('/assets/uploads/')||replacement.placeholder!==false||
    replacement.projectCode!=='4424'||replacement.count!==replacementStart.before||
    replacement.cover!=='house'||replacement.status!=='JSON FILE · SAVED')
   throw Error('In-place media replacement broke references: '+JSON.stringify(replacement));
 const replacementMedia=await fetch('http://127.0.0.1:'+port+replacement.src);
 if(replacementMedia.status!==200)throw Error('Replaced image binary is not served: '+replacementMedia.status);
 console.log('M9_MEDIA_REPLACEMENT_OK safe PNG upload, same asset ID, cover and project code retained');

 await evaluate("window.__TA_STUDIO__.navigate('page','home'); true");
 const before=await evaluate("(()=>{const pane=document.querySelector('#structurePane');const app=document.querySelector('#studioApp');return {open:app.classList.contains('structure-open'),rows:pane.querySelectorAll('.structure-select').length,hasHome:!!pane.querySelector('[data-id=\"m6-hero\"]'),columns:getComputedStyle(app).gridTemplateColumns.split(' ').length};})()");
 if(!before.open||before.rows<20||!before.hasHome||before.columns!==4)throw Error('Four-panel tree not rendered: '+JSON.stringify(before));
 const treeSelect=await evaluate("(()=>{const x=document.querySelector('#structurePane [data-act=\"select-node\"][data-id=\"m6-hero\"]');if(!x)return false;x.click();return true;})()");
 if(!treeSelect)throw Error('Hero Card tree selection failed');
 const selected=await evaluate("(()=>{const hero=document.querySelector('.editor-shell [data-node-id=\"m6-hero\"]');return {chosen:!!hero?.classList.contains('chosen'),outline:hero?getComputedStyle(hero).outlineColor:'none',path:document.querySelector('.selection-path')?.textContent,active:document.querySelector('#structurePane .structure-row.is-active [data-id=\"m6-hero\"]')!==null};})()");
 if(!selected.chosen||!selected.active||!selected.path?.includes('hero')||!selected.outline.includes('82, 92, 187'))throw Error('Card selection does not synchronize: '+JSON.stringify(selected));
 const clickCanvas=await evaluate("(()=>{const el=document.querySelector('.editor-shell [data-node-id=\"m6-hero-title\"]');if(!el)return false;el.click();return true;})()");
 if(!clickCanvas)throw Error('Canvas Item missing');
 const selectedItem=await evaluate("(()=>({active:!!document.querySelector('#structurePane .structure-row.is-active [data-id=\"m6-hero-title\"]'),chosen:!!document.querySelector('.editor-shell [data-node-id=\"m6-hero-title\"].chosen'),path:document.querySelector('.selection-path')?.textContent}))()");
 if(!selectedItem.active||!selectedItem.chosen||!selectedItem.path?.includes('hero'))throw Error('Canvas/tree selection diverged: '+JSON.stringify(selectedItem));

 const picker=await evaluate('(()=>({cells:document.querySelectorAll(".area-grid-cell").length,inputs:document.querySelectorAll("[data-area-value]").length}))()');
 if(picker.cells!==8||picker.inputs!==4)throw Error('Atomic grid picker missing: '+JSON.stringify(picker));
 // Hand-edited grid coordinates preview non-blocking overlap feedback immediately.
 // Restore original coordinates without Apply so this introduces no history entries.
 const collision=await evaluate(`(()=>{
   const set=(key,value)=>{const input=document.querySelector('[data-area-value='+key+']');input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));};
   if(document.querySelector('#areaOverlap')?.textContent.trim())return {error:'Unexpected initial overlap'};
   set('y1',1);
   const warning=document.querySelector('#areaOverlap')?.textContent||'';
   const overlap=document.querySelectorAll('.area-grid-cell.is-overlap').length;
   set('y1',2);
   return {warning,overlap,cleared:!document.querySelector('#areaOverlap')?.textContent.trim()};
 })()`);
 if(!collision.warning.includes('m6-hero-eyebrow')||collision.overlap!==1||!collision.cleared)
   throw Error('Live overlap diagnostics failed: '+JSON.stringify(collision));
 console.log('M8_OVERLAP_OK typed area warning, occupied cell preview and clearing');
 const invalid=await evaluate('(()=>{document.querySelector("[data-area-value=x1]").value="99";document.querySelector("[data-act=apply-area]").click();return document.querySelector("#areaError")?.textContent.includes("Invalid rectangle")})()');
 if(!invalid)throw Error('Invalid atomic rectangle was accepted');
 const formChange=await evaluate('(()=>{for(const [key,value] of Object.entries({x1:1,y1:3,x2:2,y2:5}))document.querySelector("[data-area-value="+key+"]").value=String(value);document.querySelector("[data-act=apply-area]").click();return true})()');
 if(!formChange)throw Error('Area numeric form unavailable');
 await sleep(700);
 const titleIn=data=>data.pages.find(p=>p.id==='home').composition.children.find(b=>b.id==='m6-hero').children.find(b=>b.id==='m6-hero-copy').children.find(b=>b.id==='m6-hero-title');
 const changed=titleIn(JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8')));
 if(changed.area.y1!==3||changed.area.y2!==5)throw Error('Atomic area Apply did not persist full rectangle');
 await evaluate('(()=>{for(const [key,value] of Object.entries({x1:1,y1:2,x2:2,y2:6}))document.querySelector("[data-area-value="+key+"]").value=String(value);document.querySelector("[data-act=apply-area]").click();return true})()');
 await sleep(600);
 const again=titleIn(JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8')));
 if(again.area.y1!==2||again.area.y2!==6)throw Error('Atomic rectangle restore failed');

 const pickerPoints=await evaluate('(()=>{const grid=document.querySelector("#areaGrid");grid.scrollIntoView({block:"center"});const point=y=>{const cell=grid.querySelector("[data-area-x=\\"1\\"][data-area-y=\\""+y+"\\"]");if(!cell)return null;const r=cell.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}};return {a:point(3),b:point(4)}})()');
 if(!pickerPoints?.a||!pickerPoints?.b)throw Error('Grid picker cell coordinates missing');
 await command('Input.dispatchMouseEvent',{type:'mouseMoved',...pickerPoints.a});
 await command('Input.dispatchMouseEvent',{type:'mousePressed',...pickerPoints.a,button:'left',clickCount:1});
 await command('Input.dispatchMouseEvent',{type:'mouseMoved',...pickerPoints.b,buttons:1});
 await command('Input.dispatchMouseEvent',{type:'mouseReleased',...pickerPoints.b,button:'left',clickCount:1});
 await sleep(650);
 const pickerSaved=titleIn(JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8')));
 if(pickerSaved.area.y1!==3||pickerSaved.area.y2!==5)throw Error('Mini picker pointer drag did not commit a rectangle');
 await evaluate('(()=>{for(const [key,value] of Object.entries({x1:1,y1:2,x2:2,y2:6}))document.querySelector("[data-area-value="+key+"]").value=String(value);document.querySelector("[data-act=apply-area]").click();return true})()');
 await sleep(650);
 const reparented=await evaluate('(()=>{const source=document.querySelector(".structure-handle[data-drag-id=m6-hero-title]"),row=document.querySelector(".structure-row[data-row-id=m6-hero-graphic]");if(!source||!row)return false;row.scrollIntoView({block:"center"});const r=row.getBoundingClientRect(),dt=new DataTransfer();source.dispatchEvent(new DragEvent("dragstart",{bubbles:true,cancelable:true,dataTransfer:dt}));row.dispatchEvent(new DragEvent("dragover",{bubbles:true,cancelable:true,dataTransfer:dt,clientY:r.top+r.height/2}));row.dispatchEvent(new DragEvent("drop",{bubbles:true,cancelable:true,dataTransfer:dt,clientY:r.top+r.height/2}));return true})()');
 if(!reparented)throw Error('Tree drag-and-drop controls missing');
 await sleep(750);
 const dnd=JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8'));
 const hero=dnd.pages.find(p=>p.id==='home').composition.children.find(b=>b.id==='m6-hero');
 if(!hero.children.find(x=>x.id==='m6-hero-graphic').children.some(x=>x.id==='m6-hero-title'))throw Error('Tree drop did not reparent authored Item');
 const undo=await evaluate('(()=>{const el=document.querySelector("[data-act=undo-structure]");if(!el||el.disabled)return false;el.click();return true})()');
 if(!undo)throw Error('Structure Undo unavailable');
 await sleep(650);
 const restored=JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8'));
 if(!restored.pages.find(p=>p.id==='home').composition.children.find(b=>b.id==='m6-hero').children.find(x=>x.id==='m6-hero-copy').children.some(x=>x.id==='m6-hero-title'))throw Error('Structure Undo failed to restore source parent');
 console.log('M8_TREE_AREA_OK atomic four-value Apply, validation, reparent and Undo');
 // Traverse earlier rectangle edits: reparent undo restored the previous document.
 // Allow an actual atomic file write to finish: fixed sleeps race on large trees.
 const waitForSaved=async()=>{
   for(let i=0;i<70;i++){
     const status=await evaluate("document.querySelector('#saved')?.textContent||''");
     if(status==='JSON FILE · SAVED')return;
     if(status.includes('UNSAVED CHANGES'))throw Error('Save blocked during browser QA: '+status);
     await sleep(100);
   }
   throw Error('Timed out waiting for local editor save');
 };
 const invoke=async name=>{
   const ok=await evaluate('(()=>{const e=document.querySelector("[data-act='+name+']");if(!e||e.disabled)return false;e.click();return true})()');
   if(!ok)throw Error('History button unavailable: '+name);
   await waitForSaved();
   return titleIn(JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8')));
 };
 const older=await invoke('undo-structure');
 if(older.area.y1!==3||older.area.y2!==5)throw Error('First history Undo did not restore the previous area');
 const oldest=await invoke('undo-structure');
 if(oldest.area.y1!==2||oldest.area.y2!==6)throw Error('Second history Undo did not restore the older area');
 const newer=await invoke('redo-structure');
 if(newer.area.y1!==3||newer.area.y2!==5)throw Error('First Redo did not restore the newer area');
 const newest=await invoke('redo-structure');
 if(newest.area.y1!==2||newest.area.y2!==6)throw Error('Second Redo did not return to current area');
 // The previously undone Card reparent is still redoable at this point.
 const pendingRedo=await evaluate('!document.querySelector("[data-act=redo-structure]").disabled');
 if(!pendingRedo)throw Error('The undone tree move should still be available to Redo');
 await invoke('redo-structure');
 const redoMove=JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8'));
 if(!redoMove.pages.find(p=>p.id==='home').composition.children.find(b=>b.id==='m6-hero')
   .children.find(x=>x.id==='m6-hero-graphic').children.some(x=>x.id==='m6-hero-title'))
   throw Error('Redo of the earlier tree move failed');
 await invoke('undo-structure');
 await evaluate('(()=>{for(const [key,value] of Object.entries({x1:1,y1:4,x2:2,y2:6}))document.querySelector("[data-area-value="+key+"]").value=String(value);document.querySelector("[data-act=apply-area]").click();return true})()');
 await sleep(500);
 const noRedo=await evaluate('document.querySelector("[data-act=redo-structure]").disabled');
 if(!noRedo)throw Error('New atomic edit must invalidate the abandoned Redo path');
 const afterNew=titleIn(JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8')));
 if(afterNew.area.y1!==4)throw Error('New edited area was not saved');
 await invoke('undo-structure'); // Restore the prior document for subsequent checks.
 console.log('M8_HISTORY_OK multi-step area Undo/Redo, tree Redo, new-edit branch invalidation');
 // Duplicate and delete must each be a single undoable transaction, without
 // overlapping the original Card area or creating a different canonical ID.
 const originalCount=restored.pages.find(p=>p.id==='home').composition.children.find(b=>b.id==='m6-hero')
   .children.find(b=>b.id==='m6-hero-copy').children.length;
 const duplicated=await evaluate('(()=>{const b=document.querySelector("[data-act=duplicate-node]");if(!b)return false;b.click();return true})()');
 if(!duplicated)throw Error('Duplicate action missing');
 await sleep(500);
 const afterDuplicate=JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8'));
 const copyChildren=afterDuplicate.pages.find(p=>p.id==='home').composition.children.find(b=>b.id==='m6-hero')
   .children.find(b=>b.id==='m6-hero-copy').children;
 if(copyChildren.length!==originalCount+1)throw Error('Duplicate did not create a new child');
 const copies=copyChildren.filter(x=>x.type==='text'&&x.text===copyChildren.find(n=>n.id==='m6-hero-title').text);
 if(copies.length<2)throw Error('Duplicate text content not preserved');
 const a=copies[0].area,b=copies[1].area;
 if(Math.max(a.x1,b.x1)<Math.min(a.x2,b.x2)&&Math.max(a.y1,b.y1)<Math.min(a.y2,b.y2))
   throw Error('Duplicated child overlaps its source cell area');
 await invoke('undo-structure');
 const afterUndoDuplicate=JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8'));
 if(afterUndoDuplicate.pages.find(p=>p.id==='home').composition.children.find(b=>b.id==='m6-hero')
 .children.find(b=>b.id==='m6-hero-copy').children.length!==originalCount)throw Error('Duplicate Undo did not remove copied child');
 await invoke('redo-structure');
 await evaluate('window.confirm=()=>true');
 const deleted=await evaluate('(()=>{const b=document.querySelector("[data-act=delete-node]");if(!b)return false;b.click();return true})()');
 if(!deleted)throw Error('Delete action missing');
 await sleep(450);
 const afterDelete=JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8'));
 if(afterDelete.pages.find(p=>p.id==='home').composition.children.find(b=>b.id==='m6-hero')
 .children.find(b=>b.id==='m6-hero-copy').children.length!==originalCount)throw Error('Delete did not remove copied child');
 await invoke('undo-structure');
 await invoke('undo-structure'); // back to one original Title
 console.log('M8_HISTORY_STRUCTURE_OK duplicate/undo/redo/delete/undo and no overlapping Card areas');



 // Keyboard-only authoring must produce the same immutable tree transaction
 // as pointer drag, and remain undoable. Validate against disposable site.json.
 const keyboardFocus=await evaluate('(()=>{const n=document.querySelector("#structureTree .structure-select[data-id=m6-hero-graphic]");if(!n)return false;n.click();document.querySelector("#structureTree .structure-select[data-id=m6-hero-graphic]")?.focus();return document.activeElement?.dataset.id==="m6-hero-graphic"})()');
 if(!keyboardFocus)throw Error('Card row could not receive keyboard focus');
 const keyboardMove=async(key,code,vkey)=>{
   await command('Input.dispatchKeyEvent',{type:'keyDown',key,code,modifiers:1,windowsVirtualKeyCode:vkey,nativeVirtualKeyCode:vkey});
   await command('Input.dispatchKeyEvent',{type:'keyUp',key,code,modifiers:1,windowsVirtualKeyCode:vkey,nativeVirtualKeyCode:vkey});
   await sleep(440);
 };
 await keyboardMove('ArrowUp','ArrowUp',38);
 const movedUp=JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8'))
   .pages.find(p=>p.id==='home').composition.children.find(b=>b.id==='m6-hero').children.map(b=>b.id);
 if(movedUp[0]!=='m6-hero-graphic')throw Error('Alt+ArrowUp did not reorder Card');
 const focusAfter=await evaluate('document.activeElement?.dataset.id');
 if(focusAfter!=='m6-hero-graphic')throw Error('Keyboard move lost focus');
 await invoke('undo-structure');
 const previous=JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8'))
   .pages.find(p=>p.id==='home').composition.children.find(b=>b.id==='m6-hero').children.map(b=>b.id);
 if(previous[1]!=='m6-hero-graphic')throw Error('Keyboard reorder Undo failed');
 const toolbar=await evaluate('(()=>{document.querySelector("#structureTree .structure-select[data-id=m6-hero-graphic]")?.click();const n=document.querySelector(\'#structurePane [data-act="tree-move"][data-move="indent"]\');if(!n||n.disabled)return false;n.click();return true})()');
 if(!toolbar)throw Error('Tree Move toolbar cannot indent into preceding Card');
 await sleep(480);
 const afterIndent=JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8'))
   .pages.find(p=>p.id==='home').composition.children.find(b=>b.id==='m6-hero');
 if(!afterIndent.children.find(b=>b.id==='m6-hero-copy').children.some(b=>b.id==='m6-hero-graphic'))
   throw Error('Toolbar indent did not nest Card into previous sibling');
 await invoke('undo-structure');
 const undoIndent=JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8'))
   .pages.find(p=>p.id==='home').composition.children.find(b=>b.id==='m6-hero').children.map(b=>b.id);
 if(undoIndent[1]!=='m6-hero-graphic')throw Error('Toolbar indent was not undoable');
 console.log('M8_KEYBOARD_MOVE_OK Alt+ArrowUp, retained focus, toolbar indent and history Undo');
 const fold=await evaluate("(()=>{const el=document.querySelector('#structurePane [data-act=\"structure-fold\"][data-id=\"m6-hero\"]');if(!el)return false;el.click();return !document.querySelector('#structurePane [data-id=\"m6-hero-title\"]');})()");
 if(!fold)throw Error('Structure collapsing failed');
 const unfold=await evaluate("(()=>{document.querySelector('#structurePane [data-act=\"structure-fold\"][data-id=\"m6-hero\"]').click();return !!document.querySelector('#structurePane [data-id=\"m6-hero-title\"]');})()");
 if(!unfold)throw Error('Structure expanding failed');
 const hidden=await evaluate("(()=>{document.querySelector('#structureToggle').click();return !document.querySelector('#studioApp').classList.contains('structure-open');})()");
 const shown=await evaluate("(()=>{document.querySelector('#structureToggle').click();return document.querySelector('#studioApp').classList.contains('structure-open');})()");
 if(!hidden||!shown)throw Error('Structure pane toggle failed');
 // Verify desktop composition and keyboard-visible Structure tree at both QA widths.
 await command('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
 const compact=await evaluate(`(()=>{
   const ids=['#structurePane','.workspace','.inspector'];
   const widths=ids.map(s=>document.querySelector(s)?.getBoundingClientRect().width||0);
   const tree=document.querySelector('#structureTree');
   return {viewport:innerWidth,widths,treeRole:tree?.getAttribute('role'),
     treeItems:tree?.querySelectorAll('[role="treeitem"]').length,
     badLevels:[...tree?.querySelectorAll('[role="treeitem"]')||[]].filter(x=>!Number(x.getAttribute('aria-level'))).length};
 })()`);
 if(compact.viewport!==1280||compact.widths.some(w=>w<120)||compact.treeRole!=='tree'||compact.treeItems<20||compact.badLevels)
   throw Error('Structure desktop QA failed at 1280×800: '+JSON.stringify(compact));
 await command('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
 const spacious=await evaluate(`(()=>({viewport:innerWidth,
   widths:['#structurePane','.workspace','.inspector'].map(s=>document.querySelector(s)?.getBoundingClientRect().width||0),
   activeItems:document.querySelectorAll('#structureTree [aria-selected="true"]').length
 }))()`);
 if(spacious.viewport!==1600||spacious.widths.some(w=>w<120)||spacious.activeItems!==1)
   throw Error('Structure desktop QA failed at 1600×1000: '+JSON.stringify(spacious));
 await command('Emulation.clearDeviceMetricsOverride');
 console.log('M8_VIEWPORT_A11Y_OK 1280×800, 1600×1000, tree roles/levels/selection');
 // Exercise 320 Items + 13 nested Cards in a real Chromium editor without screenshots.
 await evaluate("window.__TA_STUDIO__.navigate('page','studio');true");
 const stress=await evaluate(`(()=>({
   count:document.querySelectorAll('#structureTree [role="treeitem"]').length,
   leaf:!!document.querySelector('#structureTree .structure-select[data-id="stress-leaf"]'),
   rendered:!!document.querySelector('.editor-shell [data-node-id="stress-leaf"]'),
   deepLevel:document.querySelector('#structureTree .structure-select[data-id="stress-leaf"]')?.getAttribute('aria-level')
 }))()`);
 if(stress.count<330||!stress.leaf||!stress.rendered||Number(stress.deepLevel)<14)
   throw Error('Large/deep Structure rendering failed: '+JSON.stringify(stress));
 const deepFocus=await evaluate(`(()=>{
   const leaf=document.querySelector('#structureTree .structure-select[data-id="stress-leaf"]');
   leaf.click();
   const selected=document.querySelector('#structureTree .structure-select[data-id="stress-leaf"]');
   selected?.focus();
   return {focused:document.activeElement?.dataset.id,selected:document.querySelectorAll('#structureTree [aria-selected="true"]').length,
     preview:!!document.querySelector('.editor-shell [data-node-id="stress-leaf"].chosen')};
 })()`);
 if(deepFocus.focused!=='stress-leaf'||deepFocus.selected!==1||!deepFocus.preview)
   throw Error('Deep Structure selection/focus divergence: '+JSON.stringify(deepFocus));
 console.log('M8_LARGE_TREE_OK 320 synthetic Items, deep renderer, selection and ARIA focus');
 // Invalid JSON must not mutate Studio memory or reach disk, even through a scoped edit.
 const rejectedJSON=await evaluate(`(()=>{
   window.__TA_STUDIO__.navigate('page','home');
   document.querySelector('[data-act="mode"][data-mode="json"]').click();
   const source=window.__TA_STUDIO__.getData();
   const before=JSON.stringify(source);
   const textarea=document.querySelector('#jsonEditor'),editing=JSON.parse(textarea.value);
   editing.composition.children[1].id=editing.composition.children[0].id;
   textarea.value=JSON.stringify(editing);
   document.querySelector('[data-act="apply-json"]').click();
   return {message:document.querySelector('#jsonNotice')?.textContent,
      unchanged:JSON.stringify(window.__TA_STUDIO__.getData())===before};
 })()`);
 if(!rejectedJSON.unchanged||!rejectedJSON.message?.includes('Duplicate node ID'))
   throw Error('Invalid scoped JSON poisoned editor state: '+JSON.stringify(rejectedJSON));
 await sleep(250);
 const rejectedDisk=JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8'));
 if(rejectedDisk.pages.find(p=>p.id==='home').composition.children[1].id===rejectedDisk.pages.find(p=>p.id==='home').composition.children[0].id)
   throw Error('Invalid scoped JSON was written to disk');
 console.log('M8_JSON_TRANSACTION_OK invalid scoped JSON retains editor state and on-disk tree');
 // Full JSON imports must use the same validated transaction boundary as scoped edits.
 const invalidImport=await evaluate(`(()=>{
   window.__M8_ImportAlert='';window.alert=x=>{window.__M8_ImportAlert=String(x)};
   window.__M8_beforeImport=JSON.stringify(window.__TA_STUDIO__.getData());
   const upload=document.querySelector('#importFile'),transfer=new DataTransfer();
   const data=window.__TA_STUDIO__.getData();data.version=99;
   transfer.items.add(new File([JSON.stringify(data)],'invalid.json',{type:'application/json'}));
   upload.files=transfer.files;upload.dispatchEvent(new Event('change',{bubbles:true}));
   return {started:true};
 })()`);
 let badImportState;
 for(let i=0;i<40;i++){
   badImportState=await evaluate(`(()=>({alert:window.__M8_ImportAlert,
     unchanged:JSON.stringify(window.__TA_STUDIO__.getData())===window.__M8_beforeImport}))()`);
   if(badImportState.alert)break;await sleep(100);
 }
 if(!badImportState.alert?.includes('Unsupported data version')||!badImportState.unchanged)
   throw Error('Rejected full JSON import mutated memory: '+JSON.stringify(badImportState));
 const validImport=await evaluate(`(()=>{
   window.confirm=()=>true;
   const data=window.__TA_STUDIO__.getData();data.site.name='M8 verified imported file';
   const input=document.querySelector('#importFile'),transfer=new DataTransfer();
   transfer.items.add(new File([JSON.stringify(data)],'valid.json',{type:'application/json'}));
   input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
   return {started:true};
 })()`);
 let accepted=false;
 for(let i=0;i<50;i++){
   const value=JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8')).site.name;
   if(value==='M8 verified imported file'){accepted=true;break}await sleep(100);
 }
 if(!accepted)throw Error('Valid JSON import did not commit atomically');
 console.log('M8_FULL_IMPORT_OK rejected invalid file without mutation; validated full import saved');

 // An invalid uploaded image is rejected safely without allocating an asset or blocking healthy JSON.
 const uploadFailure=await evaluate(`(()=>{
   window.__M8_uploadError='';
   window.alert=text=>{window.__M8_uploadError=String(text)};
   const box=document.querySelector('#imageFile'),transfer=new DataTransfer();
   transfer.items.add(new File(['not a real PNG'], 'broken.png',{type:'image/png'}));
   box.files=transfer.files;box.dispatchEvent(new Event('change',{bubbles:true}));
   return {requested:true,initialAssets:window.__TA_STUDIO__.getData().assets.length};
 })()`);
 let rejectedUpload;
 for(let i=0;i<40;i++){
   rejectedUpload=await evaluate(`(()=>({alert:window.__M8_uploadError,
      status:document.querySelector('#saved')?.textContent,
      assets:window.__TA_STUDIO__.getData().assets.length}))()`);
   if(rejectedUpload.alert)break;
   await sleep(100);
 }
 if(!rejectedUpload.alert?.includes('broken.png')||
    rejectedUpload.assets!==uploadFailure.initialAssets||
    rejectedUpload.status!=='UPLOAD COMPLETED WITH ERRORS')
   throw Error('Failed image upload altered library or hid error: '+JSON.stringify(rejectedUpload));
 console.log('M8_UPLOAD_REJECTION_OK corrupt upload rejected; local asset list unchanged');
 // A source-driven Card is authorable as a query configuration, but must not
 // offer child insertion. Its reused Card definition should open in isolation.
 const sourceCard=await evaluate(`(()=>{
   window.__TA_STUDIO__.navigate('page','home');
   const row=document.querySelector('#structureTree .structure-select[data-id="m6-project-query"]');
   if(!row)return {error:'No source Card in Structure'};
   row.click();
   return {childDisabled:document.querySelector('#treeAddChild')?.disabled,
     hiddenAdd:!document.querySelector('#inspectBody [data-act="show-blocks"][data-inside="yes"]'),
     sourceEditor:!!document.querySelector('#inspectBody [data-node-prop="source.collection"]'),
     componentEditor:!!document.querySelector('#inspectBody [data-act="edit-component"][data-id="project-tile"]')};
 })()`);
 if(!sourceCard.childDisabled||!sourceCard.hiddenAdd||!sourceCard.sourceEditor||!sourceCard.componentEditor)
   throw Error('Generated query Card can receive invalid authored children: '+JSON.stringify(sourceCard));
 const componentView=await evaluate(`(()=>{
   document.querySelector('#inspectBody [data-act="edit-component"][data-id="project-tile"]').click();
   return {breadcrumb:document.querySelector('#breadcrumbs')?.textContent,
     root:!!document.querySelector('#structureTree .structure-select[data-id="project-record-card"]')};
 })()`);
 if(!componentView.breadcrumb?.includes('Components')||!componentView.root)
   throw Error('Component definition not inspectable in isolation: '+JSON.stringify(componentView));
 const referenceCard=await evaluate(`(()=>{
   window.__TA_STUDIO__.navigate('template','project-detail');
   const row=document.querySelector('#structureTree .structure-select[data-id="b_acon1s"]');
   if(!row)return {error:'No referenced Card'};
   row.click();
   return {childDisabled:document.querySelector('#treeAddChild')?.disabled,
     hiddenAdd:!document.querySelector('#inspectBody [data-act="show-blocks"][data-inside="yes"]'),
     editDefinition:!!document.querySelector('#inspectBody [data-act="edit-component"][data-id="contact-cta"]')};
 })()`);
 if(!referenceCard.childDisabled||!referenceCard.hiddenAdd||!referenceCard.editDefinition)
   throw Error('Reusable reference Card inspection or child restrictions failed: '+JSON.stringify(referenceCard));
 console.log('M8_SOURCE_REFERENCE_OK queries and referenced Cards inspectable; hidden child insertion unavailable');
 await evaluate("window.__TA_STUDIO__.navigate('page','home');true");
 // Another browser tab (or a script) changes the file: Studio must refuse a
 // stale overwrite, keep local changes in memory and expose Export JSON recovery.
 const remoteSave=await evaluate(`(async()=>{
   const current=await fetch('/api/data',{cache:'no-store'});
   const tag=current.headers.get('etag'),external=await current.json();
   external.site.name='M8 external tab update';
   const result=await fetch('/api/data',{method:'PUT',headers:{
     'Content-Type':'application/json','If-Match':tag
   },body:JSON.stringify(external)});
   if(!result.ok)return {error:await result.text()};
   window.__TA_STUDIO__.navigate('page','home');
   document.querySelector('#structurePane [data-act="select-node"][data-id="m6-hero-title"]')?.click();
   const label=document.querySelector('[data-node-prop="label"]');
   if(!label)return {error:'Label field missing'};
   label.value='Local unsaved label';
   label.dispatchEvent(new Event('change',{bubbles:true}));
   return {externalSaved:true};
 })()`);
 if(!remoteSave.externalSaved)throw Error('Conflict simulation failed: '+JSON.stringify(remoteSave));
 await sleep(650);
 const conflictUi=await evaluate(`(()=>({
  message:document.querySelector('#saved')?.textContent,
  exportAvailable:!!document.querySelector('#exportBtn'),
  inMemory:window.__TA_STUDIO__.getData().pages.find(p=>p.id==='home').composition.children
    .find(b=>b.id==='m6-hero').children.find(b=>b.id==='m6-hero-copy').children
    .find(b=>b.id==='m6-hero-title').label
 }))()`);
 if(!conflictUi.message.includes('UNSAVED CHANGES')||!conflictUi.exportAvailable||conflictUi.inMemory!=='Local unsaved label')
   throw Error('Studio did not preserve an exportable unsaved edit: '+JSON.stringify(conflictUi));
 const disk=JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8'));
 const diskNode=titleIn(disk);
 if(disk.site.name!=='M8 external tab update'||diskNode.label==='Local unsaved label')
   throw Error('Conflict overwrote the external file');
 console.log('M8_SAVE_CONFLICT_OK revision mismatch, file preserved, local JSON export available');
 // A disconnected local backend must leave the unsaved edit exportable, with a
 // visible error (not just a hover tooltip), and must never invent a saved revision.
 // Recover using the explicit, confirm-gated reload from disk control,
 // retaining the beforeunload protection on normal browser navigation.
 const recoveryClick=await evaluate(`(()=>{
   const button=document.querySelector('#reloadBtn');
   if(!button||button.hidden)return false;
   window.confirm=()=>true;
   button.click();return true;
 })()`);
 if(!recoveryClick)throw Error('Recovery reload action missing');
 let loadedAgain=false;
 for(let i=0;i<90;i++){
   try{loadedAgain=await evaluate(`Boolean(window.__TA_STUDIO__&&document.querySelector('#saved')?.textContent==='JSON FILE · LOADED')`);}catch{}
   if(loadedAgain)break;await sleep(100);
 }
 if(!loadedAgain)throw Error('Unable to reload saved JSON after stale-tab recovery');
 const offline=await evaluate(`(()=>{
   window.__TA_STUDIO__.navigate('page','home');
   const originalFetch=window.fetch;
   window.fetch=(url,options)=>String(url)==='/api/data'&&options?.method==='PUT'
     ?Promise.reject(new TypeError('Simulated backend connection loss'))
     :originalFetch(url,options);
   document.querySelector('#structurePane [data-act="select-node"][data-id="m6-hero-title"]')?.click();
   const label=document.querySelector('[data-node-prop="label"]');
   if(!label)return {error:'No editable label'};
   label.value='Offline unsaved edit';
   label.dispatchEvent(new Event('change',{bubbles:true}));
   return {started:true};
 })()`);
 if(!offline.started)throw Error('Offline test could not edit Studio: '+JSON.stringify(offline));
 let offlineUI;
 for(let i=0;i<50;i++){
   offlineUI=await evaluate(`(()=>({
     status:document.querySelector('#saved')?.textContent,
     error:document.querySelector('#saveDetails')?.textContent,
     visible:!document.querySelector('#saveDetails')?.hidden,
     exported:!!document.querySelector('#exportBtn'),
     label:window.__TA_STUDIO__.getData().pages.find(p=>p.id==='home').composition.children
       .find(b=>b.id==='m6-hero').children.find(b=>b.id==='m6-hero-copy').children
       .find(b=>b.id==='m6-hero-title').label
   }))()`);
   if(offlineUI.status?.includes('UNSAVED CHANGES'))break;await sleep(100);
 }
 if(!offlineUI.status?.includes('UNSAVED CHANGES')||!offlineUI.visible||
    !offlineUI.error?.includes('Simulated backend connection loss')||!offlineUI.exported||
    offlineUI.label!=='Offline unsaved edit')
   throw Error('Offline save did not provide visible recovery: '+JSON.stringify(offlineUI));
 const offlineDisk=JSON.parse(await readFile(join(contentRoot,'content','site.json'),'utf8'));
 if(titleIn(offlineDisk).label==='Offline unsaved edit')throw Error('Disconnected write changed disk');
 console.log('M8_OFFLINE_RECOVERY_OK visible error, unsaved JSON export, unchanged disk');
 console.log('M8_STRUCTURE_OK '+JSON.stringify({before,selected,selectedItem,fold,unfold,hidden,shown}));
}finally{
 ws?.close();chrome?.kill('SIGKILL');server.kill('SIGTERM');
 await sleep(170);await rm(tmp,{recursive:true,force:true}).catch(()=>{});
}
