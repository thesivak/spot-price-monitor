import https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  REGIONS,
  CURRENCIES,
} from './config';

export interface PriceData {
  priceCZK: number;
  priceEUR: number;
  level: 'low' | 'medium' | 'high' | 'unknown';
  levelNum: number;
  // Additional fields for multi-currency support
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

type PriceCallback = (data: PriceData) => void;
type HourlyCallback = (data: HourlyPrices) => void;
type SettingsCallback = (settings: AppSettings) => void;

// Approximate exchange rates (EUR as base)
// In production, these should be fetched from an API
const EXCHANGE_RATES: Record<string, number> = {
  EUR: 1,
  CZK: 25.3,
  PLN: 4.32,
  HUF: 395,
  RON: 4.97,
  SEK: 11.5,
  NOK: 11.8,
  DKK: 7.46,
  CHF: 0.94,
  GBP: 0.86,
};

export class PriceService {
  private currentPrice: PriceData | null = null;
  private hourlyPrices: HourlyPrices | null = null;
  private settings: AppSettings;
  private priceCallbacks: PriceCallback[] = [];
  private hourlyCallbacks: HourlyCallback[] = [];
  private settingsCallbacks: SettingsCallback[] = [];

  private readonly SPOTOVAELEKTRINA_URL = 'https://spotovaelektrina.cz/api/v1/price';
  private settingsPath: string;

  constructor() {
    // Initialize settings path
    const userDataPath = app.getPath('userData');
    this.settingsPath = path.join(userDataPath, 'settings.json');
    this.settings = this.loadSettings();
  }

  // Settings management
  private loadSettings(): AppSettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf-8');
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    try {
      const dir = path.dirname(this.settingsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  getSettings(): AppSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.settingsCallbacks.forEach((cb) => cb(this.settings));
    return this.settings;
  }

  onSettingsChange(callback: SettingsCallback): void {
    this.settingsCallbacks.push(callback);
  }

  // Price fetching
  private fetch(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve(data);
            } else {
              reject(new Error(`HTTP ${res.statusCode}`));
            }
          });
        })
        .on('error', reject);
    });
  }

  // Convert EUR price to target currency
  private convertCurrency(priceEur: number, targetCurrency: string): number {
    const rate = EXCHANGE_RATES[targetCurrency] || 1;
    return priceEur * rate;
  }

  // Add local currency to price data
  private enrichPriceData(data: PriceData): PriceData {
    const currency = this.settings.currency;
    return {
      ...data,
      priceLocal: this.convertCurrency(data.priceEUR, currency),
      currencyCode: currency,
    };
  }

  // Add local currency to hourly data
  private enrichHourlyData(data: HourlyPrices): HourlyPrices {
    const currency = this.settings.currency;
    return {
      hoursToday: data.hoursToday.map((h) => ({
        ...h,
        priceLocal: this.convertCurrency(h.priceEur, currency),
      })),
      hoursTomorrow: data.hoursTomorrow.map((h) => ({
        ...h,
        priceLocal: this.convertCurrency(h.priceEur, currency),
      })),
    };
  }

  async fetchCurrentPrice(): Promise<PriceData | null> {
    const region = REGIONS[this.settings.region];

    if (!region || region.provider === 'spotovaelektrina') {
      return this.fetchSpotovaelektrinaCurrentPrice();
    }

    // For ENTSO-E regions, check if API key is set
    if (!this.settings.entsoeApiKey) {
      console.warn('ENTSO-E API key not configured, falling back to spotovaelektrina');
      return this.fetchSpotovaelektrinaCurrentPrice();
    }

    // TODO: Implement ENTSO-E API fetching
    // For now, fall back to spotovaelektrina
    return this.fetchSpotovaelektrinaCurrentPrice();
  }

  private async fetchSpotovaelektrinaCurrentPrice(): Promise<PriceData | null> {
    try {
      const response = await this.fetch(`${this.SPOTOVAELEKTRINA_URL}/get-actual-price-json`);
      const data = JSON.parse(response) as PriceData;
      this.currentPrice = this.enrichPriceData(data);
      this.priceCallbacks.forEach((cb) => cb(this.currentPrice!));
      return this.currentPrice;
    } catch (error) {
      console.error('Failed to fetch current price:', error);
      return null;
    }
  }

  async fetchHourlyPrices(): Promise<HourlyPrices | null> {
    const region = REGIONS[this.settings.region];

    if (!region || region.provider === 'spotovaelektrina') {
      return this.fetchSpotovaelektrinaHourlyPrices();
    }

    // For ENTSO-E regions, check if API key is set
    if (!this.settings.entsoeApiKey) {
      console.warn('ENTSO-E API key not configured, falling back to spotovaelektrina');
      return this.fetchSpotovaelektrinaHourlyPrices();
    }

    // TODO: Implement ENTSO-E API fetching
    // For now, fall back to spotovaelektrina
    return this.fetchSpotovaelektrinaHourlyPrices();
  }

  private async fetchSpotovaelektrinaHourlyPrices(): Promise<HourlyPrices | null> {
    try {
      const response = await this.fetch(`${this.SPOTOVAELEKTRINA_URL}/get-prices-json`);
      const data = JSON.parse(response) as HourlyPrices;
      this.hourlyPrices = this.enrichHourlyData(data);
      this.hourlyCallbacks.forEach((cb) => cb(this.hourlyPrices!));
      return this.hourlyPrices;
    } catch (error) {
      console.error('Failed to fetch hourly prices:', error);
      return null;
    }
  }

  getCurrentPrice(): PriceData | null {
    return this.currentPrice;
  }

  getHourlyPrices(): HourlyPrices | null {
    return this.hourlyPrices;
  }

  onPriceUpdate(callback: PriceCallback): void {
    this.priceCallbacks.push(callback);
  }

  onHourlyUpdate(callback: HourlyCallback): void {
    this.hourlyCallbacks.push(callback);
  }

  // Get current region info
  getRegionInfo() {
    return REGIONS[this.settings.region] || REGIONS.CZ;
  }

  // Get current currency info
  getCurrencyInfo() {
    return CURRENCIES[this.settings.currency] || CURRENCIES.EUR;
  }
}
