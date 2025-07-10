import React from 'react';
import { Typography, Empty } from 'antd';
import { useSceneStore, SceneState, AnyComponent } from '../stores/useSceneStore';
import DiaphragmWallForm from './forms/DiaphragmWallForm';
import PileArrangementForm from './forms/PileArrangementForm';
import AnchorRodForm from './forms/AnchorRodForm';

const { Title } = Typography;

const renderEditor = (component: AnyComponent) => {
  switch (component.type) {
    case 'diaphragm_wall':
      return <DiaphragmWallForm component={component} />;
    case 'pile_arrangement':
      return <PileArrangementForm component={component} />;
    case 'anchor_rod':
      return <AnchorRodForm component={component} />;
    default:
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>
              No editor available for '{component.type}'
            </span>
          }
        />
      );
  }
};

const PropertyEditor: React.FC = () => {
  const { scene, selectedComponentId } = useSceneStore((state: SceneState) => ({
    scene: state.scene,
    selectedComponentId: state.selectedComponentId,
  }));

  const selectedComponent = scene?.components.find((c: AnyComponent) => c.id === selectedComponentId);

  return (
    <div style={{ padding: '16px', color: 'white' }}>
      <Title level={5} style={{ color: 'white', marginBottom: '16px' }}>Property Editor</Title>
      {selectedComponent ? (
        renderEditor(selectedComponent)
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>
              Select a component to see its properties
            </span>
          }
        />
      )}
    </div>
  );
};

export default PropertyEditor; 