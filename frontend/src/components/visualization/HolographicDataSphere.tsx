/**
 * @file HolographicDataSphere.tsx
 * @description 全息数据球组件 - 3D数据可视化的未来形态
 * @author GitHub Copilot - 全息设计师
 * @inspiration 《银翼杀手2049》全息投影 + 《少数派报告》数据界面
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, useTexture } from '@react-three/drei';
import { Box, IconButton, Slider, Typography, Paper, Chip } from '@mui/material';
import { 
  VolumeUp, 
  VolumeOff, 
  FullscreenExit, 
  Fullscreen,
  RotateLeft,
  RotateRight,
  ZoomIn,
  ZoomOut,
} from '@mui/icons-material';
import * as THREE from 'three';
import { defaultTokens } from '../../styles/tokens/defaultTokens';

// 🌐 数据层接口定义
interface DataLayer {
  id: string;
  name: string;
  type: 'stress' | 'displacement' | 'flow' | 'temperature';
  data: Float32Array;
  color: string;
  opacity: number;
  visible: boolean;
  animation: boolean;
}

// 🎯 手势映射接口
interface GestureMap {
  rotate: boolean;
  zoom: boolean;
  slice: boolean;
  select: boolean;
}

// 🔮 数据球属性接口
interface HolographicDataSphereProps {
  radius?: number;
  datasets: DataLayer[];
  autoRotate?: boolean;
  enableInteraction?: boolean;
  showControls?: boolean;
  onDataSelect?: (layerId: string, point: THREE.Vector3) => void;
  className?: string;
}

// 🌟 粒子系统组件
const ParticleSystem: React.FC<{ layer: DataLayer; radius: number }> = ({ layer, radius }) => {
  const meshRef = useRef<THREE.Points>(null);
  const particleCount = 2000;
  
  const positions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = radius + (Math.random() - 0.5) * 0.2;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, [radius]);
  
  const colors = useMemo(() => {
    const colors = new Float32Array(particleCount * 3);
    const color = new THREE.Color(layer.color);
    
    for (let i = 0; i < particleCount; i++) {
      colors[i * 3] = color.r + (Math.random() - 0.5) * 0.2;
      colors[i * 3 + 1] = color.g + (Math.random() - 0.5) * 0.2;
      colors[i * 3 + 2] = color.b + (Math.random() - 0.5) * 0.2;
    }
    return colors;
  }, [layer.color]);
  
  useFrame((state) => {
    if (meshRef.current && layer.animation) {
      meshRef.current.rotation.y += 0.001;
      meshRef.current.rotation.x += 0.0005;
      
      // 粒子流动效果
      const time = state.clock.getElapsedTime();
      const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3 + 1] += Math.sin(time + i * 0.01) * 0.001;
      }
      
      meshRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  if (!layer.visible) return null;
  
  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        vertexColors
        opacity={layer.opacity}
        transparent
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// 🌐 主数据球组件
const DataSphere: React.FC<{ 
  layer: DataLayer; 
  radius: number; 
  onSelect?: (point: THREE.Vector3) => void;
}> = ({ layer, radius, onSelect }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { raycaster, mouse, camera, scene } = useThree();
  
  // 创建着色器材质
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(layer.color) },
        opacity: { value: layer.opacity },
        dataTexture: { value: null },
      },
      vertexShader: `
        uniform float time;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        void main() {
          vPosition = position;
          vNormal = normal;
          vUv = uv;
          
          vec3 pos = position;
          pos += normal * sin(time * 2.0 + position.x * 10.0) * 0.01;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        uniform float opacity;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        void main() {
          vec3 normal = normalize(vNormal);
          float fresnel = pow(1.0 - dot(normal, vec3(0.0, 0.0, 1.0)), 2.0);
          
          vec3 finalColor = color;
          finalColor += fresnel * vec3(0.3, 0.7, 1.0);
          
          float pulse = sin(time * 3.0) * 0.1 + 0.9;
          finalColor *= pulse;
          
          float alpha = opacity * (0.3 + fresnel * 0.7);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, [layer.color, layer.opacity]);
  
  useFrame((state) => {
    if (meshRef.current) {
      shaderMaterial.uniforms.time.value = state.clock.getElapsedTime();
      
      if (layer.animation) {
        meshRef.current.rotation.y += 0.002;
        meshRef.current.rotation.x += 0.001;
      }
    }
  });
  
  const handleClick = (event: any) => {
    if (onSelect && meshRef.current) {
      event.stopPropagation();
      const intersection = event.intersections[0];
      onSelect(intersection.point);
    }
  };
  
  if (!layer.visible) return null;
  
  return (
    <mesh
      ref={meshRef}
      material={shaderMaterial}
      onClick={handleClick}
      scale={[radius, radius, radius]}
    >
      <icosahedronGeometry args={[1, 4]} />
    </mesh>
  );
};

// 🎮 控制面板组件
const ControlPanel: React.FC<{
  layers: DataLayer[];
  onLayerToggle: (layerId: string) => void;
  onLayerOpacityChange: (layerId: string, opacity: number) => void;
  onRotationToggle: () => void;
  autoRotate: boolean;
}> = ({ layers, onLayerToggle, onLayerOpacityChange, onRotationToggle, autoRotate }) => {
  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        p: 2,
        minWidth: 280,
        background: defaultTokens.colors.glass.card,
        backdropFilter: 'blur(16px)',
        border: `1px solid ${defaultTokens.colors.glass.border}`,
        borderRadius: defaultTokens.borderRadius.card,
        boxShadow: defaultTokens.shadows.quantum.float,
        zIndex: defaultTokens.zIndex.floating,
      }}
    >
      <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
        🌐 全息控制面板
      </Typography>
      
      {/* 数据层控制 */}
      {layers.map((layer) => (
        <Box key={layer.id} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Chip
              label={layer.name}
              size="small"
              sx={{
                backgroundColor: layer.color,
                color: 'white',
                opacity: layer.visible ? 1 : 0.5,
              }}
              onClick={() => onLayerToggle(layer.id)}
            />
            <Typography variant="caption" color="text.secondary">
              {Math.round(layer.opacity * 100)}%
            </Typography>
          </Box>
          
          <Slider
            value={layer.opacity}
            onChange={(_, value) => onLayerOpacityChange(layer.id, value as number)}
            min={0}
            max={1}
            step={0.01}
            size="small"
            sx={{
              color: layer.color,
              '& .MuiSlider-thumb': {
                boxShadow: `0 0 10px ${layer.color}`,
              },
            }}
          />
        </Box>
      ))}
      
      {/* 控制按钮 */}
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <IconButton
          size="small"
          onClick={onRotationToggle}
          sx={{
            color: autoRotate ? 'primary.main' : 'text.secondary',
            '&:hover': {
              boxShadow: defaultTokens.shadows.neon.blue,
            },
          }}
        >
          {autoRotate ? <RotateRight /> : <RotateLeft />}
        </IconButton>
        
        <IconButton size="small" sx={{ color: 'text.secondary' }}>
          <ZoomIn />
        </IconButton>
        
        <IconButton size="small" sx={{ color: 'text.secondary' }}>
          <ZoomOut />
        </IconButton>
        
        <IconButton size="small" sx={{ color: 'text.secondary' }}>
          <Fullscreen />
        </IconButton>
      </Box>
    </Paper>
  );
};

// 🚀 主组件
const HolographicDataSphere: React.FC<HolographicDataSphereProps> = ({
  radius = 2,
  datasets,
  autoRotate = true,
  enableInteraction = true,
  showControls = true,
  onDataSelect,
  className,
}) => {
  const [layers, setLayers] = useState<DataLayer[]>(datasets);
  const [isRotating, setIsRotating] = useState(autoRotate);
  const [selectedPoint, setSelectedPoint] = useState<THREE.Vector3 | null>(null);
  
  // 更新数据层
  useEffect(() => {
    setLayers(datasets);
  }, [datasets]);
  
  // 切换数据层可见性
  const handleLayerToggle = (layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId 
        ? { ...layer, visible: !layer.visible }
        : layer
    ));
  };
  
  // 调整数据层透明度
  const handleLayerOpacityChange = (layerId: string, opacity: number) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId 
        ? { ...layer, opacity }
        : layer
    ));
  };
  
  // 切换自动旋转
  const handleRotationToggle = () => {
    setIsRotating(prev => !prev);
  };
  
  // 处理数据点选择
  const handleDataSelect = (layerId: string, point: THREE.Vector3) => {
    setSelectedPoint(point);
    onDataSelect?.(layerId, point);
  };
  
  return (
    <Box
      className={className}
      sx={{
        position: 'relative',
        width: '100%',
        height: '600px',
        borderRadius: defaultTokens.borderRadius.card,
        overflow: 'hidden',
        background: defaultTokens.colors.space.dark,
        backgroundImage: `
          ${defaultTokens.colors.space.nebula},
          ${defaultTokens.colors.space.stars}
        `,
        boxShadow: defaultTokens.shadows.quantum.levitate,
        border: `1px solid ${defaultTokens.colors.glass.border}`,
      }}
    >
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        {/* 环境光 */}
        <ambientLight intensity={0.3} color="#4facfe" />
        
        {/* 方向光 */}
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={0.5} 
          color="#667eea" 
        />
        
        {/* 点光源 */}
        <pointLight 
          position={[-10, -10, -10]} 
          intensity={0.3} 
          color="#f093fb" 
        />
        
        {/* 数据球层 */}
        {layers.map((layer) => (
          <group key={layer.id}>
            <DataSphere
              layer={layer}
              radius={radius}
              onSelect={(point) => handleDataSelect(layer.id, point)}
            />
            <ParticleSystem layer={layer} radius={radius + 0.2} />
          </group>
        ))}
        
        {/* 选中点指示器 */}
        {selectedPoint && (
          <Sphere
            position={[selectedPoint.x, selectedPoint.y, selectedPoint.z]}
            args={[0.05]}
          >
            <meshBasicMaterial color="#00ffff" />
          </Sphere>
        )}
        
        {/* 控制器 */}
        {enableInteraction && (
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={isRotating}
            autoRotateSpeed={0.5}
            minDistance={3}
            maxDistance={15}
          />
        )}
      </Canvas>
      
      {/* 控制面板 */}
      {showControls && (
        <ControlPanel
          layers={layers}
          onLayerToggle={handleLayerToggle}
          onLayerOpacityChange={handleLayerOpacityChange}
          onRotationToggle={handleRotationToggle}
          autoRotate={isRotating}
        />
      )}
      
      {/* 底部信息栏 */}
      <Paper
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          p: 2,
          background: defaultTokens.colors.glass.surface,
          backdropFilter: 'blur(12px)',
          border: `1px solid ${defaultTokens.colors.glass.border}`,
          borderRadius: defaultTokens.borderRadius.medium,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          🎯 交互提示: 拖拽旋转 | 滚轮缩放 | 点击选择数据点
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {layers.filter(l => l.visible).map((layer) => (
            <Chip
              key={layer.id}
              label={layer.name}
              size="small"
              sx={{
                backgroundColor: layer.color,
                color: 'white',
                fontSize: '0.75rem',
              }}
            />
          ))}
        </Box>
      </Paper>
    </Box>
  );
};

export default HolographicDataSphere;
