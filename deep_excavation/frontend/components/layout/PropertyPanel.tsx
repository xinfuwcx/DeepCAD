import React, { useState } from 'react';
import { Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
import TerrainIcon from '@mui/icons-material/Terrain';
import ArchitectureIcon from '@mui/icons-material/Architecture';

import ObjectEditor from './ObjectEditor';
import SoilCreator from '../creators/SoilCreator';
import ExcavationCreator from '../creators/ExcavationCreator';
import { SceneObject, SoilParameters, ExcavationParameters } from '../../pages/MainPage';

interface PropertyPanelProps {
  selectedObject: SceneObject | null;
  onAddObject: (params: Omit<SceneObject, 'id' | 'name'>) => void;
  onUpdateObject: (id: string, updatedParams: Partial<SoilParameters | ExcavationParameters>) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ selectedObject, onAddObject, onUpdateObject }) => {
  const [activeCreator, setActiveCreator] = useState('soil');

  const handleCreatorChange = (
    event: React.MouseEvent<HTMLElement>,
    newCreator: string | null,
  ) => {
    if (newCreator !== null) {
      setActiveCreator(newCreator);
    }
  };

  const renderCreator = () => {
    switch (activeCreator) {
      case 'soil':
        return <SoilCreator onAddObject={onAddObject} />;
      case 'excavation':
        return <ExcavationCreator onAddObject={onAddObject} />;
      default:
        return <SoilCreator onAddObject={onAddObject} />;
    }
  };

  return (
    <Box sx={{ p: 2, height: '100%', overflowY: 'auto', bgcolor: 'background.paper' }}>
      {selectedObject ? (
        <ObjectEditor 
          key={selectedObject.id}
          object={selectedObject}
          onUpdate={onUpdateObject}
        />
      ) : (
        <>
          <ToggleButtonGroup
            value={activeCreator}
            exclusive
            onChange={handleCreatorChange}
            aria-label="creator selector"
            fullWidth
          >
            <ToggleButton value="soil" aria-label="创建土体">
              <TerrainIcon sx={{ mr: 1 }}/>
              土体
            </ToggleButton>
            <ToggleButton value="excavation" aria-label="创建基坑">
              <ArchitectureIcon sx={{ mr: 1 }} />
              基坑
            </ToggleButton>
          </ToggleButtonGroup>
          <Box mt={2}>
            {renderCreator()}
          </Box>
        </>
      )}
    </Box>
  );
};

export default PropertyPanel; 