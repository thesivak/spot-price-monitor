import { PriceData, HourlyPrices, HourlyPrice } from './priceService';
import { SunForecast } from './weatherService';

export type ActivityType = 'ev_charging' | 'laundry';
export type RecommendationQuality = 'excellent' | 'good' | 'okay' | 'wait';

export interface Recommendation {
  activity: ActivityType;
  quality: RecommendationQuality;
  reason: string;
  icon: string;
  windowEnd?: string;  // When this window ends (HH:MM format)
}

export interface RecommendationState {
  recommendations: Recommendation[];
  overallStatus: 'go' | 'okay' | 'wait';
  statusMessage: string;
  nextWindow?: {
    time: string;    // HH:MM format
    reason: string;
  };
}

export interface OptimalWindow {
  activity: ActivityType;
  startHour: number;
  endHour: number;
  reason: string;
  quality: RecommendationQuality;
}

type RecommendationCallback = (state: RecommendationState) => void;

export class RecommendationService {
  private currentState: RecommendationState | null = null;
  private callbacks: RecommendationCallback[] = [];

  constructor() {}

  // Calculate recommendations based on current price and sun data
  getRecommendations(
    price: PriceData | null,
    hourlyPrices: HourlyPrices | null,
    sun: SunForecast | null
  ): RecommendationState {
    const recommendations: Recommendation[] = [];

    if (!price || !hourlyPrices) {
      this.currentState = {
        recommendations: [],
        overallStatus: 'wait',
        statusMessage: 'Loading price data...',
      };
      return this.currentState;
    }

    // Calculate daily stats for comparison
    const dailyAverage = this.calculateDailyAverage(hourlyPrices.hoursToday);
    const dailyMin = this.calculateDailyMin(hourlyPrices.hoursToday);

    // Check EV charging recommendation
    const evRecommendation = this.getEvChargingRecommendation(price, dailyAverage, dailyMin, sun);
    if (evRecommendation) {
      recommendations.push(evRecommendation);
    }

    // Check laundry recommendation
    const laundryRecommendation = this.getLaundryRecommendation(price, dailyAverage, dailyMin, sun, hourlyPrices);
    if (laundryRecommendation) {
      recommendations.push(laundryRecommendation);
    }

    // Determine overall status
    let overallStatus: 'go' | 'okay' | 'wait' = 'wait';
    let statusMessage = '';

    if (recommendations.length > 0) {
      const hasExcellent = recommendations.some((r) => r.quality === 'excellent');
      const hasGood = recommendations.some((r) => r.quality === 'good');

      if (hasExcellent) {
        overallStatus = 'go';
        statusMessage = 'Excellent conditions now!';
      } else if (hasGood) {
        overallStatus = 'okay';
        statusMessage = 'Good time for high-power activities';
      } else {
        overallStatus = 'okay';
        statusMessage = 'Acceptable conditions';
      }
    } else {
      statusMessage = 'Wait for better conditions';
    }

    // Find next good window
    const nextWindow = this.findNextGoodWindow(hourlyPrices, sun, dailyMin);

    this.currentState = {
      recommendations,
      overallStatus,
      statusMessage,
      nextWindow,
    };

    this.callbacks.forEach((cb) => cb(this.currentState!));
    return this.currentState;
  }

  private calculateDailyAverage(hours: HourlyPrice[]): number {
    if (hours.length === 0) return 0;
    const sum = hours.reduce((acc, h) => acc + h.priceCZK, 0);
    return sum / hours.length;
  }

  private calculateDailyMin(hours: HourlyPrice[]): number {
    if (hours.length === 0) return 0;
    return Math.min(...hours.map((h) => h.priceCZK));
  }

  // Check if current price is near the daily minimum (within tolerance)
  private isNearLowestPrice(currentPrice: number, dailyMin: number, tolerance: number = 0.15): boolean {
    if (dailyMin === 0) return false;
    // Price is "near lowest" if it's within tolerance% of the minimum
    return currentPrice <= dailyMin * (1 + tolerance);
  }

  private getEvChargingRecommendation(
    price: PriceData,
    dailyAverage: number,
    dailyMin: number,
    sun: SunForecast | null
  ): Recommendation | null {
    // Stricter: only recommend if price is near the daily minimum (within 15%)
    const isNearLowest = this.isNearLowestPrice(price.priceCZK, dailyMin, 0.15);
    const isVeryNearLowest = this.isNearLowestPrice(price.priceCZK, dailyMin, 0.05);
    const isSunny = sun && sun.generationPotential !== 'low' && sun.isDaytime;
    const isHighSolar = sun && sun.currentIrradiance > 500;

    // Excellent: Very near lowest price + high solar
    if (isVeryNearLowest && isHighSolar) {
      return {
        activity: 'ev_charging',
        quality: 'excellent',
        reason: 'Lowest price + sunny',
        icon: '🚗',
        windowEnd: this.estimateWindowEnd(sun),
      };
    }

    // Good: Near lowest price (within 15%)
    if (isNearLowest) {
      const pctAboveMin = Math.round((price.priceCZK / dailyMin - 1) * 100);
      const reason = pctAboveMin <= 2
        ? 'Lowest price of the day'
        : `${pctAboveMin}% above daily low`;
      return {
        activity: 'ev_charging',
        quality: 'good',
        reason,
        icon: '🚗',
      };
    }

    // Good: High solar + below average (even if not near lowest)
    if (isHighSolar && price.priceCZK < dailyAverage) {
      return {
        activity: 'ev_charging',
        quality: 'good',
        reason: 'High solar generation',
        icon: '🚗',
        windowEnd: this.estimateWindowEnd(sun),
      };
    }

    return null;
  }

  private getLaundryRecommendation(
    price: PriceData,
    dailyAverage: number,
    dailyMin: number,
    sun: SunForecast | null,
    hourlyPrices: HourlyPrices
  ): Recommendation | null {
    // Stricter: only recommend if price is near the daily minimum
    const isNearLowest = this.isNearLowestPrice(price.priceCZK, dailyMin, 0.15);
    const isVeryNearLowest = this.isNearLowestPrice(price.priceCZK, dailyMin, 0.05);
    const isSunny = sun && sun.currentIrradiance > 300 && sun.isDaytime;

    // Check if price is stable for next 2 hours (for laundry cycle)
    const isStable = this.isPriceStable(hourlyPrices, 2);

    // Excellent: Very near lowest price + sunny + stable
    if (isVeryNearLowest && isSunny && isStable) {
      return {
        activity: 'laundry',
        quality: 'excellent',
        reason: 'Lowest price + sunny',
        icon: '🧺',
      };
    }

    // Good: Near lowest price + stable
    if (isNearLowest && isStable) {
      return {
        activity: 'laundry',
        quality: 'good',
        reason: 'Near lowest price',
        icon: '🧺',
      };
    }

    // Good: High solar + below average
    if (isSunny && price.priceCZK < dailyAverage && isStable) {
      return {
        activity: 'laundry',
        quality: 'good',
        reason: 'Good solar',
        icon: '🧺',
      };
    }

    return null;
  }

  private isPriceStable(hourlyPrices: HourlyPrices, hours: number): boolean {
    const currentHour = new Date().getHours();
    const relevantHours = hourlyPrices.hoursToday.filter(
      (h) => h.hour >= currentHour && h.hour < currentHour + hours
    );

    if (relevantHours.length < hours) {
      // Check into tomorrow if needed
      const hoursFromTomorrow = hours - relevantHours.length;
      const tomorrowHours = hourlyPrices.hoursTomorrow.slice(0, hoursFromTomorrow);
      relevantHours.push(...tomorrowHours);
    }

    if (relevantHours.length < 2) return true; // Not enough data, assume stable

    const prices = relevantHours.map((h) => h.priceCZK);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);

    // Stable if variation is less than 30%
    return (maxPrice - minPrice) / minPrice < 0.3;
  }

  private estimateWindowEnd(sun: SunForecast | null): string | undefined {
    if (!sun || !sun.hourlyIrradiance) return undefined;

    // Find when solar drops significantly
    const currentHour = new Date().getHours();
    for (let i = 0; i < sun.hourlyIrradiance.length; i++) {
      if (sun.hourlyIrradiance[i] < 200) {
        const endHour = (currentHour + i) % 24;
        return `${endHour.toString().padStart(2, '0')}:00`;
      }
    }

    // Default to sunset
    return sun.sunset;
  }

  private findNextGoodWindow(
    hourlyPrices: HourlyPrices,
    sun: SunForecast | null,
    dailyMin: number
  ): { time: string; reason: string } | undefined {
    const currentHour = new Date().getHours();

    // Look for next window near the daily minimum (within 15%)
    for (const hour of hourlyPrices.hoursToday) {
      if (hour.hour > currentHour && this.isNearLowestPrice(hour.priceCZK, dailyMin, 0.15)) {
        return {
          time: `${hour.hour.toString().padStart(2, '0')}:00`,
          reason: 'Price drops',
        };
      }
    }

    // Check tomorrow - find the minimum price hour
    if (hourlyPrices.hoursTomorrow.length > 0) {
      const tomorrowMin = this.calculateDailyMin(hourlyPrices.hoursTomorrow);
      for (const hour of hourlyPrices.hoursTomorrow) {
        if (this.isNearLowestPrice(hour.priceCZK, tomorrowMin, 0.05)) {
          return {
            time: `${hour.hour.toString().padStart(2, '0')}:00 tomorrow`,
            reason: 'Lowest price',
          };
        }
      }
    }

    // Look for next sunny period (if sun data available)
    if (sun && sun.hourlyIrradiance) {
      for (let i = 1; i < sun.hourlyIrradiance.length; i++) {
        if (sun.hourlyIrradiance[i] > 500) {
          const nextHour = (currentHour + i) % 24;
          return {
            time: `${nextHour.toString().padStart(2, '0')}:00`,
            reason: 'Solar peaks',
          };
        }
      }
    }

    return undefined;
  }

  // Get optimal windows for the day
  getOptimalWindows(
    hourlyPrices: HourlyPrices | null,
    sun: SunForecast | null
  ): OptimalWindow[] {
    if (!hourlyPrices) return [];

    const windows: OptimalWindow[] = [];
    const dailyAverage = this.calculateDailyAverage(hourlyPrices.hoursToday);

    // Find best EV charging windows
    const evWindows = this.findBestWindows(hourlyPrices, sun, dailyAverage, 'ev_charging');
    windows.push(...evWindows);

    // Find best laundry windows
    const laundryWindows = this.findBestWindows(hourlyPrices, sun, dailyAverage, 'laundry');
    windows.push(...laundryWindows);

    return windows;
  }

  private findBestWindows(
    hourlyPrices: HourlyPrices,
    sun: SunForecast | null,
    dailyAverage: number,
    activity: ActivityType
  ): OptimalWindow[] {
    const windows: OptimalWindow[] = [];
    const allHours = [...hourlyPrices.hoursToday];

    // Score each hour
    const scored = allHours.map((h, index) => {
      let score = 0;
      let reasons: string[] = [];

      // Price score (0-50 points)
      if (h.level === 'low') {
        score += 50;
        reasons.push('Low price');
      } else if (h.priceCZK < dailyAverage) {
        score += 30;
        reasons.push('Below avg');
      } else if (h.level === 'high') {
        score -= 30;
      }

      // Solar score (0-40 points) - if sun data available
      if (sun && sun.hourlyIrradiance && sun.hourlyIrradiance[index]) {
        const irradiance = sun.hourlyIrradiance[index];
        if (irradiance > 600) {
          score += 40;
          reasons.push('High solar');
        } else if (irradiance > 300) {
          score += 25;
          reasons.push('Solar');
        }
      }

      return { hour: h.hour, score, reasons };
    });

    // Sort by score and get top windows
    const topHours = scored
      .filter((h) => h.score > 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    for (const h of topHours) {
      windows.push({
        activity,
        startHour: h.hour,
        endHour: (h.hour + 1) % 24,
        reason: h.reasons.join(' + '),
        quality: h.score > 70 ? 'excellent' : h.score > 50 ? 'good' : 'okay',
      });
    }

    return windows;
  }

  getCurrentState(): RecommendationState | null {
    return this.currentState;
  }

  onRecommendationUpdate(callback: RecommendationCallback): void {
    this.callbacks.push(callback);
  }

  // Generate notification message based on current state
  getNotificationMessage(price: PriceData, sun: SunForecast | null): string | null {
    if (!this.currentState || this.currentState.recommendations.length === 0) {
      return null;
    }

    const hasEv = this.currentState.recommendations.find((r) => r.activity === 'ev_charging');
    const hasLaundry = this.currentState.recommendations.find((r) => r.activity === 'laundry');

    if (hasEv && hasEv.quality === 'excellent') {
      const sunInfo = sun && sun.isDaytime ? ` + sunny for ${this.getHoursUntilSunset(sun)}h` : '';
      return `🚗☀️ Perfect time to charge! Low price${sunInfo}`;
    }

    if (hasEv && hasEv.quality === 'good') {
      return `🚗 Good time to charge EV - ${hasEv.reason}`;
    }

    if (hasLaundry && hasLaundry.quality === 'excellent') {
      return `🧺 Great laundry window! ${hasLaundry.reason}`;
    }

    return null;
  }

  private getHoursUntilSunset(sun: SunForecast): number {
    const now = new Date();
    const [sunsetHour, sunsetMin] = sun.sunset.split(':').map(Number);
    const sunsetTime = new Date();
    sunsetTime.setHours(sunsetHour, sunsetMin, 0, 0);

    const diffMs = sunsetTime.getTime() - now.getTime();
    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
  }
}
