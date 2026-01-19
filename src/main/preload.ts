import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  getCurrentPrice: () => Promise<any>;
  getHourlyPrices: () => Promise<any>;
  refreshPrices: () => Promise<any>;
  getSettings: () => Promise<any>;
  updateSettings: (settings: any) => Promise<any>;
  closeWindow: () => void;
  quitApp: () => void;
  onPriceUpdated: (callback: (data: any) => void) => void;
  onHourlyUpdated: (callback: (data: any) => void) => void;
}

contextBridge.exposeInMainWorld('electronAPI', {
  getCurrentPrice: () => ipcRenderer.invoke('get-current-price'),
  getHourlyPrices: () => ipcRenderer.invoke('get-hourly-prices'),
  refreshPrices: () => ipcRenderer.invoke('refresh-prices'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: any) => ipcRenderer.invoke('update-settings', settings),
  closeWindow: () => ipcRenderer.send('close-window'),
  quitApp: () => ipcRenderer.send('quit-app'),
  onPriceUpdated: (callback: (data: any) => void) => {
    ipcRenderer.on('price-updated', (_event, data) => callback(data));
  },
  onHourlyUpdated: (callback: (data: any) => void) => {
    ipcRenderer.on('hourly-updated', (_event, data) => callback(data));
  },
} as ElectronAPI);
