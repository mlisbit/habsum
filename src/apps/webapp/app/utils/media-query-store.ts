export function subscribeToMediaQuery(query: string, onStoreChange: () => void) {
  const mq = window.matchMedia(query);

  if ('addEventListener' in mq) {
    mq.addEventListener('change', onStoreChange);
    return () => mq.removeEventListener('change', onStoreChange);
  }

  const legacyMq = mq as MediaQueryList & {
    addListener: (listener: () => void) => void;
    removeListener: (listener: () => void) => void;
  };
  legacyMq.addListener(onStoreChange);
  return () => legacyMq.removeListener(onStoreChange);
}

export function getMediaQuerySnapshot(query: string) {
  return window.matchMedia(query).matches;
}
