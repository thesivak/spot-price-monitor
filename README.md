# ⚡ Spot Monitor

A sleek macOS menu bar app for monitoring European electricity spot prices in real-time.

![Spot Monitor](https://img.shields.io/badge/platform-macOS-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Electron](https://img.shields.io/badge/electron-40.0.0-purple)

<p align="center">
  <img src="assets/screenshot.png" alt="Spot Monitor Screenshot" width="400">
</p>

## Features

- 📊 **Real-time spot prices** - Current electricity price displayed in your menu bar
- 📈 **Hourly price charts** - View today's and tomorrow's prices at a glance
- 🔔 **Price notifications** - Get alerted when prices drop to "low" or rise to "high"
- 🌍 **Multi-country support** - Works across European electricity markets
- 💱 **Multiple currencies** - Display prices in EUR, CZK, PLN, SEK, NOK, DKK, CHF, or GBP
- 🚀 **Start at login** - Option to launch automatically when you start your Mac
- 🎨 **Industrial aesthetic** - Beautiful "Power Grid Command Center" design

## Supported Countries

Spot Monitor supports electricity markets across Europe through various data sources:

| Region | Countries | Data Source |
|--------|-----------|-------------|
| Central Europe | Czech Republic, Slovakia, Hungary | [spotovaelektrina.cz](https://spotovaelektrina.cz) (OTE) |
| ENTSO-E Markets | 35+ European countries | [ENTSO-E Transparency Platform](https://transparency.entsoe.eu/) |

### ENTSO-E Supported Countries

Austria, Belgium, Bulgaria, Croatia, Czech Republic, Denmark, Estonia, Finland, France, Germany, Greece, Hungary, Ireland, Italy, Latvia, Lithuania, Luxembourg, Montenegro, Netherlands, North Macedonia, Norway, Poland, Portugal, Romania, Serbia, Slovakia, Slovenia, Spain, Sweden, Switzerland, Ukraine, United Kingdom

## Installation

### Download

Download the latest release from the [Releases](https://github.com/thesivak/spot-price-monitor/releases) page.

### Build from Source

```bash
# Clone the repository
git clone https://github.com/thesivak/spot-price-monitor.git
cd spot-price-monitor

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run package:mac
```

## Usage

1. **Launch the app** - The ⚡ icon appears in your menu bar
2. **Click the icon** - Opens the price dashboard with current price and chart
3. **Right-click** - Access settings, refresh, and quit options
4. **Enable "Start at Login"** - Right-click menu → Start at Login

### Settings

Access settings by clicking the ⚙️ icon in the app window:

- **Country/Region** - Select your electricity market region
- **Currency** - Choose your preferred currency display
- **Data Source** - Select between available price providers
- **ENTSO-E API Key** - Required for ENTSO-E data (free registration)

### Getting an ENTSO-E API Key

1. Register at [ENTSO-E Transparency Platform](https://transparency.entsoe.eu/)
2. Email `transparency@entsoe.eu` with subject "Restful API access"
3. Enter your API key in Spot Monitor settings

## Tech Stack

- **Electron** - Cross-platform desktop framework
- **React 19** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tooling
- **Chart.js** - Beautiful price charts

## Project Structure

```
spot-price-monitor/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.ts          # App entry, tray, windows
│   │   ├── preload.ts       # Context bridge
│   │   └── priceService.ts  # API service
│   └── renderer/            # React frontend
│       ├── components/      # UI components
│       ├── styles/          # CSS styling
│       └── App.tsx          # Main React app
├── assets/                  # Icons and images
└── release/                 # Built applications
```

## Data Sources

### spotovaelektrina.cz (Default)
- **Coverage**: Czech Republic (OTE market data)
- **Authentication**: None required
- **Update frequency**: Every 15 minutes
- **API Documentation**: [spotovaelektrina.cz/api](https://spotovaelektrina.cz/api)

### ENTSO-E Transparency Platform
- **Coverage**: 35+ European countries
- **Authentication**: Free API key required
- **Update frequency**: Day-ahead prices published at 13:00 CET
- **API Documentation**: [ENTSO-E API Guide](https://transparency.entsoe.eu/content/static_content/Static%20content/web%20api/Guide.html)

## Understanding Spot Prices

Electricity spot prices are determined hourly (or quarter-hourly) on power exchanges. The price fluctuates based on:

- **Supply**: Solar, wind, nuclear, gas generation
- **Demand**: Industrial, commercial, residential consumption
- **Interconnections**: Cross-border electricity trading
- **Weather**: Temperature affects heating/cooling demand

**Price Levels:**
- 🟢 **Low** - Below average, good time for high-consumption activities
- 🟡 **Medium** - Normal pricing
- 🔴 **High** - Above average, consider reducing consumption

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Start for Contributors

```bash
# Fork and clone the repo
git clone https://github.com/YOUR_USERNAME/spot-price-monitor.git

# Install dependencies
npm install

# Start development
npm run dev

# Make your changes, then submit a PR
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [spotovaelektrina.cz](https://spotovaelektrina.cz) for Czech market data
- [ENTSO-E](https://www.entsoe.eu/) for European market data
- [OTE](https://www.ote-cr.cz/) - Czech electricity market operator

## Related Projects

- [entsoe-py](https://github.com/EnergieID/entsoe-py) - Python client for ENTSO-E API
- [hass-entso-e](https://github.com/JaccoR/hass-entso-e) - Home Assistant integration

---

<p align="center">
  Made with ⚡ for the European energy community
</p>
