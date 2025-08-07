/**
 * ABAQUS风格坐标轴 React Hook
 * 提供专业的CAE软件坐标轴显示
 */

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { AbaqusStyleAxis, AbaqusAxisOptions } from '../components/3d/core/AbaqusStyleAxis';

export interface UseAbaqusAxisOptions extends AbaqusAxisOptions {
  enabled?: boolean;
  container: HTMLElement | null;
  camera: THREE.Camera | null;
}

export const useAbaqusAxis = (options: UseAbaqusAxisOptions) => {
  const axisRef = useRef<AbaqusStyleAxis | null>(null);
  const {
    enabled = true,
    container,
    camera,
    ...axisOptions
  } = options;

  // 创建坐标轴
  const createAxis = useCallback(() => {
    if (!container || !enabled) return;

    // 销毁现有坐标轴
    if (axisRef.current) {
      axisRef.current.dispose();
      axisRef.current = null;
    }

    try {
      // 创建新的坐标轴
      const axis = new AbaqusStyleAxis(container, axisOptions);
      
      // 设置主相机
      if (camera) {
        axis.setMainCamera(camera);
      }
      
      axisRef.current = axis;
      console.log('✅ ABAQUS风格坐标轴已创建');
      
    } catch (error) {
      console.error('❌ ABAQUS坐标轴创建失败:', error);
    }
  }, [container, enabled, camera, axisOptions]);

  // 更新相机引用
  const updateCamera = useCallback((newCamera: THREE.Camera) => {
    if (axisRef.current && newCamera) {
      axisRef.current.setMainCamera(newCamera);
    }
  }, []);

  // 更新颜色
  const updateColors = useCallback((colors: { x?: string; y?: string; z?: string }) => {
    if (axisRef.current) {
      axisRef.current.updateColors(colors);
    }
  }, []);

  // 设置可见性
  const setVisible = useCallback((visible: boolean) => {
    if (axisRef.current) {
      axisRef.current.setVisible(visible);
    }
  }, []);

  // 设置透明度
  const setOpacity = useCallback((opacity: number) => {
    if (axisRef.current) {
      axisRef.current.setOpacity(opacity);
    }
  }, []);

  // 初始化和清理
  useEffect(() => {
    if (enabled && container) {
      createAxis();
    }

    return () => {
      if (axisRef.current) {
        axisRef.current.dispose();
        axisRef.current = null;
      }
    };
  }, [enabled, createAxis]);

  // 相机变化时更新
  useEffect(() => {
    if (camera) {
      updateCamera(camera);
    }
  }, [camera, updateCamera]);

  return {
    axis: axisRef.current,
    updateColors,
    setVisible,
    setOpacity,
    updateCamera
  };
};