const TEASPOONS_PER_TABLESPOON = 3;
const TEASPOONS_PER_CUP = 48;
const OUNCES_PER_POUND = 16;
const MILLILITERS_PER_TEASPOON = 4.92892;
const GRAMS_PER_OUNCE = 28.3495;

// size is in tsp for volume, ml for metric volume, oz for mass and g for metric mass.
// mistakes are spellings Cooklang doesn't know, so the build points to the right one.
const UNITS = [
  { spellings: ['tsp', 'tsp.', 'teaspoon', 'teaspoons'], name: 'tsp', measure: 'volume', size: 1, mistakes: ['t'] },
  {
    spellings: ['tbsp', 'tbsp.', 'tbs', 'tbs.', 'tablespoon', 'tablespoons'],
    name: 'tbsp',
    measure: 'volume',
    size: TEASPOONS_PER_TABLESPOON,
    mistakes: ['T'],
  },
  {
    spellings: ['fl oz', 'fl. oz.', 'fl. oz', 'fl oz.', 'fluid ounce', 'fluid ounces'],
    name: 'fl oz',
    measure: 'volume',
    size: 6,
  },
  { spellings: ['c', 'cup', 'cups'], name: 'cup', plural: 'cups', measure: 'volume', size: TEASPOONS_PER_CUP },
  { spellings: ['pt', 'pint', 'pints'], name: 'pint', plural: 'pints', measure: 'volume', size: 96 },
  { spellings: ['qt', 'quart', 'quarts'], name: 'quart', plural: 'quarts', measure: 'volume', size: 192 },
  { spellings: ['gal', 'gallon', 'gallons'], name: 'gallon', plural: 'gallons', measure: 'volume', size: 768 },
  { spellings: ['ml', 'mL', 'milliliter', 'milliliters', 'millilitre'], name: 'ml', measure: 'metric volume', size: 1 },
  { spellings: ['l', 'L', 'liter', 'liters', 'litre', 'litres'], name: 'l', measure: 'metric volume', size: 1000 },
  { spellings: ['mg'], name: 'mg', measure: 'metric mass', size: 0.001 },
  { spellings: ['g', 'gram', 'grams'], name: 'g', measure: 'metric mass', size: 1 },
  { spellings: ['kg', 'kilogram', 'kilograms'], name: 'kg', measure: 'metric mass', size: 1000 },
  { spellings: ['oz', 'oz.', 'ounce', 'ounces'], name: 'oz', measure: 'mass', size: 1 },
  {
    spellings: ['lb', 'lb.', 'pound', 'pounds'],
    name: 'lb',
    measure: 'mass',
    size: OUNCES_PER_POUND,
    mistakes: ['lbs'],
  },
  { spellings: ['s', 'sec', 'secs', 'second', 'seconds'], name: 'second', plural: 'seconds', minutes: 1 / 60 },
  { spellings: ['min', 'mins', 'minute', 'minutes'], name: 'minute', plural: 'minutes', minutes: 1 },
  { spellings: ['h', 'hour', 'hours'], name: 'hour', plural: 'hours', mistakes: ['hr', 'hrs'], minutes: 60 },
  { spellings: ['d', 'day', 'days'], name: 'day', plural: 'days', minutes: 24 * 60 },
  { spellings: ['in', '"', 'inch', 'inches'], name: 'inch', plural: 'inches' },
  { spellings: ['can', 'cans'], name: 'can', plural: 'cans' },
];

const NICE_CUP_FRACTIONS = [0, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4];
const COMMON_DENOMINATORS = [2, 3, 4, 8];
const CLOSE_ENOUGH = 0.01;
const CLOSE_ENOUGH_IN_CUPS = CLOSE_ENOUGH / TEASPOONS_PER_CUP;

function findUnit(spelling) {
  return UNITS.find(unit => unit.spellings.includes(spelling));
}

export function findIntendedUnit(spelling) {
  if (findUnit(spelling)) return null;
  const mistakenUnit = UNITS.find(unit => unit.mistakes?.includes(spelling));
  if (mistakenUnit) return mistakenUnit.name;
  const lowercaseSpelling = spelling.toLowerCase();
  return findUnit(lowercaseSpelling) ? lowercaseSpelling : null;
}

function formatFraction(whole, numerator, denominator) {
  if (numerator === 0) return String(whole);
  if (whole === 0) return `${numerator}/${denominator}`;
  return `${whole} ${numerator}/${denominator}`;
}

function findCommonFraction(number) {
  const whole = Math.floor(number);
  const remainder = number - whole;
  if (remainder < CLOSE_ENOUGH) return { whole, numerator: 0, denominator: 1 };
  if (remainder > 1 - CLOSE_ENOUGH) return { whole: whole + 1, numerator: 0, denominator: 1 };
  for (const denominator of COMMON_DENOMINATORS) {
    const numerator = Math.round(remainder * denominator);
    if (Math.abs(remainder - numerator / denominator) < CLOSE_ENOUGH) return { whole, numerator, denominator };
  }
  return null;
}

// Cooks measure in halves, thirds, quarters and eighths, so 1.125 prints as 1 1/8.
function formatDecimal(number) {
  const fraction = findCommonFraction(number);
  if (!fraction) return String(Number(number.toFixed(2)));
  return formatFraction(fraction.whole, fraction.numerator, fraction.denominator);
}

function toDecimal(number) {
  if (number.type === 'fraction') {
    const { whole, num, den } = number.value;
    return whole + num / den;
  }
  return number.value;
}

function formatNumber(number) {
  if (number.type === 'fraction') {
    const { whole, num, den } = number.value;
    return formatFraction(whole, num, den);
  }
  return formatDecimal(number.value);
}

function withUnit(amountText, isPlural, unitSpelling) {
  const unit = findUnit(unitSpelling);
  if (!unit) return `${amountText} ${unitSpelling}`;
  const name = isPlural && unit.plural ? unit.plural : unit.name;
  return `${amountText} ${name}`;
}

export function formatQuantity(quantity) {
  const { value, unit } = quantity;
  let amountText;
  let isPlural;
  if (value.type === 'text') {
    amountText = value.value;
    isPlural = false;
  } else if (value.type === 'range') {
    amountText = `${formatNumber(value.value.start)}–${formatNumber(value.value.end)}`;
    isPlural = true;
  } else {
    amountText = formatNumber(value.value);
    isPlural = toDecimal(value.value) > 1;
  }
  if (!unit) return amountText;
  return withUnit(amountText, isPlural, unit);
}

function formatTeaspoons(teaspoons) {
  if (teaspoons < TEASPOONS_PER_TABLESPOON - CLOSE_ENOUGH) return `${formatDecimal(teaspoons)} tsp`;
  const tablespoons = Math.floor(teaspoons / TEASPOONS_PER_TABLESPOON + CLOSE_ENOUGH);
  const leftoverTeaspoons = teaspoons - tablespoons * TEASPOONS_PER_TABLESPOON;
  if (leftoverTeaspoons < CLOSE_ENOUGH) return `${tablespoons} tbsp`;
  return `${tablespoons} tbsp plus ${formatDecimal(leftoverTeaspoons)} tsp`;
}

function formatKitchenVolume(teaspoons) {
  const cups = teaspoons / TEASPOONS_PER_CUP;
  if (cups < 1 / 4 - CLOSE_ENOUGH_IN_CUPS) return formatTeaspoons(teaspoons);

  const wholeCups = Math.floor(cups + CLOSE_ENOUGH_IN_CUPS);
  let measuredCups = wholeCups;
  for (const fraction of NICE_CUP_FRACTIONS) {
    if (wholeCups + fraction <= cups + CLOSE_ENOUGH_IN_CUPS) measuredCups = wholeCups + fraction;
  }
  const cupText = withUnit(formatDecimal(measuredCups), measuredCups > 1, 'cup');

  const leftoverTeaspoons = teaspoons - measuredCups * TEASPOONS_PER_CUP;
  if (leftoverTeaspoons < CLOSE_ENOUGH) return cupText;
  const leftoverTablespoons = leftoverTeaspoons / TEASPOONS_PER_TABLESPOON;
  const isWholeTablespoons = Math.abs(leftoverTablespoons - Math.round(leftoverTablespoons)) < CLOSE_ENOUGH;
  const leftoverText = isWholeTablespoons
    ? `${Math.round(leftoverTablespoons)} tbsp`
    : `${formatDecimal(leftoverTeaspoons)} tsp`;
  return `${cupText} plus ${leftoverText}`;
}

function formatMetric(amount, smallUnit, largeUnit) {
  if (amount >= 1000) return `${formatDecimal(amount / 1000)} ${largeUnit}`;
  const rounded = amount >= 10 ? Math.round(amount) : Number(amount.toFixed(1));
  return `${rounded} ${smallUnit}`;
}

function formatOunces(ounces) {
  if (ounces < OUNCES_PER_POUND - CLOSE_ENOUGH) return `${formatDecimal(ounces)} oz`;
  const pounds = ounces / OUNCES_PER_POUND;
  if (findCommonFraction(pounds)) return `${formatDecimal(pounds)} lb`;
  const wholePounds = Math.floor(pounds);
  return `${wholePounds} lb plus ${formatDecimal(ounces - wholePounds * OUNCES_PER_POUND)} oz`;
}

function toTotalPart(quantity, unit, isMetricRecipe) {
  const amount = toDecimal(quantity.value.value);
  if (!quantity.unit) return { key: 'count', amount };
  if (!unit) return { key: quantity.unit, amount };
  if (unit.measure === 'volume' && isMetricRecipe.volume) {
    return { key: 'ml', amount: amount * unit.size * MILLILITERS_PER_TEASPOON };
  }
  if (unit.measure === 'volume') return { key: 'tsp', amount: amount * unit.size };
  if (unit.measure === 'metric volume') return { key: 'ml', amount: amount * unit.size };
  if (unit.measure === 'mass' && isMetricRecipe.mass) return { key: 'g', amount: amount * unit.size * GRAMS_PER_OUNCE };
  if (unit.measure === 'mass') return { key: 'oz', amount: amount * unit.size };
  if (unit.measure === 'metric mass') return { key: 'g', amount: amount * unit.size };
  return { key: unit.name, amount };
}

function formatTotalPart(key, amount) {
  if (key === 'tsp') return formatKitchenVolume(amount);
  if (key === 'ml') return formatMetric(amount, 'ml', 'l');
  if (key === 'g') return formatMetric(amount, 'g', 'kg');
  if (key === 'oz') return formatOunces(amount);
  if (key === 'count') return formatDecimal(amount);
  return withUnit(formatDecimal(amount), amount > 1, key);
}

// Cooklang's own totals pick odd units (1/2 cup plus 1/3 cup becomes 13 1/3 tbsp) and can drop small amounts, so totals are added here.
export function formatTotal(quantities) {
  const hasUnaddableAmount = quantities.some(quantity => quantity.value.type !== 'number');
  if (hasUnaddableAmount) return quantities.map(formatQuantity).join(' plus ');

  const units = quantities.map(quantity => (quantity.unit ? findUnit(quantity.unit) : null));
  const isMetricRecipe = {
    volume: units.some(unit => unit?.measure === 'metric volume'),
    mass: units.some(unit => unit?.measure === 'metric mass'),
  };

  const totals = new Map();
  quantities.forEach((quantity, index) => {
    const { key, amount } = toTotalPart(quantity, units[index], isMetricRecipe);
    totals.set(key, (totals.get(key) ?? 0) + amount);
  });

  const parts = [];
  for (const [key, amount] of totals) parts.push(formatTotalPart(key, amount));
  return parts.join(', ');
}

export function formatGroupedQuantity(groupedQuantity) {
  const quantities = [
    ...Object.values(groupedQuantity.known),
    ...Object.values(groupedQuantity.unknown),
    groupedQuantity.no_unit,
    ...groupedQuantity.other,
  ];
  const presentQuantities = quantities.filter(quantity => quantity);
  return presentQuantities.map(formatQuantity).join(', ');
}

// A timer's length as { min, max } minutes; null when the unit or amount can't be timed.
export function timerMinutes(quantity) {
  const minutesPerUnit = quantity.unit ? findUnit(quantity.unit)?.minutes : null;
  if (!minutesPerUnit || quantity.value.type === 'text') return null;
  if (quantity.value.type === 'range') {
    const { start, end } = quantity.value.value;
    return { min: toDecimal(start) * minutesPerUnit, max: toDecimal(end) * minutesPerUnit };
  }
  const minutes = toDecimal(quantity.value.value) * minutesPerUnit;
  return { min: minutes, max: minutes };
}

export function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const leftoverMinutes = minutes % 60;
  const parts = [];
  if (hours > 0) parts.push(withUnit(String(hours), hours > 1, 'hour'));
  if (leftoverMinutes > 0 || hours === 0)
    parts.push(withUnit(String(leftoverMinutes), leftoverMinutes !== 1, 'minute'));
  return parts.join(' ');
}
