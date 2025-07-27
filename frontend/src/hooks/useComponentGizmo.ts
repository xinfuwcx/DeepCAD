import React, { useEffect, useState, useRef } from 'react';
import { useSceneStore } from '../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';
import { useGridSettings } from './useGridSettings';
import * as THREE from 'three';

// 定义 Three.js 事件数据接口
interface ThreeEventData {
  position: {
    x: number;
    y: number;
    z?: number;
  };
  [key: string]: any;
}

// Gizmo 模式枚举
export enum GizmoMode {
  TRANSLATE = 'translate',
  ROTATE = 'rotate',
  SCALE = 'scale',
}

// 扩展的锚杆类型，包含我们需要的所有属性
interface AnchorRodWithProps {
  id: string;
  type: 'anchor_rod';
  location: { x: number; y: number; z: number };
  angle: number;
  diameter: number;
  [key: string]: any;
}

/**
 * 用于管理 3D 对象交互式操作的钩子（基于Three.js）
 */
export function useComponentGizmo() {
  const { selectedComponentId, updateComponent, scene } = useSceneStore(
    useShallow(state => ({
      selectedComponentId: state.selectedComponentId,
      updateComponent: state.updateComponent,
      scene: state.scene,
    }))
  );
  
  // 获取网格设置，用于吸附功能
  const { gridSettings, snapToGrid } = useGridSettings();
  
  // 当前 Gizmo 模式
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>(GizmoMode.TRANSLATE);
  
  // 用于跟踪拖动状态的引用
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const componentPosRef = useRef({ x: 0, y: 0, z: 0 });
  const componentAngleRef = useRef(0); // 存储组件的角度
  const startAngleRef = useRef(0); // 存储开始拖动时的角度
  const componentDiameterRef = useRef(0); // 存储组件的直径

  // 切换 Gizmo 模式的函数
  const toggleGizmoMode = () => {
    setGizmoMode(prevMode => {
      switch (prevMode) {
        case GizmoMode.TRANSLATE:
          return GizmoMode.ROTATE;
        case GizmoMode.ROTATE:
          return GizmoMode.SCALE;
        case GizmoMode.SCALE:
          return GizmoMode.TRANSLATE;
        default:
          return GizmoMode.TRANSLATE;
      }
    });
  };

  // 获取当前选中的组件
  const getSelectedComponent = (): AnchorRodWithProps | null => {
    if (!selectedComponentId || !scene?.components) return null;
    
    const component = scene.components.find(c => c.id === selectedComponentId);
    return component && component.type === 'anchor_rod' ? component as AnchorRodWithProps : null;
  };

  // 处理鼠标按下事件
  const handleMouseDown = (event: MouseEvent) => {
    const selectedComponent = getSelectedComponent();
    if (!selectedComponent) return;

    isDraggingRef.current = true;
    startPosRef.current = { x: event.clientX, y: event.clientY };
    componentPosRef.current = { ...selectedComponent.location };
    componentAngleRef.current = selectedComponent.angle || 0;
    componentDiameterRef.current = selectedComponent.diameter || 1;
    startAngleRef.current = componentAngleRef.current;
  };

  // 处理鼠标移动事件
  const handleMouseMove = (event: MouseEvent) => {
    if (!isDraggingRef.current) return;

    const selectedComponent = getSelectedComponent();
    if (!selectedComponent) return;

    const deltaX = event.clientX - startPosRef.current.x;
    const deltaY = event.clientY - startPosRef.current.y;

    let updates: Partial<AnchorRodWithProps> = {};

    switch (gizmoMode) {
      case GizmoMode.TRANSLATE: {
        // 平移模式
        const scale = 0.01; // 缩放因子，可以根据需要调整
        let newX = componentPosRef.current.x + deltaX * scale;
        let newY = componentPosRef.current.y - deltaY * scale; // 注意Y轴方向

        // 应用网格吸附
        if (gridSettings?.enabled && snapToGrid) {
          newX = snapToGrid({ x: newX, y: newY }).x;
          newY = snapToGrid({ x: newX, y: newY }).y;
        }

        updates.location = {
          x: newX,
          y: newY,
          z: componentPosRef.current.z,
        };
        break;
      }

      case GizmoMode.ROTATE: {
        // 旋转模式
        const rotationScale = 0.01;
        const newAngle = startAngleRef.current + deltaX * rotationScale;
        updates.angle = newAngle;
        break;
      }

      case GizmoMode.SCALE: {
        // 缩放模式（调整直径）
        const scaleMultiplier = 0.001;
        const newDiameter = Math.max(0.1, componentDiameterRef.current + deltaY * scaleMultiplier);
        updates.diameter = newDiameter;
        break;
      }
    }

    // 更新组件
    if (Object.keys(updates).length > 0) {
      updateComponent(selectedComponent.id, updates);
    }
  };

  // 处理鼠标抬起事件
  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // 注册和取消注册事件监听器
  useEffect(() => {
    const canvas = document.querySelector('canvas'); // 假设Three.js渲染在canvas上
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [gizmoMode, selectedComponentId, gridSettings]);

  return {
    gizmoMode,
    setGizmoMode,
    toggleGizmoMode,
    isDragging: isDraggingRef.current,
  };
}