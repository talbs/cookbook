import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import subsetFont from 'subset-font';

const TITLE_CHARACTERS =
  ' !"#$%&\'*,-./0123456789:;?@ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ¢‘’“”';

const BODY_CHARACTERS = [
  charactersFrom(0x20, 0x7e),
  // Latin-1: the accented letters of French, Spanish, Italian, German and Portuguese, plus °, ·, ×, ½ ¼ ¾ and the non-breaking space.
  charactersFrom(0xa0, 0xff),
  'ŒœŸ',
  '‘’‚“”„–—…',
  // Narrow non-breaking space, which the typesetting puts between a number and its unit.
  ' ',
  '⅓⅔⅛⅜⅝⅞⁄',
].join('');

const sourceFolder = join(homedir(), '.config', 'cookbook');

const titleFace = {
  source: join(sourceFolder, 'FreeLunch-Regular.otf'),
  output: 'assets/fonts/FreeLunch-Regular.woff2',
  characters: TITLE_CHARACTERS,
  keepFeatures: ['kern'],
};

const bodyFaces = [
  {
    source: join(sourceFolder, 'HankenGrotesk[wght].ttf'),
    output: 'assets/open-fonts/HankenGrotesk.woff2',
    characters: BODY_CHARACTERS,
    weightRange: { min: 400, max: 800 },
  },
  {
    source: join(sourceFolder, 'AncizarSerif[wght].ttf'),
    output: 'assets/open-fonts/AncizarSerif.woff2',
    characters: BODY_CHARACTERS,
    weightRange: { min: 400, max: 700 },
  },
];

function charactersFrom(first, last) {
  let characters = '';
  for (let code = first; code <= last; code++) {
    characters += String.fromCodePoint(code);
  }
  return characters;
}

async function makeFont({ source, output, characters, keepFeatures, weightRange }) {
  const original = await readFile(source);
  const variationAxes = weightRange ? { wght: weightRange } : undefined;
  const subset = await subsetFont(original, characters, { targetFormat: 'woff2', keepFeatures, variationAxes });
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, subset);
  console.log(`${output}: ${subset.length.toLocaleString('en-US')} bytes`);
}

for (const face of bodyFaces) {
  if (existsSync(face.source)) {
    await makeFont(face);
  } else {
    console.log(`Skipped ${basename(face.output)}: no source at ${face.source}`);
  }
}

if (!existsSync(titleFace.source)) {
  console.error(`Free Lunch not found. Put your licensed copy at ${titleFace.source} and run this again.`);
  process.exit(1);
}

await makeFont(titleFace);
