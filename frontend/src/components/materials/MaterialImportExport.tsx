/**
 * DeepCAD 材料导入导出组件
 * 2号几何专家 - 专业CAE材料数据导入导出功能
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MaterialDefinition, 
  MaterialImportExportOptions,
  MaterialType,
  ConstitutiveModel
} from '../../interfaces/MaterialInterfaces';
import { materialDatabase } from '../../services/MaterialDatabase';
import { moduleHub } from '../../integration/ModuleIntegrationHub';
import { logger } from '../../utils/advancedLogger';
import { designTokens } from '../../design/tokens';
import Button from '../ui/Button';
import GlassmorphismCard from '../ui/GlassmorphismCard';

// 导入导出组件属性
interface MaterialImportExportProps {
  isVisible: boolean;
  onClose: () => void;
  onImportComplete?: (materials: MaterialDefinition[]) => void;
  onExportComplete?: (data: string) => void;
}

// 导入结果接口
interface ImportResult {
  success: boolean;
  materials: MaterialDefinition[];
  errors: string[];
  warnings: string[];
  statistics: {
    total: number;
    imported: number;
    skipped: number;
    failed: number;
  };
}

const MaterialImportExport: React.FC<MaterialImportExportProps> = ({
  isVisible,
  onClose,
  onImportComplete,
  onExportComplete
}) => {
  // 状态管理
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [exportData, setExportData] = useState<string>('');

  // 导入配置
  const [importConfig, setImportConfig] = useState({
    format: 'json' as 'json' | 'csv' | 'excel',
    mergeStrategy: 'replace' as 'replace' | 'merge' | 'skip',
    validateOnImport: true,
    includeMetadata: true
  });

  // 导出配置
  const [exportConfig, setExportConfig] = useState({
    format: 'json' as 'json' | 'csv' | 'excel',
    includeMetadata: true,
    includeTesting: false,
    compression: false,
    filterType: 'all' as MaterialType | 'all',
    filterValidated: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件导入
  const handleFileImport = useCallback(async (file: File) => {
    setIsProcessing(true);
    setProcessingProgress(10);
    setProcessingMessage('正在读取文件...');
    setImportResult(null);

    try {
      // 读取文件内容
      const content = await readFileContent(file);
      setProcessingProgress(30);
      setProcessingMessage('正在解析数据...');

      // 解析材料数据
      let materials: MaterialDefinition[] = [];
      
      if (importConfig.format === 'json') {
        materials = parseJSONMaterials(content);
      } else if (importConfig.format === 'csv') {
        materials = parseCSVMaterials(content);
      } else if (importConfig.format === 'excel') {
        // Excel解析需要额外的库支持
        throw new Error('Excel导入功能开发中，请使用JSON或CSV格式');
      }

      setProcessingProgress(60);
      setProcessingMessage('正在验证材料数据...');

      // 验证和处理材料
      const result = await processMaterialImport(materials);
      
      setProcessingProgress(90);
      setProcessingMessage('正在保存到数据库...');

      // 保存到数据库
      let importCount = 0;
      for (const material of result.materials) {
        const success = materialDatabase.addMaterial(material);
        if (success) {
          importCount++;
        }
      }

      result.statistics.imported = importCount;
      
      setProcessingProgress(100);
      setProcessingMessage('导入完成');
      setImportResult(result);

      // 发布到moduleHub
      moduleHub.emit('material:batch_imported', {
        id: `import_batch_${Date.now()}`,
        action: 'material_batch_imported',
        materials: result.materials,
        statistics: result.statistics,
        timestamp: Date.now()
      });

      if (onImportComplete) {
        onImportComplete(result.materials);
      }

      logger.info('材料批量导入完成', {
        totalMaterials: result.statistics.total,
        importedMaterials: result.statistics.imported,
        errors: result.errors.length
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setImportResult({
        success: false,
        materials: [],
        errors: [errorMessage],
        warnings: [],
        statistics: { total: 0, imported: 0, skipped: 0, failed: 1 }
      });

      logger.error('材料导入失败', { error: errorMessage });
    } finally {
      setIsProcessing(false);
    }
  }, [importConfig, onImportComplete]);

  // 读取文件内容
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  };

  // 解析JSON材料
  const parseJSONMaterials = (content: string): MaterialDefinition[] => {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      } else if (parsed.materials && Array.isArray(parsed.materials)) {
        return parsed.materials;
      } else {
        throw new Error('JSON格式不正确，应该是材料数组或包含materials字段的对象');
      }
    } catch (error) {
      throw new Error(`JSON解析失败: ${error}`);
    }
  };

  // 解析CSV材料
  const parseCSVMaterials = (content: string): MaterialDefinition[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV文件格式不正确，至少需要标题行和一行数据');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const materials: MaterialDefinition[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) {
        continue; // 跳过格式不正确的行
      }

      try {
        const material: MaterialDefinition = {
          id: values[headers.indexOf('ID')] || `imported_${Date.now()}_${i}`,
          name: values[headers.indexOf('名称')] || values[headers.indexOf('Name')] || `导入材料${i}`,
          type: parseCSVMaterialType(values[headers.indexOf('类型')] || values[headers.indexOf('Type')]),
          constitutiveModel: parseCSVConstitutiveModel(values[headers.indexOf('本构模型')] || values[headers.indexOf('Model')]),
          properties: {
            density: parseFloat(values[headers.indexOf('密度')] || values[headers.indexOf('Density')]) || 2400,
            elasticModulus: parseFloat(values[headers.indexOf('弹性模量')] || values[headers.indexOf('ElasticModulus')]) || 30e9,
            poissonRatio: parseFloat(values[headers.indexOf('泊松比')] || values[headers.indexOf('PoissonRatio')]) || 0.2
          },
          description: values[headers.indexOf('描述')] || values[headers.indexOf('Description')] || '',
          created: new Date(),
          modified: new Date(),
          version: '1.0.0',
          validated: false
        };

        materials.push(material);
      } catch (error) {
        logger.warn(`CSV第${i+1}行解析失败`, { error, line: lines[i] });
      }
    }

    return materials;
  };

  // 解析CSV材料类型
  const parseCSVMaterialType = (typeStr: string): MaterialType => {
    const typeMap: Record<string, MaterialType> = {
      '混凝土': MaterialType.CONCRETE,
      'concrete': MaterialType.CONCRETE,
      '钢材': MaterialType.STEEL,
      'steel': MaterialType.STEEL,
      '土体': MaterialType.SOIL,
      'soil': MaterialType.SOIL,
      '岩石': MaterialType.ROCK,
      'rock': MaterialType.ROCK,
      '挤密土体': MaterialType.COMPACTED_SOIL,
      'compacted_soil': MaterialType.COMPACTED_SOIL
    };

    return typeMap[typeStr.toLowerCase()] || MaterialType.CONCRETE;
  };

  // 解析CSV本构模型
  const parseCSVConstitutiveModel = (modelStr: string): ConstitutiveModel => {
    const modelMap: Record<string, ConstitutiveModel> = {
      '线弹性': ConstitutiveModel.LINEAR_ELASTIC,
      'linear_elastic': ConstitutiveModel.LINEAR_ELASTIC,
      '弹塑性': ConstitutiveModel.ELASTOPLASTIC,
      'elastoplastic': ConstitutiveModel.ELASTOPLASTIC,
      '摩尔库伦': ConstitutiveModel.MOHR_COULOMB,
      'mohr_coulomb': ConstitutiveModel.MOHR_COULOMB
    };

    return modelMap[modelStr.toLowerCase()] || ConstitutiveModel.LINEAR_ELASTIC;
  };

  // 处理材料导入
  const processMaterialImport = async (materials: MaterialDefinition[]): Promise<ImportResult> => {
    const result: ImportResult = {
      success: true,
      materials: [],
      errors: [],
      warnings: [],
      statistics: {
        total: materials.length,
        imported: 0,
        skipped: 0,
        failed: 0
      }
    };

    for (const material of materials) {
      try {
        // 验证材料数据
        if (!material.id || !material.name) {
          result.errors.push(`材料缺少必要字段: ${material.name || 'unknown'}`);
          result.statistics.failed++;
          continue;
        }

        // 检查重复
        const existing = materialDatabase.getMaterial(material.id);
        if (existing) {
          if (importConfig.mergeStrategy === 'skip') {
            result.warnings.push(`跳过重复材料: ${material.name}`);
            result.statistics.skipped++;
            continue;
          } else if (importConfig.mergeStrategy === 'replace') {
            result.warnings.push(`替换现有材料: ${material.name}`);
          }
        }

        // 验证属性
        if (importConfig.validateOnImport) {
          const props = material.properties;
          if (props.density <= 0 || props.elasticModulus <= 0 || 
              props.poissonRatio < 0 || props.poissonRatio >= 0.5) {
            result.errors.push(`材料属性无效: ${material.name}`);
            result.statistics.failed++;
            continue;
          }
        }

        // 设置导入标记
        material.description = (material.description || '') + ' [导入]';
        material.modified = new Date();

        result.materials.push(material);

      } catch (error) {
        result.errors.push(`处理材料失败 ${material.name}: ${error}`);
        result.statistics.failed++;
      }
    }

    result.success = result.errors.length === 0;
    return result;
  };

  // 处理材料导出
  const handleMaterialExport = useCallback(async () => {
    setIsProcessing(true);
    setProcessingProgress(20);
    setProcessingMessage('正在查询材料数据...');

    try {
      // 构建筛选条件
      const filterCriteria = {
        type: exportConfig.filterType === 'all' ? undefined : [exportConfig.filterType as MaterialType],
        validated: exportConfig.filterValidated ? true : undefined
      };

      // 获取材料数据
      const materials = materialDatabase.searchMaterials(filterCriteria);
      
      setProcessingProgress(60);
      setProcessingMessage('正在格式化数据...');

      // 导出选项
      const exportOptions: MaterialImportExportOptions = {
        format: exportConfig.format,
        includeMetadata: exportConfig.includeMetadata,
        includeTesting: exportConfig.includeTesting,
        compression: exportConfig.compression,
        filterCriteria
      };

      // 生成导出数据
      const exportedData = materialDatabase.exportMaterials(exportOptions);
      
      setProcessingProgress(100);
      setProcessingMessage('导出完成');
      setExportData(exportedData);

      // 触发下载
      downloadFile(exportedData, `materials_export_${Date.now()}.${exportConfig.format}`, exportConfig.format);

      if (onExportComplete) {
        onExportComplete(exportedData);
      }

      logger.info('材料导出完成', {
        materialCount: materials.length,
        format: exportConfig.format
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导出失败';
      logger.error('材料导出失败', { error: errorMessage });
      alert(`导出失败: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  }, [exportConfig, onExportComplete]);

  // 下载文件
  const downloadFile = (content: string, filename: string, format: string) => {
    const mimeTypes = {
      json: 'application/json',
      csv: 'text/csv',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    const blob = new Blob([content], { type: mimeTypes[format as keyof typeof mimeTypes] });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isVisible) return null;

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
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          style={{
            width: '90%',
            maxWidth: '800px',
            height: '80%',
            maxHeight: '600px',
            background: `linear-gradient(135deg, ${designTokens.colors.dark.surface}95, ${designTokens.colors.dark.card}95)`,
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            border: `1px solid ${designTokens.colors.accent.glow}40`,
            padding: '24px',
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
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 700,
              margin: 0,
              background: `linear-gradient(45deg, ${designTokens.colors.accent.glow}, ${designTokens.colors.accent.quantum})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              📁 材料导入导出
            </h2>
            
            <Button
              variant="outline"
              size="sm"
              caeType="material"
              onClick={onClose}
            >
              ✕ 关闭
            </Button>
          </div>

          {/* 标签页 */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px'
          }}>
            {[
              { id: 'import', label: '📥 导入材料', icon: '📥' },
              { id: 'export', label: '📤 导出材料', icon: '📤' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '10px 16px',
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
                {tab.label}
              </button>
            ))}
          </div>

          {/* 内容区域 */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeTab === 'import' && (
              <ImportTab
                config={importConfig}
                onConfigChange={setImportConfig}
                onFileImport={handleFileImport}
                fileInputRef={fileInputRef}
                isProcessing={isProcessing}
                processingProgress={processingProgress}
                processingMessage={processingMessage}
                importResult={importResult}
              />
            )}

            {activeTab === 'export' && (
              <ExportTab
                config={exportConfig}
                onConfigChange={setExportConfig}
                onExport={handleMaterialExport}
                isProcessing={isProcessing}
                processingProgress={processingProgress}
                processingMessage={processingMessage}
                exportData={exportData}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// 导入标签页
const ImportTab: React.FC<{
  config: any;
  onConfigChange: (config: any) => void;
  onFileImport: (file: File) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  isProcessing: boolean;
  processingProgress: number;
  processingMessage: string;
  importResult: ImportResult | null;
}> = ({ config, onConfigChange, onFileImport, fileInputRef, isProcessing, processingProgress, processingMessage, importResult }) => {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 配置选项 */}
      <GlassmorphismCard title="导入配置" variant="pro">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px' }}>
          <div>
            <label style={{ 
              display: 'block', 
              color: designTokens.colors.light.secondary, 
              fontSize: '14px', 
              marginBottom: '8px' 
            }}>
              文件格式
            </label>
            <select
              value={config.format}
              onChange={(e) => onConfigChange({ ...config, format: e.target.value })}
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
              <option value="json">JSON格式</option>
              <option value="csv">CSV格式</option>
              <option value="excel">Excel格式 (开发中)</option>
            </select>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              color: designTokens.colors.light.secondary, 
              fontSize: '14px', 
              marginBottom: '8px' 
            }}>
              冲突处理
            </label>
            <select
              value={config.mergeStrategy}
              onChange={(e) => onConfigChange({ ...config, mergeStrategy: e.target.value })}
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
              <option value="replace">替换现有</option>
              <option value="merge">合并数据</option>
              <option value="skip">跳过重复</option>
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={config.validateOnImport}
                onChange={(e) => onConfigChange({ ...config, validateOnImport: e.target.checked })}
              />
              <span style={{ color: designTokens.colors.light.secondary, fontSize: '14px' }}>
                导入时验证材料属性
              </span>
            </label>
          </div>
        </div>
      </GlassmorphismCard>

      {/* 文件选择区域 */}
      <GlassmorphismCard title="选择文件" variant="pro">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,.xlsx"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onFileImport(file);
              }
            }}
          />
          
          <Button
            variant="primary"
            size="lg"
            caeType="material"
            glow={true}
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
          >
            📁 选择材料文件
          </Button>
          
          <p style={{
            color: designTokens.colors.light.secondary,
            fontSize: '14px',
            marginTop: '12px'
          }}>
            支持 JSON、CSV 格式文件
          </p>
        </div>
      </GlassmorphismCard>

      {/* 处理进度 */}
      {isProcessing && (
        <GlassmorphismCard title="导入进度" variant="pro">
          <div style={{ padding: '16px' }}>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: `${designTokens.colors.dark.surface}80`,
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '12px'
            }}>
              <div
                style={{
                  width: `${processingProgress}%`,
                  height: '100%',
                  backgroundColor: designTokens.colors.accent.glow,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <p style={{
              color: designTokens.colors.light.primary,
              fontSize: '14px',
              margin: 0
            }}>
              {processingMessage} ({processingProgress}%)
            </p>
          </div>
        </GlassmorphismCard>
      )}

      {/* 导入结果 */}
      {importResult && (
        <GlassmorphismCard 
          title={importResult.success ? "✅ 导入成功" : "❌ 导入失败"} 
          variant="pro"
        >
          <div style={{ padding: '16px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 600, color: designTokens.colors.light.primary }}>
                  {importResult.statistics.total}
                </div>
                <div style={{ fontSize: '12px', color: designTokens.colors.light.secondary }}>
                  总数量
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 600, color: designTokens.colors.semantic.success }}>
                  {importResult.statistics.imported}
                </div>
                <div style={{ fontSize: '12px', color: designTokens.colors.light.secondary }}>
                  已导入
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 600, color: designTokens.colors.accent.glow }}>
                  {importResult.statistics.skipped}
                </div>
                <div style={{ fontSize: '12px', color: designTokens.colors.light.secondary }}>
                  已跳过
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 600, color: designTokens.colors.semantic.error }}>
                  {importResult.statistics.failed}
                </div>
                <div style={{ fontSize: '12px', color: designTokens.colors.light.secondary }}>
                  失败
                </div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div style={{
                backgroundColor: `${designTokens.colors.semantic.error}20`,
                border: `1px solid ${designTokens.colors.semantic.error}40`,
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '12px'
              }}>
                <h4 style={{ margin: '0 0 8px 0', color: designTokens.colors.semantic.error }}>
                  错误信息:
                </h4>
                {importResult.errors.map((error, index) => (
                  <p key={index} style={{ margin: '4px 0', fontSize: '13px', color: designTokens.colors.light.primary }}>
                    • {error}
                  </p>
                ))}
              </div>
            )}

            {importResult.warnings.length > 0 && (
              <div style={{
                backgroundColor: `${designTokens.colors.accent.glow}20`,
                border: `1px solid ${designTokens.colors.accent.glow}40`,
                borderRadius: '6px',
                padding: '12px'
              }}>
                <h4 style={{ margin: '0 0 8px 0', color: designTokens.colors.accent.glow }}>
                  警告信息:
                </h4>
                {importResult.warnings.map((warning, index) => (
                  <p key={index} style={{ margin: '4px 0', fontSize: '13px', color: designTokens.colors.light.primary }}>
                    • {warning}
                  </p>
                ))}
              </div>
            )}
          </div>
        </GlassmorphismCard>
      )}
    </div>
  );
};

// 导出标签页
const ExportTab: React.FC<{
  config: any;
  onConfigChange: (config: any) => void;
  onExport: () => void;
  isProcessing: boolean;
  processingProgress: number;
  processingMessage: string;
  exportData: string;
}> = ({ config, onConfigChange, onExport, isProcessing, processingProgress, processingMessage, exportData }) => {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 导出配置 */}
      <GlassmorphismCard title="导出配置" variant="pro">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px' }}>
          <div>
            <label style={{ 
              display: 'block', 
              color: designTokens.colors.light.secondary, 
              fontSize: '14px', 
              marginBottom: '8px' 
            }}>
              导出格式
            </label>
            <select
              value={config.format}
              onChange={(e) => onConfigChange({ ...config, format: e.target.value })}
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
              <option value="json">JSON格式</option>
              <option value="csv">CSV格式</option>
              <option value="excel">Excel格式 (开发中)</option>
            </select>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              color: designTokens.colors.light.secondary, 
              fontSize: '14px', 
              marginBottom: '8px' 
            }}>
              材料类型筛选
            </label>
            <select
              value={config.filterType}
              onChange={(e) => onConfigChange({ ...config, filterType: e.target.value })}
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
              <option value="all">所有材料</option>
              <option value={MaterialType.CONCRETE}>混凝土</option>
              <option value={MaterialType.STEEL}>钢材</option>
              <option value={MaterialType.SOIL}>土体</option>
              <option value={MaterialType.COMPACTED_SOIL}>挤密土体</option>
            </select>
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={config.includeMetadata}
                onChange={(e) => onConfigChange({ ...config, includeMetadata: e.target.checked })}
              />
              <span style={{ color: designTokens.colors.light.secondary, fontSize: '14px' }}>
                包含元数据信息
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={config.filterValidated}
                onChange={(e) => onConfigChange({ ...config, filterValidated: e.target.checked })}
              />
              <span style={{ color: designTokens.colors.light.secondary, fontSize: '14px' }}>
                仅导出已验证材料
              </span>
            </label>
          </div>
        </div>
      </GlassmorphismCard>

      {/* 导出按钮 */}
      <div style={{ textAlign: 'center' }}>
        <Button
          variant="primary"
          size="lg"
          caeType="material"
          glow={true}
          disabled={isProcessing}
          onClick={onExport}
        >
          📤 开始导出
        </Button>
      </div>

      {/* 处理进度 */}
      {isProcessing && (
        <GlassmorphismCard title="导出进度" variant="pro">
          <div style={{ padding: '16px' }}>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: `${designTokens.colors.dark.surface}80`,
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '12px'
            }}>
              <div
                style={{
                  width: `${processingProgress}%`,
                  height: '100%',
                  backgroundColor: designTokens.colors.accent.glow,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <p style={{
              color: designTokens.colors.light.primary,
              fontSize: '14px',
              margin: 0
            }}>
              {processingMessage} ({processingProgress}%)
            </p>
          </div>
        </GlassmorphismCard>
      )}

      {/* 导出预览 */}
      {exportData && !isProcessing && (
        <GlassmorphismCard title="导出预览" variant="pro">
          <div style={{ padding: '16px' }}>
            <textarea
              value={exportData.substring(0, 500) + (exportData.length > 500 ? '...' : '')}
              readOnly
              style={{
                width: '100%',
                height: '150px',
                padding: '8px',
                border: `1px solid ${designTokens.colors.accent.glow}40`,
                borderRadius: '6px',
                backgroundColor: `${designTokens.colors.dark.surface}90`,
                color: designTokens.colors.light.primary,
                fontSize: '12px',
                fontFamily: 'monospace',
                resize: 'none'
              }}
            />
            <p style={{
              color: designTokens.colors.light.secondary,
              fontSize: '12px',
              marginTop: '8px'
            }}>
              文件已自动下载，以上为前500字符预览
            </p>
          </div>
        </GlassmorphismCard>
      )}
    </div>
  );
};

export default MaterialImportExport;