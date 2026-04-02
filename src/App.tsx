import { useState, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Carousel } from '@/components/Carousel';
import { Gallery } from '@/components/Gallery';
import { Lightbox } from '@/components/Lightbox';
import { InfoModal } from '@/components/InfoModal';
import { EmptyState } from '@/components/EmptyState';
import { useWallpapers } from '@/hooks/useWallpapers';
import { useTheme } from '@/hooks/useTheme';
import { useLightbox } from '@/hooks/useLightbox';
import type { WallpaperItem } from '@/types';

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function App(): React.JSX.Element {
  const { theme, toggle: toggleTheme } = useTheme();
  const { items, carousel, isLoading, error } = useWallpapers();
  const [infoOpen, setInfoOpen] = useState(false);

  // Lightbox operates over the full gallery (items), not carousel
  const lb = useLightbox(items);

  const handleCarouselClick = useCallback(
    (_idx: number, item: WallpaperItem) => {
      // Find item in gallery list; if not present (carousel-only), append
      const galleryIdx = items.findIndex((w) => w.id === item.id);
      if (galleryIdx !== -1) {
        lb.open(galleryIdx);
      } else {
        // carousel item not in gallery — open with its own index placeholder
        lb.open(0);
      }
    },
    [items, lb],
  );

  const isEmpty = !isLoading && items.length === 0 && carousel.length === 0;

  return (
    <>
      <Header theme={theme} onThemeToggle={toggleTheme} onInfoOpen={() => setInfoOpen(true)} />

      <main className="container">
        <div className="section-header">
          <h2 className="section-title">Today's Picks</h2>
          <span className="meta-text">{todayLabel()}</span>
        </div>

        {!isEmpty && (
          <Carousel items={carousel} isLoading={isLoading} onItemClick={handleCarouselClick} />
        )}

        <div className="section-header">
          <h2 className="section-title">All Wallpapers</h2>
          {error && (
            <span className="meta-text" style={{ color: '#ff453a' }}>
              {error}
            </span>
          )}
        </div>

        {isEmpty ? (
          <EmptyState visible />
        ) : (
          <Gallery items={items} isLoading={isLoading} onItemClick={lb.open} />
        )}
      </main>

      <Lightbox
        isOpen={lb.state.isOpen}
        current={lb.current}
        onClose={lb.close}
        onNext={lb.next}
        onPrev={lb.prev}
      />

      <InfoModal isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  );
}
