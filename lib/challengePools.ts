import { COUNTRIES, COUNTRY_NAMES } from '@/lib/countries';
import { getDailySeed, seededRandom } from '@/lib/gameLogic';

const MICROSTATES = new Set([
  'Andorra',
  'Antigua and Barbuda',
  'Bahamas',
  'Barbados',
  'Comoros',
  'Dominica',
  'Grenada',
  'Kiribati',
  'Liechtenstein',
  'Maldives',
  'Malta',
  'Marshall Islands',
  'Mauritius',
  'Micronesia',
  'Monaco',
  'Nauru',
  'Palau',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Samoa',
  'San Marino',
  'Sao Tome and Principe',
  'Seychelles',
  'Singapore',
  'Tonga',
  'Tuvalu',
  'Vatican',
]);

// Manual set for common landlocked countries in current dataset.
const LANDLOCKED = new Set([
  'Afghanistan',
  'Andorra',
  'Armenia',
  'Austria',
  'Azerbaijan',
  'Belarus',
  'Bhutan',
  'Bolivia',
  'Botswana',
  'Burkina Faso',
  'Burundi',
  'Central African Republic',
  'Chad',
  'Czech Republic',
  'Ethiopia',
  'Hungary',
  'Kazakhstan',
  'Kosovo',
  'Kyrgyzstan',
  'Laos',
  'Lesotho',
  'Liechtenstein',
  'Luxembourg',
  'Macedonia',
  'Malawi',
  'Mali',
  'Moldova',
  'Mongolia',
  'Nepal',
  'Niger',
  'Paraguay',
  'Rwanda',
  'San Marino',
  'Serbia',
  'Slovakia',
  'South Sudan',
  'Swaziland',
  'Switzerland',
  'Tajikistan',
  'Turkmenistan',
  'Uganda',
  'Uzbekistan',
  'Vatican',
  'Zambia',
  'Zimbabwe',
]);

export function getCountriesBySuffix(suffix: string) {
  const lower = suffix.toLowerCase();
  return COUNTRY_NAMES.filter((name) => name.toLowerCase().endsWith(lower));
}

export function getOneNeighborCountries() {
  return COUNTRIES.filter((country) => country.neighbors.length === 1).map((country) => country.name);
}

export function getMicrostateCountries() {
  return COUNTRY_NAMES.filter((name) => MICROSTATES.has(name));
}

export function getLandlockedCountries() {
  return COUNTRY_NAMES.filter((name) => LANDLOCKED.has(name));
}

export function getDailyBossChallenge(date: Date = new Date()) {
  const seed = getDailySeed(date);
  const rng = seededRandom(seed);
  const pools: Array<{ key: string; title: string; countries: string[] }> = [
    { key: 'micro', title: 'Microstates Only', countries: getMicrostateCountries() },
    { key: 'stan', title: 'Countries ending with -stan', countries: getCountriesBySuffix('stan') },
    { key: 'one-neighbor', title: 'One-Neighbor Countries', countries: getOneNeighborCountries() },
    { key: 'landlocked', title: 'Landlocked Countries', countries: getLandlockedCountries() },
  ].filter((pool) => pool.countries.length >= 6);

  const picked = pools[Math.floor(rng() * pools.length)] ?? pools[0];
  return {
    ...picked,
    dateKey: date.toISOString().slice(0, 10),
  };
}

