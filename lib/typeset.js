const NO_BREAK_SPACE = ' ';
const NARROW_NO_BREAK_SPACE = ' ';

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function typesetWords(text) {
  const withRangeDashes = text.replace(/(\d)-(\d)/g, '$1–$2');
  // A number never ends a line apart from the word it counts ("6 corn tortillas", "2 tsp").
  const withGluedNumbers = withRangeDashes.replace(/(\d) (?=\S)/g, `$1${NO_BREAK_SPACE}`);
  const withMixedFractions = withGluedNumbers.replace(
    /(\d+) (\d+)\/(\d+)/g,
    `$1${NARROW_NO_BREAK_SPACE}<span class="fraction">$2/$3</span>`
  );
  return withMixedFractions.replace(/(^|[^\d>/])(\d+\/\d+)(?![\d/])/g, '$1<span class="fraction">$2</span>');
}

// Works on markup too: only the text between tags is changed.
export function typesetHtml(html) {
  return html
    .split(/(<[^>]*>)/)
    .map(segment => (segment.startsWith('<') ? segment : typesetWords(segment)))
    .join('');
}

// "flat-leaf parsley" should never break as "flat- / leaf parsley".
export function keepHyphenatedWordsWhole(html) {
  // A fraction is its own span, so "¼-inch" arrives split by tags; join it before the plain-text pass.
  const withFractionsJoined = String(html).replace(
    /(<span class="fraction">[^<]*<\/span>-[\p{L}\d]+(?:-[\p{L}\d]+)*)/gu,
    '<span class="wa-text-nowrap">$1</span>'
  );
  return withFractionsJoined
    .split(/(<[^>]*>)/)
    .map(segment =>
      segment.startsWith('<')
        ? segment
        : segment.replace(/[\p{L}\d]+(?:-[\p{L}\d]+)+/gu, word => `<span class="wa-text-nowrap">${word}</span>`)
    )
    .join('');
}

// Short ingredient names and notes wrap in narrow space; joining the last two words stops one being left alone.
export function keepLastWordsTogether(html) {
  const segments = String(html).split(/(<[^>]*>)/);
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (segment.startsWith('<')) continue;
    const lastSpace = segment.trimEnd().lastIndexOf(' ');
    if (lastSpace === -1) {
      if (segment.trim()) break;
      continue;
    }
    segments[index] = segment.slice(0, lastSpace) + NO_BREAK_SPACE + segment.slice(lastSpace + 1);
    break;
  }
  return segments.join('');
}

export function typesetText(text) {
  if (text === null || text === undefined) return '';
  return typesetHtml(escapeHtml(String(text)));
}
