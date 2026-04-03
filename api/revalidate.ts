import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac } from 'crypto';
import type { ApiErrorResponse } from '../src/types/index';

// ─── Env ──────────────────────────────────────────────────────────────────────

const API_SECRET        = process.env['CLOUDINARY_API_SECRET'] ?? '';
const REVALIDATE_SECRET = process.env['REVALIDATE_SECRET'] ?? '';
const APP_URL           = process.env['VERCEL_PROJECT_PRODUCTION_URL']
                          ? `https://${process.env['VERCEL_PROJECT_PRODUCTION_URL']}`
                          : process.env['APP_URL'] ?? '';

// ─── Cloudinary webhook signature verification ────────────────────────────────
// Docs: https://cloudinary.com/documentation/notifications#verifying_notification_signatures
// Signature = SHA-256( body_string + timestamp + api_secret )

function verifyCloudinarySignature(
  rawBody: string,
  timestamp: string,
  signature: string,
): boolean {
  if (!API_SECRET) return false;

  // Reject webhooks older than 2 hours
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 7200) return false;

  const expected = createHmac('sha256', API_SECRET)
    .update(rawBody + timestamp)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

// ─── Bust Vercel CDN cache for /api/wallpapers ────────────────────────────────
// Vercel exposes an internal revalidation API via the BYPASS_TOKEN.
// We hit our own /api/wallpapers with the bypass header so Vercel
// re-executes the function and writes a fresh response to the edge cache.

async function revalidateWallpapersCache(): Promise<void> {
  if (!APP_URL || !REVALIDATE_SECRET) {
    console.warn('[revalidate] APP_URL or REVALIDATE_SECRET not set — skipping cache bust');
    return;
  }

  const url = `${APP_URL}/api/wallpapers`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      // Vercel CDN bypass: forces a fresh serverless execution and writes
      // the result back to the edge cache, replacing the stale entry.
      'Cache-Control': 'no-cache',
      'x-vercel-revalidate': REVALIDATE_SECRET,
    },
  });

  if (!res.ok) {
    throw new Error(`Cache revalidation fetch failed: ${res.status}`);
  }

  console.log(`[revalidate] Cache busted successfully (${res.status})`);
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    const err: ApiErrorResponse = { error: 'method_not_allowed', message: 'Only POST is supported' };
    res.status(405).json(err);
    return;
  }

  // Cloudinary sends headers: x-cld-timestamp and x-cld-signature
  const timestamp = req.headers['x-cld-timestamp'];
  const signature = req.headers['x-cld-signature'];

  if (typeof timestamp !== 'string' || typeof signature !== 'string') {
    res.status(401).json({ error: 'unauthorized', message: 'Missing Cloudinary signature headers' });
    return;
  }

  // Reconstruct raw body string for signature verification
  const rawBody = JSON.stringify(req.body);

  if (!verifyCloudinarySignature(rawBody, timestamp, signature)) {
    console.warn('[revalidate] Invalid Cloudinary signature — request rejected');
    res.status(401).json({ error: 'unauthorized', message: 'Invalid signature' });
    return;
  }

  // We only care about upload and delete events — ignore everything else
  const notificationType: unknown = (req.body as Record<string, unknown>)['notification_type'];
  const relevantTypes = new Set(['upload', 'delete', 'rename', 'eager']);

  if (typeof notificationType !== 'string' || !relevantTypes.has(notificationType)) {
    res.status(200).json({ ok: true, skipped: true, reason: 'irrelevant notification type' });
    return;
  }

  console.log(`[revalidate] Cloudinary event: ${notificationType} — busting cache`);

  try {
    await revalidateWallpapersCache();
    res.status(200).json({ ok: true, revalidated: true, type: notificationType });
  } catch (err) {
    console.error('[revalidate] Cache bust failed:', err);
    // Still return 200 so Cloudinary doesn't retry
    res.status(200).json({ ok: false, error: err instanceof Error ? err.message : 'unknown' });
  }
}
