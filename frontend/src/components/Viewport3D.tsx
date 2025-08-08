import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Button, Result, Typography } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { ProfessionalMaterials } from './3d/materials/ProfessionalMaterials';
import { PostProcessingEffects } from './3d/effects/PostProcessingEffects';

const { Text } = Typography;

// 创建渐变背景纹理
const createGradientBackground = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;
  
  // 创建径向渐变
  const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(0.5, '#16213e');
  gradient.addColorStop(1, '#0f0f23');
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
};

// 设置专业级光照系统
const setupProfessionalLighting = (scene: THREE.Scene) => {
  // 环境光 - 模拟天空光照
  const ambientLight = new THREE.AmbientLight(0x4a5568, 0.3);
  scene.add(ambientLight);

  // 主光源 - 模拟太阳光
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
  mainLight.position.set(15, 20, 10);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 4096;
  mainLight.shadow.mapSize.height = 4096;
  mainLight.shadow.camera.near = 0.1;
  mainLight.shadow.camera.far = 100;
  mainLight.shadow.camera.left = -30;
  mainLight.shadow.camera.right = 30;
  mainLight.shadow.camera.top = 30;
  mainLight.shadow.camera.bottom = -30;
  mainLight.shadow.bias = -0.0005;
  scene.add(mainLight);

  // 填充光 - 减少阴影过重
  const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.4);
  fillLight.position.set(-10, 5, -10);
  scene.add(fillLight);

  // 半球光 - 模拟天空和地面反射
  const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x2d3748, 0.6);
  scene.add(hemisphereLight);

  // 点光源 - 增加局部亮点
  const pointLight = new THREE.PointLight(0x00d9ff, 0.8, 50);
  pointLight.position.set(5, 10, 5);
  scene.add(pointLight);
};

// 创建现代化网格系统
const createModernGrid = () => {
  const group = new THREE.Group();
  
  // 主网格
  const mainGrid = new THREE.GridHelper(50, 50, 0x4a5568, 0x2d3748);
  mainGrid.material.opacity = 0.3;
  mainGrid.material.transparent = true;
  group.add(mainGrid);
  
  // 子网格
  const subGrid = new THREE.GridHelper(50, 250, 0x2d3748, 0x1a202c);
  subGrid.material.opacity = 0.15;
  subGrid.material.transparent = true;
  group.add(subGrid);
  
  // 中心线强调
  const centerLineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-25, 0, 0),
    new THREE.Vector3(25, 0, 0)
  ]);
  const centerLineMaterial = new THREE.LineBasicMaterial({ 
    color: 0x00d9ff, 
    opacity: 0.6, 
    transparent: true 
  });
  const centerLineX = new THREE.Line(centerLineGeometry, centerLineMaterial);
  group.add(centerLineX);
  
  const centerLineZ = centerLineX.clone();
  centerLineZ.rotation.y = Math.PI / 2;
  group.add(centerLineZ);
  
  return group;
};

// 创建现代化坐标轴系统
const createModernAxes = () => {
  const group = new THREE.Group();
  
  const axisLength = 8;
  const arrowLength = 1;
  const arrowWidth = 0.3;
  
  // X轴 - 红色
  const xGeometry = new THREE.CylinderGeometry(0.05, 0.05, axisLength, 8);
  const xMaterial = new THREE.MeshPhongMaterial({ color: 0xff4757 });
  const xAxis = new THREE.Mesh(xGeometry, xMaterial);
  xAxis.rotation.z = -Math.PI / 2;
  xAxis.position.x = axisLength / 2;
  group.add(xAxis);
  
  // X轴箭头
  const xArrowGeometry = new THREE.ConeGeometry(arrowWidth, arrowLength, 8);
  const xArrow = new THREE.Mesh(xArrowGeometry, xMaterial);
  xArrow.rotation.z = -Math.PI / 2;
  xArrow.position.x = axisLength + arrowLength / 2;
  group.add(xArrow);
  
  // Y轴 - 绿色
  const yGeometry = new THREE.CylinderGeometry(0.05, 0.05, axisLength, 8);
  const yMaterial = new THREE.MeshPhongMaterial({ color: 0x2ed573 });
  const yAxis = new THREE.Mesh(yGeometry, yMaterial);
  yAxis.position.y = axisLength / 2;
  group.add(yAxis);
  
  // Y轴箭头
  const yArrowGeometry = new THREE.ConeGeometry(arrowWidth, arrowLength, 8);
  const yArrow = new THREE.Mesh(yArrowGeometry, yMaterial);
  yArrow.position.y = axisLength + arrowLength / 2;
  group.add(yArrow);
  
  // Z轴 - 蓝色
  const zGeometry = new THREE.CylinderGeometry(0.05, 0.05, axisLength, 8);
  const zMaterial = new THREE.MeshPhongMaterial({ color: 0x3742fa });
  const zAxis = new THREE.Mesh(zGeometry, zMaterial);
  zAxis.rotation.x = Math.PI / 2;
  zAxis.position.z = axisLength / 2;
  group.add(zAxis);
  
  // Z轴箭头
  const zArrowGeometry = new THREE.ConeGeometry(arrowWidth, arrowLength, 8);
  const zArrow = new THREE.Mesh(zArrowGeometry, zMaterial);
  zArrow.rotation.x = Math.PI / 2;
  zArrow.position.z = axisLength + arrowLength / 2;
  group.add(zArrow);
  
  return group;
};

// 创建现代化展示对象
const createShowcaseObject = () => {
  const group = new THREE.Group();
  
  // 主要几何体 - 使用玻璃材质
  const geometry = new THREE.IcosahedronGeometry(1.5, 1);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x00d9ff,
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.9,
    transparent: true,
    opacity: 0.8,
    ior: 1.5,
    thickness: 0.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
  });
  
  const mainObject = new THREE.Mesh(geometry, material);
  mainObject.position.set(0, 2, 0);
  mainObject.castShadow = true;
  mainObject.receiveShadow = true;
  group.add(mainObject);
  
  // 装饰环
  const ringGeometry = new THREE.TorusGeometry(2.5, 0.1, 8, 32);
  const ringMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xff6b6b, 
    emissive: 0x331111,
    transparent: true,
    opacity: 0.7
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.name = 'ring';
  ring.position.set(0, 2, 0);
  ring.rotation.x = Math.PI / 3;
  group.add(ring);
  
  group.name = 'showcase';
  
  return group;
};

// 创建现代化地面系统
const createModernGround = () => {
  const group = new THREE.Group();
  
  // 主地面
  const groundGeometry = new THREE.PlaneGeometry(100, 100);
  const groundMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1a202c,
    metalness: 0.1,
    roughness: 0.8,
    transparent: true,
    opacity: 0.3
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  
  // 反射平面
  const reflectionGeometry = new THREE.PlaneGeometry(20, 20);
  const reflectionMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x2d3748,
    metalness: 0.9,
    roughness: 0.1,
    transparent: true,
    opacity: 0.5
  });
  const reflection = new THREE.Mesh(reflectionGeometry, reflectionMaterial);
  reflection.rotation.x = -Math.PI / 2;
  reflection.position.y = 0.01;
  reflection.receiveShadow = true;
  group.add(reflection);
  
  return group;
};

interface ViewPort3DProps {
  title?: string;
  description?: string;
  mode?: 'advanced' | 'geometry' | 'mesh' | 'results' | 'data' | 'settings' | 'analysis';
  className?: string;
  onAction?: (action: string) => void;
}

const ViewPort3D: React.FC<ViewPort3DProps> = ({ 
  title = "3D VIEWPORT",
  description = "Advanced 3D visualization and interaction",
  mode = 'advanced',
  className,
  onAction
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 预览对象引用
  const previewObjectsRef = useRef<{
    geology: THREE.Group | null;
    excavation: THREE.Group | null;
    support: THREE.Group | null;
  }>({
    geology: null,
    excavation: null,
    support: null
  });
  
  // 专业材质系统
  const materialsRef = useRef<ProfessionalMaterials>(ProfessionalMaterials.getInstance());
  
  // 后处理效果系统
  const postProcessingRef = useRef<PostProcessingEffects | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    try {
      console.log('ViewPort3D: Initializing 3D scene');
      
      const container = mountRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // 创建场景 - 现代化设计
      const scene = new THREE.Scene();
      // 创建渐变背景
      const bgTexture = createGradientBackground();
      scene.background = bgTexture;
      scene.fog = new THREE.FogExp2(0x0d1b2a, 0.008); // 指数雾效更自然
      sceneRef.current = scene;

      // 创建相机
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.set(10, 8, 10);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // 创建现代化渲染器
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        powerPreference: 'high-performance',
        precision: 'highp',
        logarithmicDepthBuffer: true
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      // 现代化渲染设置
      renderer.useLegacyLights = false; // 使用物理正确的光照
      renderer.autoClear = false;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 创建控制器
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.screenSpacePanning = false;
      controls.minDistance = 1;
      controls.maxDistance = 100;
      controlsRef.current = controls;

      // 专业级光照系统
      setupProfessionalLighting(scene);

      // 现代化网格系统
      const modernGrid = createModernGrid();
      scene.add(modernGrid);

      // 现代化坐标轴系统
      const modernAxes = createModernAxes();
      scene.add(modernAxes);

      // 添加现代化展示对象
      const showcaseObject = createShowcaseObject();
      scene.add(showcaseObject);

      // 现代化地面系统
      const modernGround = createModernGround();
      scene.add(modernGround);

      // 初始化后处理效果
      postProcessingRef.current = new PostProcessingEffects(renderer, scene, camera);
      postProcessingRef.current.init();
      postProcessingRef.current.addEnvironmentReflection();

      // 根据模式添加不同的对象
      if (mode === 'geometry') {
        // 几何建模模式 - 添加基础形状
        const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
        const cubeMaterial = new THREE.MeshPhongMaterial({ 
          color: 0x00d9ff, 
          shininess: 100,
          transparent: true,
          opacity: 0.8
        });
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.position.set(0, 1, 0);
        cube.castShadow = true;
        cube.receiveShadow = true;
        scene.add(cube);

        const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
        const sphereMaterial = new THREE.MeshPhongMaterial({ 
          color: 0xff6b6b,
          shininess: 100,
          transparent: true,
          opacity: 0.8
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(4, 1, 0);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        scene.add(sphere);
      } else if (mode === 'mesh') {
        // 网格模式 - 添加网格化的几何体
        const torusGeometry = new THREE.TorusGeometry(2, 0.5, 16, 32);
        const torusMaterial = new THREE.MeshPhongMaterial({ 
          color: 0x52c41a,
          wireframe: true,
          transparent: true,
          opacity: 0.8
        });
        const torus = new THREE.Mesh(torusGeometry, torusMaterial);
        torus.position.set(0, 2, 0);
        scene.add(torus);
      } else if (mode === 'analysis') {
        // 分析模式 - 添加彩色网格表示结果
        const planeGeometry = new THREE.PlaneGeometry(8, 8, 32, 32);
        const planeMaterial = new THREE.MeshPhongMaterial({ 
          color: 0xff7875,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide
        });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 4;
        plane.position.set(0, 2, 0);
        scene.add(plane);

        // 添加应力点
        const pointsGeometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        
        for (let i = 0; i < 100; i++) {
          positions.push(
            (Math.random() - 0.5) * 10,
            Math.random() * 5,
            (Math.random() - 0.5) * 10
          );
          colors.push(Math.random(), Math.random() * 0.5, 0.2);
        }
        
        pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        pointsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const pointsMaterial = new THREE.PointsMaterial({ 
          size: 0.1,
          vertexColors: true,
          transparent: true,
          opacity: 0.8
        });
        const points = new THREE.Points(pointsGeometry, pointsMaterial);
        scene.add(points);
      } else {
        // 默认模式 - 添加基本对象
        const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
        const cubeMaterial = new THREE.MeshPhongMaterial({ 
          color: 0x0077ff,
          shininess: 100
        });
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.position.set(0, 1, 0);
        cube.castShadow = true;
        cube.receiveShadow = true;
        scene.add(cube);
      }

      // 创建现代化ViewCube
      const createViewCube = () => {
        const cubeContainer = document.createElement('div');
        cubeContainer.className = 'view-cube';
        cubeContainer.style.position = 'absolute';
        cubeContainer.style.top = '60px';
        cubeContainer.style.right = '20px';
        cubeContainer.style.width = '90px';
        cubeContainer.style.height = '90px';
        cubeContainer.style.zIndex = '1000';
        cubeContainer.style.pointerEvents = 'auto';
        cubeContainer.style.cursor = 'pointer';
        cubeContainer.style.display = 'flex';
        cubeContainer.style.alignItems = 'center';
        cubeContainer.style.justifyContent = 'center';
        cubeContainer.style.fontSize = '11px';
        cubeContainer.innerHTML = `
          <div style="text-align: center; line-height: 1.2;">
            <div style="font-size: 14px; margin-bottom: 2px;">⚡</div>
            <div>VIEW</div>
          </div>
        `;
        
        cubeContainer.addEventListener('click', () => {
          camera.position.set(10, 8, 10);
          camera.lookAt(0, 0, 0);
          controls.update();
        });
        
        container.appendChild(cubeContainer);
        return cubeContainer;
      };

      const viewCube = createViewCube();

      // 窗口大小调整
      const handleResize = () => {
        if (!mountRef.current || !camera || !renderer) return;
        
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };

      window.addEventListener('resize', handleResize);

      // 地质建模预览更新事件监听器
      const handleGeologyPreviewUpdate = (event: CustomEvent) => {
        const params = event.detail;
        console.log('更新地质建模预览:', params);
        
        // 移除旧的地质预览对象
        if (previewObjectsRef.current.geology) {
          scene.remove(previewObjectsRef.current.geology);
        }
        
        // 创建新的地质预览对象
        const geologyGroup = new THREE.Group();
        
        // 基于参数创建简单的地质层结构
        for (let i = 0; i < params.boreholeCount; i++) {
          const x = (Math.random() - 0.5) * params.domain.xExtend * 0.8;
          const z = (Math.random() - 0.5) * params.domain.yExtend * 0.8;
          
          // 钻孔柱体 - 使用专业材质
          const boreholeGeometry = new THREE.CylinderGeometry(0.2, 0.2, params.domain.depth);
          const boreholeMaterial = materialsRef.current.getMaterial('geology_borehole');
          if (boreholeMaterial && 'opacity' in boreholeMaterial) {
            (boreholeMaterial as any).opacity = params.visualization.opacity;
          }
          const borehole = new THREE.Mesh(boreholeGeometry, boreholeMaterial);
          borehole.position.set(x, -params.domain.depth / 2, z);
          
          if (params.visualization.showBoreholes) {
            geologyGroup.add(borehole);
          }
        }
        
        // 地质层
        if (params.visualization.showLayers) {
          const layerGeometry = new THREE.BoxGeometry(
            params.domain.xExtend, 
            params.domain.depth / 5, 
            params.domain.yExtend
          );
          
          for (let i = 0; i < 5; i++) {
            const layerMaterial = materialsRef.current.getMaterial('geology_layer');
            if (layerMaterial && 'opacity' in layerMaterial) {
              (layerMaterial as any).opacity = params.visualization.opacity * 0.3;
              (layerMaterial as any).color.setHSL(0.1 + i * 0.1, 0.7, 0.5);
            }
            const layer = new THREE.Mesh(layerGeometry, layerMaterial);
            layer.position.set(0, -i * params.domain.depth / 5 - params.domain.depth / 10, 0);
            geologyGroup.add(layer);
          }
        }
        
        previewObjectsRef.current.geology = geologyGroup;
        scene.add(geologyGroup);
      };

      // 开挖设计预览更新事件监听器
      const handleExcavationPreviewUpdate = (event: CustomEvent) => {
        const params = event.detail;
        console.log('更新开挖设计预览:', params);
        
        // 移除旧的开挖预览对象
        if (previewObjectsRef.current.excavation) {
          scene.remove(previewObjectsRef.current.excavation);
        }
        
        // 创建新的开挖预览对象
        const excavationGroup = new THREE.Group();
        
        // 开挖体积 - 使用专业材质
        const excavationGeometry = new THREE.BoxGeometry(
          params.geometry.width,
          params.geometry.depth,
          params.geometry.length
        );
        const excavationMaterial = materialsRef.current.getMaterial('excavation_volume');
        if (excavationMaterial && 'opacity' in excavationMaterial) {
          (excavationMaterial as any).opacity = params.visualization.opacity * 0.5;
        }
        const excavation = new THREE.Mesh(excavationGeometry, excavationMaterial);
        excavation.position.set(0, -params.geometry.depth / 2, 0);
        excavationGroup.add(excavation);
        
        // 分步开挖显示
        if (params.stages.stageCount > 1) {
          const stageHeight = params.geometry.depth / params.stages.stageCount;
          for (let i = 0; i < params.stages.stageCount; i++) {
            const stageGeometry = new THREE.BoxGeometry(
              params.geometry.width,
              0.1,
              params.geometry.length
            );
            const stageMaterial = materialsRef.current.getMaterial('excavation_stage');
            const stage = new THREE.Mesh(stageGeometry, stageMaterial);
            stage.position.set(0, -i * stageHeight - stageHeight / 2, 0);
            excavationGroup.add(stage);
          }
        }
        
        previewObjectsRef.current.excavation = excavationGroup;
        scene.add(excavationGroup);
      };

      // 支护结构预览更新事件监听器
      const handleSupportPreviewUpdate = (event: CustomEvent) => {
        const params = event.detail;
        console.log('更新支护结构预览:', params);
        
        // 移除旧的支护预览对象
        if (previewObjectsRef.current.support) {
          scene.remove(previewObjectsRef.current.support);
        }
        
        // 创建新的支护预览对象
        const supportGroup = new THREE.Group();
        
        if (params.structureType === 'diaphragm') {
          // 地连墙
          const wallGeometry = new THREE.BoxGeometry(
            params.diaphragm.length,
            params.diaphragm.depth,
            params.diaphragm.thickness
          );
          const wallMaterial = materialsRef.current.getMaterial('support_diaphragm');
          if (wallMaterial && 'opacity' in wallMaterial) {
            (wallMaterial as any).opacity = params.visualization.opacity;
          }
          const wall = new THREE.Mesh(wallGeometry, wallMaterial);
          wall.position.set(0, -params.diaphragm.depth / 2, 0);
          supportGroup.add(wall);
          
        } else if (params.structureType === 'pile') {
          // 排桩
          const pileCount = Math.floor(30 / params.pile.spacing);
          for (let i = 0; i < pileCount; i++) {
            for (let row = 0; row < params.pile.rows; row++) {
              const pileGeometry = new THREE.CylinderGeometry(
                params.pile.diameter / 2,
                params.pile.diameter / 2,
                params.pile.depth
              );
              const pileMaterial = materialsRef.current.getMaterial('support_pile');
              if (pileMaterial && 'opacity' in pileMaterial) {
                (pileMaterial as any).opacity = params.visualization.opacity;
              }
              const pile = new THREE.Mesh(pileGeometry, pileMaterial);
              pile.position.set(
                (i - pileCount / 2) * params.pile.spacing,
                -params.pile.depth / 2,
                row * params.pile.spacing - (params.pile.rows - 1) * params.pile.spacing / 2
              );
              supportGroup.add(pile);
            }
          }
          
        } else if (params.structureType === 'anchor') {
          // 锚杆
          const anchorCount = Math.floor(30 / params.anchor.spacing);
          for (let i = 0; i < anchorCount; i++) {
            const anchorGeometry = new THREE.CylinderGeometry(
              params.anchor.diameter / 2,
              params.anchor.diameter / 2,
              params.anchor.length
            );
            const anchorMaterial = materialsRef.current.getMaterial('support_anchor');
            if (anchorMaterial && 'opacity' in anchorMaterial) {
              (anchorMaterial as any).opacity = params.visualization.opacity;
            }
            const anchor = new THREE.Mesh(anchorGeometry, anchorMaterial);
            
            // 设置锚杆角度
            anchor.rotation.z = -params.anchor.angle * Math.PI / 180;
            anchor.position.set(
              (i - anchorCount / 2) * params.anchor.spacing,
              -5,
              params.anchor.length * Math.cos(params.anchor.angle * Math.PI / 180) / 2
            );
            supportGroup.add(anchor);
          }
        }
        
        previewObjectsRef.current.support = supportGroup;
        scene.add(supportGroup);
      };

      // 注册事件监听器
      window.addEventListener('update-geology-preview', handleGeologyPreviewUpdate as EventListener);
      window.addEventListener('update-excavation-preview', handleExcavationPreviewUpdate as EventListener);
      window.addEventListener('update-support-preview', handleSupportPreviewUpdate as EventListener);

      // 动画循环
      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        
        if (controls) {
          controls.update();
        }
        
        // 添加动画效果
        if (scene) {
          const time = Date.now() * 0.001;
          
          // 旋转展示对象
          const showcaseObject = scene.getObjectByName('showcase');
          if (showcaseObject) {
            showcaseObject.rotation.y = time * 0.5;
            showcaseObject.children.forEach((child, index) => {
              if (child.name === 'ring') {
                child.rotation.x = time * 0.3 + index;
                child.rotation.z = time * 0.2;
              }
            });
          }
          
          // 脉动效果
          const pointLight = scene.children.find(child => child.type === 'PointLight');
          if (pointLight && 'intensity' in pointLight) {
            (pointLight as any).intensity = 0.8 + Math.sin(time * 2) * 0.2;
          }
          
          // 更新后处理效果
          if (postProcessingRef.current) {
            postProcessingRef.current.update(0.016);
          }
        }
        
        if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
      };

      animate();
      setIsInitialized(true);
      console.log('ViewPort3D: 3D scene initialized successfully');

      // 清理函数
      return () => {
        console.log('ViewPort3D: Cleaning up');
        
        if (frameRef.current) {
          cancelAnimationFrame(frameRef.current);
        }
        
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('update-geology-preview', handleGeologyPreviewUpdate as EventListener);
        window.removeEventListener('update-excavation-preview', handleExcavationPreviewUpdate as EventListener);
        window.removeEventListener('update-support-preview', handleSupportPreviewUpdate as EventListener);
        
        if (controlsRef.current) {
          controlsRef.current.dispose();
        }
        
        // 安全卸载 renderer.domElement（仅当确为其父节点时）
        try {
          const mountNode = mountRef.current;
          const renderer = rendererRef.current;
          const dom = renderer?.domElement;
          if (mountNode && dom && dom.parentNode === mountNode) {
            mountNode.removeChild(dom);
          }
          renderer?.dispose?.();
        } catch (e) {
          // 忽略卸载期间的偶发性错误，避免 NotFoundError 影响卸载流程
          console.warn('[Viewport3D] cleanup warning:', e);
        } finally {
          rendererRef.current = undefined;
        }
        
        if (viewCube && mountRef.current) {
          try {
            mountRef.current.removeChild(viewCube);
          } catch (e) {
            console.warn('Failed to remove view cube:', e);
          }
        }
        
        // 清理后处理效果
        if (postProcessingRef.current) {
          postProcessingRef.current.dispose();
          postProcessingRef.current = null;
        }
        
        if (sceneRef.current) {
          sceneRef.current.clear();
        }
      };
    } catch (err) {
      console.error('ViewPort3D: Failed to initialize 3D scene:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize 3D scene');
    }
  }, [mode]);

  if (error) {
    return (
      <div 
        className={`viewport-3d-container ${className || ''}`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, #000420, #001122)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-color)'
        }}
      >
        <Result
          status="error"
          title="3D视图加载失败"
          subTitle={error}
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              重新加载
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      className={`viewport-3d-container ${className || ''}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #000420, #001122)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden'
      }}
    >
      {/* 标题栏 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '40px',
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 100
        }}
      >
        <div>
          <Text 
            style={{ 
              color: 'var(--primary-color)', 
              fontSize: '14px', 
              fontWeight: 'bold',
              marginRight: '12px'
            }}
          >
            {title}
          </Text>
          <Text 
            style={{ 
              color: 'var(--text-muted)', 
              fontSize: '12px'
            }}
          >
            {description}
          </Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div 
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isInitialized ? '#52c41a' : '#fa8c16',
              animation: isInitialized ? 'none' : 'pulse 1s infinite'
            }}
          />
          <Text style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            {isInitialized ? '已就绪' : '初始化中...'}
          </Text>
        </div>
      </div>

      {/* 3D视图容器 */}
      <div
        ref={mountRef}
        style={{
          position: 'absolute',
          top: '40px',
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: 'calc(100% - 40px)'
        }}
      />

      {/* 现代化工具栏 */}
      <div
        className="viewport-toolbar"
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          display: 'flex',
          gap: '12px',
          zIndex: 100
        }}
      >
        <Button 
          size="small" 
          className="glass-effect"
          icon={<span style={{ fontSize: '12px' }}>🔄</span>}
          onClick={() => {
            if (cameraRef.current && controlsRef.current) {
              cameraRef.current.position.set(10, 8, 10);
              cameraRef.current.lookAt(0, 0, 0);
              controlsRef.current.update();
            }
            onAction?.('reset');
          }}
        >
          重置视图
        </Button>
        <Button 
          size="small" 
          className="glass-effect"
          icon={<span style={{ fontSize: '12px' }}>📸</span>}
          onClick={() => onAction?.('screenshot')}
        >
          截图
        </Button>
        <Button 
          size="small" 
          className="glass-effect"
          icon={<span style={{ fontSize: '12px' }}>🎯</span>}
          onClick={() => {
            if (cameraRef.current && controlsRef.current) {
              cameraRef.current.position.set(0, 15, 0);
              cameraRef.current.lookAt(0, 0, 0);
              controlsRef.current.update();
            }
            onAction?.('top-view');
          }}
        >
          俯视图
        </Button>
      </div>

      {/* CSS动画样式通过样式表或CSS modules处理 */}
    </div>
  );
};

export default ViewPort3D;
