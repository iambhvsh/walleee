// ─── Cloudinary ──────────────────────────────────────────────────────────────

export interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  created_at: string;
  tags: string[];
  context?: {
    custom?: Record<string, string>;
  };
}

export interface CloudinarySearchResponse {
  resources: CloudinaryResource[];
  total_count: number;
  next_cursor?: string;
  rate_limit_allowed: number;
  rate_limit_reset_at: string;
  rate_limit_remaining: number;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface WallpaperItem {
  id: string;
  publicId: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  format: string;
  tags: string[];
  title?: string;
}

export interface WallpapersApiResponse {
  wallpapers: WallpaperItem[];
  total: number;
  nextCursor?: string;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export type Theme = 'light' | 'dark';

export interface LightboxState {
  isOpen: boolean;
  index: number;
}

export interface GalleryState {
  items: WallpaperItem[];
  carousel: WallpaperItem[];
  isLoading: boolean;
  error: string | null;
}
