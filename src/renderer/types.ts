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
  latitude?: number;
  longitude?: number;
  solarCapacityKwp?: number;
}

// Sun/Weather types
export interface SunForecast {
  currentIrradiance: number;
  cloudCover: number;
  hourlyIrradiance: number[];
  hourlyCloudCover: number[];
  sunrise: string;
  sunset: string;
  generationPotential: 'high' | 'medium' | 'low';
  isDaytime: boolean;
  weatherCondition: 'clear' | 'partly_cloudy' | 'cloudy' | 'overcast';
  currentHour: number;
}

// Recommendation types
export type ActivityType = 'ev_charging' | 'laundry';
export type RecommendationQuality = 'excellent' | 'good' | 'okay' | 'wait';

export interface Recommendation {
  activity: ActivityType;
  quality: RecommendationQuality;
  reason: string;
  icon: string;
  windowEnd?: string;
}

export interface RecommendationState {
  recommendations: Recommendation[];
  overallStatus: 'go' | 'okay' | 'wait';
  statusMessage: string;
  nextWindow?: {
    time: string;
    reason: string;
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
  // Weather/Sun API
  getSunForecast: () => Promise<SunForecast | null>;
  refreshWeather: () => Promise<SunForecast | null>;
  onWeatherUpdated: (callback: (data: SunForecast) => void) => void;
  // Recommendations API
  getRecommendations: () => Promise<RecommendationState | null>;
  onRecommendationsUpdated: (callback: (data: RecommendationState) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
