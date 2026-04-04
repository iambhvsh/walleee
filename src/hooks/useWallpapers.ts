import { useState, useEffect, useCallback } from 'react';
import type { WallpaperItem, GalleryState, WallpapersApiResponse } from '@/types';

// ─── PRNG — mulberry32 ─────

function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function strToSeed(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Unified shuffle — accepts a random function so it works for both seeded and random
function shuffle<T>(arr: readonly T[], rand: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = tmp;
  }
  return copy;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function seededShuffle<T>(arr: readonly T[], seed: string): T[] {
  return shuffle(arr, mulberry32(strToSeed(seed)));
}

function randomShuffle<T>(arr: readonly T[]): T[] {
  return shuffle(arr, Math.random);
}

// ─── LocalStorage carousel cache ─────────────────────────────────────────────

const LS_PREFIX      = 'walleee_carousel_';
const CAROUSEL_COUNT = 6;

function getCachedCarousel(all: WallpaperItem[]): WallpaperItem[] {
  const key = LS_PREFIX + todayStr();
  try {
    // Evict stale keys from previous days
    Object.keys(localStorage)
      .filter((k) => k.startsWith(LS_PREFIX) && k !== key)
      .forEach((k) => localStorage.removeItem(k));

    const stored = localStorage.getItem(key);
    if (stored) {
      const ids = JSON.parse(stored) as unknown;
      const idSet = new Set(all.map((w) => w.id));
      if (
        Array.isArray(ids) &&
        ids.length === CAROUSEL_COUNT &&
        (ids as unknown[]).every((id): id is string => typeof id === 'string' && idSet.has(id))
      ) {
        return (ids as string[]).flatMap((id) => {
          const found = all.find((w) => w.id === id);
          return found ? [found] : [];
        });
      }
    }
  } catch {
    // localStorage unavailable — proceed without cache
  }

  const picked = seededShuffle(all, todayStr()).slice(0, CAROUSEL_COUNT);
  try {
    localStorage.setItem(key, JSON.stringify(picked.map((w) => w.id)));
  } catch {
    // ignore write failures
  }
  return picked;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 15_000; // 15s — show error instead of infinite spinner

export function useWallpapers(): GalleryState & { reload: () => void } {
  const [state, setState] = useState<GalleryState>({
    allItems:  [],
    items:     [],
    carousel:  [],
    total:     0,
    isLoading: true,
    error:     null,
  });

  const load = useCallback(async (): Promise<void> => {
    setState((s) => ({ ...s, isLoading: true, error: null }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch('/api/wallpapers', { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const data = (await res.json()) as WallpapersApiResponse;
      const all  = data.wallpapers;

      const carousel    = getCachedCarousel(all);
      const carouselIds = new Set(carousel.map((w) => w.id));
      const gallery     = randomShuffle(all.filter((w) => !carouselIds.has(w.id)));

      setState({
        allItems:  [...carousel, ...gallery],
        items:     gallery,
        carousel,
        total:     data.total,
        isLoading: false,
        error:     null,
      });
    } catch (err) {
      clearTimeout(timer);
      const message =
        err instanceof Error && err.name === 'AbortError'
          ? 'Request timed out — check your connection'
          : err instanceof Error
            ? err.message
            : 'Failed to load wallpapers';
      setState((s) => ({ ...s, isLoading: false, error: message }));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { ...state, reload: load };
}
