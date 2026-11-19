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
import { formatDuration, formatGroupedQuantity, formatQuantity, formatTotal, timerMinutes } from './quantity.js';
import { typesetHtml } from './typeset.js';
import { buildRecipeJsonLd, findTotalMinutes, serializeForScript } from './json-ld.js';
import { findLinkedRecipePath, findRecipeProblems, splitReport } from './validate-recipe.js';

// markdown-it ships inside 11ty; borrowing its copy keeps the project at two dependencies.
const markdownIt = createRequire(import.meta.resolve('@11ty/eleventy'))('markdown-it');
const markdown = markdownIt();

const INLINE_QUANTITIES_EXTENSION = 1 << 7;
const parser = new CooklangParser();
// Inline quantities rewrite "350°F (175°C)." in step text, dropping the degree sign and the full stop.
parser.extensions = parser.extensions & ~INLINE_QUANTITIES_EXTENSION;

function nameIngredient(ingredient, linkedTitles) {
  const linkedTitle = ingredient.reference ? linkedTitles.get(ingredient.reference.name) : null;
  if (linkedTitle && !ingredient.alias) return linkedTitle;
  return ingredient_display_name(ingredient);
}

function buildIngredientLine({ ingredient, amount, note, linkedTitles }) {
  const name = nameIngredient(ingredient, linkedTitles);
  const isOptional = ingredient_is_optional(ingredient);
  const details = [];
  if (isOptional) details.push('(optional)');
  if (note) details.push(`(${note})`);
  const text = [amount, name, ...details].filter(Boolean).join(' ');
  return { amount, name, note, isOptional, text, linkedRecipeName: ingredient.reference?.name ?? null };
}

function nameSection(section) {
  return section.name || 'Directions';
}

function buildStepId(sectionIndex, stepNumber) {
  return `step-${sectionIndex + 1}-${stepNumber}`;
}

function listSteps(recipe) {
  const steps = [];
  recipe.sections.forEach((section, sectionIndex) => {
    for (const content of section.content) {
      if (content.type === 'step') steps.push({ step: content.value, section, sectionIndex });
    }
  });
  return steps;
}

// Where each ingredient mention and each piece of cookware first appears, so a repeat can say "from step 3".
function findLocations(recipe) {
  const ingredientLocations = new Map();
  const cookwareFirstUses = new Map();
  for (const { step, section, sectionIndex } of listSteps(recipe)) {
    const location = { sectionIndex, sectionName: nameSection(section), stepNumber: step.number };
    for (const item of step.items) {
      if (item.type === 'ingredient') ingredientLocations.set(item.index, location);
      if (item.type !== 'cookware') continue;
      const cookwareName = cookware_display_name(recipe.cookware[item.index]);
      if (!cookwareFirstUses.has(cookwareName)) cookwareFirstUses.set(cookwareName, location);
    }
  }
  return { ingredientLocations, cookwareFirstUses };
}

function describeRepeatSource(ingredient, sectionIndex, ingredientLocations) {
  const isRepeat = ingredient.relation.relation.type === 'reference';
  if (!isRepeat || ingredient.quantity) return null;
  const firstUse = ingredientLocations.get(ingredient.relation.relation.references_to);
  const isSameSection = firstUse.sectionIndex === sectionIndex;
  const place = isSameSection ? `step ${firstUse.stepNumber}` : `${firstUse.sectionName}, step ${firstUse.stepNumber}`;
  return { label: `from ${place}`, stepId: buildStepId(firstUse.sectionIndex, firstUse.stepNumber) };
}

function describeMention(ingredient, sectionIndex, linkedTitles, ingredientLocations) {
  const amount = ingredient.quantity ? formatQuantity(ingredient.quantity) : null;
  const line = buildIngredientLine({ ingredient, amount, note: ingredient.note, linkedTitles });
  line.repeatSource = describeRepeatSource(ingredient, sectionIndex, ingredientLocations);
  return line;
}

function listMeasuredMentions(ingredient, recipe) {
  const mentions = [
    ingredient,
    ...ingredient.relation.relation.referenced_from.map(index => recipe.ingredients[index]),
  ];
  return mentions.filter(mention => mention.quantity);
}

// Beside a total, a part of the note that is itself an amount ("1 cup") describes one use, not the sum, so it is left out.
export function trimNoteForTotal(note) {
  if (!note) return null;
  const partsThatAreNotAmounts = note
    .split(',')
    .map(part => part.trim())
    .filter(part => part !== '' && !/^\d/.test(part));
  if (partsThatAreNotAmounts.length === 0) return null;
  return partsThatAreNotAmounts.join(', ');
}

function describeMergedIngredient(ingredient, recipe, linkedTitles, ingredientLocations) {
  const measuredMentions = listMeasuredMentions(ingredient, recipe);
  const isMeasuredInOnePlace = measuredMentions.length <= 1;
  let amount = null;
  if (measuredMentions.length === 1) {
    amount = formatQuantity(measuredMentions[0].quantity);
  } else if (measuredMentions.length > 1) {
    amount = formatTotal(measuredMentions.map(mention => mention.quantity));
  }
  const note = isMeasuredInOnePlace ? ingredient.note : trimNoteForTotal(ingredient.note);
  const line = buildIngredientLine({ ingredient, amount, note, linkedTitles });
  const firstUse = ingredientLocations.get(recipe.ingredients.indexOf(ingredient));
  line.firstUseStepId = buildStepId(firstUse.sectionIndex, firstUse.stepNumber);
  line.firstUseSectionIndex = firstUse.sectionIndex;
  return line;
}

function describeCookware(cookware, groupedQuantity, cookwareFirstUses) {
  const name = cookware_display_name(cookware);
  const words = [];
  if (!grouped_quantity_is_empty(groupedQuantity)) words.push(formatGroupedQuantity(groupedQuantity));
  words.push(name);
  if (cookware.note) words.push(`(${cookware.note})`);

  const location = cookwareFirstUses.get(name);
  const isFirstSection = location.sectionIndex === 0;
  const place = isFirstSection ? `step ${location.stepNumber}` : `${location.sectionName}, step ${location.stepNumber}`;
  const firstUse = { label: place, stepId: buildStepId(location.sectionIndex, location.stepNumber) };
  return { name, text: words.join(' '), firstUse };
}

// Timers the cook walks away from. A step with one is followed by a wait marker in Cook.
const HANDS_OFF_TIMER_NAMES = new Set(['bake', 'roast', 'rest', 'chill', 'cool', 'soak', 'thaw', 'set', 'pressure', 'sous vide']);

// The longest hands-off timer in a step, as the time the marker shows, or null when the step has none.
export function findWait(timers) {
  let longest = null;
  for (const timer of timers) {
    if (!HANDS_OFF_TIMER_NAMES.has(timer.name)) continue;
    if (!longest || timer.minutes > longest.minutes) longest = timer;
  }
  return longest ? longest.label : null;
}

function shapeStep(step, sectionIndex, recipe, linkedTitles, ingredientLocations) {
  const parts = [];
  const ingredients = [];
  const timers = [];
  for (const item of step.items) {
    if (item.type === 'text') parts.push({ type: 'text', value: item.value });
    if (item.type === 'ingredient') {
      const ingredient = recipe.ingredients[item.index];
      parts.push({ type: 'ingredient', value: nameIngredient(ingredient, linkedTitles) });
      ingredients.push(describeMention(ingredient, sectionIndex, linkedTitles, ingredientLocations));
    }
    if (item.type === 'cookware') {
      parts.push({ type: 'cookware', value: cookware_display_name(recipe.cookware[item.index]) });
    }
    if (item.type === 'timer') {
      const timer = recipe.timers[item.index];
      if (timer.quantity) {
        parts.push({ type: 'timer', value: formatQuantity(timer.quantity) });
        const label = abbreviateTimeUnits(formatQuantity(timer.quantity));
        timers.push({ name: timer.name, minutes: timerMinutes(timer.quantity)?.max ?? 0, label });
      }
    }
  }
  const text = parts.map(part => part.value).join('');
  return { number: step.number, id: buildStepId(sectionIndex, step.number), text, parts, ingredients, wait: findWait(timers) };
}

function shapeSection(section, sectionIndex, recipe, linkedTitles, ingredientLocations) {
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
    const step = shapeStep(content.value, sectionIndex, recipe, linkedTitles, ingredientLocations);
    if (previousBlock?.type === 'steps') {
      previousBlock.steps.push(step);
    } else {
      blocks.push({ type: 'steps', steps: [step] });
    }
  }
  for (const block of blocks) {
    if (block.type !== 'note') continue;
    block.html = typesetHtml(markdown.render(block.markdown));
    const { title, rest } = splitNoteTitle(block.markdown);
    block.titleHtml = typesetHtml(markdown.renderInline(title));
    block.bodyHtml = rest ? typesetHtml(markdown.render(rest)) : '';
    // A note that is all title has nothing to unfold, so it shows as a plain line.
    block.isShort = rest === '';
  }
  return { name: section.name, title: nameSection(section), blocks: attachNotesToSteps(blocks) };
}

// A note's title is the bold title it opens with ("**Fingertip tight** — ..."), or else its own first sentence,
// so the cook can tell whether it's worth opening. The title stays on show when the note opens, so the body
// is only what follows it.
export function splitNoteTitle(noteMarkdown) {
  const writtenTitle = noteMarkdown.trim().match(/^\*\*(.+?)\*\*\s*(?:[—–-]\s*)?/);
  if (writtenTitle) {
    return { title: writtenTitle[1], rest: noteMarkdown.trim().slice(writtenTitle[0].length).trim() };
  }
  const firstParagraph = noteMarkdown.trim().split(/\n\s*\n/)[0];
  const title = firstSentence(firstParagraph);
  const rest = noteMarkdown.trim().slice(title.length).trim();
  return { title, rest };
}

function firstSentence(text) {
  const sentence = text.match(/^.*?[.!?](?=\s|$)/);
  return sentence ? sentence[0] : text;
}

// A plain note right after a step belongs to that step, so it renders inside it (beside the step's
// ingredients in Cook mode) and the steps on either side stay one list.
function attachNotesToSteps(blocks) {
  const attached = [];
  for (const block of blocks) {
    const previousBlock = attached.at(-1);
    if (block.type === 'note' && previousBlock?.type === 'steps') {
      const step = previousBlock.steps.at(-1);
      step.notes = [...(step.notes ?? []), { titleHtml: block.titleHtml, bodyHtml: block.bodyHtml, isShort: block.isShort }];
      continue;
    }
    if (block.type === 'steps' && previousBlock?.type === 'steps') {
      previousBlock.steps.push(...block.steps);
      continue;
    }
    attached.push(block);
  }
  return attached;
}

// Plain notes before the first step are prep (what you need, how to scale it), so they leave the method for the planning column.
function takeLeadNotes(firstSection) {
  if (!firstSection) return [];
  const leadNotes = [];
  while (firstSection.blocks[0]?.type === 'note') {
    leadNotes.push(firstSection.blocks.shift().html);
  }
  return leadNotes;
}

export function abbreviateTimeUnits(text) {
  return text.replace(/\bhours?\b/g, 'hr').replace(/\bminutes?\b/g, 'min').replace(/\bseconds?\b/g, 'sec');
}

// Totals are for planning, so they round: to the minute under 10 min, 5 min under an hour, 15 min under a day, the hour past that.
function roundForPlanning(minutes, round = Math.round) {
  const step = minutes < 10 ? 1 : minutes < 60 ? 5 : minutes < 24 * 60 ? 15 : 60;
  return Math.max(1, round(minutes / step) * step);
}

// A range whose ends sit within 10% of each other reads as one "about" figure.
export function formatTimeSummary(minMinutes, maxMinutes) {
  const isNarrow = maxMinutes - minMinutes <= maxMinutes * 0.1;
  if (isNarrow) {
    const rounded = roundForPlanning((minMinutes + maxMinutes) / 2);
    const isExact = minMinutes === maxMinutes && rounded === minMinutes;
    return abbreviateTimeUnits(`${isExact ? '' : 'about '}${formatDuration(rounded)}`);
  }
  // Day-long range ends round down: rounding up an hour reads as a different recipe from its "24–36 hr" step.
  const roundEnd = minutes => roundForPlanning(minutes, minutes >= 24 * 60 ? Math.floor : Math.round);
  const low = roundEnd(minMinutes);
  const high = roundEnd(maxMinutes);
  if (low === high) return abbreviateTimeUnits(`about ${formatDuration(low)}`);
  if (high < 60) return `${low}–${high} min`;
  if (low % 60 === 0 && high % 60 === 0) return `${low / 60}–${high / 60} hr`;
  return abbreviateTimeUnits(`${formatDuration(low)} – ${formatDuration(high)}`);
}

function sumMinutes(rows) {
  return {
    min: rows.reduce((sum, row) => sum + row.min, 0),
    max: rows.reduce((sum, row) => sum + row.max, 0),
  };
}

// Every timed step, grouped by section.
function readTiming(recipe) {
  const rows = [];
  for (const { step, section, sectionIndex } of listSteps(recipe)) {
    for (const item of step.items) {
      if (item.type !== 'timer') continue;
      const timer = recipe.timers[item.index];
      const minutes = timer.quantity ? timerMinutes(timer.quantity) : null;
      if (!minutes) continue;
      rows.push({ sectionIndex, sectionName: section.name, stepNumber: step.number, stepId: buildStepId(sectionIndex, step.number), name: timer.name, label: abbreviateTimeUnits(formatQuantity(timer.quantity)), ...minutes });
    }
  }
  if (rows.length === 0) return null;

  const sections = [];
  for (const row of rows) {
    if (sections.at(-1)?.sectionIndex !== row.sectionIndex) {
      sections.push({ sectionIndex: row.sectionIndex, name: row.sectionName, rows: [] });
    }
    sections.at(-1).rows.push(row);
  }
  for (const group of sections) {
    const subtotal = sumMinutes(group.rows);
    group.totalLabel = formatTimeSummary(subtotal.min, subtotal.max);
  }
  const total = sumMinutes(rows);
  return { totalLabel: formatTimeSummary(total.min, total.max), rows, sections, isGrouped: sections.some(group => group.name) };
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

function readLinkedTitles(inputPath, recipe) {
  const linkedTitles = new Map();
  for (const ingredient of recipe.ingredients) {
    if (!ingredient.reference) continue;
    const linkedName = ingredient.reference.name;
    if (linkedTitles.has(linkedName)) continue;
    const linkedPath = findLinkedRecipePath(inputPath, linkedName);
    const [linkedRecipe] = parseRecipe(linkedPath, readFileSync(linkedPath, 'utf8'));
    linkedTitles.set(linkedName, linkedRecipe.title);
  }
  return linkedTitles;
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
  const times = readTimes(recipe);
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
    whyItWorks: [metadata.get('why') ?? []].flat().map((reason) => typesetHtml(markdown.renderInline(String(reason)))),
    icons: [metadata.get('icons') ?? []].flat(),
    yield: yieldQuantities ? yieldQuantities.map(formatQuantity).join(', ') : null,
    ...times,
    totalMinutes: findTotalMinutes(times),
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
  const linkedTitles = readLinkedTitles(inputPath, recipe);
  const { ingredientLocations, cookwareFirstUses } = findLocations(recipe);
  const view = {
    ingredients: recipe.groupedIngredients
      .filter(([ingredient]) => ingredient_should_be_listed(ingredient))
      .map(([ingredient]) => describeMergedIngredient(ingredient, recipe, linkedTitles, ingredientLocations)),
    cookware: recipe.groupedCookware
      .filter(([cookware]) => cookware_should_be_listed(cookware))
      .map(([cookware, groupedQuantity]) => describeCookware(cookware, groupedQuantity, cookwareFirstUses)),
    sections: recipe.sections.map((section, sectionIndex) =>
      shapeSection(section, sectionIndex, recipe, linkedTitles, ingredientLocations)
    ),
    timing: readTiming(recipe),
  };
  view.leadNotes = takeLeadNotes(view.sections[0]);
  return { ...meta, linkedRecipeNames: [...linkedTitles.keys()], recipe: view, jsonLd: serializeForScript(buildRecipeJsonLd(view, meta)) };
}
