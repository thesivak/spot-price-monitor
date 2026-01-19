import { useState, useEffect, useCallback } from 'react';
import { PriceData, HourlyPrices } from './types';
import CurrentPrice from './components/CurrentPrice';
import PriceChart from './components/PriceChart';
import PriceStats from './components/PriceStats';
import Header from './components/Header';

function App() {
  const [currentPrice, setCurrentPrice] = useState<PriceData | null>(null);
  const [hourlyPrices, setHourlyPrices] = useState<HourlyPrices | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI.refreshPrices();
      if (result.current) setCurrentPrice(result.current);
      if (result.hourly) setHourlyPrices(result.hourly);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial data fetch
    const loadInitialData = async () => {
      const [current, hourly] = await Promise.all([
        window.electronAPI.getCurrentPrice(),
        window.electronAPI.getHourlyPrices(),
      ]);
      if (current) setCurrentPrice(current);
      if (hourly) setHourlyPrices(hourly);
      setLastUpdate(new Date());
      setIsLoading(false);
    };

    loadInitialData();

    // Listen for updates from main process
    window.electronAPI.onPriceUpdated((data) => {
      setCurrentPrice(data);
      setLastUpdate(new Date());
    });

    window.electronAPI.onHourlyUpdated((data) => {
      setHourlyPrices(data);
    });
  }, []);

  const handleClose = () => {
    window.electronAPI.closeWindow();
  };

  return (
    <div className="app-container">
      <div className="app-frame">
        <div className="scanlines" />
        <div className="grid-overlay" />

        <Header onClose={handleClose} onRefresh={fetchData} isLoading={isLoading} />

        <main className="main-content">
          <CurrentPrice data={currentPrice} lastUpdate={lastUpdate} />

          <div className="section-divider">
            <span className="divider-label">HOURLY RATES</span>
            <div className="divider-line" />
          </div>

          <PriceChart data={hourlyPrices} currentHour={new Date().getHours()} />

          <PriceStats data={hourlyPrices} />
        </main>

        <footer className="app-footer">
          <div className="footer-grid">
            <span className="footer-label">SRC</span>
            <span className="footer-value">OTE.CZ</span>
          </div>
          <div className="footer-badge">
            <span className="pulse-dot" />
            <span>LIVE</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
