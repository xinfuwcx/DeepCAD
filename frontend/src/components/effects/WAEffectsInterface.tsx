/**
 * DeepCAD WA效应界面组件
 * 1号架构师 - 震撼视觉效果的高级动画系统集成
 * 包含粒子系统、波场效应、动态扭曲、能量波纹等高级视觉效果
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Row, Col, Button, Slider, Switch, Typography, Select, Progress } from 'antd';
import { 
  ThunderboltOutlined,
  RadarChartOutlined,
  BgColorsOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import * as THREE from 'three';
import { designTokens } from '../../design/tokens';

const { Title, Text } = Typography;
const { Option } = Select;

// ==================== 类型定义 ====================

interface WAEffect {
  id: string;
  name: string;
  type: 'particle' | 'wave' | 'distortion' | 'energy' | 'fluid';
  enabled: boolean;
  intensity: number;
  speed: number;
  color: string;
  parameters: Record<string, any>;
}

interface WAEffectsInterfaceProps {
  className?: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
  onEffectUpdate?: (effects: WAEffect[]) => void;
}

// ==================== 预设效果配置 ====================

const DEFAULT_EFFECTS: WAEffect[] = [
  {
    id: 'particle_storm',
    name: '粒子风暴',
    type: 'particle',
    enabled: true,
    intensity: 0.8,
    speed: 0.5,
    color: '#00d9ff',
    parameters: {
      count: 5000,
      size: 2,
      lifetime: 3,
      spread: 100
    }
  },
  {
    id: 'energy_waves',
    name: '能量波场',
    type: 'wave',
    enabled: true,
    intensity: 0.6,
    speed: 0.3,
    color: '#ff6b35',
    parameters: {
      frequency: 0.5,
      amplitude: 20,
      ripples: 8
    }
  },
  {
    id: 'space_distortion',
    name: '空间扭曲',
    type: 'distortion',
    enabled: false,
    intensity: 0.4,
    speed: 0.2,
    color: '#a855f7',
    parameters: {
      strength: 0.1,
      radius: 50,
      turbulence: 0.3
    }
  },
  {
    id: 'quantum_field',
    name: '量子场效应',
    type: 'energy',
    enabled: true,
    intensity: 0.7,
    speed: 0.4,
    color: '#10b981',
    parameters: {
      density: 0.8,
      coherence: 0.6,
      entanglement: 0.9
    }
  },
  {
    id: 'fluid_dynamics',
    name: '流场动力学',
    type: 'fluid',
    enabled: false,
    intensity: 0.5,
    speed: 0.6,
    color: '#3b82f6',
    parameters: {
      viscosity: 0.1,
      pressure: 0.8,
      turbulence: 0.4
    }
  }
];

// ==================== 主组件 ====================

export const WAEffectsInterface: React.FC<WAEffectsInterfaceProps> = ({
  className = '',
  style = {},
  width = 800,
  height = 600,
  onEffectUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationIdRef = useRef<number | null>(null);
  
  const [effects, setEffects] = useState<WAEffect[]>(DEFAULT_EFFECTS);
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState('default');
  const [globalIntensity, setGlobalIntensity] = useState(0.8);
  const [performanceMode, setPerformanceMode] = useState(false);

  // 初始化Three.js场景
  useEffect(() => {
    if (!canvasRef.current) return;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 100;
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: !performanceMode,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(performanceMode ? 1 : Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // 添加基础光照
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // 启动渲染循环
    startAnimation();

    return () => {
      stopAnimation();
      renderer.dispose();
    };
  }, [width, height, performanceMode]);

  // 更新效果配置时重新生成场景
  useEffect(() => {
    updateScene();
    onEffectUpdate?.(effects);
  }, [effects, globalIntensity]);

  // 开始动画
  const startAnimation = useCallback(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;

    const animate = () => {
      if (!isPlaying) return;
      
      // 更新所有效果
      updateEffects();
      
      // 渲染场景
      rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
      
      animationIdRef.current = requestAnimationFrame(animate);
    };
    
    animate();
  }, [isPlaying]);

  // 停止动画
  const stopAnimation = useCallback(() => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
  }, []);

  // 更新场景中的效果
  const updateScene = useCallback(() => {
    if (!sceneRef.current) return;

    // 清除现有效果（保留光照）
    const objectsToRemove = sceneRef.current.children.filter(
      child => !(child instanceof THREE.Light)
    );
    objectsToRemove.forEach(obj => sceneRef.current!.remove(obj));

    // 根据启用的效果重新创建场景对象
    effects.forEach(effect => {
      if (!effect.enabled) return;
      
      switch (effect.type) {
        case 'particle':
          createParticleSystem(effect);
          break;
        case 'wave':
          createWaveField(effect);
          break;
        case 'distortion':
          createDistortionField(effect);
          break;
        case 'energy':
          createEnergyField(effect);
          break;
        case 'fluid':
          createFluidDynamics(effect);
          break;
      }
    });
  }, [effects]);

  // 创建粒子系统
  const createParticleSystem = useCallback((effect: WAEffect) => {
    if (!sceneRef.current) return;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(effect.parameters.count * 3);
    const colors = new Float32Array(effect.parameters.count * 3);
    const sizes = new Float32Array(effect.parameters.count);

    const color = new THREE.Color(effect.color);

    for (let i = 0; i < effect.parameters.count; i++) {
      const i3 = i * 3;
      
      // 随机位置
      positions[i3] = (Math.random() - 0.5) * effect.parameters.spread;
      positions[i3 + 1] = (Math.random() - 0.5) * effect.parameters.spread;
      positions[i3 + 2] = (Math.random() - 0.5) * effect.parameters.spread;
      
      // 颜色变化
      const colorVariation = 0.3;
      colors[i3] = color.r + (Math.random() - 0.5) * colorVariation;
      colors[i3 + 1] = color.g + (Math.random() - 0.5) * colorVariation;
      colors[i3 + 2] = color.b + (Math.random() - 0.5) * colorVariation;
      
      // 随机大小
      sizes[i] = effect.parameters.size * (0.5 + Math.random() * 0.5);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        intensity: { value: effect.intensity * globalIntensity }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float intensity;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * intensity * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float distance = length(gl_PointCoord - vec2(0.5));
          if (distance > 0.5) discard;
          
          float alpha = 1.0 - distance * 2.0;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true
    });

    const particles = new THREE.Points(geometry, material);
    particles.userData = { effectId: effect.id, type: 'particle' };
    sceneRef.current.add(particles);
  }, [globalIntensity]);

  // 创建波场效应
  const createWaveField = useCallback((effect: WAEffect) => {
    if (!sceneRef.current) return;

    const geometry = new THREE.PlaneGeometry(100, 100, 128, 128);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        frequency: { value: effect.parameters.frequency },
        amplitude: { value: effect.parameters.amplitude * effect.intensity * globalIntensity },
        color: { value: new THREE.Color(effect.color) }
      },
      vertexShader: `
        uniform float time;
        uniform float frequency;
        uniform float amplitude;
        varying vec2 vUv;
        varying float vElevation;
        
        void main() {
          vUv = uv;
          
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          float elevation = sin(modelPosition.x * frequency + time) * 
                           sin(modelPosition.y * frequency + time) * amplitude;
          modelPosition.z += elevation;
          vElevation = elevation;
          
          vec4 viewPosition = viewMatrix * modelPosition;
          vec4 projectedPosition = projectionMatrix * viewPosition;
          
          gl_Position = projectedPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying vec2 vUv;
        varying float vElevation;
        
        void main() {
          float alpha = 0.3 + abs(vElevation) * 0.02;
          vec3 finalColor = color + vElevation * 0.01;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      wireframe: true
    });

    const waveMesh = new THREE.Mesh(geometry, material);
    waveMesh.rotation.x = -Math.PI / 2;
    waveMesh.userData = { effectId: effect.id, type: 'wave' };
    sceneRef.current.add(waveMesh);
  }, [globalIntensity]);

  // 创建扭曲场
  const createDistortionField = useCallback((effect: WAEffect) => {
    // 实现空间扭曲效果...
    console.log('Creating distortion field:', effect);
  }, []);

  // 创建能量场
  const createEnergyField = useCallback((effect: WAEffect) => {
    if (!sceneRef.current) return;

    const geometry = new THREE.SphereGeometry(30, 64, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        density: { value: effect.parameters.density * effect.intensity * globalIntensity },
        color: { value: new THREE.Color(effect.color) }
      },
      vertexShader: `
        uniform float time;
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
          vPosition = position;
          vNormal = normal;
          
          vec3 pos = position + normal * sin(time + position.x * 0.1) * 2.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float density;
        uniform vec3 color;
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
          float noise = sin(vPosition.x * 0.1 + time) * 
                        sin(vPosition.y * 0.1 + time) * 
                        sin(vPosition.z * 0.1 + time);
          
          float alpha = (noise + 1.0) * 0.5 * density;
          vec3 finalColor = color + noise * 0.2;
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true
    });

    const energyField = new THREE.Mesh(geometry, material);
    energyField.userData = { effectId: effect.id, type: 'energy' };
    sceneRef.current.add(energyField);
  }, [globalIntensity]);

  // 创建流体动力学
  const createFluidDynamics = useCallback((effect: WAEffect) => {
    // 实现流体动力学效果...
    console.log('Creating fluid dynamics:', effect);
  }, []);

  // 更新所有效果的动画
  const updateEffects = useCallback(() => {
    if (!sceneRef.current) return;

    const time = Date.now() * 0.001;

    sceneRef.current.children.forEach(object => {
      if (object.userData.effectId) {
        const effect = effects.find(e => e.id === object.userData.effectId);
        if (!effect) return;

        // 更新着色器时间uniform
        if ((object as any).material?.uniforms?.time) {
          (object as any).material.uniforms.time.value = time * effect.speed;
        }

        // 根据效果类型更新特定动画
        switch (object.userData.type) {
          case 'particle':
            // 粒子系统动画
            if ((object as THREE.Points).geometry) {
              const positions = (object as THREE.Points).geometry.attributes.position;
              // 可以在这里添加粒子位置更新逻辑
            }
            break;
          case 'energy':
            // 能量场旋转
            object.rotation.y = time * 0.2;
            object.rotation.x = time * 0.1;
            break;
        }
      }
    });
  }, [effects]);

  // 播放/暂停控制
  const togglePlayback = useCallback(() => {
    setIsPlaying(prev => {
      const newState = !prev;
      if (newState) {
        startAnimation();
      } else {
        stopAnimation();
      }
      return newState;
    });
  }, [startAnimation, stopAnimation]);

  // 更新单个效果
  const updateEffect = useCallback((effectId: string, updates: Partial<WAEffect>) => {
    setEffects(prev => prev.map(effect => 
      effect.id === effectId ? { ...effect, ...updates } : effect
    ));
  }, []);

  // 重置所有效果
  const resetEffects = useCallback(() => {
    setEffects(DEFAULT_EFFECTS);
    setGlobalIntensity(0.8);
  }, []);

  return (
    <motion.div
      className={`wa-effects-interface ${className}`}
      style={{
        width,
        height,
        background: 'linear-gradient(135deg, #0a0a0a, #1a1a2e)',
        borderRadius: designTokens.borderRadius.lg,
        border: '1px solid rgba(0, 217, 255, 0.2)',
        overflow: 'hidden',
        ...style
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* 控制面板 */}
      <motion.div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          zIndex: 10,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(10px)',
          borderRadius: designTokens.borderRadius.md,
          padding: 16,
          border: '1px solid rgba(0, 217, 255, 0.3)'
        }}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col span={6}>
            <Title level={5} style={{ color: '#00d9ff', margin: 0 }}>
              ⚡ WA效应控制中心
            </Title>
          </Col>
          
          <Col span={6}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                type={isPlaying ? 'default' : 'primary'}
                icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={togglePlayback}
                size="small"
              >
                {isPlaying ? '暂停' : '播放'}
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={resetEffects}
                size="small"
              >
                重置
              </Button>
            </div>
          </Col>
          
          <Col span={6}>
            <div style={{ color: '#ffffff80', fontSize: '12px' }}>
              全局强度
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={globalIntensity}
                onChange={setGlobalIntensity}
                style={{ margin: '0 8px' }}
              />
              {Math.round(globalIntensity * 100)}%
            </div>
          </Col>
          
          <Col span={6}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: '#ffffff80', fontSize: '12px' }}>性能模式</Text>
              <Switch
                size="small"
                checked={performanceMode}
                onChange={setPerformanceMode}
              />
            </div>
          </Col>
        </Row>
      </motion.div>

      {/* 效果列表 */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          zIndex: 10,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(10px)',
          borderRadius: designTokens.borderRadius.md,
          padding: 16,
          border: '1px solid rgba(0, 217, 255, 0.3)'
        }}
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Row gutter={[8, 8]}>
          {effects.map((effect, index) => (
            <Col key={effect.id} span={Math.floor(24 / effects.length)}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  size="small"
                  style={{
                    background: effect.enabled 
                      ? `linear-gradient(135deg, ${effect.color}20, ${effect.color}10)`
                      : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${effect.enabled ? effect.color : '#ffffff20'}`,
                    borderRadius: 8
                  }}
                  bodyStyle={{ padding: '8px' }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <Switch
                      size="small"
                      checked={effect.enabled}
                      onChange={(enabled) => updateEffect(effect.id, { enabled })}
                      style={{ marginBottom: 4 }}
                    />
                    <div style={{ color: '#ffffff', fontSize: '10px', marginBottom: 4 }}>
                      {effect.name}
                    </div>
                    <Slider
                      min={0}
                      max={1}
                      step={0.1}
                      value={effect.intensity}
                      onChange={(intensity) => updateEffect(effect.id, { intensity })}
                      disabled={!effect.enabled}
                      style={{ margin: '0 4px' }}
                    />
                  </div>
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>
      </motion.div>

      {/* Three.js Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
    </motion.div>
  );
};

export default WAEffectsInterface;