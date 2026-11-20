import { registerCodeGrammar } from 'https://ka-p.webawesome.com/kit/62ebb3c856194bf8/webawesome@3.15.0/webawesome.js';

const dialog = document.querySelector('.source-dialog');
const highlighter = dialog.querySelector('wa-code-highlighter');
const fileLink = document.querySelector('.file-link');

const AMOUNT_PATTERN = '(\\{)([^}]*)(\\})';

function matchMark(sigil, nameScope) {
  const captures = {
    1: { name: 'punctuation.definition.cooklang' },
    2: { name: nameScope },
    3: { name: 'punctuation.definition.cooklang' },
    4: { name: 'variable.other.amount.cooklang' },
    5: { name: 'punctuation.definition.cooklang' },
  };
  return [
    { match: `(${sigil}[&?+-]?)([^@#~{}\\n]*?)${AMOUNT_PATTERN}`, captures },
    { match: `(${sigil}[&?+-]?)([\\w-]+)`, captures },
  ];
}

function registerCooklangGrammar() {
  registerCodeGrammar('cooklang', {
    scopeName: 'source.cooklang',
    patterns: [
      {
        begin: '^---\\s*$',
        end: '^---\\s*$',
        beginCaptures: { 0: { name: 'punctuation.definition.cooklang' } },
        endCaptures: { 0: { name: 'punctuation.definition.cooklang' } },
        patterns: [{ match: '^\\s*(?:- )?[\\w-]+(?=:)', name: 'entity.name.property.cooklang' }],
      },
      { begin: '\\[-', end: '-\\]', name: 'comment.block.cooklang' },
      { match: '^>.*$', name: 'comment.block.note.cooklang' },
      { match: '--.*$', name: 'comment.line.cooklang' },
      { match: '^=+.*$', name: 'keyword.control.section.cooklang' },
      ...matchMark('@', 'entity.name.function.cooklang'),
      ...matchMark('#', 'entity.name.type.cooklang'),
      ...matchMark('~', 'constant.numeric.timer.cooklang'),
    ],
  });
}

async function showSourceDialog() {
  if (!highlighter.code) {
    const response = await fetch(fileLink.href);
    if (!response.ok) throw new Error(`${fileLink.href}: ${response.status}`);
    highlighter.code = await response.text();
  }
  dialog.open = true;
}

// Setting the language before its grammar is registered makes the highlighter fetch a grammar file that doesn't exist.
registerCooklangGrammar();
highlighter.language = 'cooklang';

fileLink.addEventListener('click', async event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  try {
    await showSourceDialog();
  } catch {
    location.href = fileLink.href;
  }
});
