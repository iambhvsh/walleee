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
  priority?: boolean;
}

// Single shared IntersectionObserver instance
type ObserverCallback = (isVisible: boolean) => void;
const callbacks = new Map<Element, ObserverCallback>();

const sharedIO =
  typeof window !== 'undefined' && 'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              callbacks.get(e.target)?.(true);
              sharedIO.unobserve(e.target);
              callbacks.delete(e.target);
            }
          });
        },
        { rootMargin: '600px 0px' },
      )
    : null;

export function LazyImage({
  src,
  alt,
  width,
  height,
  style,
  className,
  onLoad,
  priority = false,
}: LazyImageProps): React.JSX.Element {
  const imgRef  = useRef<HTMLImageElement>(null);
  const [loaded,  setLoaded]  = useState(false);
  const [visible, setVisible] = useState(priority);

  useEffect(() => {
    if (priority) return;           // already visible
    const el = imgRef.current;
    if (!el) return;

    if (!sharedIO) {
      // IntersectionObserver not supported
      setVisible(true);
      return;
    }

    callbacks.set(el, setVisible);
    sharedIO.observe(el);
    return () => {
      sharedIO.unobserve(el);
      callbacks.delete(el);
    };
  }, [priority]);

  return (
    <img
      ref={imgRef}
      src={visible ? src : undefined}
      alt={alt}
      width={width}
      height={height}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      style={{
        opacity:    loaded ? 1 : 0,
        transition: 'opacity 0.35s ease',
        display:    'block',
        willChange: loaded ? 'auto' : 'opacity', // hint GPU only while fading
        ...style,
      }}
      className={className}
      onLoad={() => { setLoaded(true); onLoad?.(); }}
      onError={() => setLoaded(true)}
    />
  );
}
