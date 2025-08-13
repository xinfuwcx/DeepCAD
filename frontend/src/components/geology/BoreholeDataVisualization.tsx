// 钻孔数据可视化组件 - 3D钻孔柱状图与地质建模
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Card, Tabs, Button, Space, Slider, Switch, Upload, message } from 'antd';
import { 
  CloudUploadOutlined, 
  DownloadOutlined
} from '@ant-design/icons';
import './BoreholeDataVisualization.css';

const { TabPane } = Tabs;

// 钻孔数据接口
interface BoreholeData {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  depth: number;
  layers: GeologyLayer[];
  samples?: Sample[];
  waterLevel?: number;
  date?: string;
}

interface GeologyLayer {
  name: string;
  topDepth: number;
  bottomDepth: number;
  lithology: string;
  color: string;
  description?: string;
  properties?: {
    density?: number;
    porosity?: number;
    permeability?: number;
  };
}

interface Sample {
  depth: number;
  type: string;
  value: number;
  unit: string;
}


// 可视化设置类型
interface VisualizationSettings {
  showLabels: boolean;
  showLayers: boolean;
  showWaterLevel: boolean;
  showGrid: boolean;
  verticalExaggeration: number;
  opacity: number;
}

// 默认设置
const defaultSettings: VisualizationSettings = {
  showLabels: true,
  showLayers: true,
  showWaterLevel: true,
  showGrid: true,
  verticalExaggeration: 10,
  opacity: 0.8,
};

// 主组件
const BoreholeDataVisualization: React.FC = () => {
  const [boreholes, setBoreholes] = useState<BoreholeData[]>([]);
  const [selectedBorehole, setSelectedBorehole] = useState<BoreholeData | null>(null);
  const [settings, setSettings] = useState<VisualizationSettings>(defaultSettings);

  // 文件上传处理
  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        setBoreholes(data.boreholes || data);
        message.success(`成功加载 ${data.boreholes?.length || data.length} 个钻孔数据`);
      } catch (error) {
        message.error('加载钻孔数据失败');
      }
    };
    reader.readAsText(file);
  }, []);

  // 导出数据
  const handleExport = useCallback(() => {
    const exportData = {
      boreholes,
      settings,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'borehole_data.json';
    a.click();
    URL.revokeObjectURL(url);
    message.success('数据已导出');
  }, [boreholes, settings]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' }}>
      <div style={{ 
        width: 380, 
        padding: 20, 
        background: 'rgba(255, 255, 255, 0.95)', 
        backdropFilter: 'blur(10px)', 
        overflowY: 'auto',
        boxShadow: '2px 0 15px rgba(0, 0, 0, 0.2)'
      }}>
        <Card title="钻孔数据控制台" size="small">
          <Tabs defaultActiveKey="data">
            <TabPane tab="数据" key="data">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Upload
                  accept=".json,.csv"
                  beforeUpload={(file) => {
                    handleFileUpload(file);
                    return false;
                  }}
                  showUploadList={false}
                >
                  <Button icon={<CloudUploadOutlined />} block>
                    导入钻孔数据
                  </Button>
                </Upload>
                <Button 
                  icon={<DownloadOutlined />} 
                  onClick={handleExport}
                  block
                >
                  导出数据
                </Button>
                <div style={{ marginTop: 15, maxHeight: 300, overflowY: 'auto' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333', fontSize: 14, fontWeight: 600 }}>钻孔列表</h4>
                  {boreholes.map(bh => (
                    <div 
                      key={bh.id}
                      style={{
                        padding: 10,
                        marginBottom: 8,
                        background: selectedBorehole?.id === bh.id ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f5f5f5',
                        color: selectedBorehole?.id === bh.id ? 'white' : 'black',
                        borderRadius: 6,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onClick={() => setSelectedBorehole(bh)}
                    >
                      <span>{bh.name}</span>
                      <span style={{ fontSize: 12, opacity: 0.8 }}>深度: {bh.depth}m</span>
                    </div>
                  ))}
                </div>
              </Space>
            </TabPane>
            <TabPane tab="显示" key="display">
              <Space direction="vertical" style={{ width: '100%' }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#555', fontWeight: 500 }}>
                  <Switch
                    checked={settings.showLabels}
                    onChange={(checked) => setSettings(prev => ({ ...prev, showLabels: checked }))}
                  />
                  {' '}显示标签
                </label>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#555', fontWeight: 500 }}>
                  <Switch
                    checked={settings.showLayers}
                    onChange={(checked) => setSettings(prev => ({ ...prev, showLayers: checked }))}
                  />
                  {' '}显示地层
                </label>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#555', fontWeight: 500 }}>
                  <Switch
                    checked={settings.showWaterLevel}
                    onChange={(checked) => setSettings(prev => ({ ...prev, showWaterLevel: checked }))}
                  />
                  {' '}显示水位
                </label>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#555', fontWeight: 500 }}>垂直夸大系数</label>
                <Slider
                  min={1}
                  max={50}
                  value={settings.verticalExaggeration}
                  onChange={(value) => setSettings(prev => ({ ...prev, verticalExaggeration: value }))}
                />
                <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#555', fontWeight: 500 }}>透明度</label>
                <Slider
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={settings.opacity}
                  onChange={(value) => setSettings(prev => ({ ...prev, opacity: value }))}
                />
              </Space>
            </TabPane>
          </Tabs>
          {selectedBorehole && (
            <div style={{ 
              marginTop: 20, 
              padding: 15, 
              background: '#f9f9f9', 
              borderRadius: 8, 
              borderLeft: '4px solid #667eea' 
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#333', fontSize: 14, fontWeight: 600 }}>{selectedBorehole.name} 详情</h4>
              <p style={{ margin: '5px 0', fontSize: 13, color: '#666' }}>位置: ({selectedBorehole.x}, {selectedBorehole.y}, {selectedBorehole.z})</p>
              <p style={{ margin: '5px 0', fontSize: 13, color: '#666' }}>深度: {selectedBorehole.depth}m</p>
              {selectedBorehole.waterLevel && <p style={{ margin: '5px 0', fontSize: 13, color: '#666' }}>水位: {selectedBorehole.waterLevel}m</p>}
              <div style={{ marginTop: 10 }}>
                {selectedBorehole.layers.map((layer, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', fontSize: 12 }}>
                    <div 
                      style={{ 
                        width: 20, 
                        height: 20, 
                        borderRadius: 4, 
                        border: '1px solid #ddd', 
                        backgroundColor: layer.color,
                        flexShrink: 0 
                      }}
                    />
                    <span>{layer.name}</span>
                    <span style={{ marginLeft: 'auto', color: '#999', fontSize: 11 }}>
                      {layer.topDepth}-{layer.bottomDepth}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas>
          <PerspectiveCamera makeDefault position={[100, 100, 100]} />
          <OrbitControls enablePan enableZoom enableRotate />
          <ambientLight intensity={0.5} />
          <directionalLight position={[100, 100, 50]} intensity={1} />
          {/* 网格地面 */}
          {settings.showGrid && (
            <gridHelper args={[200, 20, '#444444', '#222222']} />
          )}
          {/* 钻孔可视化 */}
          {boreholes.map(borehole => (
            <Borehole3D
              key={borehole.id}
              data={borehole}
              settings={settings}
              isSelected={selectedBorehole?.id === borehole.id}
              onSelect={() => setSelectedBorehole(borehole)}
            />
          ))}
        </Canvas>
      </div>
    </div>
  );
};

// 单个钻孔的3D组件
const Borehole3D: React.FC<{
  data: BoreholeData;
  settings: VisualizationSettings;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ data, settings, isSelected, onSelect }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // 动画效果
  useFrame((state) => {
    if (groupRef.current && isSelected) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });
  
  return (
    <group ref={groupRef} position={[data.x, data.z, data.y]} onClick={onSelect}>
      {/* 地层柱 */}
      {settings.showLayers && data.layers.map((layer, idx) => {
        const height = (layer.bottomDepth - layer.topDepth) * settings.verticalExaggeration;
        const yPosition = -(layer.topDepth + (layer.bottomDepth - layer.topDepth) / 2) * settings.verticalExaggeration;
        
        return (
          <mesh key={idx} position={[0, yPosition, 0]}>
            <cylinderGeometry args={[2, 2, height, 8]} />
            <meshPhongMaterial 
              color={layer.color} 
              opacity={settings.opacity} 
              transparent 
            />
          </mesh>
        );
      })}
      
      {/* 水位线 */}
      {settings.showWaterLevel && data.waterLevel && (
        <mesh position={[0, -(data.z - data.waterLevel) * settings.verticalExaggeration, 0]}>
          <cylinderGeometry args={[2.5, 2.5, 0.5, 8]} />
          <meshPhongMaterial color="#00BFFF" opacity={0.6} transparent />
        </mesh>
      )}
      
      {/* 标签 */}
      {settings.showLabels && (
        <Text
          position={[0, 5, 0]}
          fontSize={3}
          color={isSelected ? '#FFD700' : '#FFFFFF'}
          anchorX="center"
          anchorY="middle"
        >
          {data.name}
        </Text>
      )}
      
      {/* 选中高亮 */}
      {isSelected && (
        <mesh>
          <cylinderGeometry args={[3, 3, data.depth * settings.verticalExaggeration, 8]} />
          <meshBasicMaterial color="#FFD700" wireframe />
        </mesh>
      )}
    </group>
  );
};

export default BoreholeDataVisualization;
