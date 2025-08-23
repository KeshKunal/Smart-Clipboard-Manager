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
let fullHistory: HistoryItem[] | null = [];
let cleanupInterval: NodeJS.Timeout;

const hideDropdowns = (event?: MouseEvent) => {
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

    const clearSearchBtn = document.getElementById('clear-search-btn');
    if (!historyContainer || !searchBox || !clearSearchBtn){
        console.error('Required DOM elements not found');
        return;
    }

    setInterval(() => {
    if (window.gc) {
        window.gc();
    }
}, 10000);

  // Listen for input in the search box
  let fullHistory: HistoryItem[]= [];

  const updateView = () => {
    const searchText = searchBox.value.toLowerCase();

    // if no search text show everything

    const filteredHistory = searchText
      ? fullHistory.filter(item => item.text.toLowerCase().includes(searchText))
      : fullHistory;

    const ITEMS_PER_PAGE = 20;  // Adjust based on your needs
    const start = currentPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    
    // Use start and end to slice your history array
    const itemsToShow = filteredHistory.slice(0, end);

    renderHistory(itemsToShow);
  };

  const debounce = (fn: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  };

  const handleSearch = debounce((value: string) => {
    // ...existing search code...
  }, 300);

  searchBox.addEventListener('input', () => {
    // Show the clear button if there is text, otherwise hide it
    if (searchBox.value) {
        clearSearchBtn.classList.remove('hidden');
    } else {
        clearSearchBtn.classList.add('hidden');
    }
    updateView();
});
clearSearchBtn.addEventListener('click', () => {
    // 1. Make the search box empty
    searchBox.value = '';
    // 2. Hide the clear button itself
    clearSearchBtn.classList.add('hidden');
    // 3. Put the user's cursor back in the search box
    searchBox.focus();
    // 4. Call your update function to show the full, unfiltered list
    updateView();
});
    window.electronAPI.onHistoryUpdate((history: HistoryItem[]) => {
        fullHistory = history;
        updateView();
    });


  const ITEMS_PER_PAGE = 20;
  let currentPage = 0;

  // The main function to render the history list

const renderHistory = (history: HistoryItem[]) => {
    history.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

        const start = currentPage * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const visibleItems = history.slice(start, end);
        // A more memory-efficient way to clear the container
    while (historyContainer.firstChild) {
        historyContainer.removeChild(historyContainer.firstChild);
    }

    visibleItems.forEach((item) => {
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

    // ---Show the "Copied!" notification ---
    
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = 'Copied!';
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
    }, 1000); // Message stays visible for 1 second

    setTimeout(() => {
        notification.remove();
    }, 1500); // 1s visible + 0.5s fade-out
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
    updateView();
  });

  // Clean up when window unloads
  window.addEventListener('unload', () => {
      document.body.removeEventListener('click', hideDropdowns, true);
      searchBox?.removeEventListener('input', updateView);
  });
});

// Keep the cleanupDOM function
const cleanupDOM = () => {
  const items = document.querySelectorAll('.history-item');
  if (items.length > 100) {
    for (let i = 100; i < items.length; i++) {
      items[i].remove();
    }
  }
};

// Keep the interval
setInterval(cleanupDOM, 60000);

//# sourceMappingURL=index.js.map