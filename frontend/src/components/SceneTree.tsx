import React, { useEffect } from 'react';
import { Tree, Typography } from 'antd';
import { useSceneStore } from '../stores/useSceneStore';
import { ProjectScene, Excavation, Tunnel } from '../stores/models';
import { ApartmentOutlined, AppstoreOutlined, BuildOutlined, DeploymentUnitOutlined } from '@ant-design/icons';
import type { DataNode, TreeProps } from 'antd/es/tree';

const { Title } = Typography;

const getIcon = (type: string) => {
  switch (type) {
    case 'Excavation':
      return <BuildOutlined />;
    case 'Tunnel':
      return <DeploymentUnitOutlined />;
    default:
      return <AppstoreOutlined />;
  }
};

type SceneComponent = (Excavation | Tunnel) & { type: string };

const transformSceneToTreeData = (scene: ProjectScene): DataNode[] => {
  const components: SceneComponent[] = [
    ...scene.excavations.map(e => ({ ...e, type: 'Excavation' })),
    ...scene.tunnels.map(t => ({ ...t, type: 'Tunnel' })),
  ];

  const validComponents = components.filter(comp => comp.id !== null);

  return [
    {
      title: 'Computational Domain',
      key: 'domain',
      icon: <ApartmentOutlined />,
    },
    {
      title: 'Components',
      key: 'components',
      icon: <AppstoreOutlined />,
      children: validComponents.map((comp: SceneComponent) => ({
        title: comp.name,
        key: comp.id!, // We can use non-null assertion here because we filtered out nulls
        icon: getIcon(comp.type),
      })),
    },
  ];
};

const SceneTree: React.FC = () => {
  const { scene, fetchScene, setSelectedComponentId, selectedComponentId } = useSceneStore(state => ({
    scene: state.scene,
    fetchScene: state.fetchScene,
    setSelectedComponentId: state.setSelectedComponentId,
    selectedComponentId: state.selectedComponentId,
  }));

  useEffect(() => {
    if (!scene) {
      fetchScene();
    }
  }, [scene, fetchScene]);
  
  const handleSelect: TreeProps['onSelect'] = (selectedKeys) => {
    if (selectedKeys.length > 0) {
      setSelectedComponentId(selectedKeys[0] as string);
    } else {
      setSelectedComponentId(null);
    }
  };

  if (!scene) {
    return <div style={{ padding: '16px' }}><Title level={5} style={{ color: 'white' }}>Loading Scene...</Title></div>;
  }

  const treeData = transformSceneToTreeData(scene);

  return (
    <div style={{ padding: '16px' }}>
      <Title level={5} style={{ color: 'white', marginBottom: '16px' }}>Scene Explorer</Title>
      <Tree
        showIcon
        defaultExpandAll
        onSelect={handleSelect}
        selectedKeys={selectedComponentId ? [selectedComponentId] : []}
        treeData={treeData}
        blockNode
        style={{ background: 'transparent' }}
      />
    </div>
  );
};

export default SceneTree; 