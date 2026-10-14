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
// Used by both browser studio and Node build. options: {design, selectedId}
export function renderBlocks(blocks, context, data, options={}, depth=0) {
  if(depth>10 || !Array.isArray(blocks))return '';
  return blocks.map(block=>renderBlock(block,context,data,options,depth)).join('');
}
function renderBlock(block,context,data,options,depth) {
  if(!block||typeof block!=='object')return '';
  const design=Boolean(options.design);
  const selected=design&&options.selectedId===block.id?' chosen':'';
  const attrs=design?` data-node-id="${escapeHtml(block.id)}" data-kind="${escapeHtml(block.type)}"`:'';
  let content='';
  switch(block.type){
    case 'text': content=`<div class="b-text ${safeToken(block.style||'body')}">${escapeHtml(bind(block.text,context,data))||'<span class="muted">Empty text</span>'}</div>`;break;
    case 'rich': content=`<div class="rich">${richText(bind(block.source,context,data))||'<p class="muted">Empty body</p>'}</div>`;break;
    case 'divider': content='<div class="b-divider"></div>';break;
    case 'image': {
      const asset=data.assets.find(a=>a.id===bind(block.source,context,data));
      const src=assetSrc(asset);
      content=`<figure class="b-figure">${src?`<img class="b-image ${block.fit==='contain'?'contain':''}" src="${escapeHtml(src)}" alt="${escapeHtml(asset?.alt||'')}">`:'<div class="placeholder">NO IMAGE / CHOOSE AN ASSET</div>'}${block.caption&&asset?.caption?`<figcaption>${escapeHtml(asset.caption)}</figcaption>`:''}</figure>`;
      break;
    }
    case 'card': {
      const tone=backgrounds.has(block.background)?block.background:'transparent';
      const padding=['x1','x2','x4'].includes(block.padding)?block.padding:'x1';
      const gap=['x1','x2','x4'].includes(block.gap)?block.gap:'x1';
      content=`<div class="b-card grid-card bg-${tone} pad-${padding} gap-${gap}${block.border?' has-border':''}" style="${cardGridStyle(block)}">${renderBlocks(block.children,context,data,{...options,parentColumns:safePositiveInt(block.columns,1),parentRows:safePositiveInt(block.rows,Math.max(1,Math.ceil((block.children||[]).length/safePositiveInt(block.columns,1))))},depth+1)||'<div class="placeholder">Empty card · add child</div>'}</div>`;
      break;
    }
    case 'component': {
      const component=data.components.find(c=>c.id===block.component);
      // Nested component blocks are displayed but not individually selectable in this scope.
      content=component?`<div class="reusable">${renderBlocks(component.blocks,context,data,{...options,design:false},depth+1)}</div>`:`<div class="placeholder">Missing component: ${escapeHtml(block.component)}</div>`;
      break;
    }
    case 'query': {
      const component=data.components.find(c=>c.id===block.component);
      const entries=queryEntries(block,data);
      content=`<div class="b-query ${safeToken(block.layout||'grid')}">${entries.map(({collection,record})=>`<a class="q-entry" href="${escapeHtml(recordPath(collection,record))}" data-open-generated="${escapeHtml(record.id)}" data-for-collection="${escapeHtml(collection.id)}">${component?renderBlocks(component.blocks,record,data,{...options,design:false},depth+1):`<div class="q-name">${escapeHtml(record.title)}</div><div class="q-meta">${escapeHtml(record.format||record.category||'')}</div>`}</a>`).join('')||'<div class="placeholder">No records match this query</div>'}</div>`;
      break;
    }
    case 'button': {
      const href=safeHref(bind(block.href||'#',context,data));
      content=`<a class="b-action" href="${escapeHtml(href)}"${/^https?:\/\//i.test(href)?' target="_blank" rel="noopener noreferrer"':''}>${escapeHtml(bind(block.text||'Explore ↗',context,data))}</a>`;
      break;
    }
    default: content='<div class="placeholder">Unknown block</div>';
  }
  const parentCols=safePositiveInt(options.parentColumns,1),parentRows=safePositiveInt(options.parentRows,1);
  const area=safeArea(block.area,parentCols,parentRows);
  return `<div class="block${block.variant?' variant-'+safeToken(block.variant):''}${selected}"${attrs}${area?` style="${area}"`:''}>${content}</div>`;
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
  const logo=published.has('/')?'<a class="web-logo" href="/" aria-label="TA — Home" data-site-route="/">TA<span style="font-weight:300">/</span></a>':'<span class="web-logo">TA<span style="font-weight:300">/</span></span>';
  const frameHeight = name => {
    const settings=data.site?.design?.frame?.[name];
    return settings?.constrainHeight && Number.isFinite(settings.heightFactor) && settings.heightFactor>0 && settings.heightFactor<=4
      ? ` style="aspect-ratio:1 / ${settings.heightFactor};"` : '';
  };
  // Master spacing is expressed in page-width units; no per-Card pixel overrides.
  const unit=value=>Number.isFinite(value)&&value>0&&value<=4?value:1;
  const spacingStyle=` style="--ta-pad:${unit(data.site?.design?.pad)}cqw;--ta-gap:${unit(data.site?.design?.gap)}cqw"`;
  const links=nav.map(link=>{
    const href=normalizeRoute(link.href),active=href===section;
    return `<a href="${escapeHtml(href)}" data-site-route="${escapeHtml(href)}"${active?' class="is-active" aria-current="page"':''}>${escapeHtml(link.label)}</a>`;
  }).join('');
  return `<div class="webpage ${design?'design':'view'}${data.site?.design?.cardBorders?' show-card-borders':''}"${spacingStyle}><a class="skip-link" href="#main-content">Skip to content</a><nav class="web-nav b-card grid-card semantic-header bg-transparent"${frameHeight('header')} aria-label="Main navigation">${logo}<div class="web-links">${links}</div></nav><main id="main-content" class="web-content b-card semantic-page bg-transparent">${content}</main><footer class="web-footer b-card grid-card semantic-footer bg-transparent"${frameHeight('footer')}><span>${escapeHtml(data.site.name)}</span><span>© ${new Date().getUTCFullYear()}</span></footer></div>`;
}
export function renderPagePreview(data,blocks,context=null,options={}) {
  return renderSiteFrame(renderBlocks(blocks,context,data,options),data,{...options,route:options.route||resolvePreviewRoute(data,blocks,context)});
}
export function renderDocument(data,{title,blocks,context=null,route}) {
  const heading=escapeHtml(title||data.site.name),name=escapeHtml(data.site.name);
  const description=escapeHtml(context?.summary||data.site.description||'');
  const page=renderPagePreview(data,blocks,context,{route:route||resolvePreviewRoute(data,blocks,context)});
  // Sample content isn't approved for live indexing yet.
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${heading} — ${name}</title><meta name="description" content="${description}"><meta name="robots" content="noindex, nofollow"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;450;500;550;600;650&display=swap"><link rel="stylesheet" href="/site.css"></head><body class="published-site">${page}</body></html>`;
}
export function collectPages(data) {
  const pages=[];
  for(const page of data.pages) if(page.status==='Published')
    pages.push({route:normalizeRoute(page.slug),html:renderDocument(data,{title:page.title,blocks:page.blocks,route:normalizeRoute(page.slug)})});
  for(const collection of data.collections)for(const record of collection.records){
    if(record.status==='Draft')continue;
    const template=templateFor(data,collection,record);
    if(!template)throw Error(`Missing template for ${collection.id}/${record.slug}`);
    pages.push({route:recordPath(collection,record),html:renderDocument(data,{title:record.title,blocks:template.blocks,context:record,route:recordPath(collection,record)})});
  }
  return pages;
}