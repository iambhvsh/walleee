import { useState, useEffect, useCallback } from 'react';
import type { LightboxState, WallpaperItem } from '@/types';

interface UseLightboxReturn {
  state: LightboxState;
  open: (index: number) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
  current: WallpaperItem | null;
}

export function useLightbox(items: WallpaperItem[]): UseLightboxReturn {
  const [state, setState] = useState<LightboxState>({ isOpen: false, index: 0 });

  const open = useCallback((index: number) => {
    setState({ isOpen: true, index });
    document.body.style.overflow = 'hidden';
  }, []);

  const close = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false }));
    document.body.style.overflow = '';
  }, []);

  const next = useCallback(() => {
    setState((s) => ({
      ...s,
      index: items.length === 0 ? 0 : (s.index + 1) % items.length,
    }));
  }, [items.length]);

  const prev = useCallback(() => {
    setState((s) => ({
      ...s,
      index: items.length === 0 ? 0 : (s.index - 1 + items.length) % items.length,
    }));
  }, [items.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!state.isOpen) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state.isOpen, close, next, prev]);

  const current = state.isOpen && items.length > 0 ? (items[state.index] ?? null) : null;

  return { state, open, close, next, prev, current };
}
