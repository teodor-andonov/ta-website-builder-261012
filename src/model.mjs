import {assertSlotTemplate,slotsIn} from './page-assembly.mjs';
// Shared data contract for the local editor API and static build.
export function validate(data) {
  // Expose validation failures as HTTP 400, rather than a misleading server error.
  const fail = message => { const error=new Error(message); error.status=400; throw error; };
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail('Root must be a JSON object');
  for (const name of ['collections','pages','templates','components','assets'])
    if (!Array.isArray(data[name])) fail(`${name} must be an array`);
  if (!data.site || typeof data.site.name !== 'string') fail('site.name must be a string');
  if (data.version !== 2) fail('Unsupported data version (expected 2)');
  if(data.site.publishing!==undefined && (
    !data.site.publishing || typeof data.site.publishing!=='object' ||
    Array.isArray(data.site.publishing) || typeof data.site.publishing.indexing!=='boolean' ||
    Object.keys(data.site.publishing).some(key=>key!=='indexing')))
    fail('site.publishing.indexing must be a boolean');
  // Public contact details are intentionally optional until the user verifies them.
  // A missing booking destination must never become a live placeholder link.
  if(data.site.contact!==undefined){
    const contact=data.site.contact;
    if(!contact||typeof contact!=='object'||Array.isArray(contact))fail('Invalid site contact settings');
    if(typeof contact.email!=='string'||(contact.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)))
      fail('Contact email must be empty or valid');
    if(typeof contact.bookingUrl!=='string'||(contact.bookingUrl&&!/^https:\/\/[^\s/@]+(?:\.[^\s/@]+)+(?:[\/:?#][^\s]*)?$/i.test(contact.bookingUrl)))
      fail('Booking URL must be empty or a valid HTTPS address');
  }

  const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value);
  const safeSlug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  if (data.site.navigation !== undefined) {
    if (!Array.isArray(data.site.navigation) || data.site.navigation.length > 12) fail('Invalid site navigation list');
    const navPaths = new Set();
    for (const link of data.site.navigation) {
      if (!link || typeof link.label !== 'string' || !link.label.trim() || link.label.length > 50) fail('Invalid navigation label');
      if (typeof link.href !== 'string' || !/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?\/?$/.test(link.href)) fail('Invalid navigation route');
      const route=link.href==='/'?'/':link.href.replace(/\/$/,'');
      if(navPaths.has(route))fail(`Duplicate navigation route: ${route}`);
      navPaths.add(route);
    }
  }
  const seenRoutes = new Set();
  const claimRoute = (route) => {
    if (seenRoutes.has(route)) fail(`Duplicate route: ${route}`);
    seenRoutes.add(route);
  };
  const distinctIds = (items, context) => {
    const ids = new Set();
    for (const item of items) {
      if (!item || !safeId(item.id)) fail(`Invalid ${context} ID`);
      if (ids.has(item.id)) fail(`Duplicate ${context} ID: ${item.id}`);
      ids.add(item.id);
    }
  };
  for (const kind of ['collections','pages','templates','components','assets']) distinctIds(data[kind], kind);
  for (const page of data.pages) {
    if (!Array.isArray(page.blocks)) fail(`Invalid blocks in page ${page.id}`);
    const route = page.slug;
    if (typeof route !== 'string' || (route !== '/' && !/^\/(?:[a-z0-9-]+)(?:\/[a-z0-9-]+)*\/?$/.test(route)))
      fail(`Invalid page route: ${route}`);
    claimRoute(route !== '/' ? route.replace(/\/$/,'') : route);
  }
  for (const collection of data.collections) {
    if (typeof collection.base !== 'string' || !/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(collection.base))
      fail(`Invalid collection base: ${collection.base}`);
    if (!Array.isArray(collection.records) || !Array.isArray(collection.fields)) fail(`Invalid collection: ${collection.id}`);
    distinctIds(collection.records, `${collection.id} records`);
    const localSlugs = new Set();
    for (const record of collection.records) {
      if (!safeSlug(record.slug)) fail(`Invalid ${collection.id} slug: ${record.slug}`);
      if (localSlugs.has(record.slug)) fail(`Duplicate ${collection.id} slug: ${record.slug}`);
      localSlugs.add(record.slug);
      claimRoute(`${collection.base}/${record.slug}`);
    }
  }
  // Stable metadata key for project/asset authoring. This is NOT a
  // relationship engine; M15 can query the same property later.
  const projectCodes=new Set();
  const projects=data.collections.find(c=>c.id==='projects');
  for(const record of projects?.records||[]){
    const code=record.projectCode;
    if(code===undefined||code==='')continue;
    if(typeof code!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(code))
      fail('Invalid projectCode on record '+record.id);
    if(projectCodes.has(code))fail('Duplicate projectCode: '+code);
    projectCodes.add(code);
  }
  for(const asset of data.assets){
    const code=asset.properties?.projectCode;
    if(code!==undefined&&(typeof code!=='string'||(code!==''&&!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(code))))
      fail('Invalid asset projectCode: '+asset.id);
  }
  for (const asset of data.assets) {
    if(typeof asset.src!=='string')fail(`Invalid asset source: ${asset.id}`);
    if(/^data:/i.test(asset.src))fail(`Invalid asset source: embedded data URIs are not supported (${asset.id})`);
  }
  const allowedBackgrounds=new Set(['transparent','white','grey-100','grey-200','grey-300','grey-600','black']);
  const allowedSizes=new Set(['x1','x2','x4']);
  const itemTypes=new Set(['text','rich','image','button','divider']);
  const maxCompositionDepth=32; // Match src/render.mjs; fail rather than silently truncate authored content.
  if(data.site.design!==undefined){
    const design=data.site.design;
    if(!design||typeof design!=='object'||design.unitDivisor!==100||typeof design.cardBorders!=='boolean')
      fail('Invalid site design controls');
    for(const key of ['pad','gap']){
      if(!Number.isFinite(design[key])||design[key]<=0||design[key]>4)fail(`Invalid master ${key} unit`);
    }
    if(design.frame!==undefined){
      for(const name of ['header','footer']){
        const region=design.frame[name];
        if(!region||typeof region.constrainHeight!=='boolean'||!Number.isFinite(region.heightFactor)||region.heightFactor<=0||region.heightFactor>4)
          fail(`Invalid semantic Card height constraint: ${name}`);
      }
    }
    for(const hex of Object.values(design.palette||{})){
      if(!/^#[0-9a-fA-F]{6}$/.test(hex))fail('Invalid grayscale palette value');
      const x=hex.slice(1).toLowerCase();
      if(x.slice(0,2)!==x.slice(2,4)||x.slice(2,4)!==x.slice(4,6))fail('Palette must be grayscale only');
    }
  }
  // The editor selects nodes by ID within an authoring scope (Page, Template, Component).
  // Reuse across independent scopes is fine; aliases within one scope are ambiguous.
  const checkBlocks=(blocks,where,seen=new Set(),depth=0)=>{
    if(depth>maxCompositionDepth)fail(`Composition nesting exceeds ${maxCompositionDepth} levels in ${where}`);
    if(!Array.isArray(blocks))fail(`Invalid authoring tree in ${where}`);
    for(const b of blocks){
      if(!b||typeof b!=='object'||!safeId(b.id))fail(`Invalid block in ${where}`);
      if(seen.has(b.id))fail(`Duplicate node ID in ${where}: ${b.id}`);
      seen.add(b.id);
      if(b.overflow!==undefined&&!['clip','scroll'].includes(b.overflow))fail(`Invalid item overflow: ${b.id}`);
      if(b.type==='query'||b.type==='component')fail(`Legacy directive must be a source/reference Card: ${b.id}`);
      if(b.type!=='card'){
        if(!itemTypes.has(b.type))fail(`Invalid Item type on ${b.id}: ${b.type}`);
        if(b.headingLevel!==undefined&&(b.type!=='text'||![1,2,3].includes(b.headingLevel)))
          fail(`Invalid semantic heading level on ${b.id}`);
        if(b.children!==undefined)fail(`Items cannot contain children: ${b.id}`);
        continue;
      }
      if(b.columns===undefined&&b.rows===undefined){ // old V2 import compatibility
        if(Array.isArray(b.children))checkBlocks(b.children,where,seen,depth+1);
        continue;
      }
      if(!Number.isInteger(b.columns)||b.columns<1||b.columns>64||!Number.isInteger(b.rows)||b.rows<1||b.rows>64)
        fail(`Invalid grid divisions on ${b.id}`);
      if(b.source!==undefined){
        const src=b.source;
        if(!src||typeof src!=='object'||!safeId(src.collection)||!safeId(src.template)||
          !data.collections.some(c=>c.id===src.collection)||!data.components.some(c=>c.id===src.template)||
          !['grid','three','list'].includes(src.layout)||!['newest','original'].includes(src.sort)||
          typeof src.filter!=='string'||!Number.isInteger(src.count)||src.count<1||src.count>200)
          fail(`Invalid record source Card: ${b.id}`);
      }
      if(b.reference!==undefined&&(!safeId(b.reference)||!data.components.some(c=>c.id===b.reference)))
        fail(`Invalid reusable Card reference: ${b.id}`);
      if(!Array.isArray(b.children)||!allowedBackgrounds.has(b.background)||!allowedSizes.has(b.gap)||!allowedSizes.has(b.padding))
        fail(`Invalid Card settings on ${b.id}`);
      if((b.source||b.reference)&&b.children.length)fail(`Generated or referenced Card cannot contain hidden authored children: ${b.id}`);
      if(typeof b.border!=='boolean'||typeof b.constrainHeight!=='boolean'||!Number.isFinite(b.heightFactor)||b.heightFactor<=0||b.heightFactor>4)
        fail(`Invalid Card constraint on ${b.id}`);
      for(const child of b.children){
        const a=child?.area;
        if(!a||![a.x1,a.y1,a.x2,a.y2].every(Number.isInteger)||a.x1<1||a.y1<1||a.x2<=a.x1||a.y2<=a.y1||a.x2>b.columns+1||a.y2>b.rows+1)
          fail(`Invalid child grid area in ${b.id}: ${child?.id}`);
      }
      checkBlocks(b.children,where,seen,depth+1);
    }
  };
  for(const p of [...data.pages,...data.templates,...data.components])checkBlocks(p.blocks,p.id);
  // Reusable component references (including query tile sources) must form an acyclic graph.
  // The renderer cannot expand cycles safely; reject them before storing canonical JSON.
  const edges=new Map(data.components.map(component=>[component.id,new Set()]));
  for(const component of data.components){
    const targets=edges.get(component.id);
    const walk=blocks=>{
      for(const block of blocks){
        if(block?.type!=='card')continue;
        if(block.reference)targets.add(block.reference);
        if(block.source?.template)targets.add(block.source.template);
        if(Array.isArray(block.children))walk(block.children);
      }
    };
    walk(component.blocks);
  }
  const visited=new Set(),active=new Set();
  const visit=(id,path=[])=>{
    if(active.has(id))fail('Circular component reference: '+[...path,id].join(' -> '));
    if(visited.has(id))return;
    active.add(id);
    for(const child of edges.get(id)||[]){
      if(!edges.has(child))fail('Unknown component reference: '+child);
      visit(child,[...path,id]);
    }
    active.delete(id);
    visited.add(id);
  };
  for(const id of edges.keys())visit(id);
  for (const template of data.templates) if (!Array.isArray(template.blocks)) fail(`Invalid template ${template.id}`);
  for (const component of data.components) if (!Array.isArray(component.blocks)) fail(`Invalid component ${component.id}`);
  const templateIds = new Set(data.templates.map(t=>t.id));
  for (const collection of data.collections) {
    if (collection.defaultTemplate && !templateIds.has(collection.defaultTemplate)) fail(`Missing default template ${collection.defaultTemplate}`);
    for (const id of Object.values(collection.formatTemplates ?? {}))
      if (!templateIds.has(id)) fail(`Missing format template ${id}`);
  }
  // M12 is opt-in: V1 pages and record-detail templates remain untouched.
  for(const template of data.templates){
    if(template.layoutMode===undefined){
      if(slotsIn(template.blocks).length)fail('Legacy template cannot contain a main slot: '+template.id);
    }else if(template.layoutMode==='slot'){
      try{assertSlotTemplate(template)}catch(e){fail(e.message)}
    }else fail('Unsupported template layout mode: '+template.id);
  }
  for(const component of data.components)
    if(slotsIn(component.blocks).length)fail('Component cannot own a page slot: '+component.id);
  for(const page of data.pages){
    if(slotsIn(page.blocks).length)fail('Page authoring cannot contain a template slot: '+page.id);
    if(page.template!==undefined || page.composition!==undefined){
      if(typeof page.template!=='string'||!templateIds.has(page.template))
        fail('Page requires a known slot template: '+page.id);
      const template=data.templates.find(t=>t.id===page.template);
      if(template.layoutMode!=='slot')fail('Page template is not slot based: '+page.id);
      if(page.blocks.length)fail('Page must not duplicate blocks when using a composition: '+page.id);
      if(!page.composition||page.composition.type!=='card'||page.composition.area!==undefined||
         slotsIn([page.composition]).length)
        fail('Page requires exactly one root Card without area or slot: '+page.id);
      checkBlocks([page.composition],page.id+' composition');
    }
  }
  return data;
}