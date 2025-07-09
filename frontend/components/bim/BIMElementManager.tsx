/**
 * BIM构件管理器组件
 * 基于Revit Project Browser的设计理念
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardActions,
  Tooltip,
  Badge,
  Divider,
  TreeView,
  TreeItem,
  Tab,
  Tabs,
  Stack,
  Alert
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Group as GroupIcon,
  Category as CategoryIcon,
  Build as BuildIcon,
  Engineering as EngineeringIcon,
  Terrain as TerrainIcon,
  Timeline as TimelineIcon,
  Assignment as AssignmentIcon,
  Assessment as AssessmentIcon,
  ColorLens as ColorLensIcon,
  Settings as SettingsIcon,
  FileDownload as FileDownloadIcon,
  FileUpload as FileUploadIcon
} from '@mui/icons-material';

import { 
  bimDataManager, 
  BIMElement, 
  BIMPhysicalGroup, 
  BIMElementType, 
  BIMCategory 
} from '../../core/bimDataFlow';
import { 
  getBIMMaterial, 
  createBIMMaterial,
  BIM_VISUALIZATION_PRESETS,
  ALL_MATERIAL_CATEGORIES 
} from '../../core/bimColorSystem';

interface BIMElementManagerProps {
  onElementSelected?: (element: BIMElement) => void;
  onGroupSelected?: (group: BIMPhysicalGroup) => void;
}

export const BIMElementManager: React.FC<BIMElementManagerProps> = ({
  onElementSelected,
  onGroupSelected
}) => {
  // 状态管理
  const [activeTab, setActiveTab] = useState(0);
  const [elements, setElements] = useState<BIMElement[]>([]);
  const [groups, setGroups] = useState<BIMPhysicalGroup[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showElementDialog, setShowElementDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingElement, setEditingElement] = useState<BIMElement | null>(null);
  const [editingGroup, setEditingGroup] = useState<BIMPhysicalGroup | null>(null);
  const [filterCategory, setFilterCategory] = useState<BIMCategory | 'all'>('all');
  const [filterType, setFilterType] = useState<BIMElementType | 'all'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // 初始化数据
  useEffect(() => {
    loadData();
    
    // 监听数据变化
    const handleElementAdded = () => loadData();
    const handleElementUpdated = () => loadData();
    const handleElementDeleted = () => loadData();
    const handleGroupCreated = () => loadData();
    const handleGroupUpdated = () => loadData();
    const handleGroupDeleted = () => loadData();

    bimDataManager.addEventListener('elementAdded', handleElementAdded);
    bimDataManager.addEventListener('elementUpdated', handleElementUpdated);
    bimDataManager.addEventListener('elementDeleted', handleElementDeleted);
    bimDataManager.addEventListener('groupCreated', handleGroupCreated);
    bimDataManager.addEventListener('groupUpdated', handleGroupUpdated);
    bimDataManager.addEventListener('groupDeleted', handleGroupDeleted);

    return () => {
      // 清理事件监听器
    };
  }, []);

  const loadData = () => {
    setElements(bimDataManager.getAllElements());
    setGroups(bimDataManager.getAllGroups());
  };

  // 获取分类图标
  const getCategoryIcon = (category: BIMCategory) => {
    switch (category) {
      case 'Geotechnical': return <TerrainIcon />;
      case 'Structural': return <BuildIcon />;
      case 'Tunnel': return <EngineeringIcon />;
      case 'Foundation': return <BuildIcon />;
      case 'Support': return <EngineeringIcon />;
      case 'Monitoring': return <AssessmentIcon />;
      case 'Hydraulic': return <EngineeringIcon />;
      default: return <CategoryIcon />;
    }
  };

  // 获取类型颜色
  const getTypeColor = (type: BIMElementType): string => {
    const colorMap: Record<BIMElementType, string> = {
      'SoilLayer': '#8B4513',
      'DiaphragmWall': '#708090',
      'BoredPile': '#4682B4',
      'AnchorBolt': '#FFD700',
      'AnchorCable': '#FFA500',
      'SteelStrut': '#FF6347',
      'ConcreteStrut': '#CD5C5C',
      'TunnelSegment': '#4169E1',
      'TunnelLining': '#87CEEB',
      'DewateringWell': '#00CED1',
      'MonitoringPoint': '#FF69B4',
      'Building': '#DDA0DD',
      'Excavation': '#D2691E',
      'Foundation': '#A0522D',
      'Slab': '#C0C0C0',
      'Beam': '#696969',
      'Column': '#2F4F4F',
      'Wall': '#A9A9A9',
      'Generic': '#CCCCCC'
    };
    return colorMap[type] || '#CCCCCC';
  };

  // 过滤构件
  const filteredElements = elements.filter(element => {
    if (filterCategory !== 'all' && element.category !== filterCategory) return false;
    if (filterType !== 'all' && element.type !== filterType) return false;
    return true;
  });

  // 按类别分组构件
  const elementsByCategory = filteredElements.reduce((acc, element) => {
    if (!acc[element.category]) {
      acc[element.category] = [];
    }
    acc[element.category].push(element);
    return acc;
  }, {} as Record<BIMCategory, BIMElement[]>);

  // 切换类别展开状态
  const toggleCategoryExpansion = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // 选择构件
  const handleElementSelect = (element: BIMElement) => {
    setSelectedElement(element.id);
    onElementSelected?.(element);
  };

  // 选择物理组
  const handleGroupSelect = (group: BIMPhysicalGroup) => {
    setSelectedGroup(group.id);
    onGroupSelected?.(group);
  };

  // 切换构件可见性
  const toggleElementVisibility = (elementId: string) => {
    const element = bimDataManager.getElement(elementId);
    if (element) {
      bimDataManager.updateElement(elementId, {
        status: {
          ...element.status,
          visible: !element.status.visible
        }
      });
    }
  };

  // 删除构件
  const deleteElement = (elementId: string) => {
    if (window.confirm('确定要删除此构件吗？')) {
      bimDataManager.deleteElement(elementId);
    }
  };

  // 删除物理组
  const deleteGroup = (groupId: string) => {
    if (window.confirm('确定要删除此物理组吗？')) {
      bimDataManager.deleteGroup(groupId);
    }
  };

  // 渲染构件列表
  const renderElementList = () => (
    <Box>
      {/* 过滤器 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>类别筛选</InputLabel>
              <Select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as BIMCategory | 'all')}
              >
                <MenuItem value="all">全部类别</MenuItem>
                <MenuItem value="Geotechnical">岩土工程</MenuItem>
                <MenuItem value="Structural">结构工程</MenuItem>
                <MenuItem value="Tunnel">隧道工程</MenuItem>
                <MenuItem value="Foundation">基础工程</MenuItem>
                <MenuItem value="Support">支护工程</MenuItem>
                <MenuItem value="Monitoring">监测工程</MenuItem>
                <MenuItem value="Hydraulic">水工工程</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>类型筛选</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as BIMElementType | 'all')}
              >
                <MenuItem value="all">全部类型</MenuItem>
                <MenuItem value="SoilLayer">土层</MenuItem>
                <MenuItem value="DiaphragmWall">地下连续墙</MenuItem>
                <MenuItem value="BoredPile">钻孔灌注桩</MenuItem>
                <MenuItem value="AnchorBolt">预应力锚杆</MenuItem>
                <MenuItem value="AnchorCable">预应力锚索</MenuItem>
                <MenuItem value="TunnelSegment">隧道管片</MenuItem>
                <MenuItem value="MonitoringPoint">监测点</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowElementDialog(true)}
              fullWidth
            >
              添加构件
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* 构件树状列表 */}
      <Paper sx={{ maxHeight: 600, overflow: 'auto' }}>
        {Object.entries(elementsByCategory).map(([category, categoryElements]) => (
          <Accordion 
            key={category}
            expanded={expandedCategories.has(category)}
            onChange={() => toggleCategoryExpansion(category)}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getCategoryIcon(category as BIMCategory)}
                <Typography variant="subtitle2" fontWeight="bold">
                  {category}
                </Typography>
                <Badge badgeContent={categoryElements.length} color="primary" />
              </Box>
            </AccordionSummary>
            
            <AccordionDetails sx={{ p: 0 }}>
              <List dense>
                {categoryElements.map((element) => (
                  <ListItem
                    key={element.id}
                    button
                    selected={selectedElement === element.id}
                    onClick={() => handleElementSelect(element)}
                    sx={{
                      borderLeft: `4px solid ${getTypeColor(element.type)}`,
                      opacity: element.status.visible ? 1 : 0.5
                    }}
                  >
                    <ListItemIcon>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          bgcolor: getTypeColor(element.type),
                          borderRadius: 1
                        }}
                      />
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={element.name}
                      secondary={
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          <Chip label={element.type} size="small" variant="outlined" />
                          <Chip 
                            label={element.status.phase} 
                            size="small" 
                            color="secondary" 
                          />
                          {element.properties.mark && (
                            <Chip 
                              label={element.properties.mark} 
                              size="small" 
                              color="primary" 
                            />
                          )}
                        </Box>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title={element.status.visible ? "隐藏" : "显示"}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleElementVisibility(element.id);
                            }}
                          >
                            {element.status.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="编辑">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingElement(element);
                              setShowElementDialog(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="删除">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteElement(element.id);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>
    </Box>
  );

  // 渲染物理组列表
  const renderGroupList = () => (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<GroupIcon />}
          onClick={() => setShowGroupDialog(true)}
          fullWidth
        >
          创建物理组
        </Button>
      </Paper>

      <Paper sx={{ maxHeight: 600, overflow: 'auto' }}>
        <List>
          {groups.map((group) => (
            <ListItem
              key={group.id}
              button
              selected={selectedGroup === group.id}
              onClick={() => handleGroupSelect(group)}
            >
              <ListItemIcon>
                <GroupIcon />
              </ListItemIcon>
              
              <ListItemText
                primary={group.name}
                secondary={
                  <Box>
                    <Typography variant="caption" display="block">
                      {group.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <Chip 
                        label={`${group.members.length} 个构件`} 
                        size="small" 
                        variant="outlined" 
                      />
                      <Chip 
                        label={group.category} 
                        size="small" 
                        color="primary" 
                      />
                      <Chip 
                        label={`${group.quantities.totalVolume.toFixed(2)} m³`} 
                        size="small" 
                        color="secondary" 
                      />
                    </Box>
                  </Box>
                }
              />
              
              <ListItemSecondaryAction>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="编辑">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingGroup(group);
                        setShowGroupDialog(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="删除">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteGroup(group.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );

  // 渲染工程量统计
  const renderQuantityReport = () => {
    const stats = bimDataManager.getStatistics();
    
    return (
      <Box>
        <Grid container spacing={2}>
          {/* 总体统计 */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  总体统计
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>构件总数:</Typography>
                    <Typography fontWeight="bold">{stats.totalElements}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>物理组数:</Typography>
                    <Typography fontWeight="bold">{stats.totalGroups}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* 按类型统计 */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  按类型统计
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {Object.entries(stats.elementsByType).map(([type, count]) => (
                    <Box key={type} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>{type}:</Typography>
                      <Typography fontWeight="bold">{count}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* 按类别统计 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  按类别统计
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(stats.elementsByCategory).map(([category, count]) => (
                    <Grid item xs={6} md={3} key={category}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        {getCategoryIcon(category as BIMCategory)}
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {category}
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {count}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {/* 头部 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BuildIcon />
            BIM构件管理器
          </Typography>
          
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={() => {
                const data = bimDataManager.exportBIMData();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `BIM数据_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              导出
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<FileUploadIcon />}
              component="label"
            >
              导入
              <input
                type="file"
                hidden
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const data = event.target?.result as string;
                      if (bimDataManager.importBIMData(data)) {
                        loadData();
                        alert('导入成功!');
                      } else {
                        alert('导入失败!');
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
              />
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* 标签页 */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="构件列表" icon={<CategoryIcon />} />
          <Tab label="物理组" icon={<GroupIcon />} />
          <Tab label="工程量" icon={<AssessmentIcon />} />
        </Tabs>
        
        <Box sx={{ p: 2 }}>
          {activeTab === 0 && renderElementList()}
          {activeTab === 1 && renderGroupList()}
          {activeTab === 2 && renderQuantityReport()}
        </Box>
      </Paper>
    </Box>
  );
};

export default BIMElementManager; 