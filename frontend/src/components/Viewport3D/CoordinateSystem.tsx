/**
 * 3D坐标系组件
 * 在视口角落显示XYZ坐标轴，支持点击切换视角
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useViewportStore } from '../../stores/useViewportStore';
import './CoordinateSystem.css';

interface CoordinateSystemProps {
  camera?: THREE.Camera;
  onAxisClick?: (axis: 'x' | 'y' | 'z' | '-x' | '-y' | '-z') => void;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const CoordinateSystem: React.FC<CoordinateSystemProps> = ({
  camera,
  onAxisClick,
  size = 100,
  className,
  style
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const axesGroupRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  
  const [hoveredAxis, setHoveredAxis] = useState<string | null>(null);
  const { coordinateSystem } = useViewportStore();

  // 初始化渲染器和场景
  useEffect(() => {
    if (!canvasRef.current || !coordinateSystem.visible) return;

    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      alpha: true, 
      antialias: true 
    });
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0); // 透明背景
    rendererRef.current = renderer;

    // 创建场景
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 创建正交相机
    const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 10);
    camera.position.set(3, 3, 3);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 创建坐标轴
    const axesGroup = createAxesGroup();
    scene.add(axesGroup);
    axesGroupRef.current = axesGroup;

    return () => {
      renderer.dispose();
      // 清理几何体和材质
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });
    };
  }, [size, coordinateSystem.visible]);

  // 创建坐标轴组
  const createAxesGroup = useCallback(() => {
    const group = new THREE.Group();

    // 箭头几何体
    const arrowLength = 1.5;
    const arrowHeadLength = 0.3;
    const arrowHeadRadius = 0.1;
    const arrowBodyRadius = 0.05;

    // 创建箭头
    const createArrow = (color: number, direction: THREE.Vector3, name: string) => {
      const arrowGroup = new THREE.Group();
      arrowGroup.name = name;

      // 箭头主体（圆柱）
      const bodyGeometry = new THREE.CylinderGeometry(
        arrowBodyRadius, 
        arrowBodyRadius, 
        arrowLength - arrowHeadLength
      );
      const bodyMaterial = new THREE.MeshBasicMaterial({ color });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.copy(direction.clone().multiplyScalar((arrowLength - arrowHeadLength) / 2));
      body.lookAt(direction.clone().multiplyScalar(arrowLength));
      body.rotateX(Math.PI / 2);
      arrowGroup.add(body);

      // 箭头头部（圆锥）
      const headGeometry = new THREE.ConeGeometry(arrowHeadRadius, arrowHeadLength);
      const headMaterial = new THREE.MeshBasicMaterial({ color });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.copy(direction.clone().multiplyScalar(arrowLength - arrowHeadLength / 2));
      head.lookAt(direction.clone().multiplyScalar(arrowLength));
      head.rotateX(Math.PI / 2);
      arrowGroup.add(head);

      // 添加用户数据
      arrowGroup.userData = { axis: name, direction: direction.clone() };

      return arrowGroup;
    };

    // X轴（红色）
    const xAxis = createArrow(0xff4444, new THREE.Vector3(1, 0, 0), 'x');
    group.add(xAxis);

    // Y轴（绿色）
    const yAxis = createArrow(0x44ff44, new THREE.Vector3(0, 1, 0), 'y');
    group.add(yAxis);

    // Z轴（蓝色）
    const zAxis = createArrow(0x4444ff, new THREE.Vector3(0, 0, 1), 'z');
    group.add(zAxis);

    // 添加标签（可选）
    if (coordinateSystem.labels) {
      // 注意：FontLoader需要从 three/examples/jsm/loaders/FontLoader 导入
      // 为简化，暂时省略文字标签功能
    }

    return group;
  }, [coordinateSystem.labels]);

  // 更新坐标轴方向（跟随主相机）
  useEffect(() => {
    if (!camera || !cameraRef.current || !axesGroupRef.current) return;

    const updateAxesOrientation = () => {
      if (cameraRef.current && camera) {
        // 获取主相机的方向
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        
        // 更新坐标轴相机的位置，使其始终面向相同方向
        const distance = 4;
        cameraRef.current.position.copy(cameraDirection.clone().multiplyScalar(distance));
        cameraRef.current.lookAt(0, 0, 0);
      }
    };

    updateAxesOrientation();

    // 如果有动画循环，可以在这里添加更新逻辑
    const interval = setInterval(updateAxesOrientation, 100);
    
    return () => clearInterval(interval);
  }, [camera]);

  // 渲染循环
  useEffect(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    const animate = () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  // 鼠标事件处理
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!canvasRef.current || !cameraRef.current || !sceneRef.current || !axesGroupRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const mouse = new THREE.Vector2(x, y);
    raycasterRef.current.setFromCamera(mouse, cameraRef.current);

    const intersects = raycasterRef.current.intersectObjects(axesGroupRef.current.children, true);
    
    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      const axis = intersectedObject.parent?.userData?.axis;
      setHoveredAxis(axis || null);
      canvas.style.cursor = 'pointer';
    } else {
      setHoveredAxis(null);
      canvas.style.cursor = 'default';
    }
  }, []);

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (!canvasRef.current || !cameraRef.current || !sceneRef.current || !axesGroupRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const mouse = new THREE.Vector2(x, y);
    raycasterRef.current.setFromCamera(mouse, cameraRef.current);

    const intersects = raycasterRef.current.intersectObjects(axesGroupRef.current.children, true);
    
    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      const axisData = intersectedObject.parent?.userData;
      
      if (axisData && onAxisClick) {
        const axis = axisData.axis as 'x' | 'y' | 'z';
        
        // 检查是否按住了修饰键来获取负方向
        const isNegative = event.shiftKey || event.ctrlKey;
        const finalAxis = isNegative ? `-${axis}` as '-x' | '-y' | '-z' : axis;
        
        onAxisClick(finalAxis);
      }
    }
  }, [onAxisClick]);

  // 获取位置样式
  const getPositionStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'absolute',
      zIndex: 50,
      pointerEvents: 'auto'
    };

    switch (coordinateSystem.position) {
      case 'bottom-right':
        return { ...baseStyles, bottom: '16px', right: '16px' };
      case 'bottom-left':
        return { ...baseStyles, bottom: '16px', left: '16px' };
      case 'top-right':
        return { ...baseStyles, top: '16px', right: '16px' };
      case 'top-left':
        return { ...baseStyles, top: '16px', left: '16px' };
      default:
        return { ...baseStyles, bottom: '16px', right: '16px' };
    }
  };

  if (!coordinateSystem.visible) {
    return null;
  }

  return (
    <div 
      className={`coordinate-system ${className || ''}`}
      style={{
        ...getPositionStyles(),
        ...style
      }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        className="coordinate-system-canvas"
        title="点击轴线切换视角，按住Shift点击查看负方向"
      />
      
      {/* 轴标签 */}
      {coordinateSystem.labels && (
        <div className="coordinate-system-labels">
          <div className={`axis-label x-label ${hoveredAxis === 'x' ? 'hovered' : ''}`}>X</div>
          <div className={`axis-label y-label ${hoveredAxis === 'y' ? 'hovered' : ''}`}>Y</div>
          <div className={`axis-label z-label ${hoveredAxis === 'z' ? 'hovered' : ''}`}>Z</div>
        </div>
      )}
    </div>
  );
};

export default CoordinateSystem;