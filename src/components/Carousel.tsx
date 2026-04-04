import { useCallback } from 'react';
import { LazyImage } from './LazyImage';
import { DownloadIcon } from './Gallery';
import type { WallpaperItem } from '@/types';
import { downloadFile, filenameFromItem } from '@/utils/download';

interface CarouselProps {
  items: WallpaperItem[];
  isLoading: boolean;
  onItemClick: (index: number, item: WallpaperItem) => void;
}

function SkeletonSlide(): React.JSX.Element {
  return <div className="hero-carousel-slide skeleton-pulse" aria-hidden />;
}

interface SlideProps {
  item: WallpaperItem;
  index: number;
  onItemClick: (index: number, item: WallpaperItem) => void;
}

function Slide({ item, index, onItemClick }: SlideProps): React.JSX.Element {
  const handleClick    = useCallback(() => onItemClick(index, item), [onItemClick, index, item]);
  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      downloadFile(item.url, filenameFromItem(item.publicId, item.format));
    },
    [item.url, item.publicId, item.format],
  );
  const handleKey = useCallback(
    (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') onItemClick(index, item); },
    [onItemClick, index, item],
  );

  return (
    <div
      className="hero-carousel-slide"
      onClick={handleClick}
      onKeyDown={handleKey}
      role="button"
      tabIndex={0}
      aria-label={item.title ?? 'Open wallpaper'}
    >
      {/* Carousel images are above the fold — load eagerly */}
      <LazyImage
        src={item.thumbnailUrl}
        alt={item.title ?? 'Wallpaper'}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        priority
      />
      <button className="hero-dl-pill" onClick={handleDownload} aria-label="Save wallpaper">
        <DownloadIcon size={14} />
        <span>Save</span>
      </button>
    </div>
  );
}

export function Carousel({ items, isLoading, onItemClick }: CarouselProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="hero-carousel">
        {Array.from({ length: 4 }, (_, i) => <SkeletonSlide key={i} />)}
      </div>
    );
  }

  return (
    <div className="hero-carousel">
      {items.map((item, idx) => (
        <Slide key={item.id} item={item} index={idx} onItemClick={onItemClick} />
      ))}
    </div>
  );
}
