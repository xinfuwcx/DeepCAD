/**
 * 真正的Epic控制中心 - 飞行导航 + 真实地图 + 3D控制
 * 点击项目 → 3D相机飞行 → 震撼导航效果
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

interface RealEpicProps {
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
  status: 'active' | 'completed' | 'planning';
  progress: number;
}

const PROJECTS: Project[] = [
  {
    id: 'shanghai-center',
    name: '上海中心深基坑',
    lat: 31.2304,
    lng: 121.4737,
    depth: 70,
    status: 'completed',
    progress: 100
  },
  {
    id: 'beijing-airport',
    name: '北京大兴机场T1',
    lat: 39.5098,
    lng: 116.4105,
    depth: 45,
    status: 'active',
    progress: 85
  },
  {
    id: 'shenzhen-qianhai',
    name: '深圳前海金融区',
    lat: 22.5431,
    lng: 113.9339,
    depth: 35,
    status: 'planning',
    progress: 15
  },
  {
    id: 'guangzhou-cbd',
    name: '广州珠江新城CBD',
    lat: 23.1291,
    lng: 113.3240,
    depth: 55,
    status: 'completed',
    progress: 100
  }
];

// 3D飞行相机系统
const FlightCameraSystem: React.FC<{
  width: number;
  height: number;
  targetProject: Project | null;
  onFlightComplete: () => void;
}> = ({ width, height, targetProject, onFlightComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const flightAnimationRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // 创建3D场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x001122);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
    camera.position.set(0, 500, 1000);

    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true 
    });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 创建中国地图轮廓（简化版）
    const mapGeometry = new THREE.PlaneGeometry(2000, 1500);
    const mapMaterial = new THREE.MeshLambertMaterial({
      color: 0x003366,
      transparent: true,
      opacity: 0.8
    });
    const mapMesh = new THREE.Mesh(mapGeometry, mapMaterial);
    mapMesh.rotation.x = -Math.PI / 2;
    scene.add(mapMesh);

    // 添加项目标记
    PROJECTS.forEach(project => {
      // 将经纬度转换为3D坐标（简化投影）
      const x = (project.lng - 110) * 20; // 中心经度110°
      const z = (project.lat - 35) * 20;   // 中心纬度35°
      
      // 创建项目标记
      const markerGeometry = new THREE.CylinderGeometry(10, 20, project.depth * 2, 8);
      const markerMaterial = new THREE.MeshLambertMaterial({
        color: project.status === 'completed' ? 0x00ff00 : 
               project.status === 'active' ? 0xffaa00 : 0x666666
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(x, project.depth, z);
      marker.userData = { project };
      scene.add(marker);

      // 添加项目标签
      const labelGeometry = new THREE.PlaneGeometry(80, 20);
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(project.name, 128, 32);

      const labelTexture = new THREE.CanvasTexture(canvas);
      const labelMaterial = new THREE.MeshBasicMaterial({ 
        map: labelTexture, 
        transparent: true 
      });
      const label = new THREE.Mesh(labelGeometry, labelMaterial);
      label.position.set(x, project.depth + 60, z);
      scene.add(label);
    });

    // 添加环境光和方向光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(500, 1000, 500);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // 添加粒子星空背景
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 1000;
    const starsPositions = new Float32Array(starsCount * 3);
    
    for (let i = 0; i < starsCount; i++) {
      starsPositions[i * 3] = (Math.random() - 0.5) * 4000;
      starsPositions[i * 3 + 1] = Math.random() * 2000 + 500;
      starsPositions[i * 3 + 2] = (Math.random() - 0.5) * 4000;
    }
    
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 2,
      transparent: true,
      opacity: 0.8
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    containerRef.current.appendChild(renderer.domElement);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    // 渲染循环
    const animate = () => {
      if (stars) {
        stars.rotation.y += 0.001;
      }
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [width, height]);

  // 飞行到目标项目
  useEffect(() => {
    if (!targetProject || !cameraRef.current) return;

    const camera = cameraRef.current;
    const startPosition = camera.position.clone();
    const startRotation = camera.rotation.clone();

    // 计算目标位置
    const targetX = (targetProject.lng - 110) * 20;
    const targetZ = (targetProject.lat - 35) * 20;
    const targetPosition = new THREE.Vector3(targetX, 200, targetZ + 300);

    let startTime = Date.now();
    const flightDuration = 3000; // 3秒飞行时间

    const flyToTarget = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / flightDuration, 1);
      
      // 使用easeInOutCubic缓动函数
      const eased = progress < 0.5 ? 
        4 * progress * progress * progress : 
        1 - Math.pow(-2 * progress + 2, 3) / 2;

      // 插值计算当前位置
      camera.position.lerpVectors(startPosition, targetPosition, eased);
      
      // 看向目标项目
      const lookTarget = new THREE.Vector3(targetX, targetProject.depth, targetZ);
      camera.lookAt(lookTarget);

      if (progress < 1) {
        flightAnimationRef.current = requestAnimationFrame(flyToTarget);
      } else {
        setTimeout(onFlightComplete, 500);
      }
    };

    flyToTarget();

    return () => {
      if (flightAnimationRef.current) {
        cancelAnimationFrame(flightAnimationRef.current);
      }
    };
  }, [targetProject, onFlightComplete]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        cursor: 'grab'
      }}
    />
  );
};

// 项目控制面板
const ProjectControlPanel: React.FC<{
  projects: Project[];
  selectedProject: Project | null;
  onProjectSelect: (project: Project) => void;
  isFlying: boolean;
}> = ({ projects, selectedProject, onProjectSelect, isFlying }) => {
  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.8 }}
      style={{
        position: 'absolute',
        left: '20px',
        top: '80px',
        width: '300px',
        maxHeight: 'calc(100vh - 120px)',
        background: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '15px',
        padding: '20px',
        backdropFilter: 'blur(10px)',
        zIndex: 10,
        overflowY: 'auto'
      }}
    >
      <h3 style={{ 
        color: '#00ffff', 
        margin: '0 0 20px 0',
        textAlign: 'center',
        textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
      }}>
        🗺️ 项目导航中心
      </h3>

      {isFlying && (
        <div style={{
          background: 'rgba(255, 165, 0, 0.2)',
          border: '1px solid rgba(255, 165, 0, 0.5)',
          borderRadius: '8px',
          padding: '10px',
          marginBottom: '15px',
          color: '#ffaa00',
          textAlign: 'center',
          fontSize: '12px'
        }}>
          ✈️ 正在飞往目标位置...
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {projects.map((project) => (
          <motion.div
            key={project.id}
            onClick={() => !isFlying && onProjectSelect(project)}
            style={{
              background: selectedProject?.id === project.id ? 
                'rgba(0, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              border: selectedProject?.id === project.id ? 
                '2px solid #00ffff' : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              padding: '15px',
              cursor: isFlying ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: isFlying ? 0.6 : 1
            }}
            whileHover={!isFlying ? { scale: 1.02 } : {}}
            whileTap={!isFlying ? { scale: 0.98 } : {}}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <h4 style={{ 
                color: '#ffffff', 
                margin: 0, 
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                {project.name}
              </h4>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: project.status === 'completed' ? '#00ff00' : 
                           project.status === 'active' ? '#ffaa00' : '#666666',
                boxShadow: `0 0 8px ${project.status === 'completed' ? '#00ff00' : 
                                     project.status === 'active' ? '#ffaa00' : '#666666'}`
              }} />
            </div>
            
            <div style={{ 
              color: 'rgba(255, 255, 255, 0.7)', 
              fontSize: '11px',
              lineHeight: '1.4'
            }}>
              <div>📍 {project.lat.toFixed(2)}°N, {project.lng.toFixed(2)}°E</div>
              <div>🕳️ 深度: {project.depth}m</div>
              <div>📊 进度: {project.progress}%</div>
            </div>

            {selectedProject?.id === project.id && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  marginTop: '8px',
                  padding: '8px',
                  background: 'rgba(0, 255, 255, 0.1)',
                  borderRadius: '5px',
                  fontSize: '10px',
                  color: '#00ffff'
                }}
              >
                🎯 当前选中 - 点击其他项目开始飞行
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// 3D导航控制器
const NavigationControls: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1, duration: 0.5 }}
      style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '10px',
        padding: '15px',
        backdropFilter: 'blur(10px)',
        zIndex: 10
      }}
    >
      <div style={{ color: '#00ffff', fontSize: '12px', marginBottom: '10px' }}>
        🎮 3D导航控制
      </div>
      <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '10px', lineHeight: '1.5' }}>
        <div>🖱️ 鼠标拖拽: 旋转视角</div>
        <div>⚙️ 滚轮: 缩放视距</div>
        <div>⌨️ WASD: 移动位置</div>
      </div>
    </motion.div>
  );
};

// 主组件
export const RealEpicControlCenter: React.FC<RealEpicProps> = ({ width, height, onExit }) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isFlying, setIsFlying] = useState(false);
  const [flightTarget, setFlightTarget] = useState<Project | null>(null);

  const handleProjectSelect = useCallback((project: Project) => {
    if (isFlying) return;
    
    console.log(`🚁 开始飞行到: ${project.name}`);
    setIsFlying(true);
    setFlightTarget(project);
    setSelectedProject(project);
  }, [isFlying]);

  const handleFlightComplete = useCallback(() => {
    console.log(`✅ 飞行完成`);
    setIsFlying(false);
    setFlightTarget(null);
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#000011',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 3D飞行相机系统 */}
      <FlightCameraSystem
        width={width}
        height={height}
        targetProject={flightTarget}
        onFlightComplete={handleFlightComplete}
      />

      {/* 顶部控制栏 */}
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          zIndex: 20,
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0, 255, 255, 0.3)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(45deg, #00ffff, #0080ff)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>🚁</div>
          <div>
            <h1 style={{ color: '#ffffff', margin: 0, fontSize: '18px' }}>
              Epic控制中心 - 飞行导航
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0, fontSize: '10px' }}>
              点击项目启动3D飞行导航
            </p>
          </div>
        </div>

        <button
          onClick={onExit}
          style={{
            background: 'rgba(255, 100, 100, 0.8)',
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ✕ 退出
        </button>
      </motion.div>

      {/* 项目控制面板 */}
      <ProjectControlPanel
        projects={PROJECTS}
        selectedProject={selectedProject}
        onProjectSelect={handleProjectSelect}
        isFlying={isFlying}
      />

      {/* 3D导航控制说明 */}
      <NavigationControls />

      {/* 飞行状态指示器 */}
      <AnimatePresence>
        {isFlying && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.9)',
              border: '2px solid #00ffff',
              borderRadius: '15px',
              padding: '20px',
              color: '#ffffff',
              textAlign: 'center',
              zIndex: 30,
              backdropFilter: 'blur(10px)'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>✈️</div>
            <div style={{ fontSize: '16px', marginBottom: '5px' }}>飞行中...</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              正在导航到 {flightTarget?.name}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RealEpicControlCenter;