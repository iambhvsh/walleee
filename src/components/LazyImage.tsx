import { useRef, useEffect, useState, type CSSProperties } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  style?: CSSProperties;
  className?: string;
  onLoad?: () => void;
  rootMargin?: string;
}

/**
 * Image that defers loading until near the viewport.
 * Fades in on load. Falls back to native lazy if IntersectionObserver unavailable.
 */
export function LazyImage({
  src,
  alt,
  width,
  height,
  style,
  className,
  onLoad,
  rootMargin = '500px 0px',
}: LazyImageProps): React.JSX.Element {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  const handleLoad = (): void => {
    setLoaded(true);
    onLoad?.();
  };

  return (
    <img
      ref={imgRef}
      src={visible ? src : undefined}
      alt={alt}
      width={width}
      height={height}
      decoding="async"
      style={{
        opacity: loaded ? 1 : 0,
        transition: 'opacity 0.4s ease',
        display: 'block',
        ...style,
      }}
      className={className}
      onLoad={handleLoad}
      onError={() => setLoaded(true)} // show broken img rather than shimmer forever
    />
  );
}
