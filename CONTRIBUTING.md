# Contributing to Spot Monitor

Thank you for your interest in contributing to Spot Monitor! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Adding New Data Sources](#adding-new-data-sources)
- [Adding New Countries/Regions](#adding-new-countriesregions)
- [Adding New Currencies](#adding-new-currencies)
- [Submitting Changes](#submitting-changes)
- [Style Guide](#style-guide)

## Code of Conduct

Be respectful, inclusive, and constructive. We're all here to make energy monitoring better for everyone.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/spot-price-monitor.git
   cd spot-price-monitor
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/thesivak/spot-price-monitor.git
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- macOS (for testing the full app)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

This runs both Vite (frontend) and Electron concurrently.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development mode |
| `npm run build` | Build for production |
| `npm run package:mac` | Create macOS .dmg and .zip |

### Project Structure

```
src/
├── main/                    # Electron main process (Node.js)
│   ├── main.ts             # App lifecycle, tray, windows
│   ├── preload.ts          # Context bridge for IPC
│   └── priceService.ts     # Price fetching logic
│
└── renderer/               # React frontend (browser context)
    ├── App.tsx             # Main application component
    ├── components/         # React components
    │   ├── Header.tsx
    │   ├── CurrentPrice.tsx
    │   ├── PriceChart.tsx
    │   └── PriceStats.tsx
    ├── styles/
    │   └── main.css        # All styling
    └── types.ts            # TypeScript interfaces
```

## Project Architecture

### Main Process (`src/main/`)

The Electron main process handles:
- System tray integration
- Native notifications
- Window management
- IPC communication with renderer
- Price fetching (runs in Node.js context)

### Renderer Process (`src/renderer/`)

The React frontend handles:
- UI rendering
- User interactions
- Chart visualization
- Settings management

### IPC Communication

Communication between main and renderer uses Electron's IPC:

```typescript
// Main process (main.ts)
ipcMain.handle('get-current-price', async () => {
  return priceService.getCurrentPrice();
});

// Renderer (via preload)
const price = await window.electronAPI.getCurrentPrice();
```

## Adding New Data Sources

To add a new electricity price data source:

### 1. Create a Provider Interface

```typescript
// src/main/providers/types.ts
export interface PriceProvider {
  name: string;
  supportedRegions: string[];
  fetchCurrentPrice(region: string): Promise<PriceData>;
  fetchHourlyPrices(region: string): Promise<HourlyPrices>;
}
```

### 2. Implement the Provider

```typescript
// src/main/providers/myProvider.ts
import { PriceProvider, PriceData, HourlyPrices } from './types';

export class MyProvider implements PriceProvider {
  name = 'My Provider';
  supportedRegions = ['DE', 'AT', 'FR'];

  async fetchCurrentPrice(region: string): Promise<PriceData> {
    // Fetch from your API
    const response = await fetch(`https://api.example.com/price/${region}`);
    const data = await response.json();

    return {
      priceCZK: data.price * 25, // Convert to base currency
      priceEUR: data.price,
      level: this.calculateLevel(data.price),
      levelNum: data.rank,
    };
  }

  async fetchHourlyPrices(region: string): Promise<HourlyPrices> {
    // Implementation
  }
}
```

### 3. Register the Provider

Add your provider to the service registry in `priceService.ts`.

## Adding New Countries/Regions

### 1. Add Region Configuration

```typescript
// src/shared/regions.ts
export const REGIONS = {
  CZ: { name: 'Czech Republic', currency: 'CZK', timezone: 'Europe/Prague' },
  DE: { name: 'Germany', currency: 'EUR', timezone: 'Europe/Berlin' },
  // Add your region
  PL: { name: 'Poland', currency: 'PLN', timezone: 'Europe/Warsaw' },
};
```

### 2. Add Market Area Code

For ENTSO-E, use the standard area codes:
- `10YCZ-CEPS-----N` - Czech Republic
- `10Y1001A1001A83F` - Germany
- `10YPL-AREA-----S` - Poland

Reference: [ENTSO-E Area Codes](https://transparency.entsoe.eu/content/static_content/Static%20content/web%20api/Guide.html#_areas)

## Adding New Currencies

### 1. Add Currency Configuration

```typescript
// src/shared/currencies.ts
export const CURRENCIES = {
  EUR: { symbol: '€', name: 'Euro', decimals: 2 },
  CZK: { symbol: 'Kč', name: 'Czech Koruna', decimals: 0 },
  // Add your currency
  PLN: { symbol: 'zł', name: 'Polish Złoty', decimals: 2 },
};
```

### 2. Add Exchange Rate Source

Consider using the ECB exchange rates API for EUR-based conversions.

## Submitting Changes

### Pull Request Process

1. **Update your branch** with latest upstream:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Test your changes**:
   ```bash
   npm run build
   npm run package:mac
   ```

3. **Commit with clear messages**:
   ```bash
   git commit -m "feat: add Polish electricity market support

   - Add PL region configuration
   - Implement PSE data provider
   - Add PLN currency support"
   ```

4. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Format

We use conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### PR Checklist

- [ ] Code compiles without errors
- [ ] App runs in development mode
- [ ] App packages successfully
- [ ] New features are documented
- [ ] Commit messages follow convention

## Style Guide

### TypeScript

- Use TypeScript strict mode
- Define interfaces for all data structures
- Prefer `const` over `let`
- Use async/await over raw promises

### React

- Functional components with hooks
- Props interfaces defined above components
- Meaningful component names

### CSS

- Use CSS custom properties (variables)
- Follow the existing naming convention
- Mobile-first is not required (desktop app)

### File Naming

- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Styles: `kebab-case.css`

## Need Help?

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Security**: Email security concerns privately

## Recognition

Contributors will be added to the README acknowledgments section.

---

Thank you for contributing to Spot Monitor! ⚡
