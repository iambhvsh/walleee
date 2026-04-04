import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'crypto';
import type { ApiErrorResponse } from '../src/types/index';
import { API_SECRET, REVALIDATE_SECRET, APP_URL } from './_config';

// ─── Cloudinary webhook signature verification ────────────────────────────────

function verifyCloudinarySignature(
  rawBody: string,
  timestamp: string,
  signature: string,
): boolean {
  const secret = API_SECRET;
  if (!secret) return false;

  // Reject webhooks older than 2 hours
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (Number.isNaN(age) || age > 7200) return false;

  // Cloudinary signature: SHA-256(rawBody + timestamp + apiSecret)
  const expected = createHmac('sha256', secret)
    .update(rawBody + timestamp)
    .digest('hex');

  // Constant-time comparison prevents timing-based signature oracle attacks
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ─── Cache bust /api/wallpapers ───────────────────────────────────────────────

async function revalidateWallpapersCache(): Promise<void> {
  if (!APP_URL || !REVALIDATE_SECRET) {
    console.warn('[revalidate] APP_URL or REVALIDATE_SECRET missing — skipping cache bust');
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(`${APP_URL}/api/wallpapers`, {
      method: 'GET',
      headers: {
        'x-walleee-token': REVALIDATE_SECRET,
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Cache bust HTTP ${res.status}`);
    console.log(`[revalidate] Cache busted (${res.status})`);
  } finally {
    clearTimeout(timer);
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    const err: ApiErrorResponse = { error: 'method_not_allowed', message: 'Only POST is supported' };
    res.status(405).json(err);
    return;
  }

  const timestamp = req.headers['x-cld-timestamp'];
  const signature = req.headers['x-cld-signature'];

  if (typeof timestamp !== 'string' || typeof signature !== 'string') {
    res.status(401).json({ error: 'unauthorized', message: 'Missing signature headers' });
    return;
  }

  // CRITICAL: use the raw body string, nimport type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'crypto';
import type { ApiErrorResponse } from '../src/types/index';
import { API_SECRET, REVALIDATE_SECRET, APP_URL } from './_config';

// ─── Cloudinary webhook signature verification ────────────────────────────────
function verifyCloudinarySignature(
  rawBody: string,
  timestamp: string,
  signature: string,
): boolean {
  const secret = API_SECRET;
  if (!secret) return false;

  // Reject webhooks older than 2 hours
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (Number.isNaN(age) || age > 7200) return false;
  const expected = createHmac('sha256', secret)
    .update(rawBody + timestamp)
    .digest('hex');

  // Constant-time comparison prevents timing-based signature oracle attacks
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ─── Cache bust /api/wallpapers ───────────────────────────────────────────────

async function revalidateWallpapersCache(): Promise<void> {
  if (!APP_URL || !REVALIDATE_SECRET) {
    console.warn('[revalidate] APP_URL or REVALIDATE_SECRET missing — skipping cache bust');
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(`${APP_URL}/api/wallpapers`, {
      method: 'GET',
      headers: {
        'x-walleee-token': REVALIDATE_SECRET,
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Cache bust HTTP ${res.status}`);
    console.log(`[revalidate] Cache busted (${res.status})`);
  } finally {
    clearTimeout(timer);
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    const err: ApiErrorResponse = { error: 'method_not_allowed', message: 'Only POST is supported' };
    res.status(405).json(err);
    return;
  }

  const timestamp = req.headers['x-cld-timestamp'];
  const signature = req.headers['x-cld-signature'];

  if (typeof timestamp !== 'string' || typeof signature !== 'string') {
    res.status(401).json({ error: 'unauthorized', message: 'Missing signature headers' });
    return;
  }

  // CRITICAL: use the raw body string, not JSON.stringify(req.body).
  const rawBody: string = typeof (req as unknown as { rawBody?: string }).rawBody === 'string'
    ? (req as unknown as { rawBody: string }).rawBody
    : JSON.stringify(req.body); // fallback if rawBody unavailable

  if (!verifyCloudinarySignature(rawBody, timestamp, signature)) {
    console.warn('[revalidate] Signature verification failed');
    res.status(401).json({ error: 'unauthorized', message: 'Invalid signature' });
    return;
  }

  const notificationType: unknown = (req.body as Record<string, unknown>)['notification_type'];
  const relevantTypes = new Set(['upload', 'delete', 'rename', 'destroy']);

  if (typeof notificationType !== 'string' || !relevantTypes.has(notificationType)) {
    res.status(200).json({ ok: true, skipped: true });
    return;
  }

  console.log(`[revalidate] Event: ${notificationType} — busting cache`);

  try {
    await revalidateWallpapersCache();
    res.status(200).json({ ok: true, revalidated: true });
  } catch (err) {
    console.error('[revalidate]', err);
    // Return 200 so Cloudinary doesn't retry indefinitely
    res.status(200).json({ ok: false });
  }
}
  const rawBody: string = typeof (req as unknown as { rawBody?: string }).rawBody === 'string'
    ? (req as unknown as { rawBody: string }).rawBody
    : JSON.stringify(req.body); // fallback if rawBody unavailable

  if (!verifyCloudinarySignature(rawBody, timestamp, signature)) {
    console.warn('[revalidate] Signature verification failed');
    res.status(401).json({ error: 'unauthorized', message: 'Invalid signature' });
    return;
  }

  const notificationType: unknown = (req.body as Record<string, unknown>)['notification_type'];
  const relevantTypes = new Set(['upload', 'delete', 'rename', 'destroy']);

  if (typeof notificationType !== 'string' || !relevantTypes.has(notificationType)) {
    res.status(200).json({ ok: true, skipped: true });
    return;
  }

  console.log(`[revalidate] Event: ${notificationType} — busting cache`);

  try {
    await revalidateWallpapersCache();
    res.status(200).json({ ok: true, revalidated: true });
  } catch (err) {
    console.error('[revalidate]', err);
    // Return 200 so Cloudinary doesn't retry indefinitely
    res.status(200).json({ ok: false });
  }
}
