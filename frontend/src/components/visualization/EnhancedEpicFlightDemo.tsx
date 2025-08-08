/**
 * DeepCAD 增强版史诗级飞行演示
 * 1号架构师 - 集成Mapbox底图 + 天气系统 + 云彩效果
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { safeDetachRenderer, deepDispose } from '../../utils/safeThreeDetach';
import { designTokens } from '../../design/tokens';
import { WeatherVisualization } from './WeatherVisualization';
import openMeteoService, { WeatherData } from '../../services/OpenMeteoService';

// ==================== 类型定义 ====================

// WeatherData 现在从 OpenMeteoService 导入

export interface MapboxStyle {
  id: string;
  name: string;
  style: string;
  description: string;
}

export interface ProjectLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
  status: 'active' | 'completed' | 'planning';
}

// ==================== Mapbox 底图样式配置 ====================

const MAPBOX_STYLES: MapboxStyle[] = [
  {
    id: 'streets',
    name: '街道图',
    style: 'mapbox://styles/mapbox/streets-v12',
    description: '详细的街道和标注信息'
  },
  {
    id: 'outdoors',
    name: '户外地形图',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    description: '适合户外活动的地形图'
  },
  {
    id: 'light',
    name: '明亮模式',
    style: 'mapbox://styles/mapbox/light-v11',
    description: '明亮清爽的地图样式'
  },
  {
    id: 'dark',
    name: '暗色模式',
    style: 'mapbox://styles/mapbox/dark-v11',
    description: '深色主题，护眼模式'
  },
  {
    id: 'satellite',
    name: '卫星影像',
    style: 'mapbox://styles/mapbox/satellite-v9',
    description: '高分辨率卫星图像'
  },
  {
    id: 'satellite-streets',
    name: '卫星+街道',
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
    description: '卫星影像叠加街道标注'
  }
];

// ==================== 示例项目位置 ====================

const DEMO_PROJECTS: ProjectLocation[] = [
  {
    id: '1',
    name: '上海中心深基坑工程',
    lat: 31.2304,
    lng: 121.4737,
    description: '632米超高层建筑，70米深基坑工程',
    status: 'completed'
  },
  {
    id: '2',
    name: '北京大兴机场T1航站楼',
    lat: 39.5098,
    lng: 116.4105,
    description: '世界最大单体航站楼基坑工程',
    status: 'active'
  },
  {
    id: '3',
    name: '深圳前海金融区',
    lat: 22.5431,
    lng: 113.9339,
    description: '大型金融区深基坑群监测',
    status: 'planning'
  },
  {
    id: '4',
    name: '广州珠江新城CBD',
    lat: 23.1291,
    lng: 113.3240,
    description: 'CBD核心区超深基坑群',
    status: 'completed'
  }
];

// ==================== 天气服务集成 ====================
// 使用免费的天气服务，无需API密钥

// ==================== 云彩系统类 ====================

class CloudSystem {
  private scene: THREE.Scene;
  private cloudGroup: THREE.Group;
  private cloudMeshes: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.cloudGroup = new THREE.Group();
    this.cloudGroup.name = 'CloudSystem';
    this.scene.add(this.cloudGroup);
    this.createClouds();
  }

  private createClouds() {
    const cloudCount = 50;
    const cloudGeometry = new THREE.SphereGeometry(20, 6, 4);
    
    for (let i = 0; i < cloudCount; i++) {
      const cloudMaterial = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4 + Math.random() * 0.3
      });

      const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
      
      // 随机位置
      cloud.position.set(
        (Math.random() - 0.5) * 2000,
        50 + Math.random() * 100,
        (Math.random() - 0.5) * 2000
      );
      
      // 随机缩放
      const scale = 0.5 + Math.random() * 2;
      cloud.scale.set(scale, scale * 0.5, scale);
      
      // 随机旋转
      cloud.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      this.cloudMeshes.push(cloud);
      this.cloudGroup.add(cloud);
    }
  }

  updateClouds(windSpeed: number, windDirection: number, cloudCover: number) {
    const windDirectionRad = (windDirection * Math.PI) / 180;
    const windX = Math.cos(windDirectionRad) * windSpeed * 0.01;
    const windZ = Math.sin(windDirectionRad) * windSpeed * 0.01;

    this.cloudMeshes.forEach((cloud, index) => {
      // 风力影响云彩移动
      cloud.position.x += windX;
      cloud.position.z += windZ;
      
      // 边界检查，重置位置
      if (cloud.position.x > 1000) cloud.position.x = -1000;
      if (cloud.position.x < -1000) cloud.position.x = 1000;
      if (cloud.position.z > 1000) cloud.position.z = -1000;
      if (cloud.position.z < -1000) cloud.position.z = 1000;
      
      // 根据云量调整透明度
      const targetOpacity = (cloudCover / 100) * (0.2 + Math.random() * 0.4);
      const currentOpacity = (cloud.material as THREE.MeshLambertMaterial).opacity;
      (cloud.material as THREE.MeshLambertMaterial).opacity = 
        currentOpacity + (targetOpacity - currentOpacity) * 0.02;
      
      // 轻微的上下浮动
      cloud.position.y += Math.sin(Date.now() * 0.001 + index) * 0.1;
    });
  }

  setVisibility(visible: boolean) {
    this.cloudGroup.visible = visible;
  }

  dispose() {
    this.cloudMeshes.forEach(cloud => {
      cloud.geometry.dispose();
      (cloud.material as THREE.Material).dispose();
    });
    this.scene.remove(this.cloudGroup);
  }
}

// ==================== 主组件 ====================

export const EnhancedEpicFlightDemo: React.FC<{
  width?: number;
  height?: number;
  autoStart?: boolean;
}> = ({
  width = 1920,
  height = 1080,
  autoStart = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // 预留 mapbox 集成引用（当前未启用）
  const mapRef = useRef<any>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cloudSystemRef = useRef<CloudSystem | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [currentStyle, setCurrentStyle] = useState<MapboxStyle>(MAPBOX_STYLES[0]);
  const [currentProject, setCurrentProject] = useState<ProjectLocation>(DEMO_PROJECTS[0]);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [showWeather, setShowWeather] = useState(true);
  const [showWeatherViz, setShowWeatherViz] = useState(true);
  const [showClouds, setShowClouds] = useState(true);
  const [isFlying, setIsFlying] = useState(false);

  // 初始化Mapbox和Three.js
  useEffect(() => {
    if (!containerRef.current) return;

    // 初始化Three.js场景
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      powerPreference: "high-performance"
    });
    
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // 设置场景
    scene.background = new THREE.Color(0x87CEEB); // 天空蓝
    scene.fog = new THREE.Fog(0x87CEEB, 500, 2000);
    
    // 添加光照
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // 设置相机位置
    camera.position.set(0, 500, 1000);
    camera.lookAt(0, 0, 0);
    
    // 初始化云彩系统
    const cloudSystem = new CloudSystem(scene);
    
    // 添加地面
    const groundGeometry = new THREE.PlaneGeometry(4000, 4000);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    containerRef.current.appendChild(renderer.domElement);
    
    // 保存引用
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    cloudSystemRef.current = cloudSystem;
    
    setIsInitialized(true);
    
    // 开始渲染循环
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (weatherData && cloudSystemRef.current) {
        cloudSystemRef.current.updateClouds(
          weatherData.windSpeed,
          weatherData.windDirection,
          weatherData.cloudCover
        );
      }
      
      renderer.render(scene, camera);
    };
    animate();
    
    return () => {
      try { cloudSystem.dispose(); } catch (_) {}
      deepDispose(scene);
      safeDetachRenderer(renderer);
    };
  }, [width, height]);

  // 获取天气数据
  const fetchWeather = useCallback(async (project: ProjectLocation) => {
    const weather = await openMeteoService.getWeatherData(project.lat, project.lng);
    setWeatherData(weather);
  }, []);

  // 初始化后获取天气
  useEffect(() => {
    if (isInitialized) {
      fetchWeather(currentProject);
    }
  }, [isInitialized, currentProject, fetchWeather]);

  // 切换地图样式
  const handleStyleChange = (style: MapboxStyle) => {
    setCurrentStyle(style);
    // 这里可以添加实际的Mapbox样式切换逻辑
  };

  // 飞行到项目
  const flyToProject = useCallback((project: ProjectLocation) => {
    if (!cameraRef.current) return;
    
    setIsFlying(true);
    setCurrentProject(project);
    
    // 创建飞行动画
    const startPos = cameraRef.current.position.clone();
    const endPos = new THREE.Vector3(
      project.lng * 10, // 简化的坐标转换
      200,
      project.lat * 10
    );
    
    const duration = 3000; // 3秒飞行时间
    const startTime = Date.now();
    
    const animateFlight = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用easeInOut缓动
      const easeProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      cameraRef.current!.position.lerpVectors(startPos, endPos, easeProgress);
      cameraRef.current!.lookAt(endPos.x, 0, endPos.z);
      
      if (progress < 1) {
        requestAnimationFrame(animateFlight);
      } else {
        setIsFlying(false);
        fetchWeather(project);
      }
    };
    
    animateFlight();
  }, [fetchWeather]);

  return (
    <motion.div
      ref={containerRef}
      style={{
        position: 'relative',
        width,
        height,
        background: '#000',
        overflow: 'hidden'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* 加载界面 */}
      {!isInitialized && (
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
            zIndex: 100
          }}
          initial={{ opacity: 1 }}
          animate={{ opacity: isInitialized ? 0 : 1 }}
        >
          <div style={{ textAlign: 'center', color: 'white' }}>
            <h2 style={{ fontSize: '32px', marginBottom: '20px' }}>DeepCAD Epic</h2>
            <p>正在初始化增强版飞行系统...</p>
          </div>
        </motion.div>
      )}

      {/* 地图样式切换面板 */}
      <motion.div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          background: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '12px',
          padding: '16px',
          zIndex: 50
        }}
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <h3 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '16px' }}>地图样式</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {MAPBOX_STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => handleStyleChange(style)}
              style={{
                background: currentStyle.id === style.id ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {style.name}
            </button>
          ))}
        </div>
      </motion.div>

      {/* 天气信息面板 */}
      <AnimatePresence>
        {showWeather && weatherData && (
          <motion.div
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'rgba(0, 0, 0, 0.8)',
              borderRadius: '12px',
              padding: '16px',
              minWidth: '250px',
              zIndex: 50
            }}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ delay: 1.2 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '16px' }}>
                {weatherData.city} 天气
              </h3>
              <button
                onClick={() => setShowWeather(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  marginLeft: 'auto',
                  padding: '4px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ color: 'white', fontSize: '14px', lineHeight: '1.6' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px', marginRight: '8px' }}>🌤️</span>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {weatherData.temperature}°C
                  </div>
                  <div style={{ opacity: 0.8 }}>{weatherData.description}</div>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div>💨 风速: {weatherData.windSpeed} m/s</div>
                <div>🧭 风向: {weatherData.windDirection}°</div>
                <div>💧 湿度: {weatherData.humidity}%</div>
                <div>📊 气压: {weatherData.pressure} hPa</div>
                <div>👁️ 能见度: {weatherData.visibility} km</div>
                <div>☁️ 云量: {weatherData.cloudCover}%</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 项目列表面板 */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          background: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '12px',
          padding: '16px',
          zIndex: 50
        }}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <h3 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '16px' }}>项目位置</h3>
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto' }}>
          {DEMO_PROJECTS.map(project => (
            <button
              key={project.id}
              onClick={() => flyToProject(project)}
              disabled={isFlying}
              style={{
                background: currentProject.id === project.id ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 16px',
                color: 'white',
                fontSize: '14px',
                cursor: isFlying ? 'not-allowed' : 'pointer',
                minWidth: '200px',
                textAlign: 'left',
                opacity: isFlying ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{project.name}</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>{project.description}</div>
              <div style={{ 
                fontSize: '10px', 
                marginTop: '4px',
                color: project.status === 'active' ? '#10b981' : 
                      project.status === 'completed' ? '#6b7280' : '#f59e0b'
              }}>
                {project.status === 'active' ? '🟢 进行中' : 
                 project.status === 'completed' ? '🔵 已完成' : '🟡 规划中'}
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* 云彩控制 */}
      <motion.div
        style={{
          position: 'absolute',
          top: '50%',
          right: 20,
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <button
          onClick={() => {
            setShowClouds(!showClouds);
            cloudSystemRef.current?.setVisibility(!showClouds);
          }}
          style={{
            background: showClouds ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          ☁️
        </button>
        
        <button
          onClick={() => setShowWeather(!showWeather)}
          style={{
            background: showWeather ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          🌦️
        </button>
        
        <button
          onClick={() => setShowWeatherViz(!showWeatherViz)}
          style={{
            background: showWeatherViz ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          🗺️
        </button>
      </motion.div>

      {/* 飞行状态指示器 */}
      <AnimatePresence>
        {isFlying && (
          <motion.div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.9)',
              borderRadius: '12px',
              padding: '20px',
              color: 'white',
              textAlign: 'center',
              zIndex: 100
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>✈️</div>
            <div>飞行中...</div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
              前往 {currentProject.name}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 天气可视化层 */}
      <AnimatePresence>
        {showWeatherViz && isInitialized && (
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 10
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <WeatherVisualization
              width={width}
              height={height}
              bounds={{
                north: currentProject.lat + 2,
                south: currentProject.lat - 2,
                east: currentProject.lng + 2,
                west: currentProject.lng - 2
              }}
              onWeatherUpdate={(weather) => {
                setWeatherData(weather);
                if (cloudSystemRef.current) {
                  cloudSystemRef.current.updateClouds(
                    weather.windSpeed,
                    weather.windDirection,
                    weather.cloudCover
                  );
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default EnhancedEpicFlightDemo;