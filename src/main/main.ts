import {
  app,
  BrowserWindow,
  Tray,
  Menu,
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

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;

function createTrayIcon(level: string, price: number): NativeImage {
  // Create a simple text-based tray icon showing current price
  const canvas = `
    <svg width="22" height="22" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="10" fill="${getLevelColor(level)}" opacity="0.9"/>
      <text x="11" y="15" font-family="system-ui" font-size="9" font-weight="bold" fill="white" text-anchor="middle">
        ${Math.round(price / 100)}
      </text>
    </svg>
  `;

  const buffer = Buffer.from(canvas);
  return nativeImage.createFromBuffer(buffer);
}

function getLevelColor(level: string): string {
  switch (level) {
    case 'low': return '#22c55e';
    case 'medium': return '#f59e0b';
    case 'high': return '#ef4444';
    default: return '#6b7280';
  }
}

function createWindow() {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 420,
    height: 580,
    show: false,
    frame: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.hide();
    }
  });
}

function positionWindow() {
  if (!mainWindow || !tray) return;

  const trayBounds = tray.getBounds();
  const windowBounds = mainWindow.getBounds();

  // Position window below the tray icon
  const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);
  const y = Math.round(trayBounds.y + trayBounds.height + 4);

  mainWindow.setPosition(x, y, false);
}

function showNotification(title: string, body: string, level: string) {
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

  const priceKc = Math.round(data.priceCZK / 10) / 100; // Convert to Kč (thousands)
  const levelText = data.level === 'low' ? '🟢 LOW' : data.level === 'high' ? '🔴 HIGH' : '🟡 MED';

  tray.setTitle(` ${priceKc.toFixed(1)}`);
  tray.setToolTip(`Spot Price: ${data.priceCZK} Kč/MWh (${levelText})`);

  // Send notification on level change
  if (lastNotifiedLevel !== data.level) {
    if (data.level === 'low' && lastNotifiedLevel !== null) {
      showNotification(
        '⚡ Low Electricity Price!',
        `Current price: ${data.priceCZK} Kč/MWh - Great time to use power!`,
        data.level
      );
    } else if (data.level === 'high' && lastNotifiedLevel !== null) {
      showNotification(
        '⚡ High Electricity Price',
        `Current price: ${data.priceCZK} Kč/MWh - Consider reducing usage`,
        data.level
      );
    }
    lastNotifiedLevel = data.level;
  }
}

function createTray() {
  // Create a simple colored circle as default icon
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  let icon: NativeImage;

  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      throw new Error('Icon is empty');
    }
  } catch {
    // Create a default icon if file doesn't exist
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setTitle(' --');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Prices',
      click: () => {
        if (mainWindow) {
          positionWindow();
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Refresh',
      click: () => {
        priceService.fetchCurrentPrice();
        priceService.fetchHourlyPrices();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        positionWindow();
        mainWindow.show();
        mainWindow.focus();
      }
    }
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

  ipcMain.on('close-window', () => {
    mainWindow?.hide();
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
