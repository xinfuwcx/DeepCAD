/**
 * @file Interactive3DParameterSphere.tsx
 * @description 3D交互式参数控制球体 - 革命性的参数调节体验
 * @author Deep Excavation Team
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Slider,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  Alert
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import {
  Tune,
  ThreeDRotation,
  TouchApp,
  Visibility,
  VisibilityOff,
  PlayArrow,
  Stop,
  Refresh,
  Save,
  RestoreFromTrash
} from '@mui/icons-material';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Text, Html } from '@react-three/drei';
import * as THREE from 'three';

// 参数类型定义
interface Parameter {
  id: string;
  name: string;
  displayName: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  category: 'soil' | 'structure' | 'loading' | 'boundary';
  description: string;
  isAIRecommended?: boolean;
  confidence?: number;
  impact?: 'low' | 'medium' | 'high';
  validation?: {
    isValid: boolean;
    message?: string;
  };
}

interface AIRecommendation {
  id: string;
  type: 'optimization' | 'warning' | 'suggestion';
  title: string;
  description: string;
  parameters: Parameter[];
  confidence: number;
  reasoning: string;
  impact: string;
  timeStamp: Date;
}
import SmartParameterDialog from './SmartParameterDialog';

// 呼吸灯效果
const breathingGlow = keyframes`
  0%, 100% { 
    opacity: 0.6;
    transform: scale(1);
  }
  50% { 
    opacity: 1;
    transform: scale(1.05);
  }
`;

// 参数点组件
const ParameterPoint: React.FC<{
  position: [number, number, number];
  parameter: any;
  onInteract: (param: any) => void;
  active: boolean;
}> = ({ position, parameter, onInteract, active }) => {
  const meshRef = useRef<THREE.Mesh>();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
      
      if (active) {
        meshRef.current.scale.setScalar(1.2 + Math.sin(state.clock.elapsedTime * 4) * 0.1);
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={() => onInteract(parameter)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshStandardMaterial
        color={active ? '#dc004e' : hovered ? '#42a5f5' : '#1976d2'}
        emissive={active ? '#dc004e' : hovered ? '#42a5f5' : '#000000'}
        emissiveIntensity={active ? 0.3 : hovered ? 0.2 : 0.1}
        transparent
        opacity={0.8}
      />
      
      {(hovered || active) && (
        <Html distanceFactor={10} position={[0, 0.15, 0]}>
          <Box
            sx={{
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none'
            }}
          >
            {parameter.name}: {parameter.value} {parameter.unit}
          </Box>
        </Html>
      )}
    </mesh>
  );
};

// 连接线组件
const ConnectionLines: React.FC<{ parameters: any[] }> = ({ parameters }) => {
  const linesRef = useRef<THREE.Group>();

  useFrame((state) => {
    if (linesRef.current) {
      linesRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group ref={linesRef}>
      {parameters.map((param, i) => {
        if (i === 0) return null;
        const start = parameters[i - 1].position;
        const end = param.position;
        
        return (
          <line key={i}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([...start, ...end])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color="#42a5f5"
              transparent
              opacity={0.3}
            />
          </line>
        );
      })}
    </group>
  );
};

// 主球体组件
const MainSphere: React.FC<{ parameters: any[] }> = ({ parameters }) => {
  const sphereRef = useRef<THREE.Mesh>();
  
  useFrame((state) => {
    if (sphereRef.current) {
      sphereRef.current.rotation.y = state.clock.elapsedTime * 0.2;
      
      // 根据参数值改变球体颜色
      const avgValue = parameters.reduce((sum, p) => sum + (p.value / p.max), 0) / parameters.length;
      const material = sphereRef.current.material as THREE.MeshStandardMaterial;
      material.color.setHSL(0.6 - avgValue * 0.3, 0.8, 0.5);
    }
  });

  return (
    <mesh ref={sphereRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        color="#1976d2"
        transparent
        opacity={0.2}
        wireframe
      />
    </mesh>
  );
};

interface Interactive3DParameterSphereProps {
  projectId?: string;
  onParameterChange?: (parameters: any[]) => void;
  onClose?: () => void;
  open?: boolean;
}

const Interactive3DParameterSphere: React.FC<Interactive3DParameterSphereProps> = ({
  projectId,
  onParameterChange,
  onClose,
  open = false
}) => {
  const [parameters, setParameters] = useState([
    {
      id: 'cohesion',
      name: '粘聚力',
      value: 20,
      min: 0,
      max: 100,
      unit: 'kPa',
      position: [1.2, 0, 0],
      category: 'material'
    },
    {
      id: 'friction_angle',
      name: '内摩擦角',
      value: 30,
      min: 0,
      max: 45,
      unit: '°',
      position: [0.8, 0.8, 0.5],
      category: 'material'
    },
    {
      id: 'elastic_modulus',
      name: '弹性模量',
      value: 25000,
      min: 5000,
      max: 50000,
      unit: 'kPa',
      position: [0, 1.2, 0],
      category: 'material'
    },
    {
      id: 'poisson_ratio',
      name: '泊松比',
      value: 0.3,
      min: 0.1,
      max: 0.45,
      unit: '',
      position: [-0.8, 0.8, 0.5],
      category: 'material'
    },
    {
      id: 'wall_thickness',
      name: '墙体厚度',
      value: 0.8,
      min: 0.5,
      max: 1.5,
      unit: 'm',
      position: [-1.2, 0, 0],
      category: 'geometry'
    },
    {
      id: 'excavation_depth',
      name: '开挖深度',
      value: 15,
      min: 5,
      max: 30,
      unit: 'm',
      position: [0, -1.2, 0],
      category: 'geometry'
    }
  ]);

  const [activeParameter, setActiveParameter] = useState<any>(null);
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [is3DMode, setIs3DMode] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedParameters, setSelectedParameters] = useState<Parameter[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);

  // 参数更新处理
  const handleParameterUpdate = (paramId: string, newValue: number) => {
    const updatedParameters = parameters.map(param =>
      param.id === paramId ? { ...param, value: newValue } : param
    );
    setParameters(updatedParameters);
    onParameterChange?.(updatedParameters);
  };

  // 重置参数
  const resetParameters = () => {
    // 这里可以加载默认值或上次保存的值
    setParameters(prev => prev.map(param => ({ ...param, value: param.min + (param.max - param.min) / 2 })));
  };

  // 处理参数球点击事件
  const handleParameterPointClick = useCallback((parameter: any) => {
    // 根据参数类型获取相关参数组
    const relatedParams = getRelatedParameters(parameter);
    setSelectedParameters(relatedParams);
    
    // 获取AI建议
    fetchAIRecommendations(parameter.category).then(setAiRecommendations);
    
    setDialogOpen(true);
  }, []);

  // 获取相关参数
  const getRelatedParameters = (parameter: any): Parameter[] => {
    // 根据参数类型返回相关参数组
    const mockParams: Parameter[] = [
      {
        id: 'density',
        name: 'density',
        displayName: '土体密度',
        value: 1800,
        unit: 'kg/m³',
        min: 1200,
        max: 2200,
        step: 10,
        category: 'soil',
        description: '土体的天然密度，影响重力应力分布',
        impact: 'medium'
      },
      {
        id: 'elastic_modulus',
        name: 'elastic_modulus', 
        displayName: '弹性模量',
        value: 20000,
        unit: 'kPa',
        min: 5000,
        max: 100000,
        step: 1000,
        category: 'soil',
        description: '土体变形特性的关键参数',
        impact: 'high'
      },
      {
        id: 'poisson_ratio',
        name: 'poisson_ratio',
        displayName: '泊松比',
        value: 0.3,
        unit: '',
        min: 0.1,
        max: 0.49,
        step: 0.01,
        category: 'soil',
        description: '控制横向变形与纵向变形的比例',
        impact: 'medium'
      }
    ];
    
    return mockParams;
  };

  // 获取AI建议
  const fetchAIRecommendations = async (category: string): Promise<AIRecommendation[]> => {
    // 模拟AI分析延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockRecommendations: AIRecommendation[] = [
      {
        id: 'rec_001',
        type: 'optimization',
        title: '弹性模量优化建议',
        description: '基于工程地质条件分析，建议调整土体弹性模量以获得更准确的变形预测',
        parameters: [
          {
            id: 'elastic_modulus',
            name: 'elastic_modulus',
            displayName: '弹性模量',
            value: 25000,
            unit: 'kPa',
            min: 5000,
            max: 100000,
            step: 1000,
            category: 'soil',
            description: 'AI推荐值基于地质勘探报告',
            isAIRecommended: true,
            confidence: 0.85
          }
        ],
        confidence: 0.85,
        reasoning: '根据SPT试验结果和室内试验数据，结合深基坑工程经验，当前弹性模量偏低。建议提高至25MPa以更好反映土体实际刚度。',
        impact: '提高变形计算精度约15%，更准确预测基坑变形',
        timeStamp: new Date()
      },
      {
        id: 'rec_002',
        type: 'warning',
        title: '参数匹配度警告',
        description: '检测到密度与弹性模量的比值异常，可能影响计算结果的可靠性',
        parameters: [],
        confidence: 0.92,
        reasoning: '土体密度与弹性模量应保持合理的比例关系，当前配置可能导致非物理的计算结果。',
        impact: '建议重新校核参数匹配性',
        timeStamp: new Date()
      }
    ];
    
    return mockRecommendations;
  };

  // 应用参数变更
  const handleParametersApply = async (parameters: Parameter[]) => {
    console.log('应用参数:', parameters);
    // 这里调用CAE引擎API应用参数
    // await api.applyParameters(parameters);
    
    // 更新3D球体显示
    updateSphereVisualization(parameters);
  };

  // 更新球体可视化
  const updateSphereVisualization = (parameters: Parameter[]) => {
    // 根据参数值更新3D球体的颜色、大小等视觉效果
    console.log('更新3D可视化:', parameters);
  };

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      {/* 3D参数球体 */}
      {is3DMode && (
        <Box sx={{ height: '60%', position: 'relative' }}>
          <Canvas camera={{ position: [3, 2, 3], fov: 75 }}>
            <ambientLight intensity={0.4} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#42a5f5" />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#dc004e" />
            
            <MainSphere parameters={parameters} />
            <ConnectionLines parameters={parameters} />
            
            {parameters.map((param, index) => (
              <ParameterPoint
                key={param.id}
                position={param.position as [number, number, number]}
                parameter={param}
                onInteract={handleParameterPointClick}
                active={activeParameter?.id === param.id}
              />
            ))}
            
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              autoRotate={autoRotate}
              autoRotateSpeed={2}
            />
          </Canvas>
          
          {/* 3D控制面板 */}
          <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
            <Card sx={{ 
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(66, 165, 245, 0.3)'
            }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box display="flex" flexDirection="column" gap={1}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoRotate}
                        onChange={(e) => setAutoRotate(e.target.checked)}
                        size="small"
                      />
                    }
                    label="自动旋转"
                    sx={{ color: 'white', fontSize: '0.8rem' }}
                  />
                  
                  <Tooltip title="切换到2D模式">
                    <IconButton
                      size="small"
                      onClick={() => setIs3DMode(false)}
                      sx={{ color: 'primary.main' }}
                    >
                      <Tune />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="重置参数">
                    <IconButton
                      size="small"
                      onClick={resetParameters}
                      sx={{ color: 'warning.main' }}
                    >
                      <RestoreFromTrash />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* 参数控制面板 */}
      <Box sx={{ height: is3DMode ? '40%' : '100%', overflow: 'auto', p: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="between" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ color: 'primary.main' }}>
            参数控制中心
          </Typography>
          
          <Box display="flex" gap={1}>
            {!is3DMode && (
              <Tooltip title="切换到3D模式">
                <IconButton
                  size="small"
                  onClick={() => setIs3DMode(true)}
                  sx={{ color: 'secondary.main' }}
                >
                  <ThreeDRotation />
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title="保存参数配置">
              <IconButton size="small" sx={{ color: 'success.main' }}>
                <Save />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* 参数列表 */}
        <Grid container spacing={2}>
          {parameters.map((param) => (
            <Grid item xs={12} sm={6} key={param.id}>
              <Card 
                sx={{ 
                  background: activeParameter?.id === param.id 
                    ? 'linear-gradient(135deg, rgba(220, 0, 78, 0.1), rgba(66, 165, 245, 0.1))'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: activeParameter?.id === param.id 
                    ? '1px solid rgba(220, 0, 78, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  animation: activeParameter?.id === param.id ? `${breathingGlow} 2s ease-in-out infinite` : 'none'
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: 'white' }}>
                      {param.name}
                    </Typography>
                    <Chip 
                      label={param.category === 'material' ? '材料' : '几何'}
                      size="small"
                      color={param.category === 'material' ? 'primary' : 'secondary'}
                      variant="outlined"
                    />
                  </Box>
                  
                  <Box sx={{ px: 1 }}>
                    <Slider
                      value={param.value}
                      min={param.min}
                      max={param.max}
                      step={(param.max - param.min) / 100}
                      onChange={(_, value) => handleParameterUpdate(param.id, value as number)}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => `${value.toFixed(2)} ${param.unit}`}
                      sx={{
                        color: activeParameter?.id === param.id ? 'secondary.main' : 'primary.main',
                        '& .MuiSlider-thumb': {
                          boxShadow: '0 0 10px rgba(66, 165, 245, 0.5)'
                        }
                      }}
                    />
                  </Box>
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    textAlign="center"
                    sx={{ mt: 1 }}
                  >
                    {param.value.toFixed(param.id === 'poisson_ratio' ? 2 : 0)} {param.unit}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* 参数验证提示 */}
        {activeParameter && (
          <Alert 
            severity="info" 
            sx={{ 
              mt: 2,
              background: 'rgba(33, 150, 243, 0.1)',
              border: '1px solid rgba(33, 150, 243, 0.3)'
            }}
          >
            <Typography variant="body2">
              正在调节 <strong>{activeParameter.name}</strong>
              <br />
              当前值: {activeParameter.value.toFixed(2)} {activeParameter.unit}
              <br />
              推荐范围: {activeParameter.min} - {activeParameter.max} {activeParameter.unit}
            </Typography>
          </Alert>
        )}
      </Box>

      {/* 浮动操作按钮 */}
      <Box sx={{ position: 'absolute', bottom: 16, right: 16 }}>
        <Button
          variant="contained"
          startIcon={<PlayArrow />}
          sx={{
            background: 'linear-gradient(45deg, #42a5f5, #dc004e)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1976d2, #c2185b)',
              transform: 'scale(1.05)',
              boxShadow: '0 0 20px rgba(66, 165, 245, 0.5)'
            }
          }}
          onClick={() => onParameterChange?.(parameters)}
        >
          应用参数
        </Button>
      </Box>

      {/* 智能参数设置对话框 */}
      <SmartParameterDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="智能参数设置"
        parameters={selectedParameters}
        onParametersChange={setSelectedParameters}
        onApply={handleParametersApply}
        aiRecommendations={aiRecommendations}
        show3DPreview={true}
      />
    </Box>
  );
};

export default Interactive3DParameterSphere;
