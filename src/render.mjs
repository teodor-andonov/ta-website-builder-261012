/**
 * Shared, DOM-independent HTML renderer for both the studio and the static website.
 * ES module served unchanged to the browser by the local Node dev server.
 * The `design` flag ONLY adds editor selection attributes; it never changes content.
 */
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const displayValue = value => Array.isArray(value) ? value.join(', ') : value ?? '';
const safeToken = value => /^[a-zA-Z0-9_-]+$/.test(value ?? '') ? value : '';

const safePositiveInt = (v, fallback=1) => Number.isInteger(Number(v)) && Number(v)>=1 && Number(v)<=64 ? Number(v) : fallback;
const safeFactor = v => Number.isFinite(Number(v)) && Number(v)>0 && Number(v)<=4 ? Number(v) : 0.5;
const safeArea = (area, columns, rows) => {
  if(!area || typeof area!=='object')return '';
  const {x1,y1,x2,y2}=area;
  if(![x1,y1,x2,y2].every(Number.isInteger) || x1<1 || y1<1 || x2<=x1 || y2<=y1 || x2>columns+1 || y2>rows+1)return '';
  return `grid-column:${x1}/${x2};grid-row:${y1}/${y2};`;
};
const backgrounds=new Set(['transparent','white','grey-100','grey-200','grey-300','grey-600','black']);
export function cardGridStyle(block){
  const columns=safePositiveInt(block.columns,1),rows=safePositiveInt(block.rows,Math.max(1,Math.ceil((block.children||[]).length/columns)));
  return `grid-template-columns:repeat(${columns},minmax(0,1fr));grid-template-rows:repeat(${rows},${block.constrainHeight?'minmax(0,1fr)':'minmax(min-content,1fr)'});${block.constrainHeight?`aspect-ratio:1 / ${safeFactor(block.heightFactor)};`:''}`;
}

export const recordPath = (collection, record) => `${collection.base}/${record.slug}/`;
export function templateFor(data, collection, record) {
  const id = collection?.formatTemplates?.[record?.[collection?.formatField]] || collection?.defaultTemplate;
  return data.templates.find(template => template.id === id);
}
export function bind(value, context, data) {
  return String(value ?? '').replace(/\{\{\s*([^{}]+)\s*\}\}/g, (_, raw) => {
    const name = raw.trim();
    if (name === 'site.name') return data.site.name;
    if(name === 'site.contact.email'||name === 'site.contact.bookingUrl')return data.site.contact?.[name.slice('site.contact.'.length)] ?? '';
    if (name === 'collection.name') return data.collections.find(c=>c.records.includes(context))?.name ?? '';
    return String(displayValue(context?.[name]));
  });
}
function safeHref(value) {
  const href=String(value||'');
  return /^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(href) && !/[\u0000-\u001f]/.test(href) ? href : '#';
}
const inline = input => escapeHtml(input)
  .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g,'<em>$1</em>')
  .replace(/`([^`]+)`/g,'<code>$1</code>')
  .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,(_,label,url)=>`<a href="${escapeHtml(safeHref(url.replaceAll('&amp;','&')))}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`);
export function richText(input) {
  const lines=String(input??'').split(/\r?\n/);
  let out='',inList=false;
  for(const line of lines) {
    if(line.startsWith('- ')) {
      if(!inList){out+='<ul>';inList=true;}
      out+='<li>'+inline(line.slice(2))+'</li>';
      continue;
    }
    if(inList){out+='</ul>';inList=false;}
    if(!line.trim())continue;
    if(line.startsWith('### '))out+='<h3>'+inline(line.slice(4))+'</h3>';
    else if(line.startsWith('## '))out+='<h2>'+inline(line.slice(3))+'</h2>';
    else if(line.startsWith('# '))out+='<h2>'+inline(line.slice(2))+'</h2>';
    else out+='<p>'+inline(line)+'</p>';
  }
  return out+(inList?'</ul>':'');
}
export function assetSrc(asset) {
  if(!asset || typeof asset.src!=='string')return '';
  if(/^demo:[a-z0-9-]+$/.test(asset.src))return `/assets/demo/${asset.src.slice(5)}.svg`;
  if(/^https?:\/\//i.test(asset.src))return asset.src;
  if(/^\/(?!\/)[a-zA-Z0-9_./-]+$/.test(asset.src) && !asset.src.split('/').includes('..'))return asset.src;
  return '';
}
function queryEntries(block,data) {
  const collection=data.collections.find(c=>c.id===block.collection);
  if(!collection)return [];
  let rows=collection.records.filter(r=>r.status!=='Draft');
  if(block.filter==='featured')rows=rows.filter(r=>r.featured);
  else if(block.filter==='published')rows=rows.filter(r=>['Published','Complete','In progress'].includes(r.status));
  else if((block.filter||'').startsWith('format:'))rows=rows.filter(r=>r.format===block.filter.slice(7));
  if(block.sort==='newest')rows.sort((a,b)=>String(b.date||b.year||'').localeCompare(String(a.date||a.year||'')));
  return rows.slice(0,Math.max(1,Math.min(200,Number(block.count)||4))).map(r=>({collection,record:r}));
}
// Every authored composition node renders as exactly one Card or one Item.
// The node itself owns parent-grid placement, overflow and editor selection.
function nodeAttrs(node, options, baseClasses, layoutStyle='', moreAttrs='') {
  const cls=[...baseClasses];
  const variant=safeToken(node.variant);
  if(variant) cls.push((baseClasses[0]==='card'?'card-':'item-')+variant,'variant-'+variant);
  if(node.overflow==='scroll')cls.push('item-scroll');
  if(options.design&&options.selectedId===node.id)cls.push('chosen');
  const parentCols=safePositiveInt(options.parentColumns,1),parentRows=safePositiveInt(options.parentRows,1);
  const style=safeArea(node.area,parentCols,parentRows)+layoutStyle;
  const selected=options.design?' data-node-id="'+escapeHtml(node.id)+'" data-kind="'+escapeHtml(node.type)+'"':'';
  return ' class="'+cls.join(' ')+'"'+selected+(style?' style="'+style+'"':'')+moreAttrs;
}
const gridOptions=(node, options)=>({
  ...options,
  topLevel:false, linkHref:null,
  parentColumns:safePositiveInt(node.columns,1),
  parentRows:safePositiveInt(node.rows,Math.max(1,Math.ceil((node.children||[]).length/safePositiveInt(node.columns,1))))
});
const defaultCard=(id,children,area,columns=1,rows=1)=>({
  id,type:'card',columns,rows,area,children,
  padding:'x1',gap:'x1',background:'transparent',
  border:false,constrainHeight:false,heightFactor:0.5
});
export function renderBlocks(blocks,context,data,options={},depth=0) {
  if(depth>32)throw new Error('Composition nesting exceeds 32 levels while rendering');
  if(!Array.isArray(blocks))return '';
  return blocks.map(node=>renderBlock(node,context,data,options,depth)).join('');
}
function renderBlock(node, context, data, options, depth) {
  if(depth>32)throw new Error('Composition nesting exceeds 32 levels while rendering');
  if(!node||typeof node!=='object')return '';
  // Legacy JSON can be viewed, but canonical data uses source and reference Cards.
  if(node.type==='query'){
    const card=defaultCard(node.id,[],node.area,node.layout==='three'?3:node.layout==='grid'?2:1);
    card.source={collection:node.collection,template:node.component,filter:node.filter,sort:node.sort,count:node.count,layout:node.layout};
    card.variant=node.variant;
    return renderBlock(card,context,data,options,depth);
  }
  if(node.type==='component'){
    return renderBlock({...defaultCard(node.id,[],node.area),reference:node.component,variant:node.variant},context,data,options,depth);
  }
  if(node.type==='card'){
    let card=node,inner='',settings=gridOptions(card,options);
    if(card.source){
      const source=card.source;
      const entries=queryEntries({...source},data);
      const cols=safePositiveInt(card.columns,1);
      const rows=Math.max(1,Math.ceil(entries.length/cols));
      card={...card,rows};
      settings=gridOptions(card,options);
      inner=entries.map(({collection,record},i)=>{
        const area={x1:i%cols+1,y1:Math.floor(i/cols)+1,x2:i%cols+2,y2:Math.floor(i/cols)+2};
        const template=data.components.find(c=>c.id===source.template);
        const recordCard=template?.blocks?.find(b=>b.type==='card');
        const entry=recordCard?{...recordCard,id:node.id+'_'+record.id,area}:
          defaultCard(node.id+'_'+record.id,[{id:node.id+'_'+record.id+'_title',type:'text',text:'{{title}}',area:{x1:1,y1:1,x2:2,y2:2}}],area);
        return renderBlock(entry,record,data,{...settings,design:false,linkHref:recordPath(collection,record)},depth+1);
      }).join('')||'<div class="item item-placeholder placeholder">No records match this query</div>';
    }else if(card.reference){
      const component=data.components.find(c=>c.id===card.reference);
      const nodes=component?.blocks||[];
      card={...card,columns:1,rows:Math.max(1,nodes.length)};
      settings=gridOptions(card,options);
      const stack=options.referenceStack||[];
      inner=stack.includes(card.reference)?
        '<div class="item item-placeholder placeholder">Circular component reference</div>':
        renderBlocks(nodes.map((child,i)=>({...child,area:{x1:1,y1:i+1,x2:2,y2:i+2}})),context,data,{...settings,design:false,referenceStack:[...stack,card.reference]},depth+1);
    }else{
      inner=renderBlocks(card.children,context,data,settings,depth+1);
    }
    const background=backgrounds.has(card.background)?card.background:'transparent';
    const padding=['x1','x2','x4'].includes(card.padding)?card.padding:'x1';
    const gap=['x1','x2','x4'].includes(card.gap)?card.gap:'x1';
    const tag=options.linkHref?'a':options.topLevel?'section':'div';
    const classes=['card','grid-card','bg-'+background,'pad-'+padding,'gap-'+gap];
    if(options.topLevel)classes.push('card-section');
    if(card.source)classes.push('card-query');
    if(card.reference)classes.push('card-reference');
    if(options.linkHref)classes.push('card-record');
    if(card.border)classes.push('has-border');
    const link=options.linkHref?' href="'+escapeHtml(safeHref(options.linkHref))+'"':'';
    const attrs=nodeAttrs(card,options,classes,cardGridStyle(card),link);
    return '<'+tag+attrs+'>'+inner+'</'+tag+'>';
  }
  const type=node.type,overflow=node.overflow==='scroll'?' item-scroll':'';
  if(type==='text'){
    const attrs=nodeAttrs(node,options,['item','item-text','b-text',safeToken(node.style||'body')]);
    // Preserve visual Cards while giving display/heading Items real semantic levels.
    const tag=node.style==='display'||node.headingLevel===1?'h1':node.style==='heading'?'h2':'div';
    return '<'+tag+attrs+'>'+ (escapeHtml(bind(node.text,context,data))||'<span class="muted">Empty text</span>')+'</'+tag+'>';
  }
  if(type==='rich'){
    const attrs=nodeAttrs(node,options,['item','item-rich','rich']);
    return '<div'+attrs+'>'+ (richText(bind(node.source,context,data))||'<p class="muted">Empty body</p>')+'</div>';
  }
  if(type==='image'){
    const asset=data.assets.find(a=>a.id===bind(node.source,context,data));
    const src=assetSrc(asset);
    const attrs=nodeAttrs(node,options,['item','item-image','b-figure']);
    const image=src?'<img class="b-image'+(node.fit==='contain'?' contain':'')+'" src="'+escapeHtml(src)+'" alt="'+escapeHtml(asset?.alt||'')+'" decoding="async"'+(node.loading==='lazy'?' loading="lazy"':'')+'>':
       '<div class="placeholder">NO IMAGE / CHOOSE AN ASSET</div>';
    const caption=node.caption&&asset?.caption?'<figcaption>'+escapeHtml(asset.caption)+'</figcaption>':'';
    return '<figure'+attrs+'>'+image+caption+'</figure>';
  }
  if(type==='button'){
    const rawHref=node.href||'#';
    const resolved=bind(rawHref,context,data);
    // Booking is opt-in. Never render a clickable dead link before setup.
    if(rawHref==='{{site.contact.bookingUrl}}'&&!resolved){
      const attrs=nodeAttrs(node,options,['item','item-button','b-action','is-unavailable'],'',' aria-disabled="true"');
      return '<span'+attrs+'>15-minute introduction · booking link pending</span>';
    }
    const href=safeHref(resolved);
    const attrs=nodeAttrs(node,options,['item','item-button','b-action'],'',' href="'+escapeHtml(href)+'"'+
      (/^https?:\/\//i.test(href)?' target="_blank" rel="noopener noreferrer"':''));
    return '<a'+attrs+'>'+escapeHtml(bind(node.text||'Explore ↗',context,data))+'</a>';
  }
  if(type==='divider'){
    return '<div'+nodeAttrs(node,options,['item','item-divider','b-divider'])+'></div>';
  }
  return '<div'+nodeAttrs(node,options,['item','item-placeholder','placeholder'])+'>Unknown item</div>';
}
/** Map a record or bespoke page to its URL without duplicating the renderer. */
export function resolvePreviewRoute(data,blocks,context=null) {
  if(context)for(const collection of data.collections){
    const record=collection.records.find(r=>r===context || r.id===context.id);
    if(record)return recordPath(collection,record);
  }
  return normalizeRoute(data.pages.find(p=>p.blocks===blocks)?.slug || '/');
}
export const normalizeRoute = route => route==='/' ? '/' : `${String(route||'/').replace(/\/+$/,'')}/`;
function publishedRoutes(data){return new Set(data.pages.filter(p=>p.status==='Published').map(p=>normalizeRoute(p.slug)));}
/** Shared site shell. Navigation is authored in JSON; drafts are hidden. */
export function renderSiteFrame(content,data,{design=false,route='/'}={}) {
  const published=publishedRoutes(data);
  const here=normalizeRoute(route);
  const section=here==='/'?'/':here.startsWith('/work/')?'/work/':here.startsWith('/posts/')?'/posts/':here;
  const nav=(data.site.navigation || [{label:'Home',href:'/'},{label:'Work',href:'/work/'},{label:'Journal',href:'/posts/'}]).filter(link=>published.has(normalizeRoute(link.href)));
  const logo=published.has('/')?'<a class="item item-logo web-logo" href="/" aria-label="TA — Home" data-site-route="/">TA<span style="font-weight:300">/</span></a>':'<span class="item item-logo web-logo">TA<span style="font-weight:300">/</span></span>';
  const frameHeight = name => {
    const settings=data.site?.design?.frame?.[name];
    return settings?.constrainHeight && Number.isFinite(settings.heightFactor) && settings.heightFactor>0 && settings.heightFactor<=4
      ? ` style="aspect-ratio:1 / ${settings.heightFactor};"` : '';
  };
  // Master spacing is expressed in page-width units; no per-Card pixel overrides.
  const unit=value=>Number.isFinite(value)&&value>0&&value<=4?value:1;
  const spacingStyle=` style="--ta-pad:${unit(data.site?.design?.pad)}cqw;--ta-gap:${unit(data.site?.design?.gap)}cqw"`;
  const links=nav.map((link,i)=>{
    const href=normalizeRoute(link.href),active=href===section;
    // Navigation links are direct Items in the Nav Card's twelve-column grid.
    const slot=Math.max(1,Math.floor(6/Math.max(1,nav.length)));
    const x1=Math.min(12,7+i*slot),x2=i===nav.length-1?13:Math.min(13,x1+slot);
    return `<a class="item item-link${active?' is-active':''}" style="grid-column:${x1}/${x2};grid-row:1;" href="${escapeHtml(href)}" data-site-route="${escapeHtml(href)}"${active?' aria-current="page"':''}>${escapeHtml(link.label)}</a>`;
  }).join('');
  return '<div class="card card-page webpage '+(design?'design':'view')+(data.site?.design?.cardBorders?' show-card-borders':'')+'"'+spacingStyle+
    '><a class="skip-link" href="#main-content">Skip to content</a>'+
    '<nav class="card card-nav web-nav grid-card semantic-header bg-transparent"'+frameHeight('header')+' aria-label="Main navigation">'+
    logo+links+'</nav>'+
    '<main id="main-content" class="card card-main web-content semantic-page bg-transparent">'+content+'</main>'+
    '<footer class="card card-footer web-footer grid-card semantic-footer bg-transparent"'+frameHeight('footer')+'>'+
    '<span class="item item-footer">'+escapeHtml(data.site.name)+'</span>'+
    '<span class="item item-footer">© '+new Date().getUTCFullYear()+'</span></footer></div>';
}
export function renderPagePreview(data,blocks,context=null,options={}) {
  return renderSiteFrame(renderBlocks(blocks,context,data,{...options,topLevel:true}),data,{...options,route:options.route||resolvePreviewRoute(data,blocks,context)});
}
export function renderDocument(data,{title,blocks,context=null,route,collectionId=null,publication={indexing:false,origin:null}}) {
  const heading=escapeHtml(title||data.site.name),name=escapeHtml(data.site.name);
  const plainTitle=(title||data.site.name)+' — '+data.site.name;
  const description=escapeHtml(context?.summary||data.site.description||'');
  const resolvedRoute=route||resolvePreviewRoute(data,blocks,context);
  const page=renderPagePreview(data,blocks,context,{route:resolvedRoute});
  // Canonical and absolute social URLs only exist for an explicitly approved
  // external production release; staging cannot claim an unverified domain.
  const indexable=publication.indexing===true && typeof publication.origin==='string';
  const absolute=indexable?publication.origin+resolvedRoute:null;
  const robots=indexable?'index, follow':'noindex, nofollow';
  const canonical=absolute?'<link rel="canonical" href="'+escapeHtml(absolute)+'">':'';
  const canonicalMeta=absolute?'<meta property="og:url" content="'+escapeHtml(absolute)+'">':'';
  const cover=context?.cover?data.assets.find(a=>a.id===context.cover):null;
  const image=absolute && cover && cover.placeholder!==true && assetSrc(cover).startsWith('/assets/')
    ? publication.origin+assetSrc(cover) : null;
  const mediaMeta=image?'<meta property="og:image" content="'+escapeHtml(image)+'"><meta name="twitter:card" content="summary_large_image">':
    '<meta name="twitter:card" content="summary">';
  const htmlTitle=escapeHtml(plainTitle);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${htmlTitle}</title><meta name="description" content="${description}"><meta name="robots" content="${robots}">${canonical}<meta property="og:type" content="${collectionId==='posts'?'article':'website'}"><meta property="og:site_name" content="${name}"><meta property="og:title" content="${htmlTitle}"><meta property="og:description" content="${description}">${canonicalMeta}<meta name="twitter:title" content="${htmlTitle}"><meta name="twitter:description" content="${description}">${mediaMeta}<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;450;500;550;600;650&display=swap"><link rel="stylesheet" href="/site.css"></head><body class="published-site">${page}</body></html>`;
}
export function collectPages(data,{publication={indexing:false,origin:null}}={}) {
  const pages=[];
  for(const page of data.pages) if(page.status==='Published')
    pages.push({route:normalizeRoute(page.slug),html:renderDocument(data,{title:page.title,blocks:page.blocks,route:normalizeRoute(page.slug),publication})});
  for(const collection of data.collections)for(const record of collection.records){
    if(record.status==='Draft')continue;
    const template=templateFor(data,collection,record);
    if(!template)throw Error(`Missing template for ${collection.id}/${record.slug}`);
    pages.push({route:recordPath(collection,record),html:renderDocument(data,{title:record.title,blocks:template.blocks,context:record,route:recordPath(collection,record),collectionId:collection.id,publication})});
  }
  return pages;
}