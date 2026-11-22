export function data() {
  return { permalink: '/robots.txt', layout: false, eleventyExcludeFromCollections: true };
}

export function render({ site }) {
  return `User-agent: *
Allow: /

Sitemap: ${site.url}/sitemap.xml
`;
}
