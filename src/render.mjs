// Static renderer for the Prototype 02 block vocabulary. No DOM, database, or runtime dependencies.
// The editor currently uses its original embedded renderer; parity is tested while it is extracted.
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const displayValue = value => Array.isArray(value) ? value.join(', ') : value ?? '';
const safeToken = value => /^[a-zA-Z0-9_-]+$/.test(value ?? '') ? value : '';
export const recordPath = (collection, record) => `${collection.base}/${record.slug}/`;
export function templateFor(data, collection, record) {
  const id=collection.formatTemplates?.[record?.[collection.formatField]] || collection.defaultTemplate;
  return data.templates.find(template=>template.id===id);
}
function bind(value, context, data) {
  return String(value ?? '').replace(/\{\{\s*([^{}]+)\s*\}\}/g, (_, raw)=> {
    const name=raw.trim();
    if (name==='site.name') return data.site.name;
    if (name==='collection.name') return data.collections.find(c=>c.records.includes(context))?.name ?? '';
    return String(displayValue(context?.[name]));
  });
}
const inline = text => escapeHtml(text)
  .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g,'<em>$1</em>')
  .replace(/`([^`]+)`/g,'<code>$1</code>');
function richText(input) {
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
function assetFor(data, id) {return data.assets.find(asset=>asset.id===id);}
function assetSrc(asset) {
  if(!asset || typeof asset.src!=='string')return '';
  if(/^demo:[a-z0-9-]+$/.test(asset.src))return `/assets/demo/${asset.src.slice(5)}.svg`;
  if(/^https?:\/\//i.test(asset.src))return asset.src;
  if(/^\/(?!\/)[a-zA-Z0-9_./-]+$/.test(asset.src) && !asset.src.split('/').includes('..'))return asset.src;
  return '';
}
function safeHref(value) {
  return (/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(value||''))?String(value):'#';
}
function queryEntries(block, data) {
  const collection=data.collections.find(c=>c.id===block.collection);
  if(!collection)return [];
  let rows=collection.records.filter(r=>r.status!=='Draft');
  if(block.filter==='featured')rows=rows.filter(r=>r.featured);
  else if(block.filter==='published')rows=rows.filter(r=>['Published','Complete','In progress'].includes(r.status));
  else if((block.filter||'').startsWith('format:'))rows=rows.filter(r=>r.format===block.filter.slice(7));
  if(block.sort==='newest')rows.sort((a,b)=>String(b.date||b.year||'').localeCompare(String(a.date||a.year||'')));
  return rows.slice(0,Math.max(1,Math.min(200,Number(block.count)||4))).map(r=>({collection,record:r}));
}
export function renderBlocks(blocks, context, data, depth=0) {
  if(depth>10 || !Array.isArray(blocks))return '';
  return blocks.map(block=>renderBlock(block,context,data,depth)).join('');
}
function renderBlock(block, context, data, depth) {
  if(!block || typeof block!=='object')return '';
  let result='';
  switch(block.type){
    case 'text': result=`<div class="b-text ${safeToken(block.style||'body')}">${escapeHtml(bind(block.text,context,data))}</div>`;break;
    case 'rich': result=`<div class="rich">${richText(bind(block.source,context,data))}</div>`;break;
    case 'divider': result='<div class="b-divider"></div>';break;
    case 'image': {
      const asset=assetFor(data,bind(block.source,context,data));
      const src=assetSrc(asset);
      result=`<figure class="b-figure">${src?`<img class="b-image ${block.fit==='contain'?'contain':''}" src="${escapeHtml(src)}" alt="${escapeHtml(asset?.alt||'')}">`:'<div class="placeholder">NO IMAGE</div>'}${block.caption&&asset?.caption?`<figcaption>${escapeHtml(asset.caption)}</figcaption>`:''}</figure>`;
      break;
    }
    case 'card': {
      const padding=block.padding==='none'?'padding:0;min-height:0':block.padding==='small'?'padding:12px':'';
      result=`<div class="b-card ${safeToken(block.layout||'stack')} ${safeToken(block.tone||'clear')}" style="${padding}">${renderBlocks(block.children,context,data,depth+1)}</div>`;
      break;
    }
    case 'component': {
      const component=data.components.find(c=>c.id===block.component);
      result=component?`<div class="reusable">${renderBlocks(component.blocks,context,data,depth+1)}</div>`:'';
      break;
    }
    case 'query': {
      const component=data.components.find(c=>c.id===block.component);
      const entries=queryEntries(block,data);
      result=`<div class="b-query ${safeToken(block.layout||'grid')}">${entries.map(({collection,record})=>`<a class="q-entry" href="${escapeHtml(recordPath(collection,record))}">${component?renderBlocks(component.blocks,record,data,depth+1):`<div class="q-name">${escapeHtml(record.title)}</div>`}</a>`).join('')}</div>`;
      break;
    }
    case 'button': {
      const href=safeHref(bind(block.href||'#',context,data));
      result=`<a class="b-action" href="${escapeHtml(href)}"${/^https?:\/\//i.test(href)?' target="_blank" rel="noopener noreferrer"':''}>${escapeHtml(bind(block.text||'Explore ↗',context,data))}</a>`;
      break;
    }
    default: result='';
  }
  return `<div class="block">${result}</div>`;
}
export function renderDocument(data, {title,blocks,context=null}) {
  const heading=escapeHtml(title || data.site.name);
  const website=escapeHtml(data.site.name);
  const description=escapeHtml(context?.summary||data.site.description||'');
  const page=renderBlocks(blocks,context,data);
  // Only link to actually generated page routes. Draft pages must remain unpublished.
  const published=new Set(data.pages.filter(p=>p.status==='Published').map(p=>p.slug.replace(/\/$/,'')||'/'));
  const home=published.has('/');
  const logo=home?'<a class="web-logo" href="/">TA<span style="font-weight:300">/</span></a>':'<span class="web-logo">TA<span style="font-weight:300">/</span></span>';
  const links=[['Index','/'],['Work','/work/'],['Journal','/posts/']]
    .filter(([,href])=>published.has(href.replace(/\/$/,'')||'/'))
    .map(([label,href])=>`<a href="${href}">${label}</a>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${heading} — ${website}</title><meta name="description" content="${description}"><link rel="stylesheet" href="/site.css"></head><body class="published-site"><div class="webpage view"><nav class="web-nav">${logo}<div class="web-links">${links}</div></nav><main class="web-content">${page}</main><footer class="web-footer"><span>TA / DESIGN & RESEARCH</span><span>© ${new Date().getUTCFullYear()}</span></footer></div></body></html>`;
}
export function collectPages(data){
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