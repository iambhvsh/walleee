import type { VercelRequest, VercelResponse } from '@vercel/node';
import type {
  CloudinarySearchResponse,
  CloudinaryResource,
  WallpaperItem,
  WallpapersApiResponse,
  ApiErrorResponse,
} from '../src/types/index.js';

// ─── Cloudinary Config ────────────────────────────────────────────────────────

const CLOUD_NAME = process.env['CLOUDINARY_CLOUD_NAME'];
const API_KEY = process.env['CLOUDINARY_API_KEY'];
const API_SECRET = process.env['CLOUDINARY_API_SECRET'];
const FOLDER = process.env['CLOUDINARY_FOLDER'] ?? 'walls';

function assertEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

// ─── Transform ────────────────────────────────────────────────────────────────

function buildOptimizedUrl(cloudName: string, publicId: string, width: number): string {
  // f_auto: best format (webp/avif), q_auto: smart compression, w_: resize
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_${width}/${publicId}`;
}

function transformResource(cloudName: string, resource: CloudinaryResource): WallpaperItem {
  return {
    id: resource.public_id,
    publicId: resource.public_id,
    // Full quality for lightbox / download
    url: `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${resource.public_id}`,
    // Thumbnail: 800px wide, auto format & quality
    thumbnailUrl: buildOptimizedUrl(cloudName, resource.public_id, 800),
    width: resource.width,
    height: resource.height,
    format: resource.format,
    tags: resource.tags,
    title: resource.context?.custom?.['caption'] ?? resource.public_id.split('/').pop(),
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    const errBody: ApiErrorResponse = { error: 'method_not_allowed', message: 'Only GET is supported' };
    res.status(405).json(errBody);
    return;
  }

  try {
    const cloudName = assertEnv(CLOUD_NAME, 'CLOUDINARY_CLOUD_NAME');
    const apiKey = assertEnv(API_KEY, 'CLOUDINARY_API_KEY');
    const apiSecret = assertEnv(API_SECRET, 'CLOUDINARY_API_SECRET');

    const nextCursor = typeof req.query['next_cursor'] === 'string' ? req.query['next_cursor'] : undefined;
    const maxResults = 50;

    // Cloudinary Search API
    const searchBody: Record<string, unknown> = {
      expression: `folder:${FOLDER}`,
      sort_by: [{ created_at: 'desc' }],
      max_results: maxResults,
      with_field: ['tags', 'context'],
    };

    if (nextCursor) {
      searchBody['next_cursor'] = nextCursor;
    }

    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    const upstream = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchBody),
      },
    );

    if (!upstream.ok) {
      const text = await upstream.text();
      throw new Error(`Cloudinary error ${upstream.status}: ${text}`);
    }

    const data = (await upstream.json()) as CloudinarySearchResponse;

    const payload: WallpapersApiResponse = {
      wallpapers: data.resources.map((r) => transformResource(cloudName, r)),
      total: data.total_count,
      nextCursor: data.next_cursor,
    };

    // Cache at edge for 1 hour, stale while revalidate for 24h
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(payload);
  } catch (err) {
    console.error('[/api/wallpapers]', err);
    const errBody: ApiErrorResponse = {
      error: 'internal_error',
      message: err instanceof Error ? err.message : 'Unknown error',
    };
    res.status(500).json(errBody);
  }
}
