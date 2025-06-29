/**
 * @file ModelingWorkbenchSimplified.tsx
 * @description 简化版深基坑CAE专业建模工作台
 */

import React, { useState, useRef, useCallback } from 'react';
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
  Button,
  ButtonGroup,
  Grid,
  Card,
  CardContent,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  // 视图和导航图标
  ViewInAr as View3DIcon,
  Layers as LayersIcon,
  GridOn as GridIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  
  // 建模工具图标
  Terrain as TerrainIcon,
  HomeWork as BuildingIcon,
  Engineering as TunnelIcon,
  Construction as ExcavationIcon,
  ViewModule as WallIcon,
  AccountTree as PileIcon,
  Hardware as AnchorIcon,
  
  // 操作图标
  Save as SaveIcon,
  FolderOpen as OpenIcon,
  GetApp as ImportIcon,
  Settings as SettingsIcon,
  CloudUpload as CloudUploadIcon,
  Close as CloseIcon,
  
  // 功能图标
  Architecture as ArchIcon,
  Science as ScienceIcon,
  Calculate as CalculateIcon,
  Assessment as ResultsIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';

import PropertyEditor, { ModelingObject } from './PropertyEditor';
import ObjectList from './ObjectList';

// 样式化组件
const WorkbenchContainer = styled(Box)(({ theme }) => ({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
  overflow: 'hidden',
}));

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  background: 'linear-gradient(90deg, #1976d2 0%, #1565c0 100%)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  zIndex: theme.zIndex.drawer + 1,
}));

const MainContent = styled(Box)(() => ({
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
}));

const ToolPanel = styled(Drawer)(({ theme }) => ({
  width: 320,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: 320,
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(20px)',
    borderRight: '1px solid #e0e0e0',
  },
}));

const Canvas3D = styled(Box)(() => ({
  flex: 1,
  position: 'relative',
  background: 'radial-gradient(circle at center, #ffffff 0%, #f5f5f5 100%)',
  borderRadius: '8px',
  margin: '8px',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const PropertiesPanel = styled(Paper)(({ theme }) => ({
  width: 320,
  height: '100%',
  background: 'rgba(255,255,255,0.95)',
  backdropFilter: 'blur(20px)',
  borderLeft: '1px solid #e0e0e0',
  overflow: 'auto',
}));

const ToolCard = styled(Card)<{ active?: boolean }>(({ theme, active }) => ({
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  border: active ? '2px solid #1976d2' : '1px solid transparent',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
}));

// 建模工具配置
const modelingTools = [
  { 
    id: 'terrain', 
    label: '地形域', 
    icon: TerrainIcon, 
    color: '#8D6E63',
    description: '创建NURBS地形曲面，支持多层土体建模',
  },
  { 
    id: 'excavation', 
    label: '基坑开挖', 
    icon: ExcavationIcon, 
    color: '#F57C00',
    description: '支持DXF导入和坐标点定义',
  },
  { 
    id: 'wall', 
    label: '地连墙', 
    icon: WallIcon, 
    color: '#795548',
    description: '地下连续墙支护结构建模',
  },
  { 
    id: 'pile', 
    label: '桩基础', 
    icon: PileIcon, 
    color: '#607D8B',
    description: '各种类型桩基础建模',
  },
  { 
    id: 'anchor', 
    label: '锚栓系统', 
    icon: AnchorIcon, 
    color: '#37474F',
    description: '预应力锚索和土钉支护',
  },
  { 
    id: 'building', 
    label: '临近建筑', 
    icon: BuildingIcon, 
    color: '#5D4037',
    description: '添加临近建筑物，分析相互影响',
  },
  { 
    id: 'tunnel', 
    label: '隧道建模', 
    icon: TunnelIcon, 
    color: '#FF6F00',
    description: '马蹄形隧道断面，支持全域拉伸',
  },
];

const ModelingWorkbenchSimplified: React.FC = () => {
  // 核心状态
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTool, setSelectedTool] = useState<string>('terrain');
  const [modelingObjects, setModelingObjects] = useState<ModelingObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(true);
  
  // UI状态
  const [notification, setNotification] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
    open: boolean;
  } | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  // Canvas引用
  const canvasRef = useRef<HTMLDivElement>(null);

  // 获取默认属性
  const getDefaultProperties = (type: string) => {
    switch (type) {
      case 'terrain':
        return {
          length: 100,
          width: 80,
          depth: 30,
          soilType: 'clay',
          waterLevel: 5,
        };
      case 'excavation':
        return {
          depth: 10,
          method: 'staged',
          stages: 3,
          slopeAngle: 90,
        };
      case 'wall':
        return {
          thickness: 0.8,
          depth: 15,
          material: 'concrete',
          elasticModulus: 30,
          poisson: 0.2,
        };
      case 'pile':
        return {
          diameter: 0.8,
          length: 20,
          material: 'concrete',
        };
      case 'anchor':
        return {
          diameter: 32,
          length: 25,
          angle: 15,
          spacing: 2.0,
        };
      default:
        return {};
    }
  };

  // 添加建模对象
  const handleAddObject = useCallback(() => {
    if (!selectedTool) return;
    
    const toolInfo = modelingTools.find(t => t.id === selectedTool);
    const existingCount = modelingObjects.filter(o => o.type === selectedTool).length;
    
    const newObject: ModelingObject = {
      id: `${selectedTool}_${Date.now()}`,
      type: selectedTool,
      name: `${toolInfo?.label} ${existingCount + 1}`,
      visible: true,
      properties: getDefaultProperties(selectedTool),
      status: 'draft',
      lastModified: new Date(),
    };
    
    setModelingObjects(prev => [...prev, newObject]);
    setSelectedObject(newObject.id);
    setNotification({ 
      type: 'success', 
      message: `已添加 ${newObject.name}`,
      open: true 
    });
  }, [selectedTool, modelingObjects]);

  // 删除建模对象
  const handleDeleteObject = useCallback((id: string) => {
    setModelingObjects(prev => prev.filter(obj => obj.id !== id));
    if (selectedObject === id) {
      setSelectedObject(null);
    }
    setNotification({ 
      type: 'info', 
      message: '对象已删除',
      open: true 
    });
  }, [selectedObject]);

  // 切换对象可见性
  const handleToggleVisibility = useCallback((id: string) => {
    setModelingObjects(prev => 
      prev.map(obj => 
        obj.id === id ? { ...obj, visible: !obj.visible } : obj
      )
    );
  }, []);

  // 更新对象属性
  const handleUpdateObject = useCallback((updatedObject: ModelingObject) => {
    setModelingObjects(prev => 
      prev.map(obj => obj.id === updatedObject.id ? updatedObject : obj)
    );
  }, []);

  // Tab标签配置
  const tabLabels = [
    { label: '建模', icon: <ArchIcon /> },
    { label: '材料', icon: <ScienceIcon /> },
    { label: '荷载', icon: <TunnelIcon /> },
    { label: '边界条件', icon: <TuneIcon /> },
    { label: '网格', icon: <GridIcon /> },
    { label: '分析', icon: <CalculateIcon /> },
    { label: '结果', icon: <ResultsIcon /> },
  ];

  return (
    <WorkbenchContainer>
      {/* 顶部工具栏 */}
      <StyledAppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            🏗️ Deep Excavation CAE - 智能建模工作台
          </Typography>
          
          <ButtonGroup variant="outlined" sx={{ mr: 2 }}>
            <Button 
              startIcon={<SaveIcon />} 
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              保存
            </Button>
            <Button 
              startIcon={<OpenIcon />} 
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
            >
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

          <IconButton color="inherit">
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
          {tabLabels.map((tab, index) => (
            <Tab 
              key={tab.label} 
              label={tab.label} 
              icon={tab.icon}
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
            <Grid container spacing={1} sx={{ mb: 3 }}>
              {modelingTools.map((tool) => (
                <Grid item xs={6} key={tool.id}>
                  <ToolCard 
                    active={selectedTool === tool.id}
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

            {/* 对象列表 */}
            <ObjectList
              objects={modelingObjects}
              selectedObject={selectedObject}
              onSelectObject={setSelectedObject}
              onDeleteObject={handleDeleteObject}
              onToggleVisibility={handleToggleVisibility}
              onAddObject={handleAddObject}
            />
          </Box>
        </ToolPanel>

        {/* 中央3D画布 */}
        <Canvas3D ref={canvasRef}>
          <Box textAlign="center">
            <View3DIcon sx={{ fontSize: 100, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" color="text.secondary" gutterBottom>
              3D 建模视图
            </Typography>
            <Typography variant="body2" color="text.secondary">
              三维模型将在此处显示
            </Typography>
            
            {/* 视图控制 */}
            <Stack 
              direction="row" 
              spacing={1} 
              sx={{ 
                position: 'absolute', 
                top: 16, 
                right: 16,
                background: 'rgba(255,255,255,0.9)',
                borderRadius: 1,
                p: 1,
              }}
            >
              <IconButton size="small" title="放大">
                <ZoomInIcon />
              </IconButton>
              <IconButton size="small" title="缩小">
                <ZoomOutIcon />
              </IconButton>
              <IconButton size="small" title="重置视图">
                <CenterIcon />
              </IconButton>
            </Stack>

            {/* 状态栏 */}
            <Stack 
              direction="row" 
              spacing={2} 
              alignItems="center"
              sx={{ 
                position: 'absolute', 
                bottom: 16, 
                left: 16,
                background: 'rgba(255,255,255,0.9)',
                borderRadius: 1,
                p: 1,
              }}
            >
              <Chip 
                icon={<View3DIcon />} 
                label="3D视图"
                size="small"
                variant="outlined"
              />
              <Chip 
                icon={<LayersIcon />} 
                label={`对象: ${modelingObjects.length}`}
                size="small"
                variant="outlined"
              />
            </Stack>
          </Box>
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
                  onUpdate={handleUpdateObject}
                />
              ) : (
                <Box textAlign="center" py={4}>
                  <SettingsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary" gutterBottom>
                    选择对象以编辑属性
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          severity={notification?.type || 'info'} 
          onClose={() => setNotification(null)}
        >
          {notification?.message}
        </Alert>
      </Snackbar>

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

export default ModelingWorkbenchSimplified;
