import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
  CooklangParser,
  cookware_display_name,
  cookware_should_be_listed,
  grouped_quantity_is_empty,
  ingredient_display_name,
  ingredient_is_optional,
  ingredient_should_be_listed,
} from '@cooklang/cooklang';
import { formatGroupedQuantity, formatQuantity, formatTotal } from './quantity.js';
import { buildRecipeJsonLd, serializeForScript } from './json-ld.js';
import { findRecipeProblems, splitReport } from './validate-recipe.js';

// markdown-it ships inside 11ty; borrowing its copy keeps the project at two dependencies.
const markdownIt = createRequire(import.meta.resolve('@11ty/eleventy'))('markdown-it');
const markdown = markdownIt();

const INLINE_QUANTITIES_EXTENSION = 1 << 7;
const parser = new CooklangParser();
// Inline quantities rewrite "350°F (175°C)." in step text, dropping the degree sign and the full stop.
parser.extensions = parser.extensions & ~INLINE_QUANTITIES_EXTENSION;

function describeMention(ingredient) {
  const words = [];
  if (ingredient.quantity) words.push(formatQuantity(ingredient.quantity));
  words.push(ingredient_display_name(ingredient));
  if (ingredient_is_optional(ingredient)) words.push('(optional)');
  if (ingredient.note) words.push(`(${ingredient.note})`);
  return words.join(' ');
}

function listMeasuredMentions(ingredient, recipe) {
  const mentions = [
    ingredient,
    ...ingredient.relation.relation.referenced_from.map(index => recipe.ingredients[index]),
  ];
  return mentions.filter(mention => mention.quantity);
}

function describeMergedIngredient(ingredient, recipe) {
  const measuredMentions = listMeasuredMentions(ingredient, recipe);
  const isMeasuredInOnePlace = measuredMentions.length <= 1;
  const words = [];
  if (measuredMentions.length === 1) {
    words.push(formatQuantity(measuredMentions[0].quantity));
  } else if (measuredMentions.length > 1) {
    words.push(formatTotal(measuredMentions.map(mention => mention.quantity)));
  }
  words.push(ingredient_display_name(ingredient));
  if (ingredient_is_optional(ingredient)) words.push('(optional)');
  if (ingredient.note && isMeasuredInOnePlace) words.push(`(${ingredient.note})`);
  return words.join(' ');
}

function describeCookware(cookware, groupedQuantity) {
  const words = [];
  if (!grouped_quantity_is_empty(groupedQuantity)) words.push(formatGroupedQuantity(groupedQuantity));
  words.push(cookware_display_name(cookware));
  if (cookware.note) words.push(`(${cookware.note})`);
  return words.join(' ');
}

function shapeStep(step, recipe) {
  const words = [];
  const ingredients = [];
  for (const item of step.items) {
    if (item.type === 'text') words.push(item.value);
    if (item.type === 'ingredient') {
      const ingredient = recipe.ingredients[item.index];
      words.push(ingredient_display_name(ingredient));
      ingredients.push(describeMention(ingredient));
    }
    if (item.type === 'cookware') words.push(cookware_display_name(recipe.cookware[item.index]));
    if (item.type === 'timer') {
      const timer = recipe.timers[item.index];
      if (timer.quantity) words.push(formatQuantity(timer.quantity));
    }
  }
  return { number: step.number, text: words.join(''), ingredients };
}

function shapeSection(section, recipe) {
  const blocks = [];
  for (const content of section.content) {
    const previousBlock = blocks.at(-1);
    if (content.type === 'text') {
      // Each "> " line arrives as its own note, so a list written across several lines would split into one box per item.
      if (previousBlock?.type === 'note') {
        previousBlock.markdown += `\n\n${content.value}`;
      } else {
        blocks.push({ type: 'note', markdown: content.value });
      }
      continue;
    }
    const step = shapeStep(content.value, recipe);
    if (previousBlock?.type === 'steps') {
      previousBlock.steps.push(step);
    } else {
      blocks.push({ type: 'steps', steps: [step] });
    }
  }
  for (const block of blocks) {
    if (block.type === 'note') block.html = markdown.render(block.markdown);
  }
  return { name: section.name, blocks };
}

function parseRecipe(inputPath, source) {
  try {
    return parser.parse(source);
  } catch (error) {
    throw new Error(
      `${inputPath}: parser error: ${error.message} (the parser crashed; look for a mark with no amount, like ~rest or @{1%cup})`
    );
  }
}

function readYieldQuantities(yieldValue) {
  const quantities = [];
  for (const value of [yieldValue].flat()) {
    const isAmountAndUnit = typeof value === 'string' && value.includes('%');
    if (typeof value !== 'number' && !isAmountAndUnit) return null;
    const [probe] = parser.parse(`@yield{${value}}`);
    const quantity = probe.ingredients[0]?.quantity;
    if (!quantity || quantity.value.type === 'text') return null;
    quantities.push(quantity);
  }
  return quantities;
}

function readSource(recipe) {
  if (!recipe.source) return null;
  const rawSource = recipe.rawMetadata.get('source');
  const url = recipe.source.url ?? null;
  const name = recipe.source.name ?? new URL(url).hostname.replace(/^www\./, '');
  const author = typeof rawSource === 'object' ? (rawSource.author ?? null) : null;
  return { name, url, author };
}

function readTimes(recipe) {
  if (typeof recipe.time === 'number') return { timeMinutes: recipe.time, prepMinutes: null, cookMinutes: null };
  return {
    timeMinutes: null,
    prepMinutes: recipe.time?.prep_time ?? null,
    cookMinutes: recipe.time?.cook_time ?? null,
  };
}

function readMetadata(recipe, yieldQuantities) {
  const metadata = recipe.rawMetadata;
  return {
    title: recipe.title,
    description: recipe.description,
    tags: [...(recipe.tags ?? [])],
    course: recipe.course ?? null,
    cuisine: recipe.cuisine ?? null,
    images: recipe.images ? [recipe.images].flat() : [],
    author: metadata.get('author') ?? null,
    source: readSource(recipe),
    adapted: metadata.get('adapted') === true,
    servings: metadata.get('servings') ?? null,
    yield: yieldQuantities ? yieldQuantities.map(formatQuantity).join(', ') : null,
    ...readTimes(recipe),
  };
}

// Cooklang 0.19.1 doesn't implement yield and warns on every value, even its own 24%bars form; the validator checks yield instead.
function isYieldWarning(warning) {
  return warning.includes("Unsupported value for key: 'yield'");
}

export function loadRecipe(inputPath) {
  const source = readFileSync(inputPath, 'utf8');
  const [recipe, report] = parseRecipe(inputPath, source);
  const metadata = recipe.rawMetadata;
  const yieldQuantities = metadata.has('yield') ? readYieldQuantities(metadata.get('yield')) : null;

  const { errors: parserErrors, warnings } = splitReport(report);
  const problems = findRecipeProblems({ inputPath, source, metadata, parserErrors, recipe, yieldQuantities });
  if (problems.length > 0) {
    throw new Error(problems.map(problem => `${inputPath}: ${problem}`).join('\n'));
  }

  for (const warning of warnings) {
    if (!isYieldWarning(warning)) console.warn(`${inputPath}: ${warning}`);
  }

  const meta = readMetadata(recipe, yieldQuantities);
  const view = {
    ingredients: recipe.groupedIngredients
      .filter(([ingredient]) => ingredient_should_be_listed(ingredient))
      .map(([ingredient]) => ({
        name: ingredient_display_name(ingredient),
        text: describeMergedIngredient(ingredient, recipe),
      })),
    cookware: recipe.groupedCookware
      .filter(([cookware]) => cookware_should_be_listed(cookware))
      .map(([cookware, groupedQuantity]) => describeCookware(cookware, groupedQuantity)),
    sections: recipe.sections.map(section => shapeSection(section, recipe)),
  };
  return { ...meta, recipe: view, jsonLd: serializeForScript(buildRecipeJsonLd(view, meta)) };
}
