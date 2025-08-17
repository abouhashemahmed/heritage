import { useEffect, useState, useSyncExternalStore } from 'react';

const isClient = typeof window !== 'undefined';

export function useReducedMotion(): boolean {
  if (typeof useSyncExternalStore === 'function') {
    return useSyncExternalStore(
      subscribe,
      getClientSnapshot,
      getServerSnapshot
    );
  }

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getClientSnapshot);

  useEffect(() => {
    if (!isClient) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setPrefersReducedMotion(mediaQuery.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

function subscribe(callback: () => void): () => void {
  if (!isClient) return () => {};
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

function getClientSnapshot(): boolean {
  return isClient && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getServerSnapshot(): boolean {
  return false;
}
