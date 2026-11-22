export function data() {
  return { permalink: '/llms.txt', layout: false, eleventyExcludeFromCollections: true };
}

function listRecipe(item, siteUrl) {
  return `- [${item.data.title}](${siteUrl}/recipes/${item.fileSlug}.txt): ${item.data.description}`;
}

export function render({ collections, site }) {
  const blocks = [
    `# ${site.title}`,
    `> ${site.description}`,
    `Every recipe here is one plain text file written in [Cooklang](https://cooklang.org/docs/spec/). The links below go to those files. The front matter keys \`icons\`, \`why\` and \`adapted\` are this site's own. Each recipe also has a web page at the same address without \`.txt\` (for example ${site.url}/recipes/kare-raisu/), with schema.org Recipe data in it. The rules for writing these files are in the [contributing guide](${site.source}/blob/main/CONTRIBUTING.md).`,
  ];
  for (const group of this.groupByCourse(collections.recipes)) {
    blocks.push(`## ${group.heading}`);
    blocks.push(group.recipes.map(item => listRecipe(item, site.url)).join('\n'));
  }
  return `${blocks.join('\n\n')}\n`;
}
