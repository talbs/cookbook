const SEASON_BY_MONTH = [
  'winter', 'winter', 'spring', 'spring', 'spring', 'early-summer',
  'midsummer', 'late-summer', 'fall', 'fall', 'fall', 'winter',
];

export function readDaypart(hour) {
  if (hour >= 5 && hour < 11) return { word: 'morning', courses: ['breakfast', 'drink'] };
  if (hour >= 11 && hour < 17) return { word: 'afternoon', courses: ['main', 'side'] };
  if (hour >= 17 && hour < 21) return { word: 'evening', courses: ['main', 'side'] };
  return { word: 'night', courses: ['dessert'] };
}

export function readSeason(monthIndex) {
  return SEASON_BY_MONTH[monthIndex];
}

const DAY_IN_MS = 86400000;

function hashText(text) {
  let hash = 0;
  for (const character of text) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash;
}

// Hours before 5am still belong to last night, so the night's pick holds past midnight.
// Counting days in UTC keeps a daylight-saving switch from skipping or repeating one.
function readDayNumber(date) {
  const dayNumber = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_IN_MS;
  return date.getHours() < 5 ? dayNumber - 1 : dayNumber;
}

export function choosePick({ entries, date }) {
  const { word, courses } = readDaypart(date.getHours());
  const season = readSeason(date.getMonth());

  const pool = [];
  const inSeasonPool = [];
  for (const entry of entries) {
    if (!courses.includes(entry.course)) continue;
    pool.push(entry);
    if (entry.seasons.includes(season)) inSeasonPool.push(entry);
  }
  const choices = inSeasonPool.length > 0 ? inSeasonPool : pool;
  if (choices.length === 0) return null;

  const walkOrder = [...choices].sort((a, b) => hashText(a.url) - hashText(b.url));
  const eveningOffset = word === 'evening' ? Math.ceil(walkOrder.length / 2) : 0;
  const entry = walkOrder[(readDayNumber(date) + eveningOffset) % walkOrder.length];
  return { entry, word, season, isInSeason: entry.seasons.includes(season) };
}

export function chooseSurprise({ entries, excludedUrl, random = Math.random }) {
  const choices = entries.filter((entry) => entry.url !== excludedUrl);
  if (choices.length === 0) return null;
  return choices[Math.floor(random() * choices.length)];
}
