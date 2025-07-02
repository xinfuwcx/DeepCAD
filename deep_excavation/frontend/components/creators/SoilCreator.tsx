import React, { useState } from 'react';
import { Paper, Typography, Button, Box, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, FormControlLabel, Switch } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { SceneObject } from '../../pages/MainPage';

interface Point {
  x: string;
  y: string;
  z: string;
}

interface SoilCreatorProps {
  onAddObject: (params: Omit<SceneObject, 'id' | 'name'>) => void;
}

const SoilCreator: React.FC<SoilCreatorProps> = ({ onAddObject }) => {
  const [surfacePoints, setSurfacePoints] = useState<Point[]>([
    { x: '0', y: '0', z: '0' },
    { x: '100', y: '5', z: '0' },
    { x: '100', y: '0', z: '100' },
    { x: '0', y: '2', z: '100' },
  ]);
  const [thickness, setThickness] = useState(10);
  const [infiniteElement, setInfiniteElement] = useState(true);

  const handlePointChange = (index: number, field: keyof Point, value: string) => {
    const newPoints = [...surfacePoints];
    newPoints[index][field] = value;
    setSurfacePoints(newPoints);
  };

  const handleAddPoint = () => {
    setSurfacePoints([...surfacePoints, { x: '0', y: '0', z: '0' }]);
  };

  const handleRemovePoint = (index: number) => {
    const newPoints = surfacePoints.filter((_, i) => i !== index);
    setSurfacePoints(newPoints);
  };

  const handleAddClick = () => {
    onAddObject({
      type: 'soil',
      parameters: {
        surfacePoints: surfacePoints.map(p => ({
          x: parseFloat(p.x) || 0,
          y: parseFloat(p.y) || 0,
          z: parseFloat(p.z) || 0,
        })),
        thickness,
        infiniteElement,
      }
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        创建土体计算域
      </Typography>
      
      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
        地表点定义 (起伏地形)
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>X</TableCell>
              <TableCell>Y (高程)</TableCell>
              <TableCell>Z</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {surfacePoints.map((point, index) => (
              <TableRow key={index}>
                <TableCell><TextField value={point.x} onChange={(e) => handlePointChange(index, 'x', e.target.value)} variant="standard" /></TableCell>
                <TableCell><TextField value={point.y} onChange={(e) => handlePointChange(index, 'y', e.target.value)} variant="standard" /></TableCell>
                <TableCell><TextField value={point.z} onChange={(e) => handlePointChange(index, 'z', e.target.value)} variant="standard" /></TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleRemovePoint(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Button startIcon={<AddIcon />} onClick={handleAddPoint} sx={{ mt: 1 }}>
        添加坐标点
      </Button>

      <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
        土体厚度
      </Typography>
      <TextField
        label="土体厚度 (m)"
        type="number"
        value={thickness}
        onChange={(e) => setThickness(parseFloat(e.target.value))}
        variant="outlined"
        fullWidth
      />

      <FormControlLabel
        control={
          <Switch
            checked={infiniteElement}
            onChange={(e) => setInfiniteElement(e.target.checked)}
          />
        }
        label="生成无限元"
      />

      <Button variant="contained" onClick={handleAddClick} sx={{ mt: 3 }} fullWidth>
        添加土体
      </Button>
    </Box>
  );
};

export default SoilCreator; 