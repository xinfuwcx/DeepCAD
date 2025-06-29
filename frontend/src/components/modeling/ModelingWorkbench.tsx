/**
 * @file ModelingWorkbench.tsx
 * @description 深基坑CAE专业建模工作台 - 基于Figma设计系统
 * @author GitHub Copilot - 顶级UI设计师
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  AppBar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Badge,
  Card,
  CardContent,
  Button,
  ButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Slider,
  TextField,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  LinearProgress,
  Stack,
  Avatar,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Fab,
  Menu,
  MenuList,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Breadcrumbs,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import {
  // 视图和导航图标
  ViewInAr as View3DIcon,
  Layers as LayersIcon,
  GridOn as GridIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  RotateLeft as RotateIcon,
  
  // 建模工具图标
  Terrain as TerrainIcon,
  HomeWork as BuildingIcon,
  Engineering as TunnelIcon,
  Construction as ExcavationIcon,
  ViewModule as WallIcon,
  AccountTree as PileIcon,
  Hardware as AnchorIcon,
  
  // 操作图标
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibleIcon,
  VisibilityOff as HiddenIcon,
  Save as SaveIcon,
  FolderOpen as OpenIcon,
  GetApp as ImportIcon,
  Publish as ExportIcon,
  
  // 扩展图标
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  CloudUpload as CloudUploadIcon,
  InsertDriveFile as FileIcon,
  Architecture as ArchIcon,
  Science as ScienceIcon,
  Calculate as CalculateIcon,
  Assessment as ResultsIcon,
  Timeline as TimelineIcon,
  Tune as TuneIcon,
  AutoFixHigh as AutoIcon,
  Psychology as AIIcon,
  Close as CloseIcon,
  CheckCircle,
} from '@mui/icons-material';
import { tokens } from '../../styles/tokens';

// 动画关键帧
const slideInRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const pulseGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 5px var(--color-primary);
  }
  50% {
    box-shadow: 0 0 20px var(--color-primary), 0 0 30px var(--color-primary);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
`;

// 专业级样式化组件
const WorkbenchContainer = styled(Box)(({ theme }) => ({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: `linear-gradient(135deg, 
    var(--color-background, #ffffff) 0%, 
    var(--color-surface, #f5f5f5) 100%)`,
  fontFamily: 'var(--font-body-family, Roboto)',
  overflow: 'hidden',
}));

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  background: `linear-gradient(90deg, 
    var(--color-primary, #1976d2) 0%, 
    var(--color-primary-dark, #1565c0) 100%)`,
  boxShadow: 'var(--shadow-elevated, 0 8px 32px rgba(0,0,0,0.12))',
  zIndex: theme.zIndex.drawer + 1,
  borderBottom: '1px solid rgba(255,255,255,0.1)',
}));

const MainContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
}));

const ToolPanel = styled(Drawer)(({ theme }) => ({
  width: 320,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: 320,
    background: `linear-gradient(180deg, 
      rgba(255,255,255,0.95) 0%, 
      rgba(248,250,252,0.95) 100%)`,
    backdropFilter: 'blur(20px)',
    borderRight: '1px solid var(--color-primary-light, #42a5f5)',
    borderRadius: '0 var(--border-radius-large, 16px) var(--border-radius-large, 16px) 0',
    margin: theme.spacing(1, 0, 1, 1),
    height: 'calc(100vh - 16px)',
  },
}));

const Canvas3D = styled(Box)(({ theme }) => ({
  flex: 1,
  position: 'relative',
  background: `radial-gradient(circle at center, 
    var(--color-background, #ffffff) 0%, 
    var(--color-surface, #f5f5f5) 100%)`,
  borderRadius: 'var(--border-radius-medium, 8px)',
  margin: theme.spacing(1),
  boxShadow: 'var(--shadow-normal, 0 4px 16px rgba(0,0,0,0.08))',
  overflow: 'hidden',
  border: '1px solid rgba(25, 118, 210, 0.1)',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e3f2fd' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat`,
    opacity: 0.1,
    pointerEvents: 'none',
  }
}));

const PropertiesPanel = styled(Paper)(({ theme }) => ({
  width: 350,
  height: '100%',
  background: `linear-gradient(180deg, 
    rgba(255,255,255,0.95) 0%, 
    rgba(248,250,252,0.95) 100%)`,
  backdropFilter: 'blur(20px)',
  borderLeft: '1px solid var(--color-primary-light, #42a5f5)',
  borderRadius: 'var(--border-radius-large, 16px) 0 0 var(--border-radius-large, 16px)',
  margin: theme.spacing(1, 1, 1, 0),
  padding: theme.spacing(2),
  overflowY: 'auto',
  boxShadow: 'var(--shadow-normal, 0 4px 16px rgba(0,0,0,0.08))',
}));

const ToolCard = styled(Card)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  borderRadius: 'var(--border-radius-medium, 12px)',
  margin: theme.spacing(1, 0),
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: 'var(--shadow-elevated, 0 8px 32px rgba(0,0,0,0.15))',
    background: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid var(--color-primary-light, #42a5f5)',
  },
  '&.active': {
    background: `linear-gradient(135deg, 
      var(--color-primary, #1976d2) 0%, 
      var(--color-primary-light, #42a5f5) 100%)`,
    color: 'white',
    animation: `${pulseGlow} 2s ease-in-out infinite`,
  }
}));

const ViewportControls = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  right: theme.spacing(2),
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(15px)',
  borderRadius: 'var(--border-radius-medium, 12px)',
  padding: theme.spacing(1),
  boxShadow: 'var(--shadow-elevated, 0 8px 32px rgba(0,0,0,0.12))',
  zIndex: 10,
}));

const StatusBar = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(2),
  left: theme.spacing(2),
  right: theme.spacing(2),
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(15px)',
  borderRadius: 'var(--border-radius-medium, 12px)',
  padding: theme.spacing(1, 2),
  boxShadow: 'var(--shadow-elevated, 0 8px 32px rgba(0,0,0,0.12))',
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}));

const LoadingShimmer = styled(Box)(({ theme }) => ({
  background: `linear-gradient(90deg, 
    rgba(255,255,255,0) 0%, 
    rgba(255,255,255,0.4) 50%, 
    rgba(255,255,255,0) 100%)`,
  backgroundSize: '468px 100%',
  animation: `${shimmer} 1.5s ease-in-out infinite`,
  borderRadius: 'var(--border-radius-small, 4px)',
  height: '100%',
}));

// 建模工具配置
const modelingTools = [
  { 
    id: 'terrain', 
    label: '土体建模', 
    icon: TerrainIcon, 
    color: '#8D6E63',
    description: '创建NURBS地形曲面，支持多层土体建模',
    category: 'geometry'
  },
  { 
    id: 'building', 
    label: '临近建筑', 
    icon: BuildingIcon, 
    color: '#5D4037',
    description: '添加临近建筑物，分析相互影响',
    category: 'structure'
  },
  { 
    id: 'tunnel', 
    label: '隧道建模', 
    icon: TunnelIcon, 
    color: '#FF6F00',
    description: '马蹄形隧道断面，支持全域拉伸',
    category: 'structure'
  },
  { 
    id: 'excavation', 
    label: '基坑开挖', 
    icon: ExcavationIcon, 
    color: '#F57C00',
    description: '支持DXF导入和坐标点定义',
    category: 'excavation'
  },
  { 
    id: 'wall', 
    label: '地连墙', 
    icon: WallIcon, 
    color: '#795548',
    description: '地下连续墙支护结构建模',
    category: 'support'
  },
  { 
    id: 'pile', 
    label: '桩基础', 
    icon: PileIcon, 
    color: '#607D8B',
    description: '各种类型桩基础建模',
    category: 'support'
  },
  { 
    id: 'anchor', 
    label: '锚栓系统', 
    icon: AnchorIcon, 
    color: '#37474F',
    description: '预应力锚索和土钉支护',
    category: 'support'
  },
];

// 建模对象接口
interface ModelingObject {
  id: string;
  type: string;
  name: string;
  visible: boolean;
  properties: Record<string, any>;
  geometry?: any;
  status: 'draft' | 'valid' | 'error';
  lastModified: Date;
}

// 分析状态接口
interface AnalysisStatus {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  message: string;
  startTime?: Date;
  endTime?: Date;
}

// 属性编辑器组件
interface PropertyEditorProps {
  object: ModelingObject;
  onUpdate: (object: ModelingObject) => void;
}

const PropertyEditor: React.FC<PropertyEditorProps> = ({ object, onUpdate }) => {
  const [localObject, setLocalObject] = useState<ModelingObject>(object);

  useEffect(() => {
    setLocalObject(object);
  }, [object]);

  const handlePropertyChange = (key: string, value: any) => {
    const updatedObject = {
      ...localObject,
      properties: {
        ...localObject.properties,
        [key]: value,
      },
      lastModified: new Date(),
    };
    setLocalObject(updatedObject);
    onUpdate(updatedObject);
  };

  const renderPropertyEditor = () => {
    switch (object.type) {
      case 'terrain':
        return (
          <Stack spacing={2}>
            <TextField
              label="名称"
              value={localObject.name}
              onChange={(e) => setLocalObject({ ...localObject, name: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              label="域长度 (m)"
              type="number"
              value={localObject.properties.length || 100}
              onChange={(e) => handlePropertyChange('length', parseFloat(e.target.value))}
              size="small"
              fullWidth
            />
            <TextField
              label="域宽度 (m)"
              type="number"
              value={localObject.properties.width || 100}
              onChange={(e) => handlePropertyChange('width', parseFloat(e.target.value))}
              size="small"
              fullWidth
            />
            <TextField
              label="总深度 (m)"
              type="number"
              value={localObject.properties.depth || 30}
              onChange={(e) => handlePropertyChange('depth', parseFloat(e.target.value))}
              size="small"
              fullWidth
            />
            <FormControl fullWidth size="small">
              <InputLabel>土层类型</InputLabel>
              <Select
                value={localObject.properties.soilType || 'clay'}
                onChange={(e) => handlePropertyChange('soilType', e.target.value)}
              >
                <MenuItem value="clay">粘土</MenuItem>
                <MenuItem value="sand">砂土</MenuItem>
                <MenuItem value="rock">岩石</MenuItem>
                <MenuItem value="mixed">混合土</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        );

      case 'excavation':
        return (
          <Stack spacing={2}>
            <TextField
              label="名称"
              value={localObject.name}
              onChange={(e) => setLocalObject({ ...localObject, name: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              label="开挖深度 (m)"
              type="number"
              value={localObject.properties.depth || 10}
              onChange={(e) => handlePropertyChange('depth', parseFloat(e.target.value))}
              size="small"
              fullWidth
            />
            <FormControl fullWidth size="small">
              <InputLabel>开挖方式</InputLabel>
              <Select
                value={localObject.properties.method || 'staged'}
                onChange={(e) => handlePropertyChange('method', e.target.value)}
              >
                <MenuItem value="staged">分层开挖</MenuItem>
                <MenuItem value="full">一次性开挖</MenuItem>
                <MenuItem value="partial">部分开挖</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary">
              开挖阶段设置
            </Typography>
            <TextField
              label="阶段数量"
              type="number"
              value={localObject.properties.stages || 3}
              onChange={(e) => handlePropertyChange('stages', parseInt(e.target.value))}
              size="small"
              fullWidth
            />
          </Stack>
        );

      case 'wall':
        return (
          <Stack spacing={2}>
            <TextField
              label="名称"
              value={localObject.name}
              onChange={(e) => setLocalObject({ ...localObject, name: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              label="墙厚度 (m)"
              type="number"
              value={localObject.properties.thickness || 0.8}
              onChange={(e) => handlePropertyChange('thickness', parseFloat(e.target.value))}
              size="small"
              fullWidth
            />
            <TextField
              label="墙深度 (m)"
              type="number"
              value={localObject.properties.depth || 15}
              onChange={(e) => handlePropertyChange('depth', parseFloat(e.target.value))}
              size="small"
              fullWidth
            />
            <FormControl fullWidth size="small">
              <InputLabel>材料类型</InputLabel>
              <Select
                value={localObject.properties.material || 'concrete'}
                onChange={(e) => handlePropertyChange('material', e.target.value)}
              >
                <MenuItem value="concrete">混凝土</MenuItem>
                <MenuItem value="steel">钢材</MenuItem>
                <MenuItem value="composite">复合材料</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="弹性模量 (GPa)"
              type="number"
              value={localObject.properties.elasticModulus || 30}
              onChange={(e) => handlePropertyChange('elasticModulus', parseFloat(e.target.value))}
              size="small"
              fullWidth
            />
          </Stack>
        );

      default:
        return (
          <Stack spacing={2}>
            <TextField
              label="名称"
              value={localObject.name}
              onChange={(e) => setLocalObject({ ...localObject, name: e.target.value })}
              size="small"
              fullWidth
            />
            <Typography variant="body2" color="text.secondary">
              该对象类型的属性编辑器尚未实现
            </Typography>
          </Stack>
        );
    }
  };

  return (
    <Box>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} mb={2}>
            <Chip
              label={object.type}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              label={object.status}
              size="small"
              color={object.status === 'valid' ? 'success' : 'warning'}
            />
          </Stack>
          
          {renderPropertyEditor()}
          
          <Box mt={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={localObject.visible}
                  onChange={(e) => setLocalObject({ ...localObject, visible: e.target.checked })}
                />
              }
              label="可见性"
            />
          </Box>
        </CardContent>
      </Card>
      
      <Typography variant="caption" color="text.secondary">
        最后修改: {object.lastModified.toLocaleString()}
      </Typography>
    </Box>
  );
};

const ModelingWorkbench: React.FC = () => {
  // 核心状态管理
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTool, setSelectedTool] = useState<string>('terrain');
  const [modelingObjects, setModelingObjects] = useState<ModelingObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'plan' | 'section'>('3d');
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus | null>(null);
  
  // UI状态
  const [notification, setNotification] = useState<{
    type: 'success' | 'warning' | 'error' | 'info', 
    message: string,
    open: boolean
  } | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  // Canvas和Three.js引用
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);

  // 添加建模对象
  const addModelingObject = useCallback((type: string) => {
    const newObject: ModelingObject = {
      id: `${type}_${Date.now()}`,
      type: type,
      name: `${modelingTools.find(t => t.id === type)?.label} ${modelingObjects.filter(o => o.type === type).length + 1}`,
      visible: true,
      properties: getDefaultProperties(type),
      status: 'draft',
      lastModified: new Date(),
    };
    
    setModelingObjects(prev => [...prev, newObject]);
    setSelectedObject(newObject.id);
    setNotification({ 
      type: 'success', 
      message: `已添加${newObject.name}`,
      open: true 
    });
  }, [modelingObjects]);

  // 获取默认属性
  const getDefaultProperties = (type: string) => {
    switch (type) {
      case 'terrain':
        return {
          length: 100,
          width: 80,
          depth: 30,
          layers: [
            { name: '填土', thickness: 3, material: 'fill' },
            { name: '粘土', thickness: 12, material: 'clay' },
            { name: '砂土', thickness: 15, material: 'sand' }
          ]
        };
      case 'tunnel':
        return {
          shape: 'horseshoe',
          width: 12,
          height: 10,
          length: 200,
          depth: 15,
          lining_thickness: 0.5
        };
      case 'excavation':
        return {
          shape: 'rectangular',
          length: 60,
          width: 40,
          depth: 18,
          slope_angle: 75,
          coordinates: []
        };
      case 'wall':
        return {
          type: 'diaphragm',
          thickness: 0.8,
          depth: 25,
          concrete_grade: 'C30',
          reinforcement: 'HRB400'
        };
      case 'pile':
        return {
          type: 'bored',
          diameter: 1.0,
          length: 35,
          spacing: 2.5,
          arrangement: 'single_row'
        };
      case 'anchor':
        return {
          type: 'prestressed',
          diameter: 32,
          length: 25,
          angle: 15,
          spacing: 2.0,
          prestress: 400
        };
      default:
        return {};
    }
  };

  // 删除建模对象
  const deleteModelingObject = useCallback((id: string) => {
    setModelingObjects(prev => prev.filter(obj => obj.id !== id));
    if (selectedObject === id) {
      setSelectedObject(null);
    }
  }, [selectedObject]);

  // 切换对象可见性
  const toggleObjectVisibility = useCallback((id: string) => {
    setModelingObjects(prev => 
      prev.map(obj => 
        obj.id === id ? { ...obj, visible: !obj.visible } : obj
      )
    );
  }, []);

  // Tab标签页配置
  const tabLabels = ['建模', '材料', '荷载', '边界条件', '网格', '分析', '结果'];

  return (
    <WorkbenchContainer>
      {/* 顶部工具栏 */}
      <StyledAppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            🏗️ Deep Excavation CAE - 智能建模工作台
          </Typography>
          
          <ButtonGroup variant="outlined" sx={{ mr: 2 }}>
            <Button startIcon={<SaveIcon />} sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
              保存
            </Button>
            <Button startIcon={<OpenIcon />} sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
              打开
            </Button>
            <Button 
              startIcon={<ImportIcon />} 
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
              onClick={() => setImportDialogOpen(true)}
            >
              导入
            </Button>
          </ButtonGroup>

          <IconButton 
            color="inherit"
            onClick={() => setMenuAnchorEl(menuAnchorEl ? null : document.body)}
          >
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </StyledAppBar>

      {/* 主要标签页 */}
      <Paper 
        elevation={0} 
        sx={{ 
          mt: 8, 
          borderBottom: 1, 
          borderColor: 'divider',
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
            }
          }}
        >
          {tabLabels.map((label, index) => (
            <Tab 
              key={label} 
              label={label} 
              icon={
                index === 0 ? <ArchIcon /> :
                index === 1 ? <ScienceIcon /> :
                index === 2 ? <TunnelIcon /> :
                index === 3 ? <TuneIcon /> :
                index === 4 ? <GridIcon /> :
                index === 5 ? <CalculateIcon /> :
                <ResultsIcon />
              }
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Paper>

      {/* 主要内容区域 */}
      <MainContent>
        {/* 左侧工具面板 */}
        <ToolPanel variant="permanent" open={drawerOpen}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              建模工具
            </Typography>
            
            {/* 工具按钮组 */}
            <Grid container spacing={1}>
              {modelingTools.map((tool) => (
                <Grid item xs={6} key={tool.id}>
                  <ToolCard 
                    className={selectedTool === tool.id ? 'active' : ''}
                    onClick={() => setSelectedTool(tool.id)}
                  >
                    <CardContent sx={{ p: '12px !important', textAlign: 'center' }}>
                      <tool.icon sx={{ fontSize: 32, color: tool.color, mb: 1 }} />
                      <Typography variant="caption" display="block" fontWeight={500}>
                        {tool.label}
                      </Typography>
                    </CardContent>
                  </ToolCard>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* 对象列表 */}
            <Typography variant="h6" gutterBottom>
              模型对象
            </Typography>
            
            <Stack direction="row" spacing={1} mb={2}>
              <Button
                startIcon={<AddIcon />}
                size="small"
                variant="contained"
                onClick={handleAddObject}
                disabled={!selectedTool}
              >
                添加对象
              </Button>
              <IconButton 
                size="small"
                onClick={() => setPropertiesPanelOpen(!propertiesPanelOpen)}
                title="属性面板"
              >
                <SettingsIcon />
              </IconButton>
            </Stack>

            {modelingObjects.length === 0 ? (
              <Box textAlign="center" py={2}>
                <LayersIcon sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  暂无对象
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  选择工具并点击"添加对象"
                </Typography>
              </Box>
            ) : (
              <List dense>
                {modelingObjects.map((obj) => (
                  <ListItem
                    key={obj.id}
                    button
                    selected={selectedObject === obj.id}
                    onClick={() => setSelectedObject(obj.id)}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      border: selectedObject === obj.id ? '2px solid var(--color-primary)' : '1px solid transparent',
                    }}
                  >
                    <ListItemIcon>
                      {obj.visible ? <VisibleIcon /> : <HiddenIcon />}
                    </ListItemIcon>
                    <ListItemText 
                      primary={obj.name}
                      secondary={obj.type}
                      primaryTypographyProps={{ fontSize: '0.9rem' }}
                      secondaryTypographyProps={{ fontSize: '0.8rem' }}
                    />
                    <Stack direction="row" spacing={0.5}>
                      <Chip
                        size="small"
                        label={obj.status}
                        color={obj.status === 'valid' ? 'success' : obj.status === 'error' ? 'error' : 'default'}
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteObject(obj.id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
                      </Typography>
                    </CardContent>
                  </ToolCard>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              对象列表
            </Typography>

            {/* 对象列表 */}
            <List dense>
              {modelingObjects.map((obj) => (
                <ListItem
                  key={obj.id}
                  secondaryAction={
                    <Stack direction="row" spacing={1}>
                      <IconButton 
                        edge="end" 
                        size="small"
                        onClick={() => toggleObjectVisibility(obj.id)}
                      >
                        {obj.visible ? <VisibleIcon /> : <HiddenIcon />}
                      </IconButton>
                      <IconButton 
                        edge="end" 
                        size="small"
                        onClick={() => deleteModelingObject(obj.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  }
                  sx={{
                    border: selectedObject === obj.id ? '2px solid var(--color-primary)' : '1px solid transparent',
                    borderRadius: 'var(--border-radius-small)',
                    mb: 1,
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedObject(obj.id)}
                >
                  <ListItemIcon>
                    {React.createElement(
                      modelingTools.find(t => t.id === obj.type)?.icon || TerrainIcon,
                      { style: { color: modelingTools.find(t => t.id === obj.type)?.color } }
                    )}
                  </ListItemIcon>
                  <ListItemText 
                    primary={obj.name}
                    secondary={`状态: ${obj.status}`}
                  />
                </ListItem>
              ))}
              
              {modelingObjects.length === 0 && (
                <Box textAlign="center" py={4}>
                  <Typography color="text.secondary">
                    选择工具开始建模
                  </Typography>
                </Box>
              )}
            </List>

            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => addModelingObject(selectedTool)}
              sx={{ 
                mt: 2,
                background: 'var(--color-primary)',
                borderRadius: 'var(--border-radius-medium)',
              }}
            >
              添加 {modelingTools.find(t => t.id === selectedTool)?.label}
            </Button>
          </Box>
        </ToolPanel>

        {/* 中央3D画布 */}
        <Canvas3D ref={canvasRef}>
          {/* 视口控制器 */}
          <ViewportControls>
            <Stack direction="row" spacing={1}>
              <Tooltip title="缩放到适合">
                <IconButton size="small">
                  <CenterIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="放大">
                <IconButton size="small">
                  <ZoomInIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="缩小">
                <IconButton size="small">
                  <ZoomOutIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="重置视图">
                <IconButton size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </ViewportControls>

          {/* 状态栏 */}
          <StatusBar>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip 
                icon={<View3DIcon />} 
                label={`视图: ${viewMode.toUpperCase()}`}
                size="small"
                variant="outlined"
              />
              <Chip 
                icon={<LayersIcon />} 
                label={`对象: ${modelingObjects.length}`}
                size="small"
                variant="outlined"
              />
              {analysisStatus && (
                <Chip 
                  icon={analysisStatus.status === 'running' ? <PlayIcon /> : <CheckCircle />}
                  label={`分析: ${analysisStatus.status}`}
                  size="small"
                  color={analysisStatus.status === 'completed' ? 'success' : 'default'}
                />
              )}
            </Stack>

            <Typography variant="body2" color="text.secondary">
              就绪 | 坐标: (0, 0, 0)
            </Typography>
          </StatusBar>

          {/* 加载指示器 */}
          {isLoading && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              <LoadingShimmer sx={{ width: 200, height: 20, mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                正在加载模型...
              </Typography>
            </Box>
          )}
        </Canvas3D>

        {/* 右侧属性面板 */}
        {propertiesPanelOpen && (
          <PropertiesPanel>
            <Box sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">
                  属性编辑器
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => setPropertiesPanelOpen(false)}
                >
                  <CloseIcon />
                </IconButton>
              </Stack>
              
              {selectedObject ? (
                <PropertyEditor 
                  object={modelingObjects.find(o => o.id === selectedObject)!}
                  onUpdate={(updatedObject) => {
                    setModelingObjects(prev => 
                      prev.map(obj => obj.id === updatedObject.id ? updatedObject : obj)
                    );
                  }}
                />
              ) : (
                <Box textAlign="center" py={4}>
                  <InfoIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">
                    选择对象以编辑属性
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    在左侧对象列表中点击对象
                  </Typography>
                </Box>
              )}
            </Box>
          </PropertiesPanel>
        )}
      </MainContent>

      {/* 通知组件 */}
      <Snackbar
        open={notification?.open || false}
        autoHideDuration={3000}
        onClose={() => setNotification(null)}
        message={notification?.message}
      />

      {/* 导入对话框 */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>导入模型</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            支持的格式: DXF, STEP, IGES, STL
          </Typography>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            fullWidth
            sx={{ mt: 2 }}
          >
            选择文件
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>取消</Button>
          <Button variant="contained">导入</Button>
        </DialogActions>
      </Dialog>
    </WorkbenchContainer>
  );
};

export default ModelingWorkbench;
