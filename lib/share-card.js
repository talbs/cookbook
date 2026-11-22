import { Resvg } from '@resvg/resvg-js';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import satori from 'satori';
import subsetFont from 'subset-font';
import { labelCourse, listTagNames } from './validate-recipe.js';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

// Part of every card's name. Raise it when the drawing below changes, so every image is drawn again under a new address.
const LAYOUT_VERSION = 1;

const CACHE_FOLDER = '.cache/share-cards';
const TITLE_FONT_PATH = 'site/assets/fonts/FreeLunch-Regular.woff2';
const SANS_FONT_PATH = 'site/assets/open-fonts/HankenGrotesk.woff2';
const SERIF_FONT_PATH = 'site/assets/open-fonts/AncizarSerif.woff2';
// The release and style the site's own wa-icon asks the kit for.
const ICON_RELEASE = 'v7.3.0';
const ICON_STYLE = 'duotone-light';

const MARGIN = 80;
const MARGIN_BLOCK = 72;
const CONTENT_WIDTH = CARD_WIDTH - MARGIN * 2;
// A card is mostly seen at a quarter to half its size (a message bubble, a chat unfurl, a feed), so the site's measures are more than doubled:
// the smallest text is 32px, which is still 8px in the narrowest of those.
const DOT_PITCH = 14;
const DOT_RADIUS = 2.5;
const ICON_HEIGHT = 48;
const ICON_GAP = 24;
// Some icons draw a little past their own box (the coffee beans, the cow), which the browser shows and an image would cut off.
// Each one gets this much room on every side, in the icon's own 512-high units.
const ICON_OVERHANG = 32;
const ICON_SCALE = ICON_HEIGHT / 512;
const DOTS_SHORT_OF_ICONS = 3;
const ICONS_ON_A_CARD = 3;
// One gap between the kicker, title and description, and one between the rule and the line under it.
const GAP_IN_HEAD = 32;
const GAP_IN_FOOT = 28;
// Free Lunch's capitals start this far below the top of their line, as a share of the type size.
// The title is pulled up by it, so the gap under the kicker is measured to the letters themselves.
const TITLE_CAP_DROP = 0.155;
// Its letters also start a little inside their own left edge, which shows at these sizes beside the smaller text below.
const TITLE_SIDE_BEARING = 0.035;

// site.css's light values: paper, ink, accent and the quiet text grey. The dots are darker than the page's 22%, because they shrink with the card.
const COLORS = { paper: '#fefefc', ink: '#1f1e1c', accent: '#c8361c', quiet: '#5b5956', dots: '#a9a8a6' };
const ICON_FILL_STRENGTH = 0.16;

// Three sizes, close enough that cards read as one set. The first two keep a title on one line; the last lets a long one take two.
const TITLE_SIZES = [
  { maxLetters: 12, maxWordLetters: 12, size: 136 },
  { maxLetters: 20, maxWordLetters: 14, size: 104 },
  { maxLetters: Infinity, maxWordLetters: Infinity, size: 80 },
];

function countRecipes(count) {
  return `${count} ${count === 1 ? 'recipe' : 'recipes'}`;
}

// Three icons for a tag: the first of each recipe, then their seconds, until there are three different ones.
function pickTagIcons(tagRecipes) {
  const picked = [];
  for (let position = 0; position < ICONS_ON_A_CARD; position++) {
    for (const item of tagRecipes) {
      const name = item.data.icons[position];
      if (name && !picked.includes(name)) picked.push(name);
    }
  }
  return picked.slice(0, ICONS_ON_A_CARD);
}

export function describeShareCard(data) {
  const { site, collections } = data;

  if (data.recipe) {
    const portion = data.servings ? `Serves ${data.servings}` : data.yield ? `Makes ${data.yield}` : null;
    return {
      kicker: data.course ? labelCourse(data.course) : 'Recipe',
      title: data.title,
      description: data.description,
      siteName: site.title,
      facts: [portion, data.timeLabel].filter(Boolean).join('  ·  '),
      icons: data.icons.slice(0, ICONS_ON_A_CARD),
    };
  }

  if (data.tag) {
    const tagRecipes = collections[data.tag];
    return {
      kicker: 'Tag',
      title: data.tag,
      description: data.description,
      siteName: site.title,
      facts: countRecipes(tagRecipes.length),
      icons: pickTagIcons(tagRecipes),
    };
  }

  const title = data.title ?? site.title;
  const count = data.kickerCounts === 'tags' ? `${listTagNames(collections).length} tags` : countRecipes(collections.recipes.length);
  return {
    kicker: data.kicker ?? count,
    title,
    description: data.description ?? site.description,
    // A card whose title is already the site's name doesn't print it twice.
    siteName: title === site.title ? '' : site.title,
    facts: new URL(site.url).host,
    icons: [],
  };
}

// A card's name comes from everything drawn on it, so the same card is drawn once and a changed card gets a new address.
export function nameShareCard(card) {
  const cardHash = createHash('sha256')
    .update(JSON.stringify([LAYOUT_VERSION, card]))
    .digest('hex');
  return `${cardHash.slice(0, 12)}.png`;
}

function element(type, style, children) {
  return { type, props: { style, children } };
}

function image(source, width, height) {
  return { type: 'img', props: { src: source, width, height, style: { width, height } } };
}

function svgDataUri(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function pickTitleSize(title) {
  const wordLengths = title.split(/[\s-]+/).map(word => word.length);
  const longestWord = Math.max(...wordLengths);
  return TITLE_SIZES.find(step => title.length <= step.maxLetters && longestWord <= step.maxWordLetters).size;
}

// The title face has no ñ; the site shows its plain n instead, and so does the card.
function swapLettersTheTitleFontLacks(text) {
  return text.replaceAll('ñ', 'n').replaceAll('Ñ', 'N');
}

// The kit only answers requests that come from the site, so the build says which site it is building.
async function fetchIcon(name, { kitCode, siteUrl }) {
  const address = `https://ka-p.fontawesome.com/releases/${ICON_RELEASE}/svgs/${ICON_STYLE}/${name}.svg?token=${kitCode}`;
  const response = await fetch(address, { headers: { Referer: `${siteUrl}/` } });
  if (!response.ok) throw new Error(`Share cards: the icon "${name}" could not be fetched (${response.status})`);
  return response.text();
}

async function loadIcon(name, iconSource) {
  const cachedPath = join(CACHE_FOLDER, `${ICON_RELEASE}-${ICON_STYLE}-${name}.svg`);
  let svg;
  if (existsSync(cachedPath)) {
    svg = await readFile(cachedPath, 'utf8');
  } else {
    svg = await fetchIcon(name, iconSource);
    await writeFile(cachedPath, svg);
  }
  const [, boxWidth, boxHeight] = svg.match(/viewBox="0 0 (\S+) (\S+)"/).map(Number);
  const roomyWidth = boxWidth + ICON_OVERHANG * 2;
  const roomyHeight = boxHeight + ICON_OVERHANG * 2;
  const roomySvg = svg.replace(/viewBox="[^"]+"/, `viewBox="${-ICON_OVERHANG} ${-ICON_OVERHANG} ${roomyWidth} ${roomyHeight}"`);
  return { svg: roomySvg, width: Math.round(roomyWidth * ICON_SCALE), height: Math.round(roomyHeight * ICON_SCALE) };
}

async function loadIcons(cards, iconSource) {
  const names = [...new Set(cards.flatMap(card => card.icons))];
  const loaded = await Promise.all(names.map(name => loadIcon(name, iconSource)));
  return new Map(names.map((name, index) => [name, loaded[index]]));
}

// Satori reads plain TrueType and OpenType with one weight per file. The site's fonts are WOFF2, and the sans is one variable file.
async function loadFonts(cards) {
  const words = cards.map(card => Object.values(card).join(' ')).join(' ');
  // The ellipsis is what a description ends on when it runs past its two lines.
  const characters = `${words}${words.toUpperCase()}…`;
  const [sansFile, serifFile] = await Promise.all([readFile(SANS_FONT_PATH), readFile(SERIF_FONT_PATH)]);
  const [sans, sansBold, serif] = await Promise.all([
    subsetFont(sansFile, characters, { targetFormat: 'sfnt', variationAxes: { wght: 400 } }),
    subsetFont(sansFile, characters, { targetFormat: 'sfnt', variationAxes: { wght: 700 } }),
    subsetFont(serifFile, characters, { targetFormat: 'sfnt', variationAxes: { wght: 400 } }),
  ]);
  // The title font isn't in the repo. A build without it (a pull request's check) still draws cards, with the bold sans as the title.
  const hasTitleFont = existsSync(TITLE_FONT_PATH);
  let title = sansBold;
  if (hasTitleFont) {
    title = await subsetFont(await readFile(TITLE_FONT_PATH), characters, { targetFormat: 'sfnt' });
  }
  const fonts = [
    { name: 'Hanken Grotesk', data: sans, weight: 400 },
    { name: 'Hanken Grotesk', data: sansBold, weight: 700 },
    { name: 'Ancizar Serif', data: serif, weight: 400 },
    { name: 'Free Lunch', data: title, weight: 400 },
  ];
  return { fonts, hasTitleFont };
}

function drawIcon(icon) {
  const inked = icon.svg
    .replaceAll('opacity=".4" fill="currentColor"', `fill="${COLORS.ink}" fill-opacity="${ICON_FILL_STRENGTH}"`)
    .replaceAll('currentColor', COLORS.ink);
  return image(svgDataUri(inked), icon.width, icon.height);
}

function drawDots(spaceForDots) {
  const dotCount = Math.floor(spaceForDots / DOT_PITCH);
  const width = dotCount * DOT_PITCH;
  let circles = '';
  for (let index = 0; index < dotCount; index++) {
    const center = index * DOT_PITCH + DOT_PITCH / 2;
    circles += `<circle cx="${center}" cy="${DOT_PITCH / 2}" r="${DOT_RADIUS}" fill="${COLORS.dots}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${DOT_PITCH}" viewBox="0 0 ${width} ${DOT_PITCH}">${circles}</svg>`;
  return image(svgDataUri(svg), width, DOT_PITCH);
}

// With icons, the rule ends on them at the right edge, three dots short, as a recipe's does on the site.
function drawRule(iconNames, icons) {
  const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: ICON_HEIGHT };
  if (iconNames.length === 0) {
    return element('div', rowStyle, [drawDots(CONTENT_WIDTH)]);
  }

  // Each icon's box carries its extra room, so the gap between boxes and the row's right edge give that room back.
  const overhangOnCard = Math.round(ICON_OVERHANG * ICON_SCALE);
  const gapBetweenBoxes = ICON_GAP - overhangOnCard * 2;
  let iconsWidth = gapBetweenBoxes * (iconNames.length - 1) - overhangOnCard;
  for (const name of iconNames) {
    iconsWidth += icons.get(name).width;
  }
  const spaceForDots = CONTENT_WIDTH - iconsWidth - DOTS_SHORT_OF_ICONS * DOT_PITCH;
  const iconRow = element(
    'div',
    { display: 'flex', alignItems: 'center', gap: gapBetweenBoxes, marginRight: -overhangOnCard },
    iconNames.map(name => drawIcon(icons.get(name)))
  );
  return element('div', rowStyle, [drawDots(spaceForDots), iconRow]);
}

function drawCard(card, icons) {
  const title = swapLettersTheTitleFontLacks(card.title);
  const titleSize = pickTitleSize(title);
  const gapUnderKicker = GAP_IN_HEAD - Math.round(titleSize * TITLE_CAP_DROP);
  const head = [
    element(
      'div',
      { fontFamily: 'Hanken Grotesk', fontWeight: 700, fontSize: 28, lineHeight: 1, letterSpacing: '0.12em', textTransform: 'uppercase', color: COLORS.accent },
      card.kicker
    ),
    element(
      'div',
      { fontFamily: 'Free Lunch', fontSize: titleSize, lineHeight: 0.92, textTransform: 'uppercase', textWrap: 'balance', marginTop: gapUnderKicker, marginLeft: -Math.round(titleSize * TITLE_SIDE_BEARING) },
      title
    ),
    element(
      'div',
      { fontFamily: 'Ancizar Serif', fontSize: 36, lineHeight: 1.25, color: COLORS.quiet, lineClamp: 2, marginTop: GAP_IN_HEAD },
      card.description
    ),
  ];
  // The home card has no site name under its own title, so its address takes the left edge with everything else.
  const footParts = [element('div', { fontFamily: 'Hanken Grotesk', fontSize: 32, color: COLORS.quiet }, card.facts)];
  if (card.siteName) {
    footParts.unshift(element('div', { fontFamily: 'Free Lunch', fontSize: 40, textTransform: 'uppercase' }, card.siteName));
  }
  const foot = element('div', { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: GAP_IN_FOOT }, footParts);

  const page = element(
    'div',
    {
      position: 'absolute',
      top: MARGIN_BLOCK,
      left: MARGIN,
      width: CONTENT_WIDTH,
      height: CARD_HEIGHT - MARGIN_BLOCK * 2,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    },
    [
      element('div', { display: 'flex', flexDirection: 'column' }, head),
      element('div', { display: 'flex', flexDirection: 'column' }, [drawRule(card.icons, icons), foot]),
    ]
  );
  return element('div', { display: 'flex', width: CARD_WIDTH, height: CARD_HEIGHT, background: COLORS.paper, color: COLORS.ink }, [page]);
}

async function renderShareCard(card, { fonts, icons }) {
  const svg = await satori(drawCard(card, icons), { width: CARD_WIDTH, height: CARD_HEIGHT, fonts });
  return new Resvg(svg).render().asPng();
}

export async function writeShareCards(cardsByFileName, outputFolder, iconSource) {
  await mkdir(outputFolder, { recursive: true });
  await mkdir(CACHE_FOLDER, { recursive: true });

  const cardsToDraw = new Map();
  for (const [fileName, card] of cardsByFileName) {
    const cachedPath = join(CACHE_FOLDER, fileName);
    const outputPath = join(outputFolder, fileName);
    if (existsSync(cachedPath)) {
      // A name is a hash of the card, so a file already there under it is the same image.
      if (!existsSync(outputPath)) await copyFile(cachedPath, outputPath);
    } else {
      cardsToDraw.set(fileName, card);
    }
  }
  if (cardsToDraw.size === 0) return;

  const cards = [...cardsToDraw.values()];
  const [{ fonts, hasTitleFont }, icons] = await Promise.all([loadFonts(cards), loadIcons(cards, iconSource)]);
  if (!hasTitleFont) {
    console.warn(`Share cards: ${TITLE_FONT_PATH} is missing, so titles are drawn in the sans and nothing is cached.`);
  }
  for (const [fileName, card] of cardsToDraw) {
    const png = await renderShareCard(card, { fonts, icons });
    await writeFile(join(outputFolder, fileName), png);
    if (hasTitleFont) await writeFile(join(CACHE_FOLDER, fileName), png);
  }
  console.log(`Share cards: drew ${cardsToDraw.size}, reused ${cardsByFileName.size - cardsToDraw.size}`);
}
