/**
 * React Hook for Realistic Rendering Engine
 * 简化在React组件中使用真实级渲染引擎
 */
import { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import RealisticRenderingEngine, { 
  RenderingQuality, 
  PostProcessingSettings, 
  QUALITY_PRESETS 
} from '../services/RealisticRenderingEngine';

export interface UseRealisticRenderingOptions {
  qualityLevel?: keyof typeof QUALITY_PRESETS;
  autoResize?: boolean;
  enableStats?: boolean;
}

export interface UseRealisticRenderingReturn {
  mountRef: React.RefObject<HTMLDivElement>;
  engine: RealisticRenderingEngine | null;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  isInitialized: boolean;
  
  // 控制方法
  render: () => void;
  setQuality: (level: keyof typeof QUALITY_PRESETS) => void;
  updatePostProcessing: (settings: Partial<PostProcessingSettings>) => void;
  getStats: () => { fps: number; memory: number; drawCalls: number } | null;
  
  // 便捷方法
  addToScene: (object: THREE.Object3D) => void;
  removeFromScene: (object: THREE.Object3D) => void;
  setCameraPosition: (x: number, y: number, z: number) => void;
  lookAt: (x: number, y: number, z: number) => void;
}

export const useRealisticRendering = (
  options: UseRealisticRenderingOptions = {}
): UseRealisticRenderingReturn => {
  const {
    qualityLevel = 'high',
    autoResize = true,
    enableStats = false
  } = options;

  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RealisticRenderingEngine | null>(null);
  const sceneRef = useRef<THREE.Scene>(new THREE.Scene());
  const cameraRef = useRef<THREE.PerspectiveCamera>(
    new THREE.PerspectiveCamera(75, 1, 0.1, 2000)
  );
  const animationFrameRef = useRef<number>();
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [stats, setStats] = useState<{ fps: number; memory: number; drawCalls: number } | null>(null);

  // 初始化渲染引擎
  useEffect(() => {
    if (!mountRef.current) return;

    try {
      // 设置相机默认位置
      cameraRef.current.position.set(0, 0, 10);
      cameraRef.current.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();

      // 创建渲染引擎
      engineRef.current = new RealisticRenderingEngine(
        mountRef.current,
        sceneRef.current,
        cameraRef.current,
        qualityLevel
      );

      setIsInitialized(true);

      // 设置基础环境
      RealisticRenderingEngine.setupEnvironment(sceneRef.current, {
        fogColor: 0x1a1a2e,
        fogNear: 200,
        fogFar: 1000
      });

      console.log('🎨 真实级渲染引擎初始化成功');
    } catch (error) {
      console.error('❌ 渲染引擎初始化失败:', error);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
      setIsInitialized(false);
    };
  }, [qualityLevel]);

  // 自动调整大小
  useEffect(() => {
    if (!autoResize || !engineRef.current || !mountRef.current) return;

    const handleResize = () => {
      if (!mountRef.current || !engineRef.current) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      engineRef.current.resize(width, height);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mountRef.current);

    // 初始调整
    handleResize();

    return () => {
      resizeObserver.disconnect();
    };
  }, [autoResize, isInitialized]);

  // 性能统计
  useEffect(() => {
    if (!enableStats || !engineRef.current) return;

    let frameCount = 0;
    let lastTime = performance.now();
    
    const updateStats = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        const memory = (performance as any).memory ? 
          Math.round((performance as any).memory.usedJSHeapSize / 1048576) : 0;
        
        setStats({
          fps,
          memory,
          drawCalls: engineRef.current?.getRenderer().info.render.calls || 0
        });
        
        frameCount = 0;
        lastTime = currentTime;
      }
    };

    const interval = setInterval(updateStats, 100);
    return () => clearInterval(interval);
  }, [enableStats, isInitialized]);

  // 渲染方法
  const render = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.render();
    }
  }, []);

  // 质量设置
  const setQuality = useCallback((level: keyof typeof QUALITY_PRESETS) => {
    if (engineRef.current) {
      engineRef.current.setQuality(level);
      console.log(`🎨 渲染质量已切换到: ${level}`);
    }
  }, []);

  // 后处理设置
  const updatePostProcessing = useCallback((settings: Partial<PostProcessingSettings>) => {
    if (engineRef.current) {
      engineRef.current.updatePostProcessingSettings(settings);
    }
  }, []);

  // 获取性能统计
  const getStats = useCallback(() => stats, [stats]);

  // 场景操作便捷方法
  const addToScene = useCallback((object: THREE.Object3D) => {
    sceneRef.current.add(object);
  }, []);

  const removeFromScene = useCallback((object: THREE.Object3D) => {
    sceneRef.current.remove(object);
  }, []);

  const setCameraPosition = useCallback((x: number, y: number, z: number) => {
    cameraRef.current.position.set(x, y, z);
  }, []);

  const lookAt = useCallback((x: number, y: number, z: number) => {
    cameraRef.current.lookAt(x, y, z);
  }, []);

  return {
    mountRef,
    engine: engineRef.current,
    scene: sceneRef.current,
    camera: cameraRef.current,
    isInitialized,
    
    // 控制方法
    render,
    setQuality,
    updatePostProcessing,
    getStats,
    
    // 便捷方法
    addToScene,
    removeFromScene,
    setCameraPosition,
    lookAt
  };
};

export default useRealisticRendering;