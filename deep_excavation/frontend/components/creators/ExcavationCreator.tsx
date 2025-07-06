/**
 * 基坑创建器组件
 * 集成专业配色方案和现代化UI设计
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Chip,
  Stack,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Construction as ConstructionIcon,
  Layers as LayersIcon,
  Timeline as TimelineIcon,
  Palette as PaletteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  PlayArrow as PlayArrowIcon,
  Settings as SettingsIcon,
  Engineering as EngineeringIcon,
  Terrain as TerrainIcon,
  Speed as SpeedIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

import { useStore } from '../../core/store';
import { AnyFeature } from '../../services/parametricAnalysisService';
import { 
  EXCAVATION_MATERIALS, 
  getBIMMaterial, 
  createBIMMaterial
} from '../../core/bimColorSystem';
import {
  GLOBAL_EXCAVATION_MATERIALS,
  GLOBAL_EXCAVATION_SCHEMES,
  getGlobalExcavationColor,
  createGlobalExcavationMaterial,
  getEngineeringStandards
} from '../../core/globalExcavationColorSystem';
import { 
  bimDataManager, 
  BIMElement, 
  BIMElementType 
} from '../../core/bimDataFlow';
import { ExcavationDiagram } from '../diagrams/ModelingDiagrams';
import { v4 as uuidv4 } from 'uuid';

// 基坑几何参数接口
interface ExcavationGeometry {
  length: number;           // 长度 (m)
  width: number;            // 宽度 (m)
  depth: number;            // 深度 (m)
  slopeAngle: number;       // 边坡角度 (度)
  cornerRadius: number;     // 转角半径 (m)
  shape: 'rectangular' | 'circular' | 'irregular';
}

// 开挖阶段接口
interface ExcavationPhase {
  id: string;
  name: string;
  depth: number;            // 开挖深度 (m)
  duration: number;         // 持续时间 (天)
  color: string;
  visible: boolean;
  equipment: string[];      // 使用设备
  safety: {
    slopeStability: boolean;
    waterControl: boolean;
    monitoring: boolean;
  };
}

// 施工参数接口
interface ConstructionParameters {
  method: 'open_cut' | 'top_down' | 'bottom_up';
  dewatering: boolean;
  soilNailing: boolean;
  shoring: boolean;
  workingPlatform: boolean;
}

const ExcavationCreator: React.FC = () => {
  const addFeature = useStore(state => state.addFeature);
  
  // 状态管理
  const [activeTab, setActiveTab] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [geometry, setGeometry] = useState<ExcavationGeometry>({
    length: 50,
    width: 30,
    depth: 15,
    slopeAngle: 45,
    cornerRadius: 2,
    shape: 'rectangular'
  });
  
  const [phases, setPhases] = useState<ExcavationPhase[]>([
    {
      id: '1',
      name: '第一阶段开挖',
      depth: 3,
      duration: 5,
      color: EXCAVATION_MATERIALS.phase_1_excavation.color,
      visible: true,
      equipment: ['excavator', 'dump_truck'],
      safety: { slopeStability: true, waterControl: true, monitoring: true }
    },
    {
      id: '2',
      name: '第二阶段开挖',
      depth: 7,
      duration: 8,
      color: EXCAVATION_MATERIALS.phase_2_excavation.color,
      visible: true,
      equipment: ['excavator', 'dump_truck'],
      safety: { slopeStability: true, waterControl: true, monitoring: true }
    },
    {
      id: '3',
      name: '第三阶段开挖',
      depth: 12,
      duration: 10,
      color: EXCAVATION_MATERIALS.phase_3_excavation.color,
      visible: true,
      equipment: ['excavator', 'dump_truck'],
      safety: { slopeStability: true, waterControl: true, monitoring: true }
    },
    {
      id: '4',
      name: '最终开挖',
      depth: 15,
      duration: 7,
      color: EXCAVATION_MATERIALS.final_excavation.color,
      visible: true,
      equipment: ['excavator', 'dump_truck', 'crane'],
      safety: { slopeStability: true, waterControl: true, monitoring: true }
    }
  ]);
  
  const [constructionParams, setConstructionParams] = useState<ConstructionParameters>({
    method: 'top_down',
    dewatering: true,
    soilNailing: false,
    shoring: true,
    workingPlatform: true
  });
  
  const [showPhaseDialog, setShowPhaseDialog] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ExcavationPhase | null>(null);
  const [animationEnabled, setAnimationEnabled] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);

  // 计算总工程量
  const calculateVolume = () => {
    const { length, width, depth } = geometry;
    return (length * width * depth).toFixed(2);
  };

  // 计算施工周期
  const calculateDuration = () => {
    return phases.reduce((total, phase) => total + phase.duration, 0);
  };

  // 生成基坑特征
  const generateExcavationFeature = () => {
    const excavationFeature: AnyFeature = {
      id: uuidv4(),
      name: `基坑开挖 (${geometry.length}×${geometry.width}×${geometry.depth}m)`,
      type: 'CreateExcavation',
      parameters: {
        geometry,
        phases,
        constructionParams,
        volume: calculateVolume(),
        duration: calculateDuration(),
        colorScheme: 'excavation',
        visualizationPreset: 'construction_sequence'
      }
    };

    // 创建BIM构件
    const excavationElement: Omit<BIMElement, 'id' | 'timestamps'> = {
      name: excavationFeature.name,
      type: 'Excavation' as BIMElementType,
      category: 'Foundation',
      family: 'Excavation',
      familyType: `${geometry.shape}_excavation`,
      geometry: {
        position: { x: 0, y: 0, z: -geometry.depth / 2 } as any,
        rotation: { x: 0, y: 0, z: 0, w: 1 } as any,
        scale: { x: 1, y: 1, z: 1 } as any,
        bounds: {
          min: { x: -geometry.length / 2, y: -geometry.width / 2, z: -geometry.depth },
          max: { x: geometry.length / 2, y: geometry.width / 2, z: 0 }
        } as any,
        vertices: [],
        faces: []
      },
      material: {
        category: 'excavation',
        name: 'excavation_zone',
        properties: EXCAVATION_MATERIALS.excavation_zone
      },
      properties: {
        length: geometry.length,
        width: geometry.width,
        depth: geometry.depth,
        volume: parseFloat(calculateVolume()),
        slopeAngle: geometry.slopeAngle,
        cornerRadius: geometry.cornerRadius,
        shape: geometry.shape,
        constructionMethod: constructionParams.method,
        phases: phases.length,
        duration: calculateDuration(),
        // 施工参数
        dewatering: constructionParams.dewatering,
        soilNailing: constructionParams.soilNailing,
        shoring: constructionParams.shoring,
        workingPlatform: constructionParams.workingPlatform
      },
      status: {
        visible: true,
        locked: false,
        selected: false,
        highlighted: false,
        phase: 'new',
        workset: '基坑工程'
      },
      relationships: {
        children: [],
        dependencies: [],
        conflicts: []
      }
    };

    // 添加到数据管理器
    bimDataManager.addElement({
      ...excavationElement,
      id: uuidv4(),
      timestamps: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        version: '1.0.0'
      }
    });

    addFeature(excavationFeature);
    
    console.log('🏗️ 基坑特征已创建:', {
      id: excavationFeature.id,
      geometry,
      phases: phases.length,
      volume: calculateVolume(),
      duration: calculateDuration()
    });
  };

  // 添加开挖阶段
  const addPhase = () => {
    const newPhase: ExcavationPhase = {
      id: (phases.length + 1).toString(),
      name: `第${phases.length + 1}阶段开挖`,
      depth: geometry.depth,
      duration: 7,
      color: EXCAVATION_MATERIALS.phase_1_excavation.color,
      visible: true,
      equipment: ['excavator', 'dump_truck'],
      safety: { slopeStability: true, waterControl: true, monitoring: true }
    };
    setPhases([...phases, newPhase]);
  };

  // 删除开挖阶段
  const deletePhase = (phaseId: string) => {
    setPhases(phases.filter(p => p.id !== phaseId));
  };

  // 切换阶段可见性
  const togglePhaseVisibility = (phaseId: string) => {
    setPhases(phases.map(p => 
      p.id === phaseId ? { ...p, visible: !p.visible } : p
    ));
  };

  // 获取设备图标
  const getEquipmentIcon = (equipment: string) => {
    switch (equipment) {
      case 'excavator': return '🚜';
      case 'dump_truck': return '🚛';
      case 'crane': return '🏗️';
      default: return '🔧';
    }
  };

  // 获取施工方法描述
  const getMethodDescription = (method: string) => {
    switch (method) {
      case 'open_cut': return '明挖法 - 传统开挖方式';
      case 'top_down': return '逆作法 - 先建结构后开挖';
      case 'bottom_up': return '顺作法 - 先开挖后建结构';
      default: return '';
    }
  };

  // 渲染几何参数设置
  const renderGeometrySettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TerrainIcon />
              基坑几何
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="长度 (m)"
                  type="number"
                  value={geometry.length}
                  onChange={(e) => setGeometry(prev => ({ ...prev, length: parseFloat(e.target.value) }))}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="宽度 (m)"
                  type="number"
                  value={geometry.width}
                  onChange={(e) => setGeometry(prev => ({ ...prev, width: parseFloat(e.target.value) }))}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="深度 (m)"
                  type="number"
                  value={geometry.depth}
                  onChange={(e) => setGeometry(prev => ({ ...prev, depth: parseFloat(e.target.value) }))}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="边坡角度 (°)"
                  type="number"
                  value={geometry.slopeAngle}
                  onChange={(e) => setGeometry(prev => ({ ...prev, slopeAngle: parseFloat(e.target.value) }))}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>基坑形状</InputLabel>
                  <Select
                    value={geometry.shape}
                    onChange={(e) => setGeometry(prev => ({ ...prev, shape: e.target.value as any }))}
                  >
                    <MenuItem value="rectangular">矩形</MenuItem>
                    <MenuItem value="circular">圆形</MenuItem>
                    <MenuItem value="irregular">异形</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssessmentIcon />
              工程量统计
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>开挖体积:</Typography>
                <Typography fontWeight="bold">{calculateVolume()} m³</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>施工周期:</Typography>
                <Typography fontWeight="bold">{calculateDuration()} 天</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>开挖阶段:</Typography>
                <Typography fontWeight="bold">{phases.length} 个</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>边坡面积:</Typography>
                <Typography fontWeight="bold">
                  {(2 * (geometry.length + geometry.width) * geometry.depth / Math.sin(geometry.slopeAngle * Math.PI / 180)).toFixed(2)} m²
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // 渲染开挖阶段设置
  const renderPhaseSettings = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimelineIcon />
          开挖阶段
          <Badge badgeContent={phases.length} color="primary" />
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={addPhase}
        >
          添加阶段
        </Button>
      </Box>
      
      <Grid container spacing={2}>
        {phases.map((phase, index) => (
          <Grid item xs={12} md={6} key={phase.id}>
            <Card 
              variant="outlined" 
              sx={{ 
                borderLeft: `4px solid ${phase.color}`,
                opacity: phase.visible ? 1 : 0.5
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {phase.name}
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title={phase.visible ? "隐藏" : "显示"}>
                      <IconButton
                        size="small"
                        onClick={() => togglePhaseVisibility(phase.id)}
                      >
                        {phase.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="编辑">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingPhase(phase);
                          setShowPhaseDialog(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deletePhase(phase.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
                
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      开挖深度
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {phase.depth} m
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      施工周期
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {phase.duration} 天
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      使用设备
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                      {phase.equipment.map(eq => (
                        <Chip
                          key={eq}
                          label={`${getEquipmentIcon(eq)} ${eq}`}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      安全措施
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                      {phase.safety.slopeStability && <Chip label="边坡稳定" size="small" color="success" />}
                      {phase.safety.waterControl && <Chip label="降水控制" size="small" color="info" />}
                      {phase.safety.monitoring && <Chip label="监测预警" size="small" color="warning" />}
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // 渲染施工参数设置
  const renderConstructionSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ConstructionIcon />
              施工方法
            </Typography>
            
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>施工方法</InputLabel>
              <Select
                value={constructionParams.method}
                onChange={(e) => setConstructionParams(prev => ({ ...prev, method: e.target.value as any }))}
              >
                <MenuItem value="open_cut">明挖法</MenuItem>
                <MenuItem value="top_down">逆作法</MenuItem>
                <MenuItem value="bottom_up">顺作法</MenuItem>
              </Select>
            </FormControl>
            
            <Alert severity="info" sx={{ mt: 1 }}>
              {getMethodDescription(constructionParams.method)}
            </Alert>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SettingsIcon />
              施工配置
            </Typography>
            
            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={constructionParams.dewatering}
                    onChange={(e) => setConstructionParams(prev => ({ ...prev, dewatering: e.target.checked }))}
                  />
                }
                label="降水工程"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={constructionParams.soilNailing}
                    onChange={(e) => setConstructionParams(prev => ({ ...prev, soilNailing: e.target.checked }))}
                  />
                }
                label="土钉支护"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={constructionParams.shoring}
                    onChange={(e) => setConstructionParams(prev => ({ ...prev, shoring: e.target.checked }))}
                  />
                }
                label="围护结构"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={constructionParams.workingPlatform}
                    onChange={(e) => setConstructionParams(prev => ({ ...prev, workingPlatform: e.target.checked }))}
                  />
                }
                label="工作平台"
              />
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box className="fade-in-up">
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center', gap: 1 }}>
        <EngineeringIcon />
        智能基坑设计器
      </Typography>
      
      {/* 基坑建模示意图 */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ConstructionIcon />
          基坑建模示意图
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <ExcavationDiagram width={400} height={250} />
        </Box>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
          基坑工程设计流程：几何设计 → 开挖阶段 → 施工参数 → 4D建模
        </Typography>
      </Paper>
      
      {/* 标签页导航 */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="几何设计" icon={<TerrainIcon />} />
          <Tab label="开挖阶段" icon={<TimelineIcon />} />
          <Tab label="施工参数" icon={<ConstructionIcon />} />
        </Tabs>
      </Paper>

      {/* 标签页内容 */}
      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && renderGeometrySettings()}
        {activeTab === 1 && renderPhaseSettings()}
        {activeTab === 2 && renderConstructionSettings()}
      </Box>

      {/* 操作按钮 */}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={generateExcavationFeature}
          >
            生成基坑模型
          </Button>
          
          <Button
            variant="outlined"
            size="large"
            startIcon={<PlayArrowIcon />}
            onClick={() => setAnimationEnabled(!animationEnabled)}
          >
            {animationEnabled ? '停止' : '开始'}施工动画
          </Button>
        </Stack>
      </Paper>

      {/* 技术说明 */}
      <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'action.hover' }}>
        <Typography variant="caption" color="text.secondary">
          <strong>🏗️ 基坑设计特点：</strong><br/>
          • 🎨 专业基坑配色方案（开挖阶段、边界标识、施工设备）<br/>
          • 📐 智能几何设计（矩形、圆形、异形基坑）<br/>
          • ⏱️ 施工阶段管理（多阶段开挖、时间控制）<br/>
          • 🔧 施工方法选择（明挖法、逆作法、顺作法）<br/>
          • 📊 工程量自动计算（开挖体积、边坡面积、施工周期）<br/>
          • 🎬 施工动画预览（4D施工模拟）
        </Typography>
      </Paper>
    </Box>
  );
};

export default ExcavationCreator; 