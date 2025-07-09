import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Paper,
  Tabs,
  Tab,
  Tooltip,
  Chip,
  Button,
  Stack,
  Grid,
  FormControlLabel,
  Switch
} from '@mui/material';
import GridOnIcon from '@mui/icons-material/GridOn';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoIcon from '@mui/icons-material/Info';
import TuneIcon from '@mui/icons-material/Tune';
import MeshSettingsForm, { MeshSettings } from '../forms/MeshSettingsForm';
import { useStore } from '../../core/store';
import { GMSH_COLOR_SCHEMES } from '../../core/geologicalColorSchemes';

interface MeshItem {
  id: string;
  name: string;
  type: 'surface' | 'volume';
  elements: number;
  nodes: number;
  quality: number;
  visible: boolean;
  modelId?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`mesh-tabpanel-${index}`}
      aria-labelledby={`mesh-tab-${index}`}
      {...other}
      style={{ height: '100%', overflow: 'auto' }}
    >
      {value === index && (
        <Box sx={{ p: 2, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// 网格质量评估函数
const getMeshQualityStatus = (quality: number): { label: string; color: string } => {
  if (quality >= 0.9) {
    return { label: '优秀', color: GMSH_COLOR_SCHEMES.quality.excellent };
  } else if (quality >= 0.8) {
    return { label: '良好', color: GMSH_COLOR_SCHEMES.quality.good };
  } else if (quality >= 0.6) {
    return { label: '一般', color: GMSH_COLOR_SCHEMES.quality.fair };
  } else if (quality >= 0.4) {
    return { label: '较差', color: GMSH_COLOR_SCHEMES.quality.poor };
  } else {
    return { label: '很差', color: GMSH_COLOR_SCHEMES.quality.bad };
  }
};

const MeshPanel: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedMesh, setSelectedMesh] = useState<string | null>(null);
  const [displayOptions, setDisplayOptions] = useState({
    showNodes: false,
    showEdges: true,
    showFaces: true,
    showQuality: false,
    wireframe: false
  });
  const [meshSettings, setMeshSettings] = useState<MeshSettings | null>(null);
  
  // 模拟网格数据
  const meshes: MeshItem[] = [
    {
      id: 'mesh-001',
      name: '地质模型网格',
      type: 'volume',
      elements: 12450,
      nodes: 5280,
      quality: 0.85,
      visible: true,
      modelId: 'geo-model-001'
    },
    {
      id: 'mesh-002',
      name: '地下连续墙网格',
      type: 'surface',
      elements: 3240,
      nodes: 1680,
      quality: 0.92,
      visible: true
    },
    {
      id: 'mesh-003',
      name: '基坑开挖网格',
      type: 'volume',
      elements: 8760,
      nodes: 3450,
      quality: 0.78,
      visible: true
    }
  ];
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleMeshSelect = (id: string) => {
    setSelectedMesh(id === selectedMesh ? null : id);
  };
  
  const handleToggleVisibility = (id: string) => {
    // 实际应用中应该更新store中的状态
    console.log(`切换网格 ${id} 的可见性`);
  };
  
  const handleDeleteMesh = (id: string) => {
    // 实际应用中应该更新store中的状态
    console.log(`删除网格 ${id}`);
  };
  
  const handleDisplayOptionChange = (option: keyof typeof displayOptions) => {
    setDisplayOptions({
      ...displayOptions,
      [option]: !displayOptions[option]
    });
  };
  
  const handleOpenMeshSettings = (id: string) => {
    // 实际应用中应该打开网格设置对话框
    console.log(`打开网格 ${id} 的设置`);
  };
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="mesh panel tabs">
          <Tab label="网格列表" />
          <Tab label="网格详情" />
          <Tab label="显示选项" />
          <Tab label="网格参数" />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <List>
          {meshes.map((mesh) => (
            <React.Fragment key={mesh.id}>
              <ListItem 
                button 
                selected={selectedMesh === mesh.id}
                onClick={() => handleMeshSelect(mesh.id)}
              >
                <ListItemIcon>
                  <GridOnIcon />
                </ListItemIcon>
                <ListItemText 
                  primary={mesh.name} 
                  secondary={`${mesh.type === 'volume' ? '体网格' : '面网格'} | ${mesh.elements.toLocaleString()} 单元`}
                />
                <ListItemSecondaryAction>
                  <Tooltip title={mesh.visible ? '隐藏' : '显示'}>
                    <IconButton edge="end" onClick={() => handleToggleVisibility(mesh.id)}>
                      {mesh.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="设置">
                    <IconButton edge="end" onClick={() => handleOpenMeshSettings(mesh.id)}>
                      <SettingsIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton edge="end" onClick={() => handleDeleteMesh(mesh.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider variant="inset" component="li" />
            </React.Fragment>
          ))}
        </List>
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="outlined" startIcon={<TuneIcon />}>
            网格设置
          </Button>
          <Button variant="contained">
            生成网格
          </Button>
        </Box>
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        {selectedMesh ? (
          (() => {
            const mesh = meshes.find(m => m.id === selectedMesh);
            if (!mesh) return <Typography>请选择一个网格</Typography>;
            
            const qualityStatus = getMeshQualityStatus(mesh.quality);
            
            return (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {mesh.name}
                </Typography>
                
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        网格类型
                      </Typography>
                      <Typography variant="body1">
                        {mesh.type === 'volume' ? '体网格' : '面网格'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        网格质量
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={qualityStatus.label} 
                          size="small"
                          sx={{ 
                            bgcolor: qualityStatus.color,
                            color: qualityStatus.color === GMSH_COLOR_SCHEMES.quality.excellent || 
                                  qualityStatus.color === GMSH_COLOR_SCHEMES.quality.good ? 
                                  'black' : 'white'
                          }}
                        />
                        <Typography variant="body1">
                          {(mesh.quality * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        单元数量
                      </Typography>
                      <Typography variant="body1">
                        {mesh.elements.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        节点数量
                      </Typography>
                      <Typography variant="body1">
                        {mesh.nodes.toLocaleString()}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
                
                <Typography variant="subtitle1" gutterBottom>
                  网格统计
                </Typography>
                
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        最小单元尺寸
                      </Typography>
                      <Typography variant="body1">
                        0.5 m
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        最大单元尺寸
                      </Typography>
                      <Typography variant="body1">
                        5.0 m
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        平均单元质量
                      </Typography>
                      <Typography variant="body1">
                        {mesh.quality.toFixed(2)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        最小质量单元
                      </Typography>
                      <Typography variant="body1">
                        {(mesh.quality * 0.7).toFixed(2)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Button variant="outlined" startIcon={<InfoIcon />}>
                    查看详细报告
                  </Button>
                  <Button variant="contained" color="primary">
                    优化网格
                  </Button>
                </Box>
              </Box>
            );
          })()
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography color="text.secondary">
              请在网格列表中选择一个网格以查看详情
            </Typography>
          </Box>
        )}
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            网格显示选项
          </Typography>
          
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={displayOptions.showNodes}
                  onChange={() => handleDisplayOptionChange('showNodes')}
                />
              }
              label="显示节点"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={displayOptions.showEdges}
                  onChange={() => handleDisplayOptionChange('showEdges')}
                />
              }
              label="显示边线"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={displayOptions.showFaces}
                  onChange={() => handleDisplayOptionChange('showFaces')}
                />
              }
              label="显示面片"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={displayOptions.wireframe}
                  onChange={() => handleDisplayOptionChange('wireframe')}
                />
              }
              label="线框模式"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={displayOptions.showQuality}
                  onChange={() => handleDisplayOptionChange('showQuality')}
                />
              }
              label="显示网格质量"
            />
          </Stack>
        </Paper>
        
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            颜色设置
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                节点颜色
              </Typography>
              <Box 
                sx={{ 
                  width: '100%', 
                  height: 24, 
                  bgcolor: GMSH_COLOR_SCHEMES.mesh.nodes,
                  borderRadius: 1,
                  border: '1px solid rgba(0, 0, 0, 0.12)'
                }} 
              />
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                边线颜色
              </Typography>
              <Box 
                sx={{ 
                  width: '100%', 
                  height: 24, 
                  bgcolor: GMSH_COLOR_SCHEMES.mesh.edges,
                  borderRadius: 1,
                  border: '1px solid rgba(0, 0, 0, 0.12)'
                }} 
              />
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                面片颜色
              </Typography>
              <Box 
                sx={{ 
                  width: '100%', 
                  height: 24, 
                  bgcolor: GMSH_COLOR_SCHEMES.mesh.faces,
                  borderRadius: 1,
                  border: '1px solid rgba(0, 0, 0, 0.12)'
                }} 
              />
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                体元素颜色
              </Typography>
              <Box 
                sx={{ 
                  width: '100%', 
                  height: 24, 
                  bgcolor: GMSH_COLOR_SCHEMES.mesh.volumes,
                  borderRadius: 1,
                  border: '1px solid rgba(0, 0, 0, 0.12)'
                }} 
              />
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>
      
      <TabPanel value={tabValue} index={3}>
        <MeshSettingsForm
          initialSettings={meshSettings || undefined}
          onSettingsChange={(s) => setMeshSettings(s)}
          onApply={(s) => {
            console.log('应用网格参数', s);
            setMeshSettings(s);
          }}
        />
      </TabPanel>
    </Box>
  );
};

export default MeshPanel; 