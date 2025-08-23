// Radha Krishna
import { app, BrowserWindow, clipboard, ipcMain } from 'electron';
import path from 'path';
// import { AnalysisResult, analyzeText } from './analysis';
// import Store from 'electron-store';
import type Store from 'electron-store';
import { Worker } from 'worker_threads';
import { AnalysisResult } from './analysis';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require('electron-squirrel-startup')) {
  app.quit();
}

// --- Declare a variable to hold our main window ---
let mainWindow: BrowserWindow | null = null;

type StoreSchema = {
  clipboardHistory: { 
    text: string; 
    timestamp: number; 
    metadata?: AnalysisResult 
  }[];
};

// Lazy loading implementation
let store: Store<StoreSchema> | null = null;

const getStore = () => {
  if (store === null) {
    const StoreClass = require('electron-store') as typeof Store;
   
    store = new StoreClass<StoreSchema>({
      defaults: { clipboardHistory: [] },
    });
  }
  return store;
};


const sendHistoryToRenderer = (win: BrowserWindow) => {
  if (win) {
    const history = getStore().get('clipboardHistory');
    win.webContents.send('history-updated', history);
  }
};

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
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
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', () => {
  createWindow();

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

  let lastCopiedText = clipboard.readText();
  
  setInterval(() => {
    const currentText = clipboard.readText();
    if (currentText.trim() !== '' && currentText !== lastCopiedText) {
      lastCopiedText = currentText;
      const textToAnalyze = currentText;

      const worker = new Worker(path.join(__dirname, 'analysis.worker.js'));

      worker.on('message', (metadata: AnalysisResult) => {
        const history = getStore().get('clipboardHistory');
        const newEntry = { 
          text: textToAnalyze, 
          timestamp: Date.now(),
          metadata: metadata 
        };
        history.unshift(newEntry);
        if (history.length > 100) { 
          history.pop(); 
        }
        getStore().set('clipboardHistory', history);

        if (mainWindow) {
          sendHistoryToRenderer(mainWindow);
        }
      });

      worker.on('error', (err) => console.error(err));
      worker.postMessage(textToAnalyze);
    }
  }, 1000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
