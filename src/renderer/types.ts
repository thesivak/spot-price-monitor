export interface PriceData {
  priceCZK: number;
  priceEUR: number;
  level: 'low' | 'medium' | 'high' | 'unknown';
  levelNum: number;
}

export interface HourlyPrice {
  hour: number;
  priceEur: number;
  priceCZK: number;
  level: 'low' | 'medium' | 'high';
  levelNum: number;
}

export interface HourlyPrices {
  hoursToday: HourlyPrice[];
  hoursTomorrow: HourlyPrice[];
}

export interface ElectronAPI {
  getCurrentPrice: () => Promise<PriceData | null>;
  getHourlyPrices: () => Promise<HourlyPrices | null>;
  refreshPrices: () => Promise<{ current: PriceData | null; hourly: HourlyPrices | null }>;
  closeWindow: () => void;
  onPriceUpdated: (callback: (data: PriceData) => void) => void;
  onHourlyUpdated: (callback: (data: HourlyPrices) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
