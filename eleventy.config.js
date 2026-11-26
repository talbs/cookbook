import { minutesToIsoDuration } from './lib/json-ld.js';
import { loadRecipe } from './lib/recipe.js';
import { CARD_HEIGHT, CARD_WIDTH, describeShareCard, nameShareCard, writeShareCards } from './lib/share-card.js';
import { showPlainLetters, keepHyphenatedWordsWhole, keepLastWordsTogether, typesetText } from './lib/typeset.js';
import { COURSES, SEASON_NAMES, labelCourse, listTagNames } from './lib/validate-recipe.js';
import site from './site/_data/site.json' with { type: 'json' };

const COURSE_HEADINGS = {
  main: 'Mains',
  side: 'Sides',
  dessert: 'Desserts',
  breakfast: 'Breakfast',
  drink: 'Drinks',
  condiment: 'Condiments',
};
// Tags that say how a recipe is cooked. Seasons come from the validator's list, family tags from FAMILY_TAG_NAMES; every other tag names a kind of dish.
const METHOD_TAGS = [
  'air-fryer',
  'baking',
  'canning',
  'griddle',
  'grill',
  'make-ahead',
  'one-pan',
  'one-pot',
  'pressure-cooker',
  'sheet-pan',
  'sous-vide',
  'stir-fry',
];
const FAMILY_TAG_NAMES = {
  'auntie-jeanie': 'Auntie Jeanie',
  'aunt-mel': 'Aunt Mel',
  michelle: 'Michelle',
  mimi: 'Mimi',
};
const RECIPE_PATH_PATTERN = /^\.\/recipes\/[^/]+\.cook$/;

// A title as words of single letters, so each letter can move on its own without a word ever breaking in two.
// A hyphen ends a word with no space after it, which lets a long compound still wrap at its hyphen.
function splitTitleIntoWords(title) {
  const words = [];
  for (const spaced of title.split(/\s+/)) {
    const pieces = spaced.split(/(?<=-)/);
    pieces.forEach((piece, index) => {
      words.push({ letters: [...piece], hasSpaceAfter: index === pieces.length - 1 });
    });
  }
  return words;
}

function measureLongestWord(words) {
  return Math.max(...words.map(word => word.letters.length));
}

function listMostCountedFirst(countsByName) {
  return [...countsByName].sort(
    ([firstName, firstCount], [secondName, secondCount]) => secondCount - firstCount || firstName.localeCompare(secondName)
  );
}

// The tags that most often share a recipe with this one, most shared first.
function listRelatedTags(recipes, tag) {
  const sharedCounts = new Map();
  for (const item of recipes) {
    for (const otherTag of item.data.tags) {
      if (otherTag !== tag) sharedCounts.set(otherTag, (sharedCounts.get(otherTag) ?? 0) + 1);
    }
  }
  return listMostCountedFirst(sharedCounts)
    .slice(0, 3)
    .map(([name]) => name);
}

function sortByTitle(items) {
  return [...items].sort((first, second) => first.data.title.localeCompare(second.data.title));
}

function groupByCourse(recipes) {
  const recipesByCourse = new Map(COURSES.map(course => [course, []]));
  for (const item of recipes) {
    recipesByCourse.get(item.data.course).push(item);
  }

  const groups = [];
  for (const [course, courseRecipes] of recipesByCourse) {
    if (courseRecipes.length > 0) {
      groups.push({ course, heading: COURSE_HEADINGS[course], recipes: courseRecipes });
    }
  }
  return groups;
}

function listSeasonTags(tags) {
  return tags.filter(tag => SEASON_NAMES.includes(tag));
}

function isFamilyTag(tag) {
  return Object.hasOwn(FAMILY_TAG_NAMES, tag);
}

function labelTag(tag) {
  return isFamilyTag(tag) ? FAMILY_TAG_NAMES[tag] : tag;
}

function listFamilyTags(tags) {
  return tags.filter(isFamilyTag);
}

function listTagsOtherThanFamily(tags) {
  return tags.filter(tag => !isFamilyTag(tag));
}

function nameTagKind(tag) {
  if (isFamilyTag(tag)) return 'Family';
  if (SEASON_NAMES.includes(tag)) return 'Seasons';
  if (METHOD_TAGS.includes(tag)) return 'Methods';
  return 'Dishes';
}

function groupTagsByKind(collections) {
  const tagsByKind = new Map([
    ['Dishes', []],
    ['Methods', []],
    ['Seasons', []],
    ['Family', []],
  ]);
  for (const name of listTagNames(collections)) {
    const recipes = collections[name];
    const onlyRecipe = recipes.length === 1 ? recipes[0] : null;
    tagsByKind.get(nameTagKind(name)).push({
      name,
      count: recipes.length,
      url: onlyRecipe ? onlyRecipe.url : `/tags/${name}/`,
      onlyRecipeTitle: onlyRecipe ? onlyRecipe.data.title : null,
    });
  }

  const groups = [];
  for (const [heading, tags] of tagsByKind) {
    if (tags.length > 0) groups.push({ heading, tags });
  }
  return groups;
}

function findRecipeNamed(recipes, recipeName) {
  return recipes.find(item => item.fileSlug === recipeName);
}

function countRecipeSources(recipes) {
  const countsByName = new Map();
  for (const item of recipes) {
    const name = item.data.source?.name;
    if (name) countsByName.set(name, (countsByName.get(name) ?? 0) + 1);
  }
  return listMostCountedFirst(countsByName).map(([name, count]) => ({ name, count }));
}

function listRecipesThatUse(recipes, recipeName) {
  return recipes.filter(item => item.data.linkedRecipeNames.includes(recipeName));
}

export default function (eleventyConfig) {
  eleventyConfig.setTemplateFormats(['njk', '11ty.js', 'cook']);
  eleventyConfig.ignores.add('test/**');
  eleventyConfig.addPassthroughCopy({ 'site/assets': 'assets' });
  eleventyConfig.addPassthroughCopy({ 'node_modules/tiny-tells/dist/tiny-tells.min.js': 'assets/vendor/tiny-tells.min.js' });
  eleventyConfig.addPassthroughCopy({ 'node_modules/hue-hop/dist/hue-hop.js': 'assets/vendor/hue-hop.js' });
  // The dev server would otherwise patch an open page in place, which resets what the page's scripts have set without running them again.
  eleventyConfig.setServerOptions({ domDiff: false, port: 4186 });

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
  eleventyConfig.addFilter('showPlainLetters', html => showPlainLetters(html));
  eleventyConfig.addFilter('sortByTitle', sortByTitle);
  eleventyConfig.addFilter('titleWords', splitTitleIntoWords);
  eleventyConfig.addFilter('longestWordLength', measureLongestWord);
  eleventyConfig.addFilter('relatedTags', listRelatedTags);
  eleventyConfig.addFilter('groupByCourse', groupByCourse);
  eleventyConfig.addFilter('tagNames', listTagNames);
  eleventyConfig.addFilter('seasonTags', listSeasonTags);
  eleventyConfig.addFilter('familyTags', listFamilyTags);
  eleventyConfig.addFilter('tagsOtherThanFamily', listTagsOtherThanFamily);
  eleventyConfig.addFilter('tagLabel', labelTag);
  eleventyConfig.addFilter('groupTagsByKind', groupTagsByKind);
  eleventyConfig.addFilter('recipeNamed', findRecipeNamed);
  eleventyConfig.addFilter('recipesThatUse', listRecipesThatUse);
  eleventyConfig.addFilter('recipeSources', countRecipeSources);

  eleventyConfig.addCollection('recipes', collectionApi =>
    sortByTitle(collectionApi.getFilteredByGlob('recipes/*.cook'))
  );

  // Each page's layout asks for its card's address, which is how the build learns which cards to draw once the pages are written.
  const shareCardsByFileName = new Map();
  eleventyConfig.addGlobalData('shareCardSize', { width: CARD_WIDTH, height: CARD_HEIGHT });
  eleventyConfig.addShortcode('shareCardAddress', function () {
    const card = describeShareCard(this.ctx);
    const fileName = nameShareCard(card);
    shareCardsByFileName.set(fileName, card);
    return `${site.url}/share/${fileName}`;
  });
  eleventyConfig.on('eleventy.before', () => shareCardsByFileName.clear());
  eleventyConfig.on('eleventy.after', async ({ directories, outputMode }) => {
    const isWritingFiles = outputMode === 'fs';
    if (isWritingFiles) {
      await writeShareCards(shareCardsByFileName, `${directories.output}share`, { kitCode: site.iconKitCode, siteUrl: site.url });
    }
  });

  return { dir: { includes: 'site/_includes', data: 'site/_data' } };
}
