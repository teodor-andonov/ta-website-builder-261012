// Shared data contract for the local editor API and static build.
export function validate(data) {
  const fail = message => { throw new Error(message); };
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail('Root must be a JSON object');
  for (const name of ['collections','pages','templates','components','assets'])
    if (!Array.isArray(data[name])) fail(`${name} must be an array`);
  if (!data.site || typeof data.site.name !== 'string') fail('site.name must be a string');
  if (data.version !== 2) fail('Unsupported data version (expected 2)');
  const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value);
  const safeSlug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
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
  for (const template of data.templates) if (!Array.isArray(template.blocks)) fail(`Invalid template ${template.id}`);
  for (const component of data.components) if (!Array.isArray(component.blocks)) fail(`Invalid component ${component.id}`);
  const templateIds = new Set(data.templates.map(t=>t.id));
  for (const collection of data.collections) {
    if (collection.defaultTemplate && !templateIds.has(collection.defaultTemplate)) fail(`Missing default template ${collection.defaultTemplate}`);
    for (const id of Object.values(collection.formatTemplates ?? {}))
      if (!templateIds.has(id)) fail(`Missing format template ${id}`);
  }
  return data;
}