/**
 * 3D网格组件
 * 提供可配置的3D地面网格显示
 */

import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useViewportStore } from '../../stores/useViewportStore';

interface Grid3DProps {
  scene?: THREE.Scene;
}

export const Grid3D: React.FC<Grid3DProps> = ({ scene }) => {
  const gridRef = useRef<THREE.Group>(null);
  const { grid } = useViewportStore();

  // 创建网格对象
  const gridObject = useMemo(() => {
    if (!grid.visible) return null;

    const gridGroup = new THREE.Group();
    gridGroup.name = 'Grid3D';

    // 主网格
    const mainGrid = new THREE.GridHelper(
      grid.size, // 网格大小
      grid.divisions, // 分割数
      new THREE.Color(grid.color), // 中心线颜色
      new THREE.Color(grid.color) // 网格线颜色
    );

    // 设置网格透明度
    const mainMaterial = mainGrid.material as THREE.LineBasicMaterial;
    mainMaterial.transparent = true;
    mainMaterial.opacity = grid.opacity;

    // 设置网格位置（通常在Y=0平面）
    mainGrid.position.set(0, 0, 0);
    gridGroup.add(mainGrid);

    // 细网格（可选）
    if (grid.divisions > 10) {
      const fineGrid = new THREE.GridHelper(
        grid.size,
        grid.divisions * 2,
        new THREE.Color(grid.color),
        new THREE.Color(grid.color)
      );

      const fineMaterial = fineGrid.material as THREE.LineBasicMaterial;
      fineMaterial.transparent = true;
      fineMaterial.opacity = grid.opacity * 0.3; // 细网格更透明

      fineGrid.position.set(0, 0, 0);
      gridGroup.add(fineGrid);
    }

    // 坐标轴线（可选）
    if (grid.size > 5) {
      // X轴线（红色）
      const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-grid.size / 2, 0, 0),
        new THREE.Vector3(grid.size / 2, 0, 0)
      ]);
      const xAxisMaterial = new THREE.LineBasicMaterial({ 
        color: 0xff4444, 
        transparent: true, 
        opacity: grid.opacity * 1.5 
      });
      const xAxisLine = new THREE.Line(xAxisGeometry, xAxisMaterial);
      gridGroup.add(xAxisLine);

      // Z轴线（蓝色）
      const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, -grid.size / 2),
        new THREE.Vector3(0, 0, grid.size / 2)
      ]);
      const zAxisMaterial = new THREE.LineBasicMaterial({ 
        color: 0x4444ff, 
        transparent: true, 
        opacity: grid.opacity * 1.5 
      });
      const zAxisLine = new THREE.Line(zAxisGeometry, zAxisMaterial);
      gridGroup.add(zAxisLine);
    }

    return gridGroup;
  }, [grid]);

  // 更新场景中的网格
  useEffect(() => {
    if (!scene) return;

    // 移除旧的网格
    const existingGrid = scene.getObjectByName('Grid3D');
    if (existingGrid) {
      scene.remove(existingGrid);
      // 清理几何体和材质
      existingGrid.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    }

    // 添加新的网格
    if (gridObject) {
      scene.add(gridObject);
    }

    return () => {
      if (gridObject) {
        scene.remove(gridObject);
        gridObject.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      }
    };
  }, [scene, gridObject]);

  // 这个组件不渲染DOM，只管理Three.js对象
  return null;
};

// 创建无限网格的工具函数
export function createInfiniteGrid(
  size: number = 100,
  divisions: number = 100,
  color: string = '#888888',
  opacity: number = 0.3
): THREE.GridHelper {
  const grid = new THREE.GridHelper(size, divisions, color, color);
  
  const material = grid.material as THREE.LineBasicMaterial;
  material.transparent = true;
  material.opacity = opacity;
  
  // 设置网格在某个距离外淡出（可选）
  material.vertexColors = false;
  
  return grid;
}

// 创建自定义网格的工具函数
export function createCustomGrid(options: {
  size: number;
  divisions: number;
  color: string;
  opacity: number;
  showAxes?: boolean;
  axisColors?: { x: string; y: string; z: string };
}): THREE.Group {
  const {
    size,
    divisions,
    color,
    opacity,
    showAxes = true,
    axisColors = { x: '#ff4444', y: '#44ff44', z: '#4444ff' }
  } = options;

  const group = new THREE.Group();

  // 主网格
  const grid = new THREE.GridHelper(size, divisions, color, color);
  const material = grid.material as THREE.LineBasicMaterial;
  material.transparent = true;
  material.opacity = opacity;
  group.add(grid);

  if (showAxes) {
    // X轴
    const xGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-size / 2, 0, 0),
      new THREE.Vector3(size / 2, 0, 0)
    ]);
    const xMaterial = new THREE.LineBasicMaterial({ 
      color: axisColors.x, 
      transparent: true, 
      opacity: opacity * 2 
    });
    const xLine = new THREE.Line(xGeometry, xMaterial);
    group.add(xLine);

    // Y轴
    const yGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -size / 4, 0),
      new THREE.Vector3(0, size / 4, 0)
    ]);
    const yMaterial = new THREE.LineBasicMaterial({ 
      color: axisColors.y, 
      transparent: true, 
      opacity: opacity * 2 
    });
    const yLine = new THREE.Line(yGeometry, yMaterial);
    group.add(yLine);

    // Z轴
    const zGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -size / 2),
      new THREE.Vector3(0, 0, size / 2)
    ]);
    const zMaterial = new THREE.LineBasicMaterial({ 
      color: axisColors.z, 
      transparent: true, 
      opacity: opacity * 2 
    });
    const zLine = new THREE.Line(zGeometry, zMaterial);
    group.add(zLine);
  }

  return group;
}

export default Grid3D;