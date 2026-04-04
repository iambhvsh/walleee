import { useState, useCallback } from 'react';
import { Header }       from '@/components/Header';
import { Carousel }     from '@/components/Carousel';
import { Gallery }      from '@/components/Gallery';
import { Lightbox }     from '@/components/Lightbox';
import { InfoModal }    from '@/components/InfoModal';
import { EmptyState }   from '@/components/EmptyState';
import { useWallpapers } from '@/hooks/useWallpapers';
import { useTheme }     from '@/hooks/useTheme';
import { useLightbox }  from '@/hooks/useLightbox';
import type { WallpaperItem } from '@/types';

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

export function App(): React.JSX.Element {
  const { theme, toggle: toggleTheme }                        = useTheme();
  const { allItems, items, carousel, total, isLoading, error, reload } = useWallpapers();
  const [infoOpen, setInfoOpen]                               = useState(false);
  const lb = useLightbox(allItems);

  const handleCarouselClick = useCallback(
    (carouselIdx: number, _item: WallpaperItem) => { lb.open(carouselIdx); },
    [lb],
  );

  const handleGalleryClick = useCallback(
    (galleryIdx: number) => { lb.open(carousel.length + galleryIdx); },
    [lb, carousel.length],
  );

  const isEmpty = !isLoading && allItems.length === 0;

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
            <button
              className="meta-text"
              style={{ color: '#ff453a', background: 'none', border: 'none',
                       cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
              onClick={reload}
            >
              {error} — tap to retry
            </button>
          )}
        </div>

        {isEmpty ? (
          <EmptyState />
        ) : (
          <Gallery items={items} isLoading={isLoading} onItemClick={handleGalleryClick} />
        )}
      </main>

      <Lightbox
        isOpen={lb.state.isOpen}
        current={lb.current}
        onClose={lb.close}
        onNext={lb.next}
        onPrev={lb.prev}
      />

      <InfoModal isOpen={infoOpen} onClose={() => setInfoOpen(false)} total={total} />
    </>
  );
}
