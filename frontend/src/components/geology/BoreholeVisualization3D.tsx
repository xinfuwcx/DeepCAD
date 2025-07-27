/**
 * 钻孔3D可视化组件 - 为3号提供标准几何数据
 * 支持200万单元级别显示，实时质量反馈
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import { evaluateQuality, processCriticalRegions } from '../../services/geometryQualityService';
import { EnhancedBorehole } from '../../services/geologyService';

interface BoreholeVisualization3DProps {
  boreholes: EnhancedBorehole[];
  onQualityFeedback?: (feedback: any) => void;
  onGeometryChange?: (geometry: any) => void;
  meshSize?: number; // 3号建议的1.5-2.0m
  showQualityMetrics?: boolean;
  realTimeMode?: boolean; // 实时质量评估
}

interface BoreholeGeometry {
  vertices: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  materialZones: Array<{
    zoneId: string;
    startDepth: number;
    endDepth: number;
    color: THREE.Color;
    meshSize: number;
  }>;
}

const BoreholeVisualization3D: React.FC<BoreholeVisualization3DProps> = ({
  boreholes,
  onQualityFeedback,
  onGeometryChange,
  meshSize = 1.75, // 3号建议的中值
  showQualityMetrics = true,
  realTimeMode = true
}) => {
  const [geometry, setGeometry] = useState<BoreholeGeometry | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [responseTime, setResponseTime] = useState<number>(0);
  
  const geometryRef = useRef<THREE.BufferGeometry>();
  const qualityUpdateInterval = useRef<NodeJS.Timeout>();

  /**
   * 生成钻孔几何数据 - 为3号的Fragment组件准备
   */
  const generateBoreholeGeometry = useCallback((): BoreholeGeometry => {
    console.log('🔧 生成钻孔几何数据，目标网格尺寸:', meshSize);
    
    const totalPoints = boreholes.reduce((sum, bh) => sum + bh.soilLayers.length * 20, 0);
    const vertices = new Float32Array(totalPoints * 3);
    const colors = new Float32Array(totalPoints * 3);
    const indices: number[] = [];
    const materialZones: any[] = [];
    
    let vertexIndex = 0;
    let faceIndex = 0;

    boreholes.forEach((borehole, bhIndex) => {
      const { x, y } = borehole.coordinates;
      const radius = 0.075; // 15cm钻孔半径
      const segments = 8; // 8边形近似圆形

      borehole.soilLayers.forEach((layer, layerIndex) => {
        const startDepth = layer.topElevation;
        const endDepth = layer.bottomElevation;
        const layerHeight = Math.abs(endDepth - startDepth);
        
        // 材料颜色映射（基于3号的Material分区要求）
        const materialColor = getMaterialColor(layer.soilType);
        
        // 生成圆柱几何
        for (let seg = 0; seg < segments; seg++) {
          const angle1 = (seg / segments) * Math.PI * 2;
          const angle2 = ((seg + 1) / segments) * Math.PI * 2;
          
          // 顶面顶点
          const topX1 = x + Math.cos(angle1) * radius;
          const topY1 = y + Math.sin(angle1) * radius;
          const topZ1 = startDepth;
          
          const topX2 = x + Math.cos(angle2) * radius;
          const topY2 = y + Math.sin(angle2) * radius;
          const topZ2 = startDepth;
          
          // 底面顶点
          const bottomX1 = x + Math.cos(angle1) * radius;
          const bottomY1 = y + Math.sin(angle1) * radius;
          const bottomZ1 = endDepth;
          
          const bottomX2 = x + Math.cos(angle2) * radius;
          const bottomY2 = y + Math.sin(angle2) * radius;
          const bottomZ2 = endDepth;
          
          // 添加顶点
          vertices[vertexIndex * 3] = topX1;
          vertices[vertexIndex * 3 + 1] = topY1;
          vertices[vertexIndex * 3 + 2] = topZ1;
          colors[vertexIndex * 3] = materialColor.r;
          colors[vertexIndex * 3 + 1] = materialColor.g;
          colors[vertexIndex * 3 + 2] = materialColor.b;
          vertexIndex++;
          
          vertices[vertexIndex * 3] = topX2;
          vertices[vertexIndex * 3 + 1] = topY2;
          vertices[vertexIndex * 3 + 2] = topZ2;
          colors[vertexIndex * 3] = materialColor.r;
          colors[vertexIndex * 3 + 1] = materialColor.g;
          colors[vertexIndex * 3 + 2] = materialColor.b;
          vertexIndex++;
          
          vertices[vertexIndex * 3] = bottomX1;
          vertices[vertexIndex * 3 + 1] = bottomY1;
          vertices[vertexIndex * 3 + 2] = bottomZ1;
          colors[vertexIndex * 3] = materialColor.r;
          colors[vertexIndex * 3 + 1] = materialColor.g;
          colors[vertexIndex * 3 + 2] = materialColor.b;
          vertexIndex++;
          
          vertices[vertexIndex * 3] = bottomX2;
          vertices[vertexIndex * 3 + 1] = bottomY2;
          vertices[vertexIndex * 3 + 2] = bottomZ2;
          colors[vertexIndex * 3] = materialColor.r;
          colors[vertexIndex * 3 + 1] = materialColor.g;
          colors[vertexIndex * 3 + 2] = materialColor.b;
          vertexIndex++;
          
          // 创建两个三角面（四边形分解）
          const baseIndex = vertexIndex - 4;
          
          // 第一个三角形
          indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
          // 第二个三角形
          indices.push(baseIndex + 1, baseIndex + 3, baseIndex + 2);
          
          faceIndex += 2;
        }

        // 记录材料分区信息
        materialZones.push({
          zoneId: `borehole_${bhIndex}_layer_${layerIndex}`,
          startDepth,
          endDepth,
          color: materialColor,
          meshSize: calculateLayerMeshSize(layer.soilType, meshSize)
        });
      });
    });

    console.log('✅ 钻孔几何生成完成:', {
      顶点数: vertexIndex,
      三角面数: faceIndex,
      材料分区: materialZones.length,
      预估内存: `${(vertices.length * 4 / 1024 / 1024).toFixed(1)}MB`
    });

    return {
      vertices: vertices.slice(0, vertexIndex * 3),
      colors: colors.slice(0, vertexIndex * 3),
      indices: new Uint32Array(indices),
      materialZones
    };
  }, [boreholes, meshSize]);

  /**
   * 实时质量评估 - 响应时间<100ms
   */
  const performQualityEvaluation = useCallback(async (geometry: BoreholeGeometry) => {
    if (!realTimeMode) return;
    
    const startTime = performance.now();
    setIsProcessing(true);

    try {
      console.log('⚡ 开始实时质量评估...');
      
      // 为3号的Fragment组件准备数据
      const qualityFeedback = await evaluateQuality(
        geometry.vertices,
        geometry.indices,
        meshSize
      );

      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      setQualityMetrics(qualityFeedback.quality);
      setResponseTime(responseTime);
      
      // 通知父组件质量反馈
      if (onQualityFeedback) {
        onQualityFeedback({
          ...qualityFeedback,
          responseTime,
          geometryType: 'borehole_visualization',
          compatibleWith3: qualityFeedback.quality.estimatedElements <= 2000000
        });
      }

      console.log(`✅ 质量评估完成 (${responseTime.toFixed(1)}ms):`, {
        综合质量: qualityFeedback.quality.overallQuality,
        网格就绪: qualityFeedback.quality.meshReadiness,
        符合3号要求: qualityFeedback.quality.estimatedElements <= 2000000
      });

    } catch (error) {
      console.error('❌ 质量评估失败:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [meshSize, realTimeMode, onQualityFeedback]);

  /**
   * 处理几何变更
   */
  const handleGeometryChange = useCallback(() => {
    const newGeometry = generateBoreholeGeometry();
    setGeometry(newGeometry);
    
    // 通知父组件几何数据变更
    if (onGeometryChange) {
      onGeometryChange({
        vertices: newGeometry.vertices,
        indices: newGeometry.indices,
        materialZones: newGeometry.materialZones,
        qualityMetrics: qualityMetrics,
        timestamp: Date.now()
      });
    }

    // 执行质量评估
    if (realTimeMode) {
      performQualityEvaluation(newGeometry);
    }
  }, [generateBoreholeGeometry, performQualityEvaluation, qualityMetrics, onGeometryChange, realTimeMode]);

  // 初始化和数据变更时重新生成几何
  useEffect(() => {
    if (boreholes.length > 0) {
      handleGeometryChange();
    }
    
    // 设置实时更新定时器
    if (realTimeMode) {
      qualityUpdateInterval.current = setInterval(() => {
        if (geometry && !isProcessing) {
          performQualityEvaluation(geometry);
        }
      }, 5000); // 每5秒更新一次质量指标
    }

    return () => {
      if (qualityUpdateInterval.current) {
        clearInterval(qualityUpdateInterval.current);
      }
    };
  }, [boreholes, handleGeometryChange, geometry, isProcessing, performQualityEvaluation, realTimeMode]);

  if (!geometry) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p>正在生成钻孔几何数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gray-900">
      {/* 3D视口 */}
      <Canvas 
        camera={{ 
          position: [50, 50, 50], 
          fov: 50 
        }}
        gl={{ 
          antialias: true,
          powerPreference: "high-performance" // 为3号的200万单元优化
        }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[100, 100, 100]} intensity={1} />
        <pointLight position={[-100, -100, -100]} intensity={0.5} />
        
        {/* 钻孔几何体 */}
        <BoreholeGeometryMesh 
          geometry={geometry}
          geometryRef={geometryRef}
        />
        
        {/* 坐标轴 */}
        <axesHelper args={[20]} />
        
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxDistance={200}
          minDistance={10}
        />
      </Canvas>

      {/* 质量指标面板 */}
      {showQualityMetrics && qualityMetrics && (
        <QualityMetricsPanel 
          metrics={qualityMetrics}
          responseTime={responseTime}
          isProcessing={isProcessing}
          meshSize={meshSize}
        />
      )}

      {/* 钻孔信息面板 */}
      <BoreholeInfoPanel 
        boreholes={boreholes}
        geometry={geometry}
        onMeshSizeChange={(size) => {
          // 触发网格尺寸变更 - 更新几何配置
          console.log('更新网格尺寸:', size);
          // 调用几何参数更新服务
        }}
      />
    </div>
  );
};

/**
 * 钻孔几何体渲染组件
 */
const BoreholeGeometryMesh: React.FC<{
  geometry: BoreholeGeometry;
  geometryRef: React.MutableRefObject<THREE.BufferGeometry | undefined>;
}> = ({ geometry, geometryRef }) => {
  const meshRef = useRef<THREE.Mesh>();
  
  useEffect(() => {
    if (meshRef.current && geometry) {
      const bufferGeometry = new THREE.BufferGeometry();
      
      bufferGeometry.setAttribute('position', new THREE.BufferAttribute(geometry.vertices, 3));
      bufferGeometry.setAttribute('color', new THREE.BufferAttribute(geometry.colors, 3));
      bufferGeometry.setIndex(new THREE.BufferAttribute(geometry.indices, 1));
      
      bufferGeometry.computeVertexNormals();
      bufferGeometry.computeBoundingBox();
      
      meshRef.current.geometry = bufferGeometry;
      geometryRef.current = bufferGeometry;
      
      console.log('🎨 钻孔几何体渲染完成');
    }
  }, [geometry, geometryRef]);

  return (
    <mesh ref={meshRef}>
      <bufferGeometry />
      <meshPhongMaterial 
        vertexColors
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

/**
 * 质量指标面板 - 实时显示3号关心的指标
 */
const QualityMetricsPanel: React.FC<{
  metrics: any;
  responseTime: number;
  isProcessing: boolean;
  meshSize: number;
}> = ({ metrics, responseTime, isProcessing, meshSize }) => {
  const getQualityColor = (value: number) => {
    if (value >= 0.8) return 'text-green-400';
    if (value >= 0.65) return 'text-yellow-400'; // 3号的质量阈值
    return 'text-red-400';
  };

  return (
    <div className="absolute top-4 right-4 bg-black bg-opacity-80 p-4 rounded-lg text-white text-sm min-w-64">
      <h3 className="font-bold mb-2 text-blue-400">实时质量监控 (3号标准)</h3>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>响应时间:</span>
          <span className={responseTime < 100 ? 'text-green-400' : 'text-red-400'}>
            {responseTime.toFixed(1)}ms {responseTime < 100 ? '✓' : '⚠️'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>综合质量:</span>
          <span className={getQualityColor(metrics.overallQuality)}>
            {(metrics.overallQuality * 100).toFixed(1)}%
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>网格尺寸:</span>
          <span className={meshSize >= 1.5 && meshSize <= 2.0 ? 'text-green-400' : 'text-yellow-400'}>
            {meshSize.toFixed(1)}m
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>预估单元:</span>
          <span className={metrics.estimatedElements <= 2000000 ? 'text-green-400' : 'text-red-400'}>
            {(metrics.estimatedElements / 1000000).toFixed(1)}M
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>3号兼容:</span>
          <span className={metrics.meshReadiness ? 'text-green-400' : 'text-red-400'}>
            {metrics.meshReadiness ? '✅ 就绪' : '❌ 需优化'}
          </span>
        </div>
        
        {isProcessing && (
          <div className="flex items-center justify-center mt-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
            <span className="text-blue-400">评估中...</span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 钻孔信息面板
 */
const BoreholeInfoPanel: React.FC<{
  boreholes: EnhancedBorehole[];
  geometry: BoreholeGeometry;
  onMeshSizeChange: (size: number) => void;
}> = ({ boreholes, geometry, onMeshSizeChange }) => {
  return (
    <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 p-4 rounded-lg text-white text-sm">
      <h3 className="font-bold mb-2 text-green-400">钻孔统计</h3>
      
      <div className="space-y-1">
        <div>钻孔数量: {boreholes.length}</div>
        <div>材料分区: {geometry.materialZones.length}</div>
        <div>顶点数: {geometry.vertices.length / 3}</div>
        <div>三角面数: {geometry.indices.length / 3}</div>
      </div>
    </div>
  );
};

/**
 * 获取材料颜色
 */
const getMaterialColor = (soilType: string): THREE.Color => {
  const colorMap: Record<string, number> = {
    '粘土': 0x8B4513,
    '砂土': 0xF4A460,
    '淤泥': 0x2F4F4F,
    '岩石': 0x696969,
    '回填土': 0xDEB887,
    default: 0x808080
  };
  
  return new THREE.Color(colorMap[soilType] || colorMap.default);
};

/**
 * 计算图层网格尺寸
 */
const calculateLayerMeshSize = (soilType: string, baseMeshSize: number): number => {
  // 根据土层类型优化网格尺寸
  const sizeMultiplier: Record<string, number> = {
    '岩石': 1.2, // 岩石可以用较大网格
    '粘土': 1.0, // 标准网格
    '砂土': 0.9, // 砂土需要细化
    '淤泥': 0.8, // 淤泥最需要细化
    default: 1.0
  };
  
  const multiplier = sizeMultiplier[soilType] || sizeMultiplier.default;
  const result = baseMeshSize * multiplier;
  
  // 确保在3号要求的1.5-2.0m范围内
  return Math.max(1.5, Math.min(2.0, result));
};

export default BoreholeVisualization3D;