/**
 * DeepCAD CAE参数配置面板
 * 1号架构师 - 专业CAE参数输入界面
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { Card } from './Card';
import { Input } from './Input';
import { Modal } from './Modal';
import { FunctionalIcons, StatusIcons } from '../icons/SimpleIcons';
import { designTokens } from '../../design/tokens';

// ==================== 类型定义 ====================

export interface CAEParameterPanelProps {
  className?: string;
  style?: React.CSSProperties;
  onParametersChange?: (parameters: CAEParameters) => void;
  onAnalysisStart?: (parameters: CAEParameters) => void;
}

export interface CAEParameters {
  // 几何参数
  geometry: {
    excavationDepth: number;        // 开挖深度 (m)
    excavationWidth: number;        // 开挖宽度 (m)  
    excavationLength: number;       // 开挖长度 (m)
    soilLayerThickness: number[];   // 土层厚度 (m)
    retainingWallThickness: number; // 围护结构厚度 (mm)
    embedmentDepth: number;         // 嵌固深度 (m)
  };
  
  // 网格参数
  mesh: {
    globalSize: number;             // 全局网格尺寸 (m)
    minSize: number;                // 最小网格尺寸 (m)
    maxSize: number;                // 最大网格尺寸 (m)
    refinementLevels: number;       // 细化层数
    curvatureAngle: number;         // 曲率角度 (度)
    proximitySize: number;          // 邻近尺寸 (m)
  };
  
  // 材料参数
  material: {
    soilCohesion: number;           // 土壤粘聚力 (kPa)
    frictionAngle: number;          // 内摩擦角 (度)
    elasticModulus: number;         // 弹性模量 (MPa)
    poissonRatio: number;           // 泊松比
    density: number;                // 密度 (kg/m³)
    permeability: number;           // 渗透系数 (m/s)
  };
  
  // 计算参数
  computation: {
    analysisType: 'static' | 'dynamic' | 'coupled';
    timeSteps: number;              // 时间步数
    timeIncrement: number;          // 时间增量 (s)
    convergenceTolerance: number;   // 收敛容差
    maxIterations: number;          // 最大迭代次数
    dampingRatio: number;           // 阻尼比
  };
  
  // 边界条件
  boundary: {
    fixedSupports: string[];        // 固定支撑位置
    loadingConditions: Array<{
      type: 'uniform' | 'linear' | 'point';
      magnitude: number;            // 载荷大小 (kN/m²)
      location: string;             // 载荷位置
    }>;
    groundwaterLevel: number;       // 地下水位 (m)
  };
}

// 默认参数
const DEFAULT_PARAMETERS: CAEParameters = {
  geometry: {
    excavationDepth: 15.0,
    excavationWidth: 50.0,
    excavationLength: 80.0,
    soilLayerThickness: [5.0, 8.0, 12.0],
    retainingWallThickness: 800,
    embedmentDepth: 3.0
  },
  mesh: {
    globalSize: 2.0,
    minSize: 0.5,
    maxSize: 5.0,
    refinementLevels: 3,
    curvatureAngle: 15.0,
    proximitySize: 1.0
  },
  material: {
    soilCohesion: 20.0,
    frictionAngle: 28.0,
    elasticModulus: 15.0,
    poissonRatio: 0.35,
    density: 1850.0,
    permeability: 1e-6
  },
  computation: {
    analysisType: 'static',
    timeSteps: 100,
    timeIncrement: 0.1,
    convergenceTolerance: 1e-6,
    maxIterations: 50,
    dampingRatio: 0.05
  },
  boundary: {
    fixedSupports: ['bottom', 'sides'],
    loadingConditions: [
      { type: 'uniform', magnitude: 20.0, location: 'surface' }
    ],
    groundwaterLevel: -8.0
  }
};

// ==================== 参数验证 ====================

const validateParameters = (params: Partial<CAEParameters>): { [key: string]: string } => {
  const errors: { [key: string]: string } = {};
  
  // 几何参数验证
  if (params.geometry) {
    const { excavationDepth, excavationWidth, excavationLength } = params.geometry;
    if (excavationDepth <= 0) errors.excavationDepth = '开挖深度必须大于0';
    if (excavationWidth <= 0) errors.excavationWidth = '开挖宽度必须大于0';
    if (excavationLength <= 0) errors.excavationLength = '开挖长度必须大于0';
    if (excavationDepth > 50) errors.excavationDepth = '开挖深度不能超过50m';
  }
  
  // 网格参数验证
  if (params.mesh) {
    const { globalSize, minSize, maxSize } = params.mesh;
    if (minSize >= maxSize) errors.minSize = '最小网格尺寸必须小于最大尺寸';
    if (globalSize < minSize || globalSize > maxSize) {
      errors.globalSize = '全局网格尺寸必须在最小和最大尺寸之间';
    }
  }
  
  // 材料参数验证
  if (params.material) {
    const { frictionAngle, poissonRatio, permeability } = params.material;
    if (frictionAngle < 0 || frictionAngle > 45) {
      errors.frictionAngle = '内摩擦角应在0-45度之间';
    }
    if (poissonRatio < 0 || poissonRatio > 0.5) {
      errors.poissonRatio = '泊松比应在0-0.5之间';
    }
    if (permeability <= 0) errors.permeability = '渗透系数必须大于0';
  }
  
  return errors;
};

// ==================== 主组件 ====================

export const CAEParameterPanel: React.FC<CAEParameterPanelProps> = ({
  className = '',
  style,
  onParametersChange,
  onAnalysisStart
}) => {
  // 状态管理
  const [parameters, setParameters] = useState<CAEParameters>(DEFAULT_PARAMETERS);
  const [activeSection, setActiveSection] = useState<string>('geometry');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // 参数更新处理
  const updateParameters = useCallback((section: keyof CAEParameters, field: string, value: any) => {
    const newParameters = {
      ...parameters,
      [section]: {
        ...parameters[section],
        [field]: value
      }
    };
    
    setParameters(newParameters);
    
    // 实时验证
    const validationErrors = validateParameters(newParameters);
    setErrors(validationErrors);
    
    onParametersChange?.(newParameters);
  }, [parameters, onParametersChange]);

  // 批量导入参数
  const handleImportParameters = useCallback((importedParams: Partial<CAEParameters>) => {
    const mergedParams = { ...parameters, ...importedParams };
    setParameters(mergedParams);
    
    const validationErrors = validateParameters(mergedParams);
    setErrors(validationErrors);
  }, [parameters]);

  // 开始分析
  const handleStartAnalysis = useCallback(async () => {
    setIsValidating(true);
    
    // 完整验证
    const validationErrors = validateParameters(parameters);
    setErrors(validationErrors);
    
    if (Object.keys(validationErrors).length === 0) {
      onAnalysisStart?.(parameters);
    }
    
    setTimeout(() => setIsValidating(false), 1000);
  }, [parameters, onAnalysisStart]);

  // 参数面板导航
  const sections = [
    { id: 'geometry', name: '几何参数', icon: <FunctionalIcons.GeologyModeling size={20} /> },
    { id: 'mesh', name: '网格参数', icon: <FunctionalIcons.MeshGeneration size={20} /> },
    { id: 'material', name: '材料参数', icon: <FunctionalIcons.MaterialLibrary size={20} /> },
    { id: 'computation', name: '计算参数', icon: <FunctionalIcons.GPUComputing size={20} /> },
    { id: 'boundary', name: '边界条件', icon: <FunctionalIcons.StructuralAnalysis size={20} /> }
  ];

  return (
    <motion.div
      className={`cae-parameter-panel ${className}`}
      style={{
        display: 'flex',
        gap: designTokens.spacing[6],
        padding: designTokens.spacing[6],
        background: designTokens.colors.background.primary,
        minHeight: '100vh',
        ...style
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* 左侧导航 */}
      <div style={{
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        gap: designTokens.spacing[4]
      }}>
        {/* 标题 */}
        <Card variant="glass" size="sm">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: designTokens.spacing[3]
          }}>
            <FunctionalIcons.ExcavationDesign size={24} color={designTokens.colors.primary[400]} />
            <div>
              <h2 style={{
                color: designTokens.colors.neutral[100],
                fontSize: designTokens.typography.fontSize.lg,
                fontWeight: designTokens.typography.fontWeight.bold,
                margin: 0
              }}>
                CAE参数配置
              </h2>
              <p style={{
                color: designTokens.colors.neutral[400],
                fontSize: designTokens.typography.fontSize.sm,
                margin: 0
              }}>
                深基坑分析参数设置
              </p>
            </div>
          </div>
        </Card>

        {/* 导航菜单 */}
        <Card variant="default">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: designTokens.spacing[2]
          }}>
            {sections.map((section) => (
              <Button
                key={section.id}
                variant={activeSection === section.id ? 'primary' : 'ghost'}
                size="sm"
                leftIcon={section.icon}
                onClick={() => setActiveSection(section.id)}
                style={{
                  justifyContent: 'flex-start',
                  width: '100%'
                }}
              >
                {section.name}
              </Button>
            ))}
          </div>
        </Card>

        {/* 快捷功能 */}
        <Card variant="outlined">
          <h3 style={{
            color: designTokens.colors.neutral[100],
            fontSize: designTokens.typography.fontSize.base,
            fontWeight: designTokens.typography.fontWeight.semibold,
            marginBottom: designTokens.spacing[4]
          }}>
            快捷功能
          </h3>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: designTokens.spacing[3]
          }}>
            <Button
              variant="outline"
              size="sm"
              leftIcon="📁"
              onClick={() => {/* 导入参数逻辑 */}}
            >
              导入参数
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon="💾"
              onClick={() => {/* 保存参数逻辑 */}}
            >
              保存参数
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon="👁"
              onClick={() => setShowPreview(true)}
            >
              预览设置
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon="⚙️"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? '隐藏高级' : '显示高级'}
            </Button>
          </div>
        </Card>

        {/* 分析按钮 */}
        <Button
          variant="primary"
          size="lg"
          glow
          loading={isValidating}
          onClick={handleStartAnalysis}
          disabled={Object.keys(errors).length > 0}
          leftIcon="🚀"
        >
          开始分析
        </Button>

        {/* 错误统计 */}
        {Object.keys(errors).length > 0 && (
          <Card variant="outlined" caeType="analysis" status="error">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: designTokens.spacing[2]
            }}>
              <StatusIcons.Error size={20} color={designTokens.colors.semantic.error} />
              <div>
                <p style={{
                  color: designTokens.colors.neutral[100],
                  fontSize: designTokens.typography.fontSize.sm,
                  fontWeight: designTokens.typography.fontWeight.medium,
                  margin: 0
                }}>
                  发现 {Object.keys(errors).length} 个参数错误
                </p>
                <p style={{
                  color: designTokens.colors.neutral[400],
                  fontSize: designTokens.typography.fontSize.xs,
                  margin: 0
                }}>
                  请检查并修正参数设置
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* 主参数配置区域 */}
      <div style={{ flex: 1 }}>
        <AnimatePresence mode="wait">
          {/* 几何参数 */}
          {activeSection === 'geometry' && (
            <motion.div
              key="geometry"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card variant="premium" size="lg">
                <h2 style={{
                  color: designTokens.colors.primary[400],
                  fontSize: designTokens.typography.fontSize['2xl'],
                  fontWeight: designTokens.typography.fontWeight.bold,
                  marginBottom: designTokens.spacing[6],
                  display: 'flex',
                  alignItems: 'center',
                  gap: designTokens.spacing[3]
                }}>
                  <FunctionalIcons.GeologyModeling size={28} color={designTokens.colors.semantic.geometry} />
                  几何参数配置
                </h2>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: designTokens.spacing[6]
                }}>
                  <Input
                    label="开挖深度"
                    caeType="parameter"
                    type="number"
                    value={parameters.geometry.excavationDepth}
                    unit="m"
                    precision={1}
                    min={0}
                    max={50}
                    leftIcon="📏"
                    helperText="基坑的最大开挖深度"
                    errorMessage={errors.excavationDepth}
                    status={errors.excavationDepth ? 'error' : 'default'}
                    onChange={(e) => updateParameters('geometry', 'excavationDepth', parseFloat(e.target.value))}
                    fluid
                  />
                  
                  <Input
                    label="开挖宽度"
                    caeType="parameter"
                    type="number"
                    value={parameters.geometry.excavationWidth}
                    unit="m"
                    precision={1}
                    min={0}
                    leftIcon="↔️"
                    helperText="基坑的开挖宽度"
                    errorMessage={errors.excavationWidth}
                    status={errors.excavationWidth ? 'error' : 'default'}
                    onChange={(e) => updateParameters('geometry', 'excavationWidth', parseFloat(e.target.value))}
                    fluid
                  />
                  
                  <Input
                    label="开挖长度"
                    caeType="parameter"
                    type="number"
                    value={parameters.geometry.excavationLength}
                    unit="m"
                    precision={1}
                    min={0}
                    leftIcon="↕️"
                    helperText="基坑的开挖长度"
                    errorMessage={errors.excavationLength}
                    status={errors.excavationLength ? 'error' : 'default'}
                    onChange={(e) => updateParameters('geometry', 'excavationLength', parseFloat(e.target.value))}
                    fluid
                  />
                  
                  <Input
                    label="围护结构厚度"
                    caeType="parameter"
                    type="number"
                    value={parameters.geometry.retainingWallThickness}
                    unit="mm"
                    precision={0}
                    min={200}
                    max={2000}
                    leftIcon="🧱"
                    helperText="围护结构的厚度"
                    onChange={(e) => updateParameters('geometry', 'retainingWallThickness', parseFloat(e.target.value))}
                    fluid
                  />
                  
                  <Input
                    label="嵌固深度"
                    caeType="parameter"
                    type="number"
                    value={parameters.geometry.embedmentDepth}
                    unit="m"
                    precision={1}
                    min={0}
                    leftIcon="⚓"
                    helperText="围护结构的嵌固深度"
                    onChange={(e) => updateParameters('geometry', 'embedmentDepth', parseFloat(e.target.value))}
                    fluid
                  />
                </div>

                {/* 几何预览 */}
                <Card variant="glass" size="sm" style={{ marginTop: designTokens.spacing[6] }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: designTokens.spacing[4]
                  }}>
                    <h3 style={{
                      color: designTokens.colors.neutral[100],
                      fontSize: designTokens.typography.fontSize.lg,
                      fontWeight: designTokens.typography.fontWeight.semibold,
                      margin: 0
                    }}>
                      几何参数总览
                    </h3>
                    <StatusIcons.Completed size={20} color={designTokens.colors.semantic.success} />
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: designTokens.spacing[4],
                    fontSize: designTokens.typography.fontSize.sm
                  }}>
                    <div>
                      <span style={{ color: designTokens.colors.neutral[400] }}>开挖体积：</span>
                      <span style={{ 
                        color: designTokens.colors.neutral[100],
                        fontFamily: designTokens.typography.fontFamily.mono.join(', '),
                        fontWeight: designTokens.typography.fontWeight.medium
                      }}>
                        {(parameters.geometry.excavationDepth * 
                          parameters.geometry.excavationWidth * 
                          parameters.geometry.excavationLength).toLocaleString()} m³
                      </span>
                    </div>
                    
                    <div>
                      <span style={{ color: designTokens.colors.neutral[400] }}>围护面积：</span>
                      <span style={{ 
                        color: designTokens.colors.neutral[100],
                        fontFamily: designTokens.typography.fontFamily.mono.join(', '),
                        fontWeight: designTokens.typography.fontWeight.medium
                      }}>
                        {(2 * (parameters.geometry.excavationWidth + parameters.geometry.excavationLength) * 
                          parameters.geometry.excavationDepth).toLocaleString()} m²
                      </span>
                    </div>
                  </div>
                </Card>
              </Card>
            </motion.div>
          )}

          {/* 其他参数面板可以类似实现... */}
          {activeSection !== 'geometry' && (
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card variant="glass" size="lg">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '400px',
                  flexDirection: 'column',
                  gap: designTokens.spacing[4]
                }}>
                  <FunctionalIcons.ConstructionProgress size={64} color={designTokens.colors.neutral[600]} />
                  <h3 style={{
                    color: designTokens.colors.neutral[300],
                    fontSize: designTokens.typography.fontSize.xl,
                    fontWeight: designTokens.typography.fontWeight.medium,
                    margin: 0
                  }}>
                    {sections.find(s => s.id === activeSection)?.name} 开发中
                  </h3>
                  <p style={{
                    color: designTokens.colors.neutral[500],
                    fontSize: designTokens.typography.fontSize.base,
                    textAlign: 'center',
                    margin: 0
                  }}>
                    该参数面板正在开发中，敬请期待更多专业CAE参数配置功能
                  </p>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 参数预览模态框 */}
      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        variant="premium"
        size="lg"
        title="参数配置预览"
        description="当前CAE分析参数的完整配置"
        caeType="analysis"
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: designTokens.spacing[4],
          maxHeight: '500px',
          overflow: 'auto'
        }}>
          {Object.entries(parameters).map(([section, values]) => (
            <Card key={section} variant="outlined" size="sm">
              <h4 style={{
                color: designTokens.colors.primary[400],
                fontSize: designTokens.typography.fontSize.base,
                fontWeight: designTokens.typography.fontWeight.semibold,
                marginBottom: designTokens.spacing[3],
                textTransform: 'capitalize'
              }}>
                {sections.find(s => s.id === section)?.name || section}
              </h4>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: designTokens.spacing[2],
                fontSize: designTokens.typography.fontSize.sm
              }}>
                {Object.entries(values).map(([key, value]) => (
                  <div key={key} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: designTokens.colors.neutral[400] }}>
                      {key}:
                    </span>
                    <span style={{ 
                      color: designTokens.colors.neutral[100],
                      fontFamily: designTokens.typography.fontFamily.mono.join(', ')
                    }}>
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Modal>
    </motion.div>
  );
};

export default CAEParameterPanel;