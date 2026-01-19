import https from 'https';
import { AppSettings } from './config';

export interface SunForecast {
  currentIrradiance: number;      // W/m² (0-1000+)
  cloudCover: number;             // 0-100%
  hourlyIrradiance: number[];     // Next 24 hours
  hourlyCloudCover: number[];     // Next 24 hours
  sunrise: string;                // HH:MM format
  sunset: string;                 // HH:MM format
  generationPotential: 'high' | 'medium' | 'low';
  isDaytime: boolean;
  weatherCondition: 'clear' | 'partly_cloudy' | 'cloudy' | 'overcast';
  currentHour: number;
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    time: string;
    direct_radiation: number;
    cloud_cover: number;
    is_day: number;
  };
  hourly: {
    time: string[];
    direct_radiation: number[];
    cloud_cover: number[];
  };
  daily: {
    sunrise: string[];
    sunset: string[];
  };
}

type WeatherCallback = (data: SunForecast) => void;

// Default coordinates for major European cities
const DEFAULT_COORDINATES: Record<string, { lat: number; lon: number }> = {
  CZ: { lat: 50.0755, lon: 14.4378 },  // Prague
  SK: { lat: 48.1486, lon: 17.1077 },  // Bratislava
  DE: { lat: 52.52, lon: 13.405 },     // Berlin
  AT: { lat: 48.2082, lon: 16.3738 },  // Vienna
  PL: { lat: 52.2297, lon: 21.0122 },  // Warsaw
  HU: { lat: 47.4979, lon: 19.0402 },  // Budapest
  FR: { lat: 48.8566, lon: 2.3522 },   // Paris
  NL: { lat: 52.3676, lon: 4.9041 },   // Amsterdam
  BE: { lat: 50.8503, lon: 4.3517 },   // Brussels
  ES: { lat: 40.4168, lon: -3.7038 },  // Madrid
  IT: { lat: 45.4642, lon: 9.19 },     // Milan
  PT: { lat: 38.7223, lon: -9.1393 },  // Lisbon
  GR: { lat: 37.9838, lon: 23.7275 },  // Athens
  RO: { lat: 44.4268, lon: 26.1025 },  // Bucharest
  SE: { lat: 59.3293, lon: 18.0686 },  // Stockholm
  NO: { lat: 59.9139, lon: 10.7522 },  // Oslo
  DK: { lat: 55.6761, lon: 12.5683 },  // Copenhagen
  FI: { lat: 60.1699, lon: 24.9384 },  // Helsinki
  CH: { lat: 46.9481, lon: 7.4474 },   // Bern
  GB: { lat: 51.5074, lon: -0.1278 },  // London
};

export class WeatherService {
  private currentForecast: SunForecast | null = null;
  private weatherCallbacks: WeatherCallback[] = [];
  private latitude: number = 50.0755;  // Default: Prague
  private longitude: number = 14.4378;

  constructor() {}

  // Update location from settings
  updateLocation(settings: AppSettings) {
    // Use custom location if set, otherwise use region default
    if (settings.latitude !== undefined && settings.longitude !== undefined) {
      this.latitude = settings.latitude;
      this.longitude = settings.longitude;
    } else {
      const regionCoords = DEFAULT_COORDINATES[settings.region] || DEFAULT_COORDINATES.CZ;
      this.latitude = regionCoords.lat;
      this.longitude = regionCoords.lon;
    }
  }

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

  async fetchSunForecast(): Promise<SunForecast | null> {
    try {
      // Open-Meteo API - free, no API key required
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${this.latitude}&longitude=${this.longitude}&current=direct_radiation,cloud_cover,is_day&hourly=direct_radiation,cloud_cover&daily=sunrise,sunset&timezone=auto&forecast_days=2`;

      const response = await this.fetch(url);
      const data: WeatherData = JSON.parse(response);

      const currentHour = new Date().getHours();

      // Extract hourly data for next 24 hours
      const hourlyIrradiance = data.hourly.direct_radiation.slice(currentHour, currentHour + 24);
      const hourlyCloudCover = data.hourly.cloud_cover.slice(currentHour, currentHour + 24);

      // Calculate generation potential based on current irradiance
      const currentIrradiance = data.current.direct_radiation;
      const generationPotential = this.calculateGenerationPotential(currentIrradiance, data.current.cloud_cover);

      // Determine weather condition
      const weatherCondition = this.getWeatherCondition(data.current.cloud_cover);

      // Parse sunrise/sunset times (format: "2024-01-15T07:45")
      const sunrise = data.daily.sunrise[0].split('T')[1].slice(0, 5);
      const sunset = data.daily.sunset[0].split('T')[1].slice(0, 5);

      this.currentForecast = {
        currentIrradiance,
        cloudCover: data.current.cloud_cover,
        hourlyIrradiance,
        hourlyCloudCover,
        sunrise,
        sunset,
        generationPotential,
        isDaytime: data.current.is_day === 1,
        weatherCondition,
        currentHour,
      };

      this.weatherCallbacks.forEach((cb) => cb(this.currentForecast!));
      return this.currentForecast;
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      return null;
    }
  }

  private calculateGenerationPotential(irradiance: number, cloudCover: number): 'high' | 'medium' | 'low' {
    // Irradiance thresholds (W/m²):
    // - High: > 600 W/m² (clear sunny day)
    // - Medium: 200-600 W/m² (partly cloudy)
    // - Low: < 200 W/m² (cloudy/overcast)

    if (irradiance > 600 && cloudCover < 30) {
      return 'high';
    } else if (irradiance > 200 || cloudCover < 60) {
      return 'medium';
    }
    return 'low';
  }

  private getWeatherCondition(cloudCover: number): 'clear' | 'partly_cloudy' | 'cloudy' | 'overcast' {
    if (cloudCover < 20) return 'clear';
    if (cloudCover < 50) return 'partly_cloudy';
    if (cloudCover < 80) return 'cloudy';
    return 'overcast';
  }

  getCurrentForecast(): SunForecast | null {
    return this.currentForecast;
  }

  onWeatherUpdate(callback: WeatherCallback): void {
    this.weatherCallbacks.push(callback);
  }

  // Get estimated solar generation for a given hour (0-23)
  getEstimatedGeneration(hour: number, solarCapacityKwp?: number): number {
    if (!this.currentForecast || !this.currentForecast.hourlyIrradiance[hour]) {
      return 0;
    }

    // If user has specified their panel capacity, estimate generation
    // Typical efficiency factor: 0.75-0.85 accounting for inverter, cables, etc.
    const capacity = solarCapacityKwp || 5; // Default 5 kWp if not specified
    const efficiencyFactor = 0.80;
    const irradiance = this.currentForecast.hourlyIrradiance[hour];

    // Convert W/m² to kWh/kWp/h (roughly irradiance/1000 * efficiency)
    return (irradiance / 1000) * capacity * efficiencyFactor;
  }

  // Get the best solar hours for today (hours with highest irradiance)
  getBestSolarHours(): { hour: number; irradiance: number }[] {
    if (!this.currentForecast) return [];

    const hours = this.currentForecast.hourlyIrradiance
      .map((irradiance, index) => ({
        hour: (this.currentForecast!.currentHour + index) % 24,
        irradiance,
      }))
      .filter((h) => h.irradiance > 200) // Only hours with meaningful solar
      .sort((a, b) => b.irradiance - a.irradiance)
      .slice(0, 5);

    return hours;
  }
}
