import React, { useCallback, useMemo } from 'react';
import { useVirtualizedList } from '../../hooks/useOptimizedList';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  overscan?: number;
  scrollThreshold?: number;
  onScroll?: (scrollTop: number) => void;
  keyExtractor?: (item: T, index: number) => string | number;
}

function VirtualList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  className,
  style,
  overscan = 5,
  scrollThreshold = 10,
  onScroll,
  keyExtractor = (_, index) => index,
}: VirtualListProps<T>) {
  const {
    virtualItems,
    totalHeight,
    containerRef,
    handleScroll,
    scrollToItem,
    visibleRange,
  } = useVirtualizedList(items, {
    itemHeight,
    containerHeight: height,
    overscan,
    scrollThreshold,
  });

  const onScrollHandler = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      handleScroll(e);
      onScroll?.(e.currentTarget.scrollTop);
    },
    [handleScroll, onScroll]
  );

  const containerStyle: React.CSSProperties = useMemo(
    () => ({
      height,
      overflow: 'auto',
      position: 'relative',
      ...style,
    }),
    [height, style]
  );

  const innerStyle: React.CSSProperties = useMemo(
    () => ({
      height: totalHeight,
      position: 'relative',
    }),
    [totalHeight]
  );

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
      onScroll={onScrollHandler}
    >
      <div style={innerStyle}>
        {virtualItems.map((virtualItem) => (
          <div
            key={keyExtractor(virtualItem.data, virtualItem.index)}
            style={virtualItem.style}
          >
            {renderItem(virtualItem.data, virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default VirtualList;