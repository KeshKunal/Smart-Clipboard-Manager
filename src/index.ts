// Radha Krishna
import { app, BrowserWindow, clipboard, ipcMain } from 'electron';
import { analyzeText, AnalysisResult } from './analysis';
import Store from 'electron-store';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require('electron-squirrel-startup')) {
  app.quit();
}

type StoreSchema = {
  clipboardHistory: { 
    text: string; 
    timestamp: number;
    metadata?: AnalysisResult;
  }[];
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

      analyzeText(currentText)
        .then(metadata => {
          const history = store.get('clipboardHistory');
          const newEntry = {
            text: currentText,
            timestamp: Date.now(),
            metadata: metadata
          };

          history.unshift(newEntry);
          if (history.length > 100) {
            history.pop();
          }

          store.set('clipboardHistory', history);
          
          const focusedWindow = BrowserWindow.getFocusedWindow();    
          if (focusedWindow) {
            sendHistoryToRenderer(focusedWindow);
          }
        })
        .catch(error => {
          console.error('Error analyzing text:', error);
          // Still save the entry even if analysis fails
          const history = store.get('clipboardHistory');
          history.unshift({
            text: currentText,
            timestamp: Date.now()
          });
          store.set('clipboardHistory', history);
        });
    }
  }, 1000);


//   IPC Listener
  ipcMain.on('copy-to-clipboard', (event, text) => {
    clipboard.writeText(text);
  });

  ipcMain.on('search-in-page', (event, text) => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      if (text) {
        focusedWindow.webContents.findInPage(text);
      } else {
        focusedWindow.webContents.stopFindInPage('clearSelection');
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});