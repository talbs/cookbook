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

// Season only steers a first pick. "Send back" draws from everything the hour allows.
export function choosePick({ entries, hour, monthIndex, excludedUrl = null, random = Math.random }) {
  const { word, courses } = readDaypart(hour);
  const season = readSeason(monthIndex);

  const pool = [];
  const inSeasonPool = [];
  for (const entry of entries) {
    if (!courses.includes(entry.course)) continue;
    if (entry.url === excludedUrl) continue;
    pool.push(entry);
    if (entry.seasons.includes(season)) inSeasonPool.push(entry);
  }
  if (pool.length === 0) return null;

  const isFirstPick = excludedUrl === null;
  const choices = isFirstPick && inSeasonPool.length > 0 ? inSeasonPool : pool;
  const entry = choices[Math.floor(random() * choices.length)];
  return { entry, word, season, isInSeason: entry.seasons.includes(season) };
}
