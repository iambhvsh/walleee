import { useRef, useCallback, type TouchEvent } from 'react';
import type { WallpaperItem } from '@/types';
import { downloadFile, filenameFromPublicId } from '@/utils/download';

interface LightboxProps {
  isOpen: boolean;
  current: WallpaperItem | null;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export function Lightbox({ isOpen, current, onClose, onNext, onPrev }: LightboxProps): React.JSX.Element {
  const touchStartX = useRef<number>(0);

  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.changedTouches[0]?.screenX ?? 0;
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      const endX = e.changedTouches[0]?.screenX ?? 0;
      if (endX < touchStartX.current - 40) onNext();
      if (endX > touchStartX.current + 40) onPrev();
    },
    [onNext, onPrev],
  );

  const handleDownload = useCallback(() => {
    if (!current) return;
    downloadFile(current.url, filenameFromPublicId(current.publicId));
  }, [current]);

  return (
    <div
      id="custom-lightbox"
      className={`custom-lightbox${isOpen ? ' visible' : ''}`}
      aria-modal={isOpen}
      role="dialog"
      aria-label="Wallpaper viewer"
    >
      <div className="lb-backdrop" id="lb-backdrop" onClick={onClose} />

      <button className="lb-close" onClick={onClose} aria-label="Close">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <button className="lb-nav lb-prev" onClick={onPrev} aria-label="Previous">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <button className="lb-nav lb-next" onClick={onNext} aria-label="Next">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <div
        className="lb-img-container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {current && (
          <img
            key={current.id}
            src={current.url}
            alt={current.title ?? 'Wallpaper'}
            className="lb-img"
          />
        )}
      </div>

      {current && (
        <button id="lb-dl-btn" onClick={handleDownload} aria-label="Save wallpaper">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Save</span>
        </button>
      )}
    </div>
  );
}
