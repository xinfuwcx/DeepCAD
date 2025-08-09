/**
 * 视口坐标轴组件 - 固定在左下角，跟随主相机旋转
 */
import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

interface ViewportAxesProps {
  camera?: THREE.PerspectiveCamera;
  size?: number;
  position?: 'fixed' | 'absolute';
  offset?: { left?: number; bottom?: number; right?: number; top?: number };
  zIndex?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const ViewportAxes: React.FC<ViewportAxesProps> = ({ 
  camera, 
  size = 120,
  position = 'absolute',
  offset = { left: 20, bottom: 20 },
  zIndex = 999,
  className,
  style
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const axesCameraRef = useRef<THREE.PerspectiveCamera>();
  const frameIdRef = useRef<number>();

  const createAxes = useCallback((): THREE.Group => {
    console.log('ViewportAxes: Creating axes geometry...');
    const group = new THREE.Group();
    
    const axisLength = 1.5;
    const arrowLength = 0.3;
    const arrowRadius = 0.1;
    const axisRadius = 0.03;

    // X轴 - 红色
    const xAxisGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
    const xAxisMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const xAxis = new THREE.Mesh(xAxisGeometry, xAxisMaterial);
    xAxis.rotation.z = -Math.PI / 2;
    xAxis.position.x = axisLength / 2;
    group.add(xAxis);

    // X轴箭头
    const xArrowGeometry = new THREE.ConeGeometry(arrowRadius, arrowLength, 8);
    const xArrow = new THREE.Mesh(xArrowGeometry, xAxisMaterial);
    xArrow.rotation.z = -Math.PI / 2;
    xArrow.position.x = axisLength + arrowLength / 2;
    group.add(xArrow);

    // Y轴 - 绿色
    const yAxisGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
    const yAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const yAxis = new THREE.Mesh(yAxisGeometry, yAxisMaterial);
    yAxis.position.y = axisLength / 2;
    group.add(yAxis);

    // Y轴箭头
    const yArrowGeometry = new THREE.ConeGeometry(arrowRadius, arrowLength, 8);
    const yArrow = new THREE.Mesh(yArrowGeometry, yAxisMaterial);
    yArrow.position.y = axisLength + arrowLength / 2;
    group.add(yArrow);

    // Z轴 - 蓝色
    const zAxisGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
    const zAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const zAxis = new THREE.Mesh(zAxisGeometry, zAxisMaterial);
    zAxis.rotation.x = Math.PI / 2;
    zAxis.position.z = axisLength / 2;
    group.add(zAxis);

    // Z轴箭头
    const zArrowGeometry = new THREE.ConeGeometry(arrowRadius, arrowLength, 8);
    const zArrow = new THREE.Mesh(zArrowGeometry, zAxisMaterial);
    zArrow.rotation.x = Math.PI / 2;
    zArrow.position.z = axisLength + arrowLength / 2;
    group.add(zArrow);

    console.log('ViewportAxes: Axes group created with', group.children.length, 'children');
    return group;
  }, []);

  useEffect(() => {
    console.log('ViewportAxes: useEffect triggered, camera:', !!camera, 'mount:', !!mountRef.current);
    
    if (!mountRef.current) {
      console.log('ViewportAxes: mountRef not ready');
      return;
    }

    if (!camera) {
      console.log('ViewportAxes: camera not provided');
      return;
    }

    console.log('ViewportAxes: Initializing...');

    // 创建独立场景
    const scene = new THREE.Scene();
    scene.background = null; // 透明背景
    sceneRef.current = scene;

    // 创建独立相机
    const axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    axesCamera.position.set(0, 0, 4);
    axesCameraRef.current = axesCamera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      premultipliedAlpha: false
    });
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = false;
    rendererRef.current = renderer;

    try {
      mountRef.current.appendChild(renderer.domElement);
      console.log('ViewportAxes: Renderer added to DOM, canvas size:', renderer.domElement.width, 'x', renderer.domElement.height);
    } catch (error) {
      console.error('ViewportAxes: Failed to add renderer to DOM:', error);
      return;
    }

    // 创建坐标轴
    const axesGroup = createAxes();
    scene.add(axesGroup);
    console.log('ViewportAxes: Axes added to scene, children count:', scene.children.length);

    // 添加光照
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    console.log('ViewportAxes: Lights added, total children:', scene.children.length);

    // 手动渲染一次测试
    renderer.render(scene, axesCamera);
    console.log('ViewportAxes: Initial render complete');

    // 渲染循环
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);

      // 同步相机旋转
      if (camera && axesCamera) {
        axesCamera.quaternion.copy(camera.quaternion);
        axesCamera.updateMatrixWorld();
      }

      renderer.render(scene, axesCamera);
    };

    console.log('ViewportAxes: Starting animation loop');
    animate();

    return () => {
      console.log('ViewportAxes: Cleaning up...');
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      renderer.dispose();
      if (mountRef.current && renderer.domElement && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [camera, size, createAxes]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{
        position,
        bottom: offset.bottom ?? undefined,
        left: offset.left ?? undefined,
        right: offset.right ?? undefined,
        top: offset.top ?? undefined,
        width: `${size}px`,
        height: `${size}px`,
        zIndex,
        pointerEvents: 'none',
        border: '2px solid rgba(255,255,255,0.35)',
        borderRadius: '8px',
        backgroundColor: 'rgba(0,0,0,0.2)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        display: 'block', // 确保显示
        ...style,
      }}
    />
  );
};

export default ViewportAxes;