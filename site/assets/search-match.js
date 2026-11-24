// Lowercase with accents removed, so "jalapeno" finds "Jalapeños".
export function simplify(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function prepareEntries(entries) {
  const prepared = [];
  for (const entry of entries) {
    const words = [entry.title, entry.description, entry.course ?? '', ...entry.tags, ...entry.ingredients];
    prepared.push({
      ...entry,
      simpleTitle: simplify(entry.title),
      simpleIngredients: entry.ingredients.map(simplify),
      simpleTags: entry.tags.map(simplify),
      searchText: simplify(words.join(' ')),
    });
  }
  return prepared;
}

function splitIntoTerms(query) {
  return simplify(query).split(/\s+/).filter(Boolean);
}

function explainMatch(entry, terms) {
  for (const term of terms) {
    if (entry.simpleTitle.includes(term)) continue;
    const ingredientIndex = entry.simpleIngredients.findIndex(name => name.includes(term));
    if (ingredientIndex !== -1) return `has ${entry.ingredients[ingredientIndex]}`;
    const tagIndex = entry.simpleTags.findIndex(name => name.includes(term));
    if (tagIndex !== -1) return `tagged ${entry.tags[tagIndex].replaceAll('-', ' ')}`;
    return '';
  }
  return '';
}

export function findMatches(prepared, query) {
  const terms = splitIntoTerms(query);
  if (terms.length === 0) return [];
  const titleMatches = [];
  const otherMatches = [];
  for (const entry of prepared) {
    if (!terms.every(term => entry.searchText.includes(term))) continue;
    const isTitleMatch = terms.every(term => entry.simpleTitle.includes(term));
    if (isTitleMatch) titleMatches.push({ entry, reason: '' });
    else otherMatches.push({ entry, reason: explainMatch(entry, terms) });
  }
  return [...titleMatches, ...otherMatches];
}
