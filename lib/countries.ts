export interface Country {
  name: string;
  capital: string;
  neighbors: string[];
}

function repairMojibake(input: string): string {
  return input
    .replace(/\u00C3\u00A1/g, '\u00E1')
    .replace(/\u00C3\u00A9/g, '\u00E9')
    .replace(/\u00C3\u00AD/g, '\u00ED')
    .replace(/\u00C3\u00B3/g, '\u00F3')
    .replace(/\u00C3\u00BA/g, '\u00FA')
    .replace(/\u00C3\u00A3/g, '\u00E3')
    .replace(/\u00C3\u00B5/g, '\u00F5')
    .replace(/\u00C3\u00A7/g, '\u00E7')
    .replace(/\u00C3\u00B4/g, '\u00F4')
    .replace(/\u00C3\u00AB/g, '\u00EB')
    .replace(/\u00C3\u00BC/g, '\u00FC')
    .replace(/\u00C3\u00B1/g, '\u00F1')
    .replace(/\u00C5\u009F/g, '\u015F')
    .replace(/\u00C4\u0083/g, '\u0103');
}

export function normalizeText(input: string): string {
  return repairMojibake(input)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export const COUNTRIES: Country[] = [
  { name: 'Afghanistan', capital: 'Kabul', neighbors: ['Iran', 'Pakistan', 'Tajikistan', 'Turkmenistan', 'Uzbekistan'] },
  { name: 'Albania', capital: 'Tirana', neighbors: ['Greece', 'Macedonia', 'Montenegro', 'Serbia'] },
  { name: 'Algeria', capital: 'Algiers', neighbors: ['Libya', 'Mali', 'Mauritania', 'Morocco', 'Niger', 'Tunisia', 'Western Sahara'] },
  { name: 'Andorra', capital: 'Andorra la Vella', neighbors: ['France', 'Spain'] },
  { name: 'Angola', capital: 'Luanda', neighbors: ['Botswana', 'Democratic Republic of the Congo', 'Namibia', 'Zambia'] },
  { name: 'Antigua and Barbuda', capital: 'Saint John\'s', neighbors: [] },
  { name: 'Argentina', capital: 'Buenos Aires', neighbors: ['Bolivia', 'Brazil', 'Chile', 'Paraguay', 'Uruguay'] },
  { name: 'Armenia', capital: 'Yerevan', neighbors: ['Azerbaijan', 'Georgia', 'Iran', 'Turkey'] },
  { name: 'Australia', capital: 'Canberra', neighbors: [] },
  { name: 'Austria', capital: 'Vienna', neighbors: ['Czech Republic', 'Germany', 'Hungary', 'Italy', 'Liechtenstein', 'Slovakia', 'Slovenia', 'Switzerland'] },
  { name: 'Azerbaijan', capital: 'Baku', neighbors: ['Armenia', 'Georgia', 'Iran', 'Russia', 'Turkey'] },
  { name: 'Bahamas', capital: 'Nassau', neighbors: [] },
  { name: 'Bahrain', capital: 'Manama', neighbors: [] },
  { name: 'Bangladesh', capital: 'Dhaka', neighbors: ['India', 'Myanmar'] },
  { name: 'Barbados', capital: 'Bridgetown', neighbors: [] },
  { name: 'Belarus', capital: 'Minsk', neighbors: ['Latvia', 'Lithuania', 'Poland', 'Russia', 'Ukraine'] },
  { name: 'Belgium', capital: 'Brussels', neighbors: ['France', 'Germany', 'Luxembourg', 'Netherlands'] },
  { name: 'Belize', capital: 'Belmopan', neighbors: ['Guatemala', 'Mexico'] },
  { name: 'Benin', capital: 'Porto-Novo', neighbors: ['Burkina Faso', 'Niger', 'Nigeria', 'Togo'] },
  { name: 'Bhutan', capital: 'Thimphu', neighbors: ['China', 'India'] },
  { name: 'Bolivia', capital: 'La Paz', neighbors: ['Argentina', 'Brazil', 'Chile', 'Paraguay', 'Peru'] },
  { name: 'Bosnia and Herzegovina', capital: 'Sarajevo', neighbors: ['Croatia', 'Montenegro', 'Serbia'] },
  { name: 'Botswana', capital: 'Gaborone', neighbors: ['Angola', 'Namibia', 'South Africa', 'Zimbabwe'] },
  { name: 'Brazil', capital: 'Brasília', neighbors: ['Bolivia', 'Colombia', 'Guyana', 'Paraguay', 'Peru', 'Suriname', 'Uruguay', 'Venezuela'] },
  { name: 'Brunei', capital: 'Bandar Seri Begawan', neighbors: ['Indonesia', 'Malaysia'] },
  { name: 'Bulgaria', capital: 'Sofia', neighbors: ['Greece', 'Macedonia', 'Romania', 'Serbia', 'Turkey'] },
  { name: 'Burkina Faso', capital: 'Ouagadougou', neighbors: ['Benin', 'Côte d\'Ivoire', 'Ghana', 'Mali', 'Niger', 'Togo'] },
  { name: 'Burundi', capital: 'Gitega', neighbors: ['Democratic Republic of the Congo', 'Rwanda', 'Tanzania'] },
  { name: 'Cambodia', capital: 'Phnom Penh', neighbors: ['Laos', 'Thailand', 'Vietnam'] },
  { name: 'Cameroon', capital: 'Yaoundé', neighbors: ['Central African Republic', 'Chad', 'Equatorial Guinea', 'Gabon', 'Nigeria'] },
  { name: 'Canada', capital: 'Ottawa', neighbors: ['United States'] },
  { name: 'Cape Verde', capital: 'Praia', neighbors: [] },
  { name: 'Central African Republic', capital: 'Bangui', neighbors: ['Cameroon', 'Chad', 'Democratic Republic of the Congo', 'Republic of the Congo', 'South Sudan', 'Sudan'] },
  { name: 'Chad', capital: 'N\'Djamena', neighbors: ['Cameroon', 'Central African Republic', 'Libya', 'Niger', 'Nigeria', 'Sudan'] },
  { name: 'Chile', capital: 'Santiago', neighbors: ['Argentina', 'Bolivia', 'Peru'] },
  { name: 'China', capital: 'Beijing', neighbors: ['Afghanistan', 'Bhutan', 'India', 'Kazakhstan', 'Kyrgyzstan', 'Laos', 'Mongolia', 'Myanmar', 'Nepal', 'North Korea', 'Pakistan', 'Russia', 'Tajikistan', 'Vietnam'] },
  { name: 'Colombia', capital: 'Bogotá', neighbors: ['Brazil', 'Ecuador', 'Panama', 'Peru', 'Venezuela'] },
  { name: 'Comoros', capital: 'Moroni', neighbors: [] },
  { name: 'Republic of the Congo', capital: 'Brazzaville', neighbors: ['Angola', 'Cameroon', 'Central African Republic', 'Democratic Republic of the Congo', 'Equatorial Guinea', 'Gabon'] },
  { name: 'Costa Rica', capital: 'San José', neighbors: ['Nicaragua', 'Panama'] },
  { name: 'Côte d\'Ivoire', capital: 'Yamoussoukro', neighbors: ['Burkina Faso', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Liberia', 'Mali'] },
  { name: 'Croatia', capital: 'Zagreb', neighbors: ['Bosnia and Herzegovina', 'Hungary', 'Serbia', 'Slovenia'] },
  { name: 'Cuba', capital: 'Havana', neighbors: [] },
  { name: 'Cyprus', capital: 'Nicosia', neighbors: [] },
  { name: 'Czech Republic', capital: 'Prague', neighbors: ['Austria', 'Germany', 'Poland', 'Slovakia'] },
  { name: 'Democratic Republic of the Congo', capital: 'Kinshasa', neighbors: ['Angola', 'Burundi', 'Central African Republic', 'Republic of the Congo', 'Rwanda', 'South Sudan', 'Tanzania', 'Uganda', 'Zambia'] },
  { name: 'Denmark', capital: 'Copenhagen', neighbors: ['Germany'] },
  { name: 'Djibouti', capital: 'Djibouti', neighbors: ['Eritrea', 'Ethiopia', 'Somalia'] },
  { name: 'Dominica', capital: 'Roseau', neighbors: [] },
  { name: 'Dominican Republic', capital: 'Santo Domingo', neighbors: ['Haiti'] },
  { name: 'Ecuador', capital: 'Quito', neighbors: ['Colombia', 'Peru'] },
  { name: 'Egypt', capital: 'Cairo', neighbors: ['Israel', 'Libya', 'Palestine', 'Sudan'] },
  { name: 'El Salvador', capital: 'San Salvador', neighbors: ['Guatemala', 'Honduras'] },
  { name: 'Equatorial Guinea', capital: 'Malabo', neighbors: ['Cameroon', 'Gabon'] },
  { name: 'Eritrea', capital: 'Asmara', neighbors: ['Djibouti', 'Ethiopia', 'Sudan'] },
  { name: 'Estonia', capital: 'Tallinn', neighbors: ['Latvia', 'Russia'] },
  { name: 'Ethiopia', capital: 'Addis Ababa', neighbors: ['Djibouti', 'Eritrea', 'Kenya', 'Somalia', 'South Sudan', 'Sudan'] },
  { name: 'Fiji', capital: 'Suva', neighbors: [] },
  { name: 'Finland', capital: 'Helsinki', neighbors: ['Norway', 'Russia', 'Sweden'] },
  { name: 'France', capital: 'Paris', neighbors: ['Andorra', 'Belgium', 'Germany', 'Italy', 'Luxembourg', 'Monaco', 'Spain', 'Switzerland'] },
  { name: 'Gabon', capital: 'Libreville', neighbors: ['Cameroon', 'Republic of the Congo', 'Equatorial Guinea'] },
  { name: 'Gambia', capital: 'Banjul', neighbors: ['Senegal'] },
  { name: 'Georgia', capital: 'Tbilisi', neighbors: ['Armenia', 'Azerbaijan', 'Russia', 'Turkey'] },
  { name: 'Germany', capital: 'Berlin', neighbors: ['Austria', 'Belgium', 'Czech Republic', 'Denmark', 'France', 'Luxembourg', 'Netherlands', 'Poland'] },
  { name: 'Ghana', capital: 'Accra', neighbors: ['Benin', 'Burkina Faso', 'Côte d\'Ivoire', 'Togo'] },
  { name: 'Greece', capital: 'Athens', neighbors: ['Albania', 'Bulgaria', 'Macedonia', 'Turkey'] },
  { name: 'Grenada', capital: 'Saint George\'s', neighbors: [] },
  { name: 'Guatemala', capital: 'Guatemala City', neighbors: ['Belize', 'El Salvador', 'Honduras', 'Mexico'] },
  { name: 'Guinea', capital: 'Conakry', neighbors: ['Côte d\'Ivoire', 'Guinea-Bissau', 'Liberia', 'Mali', 'Senegal', 'Sierra Leone'] },
  { name: 'Guinea-Bissau', capital: 'Bissau', neighbors: ['Côte d\'Ivoire', 'Guinea', 'Senegal'] },
  { name: 'Guyana', capital: 'Georgetown', neighbors: ['Brazil', 'Suriname', 'Venezuela'] },
  { name: 'Haiti', capital: 'Port-au-Prince', neighbors: ['Dominican Republic'] },
  { name: 'Honduras', capital: 'Tegucigalpa', neighbors: ['Belize', 'El Salvador', 'Guatemala', 'Nicaragua'] },
  { name: 'Hungary', capital: 'Budapest', neighbors: ['Austria', 'Croatia', 'Romania', 'Serbia', 'Slovakia', 'Slovenia', 'Ukraine'] },
  { name: 'Iceland', capital: 'Reykjavik', neighbors: [] },
  { name: 'India', capital: 'New Delhi', neighbors: ['Bangladesh', 'Bhutan', 'China', 'Myanmar', 'Nepal', 'Pakistan'] },
  { name: 'Indonesia', capital: 'Jakarta', neighbors: ['Brunei', 'East Timor', 'Malaysia', 'Papua New Guinea'] },
  { name: 'Iran', capital: 'Tehran', neighbors: ['Afghanistan', 'Armenia', 'Azerbaijan', 'Iraq', 'Pakistan', 'Turkey', 'Turkmenistan'] },
  { name: 'Iraq', capital: 'Baghdad', neighbors: ['Iran', 'Israel', 'Jordan', 'Kuwait', 'Saudi Arabia', 'Syria', 'Turkey'] },
  { name: 'Ireland', capital: 'Dublin', neighbors: ['United Kingdom'] },
  { name: 'Israel', capital: 'Jerusalem', neighbors: ['Egypt', 'Jordan', 'Lebanon', 'Palestine', 'Syria'] },
  { name: 'Italy', capital: 'Rome', neighbors: ['Austria', 'France', 'San Marino', 'Slovenia', 'Switzerland', 'Vatican'] },
  { name: 'Jamaica', capital: 'Kingston', neighbors: [] },
  { name: 'Japan', capital: 'Tokyo', neighbors: [] },
  { name: 'Jordan', capital: 'Amman', neighbors: ['Iraq', 'Israel', 'Palestine', 'Saudi Arabia', 'Syria'] },
  { name: 'Kazakhstan', capital: 'Nur-Sultan', neighbors: ['China', 'Kyrgyzstan', 'Russia', 'Turkmenistan', 'Uzbekistan'] },
  { name: 'Kenya', capital: 'Nairobi', neighbors: ['Ethiopia', 'Somalia', 'South Sudan', 'Tanzania', 'Uganda'] },
  { name: 'Kiribati', capital: 'Tarawa', neighbors: [] },
  { name: 'North Korea', capital: 'Pyongyang', neighbors: ['China', 'Russia', 'South Korea'] },
  { name: 'South Korea', capital: 'Seoul', neighbors: ['North Korea'] },
  { name: 'Kuwait', capital: 'Kuwait City', neighbors: ['Iraq', 'Saudi Arabia'] },
  { name: 'Kyrgyzstan', capital: 'Bishkek', neighbors: ['China', 'Kazakhstan', 'Tajikistan', 'Uzbekistan'] },
  { name: 'Laos', capital: 'Vientiane', neighbors: ['Cambodia', 'China', 'Myanmar', 'Thailand', 'Vietnam'] },
  { name: 'Latvia', capital: 'Riga', neighbors: ['Belarus', 'Estonia', 'Lithuania', 'Russia'] },
  { name: 'Lebanon', capital: 'Beirut', neighbors: ['Israel', 'Syria'] },
  { name: 'Lesotho', capital: 'Maseru', neighbors: ['South Africa'] },
  { name: 'Liberia', capital: 'Monrovia', neighbors: ['Côte d\'Ivoire', 'Guinea', 'Sierra Leone'] },
  { name: 'Libya', capital: 'Tripoli', neighbors: ['Algeria', 'Chad', 'Niger', 'Sudan', 'Tunisia'] },
  { name: 'Liechtenstein', capital: 'Vaduz', neighbors: ['Austria', 'Switzerland'] },
  { name: 'Lithuania', capital: 'Vilnius', neighbors: ['Belarus', 'Latvia', 'Poland', 'Russia'] },
  { name: 'Luxembourg', capital: 'Luxembourg City', neighbors: ['Belgium', 'France', 'Germany'] },
  { name: 'Madagascar', capital: 'Antananarivo', neighbors: [] },
  { name: 'Malawi', capital: 'Lilongwe', neighbors: ['Mozambique', 'Tanzania', 'Zambia'] },
  { name: 'Malaysia', capital: 'Kuala Lumpur', neighbors: ['Brunei', 'Indonesia', 'Thailand'] },
  { name: 'Maldives', capital: 'Malé', neighbors: [] },
  { name: 'Mali', capital: 'Bamako', neighbors: ['Algeria', 'Burkina Faso', 'Côte d\'Ivoire', 'Guinea', 'Mauritania', 'Senegal'] },
  { name: 'Malta', capital: 'Valletta', neighbors: [] },
  { name: 'Marshall Islands', capital: 'Majuro', neighbors: [] },
  { name: 'Mauritania', capital: 'Nouakchott', neighbors: ['Algeria', 'Mali', 'Senegal', 'Western Sahara'] },
  { name: 'Mauritius', capital: 'Port Louis', neighbors: [] },
  { name: 'Mexico', capital: 'Mexico City', neighbors: ['Belize', 'Guatemala', 'United States'] },
  { name: 'Micronesia', capital: 'Palikir', neighbors: [] },
  { name: 'Moldova', capital: 'Chişinău', neighbors: ['Romania', 'Ukraine'] },
  { name: 'Monaco', capital: 'Monaco', neighbors: ['France'] },
  { name: 'Mongolia', capital: 'Ulan Bator', neighbors: ['China', 'Russia'] },
  { name: 'Montenegro', capital: 'Podgorica', neighbors: ['Albania', 'Bosnia and Herzegovina', 'Kosovo', 'Serbia'] },
  { name: 'Kosovo', capital: 'Pristina', neighbors: ['Albania', 'Macedonia', 'Montenegro', 'Serbia'] },
  { name: 'Morocco', capital: 'Rabat', neighbors: ['Algeria', 'Spain', 'Western Sahara'] },
  { name: 'Mozambique', capital: 'Maputo', neighbors: ['Malawi', 'South Africa', 'Tanzania', 'Zambia', 'Zimbabwe'] },
  { name: 'Myanmar', capital: 'Naypyidaw', neighbors: ['Bangladesh', 'China', 'India', 'Laos', 'Thailand'] },
  { name: 'Namibia', capital: 'Windhoek', neighbors: ['Angola', 'Botswana', 'South Africa'] },
  { name: 'Nauru', capital: 'Yaren', neighbors: [] },
  { name: 'Nepal', capital: 'Kathmandu', neighbors: ['China', 'India'] },
  { name: 'Netherlands', capital: 'Amsterdam', neighbors: ['Belgium', 'Germany'] },
  { name: 'New Zealand', capital: 'Wellington', neighbors: [] },
  { name: 'Nicaragua', capital: 'Managua', neighbors: ['Costa Rica', 'Honduras'] },
  { name: 'Niger', capital: 'Niamey', neighbors: ['Algeria', 'Benin', 'Burkina Faso', 'Chad', 'Libya', 'Mali', 'Nigeria'] },
  { name: 'Nigeria', capital: 'Abuja', neighbors: ['Benin', 'Cameroon', 'Chad', 'Niger'] },
  { name: 'Norway', capital: 'Oslo', neighbors: ['Finland', 'Russia', 'Sweden'] },
  { name: 'Oman', capital: 'Muscat', neighbors: ['Saudi Arabia', 'United Arab Emirates', 'Yemen'] },
  { name: 'Pakistan', capital: 'Islamabad', neighbors: ['Afghanistan', 'China', 'India', 'Iran'] },
  { name: 'Palau', capital: 'Ngerulmud', neighbors: [] },
  { name: 'Palestine', capital: 'Ramallah', neighbors: ['Egypt', 'Israel', 'Jordan'] },
  { name: 'Panama', capital: 'Panama City', neighbors: ['Colombia', 'Costa Rica'] },
  { name: 'Papua New Guinea', capital: 'Port Moresby', neighbors: ['Indonesia'] },
  { name: 'Paraguay', capital: 'Asunción', neighbors: ['Argentina', 'Bolivia', 'Brazil'] },
  { name: 'Peru', capital: 'Lima', neighbors: ['Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador'] },
  { name: 'Philippines', capital: 'Manila', neighbors: [] },
  { name: 'Poland', capital: 'Warsaw', neighbors: ['Belarus', 'Czech Republic', 'Germany', 'Lithuania', 'Russia', 'Slovakia', 'Ukraine'] },
  { name: 'Portugal', capital: 'Lisbon', neighbors: ['Spain'] },
  { name: 'Qatar', capital: 'Doha', neighbors: [] },
  { name: 'Romania', capital: 'Bucharest', neighbors: ['Bulgaria', 'Hungary', 'Moldova', 'Serbia', 'Ukraine'] },
  { name: 'Russia', capital: 'Moscow', neighbors: ['Azerbaijan', 'Belarus', 'China', 'Estonia', 'Finland', 'Georgia', 'Kazakhstan', 'Latvia', 'Lithuania', 'Mongolia', 'North Korea', 'Norway', 'Poland', 'Ukraine'] },
  { name: 'Rwanda', capital: 'Kigali', neighbors: ['Burundi', 'Democratic Republic of the Congo', 'Tanzania', 'Uganda'] },
  { name: 'Saint Kitts and Nevis', capital: 'Basseterre', neighbors: [] },
  { name: 'Saint Lucia', capital: 'Castries', neighbors: [] },
  { name: 'Saint Vincent and the Grenadines', capital: 'Kingstown', neighbors: [] },
  { name: 'Samoa', capital: 'Apia', neighbors: [] },
  { name: 'San Marino', capital: 'San Marino', neighbors: ['Italy'] },
  { name: 'Sao Tome and Principe', capital: 'São Tomé', neighbors: [] },
  { name: 'Saudi Arabia', capital: 'Riyadh', neighbors: ['Iraq', 'Jordan', 'Kuwait', 'Oman', 'Qatar', 'United Arab Emirates', 'Yemen'] },
  { name: 'Senegal', capital: 'Dakar', neighbors: ['Gambia', 'Guinea', 'Guinea-Bissau', 'Mali', 'Mauritania'] },
  { name: 'Serbia', capital: 'Belgrade', neighbors: ['Albania', 'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Hungary', 'Kosovo', 'Macedonia', 'Montenegro', 'Romania'] },
  { name: 'Seychelles', capital: 'Victoria', neighbors: [] },
  { name: 'Sierra Leone', capital: 'Freetown', neighbors: ['Guinea', 'Liberia'] },
  { name: 'Singapore', capital: 'Singapore', neighbors: [] },
  { name: 'Slovakia', capital: 'Bratislava', neighbors: ['Austria', 'Czech Republic', 'Hungary', 'Poland', 'Ukraine'] },
  { name: 'Slovenia', capital: 'Ljubljana', neighbors: ['Austria', 'Croatia', 'Hungary', 'Italy'] },
  { name: 'Solomon Islands', capital: 'Honiara', neighbors: [] },
  { name: 'Somalia', capital: 'Mogadishu', neighbors: ['Djibouti', 'Ethiopia', 'Kenya'] },
  { name: 'South Africa', capital: 'Pretoria', neighbors: ['Botswana', 'Lesotho', 'Mozambique', 'Namibia', 'Zimbabwe'] },
  { name: 'South Sudan', capital: 'Juba', neighbors: ['Central African Republic', 'Ethiopia', 'Kenya', 'Sudan', 'Uganda'] },
  { name: 'Spain', capital: 'Madrid', neighbors: ['Andorra', 'France', 'Gibraltar', 'Morocco', 'Portugal'] },
  { name: 'Sri Lanka', capital: 'Colombo', neighbors: [] },
  { name: 'Sudan', capital: 'Khartoum', neighbors: ['Central African Republic', 'Chad', 'Egypt', 'Eritrea', 'Ethiopia', 'Libya', 'South Sudan'] },
  { name: 'Suriname', capital: 'Paramaribo', neighbors: ['Brazil', 'Guyana'] },
  { name: 'Swaziland', capital: 'Mbabane', neighbors: ['Mozambique', 'South Africa'] },
  { name: 'Sweden', capital: 'Stockholm', neighbors: ['Finland', 'Norway'] },
  { name: 'Switzerland', capital: 'Bern', neighbors: ['Austria', 'France', 'Germany', 'Italy', 'Liechtenstein'] },
  { name: 'Syria', capital: 'Damascus', neighbors: ['Iraq', 'Israel', 'Jordan', 'Lebanon', 'Turkey'] },
  { name: 'Taiwan', capital: 'Taipei', neighbors: [] },
  { name: 'Tajikistan', capital: 'Dushanbe', neighbors: ['Afghanistan', 'China', 'Kyrgyzstan', 'Uzbekistan'] },
  { name: 'Tanzania', capital: 'Dar es Salaam', neighbors: ['Burundi', 'Democratic Republic of the Congo', 'Kenya', 'Malawi', 'Mozambique', 'Rwanda', 'Uganda', 'Zambia'] },
  { name: 'Thailand', capital: 'Bangkok', neighbors: ['Cambodia', 'Laos', 'Malaysia', 'Myanmar'] },
  { name: 'Timor-Leste', capital: 'Dili', neighbors: ['Indonesia'] },
  { name: 'Togo', capital: 'Lomé', neighbors: ['Benin', 'Burkina Faso', 'Ghana'] },
  { name: 'Tonga', capital: 'Nuku\'alofa', neighbors: [] },
  { name: 'Trinidad and Tobago', capital: 'Port of Spain', neighbors: [] },
  { name: 'Tunisia', capital: 'Tunis', neighbors: ['Algeria', 'Libya'] },
  { name: 'Turkey', capital: 'Ankara', neighbors: ['Armenia', 'Azerbaijan', 'Bulgaria', 'Georgia', 'Greece', 'Iran', 'Iraq', 'Syria'] },
  { name: 'Turkmenistan', capital: 'Ashgabat', neighbors: ['Afghanistan', 'Iran', 'Kazakhstan', 'Uzbekistan'] },
  { name: 'Tuvalu', capital: 'Funafuti', neighbors: [] },
  { name: 'Uganda', capital: 'Kampala', neighbors: ['Democratic Republic of the Congo', 'Kenya', 'Rwanda', 'South Sudan', 'Tanzania'] },
  { name: 'Ukraine', capital: 'Kyiv', neighbors: ['Belarus', 'Hungary', 'Moldova', 'Poland', 'Romania', 'Russia', 'Slovakia'] },
  { name: 'United Arab Emirates', capital: 'Abu Dhabi', neighbors: ['Oman', 'Saudi Arabia'] },
  { name: 'United Kingdom', capital: 'London', neighbors: ['Ireland'] },
  { name: 'United States', capital: 'Washington, D.C.', neighbors: ['Canada', 'Mexico'] },
  { name: 'Uruguay', capital: 'Montevideo', neighbors: ['Argentina', 'Brazil'] },
  { name: 'Uzbekistan', capital: 'Tashkent', neighbors: ['Afghanistan', 'Kazakhstan', 'Kyrgyzstan', 'Tajikistan', 'Turkmenistan'] },
  { name: 'Vanuatu', capital: 'Port Vila', neighbors: [] },
  { name: 'Vatican', capital: 'Vatican City', neighbors: ['Italy'] },
  { name: 'Venezuela', capital: 'Caracas', neighbors: ['Brazil', 'Colombia', 'Guyana'] },
  { name: 'Vietnam', capital: 'Hanoi', neighbors: ['Cambodia', 'China', 'Laos'] },
  { name: 'Western Sahara', capital: 'El Aaiun', neighbors: ['Algeria', 'Mauritania', 'Morocco'] },
  { name: 'Yemen', capital: 'Sana\'a', neighbors: ['Oman', 'Saudi Arabia'] },
  { name: 'Zambia', capital: 'Lusaka', neighbors: ['Angola', 'Botswana', 'Democratic Republic of the Congo', 'Malawi', 'Mozambique', 'Namibia', 'Tanzania', 'Zimbabwe'] },
  { name: 'Zimbabwe', capital: 'Harare', neighbors: ['Botswana', 'Mozambique', 'South Africa', 'Zambia'] },
];

for (const country of COUNTRIES) {
  country.name = repairMojibake(country.name);
  country.capital = repairMojibake(country.capital);
  country.neighbors = country.neighbors.map((neighbor) => repairMojibake(neighbor));
}

export const COUNTRY_NAMES = COUNTRIES.map(c => c.name);

const NORMALIZED_COUNTRIES = COUNTRIES.map(country => ({
  country,
  normalized: normalizeText(country.name),
}));

const COUNTRY_BY_NORMALIZED = new Map(
  NORMALIZED_COUNTRIES.map(({ country, normalized }) => [normalized, country])
);

export function getCountryByName(name: string): Country | undefined {
  return COUNTRY_BY_NORMALIZED.get(normalizeText(name));
}

export function validateCountryName(name: string): boolean {
  return COUNTRY_BY_NORMALIZED.has(normalizeText(name));
}

export function getCapital(country: string): string | undefined {
  return getCountryByName(country)?.capital;
}

export function getNeighbors(country: string): string[] {
  return getCountryByName(country)?.neighbors || [];
}

export function getAutocomplete(input: string): string[] {
  const normalizedInput = normalizeText(input);
  if (!normalizedInput) return [];
  return NORMALIZED_COUNTRIES
    .filter(({ normalized }) => normalized.startsWith(normalizedInput))
    .slice(0, 5)
    .map(({ country }) => country.name);
}
