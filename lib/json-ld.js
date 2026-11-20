import { isBlank } from './validate-recipe.js';

export function minutesToIsoDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  let duration = 'PT';
  if (hours > 0) duration += `${hours}H`;
  if (remainingMinutes > 0 || hours === 0) duration += `${remainingMinutes}M`;
  return duration;
}

export function serializeForScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function buildSteps(section) {
  const steps = [];
  for (const block of section.blocks) {
    if (block.type !== 'steps') continue;
    for (const step of block.steps) {
      steps.push({ '@type': 'HowToStep', text: step.text.trim() });
    }
  }
  return steps;
}

function buildInstructions(recipe, title) {
  const isOneUnnamedSection = recipe.sections.length === 1 && !recipe.sections[0].name;
  if (isOneUnnamedSection) return buildSteps(recipe.sections[0]);

  return recipe.sections
    .map(section => ({
      '@type': 'HowToSection',
      name: section.name || title,
      itemListElement: buildSteps(section),
    }))
    .filter(section => section.itemListElement.length > 0);
}

export function findTotalMinutes(meta) {
  if (meta.timeMinutes !== null) return meta.timeMinutes;
  if (meta.prepMinutes === null && meta.cookMinutes === null) return null;
  return (meta.prepMinutes ?? 0) + (meta.cookMinutes ?? 0);
}

export function buildRecipeJsonLd(recipe, meta) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: meta.title,
    description: meta.description,
  };

  if (meta.images.length > 0) jsonLd.image = meta.images;
  if (!isBlank(meta.course)) jsonLd.recipeCategory = meta.course;
  if (!isBlank(meta.cuisine)) jsonLd.recipeCuisine = meta.cuisine;
  if (meta.tags.length > 0) jsonLd.keywords = meta.tags.join(', ');

  const recipeYield = !isBlank(meta.yield) ? meta.yield : meta.servings;
  if (!isBlank(recipeYield)) jsonLd.recipeYield = String(recipeYield);

  if (meta.prepMinutes !== null) jsonLd.prepTime = minutesToIsoDuration(meta.prepMinutes);
  if (meta.cookMinutes !== null) jsonLd.cookTime = minutesToIsoDuration(meta.cookMinutes);
  if (meta.longestMinutes !== null) jsonLd.totalTime = minutesToIsoDuration(meta.longestMinutes);

  jsonLd.recipeIngredient = recipe.ingredients.map(ingredient => ingredient.text);
  jsonLd.recipeInstructions = buildInstructions(recipe, meta.title);

  if (recipe.cookware.length > 0) jsonLd.tool = recipe.cookware.map(cookware => cookware.text);
  if (!isBlank(meta.source?.url)) jsonLd.isBasedOn = meta.source.url;

  const authorName = !isBlank(meta.author) ? meta.author : meta.source?.author;
  if (!isBlank(authorName)) jsonLd.author = { '@type': 'Person', name: authorName };

  return jsonLd;
}
