import { useCallback, useRef } from 'react';
import { LazyImage } from './LazyImage';
import type { WallpaperItem } from '@/types';
import { downloadFile, filenameFromPublicId } from '@/utils/download';

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
  onClick: () => void;
}

function Slide({ item, onClick }: SlideProps): React.JSX.Element {
  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      downloadFile(item.url, filenameFromPublicId(item.publicId));
    },
    [item],
  );

  return (
    <div className="hero-carousel-slide" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}>
      <LazyImage
        src={item.thumbnailUrl}
        alt={item.title ?? 'Wallpaper'}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        rootMargin="300px 0px"
      />
      <button className="hero-dl-pill" onClick={handleDownload} aria-label="Save wallpaper">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>Save</span>
      </button>
    </div>
  );
}

export function Carousel({ items, isLoading, onItemClick }: CarouselProps): React.JSX.Element {
  const wrapperRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="hero-carousel" ref={wrapperRef}>
        {Array.from({ length: 4 }, (_, i) => <SkeletonSlide key={i} />)}
      </div>
    );
  }

  return (
    <div className="hero-carousel" ref={wrapperRef}>
      {items.map((item, idx) => (
        <Slide
          key={item.id}
          item={item}
          onClick={() => onItemClick(idx, item)}
        />
      ))}
    </div>
  );
}
