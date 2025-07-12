import { useState, useCallback } from 'react';

export interface GridSettings {
  enabled: boolean;       // 是否启用网格
  visible: boolean;       // 是否显示网格
  snapEnabled: boolean;   // 是否启用吸附
  gridSize: number;       // 网格大小（米）
  subdivisions: number;   // 网格细分数
}

/**
 * 管理网格设置和吸附功能的钩子
 */
export function useGridSettings() {
  // 默认网格设置
  const [gridSettings, setGridSettings] = useState<GridSettings>({
    enabled: true,
    visible: true,
    snapEnabled: false,
    gridSize: 1.0,
    subdivisions: 10,
  });

  // 更新网格设置
  const updateGridSettings = useCallback((newSettings: Partial<GridSettings>) => {
    setGridSettings(prev => ({
      ...prev,
      ...newSettings,
    }));
  }, []);

  // 切换网格可见性
  const toggleGridVisibility = useCallback(() => {
    setGridSettings(prev => ({
      ...prev,
      visible: !prev.visible,
    }));
  }, []);

  // 切换网格吸附
  const toggleGridSnap = useCallback(() => {
    setGridSettings(prev => ({
      ...prev,
      snapEnabled: !prev.snapEnabled,
    }));
  }, []);

  // 将坐标吸附到网格
  const snapToGrid = useCallback((position: { x: number; y: number; z?: number }) => {
    if (!gridSettings.snapEnabled) {
      return position;
    }

    const cellSize = gridSettings.gridSize / gridSettings.subdivisions;
    
    return {
      x: Math.round(position.x / cellSize) * cellSize,
      y: Math.round(position.y / cellSize) * cellSize,
      z: position.z !== undefined ? Math.round(position.z / cellSize) * cellSize : undefined,
    };
  }, [gridSettings]);

  return {
    gridSettings,
    updateGridSettings,
    toggleGridVisibility,
    toggleGridSnap,
    snapToGrid,
  };
} 