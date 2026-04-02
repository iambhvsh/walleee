import { useMemo, useCallback } from 'react';
import { LazyImage } from './LazyImage';
import { useColumnCount } from '@/hooks/useColumnCount';
import type { WallpaperItem } from '@/types';
import { downloadFile, filenameFromPublicId } from '@/utils/download';

interface GalleryProps {
  items: WallpaperItem[];
  isLoading: boolean;
  onItemClick: (index: number) => void;
}

function SkeletonItem({ height }: { height: number }): React.JSX.Element {
  return (
    <div
      className="gal-item skeleton-pulse"
      style={{ height, borderRadius: '0.55rem' }}
      aria-hidden
    />
  );
}

export function Gallery({ items, isLoading, onItemClick }: GalleryProps): React.JSX.Element {
  const colCount = useColumnCount();

  // Split items into columns (vertical slicing for masonry)
  const columns = useMemo<WallpaperItem[][]>(() => {
    const cols: WallpaperItem[][] = Array.from({ length: colCount }, () => []);
    items.forEach((item, i) => {
      const col = cols[i % colCount];
      if (col) col.push(item);
    });
    return cols;
  }, [items, colCount]);

  const handleDownload = useCallback((e: React.MouseEvent, item: WallpaperItem) => {
    e.preventDefault();
    e.stopPropagation();
    downloadFile(item.url, filenameFromPublicId(item.publicId));
  }, []);

  if (isLoading) {
    const skeletonCols: number[][] = Array.from({ length: colCount }, () => []);
    const heights = [180, 240, 160, 220, 200, 170, 260, 150, 210, 190];
    Array.from({ length: 12 }, (_, i) => {
      const col = skeletonCols[i % colCount];
      const h = heights[i % heights.length];
      if (col && h !== undefined) col.push(h);
    });

    return (
      <div id="gallery">
        {skeletonCols.map((col, ci) => (
          <div key={ci} className="gallery-col">
            {col.map((h, ri) => <SkeletonItem key={ri} height={h} />)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div id="gallery">
      {columns.map((col, ci) => (
        <div key={ci} className="gallery-col">
          {col.map((item, ri) => {
            const globalIdx = ri * colCount + ci;
            const delay = Math.min(ri * 30, 500);
            return (
              <div
                key={item.id}
                className="gal-item"
                style={{ animationDelay: `${delay}ms` }}
                onClick={() => onItemClick(globalIdx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onItemClick(globalIdx); }}
                aria-label={item.title ?? 'Open wallpaper'}
              >
                <LazyImage
                  src={item.thumbnailUrl}
                  alt={item.title ?? 'Wallpaper'}
                  style={{
                    width: '100%',
                    height: 'auto',
                    minHeight: '100px',
                    aspectRatio: `${item.width} / ${item.height}`,
                  }}
                />
                <button
                  className="gal-dl"
                  onClick={(e) => handleDownload(e, item)}
                  aria-label="Save wallpaper"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
