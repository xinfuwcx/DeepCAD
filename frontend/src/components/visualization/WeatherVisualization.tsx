/**
 * DeepCAD 天气可视化组件
 * 实时天气图层叠加 + 温度/降水热力图 + 风向风速矢量图 + 雷达图层和云图
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
// TODO: 重构此组件以使用 OpenMeteoService
// import { freeWeatherService, WeatherData, WeatherMapLayer, WindVector } from '../../services/freeWeatherService';
import { openMeteoService, WeatherData } from '../../services/OpenMeteoService';

// 临时接口定义，待重构
interface WeatherMapLayer {
  id: string;
  name: string;
  type: 'temperature' | 'precipitation' | 'wind' | 'cloud' | 'radar';
  visible: boolean;
  opacity: number;
}

interface WindVector {
  x: number;
  y: number;
  speed: number;
  direction: number;
}
import { designTokens } from '../../design/tokens';

interface WeatherVisualizationProps {
  width: number;
  height: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  onWeatherUpdate?: (weather: WeatherData) => void;
}

interface LayerControl {
  id: string;
  name: string;
  type: 'temperature' | 'precipitation' | 'wind' | 'cloud' | 'radar';
  visible: boolean;
  opacity: number;
  icon: string;
}

export const WeatherVisualization: React.FC<WeatherVisualizationProps> = ({
  width,
  height,
  bounds,
  onWeatherUpdate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const layerMeshes = useRef<Map<string, THREE.Mesh>>(new Map());
  const windVectorGroup = useRef<THREE.Group | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [layers, setLayers] = useState<LayerControl[]>([
    { id: 'temperature', name: '温度', type: 'temperature', visible: true, opacity: 0.7, icon: '🌡️' },
    { id: 'precipitation', name: '降水', type: 'precipitation', visible: false, opacity: 0.6, icon: '🌧️' },
    { id: 'wind', name: '风场', type: 'wind', visible: false, opacity: 0.8, icon: '💨' },
    { id: 'cloud', name: '云图', type: 'cloud', visible: false, opacity: 0.8, icon: '☁️' },
    { id: 'radar', name: '雷达', type: 'radar', visible: false, opacity: 0.7, icon: '📡' }
  ]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);

  // 初始化Three.js场景
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x001122);

    const camera = new THREE.OrthographicCamera(
      -width / 2, width / 2,
      height / 2, -height / 2,
      0.1, 1000
    );
    camera.position.z = 100;

    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      premultipliedAlpha: false
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);

    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    // 添加方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(100, 100, 50);
    scene.add(directionalLight);

    containerRef.current.appendChild(renderer.domElement);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    // 初始化风向量组
    const windGroup = new THREE.Group();
    windGroup.name = 'WindVectors';
    scene.add(windGroup);
    windVectorGroup.current = windGroup;

    setIsInitialized(true);

    // 渲染循环
    const animate = () => {
      requestAnimationFrame(animate);
      
      // 更新动画
      if (windVectorGroup.current) {
        windVectorGroup.current.rotation.z += 0.001 * animationSpeed;
      }
      
      // 更新图层动画
      layerMeshes.current.forEach((mesh, layerId) => {
        if (layerId === 'radar') {
          // 雷达扫描动画
          const time = Date.now() * 0.002 * animationSpeed;
          (mesh.material as THREE.ShaderMaterial).uniforms.time.value = time;
        } else if (layerId === 'cloud') {
          // 云层移动动画
          const time = Date.now() * 0.0005 * animationSpeed;
          (mesh.material as THREE.ShaderMaterial).uniforms.time.value = time;
        }
      });
      
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      // 安全卸载 renderer.domElement（仅当确为其父节点时）
      try {
        const mountNode = containerRef.current;
        const dom = renderer?.domElement;
        if (mountNode && dom && dom.parentNode === mountNode) {
          mountNode.removeChild(dom);
        }
        renderer?.dispose?.();
      } catch (e) {
        // 忽略卸载期间的偶发性错误，避免 NotFoundError 影响卸载流程
        console.warn('[WeatherVisualization] cleanup warning:', e);
      }
    };
  }, [width, height, animationSpeed]);

  // 获取天气数据
  const updateWeatherData = useCallback(async () => {
    setIsUpdating(true);
    try {
      const centerLat = (bounds.north + bounds.south) / 2;
      const centerLng = (bounds.east + bounds.west) / 2;
      
      const weather = await freeWeatherService.getCurrentWeather(centerLat, centerLng);
      setCurrentWeather(weather);
      onWeatherUpdate?.(weather);
    } catch (error) {
      console.error('Failed to update weather data:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [bounds, onWeatherUpdate]);

  // 初始化后获取天气数据
  useEffect(() => {
    if (isInitialized) {
      updateWeatherData();
      // 每5分钟更新一次
      const interval = setInterval(updateWeatherData, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isInitialized, updateWeatherData]);

  // 创建温度热力图
  const createTemperatureLayer = useCallback(() => {
    if (!sceneRef.current) return;

    const layer = freeWeatherService.generateTemperatureHeatmap(bounds, 200);
    
    const geometry = new THREE.PlaneGeometry(width, height);
    const texture = new THREE.DataTexture(
      layer.data,
      layer.width,
      layer.height,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    texture.needsUpdate = true;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'TemperatureLayer';
    sceneRef.current.add(mesh);
    layerMeshes.current.set('temperature', mesh);
  }, [bounds, width, height]);

  // 创建降水热力图
  const createPrecipitationLayer = useCallback(() => {
    if (!sceneRef.current) return;

    const layer = freeWeatherService.generatePrecipitationHeatmap(bounds, 150);
    
    const geometry = new THREE.PlaneGeometry(width, height);
    const texture = new THREE.DataTexture(
      layer.data,
      layer.width,
      layer.height,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    texture.needsUpdate = true;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.6
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'PrecipitationLayer';
    mesh.visible = false;
    sceneRef.current.add(mesh);
    layerMeshes.current.set('precipitation', mesh);
  }, [bounds, width, height]);

  // 创建风向量场
  const createWindVectors = useCallback(() => {
    if (!sceneRef.current || !windVectorGroup.current) return;

    // 清除旧的风向量
    windVectorGroup.current.clear();

    const vectors = freeWeatherService.generateWindVectors(bounds, 25);
    
    vectors.forEach(vector => {
      // 风向箭头
      const arrowGeometry = new THREE.ConeGeometry(3, 12, 4);
      const arrowMaterial = new THREE.MeshBasicMaterial({ 
        color: vector.color,
        transparent: true,
        opacity: 0.8
      });
      const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
      
      // 位置转换
      const x = (vector.lng - (bounds.west + bounds.east) / 2) * width / (bounds.east - bounds.west);
      const y = (vector.lat - (bounds.south + bounds.north) / 2) * height / (bounds.north - bounds.south);
      
      arrow.position.set(x, y, 1);
      arrow.rotation.z = -(vector.direction * Math.PI / 180) + Math.PI / 2;
      
      // 根据风速调整大小
      const scale = Math.max(0.3, Math.min(2, vector.speed / 10));
      arrow.scale.setScalar(scale);
      
      windVectorGroup.current!.add(arrow);
    });

    windVectorGroup.current.visible = false;
  }, [bounds, width, height]);

  // 创建云图层
  const createCloudLayer = useCallback(() => {
    if (!sceneRef.current) return;

    const layer = freeWeatherService.generateCloudLayer(bounds, 180);
    
    const geometry = new THREE.PlaneGeometry(width, height);
    
    // 使用着色器材质实现云层动画
    const material = new THREE.ShaderMaterial({
      uniforms: {
        cloudTexture: { value: new THREE.DataTexture(
          layer.data,
          layer.width,
          layer.height,
          THREE.RGBAFormat,
          THREE.FloatType
        )},
        time: { value: 0 },
        opacity: { value: 0.8 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D cloudTexture;
        uniform float time;
        uniform float opacity;
        varying vec2 vUv;
        
        void main() {
          vec2 animatedUv = vUv + vec2(time * 0.02, time * 0.01);
          vec4 cloud = texture2D(cloudTexture, animatedUv);
          
          // 添加动态云层效果
          float noise = sin(animatedUv.x * 20.0 + time) * cos(animatedUv.y * 15.0 + time) * 0.1;
          cloud.a += noise;
          cloud.a = clamp(cloud.a, 0.0, 1.0);
          
          gl_FragColor = vec4(cloud.rgb, cloud.a * opacity);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending
    });
    
    material.uniforms.cloudTexture.value.needsUpdate = true;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'CloudLayer';
    mesh.visible = false;
    mesh.position.z = 0.5;
    sceneRef.current.add(mesh);
    layerMeshes.current.set('cloud', mesh);
  }, [bounds, width, height]);

  // 创建雷达图层
  const createRadarLayer = useCallback(() => {
    if (!sceneRef.current) return;

    const layer = freeWeatherService.generateRadarLayer(bounds, 120);
    
    const geometry = new THREE.PlaneGeometry(width, height);
    
    // 雷达扫描着色器
    const material = new THREE.ShaderMaterial({
      uniforms: {
        radarTexture: { value: new THREE.DataTexture(
          layer.data,
          layer.width,
          layer.height,
          THREE.RGBAFormat,
          THREE.FloatType
        )},
        time: { value: 0 },
        center: { value: new THREE.Vector2(0.5, 0.5) },
        opacity: { value: 0.7 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D radarTexture;
        uniform float time;
        uniform vec2 center;
        uniform float opacity;
        varying vec2 vUv;
        
        void main() {
          vec4 radar = texture2D(radarTexture, vUv);
          
          // 雷达扫描效果
          vec2 pos = vUv - center;
          float angle = atan(pos.y, pos.x);
          float sweepAngle = time * 2.0;
          float sweep = sin(angle - sweepAngle + 3.14159);
          sweep = smoothstep(0.0, 0.2, sweep);
          
          radar.a *= sweep;
          radar.a = clamp(radar.a, 0.0, 1.0);
          
          gl_FragColor = vec4(radar.rgb, radar.a * opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    material.uniforms.radarTexture.value.needsUpdate = true;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'RadarLayer';
    mesh.visible = false;
    mesh.position.z = 1;
    sceneRef.current.add(mesh);
    layerMeshes.current.set('radar', mesh);
  }, [bounds, width, height]);

  // 初始化所有图层
  useEffect(() => {
    if (isInitialized) {
      createTemperatureLayer();
      createPrecipitationLayer();
      createWindVectors();
      createCloudLayer();
      createRadarLayer();
    }
  }, [isInitialized, createTemperatureLayer, createPrecipitationLayer, createWindVectors, createCloudLayer, createRadarLayer]);

  // 切换图层可见性
  const toggleLayer = useCallback((layerId: string) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id === layerId) {
        const newVisible = !layer.visible;
        
        // 更新Three.js对象可见性
        if (layerId === 'wind' && windVectorGroup.current) {
          windVectorGroup.current.visible = newVisible;
        } else {
          const mesh = layerMeshes.current.get(layerId);
          if (mesh) {
            mesh.visible = newVisible;
          }
        }
        
        return { ...layer, visible: newVisible };
      }
      return layer;
    }));
  }, []);

  // 调整图层透明度
  const updateLayerOpacity = useCallback((layerId: string, opacity: number) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id === layerId) {
        // 更新Three.js材质透明度
        if (layerId === 'wind' && windVectorGroup.current) {
          windVectorGroup.current.children.forEach(child => {
            if (child instanceof THREE.Mesh) {
              (child.material as THREE.MeshBasicMaterial).opacity = opacity;
            }
          });
        } else {
          const mesh = layerMeshes.current.get(layerId);
          if (mesh) {
            if (mesh.material instanceof THREE.ShaderMaterial) {
              mesh.material.uniforms.opacity.value = opacity;
            } else {
              (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
            }
          }
        }
        
        return { ...layer, opacity };
      }
      return layer;
    }));
  }, []);

  return (
    <div style={{ position: 'relative', width, height }}>
      {/* Three.js 容器 */}
      <div ref={containerRef} style={{ width, height }} />

      {/* 天气信息面板 */}
      <AnimatePresence>
        {currentWeather && (
          <motion.div
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              background: 'rgba(0, 0, 0, 0.85)',
              borderRadius: '12px',
              padding: '16px',
              minWidth: '280px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
          >
            <div style={{ color: 'white', fontSize: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px', marginRight: '12px' }}>
                  {currentWeather.icon}
                </span>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {currentWeather.city} {currentWeather.temperature}°C
                  </div>
                  <div style={{ opacity: 0.8 }}>{currentWeather.description}</div>
                </div>
                {isUpdating && (
                  <div style={{ marginLeft: 'auto' }}>
                    <div style={{ 
                      width: '16px', 
                      height: '16px', 
                      border: '2px solid #ffffff40',
                      borderTop: '2px solid #ffffff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                  </div>
                )}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div>💨 风速: {currentWeather.windSpeed} m/s</div>
                <div>🧭 风向: {currentWeather.windDirection}°</div>
                <div>💧 湿度: {currentWeather.humidity}%</div>
                <div>📊 气压: {currentWeather.pressure} hPa</div>
                <div>☁️ 云量: {currentWeather.cloudCover}%</div>
                <div>🌧️ 降水: {currentWeather.precipitation}mm</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 图层控制面板 */}
      <motion.div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(0, 0, 0, 0.85)',
          borderRadius: '12px',
          padding: '16px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
      >
        <h3 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '16px' }}>
          天气图层
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {layers.map(layer => (
            <div key={layer.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => toggleLayer(layer.id)}
                style={{
                  background: layer.visible ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: 'white',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  minWidth: '80px'
                }}
              >
                <span>{layer.icon}</span>
                <span>{layer.name}</span>
              </button>
              
              {layer.visible && (
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={layer.opacity}
                  onChange={(e) => updateLayerOpacity(layer.id, parseFloat(e.target.value))}
                  style={{
                    width: '60px',
                    height: '4px',
                    background: '#333',
                    outline: 'none',
                    borderRadius: '2px'
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* 更新按钮 */}
        <button
          onClick={updateWeatherData}
          disabled={isUpdating}
          style={{
            background: '#10b981',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 12px',
            color: 'white',
            fontSize: '12px',
            cursor: isUpdating ? 'not-allowed' : 'pointer',
            marginTop: '12px',
            width: '100%',
            opacity: isUpdating ? 0.6 : 1
          }}
        >
          {isUpdating ? '更新中...' : '🔄 更新天气'}
        </button>

        {/* 动画速度控制 */}
        <div style={{ marginTop: '12px' }}>
          <label style={{ color: 'white', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            动画速度
          </label>
          <input
            type="range"
            min="0"
            max="3"
            step="0.5"
            value={animationSpeed}
            onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: '4px',
              background: '#333',
              outline: 'none',
              borderRadius: '2px'
            }}
          />
        </div>
      </motion.div>

      {/* CSS动画 */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default WeatherVisualization;