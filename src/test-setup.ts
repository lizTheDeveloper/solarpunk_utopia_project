/**
 * Vitest test setup
 * Configures polyfills and mocks for testing environment
 */

import 'fake-indexeddb/auto';

// Polyfill crypto.randomUUID for testing
if (typeof crypto === 'undefined' || !crypto.randomUUID) {
  const crypto = globalThis.crypto || {};
  crypto.randomUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
  globalThis.crypto = crypto as Crypto;
}
