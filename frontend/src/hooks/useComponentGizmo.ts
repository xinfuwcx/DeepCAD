import { useEffect, useState } from 'react';
import { useSceneStore } from '../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';
import { useGridSettings } from './useGridSettings';

// 定义 VTK.js 事件数据接口
interface VtkEventData {
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
 * 用于管理 3D 对象交互式操作的钩子
 */
export function useComponentGizmo() {
  const { interactor, renderWindow } = useVtkContext();
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
  
  // 直接设置特定模式的函数
  const setSpecificGizmoMode = (mode: GizmoMode) => {
    setGizmoMode(mode);
  };

  // 处理键盘快捷键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 如果用户正在输入文本，不处理快捷键
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // 按 G 键切换到平移模式
      if (event.key === 'g' || event.key === 'G') {
        setSpecificGizmoMode(GizmoMode.TRANSLATE);
      }
      // 按 R 键切换到旋转模式
      else if (event.key === 'r' || event.key === 'R') {
        setSpecificGizmoMode(GizmoMode.ROTATE);
      }
      // 按 S 键切换到缩放模式
      else if (event.key === 's' || event.key === 'S') {
        setSpecificGizmoMode(GizmoMode.SCALE);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!interactor || !renderWindow) return;
    
    // 清理事件监听器的函数
    const cleanupListeners = () => {
      isDraggingRef.current = false;
    };

    if (!selectedComponentId || !scene) return cleanupListeners;
    
    const selectedComponent = scene.components.find(c => c.id === selectedComponentId);
    if (!selectedComponent) return cleanupListeners;

    // 只处理锚杆（它们有位置和角度属性）
    if (selectedComponent.type === 'anchor_rod') {
      try {
        // 将组件转换为扩展类型，以便访问所有属性
        const anchorRod = selectedComponent as unknown as AnchorRodWithProps;
        
        // 安全地访问位置属性
        const location = anchorRod.location || { x: 0, y: 0, z: 0 };
        
        // 存储初始组件位置
        componentPosRef.current = { ...location };
        
        // 存储初始组件角度和直径
        componentAngleRef.current = anchorRod.angle || 0;
        componentDiameterRef.current = anchorRod.diameter || 0.15; // 默认直径为 0.15
        
        // 设置鼠标事件处理程序
        const onMouseMove = (callData: VtkEventData) => {
          if (!isDraggingRef.current) return;
          
          switch (gizmoMode) {
            case GizmoMode.TRANSLATE:
              // 计算位置增量
              const deltaX = callData.position.x - startPosRef.current.x;
              const deltaY = callData.position.y - startPosRef.current.y;
              
              // 缩放移动（根据需要调整这些值）
              const scaleFactor = 0.1;
              
              // 更新组件位置
              let newPosition = {
                x: componentPosRef.current.x + deltaX * scaleFactor,
                y: componentPosRef.current.y + deltaY * scaleFactor,
                z: componentPosRef.current.z, // 暂时保持 Z 位置不变
              };
              
              // 如果启用了网格吸附，则将位置吸附到网格
              if (gridSettings.snapEnabled) {
                // 确保 z 属性始终为数字
                const snappedPos = snapToGrid(newPosition);
                newPosition = {
                  x: snappedPos.x,
                  y: snappedPos.y,
                  z: snappedPos.z !== undefined ? snappedPos.z : newPosition.z,
                };
              }
              
              // 更新存储中的组件
              updateComponent(selectedComponentId, { 
                location: newPosition 
              });
              
              // 更新下一次移动的起始位置
              startPosRef.current = { x: callData.position.x, y: callData.position.y };
              break;
              
            case GizmoMode.ROTATE:
              // 计算旋转中心（组件位置）
              const center = componentPosRef.current;
              
              // 计算鼠标相对于中心的角度
              const startVector = {
                x: startPosRef.current.x - center.x,
                y: startPosRef.current.y - center.y
              };
              const currentVector = {
                x: callData.position.x - center.x,
                y: callData.position.y - center.y
              };
              
              // 计算两个向量之间的角度（弧度）
              const startAngle = Math.atan2(startVector.y, startVector.x);
              const currentAngle = Math.atan2(currentVector.y, currentVector.x);
              let angleDelta = currentAngle - startAngle;
              
              // 转换为度数并应用于组件角度
              const angleDeltaDegrees = angleDelta * (180 / Math.PI);
              
              // 计算新角度
              let newAngle = (startAngleRef.current + angleDeltaDegrees) % 360;
              
              // 如果启用了网格吸附，则将角度吸附到最近的 15 度
              if (gridSettings.snapEnabled) {
                const snapAngle = 15; // 吸附角度（度）
                newAngle = Math.round(newAngle / snapAngle) * snapAngle;
              }
              
              // 更新组件角度
              updateComponent(selectedComponentId, { 
                angle: newAngle 
              });
              
              // 更新起始位置
              startPosRef.current = { x: callData.position.x, y: callData.position.y };
              break;
              
            case GizmoMode.SCALE:
              // 计算缩放因子
              const startDist = Math.sqrt(
                Math.pow(startPosRef.current.x - componentPosRef.current.x, 2) +
                Math.pow(startPosRef.current.y - componentPosRef.current.y, 2)
              );
              
              const currentDist = Math.sqrt(
                Math.pow(callData.position.x - componentPosRef.current.x, 2) +
                Math.pow(callData.position.y - componentPosRef.current.y, 2)
              );
              
              if (startDist > 0) {
                const scaleFactor = currentDist / startDist;
                
                // 计算新直径，但限制在合理范围内
                let newDiameter = Math.max(0.05, Math.min(2.0, componentDiameterRef.current * scaleFactor));
                
                // 如果启用了网格吸附，则将直径吸附到最近的 0.05
                if (gridSettings.snapEnabled) {
                  const snapSize = 0.05; // 吸附尺寸（米）
                  newDiameter = Math.round(newDiameter / snapSize) * snapSize;
                }
                
                // 更新组件
                updateComponent(selectedComponentId, { 
                  diameter: newDiameter 
                });
                
                // 更新起始位置
                startPosRef.current = { x: callData.position.x, y: callData.position.y };
              }
              break;
          }
          
          renderWindow.render();
        };
        
        const onLeftButtonDown = (callData: VtkEventData) => {
          // 开始拖动
          isDraggingRef.current = true;
          startPosRef.current = { x: callData.position.x, y: callData.position.y };
          
          // 获取当前组件位置
          const component = scene.components.find(c => c.id === selectedComponentId);
          if (component && component.type === 'anchor_rod') {
            // 转换为扩展类型
            const rod = component as unknown as AnchorRodWithProps;
            
            if (rod.location) {
              componentPosRef.current = { ...rod.location };
            }
            
            // 存储当前角度和直径
            componentAngleRef.current = rod.angle || 0;
            startAngleRef.current = rod.angle || 0;
            componentDiameterRef.current = rod.diameter || 0.15;
          }
        };
        
        const onLeftButtonUp = () => {
          // 停止拖动
          isDraggingRef.current = false;
        };
        
        // 添加事件监听器
        const subscription1 = interactor.onMouseMove(onMouseMove);
        const subscription2 = interactor.onLeftButtonPress(onLeftButtonDown);
        const subscription3 = interactor.onLeftButtonRelease(onLeftButtonUp);
        
        // 返回清理函数
        return () => {
          subscription1.unsubscribe();
          subscription2.unsubscribe();
          subscription3.unsubscribe();
          cleanupListeners();
        };
      } catch (error) {
        console.error('设置锚杆 gizmo 时出错:', error);
        return cleanupListeners;
      }
    }
    
    return cleanupListeners;
  }, [selectedComponentId, scene, interactor, renderWindow, updateComponent, gizmoMode, gridSettings, snapToGrid]);
  
  // 返回当前模式和切换函数，以便在 UI 中使用
  return { gizmoMode, toggleGizmoMode, setGizmoMode: setSpecificGizmoMode };
} 