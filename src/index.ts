// Radha Krishna
import { app, BrowserWindow, clipboard } from 'electron';
import Store from 'electron-store';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require('electron-squirrel-startup')) {
  app.quit();
}

type StoreSchema = {
  clipboardHistory: { text: string; timestamp: number }[];
};

const store = new Store<StoreSchema>({
  defaults: { clipboardHistory: [] },
});

const sendHistoryToRenderer = (win: BrowserWindow) => {
  const history = store.get('clipboardHistory');
  win.webContents.send('history-updated', history);
};

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.webContents.openDevTools();

  mainWindow.webContents.on('did-finish-load', () => {
    sendHistoryToRenderer(mainWindow);
  });
};

app.on('ready', () => {
  createWindow();

  let lastCopiedText = clipboard.readText();

  setInterval(() => {
    const currentText = clipboard.readText();
    if (currentText.trim() !== '' && currentText !== lastCopiedText) {
      lastCopiedText = currentText;

      const history = store.get('clipboardHistory');
      history.unshift({ text: currentText, timestamp: Date.now() });
      if (history.length > 100) history.pop();

      store.set('clipboardHistory', history);

      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) sendHistoryToRenderer(focusedWindow);
    }
  }, 1000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});