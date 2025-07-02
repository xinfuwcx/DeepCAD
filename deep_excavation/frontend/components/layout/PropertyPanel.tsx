import React from 'react';
import { Paper } from '@mui/material';
import SoilCreator from '../creators/SoilCreator';
import ObjectEditor from './ObjectEditor'; // 我们将很快创建这个组件
import { SceneObject, SoilParameters } from '../../pages/MainPage';

interface PropertyPanelProps {
  selectedObject: SceneObject | null;
  onAddObject: (params: Omit<SceneObject, 'id' | 'name'>) => void;
  onUpdateObject: (id: string, updatedParams: Partial<SoilParameters>) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ selectedObject, onAddObject, onUpdateObject }) => {
  return (
    <Paper sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
      {selectedObject ? (
        <ObjectEditor 
          key={selectedObject.id} // 使用key确保切换对象时组件重载
          object={selectedObject}
          onUpdate={onUpdateObject}
        />
      ) : (
        <SoilCreator onAddObject={onAddObject} />
      )}
    </Paper>
  );
};

export default PropertyPanel; 