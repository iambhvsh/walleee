import { useState, useEffect, useCallback } from 'react';
import type { WallpaperItem, GalleryState, WallpapersApiResponse } from '@/types';

// ─── Seed shuffle (stable per day) ───────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function seededShuffle<T>(arr: readonly T[], seed: string): T[] {
  const copy = [...arr];
  let s = [...seed].reduce((n, c) => n + c.charCodeAt(0), 0);
  const rand = (): number => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = tmp;
  }
  return copy;
}

function fisherYatesShuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = tmp;
  }
  return copy;
}

// ─── LocalStorage carousel cache ─────────────────────────────────────────────

const LS_PREFIX = 'walleee_carousel_';
const CAROUSEL_COUNT = 4;

function getCachedCarousel(all: WallpaperItem[]): WallpaperItem[] {
  const key = LS_PREFIX + todayStr();
  // Evict old keys
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(LS_PREFIX) && k !== key)
      .forEach((k) => localStorage.removeItem(k));

    const stored = localStorage.getItem(key);
    if (stored) {
      const ids = JSON.parse(stored) as string[];
      const idSet = new Set(all.map((w) => w.id));
      if (Array.isArray(ids) && ids.length === CAROUSEL_COUNT && ids.every((id) => idSet.has(id))) {
        return ids.flatMap((id) => {
          const found = all.find((w) => w.id === id);
          return found ? [found] : [];
        });
      }
    }
  } catch {
    // localStorage unavailable
  }

  const picked = seededShuffle(all, todayStr()).slice(0, CAROUSEL_COUNT);
  try {
    localStorage.setItem(key, JSON.stringify(picked.map((w) => w.id)));
  } catch {
    // ignore
  }
  return picked;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWallpapers(): GalleryState & { reload: () => void } {
  const [state, setState] = useState<GalleryState>({
    allItems: [],
    items: [],
    carousel: [],
    total: 0,
    isLoading: true,
    error: null,
  });

  const load = useCallback(async (): Promise<void> => {
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const res = await fetch('/api/wallpapers');
      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }

      const data = (await res.json()) as WallpapersApiResponse;
      const all = data.wallpapers;

      const carousel = getCachedCarousel(all);
      const carouselIds = new Set(carousel.map((w) => w.id));
      const gallery = fisherYatesShuffle(all.filter((w) => !carouselIds.has(w.id)));

      // allItems = carousel first, then gallery — preserves a consistent index order
      // for the lightbox so clicking carousel[0] opens index 0, gallery[0] opens index 4, etc.
      setState({
        allItems: [...carousel, ...gallery],
        items: gallery,
        carousel,
        total: data.total,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load wallpapers',
      }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}
