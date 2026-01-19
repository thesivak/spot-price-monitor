// European electricity market regions and currencies configuration

export interface Region {
  code: string;
  name: string;
  country: string;
  currency: string;
  timezone: string;
  entsoeCode?: string; // ENTSO-E area code
  provider: 'spotovaelektrina' | 'entsoe';
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  position: 'before' | 'after';
}

// Supported regions
export const REGIONS: Record<string, Region> = {
  CZ: {
    code: 'CZ',
    name: 'Czech Republic',
    country: 'Czechia',
    currency: 'CZK',
    timezone: 'Europe/Prague',
    entsoeCode: '10YCZ-CEPS-----N',
    provider: 'spotovaelektrina',
  },
  SK: {
    code: 'SK',
    name: 'Slovakia',
    country: 'Slovakia',
    currency: 'EUR',
    timezone: 'Europe/Bratislava',
    entsoeCode: '10YSK-SEPS-----K',
    provider: 'entsoe',
  },
  DE: {
    code: 'DE',
    name: 'Germany',
    country: 'Germany',
    currency: 'EUR',
    timezone: 'Europe/Berlin',
    entsoeCode: '10Y1001A1001A83F',
    provider: 'entsoe',
  },
  AT: {
    code: 'AT',
    name: 'Austria',
    country: 'Austria',
    currency: 'EUR',
    timezone: 'Europe/Vienna',
    entsoeCode: '10YAT-APG------L',
    provider: 'entsoe',
  },
  PL: {
    code: 'PL',
    name: 'Poland',
    country: 'Poland',
    currency: 'PLN',
    timezone: 'Europe/Warsaw',
    entsoeCode: '10YPL-AREA-----S',
    provider: 'entsoe',
  },
  FR: {
    code: 'FR',
    name: 'France',
    country: 'France',
    currency: 'EUR',
    timezone: 'Europe/Paris',
    entsoeCode: '10YFR-RTE------C',
    provider: 'entsoe',
  },
  NL: {
    code: 'NL',
    name: 'Netherlands',
    country: 'Netherlands',
    currency: 'EUR',
    timezone: 'Europe/Amsterdam',
    entsoeCode: '10YNL----------L',
    provider: 'entsoe',
  },
  BE: {
    code: 'BE',
    name: 'Belgium',
    country: 'Belgium',
    currency: 'EUR',
    timezone: 'Europe/Brussels',
    entsoeCode: '10YBE----------2',
    provider: 'entsoe',
  },
  ES: {
    code: 'ES',
    name: 'Spain',
    country: 'Spain',
    currency: 'EUR',
    timezone: 'Europe/Madrid',
    entsoeCode: '10YES-REE------0',
    provider: 'entsoe',
  },
  IT: {
    code: 'IT',
    name: 'Italy (North)',
    country: 'Italy',
    currency: 'EUR',
    timezone: 'Europe/Rome',
    entsoeCode: '10Y1001A1001A73I',
    provider: 'entsoe',
  },
  HU: {
    code: 'HU',
    name: 'Hungary',
    country: 'Hungary',
    currency: 'HUF',
    timezone: 'Europe/Budapest',
    entsoeCode: '10YHU-MAVIR----U',
    provider: 'entsoe',
  },
  RO: {
    code: 'RO',
    name: 'Romania',
    country: 'Romania',
    currency: 'RON',
    timezone: 'Europe/Bucharest',
    entsoeCode: '10YRO-TEL------P',
    provider: 'entsoe',
  },
  SE: {
    code: 'SE',
    name: 'Sweden (SE3)',
    country: 'Sweden',
    currency: 'SEK',
    timezone: 'Europe/Stockholm',
    entsoeCode: '10Y1001A1001A46L',
    provider: 'entsoe',
  },
  NO: {
    code: 'NO',
    name: 'Norway (NO1)',
    country: 'Norway',
    currency: 'NOK',
    timezone: 'Europe/Oslo',
    entsoeCode: '10YNO-1--------2',
    provider: 'entsoe',
  },
  DK: {
    code: 'DK',
    name: 'Denmark (DK1)',
    country: 'Denmark',
    currency: 'DKK',
    timezone: 'Europe/Copenhagen',
    entsoeCode: '10YDK-1--------W',
    provider: 'entsoe',
  },
  FI: {
    code: 'FI',
    name: 'Finland',
    country: 'Finland',
    currency: 'EUR',
    timezone: 'Europe/Helsinki',
    entsoeCode: '10YFI-1--------U',
    provider: 'entsoe',
  },
  CH: {
    code: 'CH',
    name: 'Switzerland',
    country: 'Switzerland',
    currency: 'CHF',
    timezone: 'Europe/Zurich',
    entsoeCode: '10YCH-SWISSGRIDZ',
    provider: 'entsoe',
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    country: 'United Kingdom',
    currency: 'GBP',
    timezone: 'Europe/London',
    entsoeCode: '10Y1001A1001A92E',
    provider: 'entsoe',
  },
  PT: {
    code: 'PT',
    name: 'Portugal',
    country: 'Portugal',
    currency: 'EUR',
    timezone: 'Europe/Lisbon',
    entsoeCode: '10YPT-REN------W',
    provider: 'entsoe',
  },
  GR: {
    code: 'GR',
    name: 'Greece',
    country: 'Greece',
    currency: 'EUR',
    timezone: 'Europe/Athens',
    entsoeCode: '10YGR-HTSO-----Y',
    provider: 'entsoe',
  },
};

// Supported currencies
export const CURRENCIES: Record<string, Currency> = {
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    position: 'before',
  },
  CZK: {
    code: 'CZK',
    symbol: 'Kč',
    name: 'Czech Koruna',
    decimals: 0,
    position: 'after',
  },
  PLN: {
    code: 'PLN',
    symbol: 'zł',
    name: 'Polish Złoty',
    decimals: 2,
    position: 'after',
  },
  HUF: {
    code: 'HUF',
    symbol: 'Ft',
    name: 'Hungarian Forint',
    decimals: 0,
    position: 'after',
  },
  RON: {
    code: 'RON',
    symbol: 'lei',
    name: 'Romanian Leu',
    decimals: 2,
    position: 'after',
  },
  SEK: {
    code: 'SEK',
    symbol: 'kr',
    name: 'Swedish Krona',
    decimals: 2,
    position: 'after',
  },
  NOK: {
    code: 'NOK',
    symbol: 'kr',
    name: 'Norwegian Krone',
    decimals: 2,
    position: 'after',
  },
  DKK: {
    code: 'DKK',
    symbol: 'kr',
    name: 'Danish Krone',
    decimals: 2,
    position: 'after',
  },
  CHF: {
    code: 'CHF',
    symbol: 'Fr.',
    name: 'Swiss Franc',
    decimals: 2,
    position: 'before',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    decimals: 2,
    position: 'before',
  },
};

// App settings interface
export interface AppSettings {
  region: string;
  currency: string;
  entsoeApiKey?: string;
  notifications: {
    lowPrice: boolean;
    highPrice: boolean;
  };
  startAtLogin: boolean;
}

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  region: 'CZ',
  currency: 'CZK',
  notifications: {
    lowPrice: true,
    highPrice: true,
  },
  startAtLogin: false,
};

// Format price with currency
export function formatPrice(
  price: number,
  currencyCode: string,
  perUnit: 'kWh' | 'MWh' = 'kWh'
): string {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.EUR;
  const formattedNumber = price.toFixed(currency.decimals);

  if (currency.position === 'before') {
    return `${currency.symbol}${formattedNumber}/${perUnit}`;
  }
  return `${formattedNumber} ${currency.symbol}/${perUnit}`;
}

// Get region list for dropdown
export function getRegionList(): Array<{ code: string; name: string }> {
  return Object.values(REGIONS)
    .map((r) => ({ code: r.code, name: `${r.name} (${r.country})` }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Get currency list for dropdown
export function getCurrencyList(): Array<{ code: string; name: string }> {
  return Object.values(CURRENCIES)
    .map((c) => ({ code: c.code, name: `${c.code} - ${c.name}` }))
    .sort((a, b) => a.code.localeCompare(b.code));
}
