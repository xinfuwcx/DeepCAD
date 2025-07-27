import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GridSettings } from '../../hooks/useGridSettings';

interface GridRendererProps {
  gridSettings: GridSettings;
  scene?: THREE.Scene;
}

/**
 * 网格渲染组件，用于在 3D 视图中显示网格（基于Three.js）
 */
const GridRenderer: React.FC<GridRendererProps> = ({ gridSettings, scene }) => {
  const gridRef = useRef<THREE.Group | null>(null);
  
  // 创建网格
  useEffect(() => {
    if (!scene) return;
    
    // 如果已经有网格，先移除
    if (gridRef.current) {
      scene.remove(gridRef.current);
      gridRef.current = null;
    }
    
    // 如果网格未启用或不可见，则不创建
    if (!gridSettings.enabled || !gridSettings.visible) {
      return;
    }
    
    // 创建网格组
    const gridGroup = new THREE.Group();
    gridGroup.name = 'grid';
    
    // 创建网格数据
    const gridSize = gridSettings.gridSize || 100;
    const subdivisions = gridSettings.subdivisions || 10;
    
    // 创建主网格
    const mainGrid = new THREE.GridHelper(gridSize, subdivisions);
    mainGrid.material.color.setHex(0x888888);
    mainGrid.material.opacity = 0.8;
    mainGrid.material.transparent = true;
    
    // 创建细分网格
    const subGrid = new THREE.GridHelper(gridSize, subdivisions * 10);
    (subGrid.material as THREE.LineBasicMaterial).color.setHex(0xcccccc);
    (subGrid.material as THREE.LineBasicMaterial).opacity = 0.3;
    (subGrid.material as THREE.LineBasicMaterial).transparent = true;
    
    gridGroup.add(subGrid);
    gridGroup.add(mainGrid);
    
    // 将网格添加到场景
    scene.add(gridGroup);
    gridRef.current = gridGroup;
    
    // 清理函数
    return () => {
      if (gridRef.current && scene) {
        scene.remove(gridRef.current);
        gridRef.current = null;
      }
    };
  }, [gridSettings, scene]);
  
  return null;
};

export default GridRenderer;