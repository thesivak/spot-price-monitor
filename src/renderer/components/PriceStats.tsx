import { FC, useMemo } from 'react';
import { HourlyPrices } from '../types';

interface PriceStatsProps {
  data: HourlyPrices | null;
}

const PriceStats: FC<PriceStatsProps> = ({ data }) => {
  const stats = useMemo(() => {
    if (!data || data.hoursToday.length === 0) return null;

    const prices = data.hoursToday.map((h) => h.priceCZK);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

    const minHour = data.hoursToday.find((h) => h.priceCZK === min);
    const maxHour = data.hoursToday.find((h) => h.priceCZK === max);

    // Find best hours (low level)
    const cheapHours = data.hoursToday
      .filter((h) => h.level === 'low')
      .sort((a, b) => a.priceCZK - b.priceCZK)
      .slice(0, 3);

    return {
      min: min / 1000,
      max: max / 1000,
      avg: avg / 1000,
      minHour: minHour?.hour,
      maxHour: maxHour?.hour,
      cheapHours,
    };
  }, [data]);

  if (!stats) {
    return (
      <div className="stats-container loading">
        <div className="stat-skeleton" />
        <div className="stat-skeleton" />
        <div className="stat-skeleton" />
      </div>
    );
  }

  return (
    <div className="stats-container">
      <div className="stats-grid">
        <div className="stat-card stat-min">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23,18 13.5,8.5 8.5,13.5 1,6" />
              <polyline points="17,18 23,18 23,12" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">MINIMUM</span>
            <span className="stat-value">{stats.min.toFixed(2)}</span>
            <span className="stat-unit">Kč/kWh</span>
            <span className="stat-detail">at {stats.minHour?.toString().padStart(2, '0')}:00</span>
          </div>
        </div>

        <div className="stat-card stat-max">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
              <polyline points="17,6 23,6 23,12" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">MAXIMUM</span>
            <span className="stat-value">{stats.max.toFixed(2)}</span>
            <span className="stat-unit">Kč/kWh</span>
            <span className="stat-detail">at {stats.maxHour?.toString().padStart(2, '0')}:00</span>
          </div>
        </div>

        <div className="stat-card stat-avg">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="12" x2="20" y2="12" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">AVERAGE</span>
            <span className="stat-value">{stats.avg.toFixed(2)}</span>
            <span className="stat-unit">Kč/kWh</span>
            <span className="stat-detail">today</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default PriceStats;
