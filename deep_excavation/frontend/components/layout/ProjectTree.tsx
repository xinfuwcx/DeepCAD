import React from 'react';
import { Paper, Typography, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import { SceneObject } from '../../pages/MainPage';

interface ProjectTreeProps {
  objects: SceneObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const ProjectTree: React.FC<ProjectTreeProps> = ({ objects, selectedId, onSelect }) => {
  return (
    <Paper sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        项目树
      </Typography>
      <List dense>
        {objects.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            场景中无对象
          </Typography>
        )}
        {objects.map((obj) => (
          <ListItem key={obj.id} disablePadding>
            <ListItemButton
              selected={selectedId === obj.id}
              onClick={() => onSelect(obj.id)}
            >
              <ListItemText primary={obj.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default ProjectTree; 