import { minutesToIsoDuration } from './lib/json-ld.js';
import { loadRecipe } from './lib/recipe.js';
import { showPlainLetters, keepHyphenatedWordsWhole, keepLastWordsTogether, typesetText } from './lib/typeset.js';
import { COURSES, RESERVED_TAGS, SEASON_NAMES, YEAR_ROUND_TAG } from './lib/validate-recipe.js';

const COURSE_LABELS = { main: 'Main course', side: 'Side dish' };
const COURSE_HEADINGS = {
  main: 'Mains',
  side: 'Sides',
  dessert: 'Desserts',
  breakfast: 'Breakfast',
  drink: 'Drinks',
  condiment: 'Condiments',
};
// Tags that say how a recipe is cooked. Seasons come from the validator's list; every other tag names a kind of dish.
const METHOD_TAGS = [
  'baking',
  'canning',
  'grill',
  'make-ahead',
  'one-pan',
  'one-pot',
  'pressure-cooker',
  'sheet-pan',
  'sous-vide',
  'stir-fry',
];
const RECIPE_PATH_PATTERN = /^\.\/recipes\/[^/]+\.cook$/;

function labelCourse(course) {
  return COURSE_LABELS[course] ?? course.charAt(0).toUpperCase() + course.slice(1);
}

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

function listTagNames(collections) {
  return Object.keys(collections)
    .filter(name => !RESERVED_TAGS.includes(name))
    .sort();
}

function nameTagKind(tag) {
  if (SEASON_NAMES.includes(tag) || tag === YEAR_ROUND_TAG) return 'Seasons';
  if (METHOD_TAGS.includes(tag)) return 'Methods';
  return 'Dishes';
}

function groupTagsByKind(collections) {
  const tagsByKind = new Map([
    ['Dishes', []],
    ['Methods', []],
    ['Seasons', []],
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
  eleventyConfig.addFilter('groupTagsByKind', groupTagsByKind);
  eleventyConfig.addFilter('recipeNamed', findRecipeNamed);
  eleventyConfig.addFilter('recipesThatUse', listRecipesThatUse);
  eleventyConfig.addFilter('recipeSources', countRecipeSources);

  eleventyConfig.addCollection('recipes', collectionApi =>
    sortByTitle(collectionApi.getFilteredByGlob('recipes/*.cook'))
  );

  return { dir: { includes: 'site/_includes', data: 'site/_data' } };
}
