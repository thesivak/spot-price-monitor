import {
  app,
  BrowserWindow,
  Tray,
  nativeImage,
  NativeImage,
  Notification,
  ipcMain,
  screen,
} from 'electron';
import * as path from 'path';
import { PriceService, PriceData } from './priceService';

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let priceService: PriceService;
let lastNotifiedLevel: string | null = null;

// Use app.isPackaged as the reliable way to detect production vs development
const isDev = !app.isPackaged;

// Auto-launch settings
function getLoginItemSettings() {
  return app.getLoginItemSettings();
}

function setAutoLaunch(enable: boolean) {
  app.setLoginItemSettings({
    openAtLogin: enable,
    openAsHidden: true,
  });
}

function getLevelColor(level: string): string {
  switch (level) {
    case 'low': return '#22c55e';
    case 'medium': return '#f59e0b';
    case 'high': return '#ef4444';
    default: return '#6b7280';
  }
}

function getAssetPath(assetName: string): string {
  if (isDev) {
    return path.join(__dirname, '../../assets', assetName);
  }
  // In packaged app, assets are in the resources folder
  return path.join(process.resourcesPath, 'assets', assetName);
}

function getRendererPath(): string {
  if (isDev) {
    return 'http://localhost:5173';
  }
  // In packaged app, renderer is in the dist/renderer folder
  return path.join(__dirname, '../renderer/index.html');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 620,
    show: false,
    frame: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Uncomment to open devtools
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.hide();
    }
  });

  // Log any load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });
}

function showWindow() {
  if (!mainWindow || !tray) return;

  const trayBounds = tray.getBounds();
  const windowBounds = mainWindow.getBounds();
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;

  // Position window below the tray icon, centered
  let x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);
  const y = Math.round(trayBounds.y + trayBounds.height + 4);

  // Make sure window doesn't go off screen
  if (x + windowBounds.width > screenWidth) {
    x = screenWidth - windowBounds.width - 10;
  }
  if (x < 10) {
    x = 10;
  }

  mainWindow.setPosition(x, y, false);
  mainWindow.show();
  mainWindow.focus();
}

function hideWindow() {
  mainWindow?.hide();
}

function toggleWindow() {
  if (mainWindow?.isVisible()) {
    hideWindow();
  } else {
    showWindow();
  }
}

function showNotification(title: string, body: string) {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      silent: false,
    });
    notification.show();
  }
}

function updateTray(data: PriceData) {
  if (!tray) return;

  const priceKc = Math.round(data.priceCZK / 10) / 100;
  const levelText = data.level === 'low' ? 'LOW' : data.level === 'high' ? 'HIGH' : 'MED';

  tray.setTitle(` ${priceKc.toFixed(1)}`);
  tray.setToolTip(`Spot Price: ${data.priceCZK} Kč/MWh (${levelText})\nClick to view details`);

  // Send notification on level change
  if (lastNotifiedLevel !== data.level) {
    if (data.level === 'low' && lastNotifiedLevel !== null) {
      showNotification(
        '⚡ Low Electricity Price!',
        `Current price: ${data.priceCZK} Kč/MWh - Great time to use power!`
      );
    } else if (data.level === 'high' && lastNotifiedLevel !== null) {
      showNotification(
        '⚡ High Electricity Price',
        `Current price: ${data.priceCZK} Kč/MWh - Consider reducing usage`
      );
    }
    lastNotifiedLevel = data.level;
  }
}

function createTray() {
  let icon: NativeImage;

  try {
    // Try loading @2x version for Retina displays
    const icon2xPath = getAssetPath('tray-icon@2x.png');
    const icon1xPath = getAssetPath('tray-icon.png');

    console.log('Trying to load icon from:', icon2xPath);
    icon = nativeImage.createFromPath(icon2xPath);

    if (icon.isEmpty()) {
      console.log('2x icon empty, trying 1x:', icon1xPath);
      icon = nativeImage.createFromPath(icon1xPath);
    }

    if (icon.isEmpty()) {
      throw new Error('Both icon paths returned empty images');
    }

    // Resize for macOS menu bar (template image at 16x16 or 18x18)
    icon = icon.resize({ width: 16, height: 16 });
    icon.setTemplateImage(true); // Makes it work with dark/light menu bar
  } catch (e) {
    console.error('Failed to load tray icon:', e);
    // Create a simple fallback icon using data URL
    const fallbackSvg = `<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="7" fill="#ffc857"/><path d="M9 3L5 9h3l-1 5 4-6H8l1-5z" fill="#000"/></svg>`;
    const base64 = Buffer.from(fallbackSvg).toString('base64');
    icon = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${base64}`);
    icon = icon.resize({ width: 16, height: 16 });
  }

  tray = new Tray(icon);
  tray.setTitle(' --');
  tray.setToolTip('Spot Monitor - Click to view prices');

  // Left click toggles the window - NO context menu
  tray.on('click', () => {
    toggleWindow();
  });

  // Right click also toggles (no menu)
  tray.on('right-click', () => {
    toggleWindow();
  });
}

function setupIPC() {
  ipcMain.handle('get-current-price', async () => {
    return priceService.getCurrentPrice();
  });

  ipcMain.handle('get-hourly-prices', async () => {
    return priceService.getHourlyPrices();
  });

  ipcMain.handle('refresh-prices', async () => {
    await Promise.all([
      priceService.fetchCurrentPrice(),
      priceService.fetchHourlyPrices(),
    ]);
    return {
      current: priceService.getCurrentPrice(),
      hourly: priceService.getHourlyPrices(),
    };
  });

  ipcMain.handle('get-settings', () => {
    return {
      ...priceService.getSettings(),
      startAtLogin: getLoginItemSettings().openAtLogin,
    };
  });

  ipcMain.handle('update-settings', (_event, newSettings) => {
    if (newSettings.startAtLogin !== undefined) {
      setAutoLaunch(newSettings.startAtLogin);
    }
    return priceService.updateSettings(newSettings);
  });

  ipcMain.on('close-window', () => {
    hideWindow();
  });

  ipcMain.on('quit-app', () => {
    app.quit();
  });
}

app.whenReady().then(async () => {
  // Initialize price service
  priceService = new PriceService();

  // Set up price update callback
  priceService.onPriceUpdate((data) => {
    updateTray(data);
    mainWindow?.webContents.send('price-updated', data);
  });

  priceService.onHourlyUpdate((data) => {
    mainWindow?.webContents.send('hourly-updated', data);
  });

  createTray();
  createWindow();
  setupIPC();

  // Initial fetch
  await Promise.all([
    priceService.fetchCurrentPrice(),
    priceService.fetchHourlyPrices(),
  ]);

  // Set up periodic refresh (every 5 minutes)
  setInterval(() => {
    priceService.fetchCurrentPrice();
  }, 5 * 60 * 1000);

  // Fetch hourly prices every 30 minutes
  setInterval(() => {
    priceService.fetchHourlyPrices();
  }, 30 * 60 * 1000);
});

app.on('window-all-closed', () => {
  // Don't quit on macOS when all windows are closed
});

app.dock?.hide(); // Hide dock icon on macOS
