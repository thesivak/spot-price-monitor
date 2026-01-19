import { FC, useState, useEffect } from 'react';

interface SettingsProps {
  onClose: () => void;
  onSettingsChange: () => void;
}

interface AppSettings {
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

const REGIONS = [
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'DE', name: 'Germany' },
  { code: 'AT', name: 'Austria' },
  { code: 'PL', name: 'Poland' },
  { code: 'HU', name: 'Hungary' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy (North)' },
  { code: 'PT', name: 'Portugal' },
  { code: 'GR', name: 'Greece' },
  { code: 'RO', name: 'Romania' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'GB', name: 'United Kingdom' },
];

const CURRENCIES = [
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'CZK', name: 'Czech Koruna (Kč)' },
  { code: 'PLN', name: 'Polish Złoty (zł)' },
  { code: 'HUF', name: 'Hungarian Forint (Ft)' },
  { code: 'RON', name: 'Romanian Leu (lei)' },
  { code: 'SEK', name: 'Swedish Krona (kr)' },
  { code: 'NOK', name: 'Norwegian Krone (kr)' },
  { code: 'DKK', name: 'Danish Krone (kr)' },
  { code: 'CHF', name: 'Swiss Franc (Fr.)' },
  { code: 'GBP', name: 'British Pound (£)' },
];

const Settings: FC<SettingsProps> = ({ onClose, onSettingsChange }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const s = await window.electronAPI.getSettings();
      setSettings(s);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    if (!settings) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      await window.electronAPI.updateSettings({ [key]: value });
      onSettingsChange();
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  if (loading || !settings) {
    return (
      <div className="settings-panel">
        <div className="settings-loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Settings</h2>
        <button className="settings-close-btn" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <label className="settings-label">Region / Country</label>
          <select
            className="settings-select"
            value={settings.region}
            onChange={(e) => updateSetting('region', e.target.value)}
          >
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
          <p className="settings-hint">
            Select your electricity market region
          </p>
        </div>

        <div className="settings-section">
          <label className="settings-label">Currency</label>
          <select
            className="settings-select"
            value={settings.currency}
            onChange={(e) => updateSetting('currency', e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="settings-hint">
            Display prices in your preferred currency
          </p>
        </div>

        <div className="settings-section">
          <label className="settings-label">Startup</label>
          <div className="settings-toggle-row">
            <span>Start at Login</span>
            <button
              className={`settings-toggle ${settings.startAtLogin ? 'active' : ''}`}
              onClick={() => updateSetting('startAtLogin', !settings.startAtLogin)}
            >
              <span className="toggle-knob" />
            </button>
          </div>
          <p className="settings-hint">
            Automatically start Spot Monitor when you log in
          </p>
        </div>

        <div className="settings-section">
          <label className="settings-label">Notifications</label>
          <div className="settings-toggle-row">
            <span>Low Price Alerts</span>
            <button
              className={`settings-toggle ${settings.notifications?.lowPrice ? 'active' : ''}`}
              onClick={() =>
                updateSetting('notifications', {
                  ...settings.notifications,
                  lowPrice: !settings.notifications?.lowPrice,
                })
              }
            >
              <span className="toggle-knob" />
            </button>
          </div>
          <div className="settings-toggle-row">
            <span>High Price Alerts</span>
            <button
              className={`settings-toggle ${settings.notifications?.highPrice ? 'active' : ''}`}
              onClick={() =>
                updateSetting('notifications', {
                  ...settings.notifications,
                  highPrice: !settings.notifications?.highPrice,
                })
              }
            >
              <span className="toggle-knob" />
            </button>
          </div>
        </div>

        <div className="settings-section">
          <label className="settings-label">Solar Panel Setup (Optional)</label>
          <div className="settings-input-row">
            <span>Panel Capacity (kWp)</span>
            <input
              type="number"
              className="settings-input"
              placeholder="e.g., 6"
              value={settings.solarCapacityKwp || ''}
              onChange={(e) => {
                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                updateSetting('solarCapacityKwp', value);
              }}
              min="0"
              max="100"
              step="0.5"
            />
          </div>
          <p className="settings-hint">
            Enter your solar system capacity for better generation estimates
          </p>
        </div>

        <div className="settings-section settings-info">
          <div className="info-row">
            <span className="info-label">Data Source</span>
            <span className="info-value">spotovaelektrina.cz</span>
          </div>
          <div className="info-row">
            <span className="info-label">Version</span>
            <span className="info-value">1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
