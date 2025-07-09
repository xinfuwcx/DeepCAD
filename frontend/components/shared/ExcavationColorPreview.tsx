/**
 * 基坑配色预览组件
 * 展示基坑工程的专业配色方案
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Construction as ConstructionIcon,
  Terrain as TerrainIcon,
  Timeline as TimelineIcon,
  Warning as WarningIcon,
  Engineering as EngineeringIcon,
  LocalShipping as LocalShippingIcon
} from '@mui/icons-material';

import { EXCAVATION_MATERIALS } from '../../core/bimColorSystem';

interface ExcavationColorPreviewProps {
  selectedCategory?: string;
  onColorSelect?: (colorKey: string, material: any) => void;
  showDetails?: boolean;
}

const ExcavationColorPreview: React.FC<ExcavationColorPreviewProps> = ({
  selectedCategory,
  onColorSelect,
  showDetails = true
}) => {
  // 按类别分组材质
  const groupedMaterials = Object.entries(EXCAVATION_MATERIALS).reduce(
    (acc, [key, material]) => {
      const category = material.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({ key, material });
      return acc;
    },
    {} as Record<string, Array<{ key: string; material: any }>>
  );

  // 获取类别图标
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case '基坑几何':
        return <TerrainIcon />;
      case '开挖阶段':
        return <TimelineIcon />;
      case '边界标识':
        return <WarningIcon />;
      case '土方工程':
        return <ConstructionIcon />;
      case '施工设备':
        return <EngineeringIcon />;
      default:
        return <ConstructionIcon />;
    }
  };

  // 获取类别颜色
  const getCategoryColor = (category: string) => {
    switch (category) {
      case '基坑几何':
        return 'primary';
      case '开挖阶段':
        return 'secondary';
      case '边界标识':
        return 'error';
      case '土方工程':
        return 'warning';
      case '施工设备':
        return 'success';
      default:
        return 'default';
    }
  };

  // 渲染颜色卡片
  const renderColorCard = (key: string, material: any) => (
    <Card
      key={key}
      variant="outlined"
      sx={{
        cursor: onColorSelect ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        '&:hover': onColorSelect ? {
          transform: 'translateY(-2px)',
          boxShadow: 2
        } : {},
        borderLeft: `4px solid ${material.color}`
      }}
      onClick={() => onColorSelect?.(key, material)}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Avatar
            sx={{
              width: 24,
              height: 24,
              bgcolor: material.color,
              border: '1px solid rgba(0,0,0,0.1)'
            }}
          >
            {' '}
          </Avatar>
          <Typography variant="body2" fontWeight="bold">
            {material.description}
          </Typography>
        </Box>
        
        <Typography variant="caption" color="text.secondary" display="block">
          {material.color}
        </Typography>
        
        {showDetails && (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip
              label={`透明度: ${(material.opacity * 100).toFixed(0)}%`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`粗糙度: ${material.roughness}`}
              size="small"
              variant="outlined"
            />
          </Stack>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ConstructionIcon />
        基坑工程配色方案
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        基于深基坑工程实践的专业配色体系，涵盖基坑几何、开挖阶段、边界标识、土方工程、施工设备等各个方面
      </Typography>

      <Stack spacing={2}>
        {Object.entries(groupedMaterials).map(([category, materials]) => (
          <Accordion
            key={category}
            defaultExpanded={!selectedCategory || selectedCategory === category}
            sx={{
              '& .MuiAccordionSummary-root': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getCategoryIcon(category)}
                <Typography variant="subtitle1" fontWeight="bold">
                  {category}
                </Typography>
                <Chip
                  label={materials.length}
                  size="small"
                  color={getCategoryColor(category) as any}
                />
              </Box>
            </AccordionSummary>
            
            <AccordionDetails>
              <Grid container spacing={2}>
                {materials.map(({ key, material }) => (
                  <Grid item xs={12} sm={6} md={4} key={key}>
                    {renderColorCard(key, material)}
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>

      {/* 配色说明 */}
      <Paper variant="outlined" sx={{ p: 2, mt: 3, bgcolor: 'action.hover' }}>
        <Typography variant="subtitle2" gutterBottom>
          🎨 配色设计原则
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon>
              <TerrainIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="基坑几何"
              secondary="使用棕色系列，体现土体特性，半透明显示便于观察内部结构"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <TimelineIcon color="secondary" />
            </ListItemIcon>
            <ListItemText
              primary="开挖阶段"
              secondary="采用渐变色序列，从浅到深表示开挖进度，便于4D施工模拟"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <WarningIcon color="error" />
            </ListItemIcon>
            <ListItemText
              primary="边界标识"
              secondary="使用警示色系（红、橙），确保安全边界清晰可见"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <ConstructionIcon color="warning" />
            </ListItemIcon>
            <ListItemText
              primary="土方工程"
              secondary="区分开挖土、回填土、堆土等不同状态，便于土方平衡计算"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <LocalShippingIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="施工设备"
              secondary="采用金属色系，体现机械设备特性，便于施工组织设计"
            />
          </ListItem>
        </List>
      </Paper>
    </Box>
  );
};

export default ExcavationColorPreview; 