export function normalizeCountryName(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return base
    .replace(/\bunited states of america\b/g, 'united states')
    .replace(/\bunited kingdom of great britain and northern ireland\b/g, 'united kingdom')
    .replace(/\brepublic of serbia\b/g, 'serbia')
    .replace(/\bunited republic of tanzania\b/g, 'tanzania')
    .replace(/\beswatini\b/g, 'swaziland')
    .replace(/\bcabo verde\b/g, 'cape verde')
    .replace(/\bsaint\b/g, 'st')
    .replace(/\brepublic of the congo\b/g, 'republic congo')
    .replace(/\brepublic of congo\b/g, 'republic congo')
    .replace(/\bdemocratic republic of the congo\b/g, 'dr congo')
    .replace(/\bdemocratic republic of congo\b/g, 'dr congo')
    .replace(/\s+/g, ' ')
    .trim();
}

const MAP_ALIASES_LOCAL_TO_WORLD: Record<string, string> = {
  'Czech Republic': 'Czechia',
  Macedonia: 'North Macedonia',
  Swaziland: 'Eswatini',
  'Timor-Leste': 'East Timor',
  "Cote d'Ivoire": 'Ivory Coast',
  "Côte d'Ivoire": 'Ivory Coast',
  'Cote dIvoire': 'Ivory Coast',
  'Republic of the Congo': 'Republic of Congo',
  'Democratic Republic of the Congo': 'Democratic Republic of the Congo',
  Vatican: 'Vatican City',
  'Sao Tome and Principe': 'Sao Tome and Principe',
  Palestine: 'Palestine',
  'Cape Verde': 'Cabo Verde',
  Tanzania: 'United Republic of Tanzania',
  'United States': 'United States of America',
};

const GUESS_ALIASES_TO_LOCAL: Record<string, string> = {
  usa: 'United States',
  us: 'United States',
  'united states of america': 'United States',
  uk: 'United Kingdom',
  'ivory coast': "Côte d'Ivoire",
  czechia: 'Czech Republic',
  'north macedonia': 'Macedonia',
  eswatini: 'Swaziland',
  'east timor': 'Timor-Leste',
  drc: 'Democratic Republic of the Congo',
  'democratic republic of congo': 'Democratic Republic of the Congo',
  'dem rep congo': 'Democratic Republic of the Congo',
  'congo kinshasa': 'Democratic Republic of the Congo',
  'republic of congo': 'Republic of the Congo',
  'republic of the congo': 'Republic of the Congo',
  'congo brazzaville': 'Republic of the Congo',
  congo: 'Republic of the Congo',
  'vatican city': 'Vatican',
  'united republic of tanzania': 'Tanzania',
  'tanzania united republic of': 'Tanzania',
  'cape verde': 'Cape Verde',
  'cabo verde': 'Cape Verde',
  'st lucia': 'Saint Lucia',
  'st. lucia': 'Saint Lucia',
  'st kitts and nevis': 'Saint Kitts and Nevis',
  'st. kitts and nevis': 'Saint Kitts and Nevis',
  'st vincent and the grenadines': 'Saint Vincent and the Grenadines',
  'st. vincent and the grenadines': 'Saint Vincent and the Grenadines',
  uae: 'United Arab Emirates',
  'u a e': 'United Arab Emirates',
  car: 'Central African Republic',
  'c a r': 'Central African Republic',
};

export function toWorldMapCountryName(localCountryName: string): string {
  return MAP_ALIASES_LOCAL_TO_WORLD[localCountryName] || localCountryName;
}

const WORLD_NAME_VARIANTS: Record<string, string[]> = {
  Tanzania: ['Tanzania', 'United Republic of Tanzania'],
  Swaziland: ['Swaziland', 'Eswatini', 'eSwatini'],
  'Republic of the Congo': ['Republic of the Congo', 'Republic of Congo', 'Congo', 'Congo Brazzaville'],
  'Democratic Republic of the Congo': [
    'Democratic Republic of the Congo',
    'Democratic Republic of Congo',
    'Dem Rep Congo',
    'Congo Kinshasa',
  ],
  'Cape Verde': ['Cape Verde', 'Cabo Verde'],
  'Sao Tome and Principe': ['Sao Tome and Principe', 'Sao Tome & Principe'],
  'United States': ['United States', 'United States of America', 'USA', 'US'],
  'United Kingdom': [
    'United Kingdom',
    'United Kingdom of Great Britain and Northern Ireland',
    'Great Britain',
    'UK',
    'Britain',
    'England',
    'Scotland',
    'Wales',
    'Northern Ireland',
  ],
  Serbia: ['Serbia', 'Republic of Serbia'],
  'Saint Lucia': ['Saint Lucia', 'St Lucia', 'St. Lucia'],
  'Saint Kitts and Nevis': ['Saint Kitts and Nevis', 'St Kitts and Nevis', 'St. Kitts and Nevis'],
  'Saint Vincent and the Grenadines': [
    'Saint Vincent and the Grenadines',
    'St Vincent and the Grenadines',
    'St. Vincent and the Grenadines',
  ],
  Kosovo: ['Kosovo', 'Republic of Kosovo'],
  'United Arab Emirates': ['United Arab Emirates', 'UAE', 'U.A.E.'],
  'Central African Republic': ['Central African Republic', 'CAR', 'C.A.R.'],
};

export function toWorldMapCountryNameVariants(localCountryName: string): string[] {
  const mapped = toWorldMapCountryName(localCountryName);
  const variants = WORLD_NAME_VARIANTS[localCountryName] ?? [];
  return Array.from(new Set([localCountryName, mapped, ...variants]));
}

export function buildCountryLookup(countryNames: string[]) {
  const lookup = new Map<string, string>();

  for (const name of countryNames) {
    lookup.set(normalizeCountryName(name), name);
    for (const variant of toWorldMapCountryNameVariants(name)) {
      lookup.set(normalizeCountryName(variant), name);
    }
  }

  for (const [alias, target] of Object.entries(GUESS_ALIASES_TO_LOCAL)) {
    if (countryNames.includes(target)) {
      lookup.set(normalizeCountryName(alias), target);
    }
  }

  return lookup;
}

export function resolveGuessToCountry(guess: string, lookup: Map<string, string>): string | null {
  const normalized = normalizeCountryName(guess);
  if (!normalized) return null;
  return lookup.get(normalized) ?? null;
}
