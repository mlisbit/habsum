import { useEffect, useLayoutEffect } from 'react';

// Preserve pre-paint DOM work in the browser; effects do not run during SSR.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default useIsomorphicLayoutEffect;
