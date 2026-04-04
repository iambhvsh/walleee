import { useState, useEffect, useCallback } from 'react';
import type { Theme } from '@/types';

const LS_KEY = 'walleee-theme';

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // localStorage unavailable
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(LS_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const toggle = useCallback(() => {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';

    // Change theme immediately
    html.setAttribute('data-theme', next);
    setTheme(next);
    try { localStorage.setItem(LS_KEY, next); } catch { /* ignore */ }
  }, []);

  return { theme, toggle };
}
