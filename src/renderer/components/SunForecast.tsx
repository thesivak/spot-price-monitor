import { FC } from 'react';
import { SunForecast as SunForecastType } from '../types';

interface SunForecastProps {
  data: SunForecastType | null;
}

const SunForecast: FC<SunForecastProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="sun-forecast-container loading">
        <div className="sun-forecast-skeleton" />
      </div>
    );
  }

  const getWeatherIcon = (condition: string, isDaytime: boolean): string => {
    if (!isDaytime) return '🌙';
    switch (condition) {
      case 'clear':
        return '☀️';
      case 'partly_cloudy':
        return '🌤️';
      case 'cloudy':
        return '⛅';
      case 'overcast':
        return '☁️';
      default:
        return '☀️';
    }
  };

  const getWeatherLabel = (condition: string): string => {
    switch (condition) {
      case 'clear':
        return 'Clear';
      case 'partly_cloudy':
        return 'Partly cloudy';
      case 'cloudy':
        return 'Cloudy';
      case 'overcast':
        return 'Overcast';
      default:
        return condition;
    }
  };

  const getPotentialLabel = (potential: string): string => {
    switch (potential) {
      case 'high':
        return 'HIGH';
      case 'medium':
        return 'MEDIUM';
      case 'low':
        return 'LOW';
      default:
        return potential.toUpperCase();
    }
  };

  const getPotentialPercent = (potential: string): number => {
    switch (potential) {
      case 'high':
        return 85;
      case 'medium':
        return 55;
      case 'low':
        return 25;
      default:
        return 0;
    }
  };

  const weatherIcon = getWeatherIcon(data.weatherCondition, data.isDaytime);
  const weatherLabel = getWeatherLabel(data.weatherCondition);
  const potentialLabel = getPotentialLabel(data.generationPotential);
  const potentialPercent = getPotentialPercent(data.generationPotential);

  return (
    <div className={`sun-forecast-container potential-${data.generationPotential}`}>
      <div className="sun-forecast-row">
        <div className="sun-current">
          <span className="sun-icon">{weatherIcon}</span>
          <div className="sun-info">
            <span className="sun-label">NOW</span>
            <span className="sun-condition">{weatherLabel}</span>
            <span className="sun-irradiance">{Math.round(data.currentIrradiance)} W/m²</span>
          </div>
        </div>

        <div className="sun-potential">
          <div className="potential-label">Solar</div>
          <div className={`potential-badge potential-${data.generationPotential}`}>
            {potentialLabel}
          </div>
          <div className="potential-bar">
            <div
              className="potential-fill"
              style={{ width: `${potentialPercent}%` }}
            />
          </div>
        </div>

        <div className="sun-times">
          <div className="sun-time">
            <span className="time-icon">🌅</span>
            <span className="time-value">{data.sunset}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SunForecast;
