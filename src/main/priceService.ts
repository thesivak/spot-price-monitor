import https from 'https';

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

type PriceCallback = (data: PriceData) => void;
type HourlyCallback = (data: HourlyPrices) => void;

export class PriceService {
  private currentPrice: PriceData | null = null;
  private hourlyPrices: HourlyPrices | null = null;
  private priceCallbacks: PriceCallback[] = [];
  private hourlyCallbacks: HourlyCallback[] = [];

  private readonly BASE_URL = 'https://spotovaelektrina.cz/api/v1/price';

  private fetch(endpoint: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = `${this.BASE_URL}${endpoint}`;

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

  async fetchCurrentPrice(): Promise<PriceData | null> {
    try {
      const response = await this.fetch('/get-actual-price-json');
      const data = JSON.parse(response) as PriceData;
      this.currentPrice = data;
      this.priceCallbacks.forEach((cb) => cb(data));
      return data;
    } catch (error) {
      console.error('Failed to fetch current price:', error);
      return null;
    }
  }

  async fetchHourlyPrices(): Promise<HourlyPrices | null> {
    try {
      const response = await this.fetch('/get-prices-json');
      const data = JSON.parse(response) as HourlyPrices;
      this.hourlyPrices = data;
      this.hourlyCallbacks.forEach((cb) => cb(data));
      return data;
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
}
