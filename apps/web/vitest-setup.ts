import '@testing-library/jest-dom';

// jsdom does not implement ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};