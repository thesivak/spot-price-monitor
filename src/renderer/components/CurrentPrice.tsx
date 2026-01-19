import { FC } from 'react';
import { PriceData } from '../types';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface CurrentPriceProps {
  data: PriceData | null;
  lastUpdate: Date | null;
}

const CurrentPrice: FC<CurrentPriceProps> = ({ data, lastUpdate }) => {
  if (!data) {
    return (
      <div className="current-price-container loading">
        <div className="price-skeleton" />
      </div>
    );
  }

  const levelClass = `level-${data.level}`;
  const levelLabels: Record<string, string> = {
    low: 'LOW',
    medium: 'MEDIUM',
    high: 'HIGH',
    unknown: 'N/A',
  };

  const formatPrice = (price: number) => {
    const kc = price / 1000;
    return kc.toFixed(2);
  };

  return (
    <div className={`current-price-container ${levelClass}`}>
      <div className="price-header-row">
        <span className="price-label">CURRENT PRICE</span>
        <div className={`level-badge ${levelClass}`}>
          <span className="level-indicator" />
          <span>{levelLabels[data.level]}</span>
        </div>
      </div>

      <div className="price-display">
        <div className="price-main">
          <span className="price-value">{formatPrice(data.priceCZK)}</span>
          <div className="price-unit">
            <span>Kč</span>
            <span className="price-unit-small">/kWh</span>
          </div>
        </div>
        <div className="price-secondary">
          <span className="price-eur">{data.priceEUR.toFixed(2)} €/MWh</span>
          <span className="price-divider">•</span>
          <span className="price-czk-mwh">{data.priceCZK} Kč/MWh</span>
        </div>
      </div>

      <div className="price-gauge">
        <div className="gauge-track">
          <div
            className="gauge-fill"
            style={{ width: `${Math.min(100, (data.levelNum / 24) * 100)}%` }}
          />
          <div
            className="gauge-marker"
            style={{ left: `${Math.min(100, (data.levelNum / 24) * 100)}%` }}
          />
        </div>
        <div className="gauge-labels">
          <span>CHEAP</span>
          <span className="gauge-position">{data.levelNum}/24</span>
          <span>EXPENSIVE</span>
        </div>
      </div>

      {lastUpdate && (
        <div className="update-info">
          <svg className="update-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
          <span>Updated {format(lastUpdate, 'HH:mm:ss', { locale: cs })}</span>
        </div>
      )}
    </div>
  );
};

export default CurrentPrice;
