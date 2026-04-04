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

    // ── GPU-optimized theme fade (opacity only, no color transitions) ──────────

    // Step 1: Start fade in
    html.setAttribute('data-theme-transitioning', '');

    // Step 2: Flip theme halfway through fade (at 150ms for 300ms total)
    const flipTimer = setTimeout(() => {
      html.setAttribute('data-theme', next);
      setTheme(next);
      try { localStorage.setItem(LS_KEY, next); } catch { /* ignore */ }
    }, 150);

    // Step 3: Fade out overlay (complete at 300ms)
    const doneTimer = setTimeout(() => {
      html.removeAttribute('data-theme-transitioning');
    }, 300);

    return () => {
      clearTimeout(flipTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  return { theme, toggle };
}
