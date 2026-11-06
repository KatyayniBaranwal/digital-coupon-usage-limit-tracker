// Tiny storage helpers. The app uses window.localStorage; tests use the in-memory stand-in.

export function createMemoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => {
      data.set(k, String(v));
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
}

export function getDefaultStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const probe = '__coupon_tracker_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return window.localStorage;
    }
  } catch {
    // localStorage blocked (private mode etc.) - fall through to memory.
  }
  return createMemoryStorage();
}
