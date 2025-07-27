/**
 * 现代化坐标轴Hook
 * 简化ModernAxisHelper的集成和管理
 */
import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { ModernAxisHelper, ModernAxisOptions } from '../components/3d/core/ModernAxisHelper';

export interface UseModernAxisOptions extends ModernAxisOptions {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  enabled?: boolean;
  position?: [number, number, number];
  cornerPosition?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
}

export const useModernAxis = (options: UseModernAxisOptions) => {
  const axisHelperRef = useRef<ModernAxisHelper | null>(null);
  const animationRef = useRef<number>();
  const clockRef = useRef(new THREE.Clock());

  const {
    scene,
    camera,
    renderer,
    enabled = true,
    position,
    cornerPosition,
    ...axisOptions
  } = options;

  // 创建坐标轴
  const createAxis = useCallback(() => {
    if (axisHelperRef.current) {
      scene.remove(axisHelperRef.current);
      axisHelperRef.current.dispose();
    }

    const axisHelper = new ModernAxisHelper(axisOptions);
    axisHelper.setCamera(camera);
    axisHelper.setRenderer(renderer);
    
    // 设置初始位置
    if (position) {
      axisHelper.setPosition(...position);
    } else if (cornerPosition) {
      axisHelper.setCornerPosition(cornerPosition);
    }
    
    scene.add(axisHelper);
    axisHelperRef.current = axisHelper;

    console.log('🎯 ModernAxisHelper 已创建并添加到场景，支持右键拖动');
  }, [scene, camera, renderer, axisOptions]);

  // 动画循环
  const animate = useCallback(() => {
    if (!axisHelperRef.current || !enabled) return;

    const deltaTime = clockRef.current.getDelta();
    axisHelperRef.current.update(deltaTime);

    animationRef.current = requestAnimationFrame(animate);
  }, [enabled]);

  // 初始化
  useEffect(() => {
    if (enabled && scene && camera && renderer) {
      createAxis();
      animate();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [enabled, createAxis, animate]);

  // 清理
  useEffect(() => {
    return () => {
      if (axisHelperRef.current) {
        scene.remove(axisHelperRef.current);
        axisHelperRef.current.dispose();
        axisHelperRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [scene]);

  // 控制方法
  const setAxisVisible = useCallback((visible: boolean) => {
    if (axisHelperRef.current) {
      axisHelperRef.current.setVisible(visible);
    }
  }, []);

  const setAxisSize = useCallback((size: number) => {
    if (axisHelperRef.current) {
      axisHelperRef.current.setSize(size);
    }
  }, []);

  const updateAxis = useCallback(() => {
    if (enabled) {
      createAxis();
    }
  }, [enabled, createAxis]);

  return {
    axisHelper: axisHelperRef.current,
    setAxisVisible,
    setAxisSize,
    updateAxis
  };
};

export default useModernAxis;