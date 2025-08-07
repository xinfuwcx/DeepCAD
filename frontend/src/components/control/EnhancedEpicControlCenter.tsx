/**
 * 增强型Epic控制中心 - iTowns + OpenMeteo集成版
 * 在控制中心界面直接展示地图和天气功能
 * 基于现有界面架构，无缝集成地理信息和气象数据
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, Row, Col, Button, Space, Typography, Progress, Statistic, Tabs, Switch, Slider } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import {
  EnvironmentOutlined,
  CloudOutlined,
  EyeOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import * as THREE from 'three';
// import * as itowns from 'itowns'; // 已移除iTowns依赖
import { openMeteoService } from '../../services/OpenMeteoService';

const { Title, Text } = Typography;

interface Project {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  depth: number;
  status: 'active' | 'completed' | 'planning';
  progress: number;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
}

// 示例项目数据
const DEMO_PROJECTS: Project[] = [
  {
    id: 'shanghai',
    name: '上海中心深基坑',
    location: { lat: 31.23416, lng: 121.50576 }, // 上海中心大厦精确坐标
    depth: 70,
    status: 'completed',
    progress: 100
  },
  {
    id: 'beijing',
    name: '北京大兴机场',
    location: { lat: 39.5098, lng: 116.4105 },
    depth: 45,
    status: 'active',
    progress: 85
  },
  {
    id: 'shenzhen',
    name: '深圳前海金融区',
    location: { lat: 22.5431, lng: 113.9339 },
    depth: 35,
    status: 'planning',
    progress: 25
  }
];

// 检测WebGL支持
function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (error) {
    return false;
  }
}

// iTowns地图管理器
class iTownsMapController {
  private view: itowns.GlobeView | null = null;
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private isInitialized = false;
  private onlineMode: boolean = true;
  private projects: Project[] = [];

  constructor(container: HTMLElement, onlineMode: boolean = true, projects: Project[] = []) {
    this.container = container;
    this.onlineMode = onlineMode;
    this.projects = projects;
  }

  async initialize(): Promise<boolean> {
    try {
      console.log('🗺️ 重新设计iTowns初始化...');
      
      // 基础检查
      if (!this.container) {
        throw new Error('地图容器不存在');
      }

      // 清理并设置容器
      this.container.innerHTML = '';
      this.container.style.width = '100%';
      this.container.style.height = '100%';
      this.container.style.position = 'relative';
      this.container.style.backgroundColor = '#001122';
      
      console.log('📦 容器尺寸:', this.container.offsetWidth, 'x', this.container.offsetHeight);

      // 使用3D地球视角配置
      const viewerOptions = {
        coord: new itowns.Coordinates('EPSG:4326', 116.4074, 39.9042), // 从北京开始
        range: 5000000, // 5,000km视距，3D地球视角
        tilt: 20, // 适当倾斜，显示3D效果
        heading: 0
      };

      console.log('🌍 创建最简单的GlobeView...');
      
      // 创建最基本的GlobeView
      this.view = new itowns.GlobeView(this.container, viewerOptions);

      if (!this.view) {
        throw new Error('GlobeView创建失败');
      }

      console.log('✅ 基础GlobeView创建成功');
      
      // 等待渲染循环启动
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 设置控制器
      this.setupControls();
      
      // 根据模式加载图层
      if (this.onlineMode) {
        await this.addOnlineMapLayer();
      } else {
        this.addEarthAppearance();
      }
      
      // 强制渲染
      if (this.view.notifyChange) {
        this.view.notifyChange();
      }

      this.isInitialized = true;
      console.log('✅ 在线版iTowns初始化成功!');
      
      // 添加所有项目标记
      setTimeout(() => {
        this.projects.forEach(project => {
          this.addProjectMarker(project);
        });
        console.log(`📍 已添加 ${this.projects.length} 个项目标记`);
      }, 1000); // 延迟1秒确保地图完全加载
      
      return true;
      
    } catch (error) {
      console.error('❌ iTowns初始化失败:', error);
      this.isInitialized = false;
      return false;
    }
  }

  private addEarthAppearance(): void {
    if (!this.view) return;

    try {
      console.log('🌍 添加地球外观...');
      
      // 创建地球表面纹理球体
      const earthRadius = 6378137; // 地球半径
      const earthGeometry = new THREE.SphereGeometry(earthRadius * 0.999, 64, 64);
      
      // 创建地球材质 - 蓝绿色模拟陆地和海洋
      const earthMaterial = new THREE.MeshBasicMaterial({
        color: 0x4a90e2, // 海洋蓝色
        transparent: false
      });

      const earthSphere = new THREE.Mesh(earthGeometry, earthMaterial);
      earthSphere.name = 'earth_surface';
      
      this.view.scene.add(earthSphere);
      
      // 添加简单的大陆色块
      this.addContinents();
      
      console.log('✅ 地球外观添加成功');
    } catch (error) {
      console.warn('⚠️ 地球外观添加失败:', error);
    }
  }

  private addContinents(): void {
    if (!this.view) return;

    try {
      // 添加几个大陆色块
      const continentData = [
        { lat: 39, lng: 116, size: 800000, color: 0x228B22 }, // 亚洲 - 绿色
        { lat: 50, lng: 10, size: 600000, color: 0x32CD32 },  // 欧洲 - 浅绿
        { lat: 40, lng: -100, size: 900000, color: 0x90EE90 }, // 北美 - 更浅绿
        { lat: -15, lng: -60, size: 700000, color: 0x98FB98 }, // 南美 - 淡绿
        { lat: -25, lng: 135, size: 500000, color: 0xADFF2F }, // 澳洲 - 黄绿
      ];

      continentData.forEach(continent => {
        const geometry = new THREE.SphereGeometry(continent.size, 16, 16);
        const material = new THREE.MeshBasicMaterial({
          color: continent.color,
          transparent: true,
          opacity: 0.8
        });

        const continentMesh = new THREE.Mesh(geometry, material);
        
        // 转换坐标
        const earthRadius = 6378137;
        const lat = continent.lat * Math.PI / 180;
        const lng = continent.lng * Math.PI / 180;
        
        const x = earthRadius * 1.001 * Math.cos(lat) * Math.cos(lng);
        const y = earthRadius * 1.001 * Math.sin(lat);
        const z = earthRadius * 1.001 * Math.cos(lat) * Math.sin(lng);
        
        continentMesh.position.set(x, y, z);
        continentMesh.name = `continent_${continent.lat}_${continent.lng}`;
        
        this.view.scene.add(continentMesh);
      });
      
      console.log('✅ 大陆色块添加成功');
    } catch (error) {
      console.warn('⚠️ 大陆添加失败:', error);
    }
  }

  private async addOnlineMapLayer(): Promise<void> {
    if (!this.view) return;

    try {
      console.log('🗺️ 加载在线地图瓦片...');
      
      // 使用国内可访问的瓦片源 - 高德地图（无需key的版本）
      const wmtsSource = new itowns.WMTSSource({
        url: 'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x=${x}&y=${y}&z=${z}',
        crs: 'EPSG:3857',
        name: 'AutoNavi',
        format: 'image/png',
        tileMatrixSet: 'PM'
      });

      // 创建颜色图层
      const colorLayer = new itowns.ColorLayer('OSM', {
        source: wmtsSource
      });

      // 添加图层到视图
      await this.view.addLayer(colorLayer);
      
      // 强制更新视图
      this.view.notifyChange();
      
      console.log('✅ 高德地图在线瓦片加载成功!');
      
    } catch (error) {
      console.warn('⚠️ 在线地图加载失败，尝试备用源:', error);
      
      // 备用方案：使用OpenStreetMap瓦片
      try {
        const osmSource = new itowns.WMTSSource({
          url: 'https://tile.openstreetmap.org/${z}/${x}/${y}.png',
          crs: 'EPSG:3857',
          name: 'OpenStreetMap',
          format: 'image/png',
          tileMatrixSet: 'PM'
        });

        const osmLayer = new itowns.ColorLayer('OSM_Backup', {
          source: osmSource
        });

        await this.view.addLayer(osmLayer);
        this.view.notifyChange();
        
        console.log('✅ OpenStreetMap备用地图加载成功!');
        
      } catch (backupError) {
        console.error('❌ 所有在线地图源都失败:', backupError);
        console.log('🎨 回退到彩色地球模式');
      }
    }
  }

  private setupControls(): void {
    if (!this.view || !this.view.controls) return;

    try {
      // iTowns 2.45.1的控制器配置
      const controls = this.view.controls;
      
      // 设置控制器参数（如果方法存在）
      if (typeof controls.setZoomInFactor === 'function') {
        controls.setZoomInFactor(1.5);
      }
      if (typeof controls.setZoomOutFactor === 'function') {
        controls.setZoomOutFactor(0.7);
      }
      
      // 新版本的控制器配置方式
      if (controls.dollyInScale !== undefined) {
        controls.dollyInScale = 0.9;
      }
      if (controls.dollyOutScale !== undefined) {  
        controls.dollyOutScale = 1.1;
      }
      
      console.log('✅ 地图控制器配置完成');
    } catch (error) {
      console.warn('⚠️ 控制器配置失败，使用默认设置:', error);
    }
  }

  public flyToLocation(lat: number, lng: number, range: number = 500000): void {
    if (!this.view || !this.isInitialized) {
      console.warn('⚠️ 地图未初始化，无法飞行');
      return;
    }

    console.log(`🚁 飞行到基坑: ${lat}, ${lng}, 视距: ${range}m`);
    
    try {
      // 创建目标坐标
      const targetCoord = new itowns.Coordinates('EPSG:4326', lng, lat, 0);
      
      // 优化的飞行参数，适合观看基坑
      if (this.view.controls && this.view.controls.lookAtCoordinate) {
        this.view.controls.lookAtCoordinate({
          coord: targetCoord,
          range: range, // 较近的视距，便于观看基坑细节
          tilt: 60, // 增大倾斜角，更好观看基坑
          heading: 0
        }, 2500); // 稍慢的飞行动画
        
        console.log(`✅ 飞行到基坑: ${lat}, ${lng}`);
      } else {
        console.warn('⚠️ 控制器不可用，尝试直接设置相机位置');
        
        // 备用方案：直接设置相机
        const position = targetCoord.as('EPSG:4978').xyz();
        if (this.view.camera) {
          // 设置相机位置到目标上方
          this.view.camera.position.set(
            position.x + range * 0.3, 
            position.y + range * 0.3, 
            position.z + range * 0.5
          );
          this.view.camera.lookAt(position.x, position.y, position.z);
          this.view.notifyChange();
        }
      }
      
    } catch (error) {
      console.error('❌ 飞行失败:', error);
    }
  }

  public addProjectMarker(project: Project): void {
    if (!this.view || !this.isInitialized) {
      console.warn('⚠️ 地图未初始化，跳过标记添加');
      return;
    }

    try {
      console.log(`🕳️ 添加基坑项目: ${project.name} 深度: ${project.depth}m`);
      
      // 使用iTowns的坐标系统进行精确定位
      const coords = new itowns.Coordinates('EPSG:4326', project.location.lng, project.location.lat, 0);
      const position = coords.as('EPSG:4978').xyz();
      
      // 创建基坑组
      const excavationGroup = new THREE.Group();
      excavationGroup.name = `excavation_${project.id}`;
      excavationGroup.userData = { project };
      
      // 1. 创建基坑的坑洞 (圆柱形凹陷) - 大幅放大以便在地球视角下可见
      const pitRadius = Math.max(project.depth * 500, 50000); // 大幅放大半径，最小50km
      const pitDepth = project.depth * 1000; // 大幅放大深度，便于3D可视化
      
      // 创建坑洞几何体 (反向圆柱)
      const pitGeometry = new THREE.CylinderGeometry(
        pitRadius, // 顶部半径
        pitRadius * 0.8, // 底部半径 (斜坡形状)
        pitDepth, // 深度
        32, // 分段
        1,
        true // 开口向上
      );
      
      // 基坑材质 - 明显的土壤颜色
      const pitMaterial = new THREE.MeshBasicMaterial({
        color: 0x8B4513, // 棕土色
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        emissive: 0x442211, // 添加微弱发光，增强可见性
        emissiveIntensity: 0.2
      });
      
      const pitMesh = new THREE.Mesh(pitGeometry, pitMaterial);
      pitMesh.position.set(0, -pitDepth/2, 0); // 向下挖掘
      pitMesh.name = `pit_${project.id}`;
      
      // 2. 创建基坑边缘标记环
      const ringGeometry = new THREE.RingGeometry(pitRadius, pitRadius + 10000, 32); // 增大环宽度
      const ringColors = {
        completed: 0x00ff00,  // 绿色
        active: 0xff0000,     // 红色  
        planning: 0xffff00    // 黄色
      };
      
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: ringColors[project.status],
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      });
      
      const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
      ringMesh.rotation.x = -Math.PI / 2; // 水平放置
      ringMesh.name = `ring_${project.id}`;
      
      // 3. 创建高度标识柱
      const poleHeight = pitDepth * 1.5;
      const poleGeometry = new THREE.CylinderGeometry(5000, 5000, poleHeight, 8); // 增大柱子半径
      const poleMaterial = new THREE.MeshBasicMaterial({
        color: ringColors[project.status],
        emissive: ringColors[project.status],
        emissiveIntensity: 0.3
      });
      
      const poleMesh = new THREE.Mesh(poleGeometry, poleMaterial);
      poleMesh.position.set(0, poleHeight/2, 0);
      poleMesh.name = `pole_${project.id}`;
      
      // 组装基坑
      excavationGroup.add(pitMesh);
      excavationGroup.add(ringMesh);
      excavationGroup.add(poleMesh);
      
      // 精确定位到地球表面
      excavationGroup.position.set(position.x, position.y, position.z);
      
      // 让基坑朝向地心 (法向量对齐)
      const normal = new THREE.Vector3(position.x, position.y, position.z).normalize();
      excavationGroup.lookAt(
        position.x + normal.x * 1000,
        position.y + normal.y * 1000, 
        position.z + normal.z * 1000
      );
      
      // 添加到场景
      this.view.scene.add(excavationGroup);
      
      console.log(`✅ 基坑创建成功: ${project.name}`);
      console.log(`   📍 位置: [${position.x.toFixed(0)}, ${position.y.toFixed(0)}, ${position.z.toFixed(0)}]`);
      console.log(`   🕳️ 半径: ${pitRadius}m, 深度: ${pitDepth}m`);
      
      // 强制刷新
      this.view.notifyChange();
      
    } catch (error) {
      console.error(`❌ 基坑创建失败: ${project.name}`, error);
    }
  }

  public updateRenderQuality(quality: number): void {
    if (!this.view || !this.view.mainLoop?.gfxEngine?.renderer) return;

    try {
      const renderer = this.view.mainLoop.gfxEngine.renderer;
      
      switch (quality) {
        case 1: // 低质量 - 性能优先
          renderer.setPixelRatio(1);
          break;
        case 2: // 中等质量 - 平衡
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          break;
        case 3: // 高质量 - 画质优先
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
          break;
      }
      
      this.view.notifyChange();
      console.log(`✅ 渲染质量已调整为: ${['', '低', '中', '高'][quality]}`);
    } catch (error) {
      console.warn('⚠️ 渲染质量调整失败:', error);
    }
  }

  public debugMapStatus(): void {
    if (!this.view) {
      console.log('❌ 地图视图未初始化');
      return;
    }

    console.log('🔍 地图调试信息:');
    console.log('- 视图对象:', this.view);
    console.log('- 场景对象:', this.view.scene);
    console.log('- 相机位置:', this.view.camera?.position);
    console.log('- 图层数量:', this.view.getLayers?.()?.length || 0);
    
    // 查找场景中的基坑项目
    const excavations = [];
    this.view.scene.traverse((object) => {
      if (object.name && object.name.startsWith('excavation_')) {
        excavations.push({
          name: object.name,
          position: object.position,
          visible: object.visible,
          userData: object.userData
        });
      }
    });
    
    console.log(`🕳️ 找到 ${excavations.length} 个基坑项目:`);
    excavations.forEach(excavation => {
      console.log(`  - ${excavation.name}: 位置 ${excavation.position.x.toFixed(0)}, ${excavation.position.y.toFixed(0)}, ${excavation.position.z.toFixed(0)}, 可见: ${excavation.visible}`);
    });
    
    // 强制刷新和重绘
    if (this.view.notifyChange) {
      this.view.notifyChange();
      console.log('✅ 已触发地图重绘');
    }
  }

  public reloadProjectMarkers(): void {
    if (!this.view) return;
    
    // 移除现有基坑
    const excavationsToRemove = [];
    this.view.scene.traverse((object) => {
      if (object.name && object.name.startsWith('excavation_')) {
        excavationsToRemove.push(object);
      }
    });
    
    excavationsToRemove.forEach(excavation => {
      this.view!.scene.remove(excavation);
    });
    
    // 重新添加所有基坑项目
    this.projects.forEach(project => {
      this.addProjectMarker(project);
    });
    
    console.log(`✅ 重新加载了 ${this.projects.length} 个基坑项目`);
  }

  public dispose(): void {
    if (this.view) {
      this.view.dispose();
    }
  }
}

export const EnhancedEpicControlCenter: React.FC = () => {
  // 地图相关状态
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapControllerRef = useRef<iTownsMapController | null>(null);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // 天气相关状态
  const [weatherData, setWeatherData] = useState<Record<string, WeatherData>>({});
  const [weatherEnabled, setWeatherEnabled] = useState(true);
  const [loadingWeather, setLoadingWeather] = useState(false);

  // 界面控制状态
  const [activeTab, setActiveTab] = useState('map');
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [mapOpacity, setMapOpacity] = useState(1.0);
  const [renderQuality, setRenderQuality] = useState(2); // 1=低, 2=中, 3=高
  const [onlineMode, setOnlineMode] = useState(true); // 在线/离线模式

  // 简化的地图初始化
  useEffect(() => {
    const initMap = async () => {
      if (!mapContainerRef.current) {
        console.error('❌ 地图容器不存在');
        return;
      }

      console.log('🚀 开始简化地图初始化...');
      setMapStatus('loading');

      try {
        // 等待容器准备
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const controller = new iTownsMapController(mapContainerRef.current, onlineMode, DEMO_PROJECTS);
        const success = await controller.initialize();
        
        if (success) {
          mapControllerRef.current = controller;
          setMapStatus('ready');
          
          console.log('🎯 开始添加项目标记...');
          // 添加项目标记
          DEMO_PROJECTS.forEach(project => {
            controller.addProjectMarker(project);
          });
          
          console.log('✅ 地图和标记初始化完成');
        } else {
          setMapStatus('error');
        }
      } catch (error) {
        console.error('❌ 地图初始化失败:', error);
        setMapStatus('error');
      }
    };

    const timeoutId = setTimeout(initMap, 100);
    
    return () => {
      clearTimeout(timeoutId);
      if (mapControllerRef.current) {
        mapControllerRef.current.dispose();
      }
    };
  }, []);

  // 加载所有项目的天气数据
  const loadAllWeatherData = useCallback(async () => {
    if (!weatherEnabled) return;

    setLoadingWeather(true);
    const weatherMap: Record<string, WeatherData> = {};

    try {
      for (const project of DEMO_PROJECTS) {
        try {
          const data = await openMeteoService.getWeatherData(
            project.location.lat, 
            project.location.lng
          );
          
          weatherMap[project.id] = {
            temperature: data.current.temperature,
            humidity: data.current.humidity,
            windSpeed: data.current.windSpeed,
            description: data.current.description,
            icon: data.current.icon
          };
        } catch (error) {
          // 使用模拟数据作为后备
          weatherMap[project.id] = {
            temperature: 20 + Math.random() * 15,
            humidity: 50 + Math.random() * 30,
            windSpeed: 5 + Math.random() * 15,
            description: '晴朗',
            icon: '☀️'
          };
        }
      }

      setWeatherData(weatherMap);
    } catch (error) {
      console.warn('天气数据加载失败:', error);
    } finally {
      setLoadingWeather(false);
    }
  }, [weatherEnabled]);

  // 处理项目飞行
  const handleProjectFly = useCallback((project: Project) => {
    if (!mapControllerRef.current) return;

    console.log(`🎯 用户点击项目: ${project.name}`);
    console.log(`📍 项目坐标: ${project.location.lat}, ${project.location.lng}`);
    
    setCurrentProject(project);
    
    // 使用适合观看基坑的视距
    let flyRange = 500000; // 500km视距，确保3D视角观看巨型基坑
    
    console.log(`🚁 开始飞行到 ${project.name}，视距: ${flyRange}m`);
    
    mapControllerRef.current.flyToLocation(
      project.location.lat, 
      project.location.lng, 
      flyRange
    );
    
    setShowProjectDetails(true);
  }, []);

  // 渲染地图状态指示器
  const renderMapStatus = () => (
    <Card 
      size="small" 
      style={{ 
        marginBottom: 16,
        background: 'rgba(0, 217, 255, 0.1)',
        border: '1px solid rgba(0, 217, 255, 0.3)'
      }}
    >
      <Row align="middle" gutter={16}>
        <Col>
          <GlobalOutlined style={{ 
            fontSize: '24px', 
            color: mapStatus === 'ready' ? '#52c41a' : 
                   mapStatus === 'loading' ? '#1890ff' : '#ff4d4f' 
          }} />
        </Col>
        <Col flex={1}>
          <div>
            <Text strong style={{ color: '#ffffff' }}>iTowns地图引擎</Text>
            <br />
            <Text style={{ fontSize: '12px', color: '#ffffff80' }}>
              {mapStatus === 'ready' ? '✅ 地图已就绪' :
               mapStatus === 'loading' ? '🔄 正在加载...' : '❌ 加载失败'}
            </Text>
          </div>
        </Col>
        <Col>
          <Space size="small">
            <Switch 
              checked={weatherEnabled}
              onChange={setWeatherEnabled}
              checkedChildren="天气"
              unCheckedChildren="天气"
              size="small"
            />
            <Text style={{ fontSize: '10px', color: '#ffffff60' }}>
              {onlineMode ? '🌐 在线模式' : '🎨 彩色地球'}
            </Text>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  // 渲染项目列表
  const renderProjectList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {DEMO_PROJECTS.map(project => {
        const weather = weatherData[project.id];
        return (
          <motion.div
            key={project.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card 
              size="small" 
              hoverable
              onClick={() => handleProjectFly(project)}
              style={{
                background: currentProject?.id === project.id ? 
                  'linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(24, 144, 255, 0.1))' : 
                  'rgba(255, 255, 255, 0.05)',
                border: currentProject?.id === project.id ? 
                  '2px solid #00d9ff' : 
                  '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff'
              }}
            >
              <Row align="middle" gutter={8}>
                <Col span={2}>
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: project.status === 'completed' ? '#52c41a' :
                               project.status === 'active' ? '#faad14' : '#d9d9d9'
                  }} />
                </Col>
                <Col span={14}>
                  <div>
                    <Text strong style={{ fontSize: '13px', color: '#ffffff' }}>{project.name}</Text>
                    <br />
                    <Text style={{ fontSize: '11px', color: '#ffffff80' }}>
                      📍 {project.location.lat.toFixed(2)}°N, {project.location.lng.toFixed(2)}°E
                    </Text>
                  </div>
                </Col>
                <Col span={8}>
                  {weather && weatherEnabled ? (
                    <div style={{ textAlign: 'right', fontSize: '11px' }}>
                      <div>{weather.icon} {weather.temperature}°C</div>
                      <div>💨 {weather.windSpeed}km/h</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'right', fontSize: '11px' }}>
                      <div>🕳️ {project.depth}m</div>
                      <div>📊 {project.progress}%</div>
                    </div>
                  )}
                </Col>
              </Row>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );

  // 渲染天气总览
  const renderWeatherOverview = () => (
    <Row gutter={[8, 8]}>
      {DEMO_PROJECTS.map(project => {
        const weather = weatherData[project.id];
        if (!weather) return null;

        return (
          <Col span={8} key={project.id}>
            <Card 
              size="small" 
              style={{ 
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <div style={{ fontSize: '20px', marginBottom: 4 }}>{weather.icon}</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#00d9ff' }}>
                {weather.temperature}°C
              </div>
              <div style={{ fontSize: '10px', color: '#ffffff80' }}>
                {project.name.split('').slice(0, 4).join('')}
              </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#001122',
      padding: '20px',
      overflow: 'auto'
    }}>
      {/* 标题区域 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 20 }}
      >
        <Title level={2} style={{ margin: 0, color: '#00d9ff' }}>
          🌍 Epic控制中心
        </Title>
        <Text style={{ color: '#ffffff80' }}>
          iTowns地图引擎 + OpenMeteo天气系统 + 深基坑项目管理
        </Text>
      </motion.div>

      <Row gutter={16}>
        {/* 左侧控制面板 */}
        <Col span={8}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {renderMapStatus()}
            
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab} 
              size="small"
              items={[
                {
                  key: 'projects',
                  label: '🏗️ 项目',
                  children: renderProjectList()
                },
                {
                  key: 'weather',
                  label: '🌤️ 天气',
                  children: (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Button 
                        type="primary" 
                        size="small"
                        icon={<CloudOutlined />}
                        loading={loadingWeather}
                        onClick={loadAllWeatherData}
                        block
                      >
                        刷新天气数据
                      </Button>
                      {renderWeatherOverview()}
                    </Space>
                  )
                },
                {
                  key: 'settings',
                  label: '⚙️ 设置',
                  children: (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Text style={{ color: '#ffffff' }}>地图模式</Text>
                        <div style={{ marginTop: 8 }}>
                          <Switch
                            checked={onlineMode}
                            onChange={(checked) => {
                              setOnlineMode(checked);
                              // 重新初始化地图
                              setMapStatus('loading');
                              setTimeout(() => {
                                window.location.reload(); // 简单重载页面以应用新模式
                              }, 500);
                            }}
                            checkedChildren="在线"
                            unCheckedChildren="离线"
                          />
                          <Text style={{ fontSize: '11px', color: '#ffffff80', marginLeft: 8 }}>
                            {onlineMode ? '🌐 在线地图瓦片' : '🎨 彩色地球模式'}
                          </Text>
                        </div>
                      </div>
                      <div>
                        <Text style={{ color: '#ffffff' }}>地图透明度</Text>
                        <Slider
                          min={0.3}
                          max={1}
                          step={0.1}
                          value={mapOpacity}
                          onChange={setMapOpacity}
                        />
                      </div>
                      <div>
                        <Text style={{ color: '#ffffff' }}>渲染质量</Text>
                        <Slider
                          min={1}
                          max={3}
                          step={1}
                          value={renderQuality}
                          onChange={(value) => {
                            setRenderQuality(value);
                            if (mapControllerRef.current) {
                              mapControllerRef.current.updateRenderQuality(value);
                            }
                          }}
                          marks={{
                            1: '低',
                            2: '中',
                            3: '高'
                          }}
                        />
                        <Text style={{ fontSize: '11px', color: '#ffffff80' }}>
                          {renderQuality === 1 ? '性能优先，适合低端设备' :
                           renderQuality === 2 ? '平衡模式，推荐设置' :
                           '画质优先，需要高性能设备'}
                        </Text>
                      </div>
                      <Button 
                        size="small" 
                        icon={<EyeOutlined />}
                        onClick={() => setShowProjectDetails(!showProjectDetails)}
                      >
                        {showProjectDetails ? '隐藏' : '显示'}项目详情
                      </Button>
                      <Button 
                        size="small" 
                        icon={<SettingOutlined />}
                        onClick={() => {
                          if (mapControllerRef.current) {
                            mapControllerRef.current.debugMapStatus();
                          }
                        }}
                      >
                        调试地图
                      </Button>
                      <Button 
                        size="small" 
                        onClick={() => {
                          if (mapControllerRef.current) {
                            mapControllerRef.current.reloadProjectMarkers();
                          }
                        }}
                      >
                        🔄 重载标记
                      </Button>
                      <Button 
                        size="small" 
                        type="primary"
                        onClick={() => {
                          if (mapControllerRef.current) {
                            // 飞到上海中心查看标记
                            const shanghai = DEMO_PROJECTS.find(p => p.id === 'shanghai');
                            if (shanghai) {
                              mapControllerRef.current.flyToLocation(
                                shanghai.location.lat, 
                                shanghai.location.lng, 
                                300000 // 300km距离，3D视角观看基坑
                              );
                            }
                          }
                        }}
                      >
                        🎯 查看标记
                      </Button>
                    </Space>
                  )
                }
              ]}
            />
          </motion.div>
        </Col>

        {/* 右侧地图区域 */}
        <Col span={16}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card 
              title={`🌍 iTowns三维地球 (${onlineMode ? '在线模式' : '彩色地球'})`}
              extra={
                <Space>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {mapStatus === 'ready' ? `${DEMO_PROJECTS.length}个项目已加载` : '地图加载中...'}
                  </Text>
                  <Text type={onlineMode ? "info" : "success"} style={{ fontSize: '10px' }}>
                    {onlineMode ? '🌐 真实地图瓦片' : '🎨 蓝色海洋+绿色大陆'}
                  </Text>
                </Space>
              }
              style={{ height: '600px' }}
              styles={{ body: { padding: 0, height: 'calc(100% - 56px)' } }}
            >
              <div 
                ref={mapContainerRef}
                style={{ 
                  width: '100%', 
                  height: '100%',
                  opacity: mapOpacity,
                  transition: 'opacity 0.3s ease',
                  // 高质量显示优化
                  imageRendering: 'high-quality',
                  backfaceVisibility: 'hidden',
                  perspective: '1000px',
                  transformStyle: 'preserve-3d',
                  // 防止模糊
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale'
                }}
              />
              
              {/* 地图加载状态覆盖层 */}
              <AnimatePresence>
                {mapStatus === 'loading' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(255, 255, 255, 0.9)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10
                    }}
                  >
                    <div style={{ fontSize: '48px', marginBottom: 16 }}>🌍</div>
                    <Title level={4} style={{ color: '#1890ff' }}>
                      iTowns地图引擎启动中...
                    </Title>
                    <Progress percent={75} showInfo={false} style={{ width: 200 }} />
                    <Text type="secondary" style={{ marginTop: 8 }}>
                      正在加载OpenStreetMap瓦片数据
                    </Text>
                  </motion.div>
                )}
              </AnimatePresence>

              {mapStatus === 'error' && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(255, 255, 255, 0.9)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16
                }}>
                  <div style={{ fontSize: '48px' }}>❌</div>
                  <Title level={4} style={{ color: '#ff4d4f', margin: 0 }}>
                    地图加载失败
                  </Title>
                  <Text type="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
                    iTowns地图引擎初始化失败，可能原因：<br/>
                    • 网络连接问题<br/>
                    • WebGL支持问题<br/>
                    • 浏览器兼容性问题
                  </Text>
                  <Space>
                    <Button 
                      type="primary" 
                      onClick={() => window.location.reload()}
                      icon={<PlayCircleOutlined />}
                    >
                      刷新页面重试
                    </Button>
                    <Button 
                      onClick={() => {
                        setMapStatus('loading');
                        // 重新初始化
                        setTimeout(() => {
                          if (mapContainerRef.current) {
                            const controller = new iTownsMapController(mapContainerRef.current, onlineMode, DEMO_PROJECTS);
                            controller.initialize().then(success => {
                              if (success) {
                                mapControllerRef.current = controller;
                                setMapStatus('ready');
                              } else {
                                setMapStatus('error');
                              }
                            });
                          }
                        }, 500);
                      }}
                    >
                      重新尝试
                    </Button>
                  </Space>
                </div>
              )}
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* 项目详情浮层 */}
      <AnimatePresence>
        {showProjectDetails && currentProject && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 100 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 100 }}
            style={{
              position: 'fixed',
              top: '50%',
              right: '20px',
              transform: 'translateY(-50%)',
              zIndex: 1000
            }}
          >
            <Card 
              title={`🏗️ ${currentProject.name}`}
              extra={
                <Button 
                  type="text" 
                  size="small"
                  onClick={() => setShowProjectDetails(false)}
                >
                  ✕
                </Button>
              }
              style={{ width: 300 }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Statistic 
                  title="基坑深度" 
                  value={currentProject.depth} 
                  suffix="米"
                  valueStyle={{ color: '#1890ff' }}
                />
                <Progress 
                  percent={currentProject.progress} 
                  status={currentProject.status === 'completed' ? 'success' : 'active'}
                />
                {weatherData[currentProject.id] && (
                  <Card size="small">
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px' }}>
                        {weatherData[currentProject.id].icon}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                        {weatherData[currentProject.id].temperature}°C
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        💨 {weatherData[currentProject.id].windSpeed}km/h | 
                        💧 {weatherData[currentProject.id].humidity}%
                      </div>
                    </div>
                  </Card>
                )}
              </Space>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedEpicControlCenter;