import { app, BrowserWindow, clipboard, ipcMain , Tray, Menu} from 'electron';
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

  app.on('window-all-closed', () => {
    // Do nothing. The app should stay active.
});

  // We store the app's URL in a variable to reuse it
  const appUrl = MAIN_WINDOW_WEBPACK_ENTRY;
  mainWindow.loadURL(appUrl);


  // When the window loses focus (app is in the background)
  mainWindow.on('blur', () => {
    // Navigate to a blank page to free up renderer memory
    mainWindow.loadURL('about:blank');
  });

  // When the window gains focus (user clicks back on the app)
  mainWindow.on('focus', () => {
    // Reload our application
    mainWindow.loadURL(appUrl);
  });

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

 // 1. Create the worker ONCE.
  const worker = new Worker(path.join(__dirname, 'analysis.worker.js'));
  
  // 2. Set up its 'message' listener ONCE.
  worker.on('message', (metadata: AnalysisResult) => {
    const history = getStore().get('clipboardHistory');
    // We get the text from lastCopiedText, which is updated in the interval
    const newEntry = { text: lastCopiedText, timestamp: Date.now(), metadata: metadata };
    history.unshift(newEntry);
    if (history.length > 100) { history.pop(); }
    getStore().set('clipboardHistory', history);

    if (mainWindow) {
      sendHistoryToRenderer(mainWindow);
    }
  });

  // 3. Set up its 'error' listener ONCE.
  worker.on('error', (err) => console.error(err));
  
  let lastCopiedText = clipboard.readText();
  
  // 4. The interval is now much simpler.
  setInterval(() => {
    const currentText = clipboard.readText();
    if (currentText.trim() !== '' && currentText !== lastCopiedText) {
      lastCopiedText = currentText;

      const history = getStore().get('clipboardHistory');
      if (history.length > 0 && history[0].text === currentText) {
        return; 
      }
      
      // It just SENDS A MESSAGE to the worker we already created.
      worker.postMessage(currentText);
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



