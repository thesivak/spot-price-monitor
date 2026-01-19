import { FC } from 'react';

interface HeaderProps {
  onClose: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const Header: FC<HeaderProps> = ({ onClose, onRefresh, isLoading }) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo-container">
          <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <div className="logo-text">
            <span className="logo-title">SPOT</span>
            <span className="logo-subtitle">MONITOR</span>
          </div>
        </div>
      </div>
      <div className="header-right">
        <button
          className={`header-btn refresh-btn ${isLoading ? 'loading' : ''}`}
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh prices"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
        </button>
        <button className="header-btn close-btn" onClick={onClose} title="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;
