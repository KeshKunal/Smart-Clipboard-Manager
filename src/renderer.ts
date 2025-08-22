// 1. Import the CSS file so Webpack can bundle it.
import './index.css';

// Define the electronAPI object on the window for TypeScript
declare global {
  interface Window {
    electronAPI: {
      onHistoryUpdate: (callback: (history: any[]) => void) => void;
    };
  }
}

// 2. Wait for the DOM to be fully loaded before running our script.
window.addEventListener('DOMContentLoaded', () => {
  console.log('Renderer is loaded and DOM is ready!');

  // Now that the DOM is ready, we can safely set up our listener.
  window.electronAPI.onHistoryUpdate((history) => {
    console.log('Received history from the main process:', history);
    // In the next module, we'll render this data to the screen!
  });
});