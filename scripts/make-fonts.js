import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import subsetFont from 'subset-font';
import { NARROW_NO_BREAK_SPACE, NO_BREAK_SPACE } from '../lib/typeset.js';

const TITLE_CHARACTERS = ` !"#$%&'*,-./0123456789:;?@ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz${NO_BREAK_SPACE}¢‘’“”`;

const BODY_CHARACTERS = [
  charactersFrom(0x20, 0x7e),
  // Latin-1: the accented letters of French, Spanish, Italian, German and Portuguese, plus °, ·, ×, ½ ¼ ¾ and the no-break space.
  charactersFrom(0xa0, 0xff),
  'ŒœŸ',
  '‘’‚“”„–—…',
  NARROW_NO_BREAK_SPACE,
].join('');

// The browser's defaults, plus the two number styles the stylesheet asks for: diagonal-fractions and tabular-nums.
const BODY_FEATURES = ['ccmp', 'locl', 'mark', 'mkmk', 'kern', 'liga', 'frac', 'numr', 'dnom', 'tnum'];

const sourceFolder = join(homedir(), '.config', 'cookbook');

const faces = [
  {
    source: join(sourceFolder, 'HankenGrotesk[wght].ttf'),
    output: 'site/assets/open-fonts/HankenGrotesk.woff2',
    characters: BODY_CHARACTERS,
    keepFeatures: BODY_FEATURES,
    variationAxes: { wght: { min: 400, max: 800 } },
  },
  {
    source: join(sourceFolder, 'AncizarSerif[wght].ttf'),
    output: 'site/assets/open-fonts/AncizarSerif.woff2',
    characters: BODY_CHARACTERS,
    keepFeatures: BODY_FEATURES,
    variationAxes: { wght: { min: 400, max: 700 } },
  },
  {
    source: join(sourceFolder, 'FreeLunch-Regular.otf'),
    output: 'site/assets/fonts/FreeLunch-Regular.woff2',
    characters: TITLE_CHARACTERS,
    keepFeatures: ['kern'],
    isRequired: true,
  },
];

function charactersFrom(first, last) {
  let characters = '';
  for (let code = first; code <= last; code++) {
    characters += String.fromCodePoint(code);
  }
  return characters;
}

async function makeFont({ source, output, characters, keepFeatures, variationAxes }) {
  const original = await readFile(source);
  const subset = await subsetFont(original, characters, { targetFormat: 'woff2', keepFeatures, variationAxes });
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, subset);
  console.log(`${output}: ${subset.length.toLocaleString('en-US')} bytes`);
}

for (const face of faces) {
  if (existsSync(face.source)) {
    await makeFont(face);
  } else if (face.isRequired) {
    console.error(`${face.source} not found. Put your licensed copy there and run this again.`);
    process.exit(1);
  } else {
    console.log(`Skipped ${face.output}: no source at ${face.source}`);
  }
}
