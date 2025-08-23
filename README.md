# 📋 Smart Clipboard Manager

A cross-platform, intelligent clipboard manager built with Electron. This application is designed to be a powerful, feature-rich, and highly performant developer utility.


---
## 🖼️ Screenshots

| Main Interface & Pinning | Smart Analysis & Search |
| :---: | :---: |
| [![Smart Clipboard Manager Main Interface](https://github.com/KeshKunal/Smart-Clipboard-Manager/blob/main/assets/SCM1.jpg?raw=true)](https://github.com/KeshKunal/Smart-Clipboard-Manager/blob/main/assets/SCM1.jpg) | [![Smart Clipboard Manager Smart Analysis](https://github.com/KeshKunal/Smart-Clipboard-Manager/blob/main/assets/SCM3.jpg?raw=true)](https://github.com/KeshKunal/Smart-Clipboard-Manager/blob/main/assets/SCM3.jpg) |
| [![Smart Clipboard Manager Pinning and Deleting](https://github.com/KeshKunal/Smart-Clipboard-Manager/blob/main/assets/SCM2.jpg?raw=true)](https://github.com/KeshKunal/Smart-Clipboard-Manager/blob/main/assets/SCM2.jpg) | [![Smart Clipboard Manager Search Functionality](https://github.com/KeshKunal/Smart-Clipboard-Manager/blob/main/assets/scm4.jpg?raw=true)](https://github.com/KeshKunal/Smart-Clipboard-Manager/blob/main/assets/scm4.jpg) |

---
---
## ✨ Features

- **Persistent History:** Automatically saves a history of text you copy. Your history is saved to disk and restored when you restart the app.
- **Move-on-Copy:** Clicking any item copies it back to your clipboard and moves it to the top of the list for quick reuse.
- **Pin & Delete:** Pin important snippets to keep them at the top of your list, or delete items you no longer need via a simple context menu.
- **Smart Text Analysis:** Instantly see metadata for each copied item, including:
  - Word and character counts.
  - Detection of URLs and email addresses.
- **Instant Debounced Search:** Quickly find items in your history with a fast, responsive search bar that doesn't overwhelm the UI.
- **Efficient Long-List Handling:** Uses virtual scrolling to ensure the app remains fast and responsive, even with thousands of clipboard entries.
- **Memory Efficient:** Architected to have a low memory footprint, especially while running idle in the background.

---
## 🚀 Download & Installation

The latest version can be downloaded directly from the GitHub releases page.

[**>> Download Latest Release <<**](https://github.com/KeshKunal/Smart-Clipboard-Manager/releases/tag/v1.0.0)

---
### For Developers

To run this project in a development environment:

1.  Clone the repository.
2.  Navigate to the project directory: `cd smart-clipboard-manager`
3.  Install dependencies: `npm install`
4.  Run the application: `npm start`

To build the executable yourself, run `npm run make`. The final application will be in the `/out` directory.

---
## 🏛️ Architectural Decisions

This application is built using the standard Electron two-process architecture to ensure security and stability.

- **Main Process (`index.ts`):** Serves as the application's backend. It has full Node.js access and is responsible for all OS interactions, including clipboard monitoring, data persistence (`electron-store`), and managing worker threads.
- **Renderer Process (`renderer.ts`):** Responsible for the user interface. It runs in a sandboxed Chromium environment with no direct Node.js access. All DOM manipulation, UI state, and user interactions are handled here.
- **Preload Script (`preload.ts`):** A secure bridge that uses Electron's `contextBridge` to expose a minimal, tailored API from the main process to the renderer. This follows modern Electron security best practices by preventing the renderer from accessing powerful APIs directly.

---
## ⚙️ Performance & Memory Optimization Techniques

A primary goal of this project was to maintain a low memory footprint (<100MB) and a highly responsive user experience. The following advanced optimization techniques were implemented:

### 1. Dynamic UI Unloading for Idle State
- **Problem:** The Electron renderer process (the UI window) is the largest consumer of memory. Keeping it active when the application is in the background results in a high constant memory footprint.
- **Solution:** The application listens for the window's **`blur`** and **`focus`** events. When the app loses focus, the window navigates to `'about:blank'`, effectively unloading the entire UI and freeing up a significant amount of memory. When the user focuses the app again, the original URL is reloaded, restoring the UI. This ensures the app is extremely lightweight when idle.

### 2. Worker Pool for CPU-Intensive Analysis
- **Problem:** Analyzing every clipboard entry for metadata is a CPU-intensive task. Spawning a new worker thread for every single copy event can be inefficient.
- **Solution:** A **worker pool** is used to manage a fixed number of persistent worker threads. When a new analysis task is required, it's dispatched to an available worker from the pool. This reduces the overhead of creating and destroying threads, leading to more efficient resource management.

### 3. Virtual Scrolling for Large Lists
- **Problem:** Rendering a list with hundreds or thousands of clipboard items at once would create a massive number of DOM nodes, causing high memory usage and a slow, unresponsive UI.
- **Solution:** The application implements **virtual scrolling** (or infinite scroll) using an `IntersectionObserver`. Only a small, visible subset of the history list is rendered in the DOM at any time. As the user scrolls to the bottom, the next "page" of items is rendered, ensuring the app remains fast and lightweight, regardless of the history size.

### 4. Debounced Search Input
- **Problem:** A naive search implementation would filter and re-render the entire UI on every single keystroke, leading to a laggy and unpleasant user experience.
- **Solution:** The search input is **debounced**. This technique ensures that the search and re-render logic is only triggered after the user has stopped typing for a brief period (e.g., 300ms). This dramatically reduces the number of re-renders and makes the search feel smooth and responsive.

### 5. Proactive Garbage Collection & Cleanup
- **Problem:** In a long-running application, references to old data, DOM elements, and event listeners can accumulate, leading to memory leaks.
- **Solution:** An event listener on the `unload` event was implemented. When the window is reloaded or closed, this function proactively **cleans up resources**: it nullifies references to large data arrays, removes global event listeners, and, if available, explicitly triggers the JavaScript garbage collector (`window.gc()`).

### 6. Lazy Loading of Core Modules
- **Problem:** Eagerly loading all required modules at application startup increases launch time and initial memory consumption.
- **Solution:** The `electron-store` module, which handles disk storage, is **lazily loaded**. The module is only required from the file system the very first time it is needed, not when the app starts. This defers the performance cost, leading to a faster and lighter application startup.
