import { timeStamp } from 'console';
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onHistoryUpdate: (callback: (history: any[]) => void) => 
    ipcRenderer.on('history-updated', (_event, history) => callback(history)),

  //function to send text to be copied
  copyToClipboard: (text: string) => ipcRenderer.send('copy-to-clipboard', text),

  //function to send search text
  // searchInPage: (text: string) => ipcRenderer.send('search-in-page', text),

  togglePin: (timestamp: number) => ipcRenderer.send('toggle-pin-status', timestamp),

  deleteClip: (timeStamp: number) => ipcRenderer.send('delete-clip', timeStamp),
});