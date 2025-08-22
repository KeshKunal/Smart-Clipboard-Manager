// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // This is our new function. It sets up a listener.
  // The 'callback' is a function that our frontend (renderer.ts) will provide.
  // When the backend sends 'history-updated', this code will run that callback function.
  onHistoryUpdate: (callback: (history: any[]) => void) => 
    ipcRenderer.on('history-updated', (_event, history) => callback(history)),
});