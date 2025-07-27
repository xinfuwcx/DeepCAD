/**
 * 触摸优化控件组件
 * 1号架构师 - 移动端触摸交互优化
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button, ButtonProps, Slider, SliderSingleProps } from 'antd';
import { useDeepCADTheme } from './DeepCADTheme';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';

// 触摸优化按钮
interface TouchButtonProps extends ButtonProps {
  hapticFeedback?: boolean;
  longPressAction?: () => void;
  longPressDelay?: number;
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  hapticFeedback = true,
  longPressAction,
  longPressDelay = 500,
  children,
  style,
  onClick,
  ...buttonProps
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout>();
  const { themeConfig } = useDeepCADTheme();
  const { touchOptimizations, isTouch } = useResponsiveLayout();

  // 触摸开始
  const handleTouchStart = useCallback(() => {
    if (!isTouch) return;
    
    setIsPressed(true);
    setLongPressTriggered(false);
    
    // 触觉反馈
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    // 长按处理
    if (longPressAction) {
      pressTimer.current = setTimeout(() => {
        setLongPressTriggered(true);
        longPressAction();
        
        // 长按触觉反馈
        if (hapticFeedback && 'vibrate' in navigator) {
          navigator.vibrate([50, 10, 50]);
        }
      }, longPressDelay);
    }
  }, [isTouch, hapticFeedback, longPressAction, longPressDelay]);

  // 触摸结束
  const handleTouchEnd = useCallback(() => {
    setIsPressed(false);
    
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  }, []);

  // 点击处理
  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    // 如果已经触发长按，则不执行常规点击
    if (longPressTriggered) {
      setLongPressTriggered(false);
      return;
    }
    
    // 触觉反馈
    if (isTouch && hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(20);
    }
    
    onClick?.(event);
  }, [longPressTriggered, isTouch, hapticFeedback, onClick]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current);
      }
    };
  }, []);

  const touchOptimizedStyle: React.CSSProperties = {
    minHeight: isTouch ? touchOptimizations.minButtonSize : undefined,
    minWidth: isTouch ? touchOptimizations.minButtonSize : undefined,
    padding: isTouch ? `${touchOptimizations.spacing / 2}px ${touchOptimizations.spacing}px` : undefined,
    transform: isPressed ? 'scale(0.95)' : 'scale(1)',
    transition: `all ${touchOptimizations.animations?.duration || 250}ms ${touchOptimizations.animations?.easing || 'ease'}`,
    boxShadow: isPressed ? 
      `inset 0 2px 4px rgba(0,0,0,0.2)` : 
      `0 2px 8px rgba(${themeConfig?.primaryColor ? themeConfig.primaryColor.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(',') : '0,217,255'}, 0.3)`,
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    ...style
  };

  return (
    <Button
      {...buttonProps}
      style={touchOptimizedStyle}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={() => !isTouch && setIsPressed(true)}
      onMouseUp={() => !isTouch && setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      {children}
    </Button>
  );
};

// 触摸优化滑块
interface TouchSliderProps extends SliderSingleProps {
  hapticFeedback?: boolean;
  stepHaptic?: boolean;
}

export const TouchSlider: React.FC<TouchSliderProps> = ({
  hapticFeedback = true,
  stepHaptic = true,
  style,
  onChange,
  ...sliderProps
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const lastHapticValue = useRef<number>(0);
  const { themeConfig } = useDeepCADTheme();
  const { touchOptimizations, isTouch } = useResponsiveLayout();

  // 滑块变化处理
  const handleChange = useCallback((value: number) => {
    // 步进触觉反馈
    if (isTouch && stepHaptic && hapticFeedback && 'vibrate' in navigator) {
      const step = sliderProps.step || 1;
      const currentStep = Math.floor(value / step);
      const lastStep = Math.floor(lastHapticValue.current / step);
      
      if (currentStep !== lastStep) {
        navigator.vibrate(5);
        lastHapticValue.current = value;
      }
    }
    
    onChange?.(value);
  }, [isTouch, stepHaptic, hapticFeedback, sliderProps.step, onChange]);

  // 拖拽开始
  const handleAfterChange = useCallback((value: number) => {
    setIsDragging(false);
    
    // 完成触觉反馈
    if (isTouch && hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(15);
    }
  }, [isTouch, hapticFeedback]);

  const touchOptimizedStyle: React.CSSProperties = {
    marginBottom: isTouch ? touchOptimizations.spacing : undefined,
    ...style
  };

  const handleStyles = isTouch ? {
    '.ant-slider-handle': {
      width: '24px',
      height: '24px',
      border: `3px solid ${themeConfig?.primaryColor || '#00d9ff'}`,
      boxShadow: `0 2px 8px rgba(${themeConfig?.primaryColor ? themeConfig.primaryColor.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(',') : '0,217,255'}, 0.4)`,
    },
    '.ant-slider-handle:focus': {
      boxShadow: `0 0 0 5px rgba(${themeConfig?.primaryColor ? themeConfig.primaryColor.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(',') : '0,217,255'}, 0.2)`,
    },
    '.ant-slider-track': {
      height: '6px',
    },
    '.ant-slider-rail': {
      height: '6px',
    }
  } : {};

  return (
    <div style={{ position: 'relative' }}>
      <Slider
        {...sliderProps}
        style={touchOptimizedStyle}
        onChange={handleChange}
        onAfterChange={handleAfterChange}
      />
      {isTouch && (
        <style>{`
          .ant-slider-handle {
            width: 24px !important;
            height: 24px !important;
            border: 3px solid ${themeConfig?.primaryColor || '#00d9ff'} !important;
            box-shadow: 0 2px 8px rgba(${themeConfig?.primaryColor ? themeConfig.primaryColor.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(',') : '0,217,255'}, 0.4) !important;
          }
          
          .ant-slider-handle:focus {
            box-shadow: 0 0 0 5px rgba(${themeConfig?.primaryColor ? themeConfig.primaryColor.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(',') : '0,217,255'}, 0.2) !important;
          }
          
          .ant-slider-track {
            height: 6px !important;
          }
          
          .ant-slider-rail {
            height: 6px !important;
          }
        `}</style>
      )}
    </div>
  );
};

// 手势区域组件
interface GestureAreaProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onDoubleTap?: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const GestureArea: React.FC<GestureAreaProps> = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinch,
  onDoubleTap,
  children,
  className,
  style
}) => {
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTap = useRef<number>(0);
  const pinchStart = useRef<number>(0);
  const { touchOptimizations, isTouch } = useResponsiveLayout();

  // 触摸开始
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (!isTouch || event.touches.length > 2) return;

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };
    } else if (event.touches.length === 2 && onPinch) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      pinchStart.current = distance;
    }
  }, [isTouch, onPinch]);

  // 触摸移动
  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!isTouch) return;

    if (event.touches.length === 2 && onPinch && pinchStart.current) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      const scale = distance / pinchStart.current;
      onPinch(scale);
    }
  }, [isTouch, onPinch]);

  // 触摸结束
  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!isTouch || !touchStart.current) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const deltaTime = Date.now() - touchStart.current.time;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // 双击检测
    if (onDoubleTap && distance < 10 && deltaTime < 300) {
      const now = Date.now();
      if (now - lastTap.current < (touchOptimizations.gestures?.doubleTapDelay || 300)) {
        onDoubleTap();
        if ('vibrate' in navigator) {
          navigator.vibrate([30, 10, 30]);
        }
      }
      lastTap.current = now;
    }

    // 滑动检测
    const swipeThreshold = touchOptimizations.gestures?.swipeThreshold || 50;
    if (distance > swipeThreshold && deltaTime < 300) {
      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
      
      if (Math.abs(angle) < 45 && onSwipeRight) {
        onSwipeRight();
      } else if (Math.abs(angle) > 135 && onSwipeLeft) {
        onSwipeLeft();
      } else if (angle > 45 && angle < 135 && onSwipeDown) {
        onSwipeDown();
      } else if (angle < -45 && angle > -135 && onSwipeUp) {
        onSwipeUp();
      }

      // 滑动触觉反馈
      if ('vibrate' in navigator) {
        navigator.vibrate(20);
      }
    }

    touchStart.current = null;
    pinchStart.current = 0;
  }, [isTouch, touchOptimizations, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onDoubleTap]);

  if (!isTouch) {
    return <div className={className} style={style}>{children}</div>;
  }

  return (
    <div
      className={className}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        ...style
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};

export default {
  TouchButton,
  TouchSlider,
  GestureArea
};