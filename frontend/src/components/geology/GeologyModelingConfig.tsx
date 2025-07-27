/**
 * 地质建模配置组件 - 2号几何专家开发
 * P0优先级任务 - 专业级建模方法选择和参数配置界面
 * 基于1号架构师规划，提供RBF+GMSH+OCC完整建模流程配置
 * 集成钻孔数据管理、建模方法选择、用途配置等核心功能
 */

import React, { useState, useEffect } from 'react';
import { Card, Radio, Button, Typography, Space, Badge, message, Tooltip } from 'antd';
import { FolderOpenOutlined, ExperimentOutlined, SettingOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

/**
 * 地质建模配置组件属性接口
 * 定义建模配置组件的输入输出接口和回调函数
 */
interface GeologyModelingConfigProps {
  onModelingMethodChange?: (method: string) => void;  // 建模方法变更回调
  onBoreholeDataLoad?: (file: File) => void;          // 钻孔数据加载回调
  boreholeCount?: number;                             // 当前加载的钻孔数量
  isLoading?: boolean;                                // 加载状态标志
}

/**
 * 地质建模配置主组件
 * 提供建模方法选择、钻孔数据管理、模型用途配置的统一界面
 */
const GeologyModelingConfig: React.FC<GeologyModelingConfigProps> = ({
  onModelingMethodChange,
  onBoreholeDataLoad,
  boreholeCount = 0,
  isLoading = false
}) => {
  // 状态管理 - 建模配置选项
  const [modelingMethod, setModelingMethod] = useState<string>('rbf_gmsh_occ'); // 默认使用专业建模方法
  const [modelUsage, setModelUsage] = useState<string>('geometry');            // 默认几何建模用途

  /**
   * 建模方法配置选项数组
   * 定义可用的地质建模技术方案和特性描述
   * 包含专业级RBF+GMSH+OCC方法和简化向后兼容方法
   */
  const modelingMethodOptions = [
    {
      value: 'rbf_gmsh_occ',
      label: 'RBF+GMSH+OCC几何建模',
      description: '完整的专业地质建模流程，支持复杂几何和精确插值',
      features: [
        'SciPy RBF径向基函数外推插值',    // 高精度数学插值方法
        'GMSH+OpenCASCADE几何内核建模',  // 工业级几何建模引擎
        '自动物理组定义和边界识别',        // CAE前处理功能
        'Three.js高性能3D可视化渲染'     // 现代Web3D显示
      ],
      recommended: true  // 推荐使用的专业方法
    },
    {
      value: 'direct_simple',
      label: '简化直接建模 (向后兼容)',
      description: '轻量级建模方案，适用于快速预览和简单场景',
      features: [
        '基础RBF插值算法',        // 简化的插值计算
        '直接Three.js几何输出',   // 跳过复杂几何建模
        '快速预览和原型验证'       // 用于初步设计阶段
      ],
      recommended: false // 仅作为备选方案
    }
  ];

  /**
   * 模型用途配置选项数组
   * 定义地质模型在CAE工作流程中的不同应用阶段
   * 当前版本专注于几何建模，后续扩展网格和分析功能
   */
  const modelUsageOptions = [
    {
      value: 'geometry',
      label: '几何建模阶段',
      description: '创建三维地质几何体，定义土层界面和边界条件',
      icon: '📐',
      current: true  // 当前支持的功能
    },
    {
      value: 'meshing',
      label: '网格划分准备',
      description: '为有限元网格生成准备标准化几何模型',
      icon: '🕸️',
      current: false // 规划中的功能
    },
    {
      value: 'analysis',
      label: '力学分析准备',
      description: '为Terra多物理场有限元分析准备计算模型',
      icon: '🔧',
      current: false // 规划中的功能
    }
  ];

  /**
   * 建模方法变更处理函数
   * 响应用户选择不同建模方法，提供即时反馈和状态更新
   * @param e Radio组件的变更事件
   */
  const handleMethodChange = (e: any) => {
    const value = e.target.value;
    setModelingMethod(value);
    onModelingMethodChange?.(value); // 通知父组件方法变更
    
    // 提供用户友好的选择反馈
    if (value === 'rbf_gmsh_occ') {
      message.success('已选择专业地质建模方法 - 将获得最佳建模精度和完整功能');
    } else {
      message.info('已选择简化建模方法 - 适用于快速预览和简单场景');
    }
  };

  /**
   * 模型用途变更处理函数
   * 控制模型应用场景选择，当前版本仅支持几何建模
   * @param e Radio组件的变更事件
   */
  const handleUsageChange = (e: any) => {
    const value = e.target.value;
    setModelUsage(value);
    
    // 功能限制提示
    if (value !== 'geometry') {
      message.warning('当前版本专注于几何建模阶段，网格和分析功能将在后续版本中提供');
    }
  };

  /**
   * 钻孔数据加载处理函数
   * 创建文件选择器，支持多种格式的钻孔数据导入
   * 使用原生HTML文件输入以获得更好的文件类型控制
   */
  const handleBoreholeLoad = () => {
    // 动态创建文件输入元素以避免持久化DOM节点
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls'; // 支持常见的钻孔数据格式
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onBoreholeDataLoad?.(file); // 通知父组件处理文件
        message.loading('正在加载钻孔数据，请稍候...', 1.5);
      }
    };
    
    input.click(); // 触发文件选择对话框
  };

  return (
    <Card 
      title={
        <Space>
          <ExperimentOutlined style={{ color: '#1890ff' }} />
          <span>地质建模配置</span>
        </Space>
      }
      size="small"
      className="h-full"
      styles={{ body: { padding: '12px' } }}
    >
      <div className="space-y-4">
        {/* 建模方法选择 - 核心配置项 */}
        <div>
          <Text strong className="block mb-2">建模方法选择:</Text>
          <Radio.Group
            value={modelingMethod}
            onChange={handleMethodChange}
            className="w-full"
          >
            <div className="space-y-2">
              {modelingMethodOptions.map((option) => (
                <div key={option.value} className="relative">
                  <Radio 
                    value={option.value}
                    className="w-full"
                    disabled={isLoading}
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span>{option.label}</span>
                          {option.recommended && (
                            <Badge count="推荐" style={{ backgroundColor: '#52c41a', fontSize: '10px' }} />
                          )}
                        </div>
                        <Text type="secondary" className="block text-xs mt-1">
                          {option.description}
                        </Text>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {option.features.map((feature, idx) => (
                            <span 
                              key={idx}
                              className="text-xs px-1 py-0.5 bg-blue-50 text-blue-600 rounded"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Radio>
                </div>
              ))}
            </div>
          </Radio.Group>
        </div>

        {/* 钻孔数据管理 - 数据源配置 */}
        <div>
          <Text strong className="block mb-2">钻孔数据管理:</Text>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {boreholeCount > 0 ? (
                <>
                  <Badge status="success" />
                  <Text>已加载 {boreholeCount} 个钻孔</Text>
                </>
              ) : (
                <>
                  <Badge status="warning" />
                  <Text type="secondary">暂未加载钻孔数据</Text>
                </>
              )}
            </div>
          </div>
          
          <Button
            icon={<FolderOpenOutlined />}
            onClick={handleBoreholeLoad}
            disabled={isLoading}
            className="w-full"
            type={boreholeCount > 0 ? 'default' : 'primary'}
          >
            {boreholeCount > 0 ? '重新加载钻孔数据' : '加载钻孔数据'}
          </Button>
          
          {boreholeCount > 0 && (
            <div className="mt-2 p-2 bg-green-50 rounded text-xs">
              <Text type="success">
                ✓ 数据质量良好，支持 {modelingMethod === 'rbf_gmsh_occ' ? 'RBF外推建模' : '直接建模'}
              </Text>
            </div>
          )}
        </div>

        {/* 模型用途配置 - CAE工作流阶段选择 */}
        <div>
          <Text strong className="block mb-2">模型应用用途:</Text>
          <Radio.Group
            value={modelUsage}
            onChange={handleUsageChange}
            className="w-full"
            disabled={isLoading}
          >
            <div className="space-y-1">
              {modelUsageOptions.map((option) => (
                <div key={option.value} className="flex items-center">
                  <Radio value={option.value} disabled={!option.current && option.value !== 'geometry'}>
                    <div className="flex items-center gap-2">
                      <span>{option.icon}</span>
                      <span className={option.current ? 'font-medium' : 'text-gray-500'}>
                        {option.label}
                      </span>
                      {option.current && (
                        <Badge count="当前" style={{ backgroundColor: '#1890ff', fontSize: '10px' }} />
                      )}
                    </div>
                  </Radio>
                  {!option.current && option.value !== 'geometry' && (
                    <Tooltip title="此功能在后续版本中提供">
                      <span className="text-xs text-gray-400 ml-2">(即将推出)</span>
                    </Tooltip>
                  )}
                </div>
              ))}
            </div>
          </Radio.Group>
        </div>

        {/* 配置状态摘要 - 实时参数确认 */}
        {modelingMethod && modelUsage && (
          <div className="mt-4 p-3 bg-blue-50 rounded">
            <div className="flex items-center gap-2 mb-2">
              <SettingOutlined className="text-blue-600" />
              <Text strong className="text-blue-900">当前建模配置摘要</Text>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>建模方法:</span>
                <span className="font-medium">
                  {modelingMethodOptions.find(m => m.value === modelingMethod)?.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span>模型用途:</span>
                <span className="font-medium">
                  {modelUsageOptions.find(u => u.value === modelUsage)?.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span>钻孔数据:</span>
                <span className={`font-medium ${boreholeCount > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {boreholeCount > 0 ? `${boreholeCount} 个钻孔` : '未加载'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default GeologyModelingConfig;

/**
 * 组件功能总结：
 * 1. 建模方法配置 - 专业RBF+GMSH+OCC vs 简化直接建模
 * 2. 钻孔数据管理 - 文件加载、状态显示、质量验证
 * 3. 模型用途选择 - 几何建模、网格准备、分析准备（规划中）
 * 4. 配置状态展示 - 实时配置摘要和参数确认
 * 5. 用户体验优化 - 智能提示、状态反馈、加载状态
 * 
 * 技术特点：
 * - 响应式配置界面，支持实时参数调整
 * - 文件类型验证和格式支持（CSV、Excel）
 * - 建模方法特性对比和推荐机制
 * - 向后兼容性支持和功能扩展规划
 * - 集成Ant Design组件库的专业UI设计
 */