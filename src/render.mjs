/**
 * Shared, DOM-independent HTML renderer for both the studio and the static website.
 * ES module served unchanged to the browser by the local Node dev server.
 * The `design` flag ONLY adds editor selection attributes; it never changes content.
 */
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const displayValue = value => Array.isArray(value) ? value.join(', ') : value ?? '';
const safeToken = value => /^[a-zA-Z0-9_-]+$/.test(value ?? '') ? value : '';
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
      const padding=block.padding==='none'?'padding:0;min-height:0':block.padding==='small'?'padding:12px':'';
      content=`<div class="b-card ${safeToken(block.layout||'stack')} ${safeToken(block.tone||'clear')}" style="${padding}">${renderBlocks(block.children,context,data,options,depth+1)||'<div class="placeholder">Empty card · add child</div>'}</div>`;
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
  return `<div class="block${selected}"${attrs}>${content}</div>`;
}
/** Same website shell for in-editor previews and generated public pages. */
export function renderSiteFrame(content,data,{design=false}={}) {
  const published=new Set(data.pages.filter(p=>p.status==='Published').map(p=>p.slug.replace(/\/$/,'')||'/'));
  const homepage=published.has('/');
  const logo=homepage?'<a class="web-logo" href="/" data-site-route="/">TA<span style="font-weight:300">/</span></a>':'<span class="web-logo">TA<span style="font-weight:300">/</span></span>';
  const links=[['Index','/'],['Work','/work/'],['Journal','/posts/']]
    .filter(([,href])=>published.has(href.replace(/\/$/,'')||'/'))
    .map(([label,href])=>`<a href="${href}" data-site-route="${href.replace(/\/$/,'')||'/'}">${label}</a>`).join('');
  return `<div class="webpage ${design?'design':'view'}"><nav class="web-nav">${logo}<div class="web-links">${links}</div></nav><main class="web-content">${content}</main><footer class="web-footer"><span>TA / DESIGN & RESEARCH</span><span>© ${new Date().getUTCFullYear()}</span></footer></div>`;
}
/** Allows direct parity assertions with the editor without requiring a browser to render. */
export function renderPagePreview(data,blocks,context=null,options={}) {
  return renderSiteFrame(renderBlocks(blocks,context,data,options),data,options);
}
export function renderDocument(data,{title,blocks,context=null}) {
  const heading=escapeHtml(title||data.site.name);
  const name=escapeHtml(data.site.name);
  const description=escapeHtml(context?.summary||data.site.description||'');
  const page=renderPagePreview(data,blocks,context);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${heading} — ${name}</title><meta name="description" content="${description}"><link rel="stylesheet" href="/site.css"></head><body class="published-site">${page}</body></html>`;
}
export function collectPages(data) {
  const pages=[];
  for(const page of data.pages) if(page.status==='Published')
    pages.push({route:page.slug,html:renderDocument(data,{title:page.title,blocks:page.blocks})});
  for(const collection of data.collections)for(const record of collection.records){
    if(record.status==='Draft')continue;
    const template=templateFor(data,collection,record);
    if(!template)throw Error(`Missing template for ${collection.id}/${record.slug}`);
    pages.push({route:recordPath(collection,record),html:renderDocument(data,{title:record.title,blocks:template.blocks,context:record})});
  }
  return pages;
}