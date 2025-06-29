/**
 * @file ObjectList.tsx
 * @description 建模对象列表组件
 */

import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Chip,
  Stack,
  Button,
  Divider,
} from '@mui/material';
import {
  Visibility as VisibleIcon,
  VisibilityOff as HiddenIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Layers as LayersIcon,
  Terrain as TerrainIcon,
  Construction as ExcavationIcon,
  ViewModule as WallIcon,
  AccountTree as PileIcon,
  Hardware as AnchorIcon,
  HomeWork as BuildingIcon,
  Engineering as TunnelIcon,
} from '@mui/icons-material';
import { ModelingObject } from './PropertyEditor';

interface ObjectListProps {
  objects: ModelingObject[];
  selectedObject: string | null;
  onSelectObject: (id: string) => void;
  onDeleteObject: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onAddObject: () => void;
}

const ObjectList: React.FC<ObjectListProps> = ({
  objects,
  selectedObject,
  onSelectObject,
  onDeleteObject,
  onToggleVisibility,
  onAddObject,
}) => {
  const getObjectIcon = (type: string) => {
    switch (type) {
      case 'terrain': return <TerrainIcon color="action" />;
      case 'excavation': return <ExcavationIcon color="action" />;
      case 'wall': return <WallIcon color="action" />;
      case 'pile': return <PileIcon color="action" />;
      case 'anchor': return <AnchorIcon color="action" />;
      case 'building': return <BuildingIcon color="action" />;
      case 'tunnel': return <TunnelIcon color="action" />;
      default: return <LayersIcon color="action" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'success';
      case 'error': return 'error';
      case 'draft': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">
          模型对象
        </Typography>
        <Button
          startIcon={<AddIcon />}
          size="small"
          variant="contained"
          onClick={onAddObject}
        >
          添加
        </Button>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {objects.length === 0 ? (
        <Box textAlign="center" py={4}>
          <LayersIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body2" color="text.secondary" gutterBottom>
            暂无建模对象
          </Typography>
          <Typography variant="caption" color="text.secondary">
            点击"添加"按钮开始建模
          </Typography>
        </Box>
      ) : (
        <List dense>
          {objects.map((obj) => (
            <ListItem
              key={obj.id}
              button
              selected={selectedObject === obj.id}
              onClick={() => onSelectObject(obj.id)}
              sx={{
                borderRadius: 1,
                mb: 1,
                border: selectedObject === obj.id ? '2px solid' : '1px solid transparent',
                borderColor: selectedObject === obj.id ? 'primary.main' : 'transparent',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <ListItemIcon>
                {getObjectIcon(obj.type)}
              </ListItemIcon>
              
              <ListItemText 
                primary={obj.name}
                secondary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      {obj.type}
                    </Typography>
                    <Chip
                      size="small"
                      label={obj.status}
                      color={getStatusColor(obj.status) as any}
                      sx={{ 
                        fontSize: '0.7rem', 
                        height: 18,
                        '& .MuiChip-label': { px: 1 }
                      }}
                    />
                  </Stack>
                }
                primaryTypographyProps={{ 
                  fontSize: '0.9rem',
                  fontWeight: selectedObject === obj.id ? 600 : 400,
                }}
              />
              
              <ListItemSecondaryAction>
                <Stack direction="row" spacing={0.5}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(obj.id);
                    }}
                    title={obj.visible ? '隐藏' : '显示'}
                  >
                    {obj.visible ? (
                      <VisibleIcon fontSize="small" />
                    ) : (
                      <HiddenIcon fontSize="small" color="disabled" />
                    )}
                  </IconButton>
                  
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteObject(obj.id);
                    }}
                    title="删除"
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}
      
      {objects.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          共 {objects.length} 个对象
        </Typography>
      )}
    </Box>
  );
};

export default ObjectList;
