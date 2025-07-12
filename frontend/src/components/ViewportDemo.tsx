/**
 * Viewport3D 演示组件
 * 展示完整的3D视口工具栏和交互功能
 */

import React, { useRef, useEffect } from 'react';
import { Card, Space, Typography, Button, Divider } from 'antd';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Toolbar, Grid3D, CoordinateSystem } from './Viewport3D';
import { useViewportStore } from '../stores/useViewportStore';
import { useViewportInteraction } from '../hooks/useViewportInteraction';
import { ToolbarAction } from '../types/viewport';

const { Title, Text } = Typography;

const ViewportDemo: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number | null>(null);

  const {
    activeTool,
    grid,
    coordinateSystem,
    viewport,
    toolbar
  } = useViewportStore();

  // 初始化Three.js场景
  useEffect(() => {
    if (!mountRef.current) return;

    // 场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(viewport.background);
    sceneRef.current = scene;

    // 相机
    const camera = new THREE.PerspectiveCamera(
      viewport.fov,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      viewport.near,
      viewport.far
    );
    camera.position.set(10, 10, 10);
    cameraRef.current = camera;

    // 渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = viewport.enableDamping;
    controls.dampingFactor = viewport.dampingFactor;
    controls.enablePan = viewport.enablePan;
    controls.enableZoom = viewport.enableZoom;
    controls.enableRotate = viewport.enableRotate;
    controlsRef.current = controls;

    // 光照
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // 添加演示对象
    const addDemoObjects = () => {
      // 地面
      const groundGeometry = new THREE.PlaneGeometry(20, 20);
      const groundMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      // 立方体
      const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
      const cubeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x0077ff,
        metalness: 0.3,
        roughness: 0.4
      });
      const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
      cube.position.set(0, 1, 0);
      cube.castShadow = true;
      cube.receiveShadow = true;
      scene.add(cube);

      // 球体
      const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
      const sphereMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff4444,
        metalness: 0.5,
        roughness: 0.2
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(-3, 1, 0);
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      scene.add(sphere);

      // 圆锥
      const coneGeometry = new THREE.ConeGeometry(1, 2, 8);
      const coneMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x44ff44,
        metalness: 0.2,
        roughness: 0.6
      });
      const cone = new THREE.Mesh(coneGeometry, coneMaterial);
      cone.position.set(3, 1, 0);
      cone.castShadow = true;
      cone.receiveShadow = true;
      scene.add(cone);
    };

    addDemoObjects();

    // 渲染循环
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 窗口大小调整
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
      
      renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      renderer.dispose();
      controls.dispose();
    };
  }, [viewport]);

  // 视口交互管理
  const interaction = useViewportInteraction({
    scene: sceneRef.current!,
    camera: cameraRef.current!,
    renderer: rendererRef.current!,
    domElement: rendererRef.current?.domElement,
    controls: controlsRef.current!
  });

  // 工具栏动作处理
  const handleToolbarAction = (action: ToolbarAction) => {
    const store = useViewportStore.getState();
    
    switch (action) {
      case ToolbarAction.FIT:
        interaction.fitToView();
        break;
      case ToolbarAction.RESET:
        interaction.resetView();
        break;
      case ToolbarAction.SCREENSHOT:
        interaction.takeScreenshot(`viewport-${Date.now()}.png`);
        break;
      default:
        store.setActiveTool(action);
    }
  };

  // 坐标轴点击处理
  const handleAxisClick = (axis: 'x' | 'y' | 'z' | '-x' | '-y' | '-z') => {
    if (!cameraRef.current || !controlsRef.current) return;

    const distance = 15;
    const positions = {
      'x': new THREE.Vector3(distance, 0, 0),
      '-x': new THREE.Vector3(-distance, 0, 0),
      'y': new THREE.Vector3(0, distance, 0),
      '-y': new THREE.Vector3(0, -distance, 0),
      'z': new THREE.Vector3(0, 0, distance),
      '-z': new THREE.Vector3(0, 0, -distance)
    };

    const newPosition = positions[axis];
    cameraRef.current.position.copy(newPosition);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  return (
    <div style={{ height: '100vh', padding: '16px', background: '#f5f5f5' }}>
      <Title level={2}>Viewport3D 工具栏演示</Title>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 状态显示 */}
        <Card title="当前状态" size="small">
          <Space wrap>
            <Text>活跃工具: <strong>{activeTool}</strong></Text>
            <Divider type="vertical" />
            <Text>网格: <strong>{grid.visible ? '显示' : '隐藏'}</strong></Text>
            <Divider type="vertical" />
            <Text>坐标系: <strong>{coordinateSystem.visible ? '显示' : '隐藏'}</strong></Text>
            <Divider type="vertical" />
            <Text>渲染模式: <strong>{viewport.renderMode}</strong></Text>
          </Space>
        </Card>

        {/* 3D视口 */}
        <Card 
          title="3D视口" 
          style={{ height: '600px' }}
          bodyStyle={{ padding: 0, height: '100%', position: 'relative' }}
        >
          <div 
            ref={mountRef} 
            style={{ 
              width: '100%', 
              height: '100%', 
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* 3D网格 */}
            <Grid3D scene={sceneRef.current!} />
            
            {/* 工具栏 */}
            <Toolbar onAction={handleToolbarAction} />
            
            {/* 坐标系 */}
            <CoordinateSystem 
              camera={cameraRef.current!} 
              onAxisClick={handleAxisClick} 
            />
          </div>
        </Card>

        {/* 快捷键说明 */}
        <Card title="快捷键说明" size="small">
          <Space wrap>
            <Text><kbd>S</kbd> 选择</Text>
            <Text><kbd>O</kbd> 旋转</Text>
            <Text><kbd>P</kbd> 平移</Text>
            <Text><kbd>Z</kbd> 缩放</Text>
            <Text><kbd>F</kbd> 适应</Text>
            <Text><kbd>R</kbd> 重置</Text>
            <Text><kbd>M</kbd> 测量</Text>
            <Text><kbd>G</kbd> 网格</Text>
            <Text><kbd>W</kbd> 线框</Text>
            <Text><kbd>Esc</kbd> 取消</Text>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default ViewportDemo;