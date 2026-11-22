export function data() {
  return { permalink: '/sitemap.xml', layout: false, eleventyExcludeFromCollections: true };
}

export function render({ collections, site }) {
  const entries = collections.all
    .map(item => item.url)
    .filter(url => url && url.endsWith('/'))
    .sort()
    .map(url => `  <url><loc>${site.url}${url}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;
}
