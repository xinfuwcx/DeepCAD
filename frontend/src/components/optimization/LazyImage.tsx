import React, { useState, useRef, useEffect, ImgHTMLAttributes } from 'react';
import { Skeleton } from 'antd';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  placeholder?: string;
  fallback?: string;
  threshold?: number;
  rootMargin?: string;
  enableBlur?: boolean;
  showSkeleton?: boolean;
  skeletonProps?: {
    width?: number | string;
    height?: number | string;
    active?: boolean;
  };
  onLoad?: () => void;
  onError?: () => void;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  placeholder,
  fallback,
  threshold = 0.1,
  rootMargin = '50px',
  enableBlur = true,
  showSkeleton = false,
  skeletonProps,
  onLoad,
  onError,
  style,
  className,
  alt,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState<string>(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(img);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(img);

    return () => {
      observer.unobserve(img);
    };
  }, [threshold, rootMargin]);

  // 加载图片
  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
      setIsError(false);
      onLoad?.();
    };

    img.onerror = () => {
      if (fallback) {
        setImageSrc(fallback);
        setIsLoaded(true);
      } else {
        setIsError(true);
      }
      onError?.();
    };

    img.src = src;
  }, [isInView, src, fallback, onLoad, onError]);

  // 样式处理
  const imageStyle: React.CSSProperties = {
    ...style,
    transition: enableBlur && !isLoaded ? 'filter 0.3s ease' : undefined,
    filter: enableBlur && !isLoaded && imageSrc ? 'blur(5px)' : 'none',
  };

  // 显示骨架屏
  if (showSkeleton && !isLoaded && !isError) {
    return (
      <Skeleton.Image
        active={skeletonProps?.active !== false}
        style={{
          width: skeletonProps?.width || '100%',
          height: skeletonProps?.height || '200px',
          ...style,
        }}
      />
    );
  }

  // 显示错误状态
  if (isError && !fallback) {
    return (
      <div
        className={className}
        style={{
          ...imageStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          color: '#999',
          fontSize: '14px',
          minHeight: '100px',
        }}
      >
        图片加载失败
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={className}
      style={imageStyle}
      {...props}
    />
  );
};

export default LazyImage;