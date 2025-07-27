/**
 * DeepCAD 材料编辑器核心组件
 * 2号几何专家 - 专业CAE材料属性编辑界面
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MaterialDefinition, 
  MaterialType, 
  ConstitutiveModel,
  BaseMaterialProperties,
  ConcreteMaterialProperties,
  SteelMaterialProperties,
  SoilMaterialProperties,
  RockMaterialProperties,
  MaterialValidationResult
} from '../../interfaces/MaterialInterfaces';
import { moduleHub } from '../../integration/ModuleIntegrationHub';
import { logger } from '../../utils/advancedLogger';
import { designTokens } from '../../design/tokens';
import Button from '../ui/Button';
import Input from '../ui/Input';
import GlassmorphismCard from '../ui/GlassmorphismCard';

// 组件属性接口
interface MaterialEditorProps {
  material?: MaterialDefinition;
  isVisible: boolean;
  onClose: () => void;
  onSave: (material: MaterialDefinition) => void;
  onValidation?: (result: MaterialValidationResult) => void;
}

// 材料类型选项
const MATERIAL_TYPE_OPTIONS = [
  { value: MaterialType.CONCRETE, label: '混凝土', icon: '🏗️' },
  { value: MaterialType.STEEL, label: '钢材', icon: '⚡' },
  { value: MaterialType.SOIL, label: '土体', icon: '🌍' },
  { value: MaterialType.ROCK, label: '岩石', icon: '🗿' },
  { value: MaterialType.COMPOSITE, label: '复合材料', icon: '🔗' },
  { value: MaterialType.COMPACTED_SOIL, label: '挤密土体', icon: '🏗️' }
];

// 本构模型选项
const CONSTITUTIVE_MODEL_OPTIONS = [
  { value: ConstitutiveModel.LINEAR_ELASTIC, label: '线弹性', description: '经典线性弹性模型' },
  { value: ConstitutiveModel.NONLINEAR_ELASTIC, label: '非线性弹性', description: '考虑几何或材料非线性' },
  { value: ConstitutiveModel.ELASTOPLASTIC, label: '弹塑性', description: '考虑塑性变形' },
  { value: ConstitutiveModel.MOHR_COULOMB, label: '摩尔-库伦', description: '经典土体破坏准则' },
  { value: ConstitutiveModel.DRUCKER_PRAGER, label: '德鲁克-普拉格', description: '光滑屈服面模型' },
  { value: ConstitutiveModel.CAM_CLAY, label: '剑桥模型', description: '考虑硬化的土体模型' },
  { value: ConstitutiveModel.HARDENING_SOIL, label: '硬化土模型', description: '高级非线性土体模型' },
  { value: ConstitutiveModel.SMALL_STRAIN_STIFFNESS, label: '小应变刚度', description: '考虑小应变刚度特性' }
];

const MaterialEditor: React.FC<MaterialEditorProps> = ({
  material,
  isVisible,
  onClose,
  onSave,
  onValidation
}) => {
  // 状态管理
  const [editingMaterial, setEditingMaterial] = useState<MaterialDefinition | null>(null);
  const [validationResult, setValidationResult] = useState<MaterialValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'testing' | 'metadata'>('basic');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 初始化编辑材料
  useEffect(() => {
    if (isVisible) {
      if (material) {
        setEditingMaterial({ ...material });
        setHasUnsavedChanges(false);
      } else {
        // 创建新材料
        const newMaterial: MaterialDefinition = {
          id: `material_${Date.now()}`,
          name: '新材料',
          type: MaterialType.CONCRETE,
          constitutiveModel: ConstitutiveModel.LINEAR_ELASTIC,
          properties: {
            density: 2400,
            elasticModulus: 30e9,
            poissonRatio: 0.2
          } as BaseMaterialProperties,
          created: new Date(),
          modified: new Date(),
          version: '1.0.0'
        };
        setEditingMaterial(newMaterial);
        setHasUnsavedChanges(true);
      }
      
      // 重置验证结果
      setValidationResult(null);
      setActiveTab('basic');
    }
  }, [material, isVisible]);

  // 更新材料属性
  const updateMaterial = useCallback((updates: Partial<MaterialDefinition>) => {
    if (!editingMaterial) return;
    
    const updatedMaterial = {
      ...editingMaterial,
      ...updates,
      modified: new Date()
    };
    
    setEditingMaterial(updatedMaterial);
    setHasUnsavedChanges(true);
    
    // 实时验证
    validateMaterial(updatedMaterial);
  }, [editingMaterial]);

  // 更新材料属性字段
  const updateProperties = useCallback((propertyUpdates: Partial<any>) => {
    if (!editingMaterial) return;
    
    const updatedProperties = {
      ...editingMaterial.properties,
      ...propertyUpdates
    };
    
    updateMaterial({ properties: updatedProperties });
  }, [editingMaterial, updateMaterial]);

  // 材料验证
  const validateMaterial = useCallback(async (materialToValidate: MaterialDefinition) => {
    setIsValidating(true);
    
    try {
      // 模拟验证过程
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const errors: string[] = [];
      const warnings: string[] = [];
      const suggestions: string[] = [];
      const propertyValidation: any = {};
      
      // 基础属性验证
      const props = materialToValidate.properties as BaseMaterialProperties;
      
      // 密度验证
      if (props.density <= 0) {
        errors.push('密度必须大于0');
        propertyValidation.density = { isValid: false, message: '密度值无效' };
      } else if (props.density < 1000 || props.density > 8000) {
        warnings.push('密度值可能超出常规范围');
        propertyValidation.density = { 
          isValid: true, 
          message: '密度值偏离常规范围',
          expectedRange: [1000, 8000],
          actualValue: props.density
        };
      } else {
        propertyValidation.density = { isValid: true };
      }
      
      // 弹性模量验证
      if (props.elasticModulus <= 0) {
        errors.push('弹性模量必须大于0');
        propertyValidation.elasticModulus = { isValid: false, message: '弹性模量值无效' };
      } else {
        propertyValidation.elasticModulus = { isValid: true };
      }
      
      // 泊松比验证
      if (props.poissonRatio < 0 || props.poissonRatio >= 0.5) {
        errors.push('泊松比必须在0到0.5之间');
        propertyValidation.poissonRatio = { 
          isValid: false, 
          message: '泊松比超出有效范围',
          expectedRange: [0, 0.5],
          actualValue: props.poissonRatio
        };
      } else {
        propertyValidation.poissonRatio = { isValid: true };
      }
      
      // 根据材料类型进行专门验证
      if (materialToValidate.type === MaterialType.CONCRETE) {
        const concreteProps = props as ConcreteMaterialProperties;
        if (concreteProps.compressiveStrength && concreteProps.compressiveStrength <= 0) {
          errors.push('混凝土抗压强度必须大于0');
        }
      } else if (materialToValidate.type === MaterialType.SOIL) {
        const soilProps = props as SoilMaterialProperties;
        if (soilProps.frictionAngle && (soilProps.frictionAngle < 0 || soilProps.frictionAngle > 45)) {
          warnings.push('土体内摩擦角可能超出常规范围(0-45°)');
        }
      }
      
      // 生成建议
      if (materialToValidate.type === MaterialType.COMPACTED_SOIL) {
        suggestions.push('建议考虑挤密效应对周围土体的影响');
      }
      
      const result: MaterialValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
        propertyValidation
      };
      
      setValidationResult(result);
      
      if (onValidation) {
        onValidation(result);
      }
      
      logger.info('材料验证完成', { 
        materialId: materialToValidate.id,
        isValid: result.isValid,
        errorCount: errors.length,
        warningCount: warnings.length
      });
      
    } catch (error) {
      logger.error('材料验证失败', error);
    } finally {
      setIsValidating(false);
    }
  }, [onValidation]);

  // 保存材料
  const handleSave = useCallback(() => {
    if (!editingMaterial || !validationResult?.isValid) return;
    
    // 更新版本号
    const versionParts = editingMaterial.version.split('.');
    const newVersion = `${versionParts[0]}.${versionParts[1]}.${parseInt(versionParts[2]) + 1}`;
    
    const finalMaterial: MaterialDefinition = {
      ...editingMaterial,
      version: newVersion,
      modified: new Date(),
      validated: true
    };
    
    onSave(finalMaterial);
    setHasUnsavedChanges(false);
    
    // 发布到moduleHub
    moduleHub.emit('material:updated', {
      id: finalMaterial.id,
      action: material ? 'material_updated' : 'material_created',
      materialData: finalMaterial,
      timestamp: Date.now()
    });
    
    logger.info('材料保存成功', { 
      materialId: finalMaterial.id,
      materialName: finalMaterial.name,
      materialType: finalMaterial.type
    });
    
    onClose();
  }, [editingMaterial, validationResult, onSave, onClose, material]);

  // 关闭确认
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      if (window.confirm('有未保存的更改，确定要关闭吗？')) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  if (!isVisible || !editingMaterial) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          style={{
            width: '90%',
            maxWidth: '1200px',
            height: '85%',
            maxHeight: '800px',
            background: `linear-gradient(135deg, ${designTokens.colors.dark.surface}95, ${designTokens.colors.dark.card}95)`,
            backdropFilter: 'blur(20px)',
            borderRadius: '12px', // 1号架构师的优化：更扁平
            border: `1px solid ${designTokens.colors.accent.glow}40`, // 1号架构师的优化：更细腻
            padding: '24px', // 1号架构师的优化：更紧凑
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* 头部 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            borderBottom: `1px solid ${designTokens.colors.accent.glow}20`,
            paddingBottom: '16px'
          }}>
            <div>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 700,
                margin: 0,
                background: `linear-gradient(45deg, ${designTokens.colors.accent.glow}, ${designTokens.colors.accent.quantum})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {material ? '编辑材料' : '新建材料'}
              </h2>
              <p style={{
                color: designTokens.colors.light.secondary,
                margin: '4px 0 0 0',
                fontSize: '14px'
              }}>
                {editingMaterial.name} • {MATERIAL_TYPE_OPTIONS.find(opt => opt.value === editingMaterial.type)?.label}
                {hasUnsavedChanges && ' • 有未保存的更改'}
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* 验证状态指示器 */}
              {validationResult && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: validationResult.isValid 
                    ? `${designTokens.colors.semantic.success}20`
                    : `${designTokens.colors.semantic.error}20`,
                  border: `1px solid ${validationResult.isValid 
                    ? designTokens.colors.semantic.success
                    : designTokens.colors.semantic.error}40`
                }}>
                  <span style={{ fontSize: '12px' }}>
                    {validationResult.isValid ? '✅' : '❌'}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    color: validationResult.isValid 
                      ? designTokens.colors.semantic.success
                      : designTokens.colors.semantic.error
                  }}>
                    {validationResult.isValid ? '验证通过' : `${validationResult.errors.length}个错误`}
                  </span>
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                caeType="material"
                onClick={handleClose}
              >
                ✕ 关闭
              </Button>
            </div>
          </div>

          {/* 内容区域 */}
          <div style={{ flex: 1, display: 'flex', gap: '20px', overflow: 'hidden' }}>
            {/* 左侧标签栏 */}
            <div style={{
              width: '200px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {[
                { id: 'basic', label: '基础属性', icon: '🏗️' },
                { id: 'advanced', label: '高级参数', icon: '⚡' },
                { id: 'testing', label: '试验数据', icon: '🧪' },
                { id: 'metadata', label: '元数据', icon: '📋' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: activeTab === tab.id 
                      ? `${designTokens.colors.accent.glow}20`
                      : 'transparent',
                    color: activeTab === tab.id 
                      ? designTokens.colors.accent.glow
                      : designTokens.colors.light.secondary,
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* 右侧内容区 */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '0 8px'
              }}>
                {activeTab === 'basic' && (
                  <BasicPropertiesTab
                    material={editingMaterial}
                    validationResult={validationResult}
                    onUpdate={updateMaterial}
                    onUpdateProperties={updateProperties}
                  />
                )}
                
                {activeTab === 'advanced' && (
                  <AdvancedPropertiesTab
                    material={editingMaterial}
                    onUpdateProperties={updateProperties}
                  />
                )}
                
                {activeTab === 'testing' && (
                  <TestingDataTab
                    material={editingMaterial}
                    onUpdate={updateMaterial}
                  />
                )}
                
                {activeTab === 'metadata' && (
                  <MetadataTab
                    material={editingMaterial}
                    onUpdate={updateMaterial}
                  />
                )}
              </div>
              
              {/* 底部操作栏 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 0',
                borderTop: `1px solid ${designTokens.colors.accent.glow}20`,
                marginTop: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isValidating && (
                    <span style={{
                      color: designTokens.colors.light.secondary,
                      fontSize: '14px'
                    }}>
                      🔄 验证中...
                    </span>
                  )}
                  
                  {validationResult && !isValidating && (
                    <span style={{
                      color: validationResult.isValid 
                        ? designTokens.colors.semantic.success
                        : designTokens.colors.semantic.error,
                      fontSize: '14px'
                    }}>
                      {validationResult.isValid 
                        ? '✅ 材料属性验证通过'
                        : `❌ ${validationResult.errors.length}个验证错误`
                      }
                    </span>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Button
                    variant="outline"
                    size="md"
                    caeType="material"
                    onClick={handleClose}
                  >
                    取消
                  </Button>
                  
                  <Button
                    variant="primary"
                    size="md"
                    caeType="material"
                    glow={true}
                    disabled={!validationResult?.isValid || isValidating}
                    onClick={handleSave}
                  >
                    {material ? '保存更改' : '创建材料'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// 基础属性标签页
const BasicPropertiesTab: React.FC<{
  material: MaterialDefinition;
  validationResult: MaterialValidationResult | null;
  onUpdate: (updates: Partial<MaterialDefinition>) => void;
  onUpdateProperties: (updates: Partial<any>) => void;
}> = ({ material, validationResult, onUpdate, onUpdateProperties }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 基本信息 */}
      <GlassmorphismCard title="基本信息" variant="pro">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px' }}>
          <div>
            <label style={{ 
              display: 'block', 
              color: designTokens.colors.light.secondary, 
              fontSize: '14px', 
              marginBottom: '8px' 
            }}>
              材料名称
            </label>
            <Input
              value={material.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              variant="outline"
              size="md"
              caeType="material"
              fluid={true}
            />
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              color: designTokens.colors.light.secondary, 
              fontSize: '14px', 
              marginBottom: '8px' 
            }}>
              材料类型
            </label>
            <select
              value={material.type}
              onChange={(e) => onUpdate({ type: e.target.value as MaterialType })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: `1px solid ${designTokens.colors.accent.glow}40`,
                borderRadius: '6px',
                backgroundColor: `${designTokens.colors.dark.surface}90`,
                color: designTokens.colors.light.primary,
                fontSize: '14px'
              }}
            >
              {MATERIAL_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </GlassmorphismCard>

      {/* 基础物理属性 */}
      <GlassmorphismCard title="基础物理属性" variant="pro">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', padding: '16px' }}>
          <div>
            <label style={{ 
              display: 'block', 
              color: designTokens.colors.light.secondary, 
              fontSize: '14px', 
              marginBottom: '8px' 
            }}>
              密度 (kg/m³)
              {validationResult?.propertyValidation.density && !validationResult.propertyValidation.density.isValid && (
                <span style={{ color: designTokens.colors.semantic.error, marginLeft: '8px' }}>❌</span>
              )}
            </label>
            <Input
              type="number"
              value={material.properties.density}
              onChange={(e) => onUpdateProperties({ density: parseFloat(e.target.value) || 0 })}
              variant="outline"
              size="md"
              caeType="material"
              fluid={true}
              glow={validationResult?.propertyValidation.density?.isValid}
            />
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              color: designTokens.colors.light.secondary, 
              fontSize: '14px', 
              marginBottom: '8px' 
            }}>
              弹性模量 (Pa)
              {validationResult?.propertyValidation.elasticModulus && !validationResult.propertyValidation.elasticModulus.isValid && (
                <span style={{ color: designTokens.colors.semantic.error, marginLeft: '8px' }}>❌</span>
              )}
            </label>
            <Input
              type="number"
              value={material.properties.elasticModulus}
              onChange={(e) => onUpdateProperties({ elasticModulus: parseFloat(e.target.value) || 0 })}
              variant="outline"
              size="md"
              caeType="material"
              fluid={true}
              glow={validationResult?.propertyValidation.elasticModulus?.isValid}
            />
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              color: designTokens.colors.light.secondary, 
              fontSize: '14px', 
              marginBottom: '8px' 
            }}>
              泊松比
              {validationResult?.propertyValidation.poissonRatio && !validationResult.propertyValidation.poissonRatio.isValid && (
                <span style={{ color: designTokens.colors.semantic.error, marginLeft: '8px' }}>❌</span>
              )}
            </label>
            <Input
              type="number"
              step={0.01}
              value={material.properties.poissonRatio}
              onChange={(e) => onUpdateProperties({ poissonRatio: parseFloat(e.target.value) || 0 })}
              variant="outline"
              size="md"
              caeType="material"
              fluid={true}
              glow={validationResult?.propertyValidation.poissonRatio?.isValid}
            />
          </div>
        </div>
      </GlassmorphismCard>

      {/* 本构模型 */}
      <GlassmorphismCard title="本构模型" variant="pro">
        <div style={{ padding: '16px' }}>
          <label style={{ 
            display: 'block', 
            color: designTokens.colors.light.secondary, 
            fontSize: '14px', 
            marginBottom: '8px' 
          }}>
            选择本构模型
          </label>
          <select
            value={material.constitutiveModel}
            onChange={(e) => onUpdate({ constitutiveModel: e.target.value as ConstitutiveModel })}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: `1px solid ${designTokens.colors.accent.glow}40`,
              borderRadius: '6px',
              backgroundColor: `${designTokens.colors.dark.surface}90`,
              color: designTokens.colors.light.primary,
              fontSize: '14px'
            }}
          >
            {CONSTITUTIVE_MODEL_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
        </div>
      </GlassmorphismCard>
    </div>
  );
};

// 高级属性标签页
const AdvancedPropertiesTab: React.FC<{
  material: MaterialDefinition;
  onUpdateProperties: (updates: Partial<any>) => void;
}> = ({ material, onUpdateProperties }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <GlassmorphismCard title="高级材料参数" variant="pro">
        <div style={{ padding: '16px' }}>
          <p style={{ 
            color: designTokens.colors.light.secondary, 
            fontSize: '14px',
            textAlign: 'center'
          }}>
            🚧 高级参数编辑界面开发中...
            <br />
            将支持热力学参数、动力学参数、非线性参数等
          </p>
        </div>
      </GlassmorphismCard>
    </div>
  );
};

// 试验数据标签页
const TestingDataTab: React.FC<{
  material: MaterialDefinition;
  onUpdate: (updates: Partial<MaterialDefinition>) => void;
}> = ({ material, onUpdate }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <GlassmorphismCard title="试验数据管理" variant="pro">
        <div style={{ padding: '16px' }}>
          <p style={{ 
            color: designTokens.colors.light.secondary, 
            fontSize: '14px',
            textAlign: 'center'
          }}>
            🧪 试验数据管理功能开发中...
            <br />
            将支持试验曲线导入、数据拟合、参数反演等
          </p>
        </div>
      </GlassmorphismCard>
    </div>
  );
};

// 元数据标签页
const MetadataTab: React.FC<{
  material: MaterialDefinition;
  onUpdate: (updates: Partial<MaterialDefinition>) => void;
}> = ({ material, onUpdate }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <GlassmorphismCard title="材料元数据" variant="pro">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px' }}>
          <div>
            <label style={{ 
              display: 'block', 
              color: designTokens.colors.light.secondary, 
              fontSize: '14px', 
              marginBottom: '8px' 
            }}>
              描述
            </label>
            <textarea
              value={material.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              style={{
                width: '100%',
                height: '80px',
                padding: '8px 12px',
                border: `1px solid ${designTokens.colors.accent.glow}40`,
                borderRadius: '6px',
                backgroundColor: `${designTokens.colors.dark.surface}90`,
                color: designTokens.colors.light.primary,
                fontSize: '14px',
                resize: 'none'
              }}
              placeholder="材料描述..."
            />
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              color: designTokens.colors.light.secondary, 
              fontSize: '14px', 
              marginBottom: '8px' 
            }}>
              来源/标准
            </label>
            <Input
              value={material.standard || ''}
              onChange={(e) => onUpdate({ standard: e.target.value })}
              variant="outline"
              size="md"
              caeType="material"
              fluid={true}
              placeholder="如：GB 50010-2010"
            />
          </div>
        </div>
      </GlassmorphismCard>
    </div>
  );
};

export default MaterialEditor;