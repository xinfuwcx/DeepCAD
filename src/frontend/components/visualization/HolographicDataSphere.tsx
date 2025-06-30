import React, { useRef, useState, useEffect } from 'react';
import { Box, styled, Typography, Chip, IconButton, Stack, Tooltip } from '@mui/material';
import { RotateLeft, LayersOutlined, Visibility, FilterTiltShift, Screenshot, Timeline } from '@mui/icons-material';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html, Stats } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette, SSAO } from '@react-three/postprocessing';
import { Vector3, Color, MeshPhongMaterial, SphereGeometry, BufferGeometry } from 'three';
import { quantumTokens } from '../../styles/tokens/quantumTokens';

/**
 * 全息数据球组件
 * 实现科技感的3D数据可视化
 */

// 数据层类型
export type DataLayerType = 'stress' | 'displacement' | 'flow' | 'geology' | 'temperature';

// 数据点类型
interface DataPoint {
  id: string;
  position: [number, number, number];
  value: number; // 标准化值 0-1
  label?: string;
  layerType: DataLayerType;
}

// 数据层定义
interface DataLayer {
  id: string;
  name: string;
  type: DataLayerType;
  color: string;
  points: DataPoint[];
  visible: boolean;
  opacity: number;
  size: number;
}

// 获取数据层的颜色
const getLayerColor = (type: DataLayerType): string => {
  switch (type) {
    case 'stress':
      return quantumTokens.colors.neonStress;
    case 'displacement':
      return quantumTokens.colors.neonDisplacement;
    case 'flow':
      return quantumTokens.colors.neonFlow;
    case 'temperature':
      return quantumTokens.colors.neonWarning;
    case 'geology':
      return quantumTokens.colors.engineeringSoil;
    default:
      return quantumTokens.colors.quantumBrightEnd;
  }
};

// 容器样式
const DataSphereContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  minHeight: '400px',
  borderRadius: quantumTokens.borderRadius.lg,
  overflow: 'hidden',
  backgroundColor: 'rgba(10, 14, 39, 0.3)',
  backdropFilter: 'blur(8px)',
}));

// 控制面板样式
const ControlPanel = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: 16,
  left: 16,
  right: 16,
  padding: 8,
  backdropFilter: 'blur(10px)',
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
  borderRadius: quantumTokens.borderRadius.md,
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}));

// 信息面板样式
const InfoPanel = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 16,
  right: 16,
  padding: 12,
  backdropFilter: 'blur(10px)',
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
  borderRadius: quantumTokens.borderRadius.md,
  zIndex: 10,
  maxWidth: '250px',
}));

// 层控制样式
const LayerControl = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 16,
  left: 16,
  padding: 12,
  backdropFilter: 'blur(10px)',
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
  borderRadius: quantumTokens.borderRadius.md,
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}));

// 数据点样式
const DataPointChip = styled(Chip)<{ active?: boolean; layertype: DataLayerType }>(({ active = false, layertype }) => ({
  backgroundColor: active ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.2)',
  color: getLayerColor(layertype),
  border: `1px solid ${getLayerColor(layertype)}`,
  boxShadow: active ? `0 0 8px ${getLayerColor(layertype)}` : 'none',
  transition: quantumTokens.animation.transitions.normal,
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    boxShadow: `0 0 8px ${getLayerColor(layertype)}`,
  },
}));

// 数据点渲染组件
const DataPoints: React.FC<{ layer: DataLayer }> = ({ layer }) => {
  return (
    <>
      {layer.points.map((point) => (
        <DataPoint
          key={point.id}
          point={point}
          color={layer.color}
          size={layer.size}
          opacity={layer.opacity}
        />
      ))}
    </>
  );
};

// 单个数据点
const DataPoint: React.FC<{
  point: DataPoint;
  color: string;
  size: number;
  opacity: number;
}> = ({ point, color, size, opacity }) => {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (ref.current) {
      // 轻微的呼吸效果
      ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.05);
      
      if (hovered) {
        ref.current.scale.setScalar(1.2 + Math.sin(state.clock.elapsedTime * 4) * 0.1);
      }
    }
  });

  return (
    <mesh
      ref={ref}
      position={new Vector3(...point.position)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[size * (0.1 + point.value * 0.9), 8, 8]} />
      <meshPhongMaterial
        color={color}
        emissive={color}
        emissiveIntensity={hovered ? 2 : 0.5}
        transparent
        opacity={opacity}
      />
      {hovered && point.label && (
        <Html distanceFactor={10}>
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: '4px 8px',
              borderRadius: '4px',
              color: 'white',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {point.label}: {(point.value * 100).toFixed(1)}%
          </div>
        </Html>
      )}
    </mesh>
  );
};

// 核心球体
const CoreSphere: React.FC = () => {
  const sphereRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (sphereRef.current) {
      sphereRef.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <mesh ref={sphereRef}>
      <sphereGeometry args={[1.5, 32, 32]} />
      <meshPhongMaterial
        color={quantumTokens.colors.quantumVoid}
        transparent
        opacity={0.1}
        wireframe
      />
    </mesh>
  );
};

// 格点
const Grid: React.FC = () => {
  return (
    <>
      <gridHelper
        args={[10, 20, new Color(quantumTokens.colors.quantumDeepStart), new Color(quantumTokens.colors.quantumDeepStart)]}
        position={[0, -3, 0]}
        rotation={[0, 0, 0]}
      />
      <gridHelper
        args={[10, 20, new Color(quantumTokens.colors.quantumBrightStart), new Color(quantumTokens.colors.quantumBrightStart)]}
        position={[0, 3, 0]}
        rotation={[0, 0, 0]}
      />
    </>
  );
};

// 连接线
const ConnectionLines: React.FC<{ points: DataPoint[] }> = ({ points }) => {
  const linePoints = points.map((point) => new Vector3(...point.position));
  
  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={new Float32Array(linePoints.flatMap((p) => [0, 0, 0, p.x, p.y, p.z]))}
          count={linePoints.length * 2}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={quantumTokens.colors.quantumBrightEnd} opacity={0.3} transparent />
    </lineSegments>
  );
};

// 后期处理效果
const Effects: React.FC = () => {
  return (
    <EffectComposer multisampling={0}>
      <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={0.5} />
      <Noise opacity={0.02} />
      <Vignette eskil={false} offset={0.1} darkness={1.1} />
      <SSAO />
    </EffectComposer>
  );
};

// 场景
const Scene: React.FC<{
  layers: DataLayer[];
  showEffects: boolean;
  showConnections: boolean;
}> = ({ layers, showEffects, showConnections }) => {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(4, 2, 8);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  const visibleLayers = layers.filter((layer) => layer.visible);
  const allVisiblePoints = visibleLayers.flatMap((layer) => layer.points);

  return (
    <>
      {/* 环境光和方向光 */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color={quantumTokens.colors.quantumDeepEnd} />
      
      {/* 核心球体 */}
      <CoreSphere />
      
      {/* 格点 */}
      <Grid />
      
      {/* 数据点 */}
      {visibleLayers.map((layer) => (
        <DataPoints key={layer.id} layer={layer} />
      ))}
      
      {/* 连接线 */}
      {showConnections && allVisiblePoints.length > 0 && <ConnectionLines points={allVisiblePoints} />}
      
      {/* 轨道控制器 */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.5}
      />
      
      {/* 后期处理 */}
      {showEffects && <Effects />}
    </>
  );
};

// 生成模拟数据
const generateMockData = (): DataLayer[] => {
  // 生成一个在球体上的随机点
  const randomSpherePoint = (radius: number = 2): [number, number, number] => {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    return [x, y, z];
  };

  const stressPoints = Array.from({ length: 30 }, (_, i) => ({
    id: `stress-${i}`,
    position: randomSpherePoint(2.5),
    value: Math.random(),
    label: `应力点 ${i + 1}`,
    layerType: 'stress' as DataLayerType,
  }));

  const displacementPoints = Array.from({ length: 25 }, (_, i) => ({
    id: `displacement-${i}`,
    position: randomSpherePoint(2.2),
    value: Math.random(),
    label: `位移点 ${i + 1}`,
    layerType: 'displacement' as DataLayerType,
  }));

  const flowPoints = Array.from({ length: 20 }, (_, i) => ({
    id: `flow-${i}`,
    position: randomSpherePoint(1.9),
    value: Math.random(),
    label: `渗流点 ${i + 1}`,
    layerType: 'flow' as DataLayerType,
  }));

  const geologyPoints = Array.from({ length: 15 }, (_, i) => ({
    id: `geology-${i}`,
    position: randomSpherePoint(1.7),
    value: Math.random(),
    label: `地质点 ${i + 1}`,
    layerType: 'geology' as DataLayerType,
  }));

  return [
    {
      id: 'stress',
      name: '应力层',
      type: 'stress',
      color: getLayerColor('stress'),
      points: stressPoints,
      visible: true,
      opacity: 0.8,
      size: 0.15,
    },
    {
      id: 'displacement',
      name: '位移层',
      type: 'displacement',
      color: getLayerColor('displacement'),
      points: displacementPoints,
      visible: true,
      opacity: 0.8,
      size: 0.12,
    },
    {
      id: 'flow',
      name: '渗流层',
      type: 'flow',
      color: getLayerColor('flow'),
      points: flowPoints,
      visible: true,
      opacity: 0.8,
      size: 0.1,
    },
    {
      id: 'geology',
      name: '地质层',
      type: 'geology',
      color: getLayerColor('geology'),
      points: geologyPoints,
      visible: true,
      opacity: 0.8,
      size: 0.08,
    },
  ];
};

// 属性定义
export interface HolographicDataSphereProps {
  width?: string | number;
  height?: string | number;
  title?: string;
  description?: string;
  showControls?: boolean;
  showLayers?: boolean;
  showInfo?: boolean;
  showEffects?: boolean;
  showStats?: boolean;
  initialLayers?: DataLayer[];
}

export const HolographicDataSphere: React.FC<HolographicDataSphereProps> = ({
  width = '100%',
  height = '500px',
  title = '深基坑数据全息球',
  description = '显示多层数据的三维可视化',
  showControls = true,
  showLayers = true,
  showInfo = true,
  showEffects = true,
  showStats = false,
  initialLayers,
}) => {
  const [layers, setLayers] = useState<DataLayer[]>(initialLayers || generateMockData());
  const [selectedPoint, setSelectedPoint] = useState<DataPoint | null>(null);
  const [showConnections, setShowConnections] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(0.5);

  // 切换层的可见性
  const toggleLayerVisibility = (layerId: string) => {
    setLayers((prevLayers) =>
      prevLayers.map((layer) =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  // 重置视图
  const resetView = () => {
    // 实现重置视图的逻辑
  };

  return (
    <DataSphereContainer sx={{ width, height }}>
      {/* 渲染Three.js场景 */}
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 10], fov: 45 }}>
        <Scene
          layers={layers}
          showEffects={showEffects}
          showConnections={showConnections}
        />
        {showStats && <Stats />}
      </Canvas>

      {/* 层控制面板 */}
      {showLayers && (
        <LayerControl>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
            数据层
          </Typography>
          {layers.map((layer) => (
            <DataPointChip
              key={layer.id}
              label={layer.name}
              layertype={layer.type}
              active={layer.visible}
              onClick={() => toggleLayerVisibility(layer.id)}
              variant={layer.visible ? 'filled' : 'outlined'}
              size="small"
            />
          ))}
        </LayerControl>
      )}

      {/* 控制面板 */}
      {showControls && (
        <ControlPanel>
          <Stack direction="row" spacing={1}>
            <Tooltip title="重置视图">
              <IconButton size="small" onClick={resetView}>
                <RotateLeft sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={showConnections ? '隐藏连接线' : '显示连接线'}>
              <IconButton size="small" onClick={() => setShowConnections(!showConnections)}>
                <Timeline sx={{ color: showConnections ? quantumTokens.colors.quantumBrightEnd : 'rgba(255, 255, 255, 0.7)' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={showEffects ? '关闭特效' : '开启特效'}>
              <IconButton size="small" onClick={() => setShowEffects(!showEffects)}>
                <FilterTiltShift sx={{ color: showEffects ? quantumTokens.colors.quantumBrightEnd : 'rgba(255, 255, 255, 0.7)' }} />
              </IconButton>
            </Tooltip>
          </Stack>
          
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            {title}
          </Typography>
          
          <Tooltip title="截图">
            <IconButton size="small">
              <Screenshot sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
            </IconButton>
          </Tooltip>
        </ControlPanel>
      )}

      {/* 信息面板 */}
      {showInfo && (
        <InfoPanel>
          <Typography variant="subtitle2" sx={{ color: '#fff', mb: 1 }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
            {description}
          </Typography>
          
          {selectedPoint && (
            <Box sx={{ mt: 2, p: 1, backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 1 }}>
              <Typography variant="caption" sx={{ color: getLayerColor(selectedPoint.layerType) }}>
                {selectedPoint.label}
              </Typography>
              <Typography variant="body2" sx={{ color: '#fff' }}>
                值: {(selectedPoint.value * 100).toFixed(1)}%
              </Typography>
            </Box>
          )}
        </InfoPanel>
      )}
    </DataSphereContainer>
  );
};

export default HolographicDataSphere;