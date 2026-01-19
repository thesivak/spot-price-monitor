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

interface OTEPriceItem {
  date: string;
  hour: number;
  priceEur: number;
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

  private readonly OTE_URL = 'https://www.ote-cr.cz/services/PublicDataService';
  private settingsPath: string;
  private cachedCzkRate: number = 25.3;
  private czkRateLastFetch: number = 0;

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

  // HTTP GET request
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

  // HTTP POST request for SOAP
  private postSoap(url: string, body: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'SOAPAction': 'GetDamPricePeriodE',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  // Build OTE SOAP query for electricity prices
  private buildOTEQuery(startDate: string, endDate: string): string {
    return `<?xml version="1.0" encoding="UTF-8" ?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pub="http://www.ote-cr.cz/schema/service/public">
    <soapenv:Header/>
    <soapenv:Body>
        <pub:GetDamPricePeriodE>
            <pub:StartDate>${startDate}</pub:StartDate>
            <pub:EndDate>${endDate}</pub:EndDate>
            <pub:PeriodResolution>PT60M</pub:PeriodResolution>
        </pub:GetDamPricePeriodE>
    </soapenv:Body>
</soapenv:Envelope>`;
  }

  // Parse OTE XML response
  private parseOTEResponse(xml: string): OTEPriceItem[] {
    const items: OTEPriceItem[] = [];

    // Simple XML parsing without external dependencies
    const itemRegex = /<(?:pub:)?Item[^>]*>([\s\S]*?)<\/(?:pub:)?Item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];

      const dateMatch = itemXml.match(/<(?:pub:)?Date[^>]*>([^<]+)<\/(?:pub:)?Date>/i);
      const periodIndexMatch = itemXml.match(/<(?:pub:)?PeriodIndex[^>]*>([^<]+)<\/(?:pub:)?PeriodIndex>/i);
      const priceMatch = itemXml.match(/<(?:pub:)?Price[^>]*>([^<]+)<\/(?:pub:)?Price>/i);

      if (dateMatch && periodIndexMatch && priceMatch) {
        items.push({
          date: dateMatch[1],
          hour: parseInt(periodIndexMatch[1], 10) - 1, // OTE uses 1-24, we use 0-23
          priceEur: parseFloat(priceMatch[1]),
        });
      }
    }

    return items;
  }

  // Fetch CZK/EUR exchange rate from CNB
  private async fetchCzkRate(): Promise<number> {
    const now = Date.now();
    // Cache for 1 hour
    if (now - this.czkRateLastFetch < 3600000 && this.cachedCzkRate > 0) {
      return this.cachedCzkRate;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await this.fetch(
        `https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt?date=${today.replace(/-/g, '.')}`
      );

      // Parse CNB format: "země|měna|množství|kód|kurz"
      const lines = response.split('\n');
      for (const line of lines) {
        if (line.includes('EUR')) {
          const parts = line.split('|');
          if (parts.length >= 5) {
            const rate = parseFloat(parts[4].replace(',', '.'));
            if (!isNaN(rate)) {
              this.cachedCzkRate = rate;
              this.czkRateLastFetch = now;
              return rate;
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch CNB rate, using cached:', error);
    }

    return this.cachedCzkRate;
  }

  // Calculate price level based on position in daily range
  private calculateLevel(price: number, allPrices: number[]): { level: 'low' | 'medium' | 'high'; levelNum: number } {
    if (allPrices.length === 0) {
      return { level: 'medium', levelNum: 12 };
    }

    const sorted = [...allPrices].sort((a, b) => a - b);
    const position = sorted.findIndex(p => p >= price);
    const levelNum = position === -1 ? 24 : Math.max(1, Math.ceil((position + 1) / sorted.length * 24));

    let level: 'low' | 'medium' | 'high';
    if (levelNum <= 8) {
      level = 'low';
    } else if (levelNum <= 16) {
      level = 'medium';
    } else {
      level = 'high';
    }

    return { level, levelNum };
  }

  // Convert EUR price to target currency
  private convertCurrency(priceEur: number, targetCurrency: string): number {
    if (targetCurrency === 'CZK') {
      return priceEur * this.cachedCzkRate;
    }
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
    // Current price is derived from hourly prices
    // Fetch hourly first if not available
    if (!this.hourlyPrices) {
      await this.fetchHourlyPrices();
    }

    if (!this.hourlyPrices || this.hourlyPrices.hoursToday.length === 0) {
      return null;
    }

    const currentHour = new Date().getHours();
    const hourData = this.hourlyPrices.hoursToday.find(h => h.hour === currentHour);

    if (!hourData) {
      return null;
    }

    this.currentPrice = this.enrichPriceData({
      priceEUR: hourData.priceEur,
      priceCZK: hourData.priceCZK,
      level: hourData.level,
      levelNum: hourData.levelNum,
    });

    this.priceCallbacks.forEach((cb) => cb(this.currentPrice!));
    return this.currentPrice;
  }

  async fetchHourlyPrices(): Promise<HourlyPrices | null> {
    try {
      // Fetch CZK exchange rate first
      await this.fetchCzkRate();

      // Get today and tomorrow dates in Prague timezone
      const now = new Date();
      const pragueOffset = 1; // CET is UTC+1 (simplified, doesn't handle DST)
      const pragueNow = new Date(now.getTime() + pragueOffset * 60 * 60 * 1000);

      const today = pragueNow.toISOString().split('T')[0];
      const tomorrow = new Date(pragueNow.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch today and tomorrow from OTE
      const query = this.buildOTEQuery(today, tomorrow);
      const response = await this.postSoap(this.OTE_URL, query);
      const items = this.parseOTEResponse(response);

      // Separate today and tomorrow prices
      const todayItems = items.filter(item => item.date === today);
      const tomorrowItems = items.filter(item => item.date === tomorrow);

      // Get all today's prices for level calculation
      const todayPrices = todayItems.map(item => item.priceEur);
      const tomorrowPrices = tomorrowItems.map(item => item.priceEur);

      // Convert to HourlyPrice format
      const hoursToday: HourlyPrice[] = todayItems.map(item => {
        const { level, levelNum } = this.calculateLevel(item.priceEur, todayPrices);
        return {
          hour: item.hour,
          priceEur: item.priceEur,
          priceCZK: Math.round(item.priceEur * this.cachedCzkRate),
          level,
          levelNum,
        };
      }).sort((a, b) => a.hour - b.hour);

      const hoursTomorrow: HourlyPrice[] = tomorrowItems.map(item => {
        const { level, levelNum } = this.calculateLevel(item.priceEur, tomorrowPrices);
        return {
          hour: item.hour,
          priceEur: item.priceEur,
          priceCZK: Math.round(item.priceEur * this.cachedCzkRate),
          level,
          levelNum,
        };
      }).sort((a, b) => a.hour - b.hour);

      this.hourlyPrices = this.enrichHourlyData({ hoursToday, hoursTomorrow });
      this.hourlyCallbacks.forEach((cb) => cb(this.hourlyPrices!));

      console.log(`OTE: Fetched ${hoursToday.length} hours for today, ${hoursTomorrow.length} hours for tomorrow`);

      return this.hourlyPrices;
    } catch (error) {
      console.error('Failed to fetch OTE prices:', error);
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
