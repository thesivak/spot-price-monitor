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

function createColoredIcon(level: string): NativeImage {
  // Create a simple colored circle as PNG using raw pixel data
  const size = 32;
  const scale = 2; // For retina
  const actualSize = size * scale;

  // Parse hex color to RGB
  const hexColor = getLevelColor(level);
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  // Create RGBA buffer for a filled circle
  const buffer = Buffer.alloc(actualSize * actualSize * 4);
  const centerX = actualSize / 2;
  const centerY = actualSize / 2;
  const radius = (actualSize / 2) - 4;

  for (let y = 0; y < actualSize; y++) {
    for (let x = 0; x < actualSize; x++) {
      const idx = (y * actualSize + x) * 4;
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

      if (dist <= radius) {
        // Inside the circle - use the level color
        buffer[idx] = r;     // R
        buffer[idx + 1] = g; // G
        buffer[idx + 2] = b; // B
        buffer[idx + 3] = 255; // A (fully opaque)
      } else if (dist <= radius + 1) {
        // Anti-aliased edge
        const alpha = Math.max(0, 255 * (1 - (dist - radius)));
        buffer[idx] = r;
        buffer[idx + 1] = g;
        buffer[idx + 2] = b;
        buffer[idx + 3] = Math.round(alpha);
      } else {
        // Outside - transparent
        buffer[idx] = 0;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 0;
      }
    }
  }

  const icon = nativeImage.createFromBuffer(buffer, {
    width: actualSize,
    height: actualSize,
    scaleFactor: scale,
  });

  return icon.resize({ width: 18, height: 18 });
}

function updateTray(data: PriceData) {
  if (!tray) return;

  const priceKc = Math.round(data.priceCZK / 10) / 100;
  const levelText = data.level === 'low' ? 'LOW' : data.level === 'high' ? 'HIGH' : 'MED';

  // Update icon color based on price level
  const coloredIcon = createColoredIcon(data.level);
  tray.setImage(coloredIcon);

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
  // Start with amber/loading icon
  const icon = createColoredIcon('unknown');

  tray = new Tray(icon);
  tray.setTitle(' --');
  tray.setToolTip('Spot Monitor - Loading prices...');

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
