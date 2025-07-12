/**
 * 视口交互控制 Hook
 * 统一管理视口的各种交互模式
 */

import { useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { useViewportStore } from '../stores/useViewportStore';
import { ToolbarAction } from '../types/viewport';
import { useMeasure } from './useMeasure';

interface UseViewportInteractionOptions {
  scene?: THREE.Scene;
  camera?: THREE.Camera;
  renderer?: THREE.WebGLRenderer;
  domElement?: HTMLElement;
  controls?: any; // OrbitControls等
}

export function useViewportInteraction(options: UseViewportInteractionOptions) {
  const { scene, camera, renderer, domElement, controls } = options;
  
  const {
    activeTool,
    setInteracting,
    viewport,
    grid,
    measurements,
    sectionPlanes
  } = useViewportStore();

  // 测量工具
  const measureTool = useMeasure({ scene, camera, domElement });
  
  // 交互状态
  const isInteracting = useRef(false);
  const lastTool = useRef<ToolbarAction>(ToolbarAction.ORBIT);

  // 更新渲染模式
  useEffect(() => {
    if (!scene) return;

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const material = object.material;
        if (Array.isArray(material)) {
          material.forEach(mat => {
            if (mat instanceof THREE.MeshBasicMaterial || 
                mat instanceof THREE.MeshStandardMaterial) {
              mat.wireframe = viewport.renderMode === 'wireframe';
            }
          });
        } else if (material instanceof THREE.MeshBasicMaterial || 
                   material instanceof THREE.MeshStandardMaterial) {
          material.wireframe = viewport.renderMode === 'wireframe';
        }
      }
    });
  }, [scene, viewport.renderMode]);

  // 处理工具切换
  useEffect(() => {
    if (!domElement || !controls) return;

    switch (activeTool) {
      case ToolbarAction.SELECT:
        controls.enabled = false;
        domElement.style.cursor = 'default';
        measureTool.stopMeasure();
        break;
        
      case ToolbarAction.ORBIT:
        controls.enabled = true;
        controls.enableRotate = true;
        controls.enablePan = false;
        controls.enableZoom = true;
        domElement.style.cursor = 'grab';
        measureTool.stopMeasure();
        break;
        
      case ToolbarAction.PAN:
        controls.enabled = true;
        controls.enableRotate = false;
        controls.enablePan = true;
        controls.enableZoom = false;
        domElement.style.cursor = 'move';
        measureTool.stopMeasure();
        break;
        
      case ToolbarAction.ZOOM:
        controls.enabled = true;
        controls.enableRotate = false;
        controls.enablePan = false;
        controls.enableZoom = true;
        domElement.style.cursor = 'zoom-in';
        measureTool.stopMeasure();
        break;
        
      case ToolbarAction.MEASURE:
        controls.enabled = false;
        domElement.style.cursor = 'crosshair';
        measureTool.startMeasure('distance');
        break;
        
      default:
        controls.enabled = true;
        controls.enableRotate = true;
        controls.enablePan = true;
        controls.enableZoom = true;
        domElement.style.cursor = 'default';
        measureTool.stopMeasure();
    }

    lastTool.current = activeTool;
  }, [activeTool, controls, domElement, measureTool]);

  // 鼠标事件处理
  const handleMouseDown = useCallback((event: MouseEvent) => {
    isInteracting.current = true;
    setInteracting(true);

    // 根据当前工具处理点击
    if (activeTool === ToolbarAction.MEASURE) {
      measureTool.handleClick(event);
    }
  }, [activeTool, measureTool, setInteracting]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    // 更新游标
    if (controls && isInteracting.current) {
      switch (activeTool) {
        case ToolbarAction.ORBIT:
          domElement!.style.cursor = 'grabbing';
          break;
        case ToolbarAction.PAN:
          domElement!.style.cursor = 'moving';
          break;
      }
    }

    // 测量工具的鼠标移动
    if (activeTool === ToolbarAction.MEASURE) {
      measureTool.handleMouseMove(event);
    }
  }, [activeTool, controls, domElement, measureTool]);

  const handleMouseUp = useCallback(() => {
    isInteracting.current = false;
    setInteracting(false);

    // 恢复游标
    if (domElement && controls) {
      switch (activeTool) {
        case ToolbarAction.ORBIT:
          domElement.style.cursor = 'grab';
          break;
        case ToolbarAction.PAN:
          domElement.style.cursor = 'move';
          break;
        case ToolbarAction.ZOOM:
          domElement.style.cursor = 'zoom-in';
          break;
        default:
          domElement.style.cursor = 'default';
      }
    }
  }, [activeTool, controls, domElement, setInteracting]);

  // 键盘事件处理
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Escape键退出当前工具
    if (event.key === 'Escape') {
      useViewportStore.getState().setActiveTool(ToolbarAction.ORBIT);
    }
    
    // Delete键删除选中的测量
    if (event.key === 'Delete' && activeTool === ToolbarAction.MEASURE) {
      measureTool.clearMeasurements();
    }
  }, [activeTool, measureTool]);

  // 滚轮事件处理
  const handleWheel = useCallback((event: WheelEvent) => {
    if (activeTool === ToolbarAction.ZOOM) {
      // 在ZOOM模式下，滚轮行为可以自定义
      event.preventDefault();
      
      if (camera && camera instanceof THREE.PerspectiveCamera) {
        const zoomSpeed = 0.1;
        const direction = event.deltaY > 0 ? 1 : -1;
        
        // 调整FOV实现缩放
        camera.fov = Math.max(10, Math.min(120, camera.fov + direction * zoomSpeed * 10));
        camera.updateProjectionMatrix();
      }
    }
  }, [activeTool, camera]);

  // 注册事件监听器
  useEffect(() => {
    if (!domElement) return;

    domElement.addEventListener('mousedown', handleMouseDown);
    domElement.addEventListener('mousemove', handleMouseMove);
    domElement.addEventListener('mouseup', handleMouseUp);
    domElement.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      domElement.removeEventListener('mousedown', handleMouseDown);
      domElement.removeEventListener('mousemove', handleMouseMove);
      domElement.removeEventListener('mouseup', handleMouseUp);
      domElement.removeEventListener('wheel', handleWheel);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [domElement, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, handleKeyDown]);

  // 截图功能
  const takeScreenshot = useCallback((filename?: string) => {
    if (!renderer) return null;

    // 渲染当前帧
    renderer.render(scene!, camera!);
    
    // 获取canvas数据
    const canvas = renderer.domElement;
    const dataURL = canvas.toDataURL('image/png');
    
    // 下载图片
    if (filename) {
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataURL;
      link.click();
    }
    
    return dataURL;
  }, [renderer, scene, camera]);

  // 适应视图
  const fitToView = useCallback(() => {
    if (!scene || !camera || !controls) return;

    // 计算场景边界框
    const box = new THREE.Box3();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        box.expandByObject(object);
      }
    });

    if (box.isEmpty()) {
      // 如果场景为空，设置默认视图
      camera.position.set(10, 10, 10);
      camera.lookAt(0, 0, 0);
      if (controls.target) {
        controls.target.set(0, 0, 0);
      }
      return;
    }

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    if (camera instanceof THREE.PerspectiveCamera) {
      const distance = maxDim / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      const direction = camera.position.clone().sub(center).normalize();
      camera.position.copy(center).add(direction.multiplyScalar(distance * 1.5));
    } else if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = 1 / (maxDim * 0.5);
      camera.updateProjectionMatrix();
    }

    if (controls.target) {
      controls.target.copy(center);
    }
    
    controls.update();
  }, [scene, camera, controls]);

  // 重置视图
  const resetView = useCallback(() => {
    if (!camera || !controls) return;

    // 重置到默认位置
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    
    if (controls.target) {
      controls.target.set(0, 0, 0);
    }
    
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 75;
      camera.updateProjectionMatrix();
    } else if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = 1;
      camera.updateProjectionMatrix();
    }
    
    controls.update();
  }, [camera, controls]);

  return {
    // 状态
    activeTool,
    isInteracting: isInteracting.current,
    
    // 测量工具
    measureTool,
    
    // 操作方法
    takeScreenshot,
    fitToView,
    resetView,
    
    // 事件处理器（供外部使用）
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleKeyDown,
    handleWheel
  };
}

export default useViewportInteraction;