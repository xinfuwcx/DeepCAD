import React from 'react';
import { Typography, Empty } from 'antd';
import { useSceneStore, SceneState } from '../stores/useSceneStore';
import { AnyComponent } from '../stores/components';
import DiaphragmWallForm from './forms/DiaphragmWallForm';
import PileArrangementForm from './forms/PileArrangementForm';
import AnchorRodForm from './forms/AnchorRodForm';
import ExcavationForm from './forms/ExcavationForm';
import TunnelForm from './forms/TunnelForm';
import { useShallow } from 'zustand/react/shallow';

const { Title } = Typography;

const renderEditor = (component: AnyComponent) => {
  switch (component.type) {
    case 'diaphragm_wall':
      return <DiaphragmWallForm component={component} />;
    case 'pile_arrangement':
      return <PileArrangementForm component={component} />;
    case 'anchor_rod':
      return <AnchorRodForm component={component} />;
    case 'excavation':
      return <ExcavationForm component={component} />;
    case 'tunnel':
      return <TunnelForm component={component} />;
    default:
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span className="theme-text-secondary">
              No editor available for '{(component as any).type}'
            </span>
          }
        />
      );
  }
};

const PropertyEditor: React.FC = () => {
  const { scene, selectedComponentId } = useSceneStore(
    useShallow((state: SceneState) => ({
      scene: state.scene,
      selectedComponentId: state.selectedComponentId,
    }))
  );

  const selectedComponent = scene?.components?.find((c: any) => c.id === selectedComponentId) as AnyComponent | undefined;

  return (
    <div className="theme-card" style={{ padding: '16px', height: '100%' }}>
      <Title level={5} className="theme-text-primary" style={{ marginBottom: '16px' }}>属性编辑器</Title>
      {selectedComponent ? (
        renderEditor(selectedComponent)
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span className="theme-text-secondary">
              选择一个组件以查看其属性
            </span>
          }
        />
      )}
    </div>
  );
};

export default PropertyEditor; 