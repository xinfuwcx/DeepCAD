/**
 * 响应式布局Hook
 * 1号架构师 - 自适应屏幕断点和布局优化
 */

import { useState, useEffect, useCallback } from 'react';

// 屏幕断点定义
export const BREAKPOINTS = {
  mobile: 576,      // 手机
  tablet: 768,      // 平板
  desktop: 1024,    // 桌面
  ultrawide: 1440,  // 超宽屏
  large4k: 1920     // 4K大屏
} as const;

// 设备类型
export type DeviceType = keyof typeof BREAKPOINTS;

// 布局配置
export interface ResponsiveLayoutConfig {
  leftPanelWidth: number;
  rightPanelWidth: number;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  subViewEnabled: boolean;
  subViewHeight: number;
  compactMode: boolean;
  touchOptimized: boolean;
}

// 断点配置映射
const LAYOUT_CONFIGS: Record<DeviceType, ResponsiveLayoutConfig> = {
  mobile: {
    leftPanelWidth: 280,
    rightPanelWidth: 320,
    leftPanelCollapsed: true,   // 手机默认折叠侧边栏
    rightPanelCollapsed: true,
    subViewEnabled: false,      // 手机关闭下方子视图
    subViewHeight: 0,
    compactMode: true,
    touchOptimized: true
  },
  tablet: {
    leftPanelWidth: 300,
    rightPanelWidth: 350,
    leftPanelCollapsed: false,
    rightPanelCollapsed: true,  // 平板右侧面板折叠
    subViewEnabled: true,
    subViewHeight: 120,         // 较小的子视图
    compactMode: true,
    touchOptimized: true
  },
  desktop: {
    leftPanelWidth: 320,
    rightPanelWidth: 400,
    leftPanelCollapsed: false,
    rightPanelCollapsed: false,
    subViewEnabled: true,
    subViewHeight: 150,
    compactMode: false,
    touchOptimized: false
  },
  ultrawide: {
    leftPanelWidth: 380,
    rightPanelWidth: 450,
    leftPanelCollapsed: false,
    rightPanelCollapsed: false,
    subViewEnabled: true,
    subViewHeight: 180,
    compactMode: false,
    touchOptimized: false
  },
  large4k: {
    leftPanelWidth: 420,
    rightPanelWidth: 500,
    leftPanelCollapsed: false,
    rightPanelCollapsed: false,
    subViewEnabled: true,
    subViewHeight: 220,         // 4K大屏更大的子视图
    compactMode: false,
    touchOptimized: false
  }
};

interface ScreenInfo {
  width: number;
  height: number;
  deviceType: DeviceType;
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
  isTouch: boolean;
}

export const useResponsiveLayout = () => {
  const [screenInfo, setScreenInfo] = useState<ScreenInfo>({
    width: 1920,
    height: 1080,
    deviceType: 'desktop',
    orientation: 'landscape',
    pixelRatio: 1,
    isTouch: false
  });

  const [layoutConfig, setLayoutConfig] = useState<ResponsiveLayoutConfig>(
    LAYOUT_CONFIGS.desktop
  );

  // 检测设备类型
  const detectDeviceType = useCallback((width: number): DeviceType => {
    if (width < BREAKPOINTS.mobile) return 'mobile';
    if (width < BREAKPOINTS.tablet) return 'tablet';
    if (width < BREAKPOINTS.desktop) return 'desktop';
    if (width < BREAKPOINTS.ultrawide) return 'ultrawide';
    return 'large4k';
  }, []);

  // 检测是否为触摸设备
  const detectTouchDevice = useCallback((): boolean => {
    return 'ontouchstart' in window || 
           navigator.maxTouchPoints > 0 || 
           (navigator as any).msMaxTouchPoints > 0;
  }, []);

  // 更新屏幕信息
  const updateScreenInfo = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const deviceType = detectDeviceType(width);
    const orientation = width > height ? 'landscape' : 'portrait';
    const pixelRatio = window.devicePixelRatio || 1;
    const isTouch = detectTouchDevice();

    const newScreenInfo: ScreenInfo = {
      width,
      height,
      deviceType,
      orientation,
      pixelRatio,
      isTouch
    };

    setScreenInfo(newScreenInfo);
    
    // 根据设备类型更新布局配置
    const baseConfig = LAYOUT_CONFIGS[deviceType];
    const adjustedConfig: ResponsiveLayoutConfig = {
      ...baseConfig,
      touchOptimized: isTouch || baseConfig.touchOptimized
    };

    // 特殊情况调整
    if (orientation === 'portrait' && deviceType === 'tablet') {
      // 平板竖屏模式优化
      adjustedConfig.leftPanelCollapsed = true;
      adjustedConfig.subViewEnabled = false;
    }

    if (pixelRatio > 2) {
      // 高DPI屏幕优化
      adjustedConfig.leftPanelWidth = Math.floor(adjustedConfig.leftPanelWidth * 1.1);
      adjustedConfig.rightPanelWidth = Math.floor(adjustedConfig.rightPanelWidth * 1.1);
    }

    setLayoutConfig(adjustedConfig);
  }, [detectDeviceType, detectTouchDevice]);

  // 智能面板管理
  const getSmartPanelSuggestions = useCallback((): {
    shouldCollapseLeft: boolean;
    shouldCollapseRight: boolean;
    suggestedSubViewHeight: number;
    recommendedMode: 'focus' | 'overview' | 'detail';
  } => {
    const { width, deviceType, orientation } = screenInfo;
    
    let shouldCollapseLeft = false;
    let shouldCollapseRight = false;
    let suggestedSubViewHeight = layoutConfig.subViewHeight;
    let recommendedMode: 'focus' | 'overview' | 'detail' = 'overview';

    // 基于屏幕宽度的智能建议
    if (width < 1200) {
      shouldCollapseRight = true;
      recommendedMode = 'focus';
    }

    if (width < 900) {
      shouldCollapseLeft = true;
      shouldCollapseRight = true;
      suggestedSubViewHeight = 0;
      recommendedMode = 'focus';
    }

    // 移动设备特殊优化
    if (deviceType === 'mobile') {
      shouldCollapseLeft = true;
      shouldCollapseRight = true;
      suggestedSubViewHeight = 0;
      recommendedMode = 'focus';
    }

    // 平板竖屏优化
    if (deviceType === 'tablet' && orientation === 'portrait') {
      shouldCollapseLeft = true;
      recommendedMode = 'detail';
    }

    return {
      shouldCollapseLeft,
      shouldCollapseRight,
      suggestedSubViewHeight,
      recommendedMode
    };
  }, [screenInfo, layoutConfig]);

  // 获取触摸优化配置
  const getTouchOptimizations = useCallback(() => {
    if (!screenInfo.isTouch) return {};

    return {
      minButtonSize: 44,           // 最小触摸目标44px
      spacing: 16,                 // 增加间距
      gestures: {
        swipeThreshold: 50,        // 滑动阈值
        longPressDelay: 500,       // 长按延迟
        doubleTapDelay: 300        // 双击延迟
      },
      animations: {
        duration: 250,             // 触摸反馈动画时长
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
      }
    };
  }, [screenInfo.isTouch]);

  // 获取性能优化建议
  const getPerformanceOptimizations = useCallback(() => {
    const { pixelRatio, deviceType } = screenInfo;
    
    const suggestions = {
      reduceAnimations: false,
      lowerParticleCount: false,
      disableBlur: false,
      simplifyGradients: false,
      reduceShadows: false
    };

    // 低端设备优化
    if (deviceType === 'mobile') {
      suggestions.reduceAnimations = true;
      suggestions.lowerParticleCount = true;
      suggestions.disableBlur = true;
    }

    // 高DPI屏幕优化
    if (pixelRatio > 2) {
      suggestions.simplifyGradients = true;
      suggestions.reduceShadows = true;
    }

    return suggestions;
  }, [screenInfo]);

  // 监听窗口变化
  useEffect(() => {
    updateScreenInfo();
    
    const handleResize = () => {
      updateScreenInfo();
    };

    const handleOrientationChange = () => {
      // 延迟执行，等待屏幕完全旋转
      setTimeout(updateScreenInfo, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [updateScreenInfo]);

  return {
    screenInfo,
    layoutConfig,
    smartPanelSuggestions: getSmartPanelSuggestions(),
    touchOptimizations: getTouchOptimizations(),
    performanceOptimizations: getPerformanceOptimizations(),
    
    // 工具方法
    isMobile: screenInfo.deviceType === 'mobile',
    isTablet: screenInfo.deviceType === 'tablet',
    isDesktop: screenInfo.deviceType === 'desktop',
    isLargeScreen: ['ultrawide', 'large4k'].includes(screenInfo.deviceType),
    isPortrait: screenInfo.orientation === 'portrait',
    isTouch: screenInfo.isTouch,
    
    // 断点检查方法
    isAbove: (breakpoint: DeviceType) => {
      return screenInfo.width >= BREAKPOINTS[breakpoint];
    },
    isBelow: (breakpoint: DeviceType) => {
      return screenInfo.width < BREAKPOINTS[breakpoint];
    }
  };
};

export default useResponsiveLayout;