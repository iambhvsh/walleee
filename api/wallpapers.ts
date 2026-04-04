import type { VercelRequest, VercelResponse } from '@vercel/node';
import type {
  CloudinarySearchResponse,
  CloudinaryResource,
  WallpaperItem,
  WallpapersApiResponse,
  ApiErrorResponse,
} from '../src/types/index';
import {
  CLOUD_NAME, API_KEY, API_SECRET, FOLDER,
  REVALIDATE_SECRET, assertEnv, sanitiseFolder,
} from './_config';

// ─── API security ────────────────────────────────────────────────────────────

function isAuthorised(req: VercelRequest): boolean {
  // 1. Internal cache-bust call from revalidate.ts carries the bypass token
  const bypassToken = req.headers['x-walleee-token'];
  if (REVALIDATE_SECRET && bypassToken === REVALIDATE_SECRET) return true;

  // 2. Same-origin browser requests carry the Vercel deployment URL as referer/origin
  const origin  = req.headers['origin']  ?? '';
  const referer = req.headers['referer'] ?? '';
  const host    = req.headers['host']    ?? '';

  // Allow requests that originate from the same host
  if (origin.includes(host) || referer.includes(host)) return true;

  // 3. Vercel-internal: no origin header at all means same-origin SSR / edge
  if (!origin && !referer) return true;

  return false;
}

// ─── Cloudinary URL builders ──────────────────────────────────────────────────

function thumbUrl(cloudName: string, publicId: string, width: number): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_${width},c_limit/${publicId}`;
}

function fullUrl(cloudName: string, publicId: string): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${publicId}`;
}

function transformResource(cloudName: string, r: CloudinaryResource): WallpaperItem {
  const item: WallpaperItem = {
    id: r.public_id,
    publicId: r.public_id,
    url: fullUrl(cloudName, r.public_id),
    thumbnailUrl: thumbUrl(cloudName, r.public_id, 800),
    width: r.width,
    height: r.height,
    format: r.format,
    tags: r.tags,
  };
  const rawTitle = r.context?.custom?.['caption'] ?? r.public_id.split('/').pop();
  if (rawTitle !== undefined) item.title = rawTitle;
  return item;
}

// ─── Cloudinary Search API — full cursor pagination ───────────────────────────

const MAX_PAGES        = 200;  // 200 × 500 = 100k images max
const BACKOFF_BASE_MS  = 400;
const MAX_RETRIES      = 3;
const PAGE_TIMEOUT_MS  = 8000; // 8s per page

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPageWithRetry(
  url: string,
  options: RequestInit,
  attempt = 0,
): Promise<Response> {
  const res = await fetchWithTimeout(url, options, PAGE_TIMEOUT_MS);
  if (res.status === 429 && attempt < MAX_RETRIES) {
    const retryAfter = res.headers.get('Retry-After');
    const delay = retryAfter
      ? Number(retryAfter) * 1000
      : BACKOFF_BASE_MS * Math.pow(2, attempt);
    console.warn(`[wallpapers] 429 rate-limited — retry in ${delay}ms (attempt ${attempt + 1})`);
    await sleep(delay);
    return fetchPageWithRetry(url, options, attempt + 1);
  }
  return res;
}

async function fetchAllCloudinaryResources(
  cloudName: string,
  apiKey: string,
  apiSecret: string,
): Promise<{ resources: CloudinaryResource[]; totalCount: number }> {
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const headers = {
    Authorization: `Basic ${credentials}`,
    'Content-Type': 'application/json',
  };
  const folder = sanitiseFolder(FOLDER);

  const allResources: CloudinaryResource[] = [];
  let cursor: string | undefined = undefined;
  let totalCount = 0;
  let page = 0;

  do {
    if (page >= MAX_PAGES) {
      console.warn(`[wallpapers] Reached MAX_PAGES (${MAX_PAGES}) — stopping`);
      break;
    }
    page++;

    const body: Record<string, unknown> = {
      expression: `folder:${folder}`,
      sort_by:    [{ created_at: 'desc' }],
      max_results: 500,
      with_field:  ['tags', 'context'],
    };
    if (cursor !== undefined) body['next_cursor'] = cursor;

    const res = await fetchPageWithRetry(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`,
      { method: 'POST', headers, body: JSON.stringify(body) },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Cloudinary page ${page} HTTP ${res.status}`);
      void text;
    }

    const data = (await res.json()) as CloudinarySearchResponse;
    allResources.push(...data.resources);
    if (page === 1) totalCount = data.total_count;
    cursor = data.next_cursor;

  } while (cursor !== undefined);

  return { resources: allResources, totalCount };
}

// ─── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Block external access
  if (!isAuthorised(req)) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  if (req.method !== 'GET') {
    const err: ApiErrorResponse = { error: 'method_not_allowed', message: 'Only GET is supported' };
    res.status(405).json(err);
    return;
  }

  try {
    const cloudName = assertEnv(CLOUD_NAME, 'CLOUDINARY_CLOUD_NAME');
    const apiKey    = assertEnv(API_KEY,    'CLOUDINARY_API_KEY');
    const apiSecret = assertEnv(API_SECRET, 'CLOUDINARY_API_SECRET');

    const { resources, totalCount } = await fetchAllCloudinaryResources(cloudName, apiKey, apiSecret);

    const payload: WallpapersApiResponse = {
      wallpapers: resources.map((r) => transformResource(cloudName, r)),
      total: totalCount,
    };

    // ── Caching strategy ────────────────────────────────────────────��─────────
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=2592000');
    res.status(200).json(payload);
  } catch (err) {
    console.error('[/api/wallpapers]', err);
    res.setHeader('Cache-Control', 'no-store');
    const body: ApiErrorResponse = { error: 'internal_error', message: 'Failed to load wallpapers' };
    res.status(500).json(body);
  }
}
