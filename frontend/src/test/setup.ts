import "@testing-library/jest-dom";

// Mock global fetch if not available
if (!global.fetch) {
  global.fetch = vi.fn();
}

// Mock WebSocket for testing
global.WebSocket = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  send: vi.fn(),
}));
