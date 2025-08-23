import './index.css';

declare global {
  interface Window {
    electronAPI: {
      onHistoryUpdate: (callback: (history: any[]) => void) => void;
      copyToClipboard: (text: string) => void; 
      // searchInPage: (text: string) => void;   
      togglePin: (timestamp: number) => void;
      deleteClip: (timestamp: number) => void;  
    };
  }
}

  type HistoryItem = {
    text: string;
    timestamp: number;
    metadata?: {
      words: number;
      characters: number;
      hasUrl: boolean;
      hasEmail: boolean;
    };
    isPinned?: boolean;
  };

let activeDropdown: HTMLElement | null = null;

const hideDropdowns = (event?: MouseEvent) => {
    // If we have an event and it's coming from a menu button, don't hide
    if (event?.target instanceof Element && 
        (event.target.closest('.menu-button') || event.target.closest('.dropdown-menu'))) {
        return;
    }
    
    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
        menu.classList.remove('show');
    });
    activeDropdown = null;
};

window.addEventListener('DOMContentLoaded', () => {
    const historyContainer = document.getElementById('history-container');
    const searchBox = document.getElementById('search-box') as HTMLInputElement;

    if (!historyContainer || !searchBox) {
        console.error('Required DOM elements not found');
        return;
    }

  // Listen for input in the search box
  let fullHistory: HistoryItem[]= [];

  const UpdatedView = () => {
    const searchText = searchBox.value.toLowerCase();

    // if no search text show everything

    const filteredHistory = searchText
      ? fullHistory.filter(item => item.text.toLowerCase().includes(searchText))
      : fullHistory;

    renderHistory(filteredHistory);
  };

  searchBox.addEventListener('input', UpdatedView);
    window.electronAPI.onHistoryUpdate((history: HistoryItem[]) => {
        console.log('3. Renderer received history update.');
        fullHistory = history;
        UpdatedView();
    });


  // The main function to render the history list

const renderHistory = (history: HistoryItem[]) => {
    history.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

    historyContainer.innerHTML = ''; // Clear the existing list

    history.forEach((item) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        if (item.isPinned) {
            historyItem.classList.add('pinned');
        }

        // ---  Menu Button and Dropdown Logic  ---
        const menuButton = document.createElement('button');
        menuButton.className = 'menu-button';
        menuButton.innerHTML = '&#8942;';

        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'dropdown-menu';

        const pinButton = document.createElement('button');
        pinButton.textContent = item.isPinned ? 'Unpin' : 'Pin';
        pinButton.onclick = () => window.electronAPI.togglePin(item.timestamp);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => window.electronAPI.deleteClip(item.timestamp);

        dropdownMenu.appendChild(pinButton);
        dropdownMenu.appendChild(deleteButton);
        menuButton.appendChild(dropdownMenu);

        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // If this dropdown is already active, just close it
            if (activeDropdown === dropdownMenu) {
                dropdownMenu.classList.remove('show');
                activeDropdown = null;
                return;
            }

            // Close any open dropdown
            hideDropdowns();
            
            // Show this dropdown
            dropdownMenu.classList.add('show');
            activeDropdown = dropdownMenu;
        });
        
        // --- Content Wrapper with Truncation  ---
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'content-wrapper';
        contentWrapper.title = item.text; // Tooltip with full text

        const textContent = document.createElement('p');
        const maxLength = 200;
        let displayText = item.text;
        if (displayText.length > maxLength) {
            displayText = displayText.substring(0, maxLength) + '. . .';
        }
        textContent.textContent = displayText;
        contentWrapper.appendChild(textContent);

        // ---  Metadata Logic  ---
        if (item.metadata) {
            const metadataContainer = document.createElement('div');
            metadataContainer.className = 'metadata-container';
            const stats = `${item.metadata.words} words, ${item.metadata.characters} chars`;
            const statsSpan = document.createElement('span');
            statsSpan.textContent = stats;
            metadataContainer.appendChild(statsSpan);

            // logic for email and url
                if (item.metadata.hasUrl) { 
                    const urlIcon = document.createElement('span');
                    urlIcon.textContent = '🔗url';
                    urlIcon.title = 'Contains a URL';
                    metadataContainer.appendChild(urlIcon);
                }
                if (item.metadata.hasEmail) { 
                    const emailIcon = document.createElement('span');
                    emailIcon.textContent = '📧email';
                    emailIcon.title = 'Contains an email';
                    metadataContainer.appendChild(emailIcon);   
                }
            contentWrapper.appendChild(metadataContainer); // Append to wrapper
        }

        // --- 4. Final Assembly (Improved Order) ---
        historyItem.appendChild(menuButton);
        historyItem.appendChild(contentWrapper);
        
        contentWrapper.addEventListener('click', () => {
            window.electronAPI.copyToClipboard(item.text);
        });

        historyContainer.appendChild(historyItem);
    });
};

const hideDropdowns = () => {
    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
        menu.classList.remove('show');
    });
};
document.body.addEventListener('click', hideDropdowns, true);


  window.electronAPI.onHistoryUpdate((history: HistoryItem[]) => {
    console.log('3. Renderer received history update.');
    renderHistory(history);
  });

  // Clean up when window unloads
  window.addEventListener('unload', () => {
      document.removeEventListener('click', hideDropdowns);
      searchBox?.removeEventListener('input', UpdatedView);
  });
});