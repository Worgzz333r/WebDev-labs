import '@testing-library/jest-dom/vitest';

// jsdom не реалізує matchMedia, який використовує хук теми
window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
})) as never;
