import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import subsetFont from 'subset-font';

const TITLE_CHARACTERS =
  ' !"#$%&\'*,-./0123456789:;?@ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ¢‘’“”';

const sourceFolder = join(homedir(), '.config', 'cookbook');

const titleFace = {
  source: join(sourceFolder, 'FreeLunch-Regular.otf'),
  output: 'assets/fonts/FreeLunch-Regular.woff2',
  characters: TITLE_CHARACTERS,
  keepFeatures: ['kern'],
};

async function makeFont({ source, output, characters, keepFeatures }) {
  const original = await readFile(source);
  const subset = await subsetFont(original, characters, { targetFormat: 'woff2', keepFeatures });
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, subset);
  console.log(`${output}: ${subset.length.toLocaleString('en-US')} bytes`);
}

if (!existsSync(titleFace.source)) {
  console.error(`Free Lunch not found. Put your licensed copy at ${titleFace.source} and run this again.`);
  process.exit(1);
}

await makeFont(titleFace);
