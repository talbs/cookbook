import { readFileSync } from 'node:fs';

export function data() {
  return {
    pagination: { data: 'collections.recipes', size: 1, alias: 'recipeItem' },
    permalink: ({ recipeItem }) => `/recipes/${recipeItem.fileSlug}.txt`,
    layout: false,
    eleventyExcludeFromCollections: true,
  };
}

export function render({ recipeItem }) {
  return readFileSync(recipeItem.inputPath, 'utf8');
}
