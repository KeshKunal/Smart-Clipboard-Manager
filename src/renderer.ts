import './index.css';

declare global {
  interface Window {
    electronAPI: {
      onHistoryUpdate: (callback: (history: any[]) => void) => void;
      copyToClipboard: (text: string) => void; // Add the new functions
      searchInPage: (text: string) => void;   // to the type definition
    };
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const historyContainer = document.getElementById('history-container');
  const searchBox = document.getElementById('search-box') as HTMLInputElement;

  // Listen for input in the search box
  searchBox.addEventListener('input', (e) => {
    window.electronAPI.searchInPage(searchBox.value);
  });   

  // The main function to render the history list
  const renderHistory = (history: { text: string; timestamp: number }[]) => {
    historyContainer.innerHTML = ''; // Clear the existing list

    history.forEach(item => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      historyItem.textContent = item.text; 

      // Add click event for the "copy-back" feature
      historyItem.addEventListener('click', () => {
        window.electronAPI.copyToClipboard(item.text);
      });

      historyContainer.appendChild(historyItem);
    });
  };

  // The listener now calls our render function instead of console.log
  window.electronAPI.onHistoryUpdate((history) => {
    renderHistory(history);
  });
});