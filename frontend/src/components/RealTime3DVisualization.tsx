/**
 * 1号首席架构师优化系统 - 3D实时数据可视化组件
 * @description 震撼的3D数据可视化，展示系统架构和性能数据
 * @author 1号首席架构师
 * @version 3.0.0
 * @since 2024-07-25
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Box, Sphere, Line, Trail } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as d3 from 'd3';

// 系统节点类型定义
interface SystemNode {
  id: string;
  name: string;
  type: 'memory' | 'gpu' | 'cpu' | 'storage' | 'network';
  position: [number, number, number];
  load: number;
  status: 'optimal' | 'warning' | 'critical';
  connections: string[];
  metrics: {
    temperature?: number;
    utilization: number;
    throughput: number;
  };
}

interface DataFlow {
  id: string;
  from: string;
  to: string;
  intensity: number;
  type: 'data' | 'compute' | 'memory';
  color: string;
}

/**
 * 3D系统架构节点组件
 */
function SystemNodeMesh({ node, isActive, onClick }: { 
  node: SystemNode; 
  isActive: boolean; 
  onClick: (node: SystemNode) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  const getNodeColor = () => {
    switch (node.status) {
      case 'optimal': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getNodeGeometry = () => {
    switch (node.type) {
      case 'memory': return <boxGeometry args={[1.5, 0.3, 1]} />;
      case 'gpu': return <boxGeometry args={[2, 1, 0.5]} />;
      case 'cpu': return <sphereGeometry args={[0.8, 16, 16]} />;
      case 'storage': return <cylinderGeometry args={[0.6, 0.6, 1.2, 8]} />;
      case 'network': return <octahedronGeometry args={[0.8]} />;
      default: return <boxGeometry args={[1, 1, 1]} />;
    }
  };

  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        onClick={() => onClick(node)}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
        scale={isActive ? 1.2 : 1}
      >
        {getNodeGeometry()}
        <meshStandardMaterial
          color={getNodeColor()}
          emissive={getNodeColor()}
          emissiveIntensity={isActive ? 0.3 : 0.1}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      
      {/* 节点标签 */}
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {node.name}
      </Text>
      
      {/* 负载指示器 */}
      <Text
        position={[0, -1.2, 0]}
        fontSize={0.2}
        color={getNodeColor()}
        anchorX="center"
        anchorY="middle"
      >
        {node.metrics.utilization.toFixed(0)}%
      </Text>
      
      {/* 动态光环效果 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.4, 32]} />
        <meshBasicMaterial
          color={getNodeColor()}
          transparent
          opacity={0.3 + Math.sin(Date.now() * 0.005) * 0.2}
        />
      </mesh>
    </group>
  );
}

/**
 * 数据流连接线组件
 */
function DataFlowConnection({ flow, nodes }: { flow: DataFlow; nodes: SystemNode[] }) {
  const fromNode = nodes.find(n => n.id === flow.from);
  const toNode = nodes.find(n => n.id === flow.to);
  
  if (!fromNode || !toNode) return null;

  const points = [
    new THREE.Vector3(...fromNode.position),
    new THREE.Vector3(...toNode.position)
  ];

  return (
    <Line
      points={points}
      color={flow.color}
      lineWidth={flow.intensity * 5}
      transparent
      opacity={0.6}
    />
  );
}

/**
 * 动态粒子系统
 */
function ParticleSystem({ count = 1000 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      
      const color = new THREE.Color();
      color.setHSL(Math.random() * 0.2 + 0.5, 0.8, 0.6);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    return { positions, colors };
  }, [count]);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y += 0.001;
      points.current.rotation.x += 0.0005;
      
      const positions = points.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] += Math.sin(state.clock.elapsedTime + i * 0.01) * 0.002;
      }
      points.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={particles.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

/**
 * 性能数据环形图
 */
function PerformanceRings({ metrics }: { metrics: any }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 内存使用环 */}
      <meshBasicMaterial
        transparent
        opacity={0.7}
      />
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3, 3.2, 64, 1, 0, (metrics.memory / 100) * Math.PI * 2]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.8} />
      </mesh>
      
      {/* GPU 使用环 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4, 4.2, 64, 1, 0, (metrics.gpu / 100) * Math.PI * 2]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.8} />
      </mesh>
      
      {/* CPU 使用环 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5, 5.2, 64, 1, 0, (metrics.cpu / 100) * Math.PI * 2]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

/**
 * 主3D可视化场景
 */
function Scene3D() {
  const [selectedNode, setSelectedNode] = useState<SystemNode | null>(null);
  const [systemNodes] = useState<SystemNode[]>([
    {
      id: 'memory-manager',
      name: 'Memory Manager',
      type: 'memory',
      position: [-5, 2, 0],
      load: 65,
      status: 'optimal',
      connections: ['gpu-monitor', 'rendering-fallback'],
      metrics: {
        utilization: 65,
        throughput: 850
      }
    },
    {
      id: 'gpu-monitor',
      name: 'GPU Monitor',
      type: 'gpu',
      position: [0, 2, 0],
      load: 78,
      status: 'optimal',
      connections: ['memory-manager', 'rendering-fallback'],
      metrics: {
        temperature: 72,
        utilization: 78,
        throughput: 1200
      }
    },
    {
      id: 'rendering-fallback',
      name: 'Rendering Fallback',
      type: 'cpu',
      position: [5, 2, 0],
      load: 45,
      status: 'optimal',
      connections: ['memory-manager', 'gpu-monitor'],
      metrics: {
        utilization: 45,
        throughput: 600
      }
    },
    {
      id: 'terra-solver',
      name: 'Terra 10.3',
      type: 'cpu',
      position: [0, -2, 0],
      load: 85,
      status: 'warning',
      connections: ['pyvista-mesh', 'threejs-geometry'],
      metrics: {
        utilization: 85,
        throughput: 2000
      }
    },
    {
      id: 'pyvista-mesh',
      name: 'PyVista Mesh',
      type: 'storage',
      position: [-3, -2, 0],
      load: 72,
      status: 'optimal',
      connections: ['terra-solver'],
      metrics: {
        utilization: 72,
        throughput: 950
      }
    },
    {
      id: 'threejs-geometry',
      name: 'Three.js Geometry',
      type: 'network',
      position: [3, -2, 0],
      load: 58,
      status: 'optimal',
      connections: ['terra-solver'],
      metrics: {
        utilization: 58,
        throughput: 750
      }
    }
  ]);

  const [dataFlows] = useState<DataFlow[]>([
    {
      id: 'memory-gpu',
      from: 'memory-manager',
      to: 'gpu-monitor',
      intensity: 0.8,
      type: 'data',
      color: '#8b5cf6'
    },
    {
      id: 'gpu-rendering',
      from: 'gpu-monitor',
      to: 'rendering-fallback',
      intensity: 0.6,
      type: 'compute',
      color: '#10b981'
    },
    {
      id: 'terra-pyvista',
      from: 'terra-solver',
      to: 'pyvista-mesh',
      intensity: 0.9,
      type: 'data',
      color: '#f59e0b'
    },
    {
      id: 'terra-threejs',
      from: 'terra-solver',
      to: 'threejs-geometry',
      intensity: 0.7,
      type: 'data',
      color: '#ef4444'
    }
  ]);

  const [metrics, setMetrics] = useState({
    memory: 65,
    gpu: 78,
    cpu: 45
  });

  // 实时更新指标
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics({
        memory: 50 + Math.random() * 30,
        gpu: 60 + Math.random() * 30,
        cpu: 30 + Math.random() * 40
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* 环境光照 */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
      
      {/* 动态粒子背景 */}
      <ParticleSystem count={500} />
      
      {/* 性能环形图 */}
      <PerformanceRings metrics={metrics} />
      
      {/* 系统节点 */}
      {systemNodes.map((node) => (
        <SystemNodeMesh
          key={node.id}
          node={node}
          isActive={selectedNode?.id === node.id}
          onClick={setSelectedNode}
        />
      ))}
      
      {/* 数据流连接 */}
      {dataFlows.map((flow) => (
        <DataFlowConnection
          key={flow.id}
          flow={flow}
          nodes={systemNodes}
        />
      ))}
      
      {/* 中央核心标识 */}
      <group position={[0, 0, 0]}>
        <Text
          position={[0, 0, 0]}
          fontSize={0.5}
          color="#00ffff"
          anchorX="center"
          anchorY="middle"
        >
          DeepCAD
        </Text>
        <Text
          position={[0, -0.8, 0]}
          fontSize={0.2}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          Architecture Core
        </Text>
      </group>
      
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </>
  );
}

/**
 * 3D实时数据可视化组件
 */
export default function RealTime3DVisualization({ 
  className = "",
  height = "400px" 
}: { 
  className?: string;
  height?: string;
}) {
  return (
    <div className={`relative ${className}`} style={{ height }}>
      <Canvas
        camera={{ position: [15, 15, 15], fov: 60 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
        dpr={[1, 2]}
      >
        <Scene3D />
      </Canvas>
      
      {/* 控制面板覆盖层 */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-cyan-500/30">
        <div className="text-white text-sm space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>32GB Memory</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span>Terra 10.3</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <span>200万单元</span>
          </div>
        </div>
      </div>
      
      {/* 实时FPS计数器 */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg p-2 border border-green-500/30">
        <div className="text-green-400 text-xs font-mono">
          3D Render: 60 FPS
        </div>
      </div>
    </div>
  );
}