/**
 * 纯Three.js Epic控制中心 (Legacy / 将逐步迁移)
 * 1号专家 - 替代Mapbox的专业3D地理可视化解决方案
 * NOTE: 功能正在被统一架构下的 EpicGlobeLayer + useThreeScene 替换。
 * 后续：可直接在正式控制中心中嵌入 <EpicGlobeScene projects={...}/> 并删除此组件。
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { safeDetachRenderer, deepDispose } from '../../utils/safeThreeDetach';

interface PureThreeJSEpicCenterProps {
  width: number;
  height: number;
  onExit: () => void;
}

interface Project {
  id: string;
  name: string;
  lat: number;
  lng: number;
  depth: number;
  status: 'completed' | 'active' | 'planning';
  progress: number;
  description: string;
}

interface WeatherData {
  temperature: number;
  description: string;
  windSpeed: number;
  humidity: number;
  icon: string;
}

// 项目数据
const PROJECTS: Project[] = [
  {
    id: 'shanghai-center',
    name: '上海中心深基坑',
    lat: 31.2304,
    lng: 121.4737,
    depth: 70,
    status: 'completed',
    progress: 100,
    description: '632米超高层建筑深基坑工程'
  },
  {
    id: 'beijing-daxing',
    name: '北京大兴机场',
    lat: 39.5098,
    lng: 116.4105,
    depth: 45,
    status: 'active',
    progress: 85,
    description: '大兴国际机场航站楼基坑'
  },
  {
    id: 'guangzhou-tower',
    name: '广州塔地下空间',
    lat: 23.1084,
    lng: 113.3189,
    depth: 35,
    status: 'planning',
    progress: 20,
    description: '广州塔地下商业空间基坑'
  }
];

export const PureThreeJSEpicCenter: React.FC<PureThreeJSEpicCenterProps> = ({ 
  width, 
  height, 
  onExit 
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const frameIdRef = useRef<number>();
  
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isFlying, setIsFlying] = useState(false);
  const [weather, _setWeather] = useState<WeatherData>({
    temperature: 22,
    description: '多云',
    windSpeed: 12,
    humidity: 65,
    icon: '☁️'
  });

  // 初始化Three.js场景
  const initThreeJS = useCallback(() => {
    if (!mountRef.current) return;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x001122);
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
    camera.position.set(0, 1000, 2000);
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 添加到DOM
    mountRef.current.appendChild(renderer.domElement);

    // 创建地形网格
    createTerrain(scene);
    
    // 创建项目标记
    createProjectMarkers(scene);
    
    // 添加光照
    addLighting(scene);
    
    // 添加粒子系统
    addParticleSystem(scene);

    // 开始渲染循环
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      
      // 旋转地球
      if (scene.getObjectByName('terrain')) {
        scene.getObjectByName('terrain')!.rotation.y += 0.001;
      }
      
      // 更新粒子
      const particles = scene.getObjectByName('particles');
      if (particles) {
        particles.rotation.y += 0.002;
      }
      
      renderer.render(scene, camera);
    };
    
    animate();
  }, [width, height]);

  // 创建地形
  const createTerrain = (scene: THREE.Scene) => {
    const geometry = new THREE.SphereGeometry(800, 64, 32);
    
    // 创建地球纹理材质
    const material = new THREE.MeshPhongMaterial({
      color: 0x1a4d73,
      transparent: true,
      opacity: 0.8,
      wireframe: false
    });
    
    const terrain = new THREE.Mesh(geometry, material);
    terrain.name = 'terrain';
    terrain.receiveShadow = true;
    scene.add(terrain);

    // 添加地形网格线
    const wireframe = new THREE.WireframeGeometry(geometry);
    const line = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({ 
      color: 0x00ffff, 
      opacity: 0.3, 
      transparent: true 
    }));
    terrain.add(line);
  };

  // 创建项目标记
  const createProjectMarkers = (scene: THREE.Scene) => {
    PROJECTS.forEach(project => {
      // 将经纬度转换为3D坐标
      const phi = (90 - project.lat) * (Math.PI / 180);
      const theta = (project.lng + 180) * (Math.PI / 180);
      const radius = 820; // 略大于地球半径
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      // 创建项目标记
      const markerGeometry = new THREE.ConeGeometry(10, 40, 8);
      let color;
      switch (project.status) {
        case 'completed':
          color = 0x00ff00;
          break;
        case 'active':
          color = 0xffff00;
          break;
        case 'planning':
          color = 0xff4444;
          break;
      }
      
      const markerMaterial = new THREE.MeshPhongMaterial({ 
        color,
        emissive: color,
        emissiveIntensity: 0.2
      });
      
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(x, y, z);
      marker.lookAt(0, 0, 0);
      marker.rotateX(Math.PI);
      marker.userData = project;
      marker.name = `marker-${project.id}`;
      marker.castShadow = true;
      
      scene.add(marker);

      // 添加发光效果
      const glowGeometry = new THREE.SphereGeometry(15, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.3
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.copy(marker.position);
      scene.add(glow);
    });
  };

  // 添加光照
  const addLighting = (scene: THREE.Scene) => {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    // 主光源
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1000, 1000, 500);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // 点光源
    const pointLight = new THREE.PointLight(0x00ffff, 0.5, 2000);
    pointLight.position.set(0, 500, 1000);
    scene.add(pointLight);
  };

  // 添加粒子系统
  const addParticleSystem = (scene: THREE.Scene) => {
    const particleCount = 1000;
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4000;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4000;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4000;
    }
    
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 2,
      transparent: true,
      opacity: 0.6
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.name = 'particles';
    scene.add(particles);
  };

  // 飞行到项目
  const flyToProject = useCallback((project: Project) => {
    if (!cameraRef.current || isFlying) return;
    
    setIsFlying(true);
    setSelectedProject(project);
    
    // 计算目标位置
    const phi = (90 - project.lat) * (Math.PI / 180);
    const theta = (project.lng + 180) * (Math.PI / 180);
    const radius = 1200;
    
    const targetX = radius * Math.sin(phi) * Math.cos(theta);
    const targetY = radius * Math.cos(phi);
    const targetZ = radius * Math.sin(phi) * Math.sin(theta);
    
    // 动画相机移动
    const camera = cameraRef.current;
    const startPos = camera.position.clone();
    const targetPos = new THREE.Vector3(targetX, targetY, targetZ);
    
    let progress = 0;
    const animateCamera = () => {
      progress += 0.02;
      
      if (progress <= 1) {
        camera.position.lerpVectors(startPos, targetPos, progress);
        camera.lookAt(0, 0, 0);
        requestAnimationFrame(animateCamera);
      } else {
        setIsFlying(false);
      }
    };
    
    animateCamera();
  }, [isFlying]);

  // 处理鼠标点击
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (!cameraRef.current || !sceneRef.current || !rendererRef.current) return;
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
  // 使用显式 Vector2 以满足类型要求
  raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
    
    const markers = sceneRef.current.children.filter(child => 
      child.name.startsWith('marker-')
    );
    
    const intersects = raycaster.intersectObjects(markers);
    
    if (intersects.length > 0) {
      const project = intersects[0].object.userData as Project;
      flyToProject(project);
    }
  }, [flyToProject]);

  // 初始化
  useEffect(() => {
    initThreeJS();
    
    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      // 统一使用深度释放与安全分离
      deepDispose(sceneRef.current as any);
      if (rendererRef.current) {
        safeDetachRenderer(rendererRef.current as any);
      }
    };
  }, [initThreeJS]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(135deg, #001122, #002244)',
        zIndex: 1000,
        overflow: 'hidden'
      }}
    >
      {/* Three.js渲染区域 */}
      <div 
        ref={mountRef} 
        style={{ width: '100%', height: '100%', cursor: 'pointer' }}
        onClick={handleCanvasClick}
      />

      {/* HUD界面 */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        pointerEvents: 'none',
        zIndex: 1001
      }}>
        {/* 标题栏 */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px',
            background: 'rgba(0, 17, 34, 0.8)',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            pointerEvents: 'auto'
          }}
        >
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#00ffff',
              textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
            }}>
              🌍 DeepCAD Epic 控制中心
            </h1>
            <p style={{
              margin: '5px 0 0 0',
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              全球深基坑项目监控系统 - Three.js驱动
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{
              padding: '8px 16px',
              background: 'rgba(0, 255, 255, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              fontSize: '14px',
              color: '#00ffff'
            }}>
              {weather.icon} {weather.temperature}°C {weather.description}
            </div>
            
            <button
              onClick={onExit}
              style={{
                padding: '8px 16px',
                background: 'rgba(255, 68, 68, 0.2)',
                border: '1px solid rgba(255, 68, 68, 0.5)',
                borderRadius: '8px',
                color: '#ff4444',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              退出
            </button>
          </div>
        </motion.div>

        {/* 项目列表 */}
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            position: 'absolute',
            top: '100px',
            left: 0,
            width: '320px',
            pointerEvents: 'auto'
          }}
        >
          <div style={{
            background: 'rgba(0, 17, 34, 0.9)',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            border: '1px solid rgba(0, 255, 255, 0.2)',
            padding: '20px'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              color: '#00ffff',
              borderBottom: '1px solid rgba(0, 255, 255, 0.2)',
              paddingBottom: '8px'
            }}>
              🏗️ 项目列表
            </h3>
            
            {PROJECTS.map(project => (
              <motion.div
                key={project.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  background: selectedProject?.id === project.id ? 
                    'rgba(0, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: selectedProject?.id === project.id ?
                    '1px solid rgba(0, 255, 255, 0.5)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => flyToProject(project)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px'
                }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#ffffff'
                  }}>
                    {project.name}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: project.status === 'completed' ? '#22c55e' :
                               project.status === 'active' ? '#fbbf24' : '#ef4444',
                    color: 'white'
                  }}>
                    {project.status}
                  </span>
                </div>
                
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginBottom: '8px'
                }}>
                  {project.description}
                </div>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  <span>深度: {project.depth}m</span>
                  <span>进度: {project.progress}%</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 项目详情面板 */}
        <AnimatePresence>
          {selectedProject && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              style={{
                position: 'absolute',
                top: '100px',
                right: 0,
                width: '320px',
                pointerEvents: 'auto'
              }}
            >
              <div style={{
                background: 'rgba(0, 17, 34, 0.9)',
                backdropFilter: 'blur(20px)',
                borderRadius: '12px',
                border: '1px solid rgba(0, 255, 255, 0.2)',
                padding: '20px'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '18px',
                  color: '#00ffff',
                  borderBottom: '1px solid rgba(0, 255, 255, 0.2)',
                  paddingBottom: '8px'
                }}>
                  📊 项目详情
                </h3>
                
                <div style={{ fontSize: '14px', color: '#ffffff', lineHeight: 1.6 }}>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>项目名称:</strong> {selectedProject.name}
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>位置:</strong> {selectedProject.lat.toFixed(4)}°N, {selectedProject.lng.toFixed(4)}°E
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>开挖深度:</strong> {selectedProject.depth}m
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>项目状态:</strong> {selectedProject.status}
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>完成进度:</strong> {selectedProject.progress}%
                  </div>
                  <div>
                    <strong>描述:</strong> {selectedProject.description}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 飞行状态指示器 */}
      <AnimatePresence>
        {isFlying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              padding: '16px 24px',
              background: 'rgba(0, 255, 255, 0.2)',
              backdropFilter: 'blur(20px)',
              borderRadius: '12px',
              border: '1px solid rgba(0, 255, 255, 0.5)',
              color: '#00ffff',
              fontSize: '16px',
              pointerEvents: 'none'
            }}
          >
            🚀 正在飞行中...
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PureThreeJSEpicCenter;