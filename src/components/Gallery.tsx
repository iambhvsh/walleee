import { useMemo, useCallback, memo } from 'react';
import { LazyImage } from './LazyImage';
import { useColumnCount } from '@/hooks/useColumnCount';
import type { WallpaperItem } from '@/types';
import { downloadFile, filenameFromItem } from '@/utils/download';

interface GalleryProps {
  items: WallpaperItem[];
  isLoading: boolean;
  onItemClick: (index: number) => void;
}

// ─── Download icon — shared so it's not duplicated across components ──────────
export function DownloadIcon({ size = 13 }: { size?: number }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonItem({ height }: { height: number }): React.JSX.Element {
  return (
    <div
      className="gal-item skeleton-pulse"
      style={{ height, borderRadius: '0.55rem' }}
      aria-hidden
    />
  );
}

// ─── Gallery item — memoised so column re-renders don't cascade ───────────────
interface GalleryItemProps {
  item: WallpaperItem;
  globalIdx: number;
  animDelay: number;
  onItemClick: (index: number) => void;
}

const GalleryItem = memo(function GalleryItem({
  item,
  globalIdx,
  animDelay,
  onItemClick,
}: GalleryItemProps): React.JSX.Element {
  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      downloadFile(item.url, filenameFromItem(item.publicId, item.format));
    },
    [item.url, item.publicId, item.format],
  );

  const handleClick = useCallback(() => onItemClick(globalIdx), [onItemClick, globalIdx]);
  const handleKey   = useCallback(
    (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') onItemClick(globalIdx); },
    [onItemClick, globalIdx],
  );

  return (
    <div
      className="gal-item"
      style={{ animationDelay: `${animDelay}ms` }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKey}
      aria-label={item.title ?? 'Open wallpaper'}
    >
      <LazyImage
        src={item.thumbnailUrl}
        alt={item.title ?? 'Wallpaper'}
        style={{
          width:       '100%',
          height:      'auto',
          minHeight:   '80px',
          aspectRatio: `${item.width} / ${item.height}`,
        }}
      />
      <button className="gal-dl" onClick={handleDownload} aria-label="Save wallpaper">
        <DownloadIcon size={13} />
      </button>
    </div>
  );
});

// ─── Gallery ──────────────────────────────────────────────────────────────────
export function Gallery({ items, isLoading, onItemClick }: GalleryProps): React.JSX.Element {
  const colCount = useColumnCount();

  const columns = useMemo<WallpaperItem[][]>(() => {
    const cols: WallpaperItem[][] = Array.from({ length: colCount }, () => []);
    items.forEach((item, i) => { cols[i % colCount]?.push(item); });
    return cols;
  }, [items, colCount]);

  if (isLoading) {
    const skeletonHeights = [180, 240, 160, 220, 200, 170, 260, 150, 210, 190];
    return (
      <div id="gallery">
        {Array.from({ length: colCount }, (_, ci) => (
          <div key={ci} className="gallery-col">
            {Array.from({ length: 3 }, (__, ri) => (
              <SkeletonItem
                key={ri}
                height={skeletonHeights[(ci * 3 + ri) % skeletonHeights.length] ?? 180}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div id="gallery">
      {columns.map((col, ci) => (
        <div key={ci} className="gallery-col">
          {col.map((item, ri) => (
            <GalleryItem
              key={item.id}
              item={item}
              globalIdx={ri * colCount + ci}
              animDelay={Math.min(ri * 25, 300)}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
