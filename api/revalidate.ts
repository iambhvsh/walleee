import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'crypto';
import type { ApiErrorResponse } from '../src/types/index';
import { API_SECRET, REVALIDATE_SECRET, APP_URL } from './_config';

// ─── Vercel config ────────────────────────────────────────────────────────────
export const config = {
  api: { bodyParser: false },
};

// ─── Read raw body from stream ────────────────────────────────────────────────
function readRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// ─── Cloudinary webhook signature verification ────────────────────────────────

function verifyCloudinarySignature(
  rawBody: string,
  timestamp: string,
  signature: string,
): boolean {
  const secret = API_SECRET;
  if (!secret) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (Number.isNaN(age) || age > 7200) return false;

  const expected = createHmac('sha256', secret)
    .update(rawBody + timestamp)
    .digest('hex');

  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ─── Bust /api/wallpapers cache ───────────────────────────────────────────────
async function revalidateWallpapersCache(): Promise<void> {
  if (!APP_URL || !REVALIDATE_SECRET) {
    console.warn('[revalidate] APP_URL or REVALIDATE_SECRET missing — skipping');
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

  // Read the raw stream — body is unparsed because bodyParser: false
  const rawBody = await readRawBody(req);

  if (!verifyCloudinarySignature(rawBody, timestamp, signature)) {
    console.warn('[revalidate] Signature verification failed');
    res.status(401).json({ error: 'unauthorized', message: 'Invalid signature' });
    return;
  }

  // Parse body now that we've verified the signature
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    res.status(400).json({ error: 'bad_request', message: 'Invalid JSON body' });
    return;
  }

  const notificationType = body['notification_type'];
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
    res.status(200).json({ ok: false }); // 200 so Cloudinary doesn't retry
  }
}
