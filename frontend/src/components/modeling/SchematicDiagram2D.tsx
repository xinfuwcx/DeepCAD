import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer';
import { Box, useTheme } from '@mui/material';

// 组件属性
interface SchematicDiagram2DProps {
  width?: number | string;
  height?: number;
  gridSize?: number;
  backgroundColor?: string;
  children?: React.ReactNode;
  onSceneReady?: (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => void;
}

/**
 * 二维示意图组件
 * 基于Three.js和CSS3D技术实现可交互的2D示意图
 */
const SchematicDiagram2D: React.FC<SchematicDiagram2DProps> = ({
  width = '100%',
  height = 500,
  gridSize = 10,
  backgroundColor = '#f5f5f5',
  children,
  onSceneReady
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cssRendererRef = useRef<CSS3DRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const theme = useTheme();

  // 初始化场景
  useEffect(() => {
    if (!containerRef.current) return;

    // 获取容器尺寸
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = height;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      50, // FOV
      containerWidth / containerHeight, // 宽高比
      0.1, // 近裁剪面
      1000 // 远裁剪面
    );
    camera.position.set(0, 10, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 创建WebGL渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerWidth, containerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 创建CSS3D渲染器
    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(containerWidth, containerHeight);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = '0';
    cssRenderer.domElement.style.pointerEvents = 'none'; // 允许点击穿透到WebGL层
    container.appendChild(cssRenderer.domElement);
    cssRendererRef.current = cssRenderer;

    // 创建控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = false; // 禁用旋转，保持2D视角
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controlsRef.current = controls;

    // 添加网格
    const gridHelper = new THREE.GridHelper(gridSize * 2, gridSize * 2);
    gridHelper.rotation.x = Math.PI / 2; // 旋转到XY平面
    gridHelper.position.z = -0.01; // 稍微后移，避免z-fighting
    scene.add(gridHelper);

    // 添加坐标轴
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // 添加示例方向标签
    const createLabel = (text: string, position: THREE.Vector3, color: string) => {
      const labelDiv = document.createElement('div');
      labelDiv.className = 'label';
      labelDiv.textContent = text;
      labelDiv.style.color = color;
      labelDiv.style.padding = '2px 6px';
      labelDiv.style.borderRadius = '4px';
      labelDiv.style.backgroundColor = 'rgba(255,255,255,0.7)';
      labelDiv.style.fontSize = '12px';
      labelDiv.style.pointerEvents = 'none';
      
      const label = new CSS3DObject(labelDiv);
      label.position.copy(position);
      label.scale.set(0.1, 0.1, 0.1); // 缩放以适应场景
      scene.add(label);
    };

    createLabel('X', new THREE.Vector3(5.5, 0, 0), 'red');
    createLabel('Y', new THREE.Vector3(0, 5.5, 0), 'green');

    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    // 渲染循环
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      
      if (cssRendererRef.current && sceneRef.current && cameraRef.current) {
        cssRendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    
    animate();

    // 窗口大小变化时调整渲染器尺寸
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current || !cssRendererRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.width;
      const newHeight = height;
      
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      
      rendererRef.current.setSize(newWidth, newHeight);
      cssRendererRef.current.setSize(newWidth, newHeight);
    };
    
    window.addEventListener('resize', handleResize);

    // 将场景和相机传递给父组件
    if (onSceneReady && sceneRef.current && cameraRef.current) {
      onSceneReady(sceneRef.current, cameraRef.current);
    }

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      if (cssRendererRef.current && containerRef.current) {
        containerRef.current.removeChild(cssRendererRef.current.domElement);
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
    };
  }, [backgroundColor, gridSize, height, onSceneReady]);

  return (
    <Box
      ref={containerRef}
      sx={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 1,
        boxShadow: theme.shadows[1],
        '& canvas': {
          borderRadius: 1,
        },
      }}
    >
      {children}
    </Box>
  );
};

export default SchematicDiagram2D; 