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

    // ── GPU-composited theme fade ────────────────────────────────────────────

    html.setAttribute('data-theme-transitioning', '');

    // Step 2: flip the theme halfway through the fade-in (at ~220ms)
    const flipTimer = setTimeout(() => {
      html.setAttribute('data-theme', next);
      setTheme(next);
      try { localStorage.setItem(LS_KEY, next); } catch { /* ignore */ }
    }, 220);

    // Step 3: remove the transitioning attribute so the overlay fades back out
    const doneTimer = setTimeout(() => {
      html.removeAttribute('data-theme-transitioning');
    }, 480);

    return () => { clearTimeout(flipTimer); clearTimeout(doneTimer); };
  }, []);

  return { theme, toggle };
}
