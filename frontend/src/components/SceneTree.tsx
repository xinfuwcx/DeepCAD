import React, { useEffect, useMemo } from 'react';
import { Tree, Typography } from 'antd';
import { useSceneStore, SceneState } from '../stores/useSceneStore';
import type { DataNode } from 'antd/es/tree';
import { ApartmentOutlined, AppstoreOutlined, BuildOutlined, DeploymentUnitOutlined } from '@ant-design/icons';
import { useShallow } from 'zustand/react/shallow';

const { Title } = Typography;

const getIcon = (type: string) => {
  switch (type) {
    case 'excavation':
      return <BuildOutlined />;
    case 'tunnel':
      return <DeploymentUnitOutlined />;
    default:
      return <AppstoreOutlined />;
  }
};

// 使用更宽松的类型定义
interface Component {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
}

const SceneTree: React.FC = () => {
  const { scene, fetchScene, setSelectedComponentId, selectedComponentId } = useSceneStore(
    useShallow(state => ({
      scene: state.scene,
      fetchScene: state.fetchScene,
      setSelectedComponentId: state.setSelectedComponentId,
      selectedComponentId: state.selectedComponentId,
    }))
  );

  // 只在组件挂载时获取场景数据
  useEffect(() => {
    fetchScene();
  }, [fetchScene]);

  const handleSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      setSelectedComponentId(selectedKeys[0] as string);
    } else {
      setSelectedComponentId(null);
    }
  };

  // Memoize the tree data to prevent unnecessary recalculations
  const treeData = useMemo(() => {
    if (!scene || !scene.components) {
      return [];
    }
    
    const excavations = scene.components.filter((comp: any) => comp.type === 'excavation');
    const tunnels = scene.components.filter((comp: any) => comp.type === 'tunnel');
    
    const components = [
      ...excavations.map((e: any) => ({ ...e, type: 'excavation' })),
      ...tunnels.map((t: any) => ({ ...t, type: 'tunnel' })),
    ];

    const validComponents = components.filter((comp: any) => comp.id !== null);

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
        children: validComponents.map((comp: any) => ({
          title: comp.name,
          key: comp.id!,
          icon: getIcon(comp.type),
        })),
      },
    ] as DataNode[];
  }, [scene]);

  if (!scene) {
    return <div style={{ padding: '16px' }}><Title level={5} style={{ color: 'white' }}>Loading Scene...</Title></div>;
  }

  return (
    <div style={{ padding: '16px' }}>
      <Title level={5} style={{ color: 'white', marginBottom: '16px' }}>Scene Tree</Title>
      <Tree
        defaultExpandAll
        treeData={treeData}
        selectedKeys={selectedComponentId ? [selectedComponentId] : []}
        onSelect={handleSelect}
        style={{ background: 'transparent', color: 'white' }}
      />
    </div>
  );
};

export default SceneTree; 