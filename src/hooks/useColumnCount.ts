import { useState, useEffect } from 'react';

function getColumnCount(): number {
  const w = window.innerWidth;
  if (w >= 1400) return 6;
  if (w >= 1100) return 5;
  if (w >= 800) return 4;
  if (w >= 540) return 3;
  return 2;
}

export function useColumnCount(): number {
  const [cols, setCols] = useState<number>(getColumnCount);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handler = (): void => {
      clearTimeout(timer);
      timer = setTimeout(() => setCols(getColumnCount()), 150);
    };
    window.addEventListener('resize', handler);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handler);
    };
  }, []);

  return cols;
}
