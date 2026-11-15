import { minutesToIsoDuration } from './lib/json-ld.js';
import { formatDuration } from './lib/quantity.js';
import { loadRecipe } from './lib/recipe.js';
import { RESERVED_TAGS } from './lib/validate-recipe.js';

const RECIPE_PATH_PATTERN = /^\.\/recipes\/[^/]+\.cook$/;

function sortByTitle(items) {
  return [...items].sort((first, second) => first.data.title.localeCompare(second.data.title));
}

function listTagNames(collections) {
  return Object.keys(collections)
    .filter(name => !RESERVED_TAGS.includes(name))
    .sort();
}

export default function (eleventyConfig) {
  eleventyConfig.setTemplateFormats(['njk', '11ty.js', 'cook']);
  eleventyConfig.ignores.add('.claude/**');
  eleventyConfig.ignores.add('test/**');

  eleventyConfig.addExtension('cook', {
    // Cooklang reads the front matter; letting 11ty read it too gave two YAML readers that disagreed on dates.
    read: false,
    getData: inputPath => {
      if (!RECIPE_PATH_PATTERN.test(inputPath)) {
        throw new Error(`${inputPath}: recipes go directly in recipes/, not in another folder`);
      }
      return loadRecipe(inputPath);
    },
    compile: () => () => '',
  });

  eleventyConfig.addFilter('isoDuration', minutes => minutesToIsoDuration(minutes));
  eleventyConfig.addFilter('duration', minutes => formatDuration(minutes));
  eleventyConfig.addFilter('sortByTitle', sortByTitle);
  eleventyConfig.addFilter('tagNames', listTagNames);

  eleventyConfig.addCollection('recipes', collectionApi =>
    sortByTitle(collectionApi.getFilteredByGlob('recipes/*.cook'))
  );
}
