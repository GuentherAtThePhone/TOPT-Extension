/**
 * Mock implementation of WebExtension APIs (browser.storage, browser.i18n, browser.runtime)
 * and missing browser environment globals for running tests.
 */

class StorageAreaMock {
  constructor() {
    this._data = {};
  }

  async get(keys) {
    if (!keys) {
      return { ...this._data };
    }

    if (typeof keys === 'string') {
      return keys in this._data ? { [keys]: this._data[keys] } : {};
    }

    if (Array.isArray(keys)) {
      const result = {};
      for (const k of keys) {
        if (k in this._data) {
          result[k] = this._data[k];
        }
      }
      return result;
    }

    if (typeof keys === 'object') {
      const result = { ...keys };
      for (const k in keys) {
        if (k in this._data) {
          result[k] = this._data[k];
        }
      }
      return result;
    }

    return {};
  }

  async set(items) {
    for (const [k, v] of Object.entries(items)) {
      // Deep clone to simulate browser.storage serialization
      this._data[k] = typeof v === 'object' && v !== null ? JSON.parse(JSON.stringify(v)) : v;
    }
  }

  async remove(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const k of list) {
      delete this._data[k];
    }
  }

  async clear() {
    this._data = {};
  }
}

function initBrowserMock() {
  const local = new StorageAreaMock();
  const session = new StorageAreaMock();

  const mock = {
    storage: {
      local,
      session
    },
    i18n: {
      getMessage: (key) => key,
      getUILanguage: () => 'en'
    },
    runtime: {
      getURL: (path) => path
    },
    tabs: {
      create: async (opts) => ({ id: 1, ...opts })
    }
  };

  if (typeof globalThis !== 'undefined') {
    globalThis.browser = mock;
  }
  if (typeof window !== 'undefined') {
    window.browser = mock;
  }

  // Ensure matchMedia exists (used by isDarkMode)
  if (typeof window !== 'undefined' && !window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    });
  }

  return mock;
}

// Auto-initialize
if (typeof browser === 'undefined') {
  initBrowserMock();
}

// ─── Canvas & Document Mock (für Node.js-Umgebung) ───────────────────────
// processImageForQR benötigt document.createElement('canvas') und eine
// 2D-Kontext-API. In Node.js existieren diese nicht nativ.
if (typeof document === 'undefined') {
  function makeFakeCanvasCtx() {
    return {
      save: () => {},
      restore: () => {},
      clearRect: () => {},
      drawImage: () => {},
      translate: () => {},
      rotate: () => {},
      getImageData: (x, y, w, h) => ({
        data: new Uint8ClampedArray(w * h * 4),
        width: w,
        height: h
      }),
      putImageData: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      strokeStyle: '',
      lineWidth: 0
    };
  }

  function makeFakeCanvas() {
    const canvas = {
      width: 0,
      height: 0,
      id: '',
      style: {},
      getContext: () => makeFakeCanvasCtx()
    };
    return canvas;
  }

  globalThis.document = {
    createElement: (tag) => {
      if (tag === 'canvas') return makeFakeCanvas();
      return {};
    },
    getElementById: () => null
  };
}

// Stelle sicher, dass jsQR global verfügbar ist (als Platzhalter für Tests)
if (typeof jsQR === 'undefined') {
  globalThis.jsQR = function () { return null; };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageAreaMock, initBrowserMock };
}