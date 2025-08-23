import { app, BrowserWindow, clipboard, ipcMain } from 'electron';
import path from 'path';
import type Store from 'electron-store';
import { Worker } from 'worker_threads';
import { AnalysisResult } from './analysis';

app.disableHardwareAcceleration();

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
    metadata?: AnalysisResult;
    isPinned?: boolean;
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
  mainWindow.webContents.executeJavaScript('!window.gc && (window.gc = () => {})');

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.webContents.openDevTools();
  
  mainWindow.webContents.on('did-finish-load', () => {
    sendHistoryToRenderer(mainWindow);
  });
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.commandLine.appendSwitch('in-process-gpu');

app.on('ready', () => {
  createWindow();

  //  COPY
 ipcMain.on('copy-to-clipboard', (event, text, timestamp) => {
    // 1. Still copy the text to the OS clipboard
    clipboard.writeText(text);

    // 2. Re-order the history 
    let history = getStore().get('clipboardHistory');
    const itemIndex = history.findIndex(i => i.timestamp === timestamp);

    // If the item is found and not already at the top
    if (itemIndex > 0) {
        const [item] = history.splice(itemIndex, 1);
        history.unshift(item);
        getStore().set('clipboardHistory', history);
        if (mainWindow) {
            sendHistoryToRenderer(mainWindow);
        }
    }
});

  // SEARCH
  // ipcMain.on('search-in-page', (event, text) => {
  //   const focusedWindow = BrowserWindow.getFocusedWindow();
  //   if (focusedWindow) {
  //     if (text) {
  //       focusedWindow.webContents.findInPage(text);
  //     } else {
  //       focusedWindow.webContents.stopFindInPage('clearSelection');
  //     }
  //   }
  // });

  // PIN
    ipcMain.on('toggle-pin-status', (event, timestamp) => {
        const history = getStore().get('clipboardHistory');
        const item = history.find(i => i.timestamp === timestamp);
        if (item) {
            item.isPinned = !item.isPinned; // Flip the boolean
        }
        getStore().set('clipboardHistory', history);
        sendHistoryToRenderer(mainWindow); // Send update to UI
    });

    // DELETE
    ipcMain.on('delete-clip', (event, timestamp) => {
        let history = getStore().get('clipboardHistory');
        history = history.filter(i => i.timestamp !== timestamp); // Keep all items EXCEPT the one to delete
        getStore().set('clipboardHistory', history);
        sendHistoryToRenderer(mainWindow); // Send update to UI
    });

  let lastCopiedText = clipboard.readText();
  
  setInterval(() => {
    const currentText = clipboard.readText();
    if (currentText.trim() !== '' && currentText !== lastCopiedText) {
      lastCopiedText = currentText;

        const history = getStore().get('clipboardHistory');
        if (history.length > 0 && history[0].text === currentText) {
            return; // Exit if this is a duplicate of the most recent item
        }
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


