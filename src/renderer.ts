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

  type HistoryItem = {
    text: string;
    timestamp: number;
    metadata?: {
      words: number;
      characters: number;
      hasUrl: boolean;
      hasEmail: boolean;
    }
  };

  // The main function to render the history list
  const renderHistory = (history: HistoryItem[]) => {
    historyContainer.innerHTML = ''; // Clear the existing list

    history.forEach(item => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';

      const textContent = document.createElement('p');
      textContent.className = 'history-item-text';
      textContent.textContent = item.text;
      historyItem.appendChild(textContent);

      if (item.metadata) {
        const metadataContainer = document.createElement('div');
        metadataContainer.className = 'metadata-container'; // Fixed typo: was 'metadate-container'

        // Fixed: Using backticks instead of single quotes for string interpolation
        const stats = `${item.metadata.words} words, ${item.metadata.characters} chars`;
        
        const statsSpan = document.createElement('span');
        statsSpan.textContent = stats;
        metadataContainer.appendChild(statsSpan);

        if (item.metadata.hasUrl) {
          const urlIcon = document.createElement('span');
          urlIcon.textContent = '🔗';
          urlIcon.title = 'Contains a URL';
          metadataContainer.appendChild(urlIcon);
        }
        if (item.metadata.hasEmail) {
          const emailIcon = document.createElement('span');
          emailIcon.textContent = '✉️';
          emailIcon.title = 'Contains an email';
          metadataContainer.appendChild(emailIcon);
        }

        historyItem.appendChild(metadataContainer);
      }

      historyItem.addEventListener('click', () => {
        window.electronAPI.copyToClipboard(item.text);
      });

      historyContainer.appendChild(historyItem);
    });
  };

  window.electronAPI.onHistoryUpdate((history: HistoryItem[]) => {
    renderHistory(history);
  });
});         