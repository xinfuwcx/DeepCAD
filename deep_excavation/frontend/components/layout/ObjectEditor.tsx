import React from 'react';
import { Box, Typography, FormGroup, FormControlLabel, Checkbox } from '@mui/material';
import { SceneObject, SoilParameters } from '../../pages/MainPage';

interface ObjectEditorProps {
  object: SceneObject;
  onUpdate: (id: string, updatedParams: Partial<SoilParameters>) => void;
}

const ObjectEditor: React.FC<ObjectEditorProps> = ({ object, onUpdate }) => {
  
  const handleInfiniteElementChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (object.type === 'soil') {
      onUpdate(object.id, { infiniteElement: event.target.checked });
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        编辑: {object.name}
      </Typography>
      
      {/* 属性编辑器 */}
      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
        几何属性
      </Typography>
      {/* 在这里可以添加编辑几何参数的UI, 例如厚度等 */}
      <Typography variant="body2">
        类型: {object.type}
      </Typography>
      
      {/* 物理组 */}
      {object.type === 'soil' && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 'bold' }}>
            物理组 (分析属性)
          </Typography>
          <FormGroup>
            <FormControlLabel 
              control={
                <Checkbox 
                  checked={object.parameters.infiniteElement} 
                  onChange={handleInfiniteElementChange} 
                />
              } 
              label="启用无限元边界" 
            />
          </FormGroup>
        </>
      )}
    </Box>
  );
};

export default ObjectEditor; 