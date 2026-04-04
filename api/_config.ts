// ─── Shared Config ────────────

export const CLOUD_NAME        = process.env['CLOUDINARY_CLOUD_NAME'];
export const API_KEY           = process.env['CLOUDINARY_API_KEY'];
export const API_SECRET        = process.env['CLOUDINARY_API_SECRET'];
export const FOLDER            = process.env['CLOUDINARY_FOLDER'] ?? 'walls';
export const REVALIDATE_SECRET = process.env['REVALIDATE_SECRET'] ?? '';

// VERCEL_PROJECT_PRODUCTION_URL is injected automatically by Vercel in prod.
// APP_URL is only needed for local dev.
export const APP_URL = process.env['VERCEL_PROJECT_PRODUCTION_URL']
  ? `https://${process.env['VERCEL_PROJECT_PRODUCTION_URL']}`
  : (process.env['APP_URL'] ?? '');

export function assertEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

// ─── Folder sanitisation ──────────────────────────────────────────────────────
export function sanitiseFolder(raw: string): string {
  const clean = raw.replace(/[^a-zA-Z0-9_\-/]/g, '');
  if (!clean) throw new Error('CLOUDINARY_FOLDER contains no valid characters after sanitisation');
  return clean;
}
