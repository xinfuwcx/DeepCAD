/**
 * GeologyModelingView.tsx - 地质建模专业工作台
 * 
 * 功能描述:
 * - 专业的地质建模和土层结构建立界面
 * - 提供完整的地质建模工作流和配置管理
 * - 支持3D地质体建模和可视化展示
 * - 集成地质插值算法和建模进度监控
 * 
 * 地质建模功能:
 * 1. 地质建模配置 - 建模参数和算法选择
 * 2. 建模范围设置 - 空间范围和边界条件定义
 * 3. 插值参数配置 - 插值算法参数调节
 * 4. 土层管理 - 土层分类、属性设置、颜色管理
 * 5. 3D可视化 - 地质体三维展示和交互
 * 6. 建模进度监控 - 实时显示建模计算进度
 * 
 * 核心组件:
 * - GeologyModelingConfig: 地质建模配置面板
 * - ModelingRangeConfig: 建模范围配置
 * - InterpolationParamsConfig: 插值参数设置
 * - ModelingProgressModal: 建模进度模态框
 * - GeometryViewport3D: 3D几何视口
 * 
 * 技术特色: 专业算法集成、参数化配置、实时预览、进度可视化
 */
import React, { useState, useRef } from 'react';
import { Button, message, Typography, Card } from 'antd';
import { RocketOutlined, EyeOutlined } from '@ant-design/icons';
import GeologyModelingConfig from '../components/geology/GeologyModelingConfig';
import ModelingRangeConfig from '../components/geology/ModelingRangeConfig';
import InterpolationParamsConfig from '../components/geology/InterpolationParamsConfig';
import ModelingProgressModal from '../components/geology/ModelingProgressModal';
import GeometryViewport3D, { GeometryViewportRef } from '../components/geometry/GeometryViewport3D';

const { Title, Text } = Typography;

interface SoilLayer {
  id: string;
  name: string;
  topDepth: number;
  bottomDepth: number;
  soilType: string;
  color: string;
  opacity?: number;
}

interface BoreholeData {
  id: string;
  name: string;
  x: number;
  y: number;
  depth: number;
  layers: SoilLayer[];
  // 额外字段用于地质建模
  z?: number;
  ground_elevation?: number;
  soil_type?: string;
  layer_id?: number;
}


const GeologyModelingView: React.FC = () => {
  const viewportRef = useRef<GeometryViewportRef>(null);
  
  // 主要状态
  const [boreholes, setBoreholes] = useState<BoreholeData[]>([]);
  // 建模方法UI保留于 GeologyModelingConfig 内部，不在本组件持有
  const [computationDomain, setComputationDomain] = useState<any>(null);
  const [rbfParams, setRBFParams] = useState<any>({
    grid_resolution: 8.0,
    rbf_function: 'multiquadric',
    smooth: 0.1,
    enable_extrapolation: true,
    multilayer_interpolation: true
  });
  const [gmshParams] = useState<any>({
    characteristic_length: 10.0,
    use_bspline_surface: true,
    export_geometry_files: false
  });
  
  // UI状态
  const [isLoading, setIsLoading] = useState(false);
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [modelingResult, setModelingResult] = useState<any>(null);
  const [modelingStats, setModelingStats] = useState<any>(null);

  // 钻孔范围（从钻孔数据计算）
  const boreholeExtent = React.useMemo(() => {
    if (boreholes.length === 0) return undefined;

  const xs = boreholes.map(b => b.x);
  const ys = boreholes.map(b => b.y);
  const zs = boreholes.map(b => b.z ?? 0);
  const grounds = boreholes.map(b => b.ground_elevation ?? 0);

    return {
      x_range: [Math.min(...xs), Math.max(...xs)] as [number, number],
      y_range: [Math.min(...ys), Math.max(...ys)] as [number, number],
      z_range: [Math.min(...zs), Math.max(...grounds)] as [number, number]
    };
  }, [boreholes]);

  // 处理钻孔数据加载
  const handleBoreholeDataLoad = async (file: File) => {
    setIsLoading(true);
    try {
      // 模拟加载CSV文件
  await file.text();
      
      // 这里应该解析CSV文件，现在使用模拟数据
      const mockBoreholes: BoreholeData[] = [
        { 
          id: 'BH001', 
          name: '钻孔001',
          x: -127.5, 
          y: -140.7, 
          depth: 30.0,
          z: -3.8, 
          ground_elevation: 26.2, 
          soil_type: '人工填土', 
          layer_id: 1,
          layers: [
            { id: '1', name: '人工填土', topDepth: 0, bottomDepth: 5, soilType: '人工填土', color: '#8B4513' }
          ]
        },
        { 
          id: 'BH002', 
          name: '钻孔002',
          x: -112.9, 
          y: -126.6, 
          depth: 30.0,
          z: -3.6, 
          ground_elevation: 26.4, 
          soil_type: '人工填土', 
          layer_id: 1,
          layers: [
            { id: '1', name: '人工填土', topDepth: 0, bottomDepth: 5, soilType: '人工填土', color: '#8B4513' }
          ]
        },
        // 添加更多钻孔...
      ];
      
      setBoreholes(mockBoreholes);
      message.success(`成功加载 ${mockBoreholes.length} 个钻孔数据`);
      
    } catch (error) {
      console.error('钻孔数据加载失败:', error);
      message.error('钻孔数据加载失败，请检查文件格式');
    } finally {
      setIsLoading(false);
    }
  };

  // 开始建模
  const handleStartModeling = async () => {
    if (boreholes.length === 0) {
      message.warning('请先加载钻孔数据');
      return;
    }

    if (!computationDomain) {
      message.warning('请设置建模范围');
      return;
    }

    setProgressModalVisible(true);
  };

  // 建模完成处理
  const handleModelingComplete = (result: any) => {
    setModelingResult(result);
    setModelingStats({
      n_vertices: result.geometry_data?.metadata?.n_surface_vertices || 0,
      n_triangles: result.geometry_data?.metadata?.n_surface_triangles || 0,
      n_boreholes: result.geometry_data?.metadata?.n_boreholes || 0,
      n_physical_groups: result.geometry_data?.metadata?.n_physical_groups || 0,
      modeling_method: result.geometry_data?.metadata?.modeling_method || 'Unknown'
    });
    
    message.success('三维地质建模完成！');
    
    // 通知3D视口更新
    // 这里可以调用viewport的更新方法
    console.log('Modeling completed:', result);
  };

  // 建模失败处理
  const handleModelingError = (error: string) => {
    message.error(`建模失败: ${error}`);
  };

  // 查看结果
  const handleViewResults = () => {
    if (modelingResult && viewportRef.current) {
      // 切换到地质视图
      viewportRef.current.setShowGeology(true);
      message.info('已切换到地质模型视图');
    }
  };

  return (
    <div className="h-full flex">
      {/* 左侧3D视口 */}
      <div className="flex-1 relative">
        <GeometryViewport3D
          ref={viewportRef}
          boreholes={boreholes}
          className="h-full"
          onAction={(action) => {
            console.log('Viewport action:', action);
          }}
          onControlsChange={(controls) => {
            console.log('Controls changed:', controls);
          }}
        />
        
        {/* 模型统计悬浮卡片 */}
        {modelingStats && (
          <Card 
            size="small"
            className="absolute top-4 left-4 min-w-48"
            title="建模统计"
          >
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>地表顶点:</span>
                <span className="font-medium">{modelingStats.n_vertices.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>三角形:</span>
                <span className="font-medium">{modelingStats.n_triangles.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>钻孔数量:</span>
                <span className="font-medium">{modelingStats.n_boreholes}</span>
              </div>
              <div className="flex justify-between">
                <span>物理组:</span>
                <span className="font-medium">{modelingStats.n_physical_groups}</span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* 右侧控制面板 */}
      <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
        {/* 标题 */}
        <div className="p-4 border-b border-gray-200">
          <Title level={4} className="mb-2">三维地质建模</Title>
          <Text type="secondary" className="text-sm">
            基于钻孔数据的专业地质建模系统
          </Text>
        </div>

        {/* 配置面板 */}
        <div className="flex-1 overflow-auto p-2 space-y-3">
          {/* 地质建模配置 */}
          <GeologyModelingConfig
            onModelingMethodChange={() => {}}
            onBoreholeDataLoad={handleBoreholeDataLoad}
            boreholeCount={boreholes.length}
            isLoading={isLoading}
          />

          {/* 设置建模范围 */}
          <ModelingRangeConfig
            boreholeExtent={boreholeExtent}
            onDomainChange={setComputationDomain}
            isLoading={isLoading}
          />

          {/* 插值参数设置 */}
          <InterpolationParamsConfig
            onRBFParamsChange={setRBFParams}
            isLoading={isLoading}
          />
        </div>

        {/* 底部操作按钮 */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <Button
            type="primary"
            icon={<RocketOutlined />}
            onClick={handleStartModeling}
            disabled={isLoading || boreholes.length === 0}
            className="w-full"
            size="large"
          >
            开始建模
          </Button>
          
          {modelingResult && (
            <Button
              icon={<EyeOutlined />}
              onClick={handleViewResults}
              className="w-full"
            >
              查看结果
            </Button>
          )}

          <div className="text-xs text-center text-gray-500 pt-2">
            {boreholes.length > 0 ? (
              <span>✓ 已准备 {boreholes.length} 个钻孔数据</span>
            ) : (
              <span>请加载钻孔数据开始建模</span>
            )}
          </div>
        </div>
      </div>

      {/* 建模进度弹窗 */}
      <ModelingProgressModal
        visible={progressModalVisible}
        onCancel={() => setProgressModalVisible(false)}
        onComplete={handleModelingComplete}
        onError={handleModelingError}
        modelingParams={{ rbf_params: rbfParams, gmsh_params: gmshParams, computation_domain: computationDomain }}
      />
    </div>
  );
};

export default GeologyModelingView;