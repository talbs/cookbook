import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { findIntendedUnit } from './quantity.js';
import { ICON_NAMES } from './icon-names.js';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ALLOWED_KEYS = [
  'title',
  'description',
  'tags',
  'course',
  'author',
  'source',
  'adapted',
  'servings',
  'yield',
  'time',
  'prep time',
  'cook time',
  'cuisine',
  'diet',
  'difficulty',
  'image',
  'locale',
  'why',
  'icons',
];
// Cooklang accepts these as other names for the same thing; one spelling keeps every page reading the same key.
const ALIASED_KEYS = {
  serves: 'servings',
  category: 'course',
  introduction: 'description',
  'time required': 'time',
  duration: 'time',
  images: 'image',
  picture: 'image',
  pictures: 'image',
};
export const RESERVED_TAGS = ['all', 'recipes'];
export const COURSES = ['main', 'side', 'dessert', 'breakfast', 'drink', 'condiment'];
export const SEASON_NAMES = ['spring', 'early-summer', 'midsummer', 'late-summer', 'fall', 'winter'];
export const YEAR_ROUND_TAG = 'year-round';
const WRONG_SEASON_WORDS = {
  summer: 'early-summer, midsummer or late-summer',
  autumn: 'fall',
  'mid-summer': 'midsummer',
  'early-fall': 'fall',
  'late-fall': 'fall',
  'all-year': 'year-round',
  'any-season': 'year-round',
};
const TEXT_KEYS = ['title', 'description', 'author', 'course', 'cuisine', 'difficulty', 'locale'];
const TEXT_OR_LIST_KEYS = ['diet', 'image', 'why'];
const SOURCE_TEXT_KEYS = ['name', 'url', 'author'];
const GLYPH_FRACTIONS = {
  '½': '1/2',
  '⅓': '1/3',
  '⅔': '2/3',
  '¼': '1/4',
  '¾': '3/4',
  '⅕': '1/5',
  '⅖': '2/5',
  '⅗': '3/5',
  '⅘': '4/5',
  '⅙': '1/6',
  '⅚': '5/6',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
};
const LINKED_RECIPE_MARK = /@[?&+-]*(\.{1,2}\/[\w/-]+)(.?)/g;
const GLYPH_IN_MARK = new RegExp(`\\{[^}]*?([${Object.keys(GLYPH_FRACTIONS).join('')}])[^}]*\\}`, 'u');

export function splitReport(report) {
  const plainText = report
    .replace(/<[^>]+>/g, '')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  const errors = [];
  const warnings = [];
  let currentList = null;
  let currentLines = [];

  function finishEntry() {
    if (currentList) currentList.push(currentLines.join('\n').trim());
  }

  for (const line of plainText.split('\n')) {
    if (line.startsWith('Error:') || line.startsWith('Warning:')) {
      finishEntry();
      currentList = line.startsWith('Error:') ? errors : warnings;
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }
  finishEntry();

  return { errors, warnings };
}

export function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function findMarkUnit(item, recipe) {
  if (item.type === 'ingredient') return recipe.ingredients[item.index].quantity?.unit;
  if (item.type === 'cookware') return recipe.cookware[item.index].quantity?.unit;
  if (item.type === 'timer') return recipe.timers[item.index].quantity?.unit;
  return null;
}

function findTimeProblems(metadata, recipe) {
  const hasTotalTime = metadata.has('time');
  const hasPartTimes = metadata.has('prep time') || metadata.has('cook time');
  if (hasTotalTime && hasPartTimes) return ['use time, or prep time and cook time, not both'];

  const problems = [];
  if (hasTotalTime && typeof recipe.time !== 'number') {
    problems.push(`time "${metadata.get('time')}" isn't a time the parser understands (try 1h30m)`);
  }
  for (const [key, field] of [
    ['prep time', 'prep_time'],
    ['cook time', 'cook_time'],
  ]) {
    if (metadata.has(key) && typeof recipe.time?.[field] !== 'number') {
      problems.push(`${key} "${metadata.get(key)}" isn't a time the parser understands (try 45m)`);
    }
  }
  return problems;
}

function findIconProblems(metadata) {
  if (!metadata.has('icons')) return ['missing icons'];

  const icons = metadata.get('icons');
  if (!Array.isArray(icons) || icons.length !== 3) return ['icons must list exactly three names'];

  const problems = [];
  const seenNames = new Set();
  for (const name of icons) {
    if (!ICON_NAMES.includes(name)) problems.push(`icon "${name}" isn't in lib/icon-names.js`);
    if (seenNames.has(name)) problems.push(`icon "${name}" is listed twice`);
    seenNames.add(name);
  }
  return problems;
}

function listSteps(recipe) {
  const steps = [];
  for (const section of recipe.sections) {
    for (const content of section.content) {
      if (content.type === 'step') steps.push(content.value);
    }
  }
  return steps;
}

function findRepeatsWithoutReference(recipe, steps) {
  const problems = [];
  const seenIngredients = new Set();
  const seenCookware = new Set();

  for (const step of steps) {
    for (const item of step.items) {
      if (item.type !== 'ingredient' && item.type !== 'cookware') continue;

      const isIngredient = item.type === 'ingredient';
      const component = isIngredient ? recipe.ingredients[item.index] : recipe.cookware[item.index];
      const relation = isIngredient ? component.relation.relation : component.relation;
      if (relation.type !== 'definition') continue;

      const seenNames = isIngredient ? seenIngredients : seenCookware;
      const nameKey = component.name.toLowerCase();
      if (seenNames.has(nameKey)) {
        const mark = isIngredient ? `@&${component.name}{...}` : `#&${component.name}{}`;
        problems.push(
          `"${component.name}" in step ${step.number} is mentioned again: write ${mark} so the list adds it up`
        );
      }
      seenNames.add(nameKey);
    }
  }

  return problems;
}

export function findLinkedRecipePath(inputPath, linkedName) {
  return join(dirname(inputPath), `${linkedName}.cook`);
}

function findLinkedRecipesWithoutBraces(source) {
  const problems = [];
  for (const [, writtenPath, nextCharacter] of source.matchAll(LINKED_RECIPE_MARK)) {
    const hasBracesOrAlias = nextCharacter === '{' || nextCharacter === '|';
    if (!hasBracesOrAlias) {
      problems.push(`linked recipe "${writtenPath}" needs {} after it: write @${writtenPath}{}`);
    }
  }
  return problems;
}

function findLinkedRecipeProblems(inputPath, recipe) {
  const problems = [];
  const ownName = basename(inputPath, '.cook');
  const checkedNames = new Set();

  for (const ingredient of recipe.ingredients) {
    if (!ingredient.reference) continue;

    const { name, components } = ingredient.reference;
    const writtenPath = [...components, name].join('/');
    if (checkedNames.has(writtenPath)) continue;
    checkedNames.add(writtenPath);

    const isNextToThisFile = components.length === 1 && components[0] === '.';
    if (!isNextToThisFile) {
      problems.push(`linked recipe "${writtenPath}" must be written @./${name}{} (recipes all sit in one folder)`);
    } else if (name === ownName) {
      problems.push(`linked recipe "${name}" is this recipe: a recipe can't link to itself`);
    } else if (!existsSync(findLinkedRecipePath(inputPath, name))) {
      problems.push(`linked recipe "${name}" doesn't exist: there is no ${name}.cook`);
    }
  }

  return problems;
}

export function findRecipeProblems({ inputPath, source, metadata, parserErrors, recipe, yieldQuantities }) {
  const problems = [];
  const steps = listSteps(recipe);

  if (!SLUG_PATTERN.test(basename(inputPath, '.cook'))) {
    problems.push('file name must be lowercase words joined by hyphens (it becomes the permanent URL)');
  }

  for (const error of parserErrors) {
    problems.push(`parser error: ${error}`);
  }

  if (isBlank(metadata.get('title'))) problems.push('missing title');
  if (isBlank(metadata.get('description'))) problems.push('missing description');
  if (isBlank(metadata.get('course'))) problems.push('missing course');

  for (const key of metadata.keys()) {
    if (ALIASED_KEYS[key])
      problems.push(
        `write ${ALIASED_KEYS[key]}, not ${key} (Cooklang reads both; this site reads ${ALIASED_KEYS[key]})`
      );
    else if (!ALLOWED_KEYS.includes(key)) problems.push(`unknown front matter key "${key}"`);
  }

  for (const key of TEXT_KEYS) {
    if (metadata.has(key) && typeof metadata.get(key) !== 'string') problems.push(`${key} must be text`);
  }

  for (const key of TEXT_OR_LIST_KEYS) {
    if (!metadata.has(key)) continue;
    const values = [metadata.get(key)].flat();
    if (!values.every(value => typeof value === 'string')) problems.push(`${key} must be text or a list of text`);
  }

  const course = metadata.get('course');
  if (typeof course === 'string' && !isBlank(course) && !COURSES.includes(course)) {
    problems.push(`course "${course}" must be one of ${COURSES.join(', ')}`);
  }

  const difficulty = metadata.get('difficulty');
  if (typeof difficulty === 'string' && difficulty !== 'easy') {
    problems.push(`difficulty "${difficulty}" must be easy, or left off`);
  }

  if (metadata.has('adapted') && typeof metadata.get('adapted') !== 'boolean') {
    problems.push('adapted must be true or false');
  }

  problems.push(...findTimeProblems(metadata, recipe));
  problems.push(...findIconProblems(metadata));

  if (metadata.has('yield') && !yieldQuantities) {
    problems.push(`yield "${metadata.get('yield')}" must be an amount and unit, like 24%bars`);
  }

  if (metadata.has('source')) {
    const recipeSource = metadata.get('source');
    const isMap = typeof recipeSource === 'object' && recipeSource !== null;
    const sourceName = isMap ? recipeSource.name : recipeSource;
    if (isBlank(sourceName)) {
      problems.push('source must have a name (source: { name: ..., url: ... })');
    } else if (isMap) {
      for (const key of SOURCE_TEXT_KEYS) {
        if (key in recipeSource && typeof recipeSource[key] !== 'string') problems.push(`source ${key} must be text`);
      }
    }
  }

  if (metadata.has('tags')) {
    const tags = metadata.get('tags');
    for (const tag of Array.isArray(tags) ? tags : [tags]) {
      if (!SLUG_PATTERN.test(String(tag))) problems.push(`tag "${tag}" must be lowercase words joined by hyphens`);
      if (RESERVED_TAGS.includes(String(tag))) problems.push(`tag "${tag}" is reserved by the site; pick another`);
      if (Object.hasOwn(WRONG_SEASON_WORDS, tag)) {
        problems.push(`tag "${tag}" isn't a season here: write ${WRONG_SEASON_WORDS[tag]}`);
      }
    }
  }

  const glyphMatch = source.match(GLYPH_IN_MARK);
  if (glyphMatch) {
    const glyph = glyphMatch[1];
    problems.push(`write ${GLYPH_FRACTIONS[glyph]}, not ${glyph} (the parser can't add up glyph fractions)`);
  }

  for (const step of steps) {
    for (const item of step.items) {
      if (item.type === 'timer' && isBlank(recipe.timers[item.index].name)) {
        problems.push(`timer in step ${step.number} has no name (write ~bake{20%minutes})`);
      }
      const unit = findMarkUnit(item, recipe);
      const intendedUnit = unit ? findIntendedUnit(unit) : null;
      if (intendedUnit) {
        problems.push(`unit "${unit}" in step ${step.number} isn't one Cooklang knows: write ${intendedUnit}`);
      }
    }
  }

  problems.push(...findRepeatsWithoutReference(recipe, steps));
  problems.push(...findLinkedRecipesWithoutBraces(source));
  problems.push(...findLinkedRecipeProblems(inputPath, recipe));

  if (steps.length === 0) problems.push('no steps');
  if (recipe.ingredients.length === 0) problems.push('no ingredients');

  return problems;
}
