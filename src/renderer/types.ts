export interface PriceData {
  priceCZK: number;
  priceEUR: number;
  level: 'low' | 'medium' | 'high' | 'unknown';
  levelNum: number;
  priceLocal?: number;
  currencyCode?: string;
}

export interface HourlyPrice {
  hour: number;
  priceEur: number;
  priceCZK: number;
  priceLocal?: number;
  level: 'low' | 'medium' | 'high';
  levelNum: number;
}

export interface HourlyPrices {
  hoursToday: HourlyPrice[];
  hoursTomorrow: HourlyPrice[];
}

export interface AppSettings {
  region: string;
  currency: string;
  startAtLogin: boolean;
  notifications: {
    lowPrice: boolean;
    highPrice: boolean;
  };
}

export interface ElectronAPI {
  getCurrentPrice: () => Promise<PriceData | null>;
  getHourlyPrices: () => Promise<HourlyPrices | null>;
  refreshPrices: () => Promise<{ current: PriceData | null; hourly: HourlyPrices | null }>;
  getSettings: () => Promise<AppSettings>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  closeWindow: () => void;
  quitApp: () => void;
  onPriceUpdated: (callback: (data: PriceData) => void) => void;
  onHourlyUpdated: (callback: (data: HourlyPrices) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
