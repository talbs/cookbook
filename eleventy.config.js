import { minutesToIsoDuration } from './lib/json-ld.js';
import { loadRecipe } from './lib/recipe.js';
import { keepHyphenatedWordsWhole, keepLastWordsTogether, typesetText } from './lib/typeset.js';
import { RESERVED_TAGS } from './lib/validate-recipe.js';

const COURSE_LABELS = { main: 'Main course', side: 'Side dish' };
const RECIPE_PATH_PATTERN = /^\.\/recipes\/[^/]+\.cook$/;

function labelCourse(course) {
  return COURSE_LABELS[course] ?? course.charAt(0).toUpperCase() + course.slice(1);
}

function sortByTitle(items) {
  return [...items].sort((first, second) => first.data.title.localeCompare(second.data.title));
}

function listTagNames(collections) {
  return Object.keys(collections)
    .filter(name => !RESERVED_TAGS.includes(name))
    .sort();
}

function findRecipeNamed(recipes, recipeName) {
  return recipes.find(item => item.fileSlug === recipeName);
}

function listRecipesThatUse(recipes, recipeName) {
  return recipes.filter(item => item.data.linkedRecipeNames.includes(recipeName));
}

export default function (eleventyConfig) {
  eleventyConfig.setTemplateFormats(['njk', '11ty.js', 'cook']);
  eleventyConfig.ignores.add('.claude/**');
  eleventyConfig.ignores.add('test/**');
  eleventyConfig.addPassthroughCopy('assets');

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
  eleventyConfig.addFilter('courseLabel', labelCourse);
  eleventyConfig.addFilter('typeset', text => typesetText(text));
  eleventyConfig.addFilter('keepLastWordsTogether', html => keepLastWordsTogether(html));
  eleventyConfig.addFilter('keepHyphenatedWordsWhole', html => keepHyphenatedWordsWhole(html));
  eleventyConfig.addFilter('sortByTitle', sortByTitle);
  eleventyConfig.addFilter('tagNames', listTagNames);
  eleventyConfig.addFilter('recipeNamed', findRecipeNamed);
  eleventyConfig.addFilter('recipesThatUse', listRecipesThatUse);

  eleventyConfig.addCollection('recipes', collectionApi =>
    sortByTitle(collectionApi.getFilteredByGlob('recipes/*.cook'))
  );
}
