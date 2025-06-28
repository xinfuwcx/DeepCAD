import React, { useEffect, useRef, useState } from 'react';
import { Card, Slider, Select, Button, Space, Tooltip, Typography } from 'antd';
import { DownloadOutlined, ReloadOutlined, FullscreenOutlined } from '@ant-design/icons';
import ExcavationDiagram from '../../js/excavation_diagram';

const { Option } = Select;
const { Text } = Typography;

interface ExcavationDiagramViewerProps {
  projectId?: string;
  height?: number | string;
  width?: number | string;
  initialData?: any;
}

const ExcavationDiagramViewer: React.FC<ExcavationDiagramViewerProps> = ({
  projectId,
  height = 500,
  width = '100%',
  initialData
}) => {
  // 引用
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<any>(null);
  
  // 状态
  const [excavationDepth, setExcavationDepth] = useState<number>(15);
  const [waterLevel, setWaterLevel] = useState<number>(8);
  const [soilLayers, setSoilLayers] = useState<any[]>([
    { depth: 0, thickness: 5, name: '填土层', color: 'soil-layer-1' },
    { depth: 5, thickness: 8, name: '粉质粘土', color: 'soil-layer-2' },
    { depth: 13, thickness: 7, name: '砂层', color: 'soil-layer-3' },
    { depth: 20, thickness: 10, name: '粘土', color: 'soil-layer-4' },
    { depth: 30, thickness: 10, name: '基岩', color: 'soil-layer-5' }
  ]);
  
  // 初始化示意图
  useEffect(() => {
    if (!containerRef.current) return;
    
    // 创建示意图实例
    diagramRef.current = new ExcavationDiagram(containerRef.current, {
      width: containerRef.current.offsetWidth,
      height: typeof height === 'number' ? height : parseInt(height as string, 10) || 500,
      excavation: {
        width: 30,
        depth: excavationDepth,
        offsetX: 10
      },
      waterLevel: waterLevel,
      soilLayers: soilLayers
    });
    
    // 如果有初始数据，应用它
    if (initialData) {
      applyInitialData(initialData);
    }
    
    // 组件卸载时清理
    return () => {
      if (diagramRef.current) {
        diagramRef.current.destroy();
        diagramRef.current = null;
      }
    };
  }, [containerRef.current]);
  
  // 窗口大小变化时调整示意图大小
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !diagramRef.current) return;
      
      // 销毁旧的示意图
      diagramRef.current.destroy();
      
      // 创建新的示意图
      diagramRef.current = new ExcavationDiagram(containerRef.current, {
        width: containerRef.current.offsetWidth,
        height: typeof height === 'number' ? height : parseInt(height as string, 10) || 500,
        excavation: {
          width: 30,
          depth: excavationDepth,
          offsetX: 10
        },
        waterLevel: waterLevel,
        soilLayers: soilLayers
      });
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [excavationDepth, waterLevel, soilLayers]);
  
  // 应用初始数据
  const applyInitialData = (data: any) => {
    if (!diagramRef.current) return;
    
    // 应用基坑深度
    if (data.excavationDepth !== undefined) {
      setExcavationDepth(data.excavationDepth);
      diagramRef.current.updateExcavationDepth(data.excavationDepth);
    }
    
    // 应用水位
    if (data.waterLevel !== undefined) {
      setWaterLevel(data.waterLevel);
      diagramRef.current.updateWaterLevel(data.waterLevel);
    }
    
    // 应用监测点数据
    if (data.monitoringPoints) {
      diagramRef.current.updateMonitoringPoints(data.monitoringPoints);
    }
  };
  
  // 处理基坑深度变化
  const handleExcavationDepthChange = (value: number) => {
    setExcavationDepth(value);
    
    if (diagramRef.current) {
      diagramRef.current.updateExcavationDepth(value);
    }
  };
  
  // 处理水位变化
  const handleWaterLevelChange = (value: number) => {
    setWaterLevel(value);
    
    if (diagramRef.current) {
      diagramRef.current.updateWaterLevel(value);
    }
  };
  
  // 随机更新监测数据
  const handleUpdateMonitoring = () => {
    if (!diagramRef.current) return;
    
    // 生成随机监测数据
    const monitoringPoints = [
      { x: 5, depth: 5, name: 'MP-1', value: (Math.random() * 20).toFixed(1) + 'mm' },
      { x: 15, depth: 10, name: 'MP-2', value: (Math.random() * 15).toFixed(1) + 'mm' },
      { x: 25, depth: 15, name: 'MP-3', value: (Math.random() * 10).toFixed(1) + 'mm' }
    ];
    
    diagramRef.current.updateMonitoringPoints(monitoringPoints);
  };
  
  // 导出图像
  const handleExportImage = () => {
    if (!containerRef.current) return;
    
    try {
      // 创建一个canvas元素
      const canvas = document.createElement('canvas');
      canvas.width = containerRef.current.offsetWidth;
      canvas.height = containerRef.current.offsetHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      // 设置白色背景
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 将HTML元素绘制到canvas
      const data = new XMLSerializer().serializeToString(containerRef.current);
      const img = new Image();
      const svgBlob = new Blob([data], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        
        // 导出为PNG
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `excavation_diagram_${projectId || 'export'}.png`;
        link.href = pngUrl;
        link.click();
      };
      
      img.src = url;
    } catch (error) {
      console.error('导出图像失败:', error);
    }
  };
  
  // 全屏显示
  const handleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };
  
  return (
    <Card
      title="深基坑二维示意图"
      extra={
        <Space>
          <Tooltip title="更新监测数据">
            <Button
              onClick={handleUpdateMonitoring}
              type="primary"
              ghost
            >
              更新监测数据
            </Button>
          </Tooltip>
          <Tooltip title="导出图像">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportImage}
            />
          </Tooltip>
          <Tooltip title="全屏显示">
            <Button
              icon={<FullscreenOutlined />}
              onClick={handleFullscreen}
            />
          </Tooltip>
        </Space>
      }
      style={{ width }}
    >
      <div style={{ display: 'flex', height: typeof height === 'number' ? height : height }}>
        {/* 示意图容器 */}
        <div
          ref={containerRef}
          style={{
            flex: '1 1 auto',
            position: 'relative',
            borderRadius: 4,
            overflow: 'hidden',
            border: '1px solid #f0f0f0'
          }}
        />
        
        {/* 控制面板 */}
        <div style={{ width: 200, marginLeft: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <Text strong>基坑深度 (米)</Text>
            <Slider
              min={5}
              max={25}
              value={excavationDepth}
              onChange={handleExcavationDepthChange}
            />
            <div style={{ textAlign: 'center' }}>
              {excavationDepth} 米
            </div>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <Text strong>地下水位 (米)</Text>
            <Slider
              min={0}
              max={30}
              value={waterLevel}
              onChange={handleWaterLevelChange}
            />
            <div style={{ textAlign: 'center' }}>
              {waterLevel} 米
            </div>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <Text strong>土层信息</Text>
            <div style={{ marginTop: 8 }}>
              {soilLayers.map((layer, index) => (
                <div key={index} style={{ marginBottom: 4 }}>
                  <div
                    style={{
                      display: 'inline-block',
                      width: 12,
                      height: 12,
                      marginRight: 6,
                      backgroundColor: getColorForLayer(layer.color),
                      border: '1px solid #ccc'
                    }}
                  />
                  <Text>{layer.name} ({layer.depth}-{layer.depth + layer.thickness}米)</Text>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

// 辅助函数：根据土层类名获取颜色
function getColorForLayer(className: string): string {
  switch (className) {
    case 'soil-layer-1':
      return '#d9c8b4';
    case 'soil-layer-2':
      return '#c2a887';
    case 'soil-layer-3':
      return '#a88c6d';
    case 'soil-layer-4':
      return '#8d7558';
    case 'soil-layer-5':
      return '#6e5a42';
    default:
      return '#d9c8b4';
  }
}

export default ExcavationDiagramViewer; 