import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

interface VirtualizedListOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  scrollThreshold?: number;
}

interface VirtualizedItem<T> {
  data: T;
  index: number;
  style: React.CSSProperties;
}

export const useVirtualizedList = <T>(
  items: T[],
  options: VirtualizedListOptions
) => {
  const { itemHeight, containerHeight, overscan = 5, scrollThreshold = 10 } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    const start = Math.max(0, visibleStart - overscan);
    const end = Math.min(items.length - 1, visibleEnd + overscan);

    return { start, end, visibleStart, visibleEnd };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // 生成虚拟化项目
  const virtualItems = useMemo((): VirtualizedItem<T>[] => {
    const result: VirtualizedItem<T>[] = [];
    
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      result.push({
        data: items[i],
        index: i,
        style: {
          position: 'absolute',
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        },
      });
    }

    return result;
  }, [items, visibleRange, itemHeight]);

  // 节流滚动处理
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    if (Math.abs(newScrollTop - scrollTop) > scrollThreshold) {
      setScrollTop(newScrollTop);
    }
  }, [scrollTop, scrollThreshold]);

  // 总高度
  const totalHeight = items.length * itemHeight;

  // 滚动到指定项目
  const scrollToItem = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!containerRef.current) return;

    let targetScrollTop: number;
    
    switch (align) {
      case 'center':
        targetScrollTop = index * itemHeight - containerHeight / 2 + itemHeight / 2;
        break;
      case 'end':
        targetScrollTop = index * itemHeight - containerHeight + itemHeight;
        break;
      default:
        targetScrollTop = index * itemHeight;
    }

    targetScrollTop = Math.max(0, Math.min(targetScrollTop, totalHeight - containerHeight));
    containerRef.current.scrollTop = targetScrollTop;
    setScrollTop(targetScrollTop);
  }, [itemHeight, containerHeight, totalHeight]);

  return {
    virtualItems,
    totalHeight,
    containerRef,
    handleScroll,
    scrollToItem,
    visibleRange,
  };
};

// 优化的搜索 Hook
export const useOptimizedSearch = <T>(
  items: T[],
  searchFields: (keyof T)[],
  debounceMs: number = 300
) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // 防抖搜索词
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, debounceMs]);

  // 过滤结果
  const filteredItems = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return items;
    }

    const searchLower = debouncedSearchTerm.toLowerCase();
    
    return items.filter(item => 
      searchFields.some(field => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchLower);
        }
        if (typeof value === 'number') {
          return value.toString().includes(searchLower);
        }
        return false;
      })
    );
  }, [items, debouncedSearchTerm, searchFields]);

  return {
    searchTerm,
    setSearchTerm,
    filteredItems,
    isSearching: searchTerm !== debouncedSearchTerm,
  };
};

// 优化的排序 Hook
export const useOptimizedSort = <T>(
  items: T[],
  defaultSortKey?: keyof T,
  defaultSortOrder: 'asc' | 'desc' = 'asc'
) => {
  const [sortKey, setSortKey] = useState<keyof T | null>(defaultSortKey || null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);

  const sortedItems = useMemo(() => {
    if (!sortKey) return items;

    return [...items].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      let comparison = 0;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else if (aVal instanceof Date && bVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime();
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [items, sortKey, sortOrder]);

  const handleSort = useCallback((key: keyof T) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  }, [sortKey]);

  return {
    sortedItems,
    sortKey,
    sortOrder,
    handleSort,
    setSortKey,
    setSortOrder,
  };
};

// 分页 Hook
export const usePagination = <T>(
  items: T[],
  pageSize: number = 10
) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / pageSize);
  
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, pageSize]);

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  // 当 items 变化时重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  return {
    paginatedItems,
    currentPage,
    totalPages,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
};

// 组合优化的列表 Hook
export const useOptimizedList = <T>(
  items: T[],
  options: {
    searchFields?: (keyof T)[];
    sortKey?: keyof T;
    sortOrder?: 'asc' | 'desc';
    pageSize?: number;
    debounceMs?: number;
    virtualOptions?: VirtualizedListOptions;
  } = {}
) => {
  const {
    searchFields = [],
    sortKey,
    sortOrder = 'asc',
    pageSize,
    debounceMs = 300,
    virtualOptions,
  } = options;

  // 搜索
  const {
    searchTerm,
    setSearchTerm,
    filteredItems,
    isSearching,
  } = useOptimizedSearch(items, searchFields, debounceMs);

  // 排序
  const {
    sortedItems,
    sortKey: currentSortKey,
    sortOrder: currentSortOrder,
    handleSort,
    setSortKey,
    setSortOrder,
  } = useOptimizedSort(filteredItems, sortKey, sortOrder);

  // 分页（如果指定了 pageSize）
  const pagination = usePagination(sortedItems, pageSize);
  
  // 虚拟化（如果指定了 virtualOptions）
  const virtualization = useVirtualizedList(
    pageSize ? pagination.paginatedItems : sortedItems,
    virtualOptions || { itemHeight: 50, containerHeight: 400 }
  );

  const finalItems = pageSize ? pagination.paginatedItems : sortedItems;

  return {
    // 数据
    items: finalItems,
    totalItems: items.length,
    filteredCount: filteredItems.length,
    
    // 搜索
    searchTerm,
    setSearchTerm,
    isSearching,
    
    // 排序
    sortKey: currentSortKey,
    sortOrder: currentSortOrder,
    handleSort,
    setSortKey,
    setSortOrder,
    
    // 分页
    ...(pageSize ? pagination : {}),
    
    // 虚拟化
    ...(virtualOptions ? virtualization : {}),
  };
};

// 数据缓存 Hook
export const useDataCache = <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number; // 缓存时间（毫秒）
    refetchOnMount?: boolean;
    refetchOnWindowFocus?: boolean;
  } = {}
) => {
  const {
    ttl = 5 * 60 * 1000, // 默认5分钟
    refetchOnMount = false,
    refetchOnWindowFocus = false,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cacheRef = useRef<{ data: T; timestamp: number } | null>(null);

  const fetchData = useCallback(async (force = false) => {
    // 检查缓存
    if (!force && cacheRef.current) {
      const { data: cachedData, timestamp } = cacheRef.current;
      if (Date.now() - timestamp < ttl) {
        setData(cachedData);
        return cachedData;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      
      // 更新缓存
      cacheRef.current = {
        data: result,
        timestamp: Date.now(),
      };
      
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetcher, ttl]);

  // 初始化获取数据
  useEffect(() => {
    if (refetchOnMount || !data) {
      fetchData();
    }
  }, [fetchData, refetchOnMount, data]);

  // 窗口焦点时重新获取
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => fetchData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchData, refetchOnWindowFocus]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  const mutate = useCallback((newData: T) => {
    setData(newData);
    cacheRef.current = {
      data: newData,
      timestamp: Date.now(),
    };
  }, []);

  return {
    data,
    loading,
    error,
    refresh,
    mutate,
  };
};