import type { VercelRequest, VercelResponse } from '@vercel/node';
import type {
  CloudinarySearchResponse,
  CloudinaryResource,
  WallpaperItem,
  WallpapersApiResponse,
  ApiErrorResponse,
} from '../src/types/index';

// ─── Env ──────────────────────────────────────────────────────────────────────

const CLOUD_NAME = process.env['CLOUDINARY_CLOUD_NAME'];
const API_KEY    = process.env['CLOUDINARY_API_KEY'];
const API_SECRET = process.env['CLOUDINARY_API_SECRET'];
const FOLDER     = process.env['CLOUDINARY_FOLDER'] ?? 'walls';

function assertEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
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

// ─── Cloudinary Search API — full cursor pagination ──────────────────

const MAX_PAGES     = 200;  // hard ceiling: 200 pages × 500 = 100k images max
const BACKOFF_BASE  = 500;  // ms
const MAX_RETRIES   = 3;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPageWithRetry(
  url: string,
  options: RequestInit,
  attempt = 0,
): Promise<Response> {
  const res = await fetch(url, options);

  if (res.status === 429 && attempt < MAX_RETRIES) {
    // Respect Retry-After header if Cloudinary sends one, else exponential backoff
    const retryAfter = res.headers.get('Retry-After');
    const delay = retryAfter
      ? Number(retryAfter) * 1000
      : BACKOFF_BASE * Math.pow(2, attempt);
    console.warn(`[wallpapers] Cloudinary 429 — retrying in ${delay}ms (attempt ${attempt + 1})`);
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

  const allResources: CloudinaryResource[] = [];
  let cursor: string | undefined = undefined;
  let totalCount = 0;
  let page = 0;

  do {
    if (page >= MAX_PAGES) {
      console.warn(`[wallpapers] Hit MAX_PAGES (${MAX_PAGES}) — stopping pagination`);
      break;
    }

    page++;

    const body: Record<string, unknown> = {
      expression: `folder:${FOLDER}`,
      sort_by:    [{ created_at: 'desc' }],
      max_results: 500,             // maximum allowed per Search API call
      with_field:  ['tags', 'context'],
    };
    if (cursor !== undefined) body['next_cursor'] = cursor;

    const res = await fetchPageWithRetry(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`,
      { method: 'POST', headers, body: JSON.stringify(body) },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Cloudinary page ${page} → HTTP ${res.status}: ${text}`);
    }

    const data = (await res.json()) as CloudinarySearchResponse;
    allResources.push(...data.resources);
    if (page === 1) totalCount = data.total_count;
    cursor = data.next_cursor;

  } while (cursor !== undefined);

  return { resources: allResources, totalCount };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
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

    // ── Caching strategy ──────────────────────────────────────────────────────
    //
    // s-maxage=86400
    // stale-while-revalidate=259200

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=86400, stale-while-revalidate=2592000',
    );
    res.status(200).json(payload);
  } catch (err) {
    console.error('[/api/wallpapers]', err);
    res.setHeader('Cache-Control', 'no-store');
    const body: ApiErrorResponse = {
      error: 'internal_error',
      message: err instanceof Error ? err.message : 'Unknown error',
    };
    res.status(500).json(body);
  }
}

