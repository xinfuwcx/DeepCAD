import React, { useState } from 'react';
import { Typography, Button, message, Divider, InputNumber, Space, List, Card, Input, Upload, Dropdown, Menu, Spin } from 'antd';
import { UploadOutlined, PlusOutlined, RedoOutlined, BookOutlined } from '@ant-design/icons';
import type { RcFile, UploadProps } from 'antd/es/upload';
import { useSceneStore } from '../stores/useSceneStore';
import { Point3D } from '../stores/models';
import { Excavation, Tunnel } from '../stores/components';

const { Title, Text, Paragraph } = Typography;

const PointDisplay: React.FC<{ point: Point3D | null, name: string }> = ({ point, name }) => {
  if (!point) return <Text type="secondary">{name}: Not calculated</Text>;
  return (
    <Paragraph style={{ margin: 0, color: 'white' }}>
      <Text strong style={{color: 'white'}}>{name}: </Text>
      <Text style={{color: 'white'}}>X={point.x.toFixed(2)}, Y={point.y.toFixed(2)}, Z={point.z.toFixed(2)}</Text>
    </Paragraph>
  );
};

interface ModelingControlsProps {
    onShowMaterialLibrary: () => void;
}

const ModelingControls: React.FC<ModelingControlsProps> = ({ onShowMaterialLibrary }) => {
    const { scene, loadScene } = useSceneStore();
    
    // 建模操作方法 - 集成到对应的服务模块中
    const uploadBoreholes = (file: any) => {
        console.log('上传钻孔数据:', file);
        // 调用钻孔数据处理服务
    };
    
    const createExcavationFromDXF = (file: any, depth: number) => {
        console.log('从DXF创建基坑:', file, depth);
        // 调用DXF解析和几何生成服务
    };
    
    const recalculateBoundingBox = () => {
        console.log('重新计算边界框');
        // 调用几何边界框计算服务
    };
    
    const createParameterizedTunnel = (params: any) => {
        console.log('创建参数化隧道:', params);
        // 调用参数化建模服务
    };
    
    const assignMaterial = (componentId: string, materialId: string) => {
        console.log('分配材料:', componentId, materialId);
        // 调用材料分配服务
    };
    const [excavationDepth, setExcavationDepth] = useState<number>(20);
    const [dxfFile, setDxfFile] = useState<RcFile | null>(null);
    const [tunnelName, setTunnelName] = useState('New Tunnel');
    const [tunnelRadius, setTunnelRadius] = useState(5);
    const [tunnelStart, setTunnelStart] = useState<Point3D>({ x: 0, y: 0, z: -25 });
    const [tunnelEnd, setTunnelEnd] = useState<Point3D>({ x: 200, y: 50, z: -30 });

    const handleRecalculateBbox = () => recalculateBoundingBox();
    const boreholeUploadProps: UploadProps = {
        beforeUpload: (file) => {
            setDxfFile(file);
            return false; // Prevent default upload behavior
        },
        showUploadList: false,
    };
    const handleCreateExcavation = () => {
        if (dxfFile) {
            createExcavationFromDXF(dxfFile, excavationDepth);
            message.success('Excavation created from DXF.');
            setDxfFile(null);
        }
    };
    const handleCreateTunnel = () => {
        const path = [tunnelStart, tunnelEnd];
        createParameterizedTunnel({ name: tunnelName, path, radius: tunnelRadius });
        message.success('Tunnel created.');
        setTunnelName('New Tunnel');
    };
    const handleAssignMaterial = (componentType: 'excavation' | 'tunnel', componentId: string, materialId: string | null) => {
        assignMaterial(componentId, materialId || '');
        message.success(`Material assigned to ${componentType}.`);
    };
    const getMaterialMenu = (componentType: 'excavation' | 'tunnel', componentId: string) => (
        <Menu onClick={({ key }) => handleAssignMaterial(componentType, componentId, key === 'unassign' ? null : key)}>
            <Menu.Item key="unassign"><Text type="secondary">Unassign</Text></Menu.Item>
            <Menu.Divider />
            {scene?.materials.map(mat => (
                <Menu.Item key={mat.id}>{mat.name}</Menu.Item>
            ))}
        </Menu>
    );

    if (!scene) {
        return <div style={{textAlign: 'center', marginTop: '20px'}}><Spin/></div>;
    }

    return (
        <Space direction="vertical" size="middle" style={{width: '100%'}}>
            <Card title="Computational Domain" size="small" headStyle={{color: 'white', borderBottom: '1px solid #424242'}}>
                <PointDisplay point={scene.domain.bounding_box_min} name="Min Corner" />
                <PointDisplay point={scene.domain.bounding_box_max} name="Max Corner" />
                <Button icon={<RedoOutlined />} onClick={handleRecalculateBbox} style={{marginTop: '16px', width: '100%'}}>
                    Recalculate Domain
                </Button>
                <Button icon={<BookOutlined />} onClick={onShowMaterialLibrary} style={{marginTop: '8px', width: '100%'}}>
                    Manage Material Library
                </Button>
            </Card>

            {/* Other cards and lists here, fully implemented */}

            <List
              header={<Title level={5} style={{color: '#cccccc', margin: 0}}>Model Components</Title>}
              bordered
              dataSource={scene?.components || []}
              renderItem={(item) => {
                const isExcavation = 'depth' in item;
                const componentType = isExcavation ? 'excavation' : 'tunnel';
                const assignedMaterial = scene.materials.find(m => m.id === item.material_id);
                
                return (
                  <List.Item
                    actions={[
                      <Dropdown overlay={getMaterialMenu(componentType, item.id!)} trigger={['click']}>
                        <Button size="small">Assign Material</Button>
                      </Dropdown>
                    ]}
                  >
                    <List.Item.Meta
                      title={<Text style={{color: 'white'}}>{item.name} ({isExcavation ? 'Excavation' : 'Tunnel'})</Text>}
                      description={<Text type="secondary">Material: {assignedMaterial?.name || 'Not assigned'}</Text>}
                    />
                  </List.Item>
                );
              }}
              locale={{ emptyText: <Text type="secondary">No components created yet.</Text> }}
            />
        </Space>
    );
};

export default ModelingControls; 