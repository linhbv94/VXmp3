import { useState, useEffect, useCallback } from 'react';

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
}

export interface UseVirtualizerOptions {
  count: number;
  getScrollElement: () => HTMLElement | null;
  estimateSize: () => number;
  overscan?: number;
}

export function useVirtualizer({
  count,
  getScrollElement,
  estimateSize,
  overscan = 10,
}: UseVirtualizerOptions) {
  const itemHeight = estimateSize();
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  useEffect(() => {
    const el = getScrollElement();
    if (!el) return;

    setViewportHeight(el.clientHeight);

    const handleScroll = () => {
      setScrollTop(el.scrollTop);
    };

    const handleResize = () => {
      setViewportHeight(el.clientHeight);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [getScrollElement]);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(viewportHeight / itemHeight) + 2 * overscan;
  const endIndex = Math.min(count - 1, startIndex + visibleCount);

  const getVirtualItems = useCallback((): VirtualItem[] => {
    if (count === 0) return [];
    const items: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        start: i * itemHeight,
        size: itemHeight,
      });
    }
    return items;
  }, [count, startIndex, endIndex, itemHeight]);

  const getTotalSize = useCallback((): number => {
    return count * itemHeight;
  }, [count, itemHeight]);

  return {
    getVirtualItems,
    getTotalSize,
  };
}
