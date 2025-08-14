/**
 * DeepCAD 材料库主界面
 * 2号几何专家 - 专业CAE材料库管理界面
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MaterialDefinition, 
  ConstitutiveModel,
  MaterialSearchCriteria,
  MaterialValidationResult
} from '../../interfaces/MaterialInterfaces';
import { materialDatabase } from '../../services/MaterialDatabase';
import { moduleHub } from '../../integration/ModuleIntegrationHub';
import { logger } from '../../utils/advancedLogger';
import { designTokens } from '../../design/tokens';
import MaterialEditor from './MaterialEditor';
import MaterialImportExport from './MaterialImportExport';
import MaterialImportPanel from './MaterialImportPanel';
import Button from '../ui/Button';
import Input from '../ui/Input';
import GlassmorphismCard from '../ui/GlassmorphismCard';

// 材料卡片组件
interface MaterialCardProps {
  material: MaterialDefinition;
  onEdit: (material: MaterialDefinition) => void;
  onDelete: (materialId: string) => void;
  onAssign: (material: MaterialDefinition) => void;
  isSelected?: boolean;
  onClick?: () => void;
}

const MaterialCard: React.FC<MaterialCardProps> = ({
  material,
  onEdit,
  onDelete,
  onAssign,
  isSelected,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // 统一使用通用材料图标和颜色
  const getMaterialInfo = () => {
    return { icon: '🧱', color: designTokens.colors.semantic.success };
  };

  const materialInfo = getMaterialInfo();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      style={{
        background: `linear-gradient(135deg, ${designTokens.colors.dark.surface}90, ${designTokens.colors.dark.card}90)`,
        backdropFilter: 'blur(20px)',
        borderRadius: '12px', // 1号架构师的优化：更扁平
        border: isSelected 
          ? `2px solid ${materialInfo.color}`
          : `1px solid ${designTokens.colors.accent.glow}40`, // 1号架构师的优化：更细腻
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered 
          ? `0 20px 40px ${materialInfo.color}20`
          : `0 8px 24px ${designTokens.colors.dark.deepSpace}40`
      }}
    >
      {/* 材料头部信息 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>{materialInfo.icon}</span>
          <div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              margin: 0,
              color: designTokens.colors.light.primary
            }}>
              {material.name}
            </h3>
          </div>
        </div>

        {/* 验证状态 */}
        {material.validated && (
          <span style={{
            fontSize: '12px',
            color: designTokens.colors.semantic.success,
            backgroundColor: `${designTokens.colors.semantic.success}20`,
            padding: '4px 8px',
            borderRadius: '4px',
            border: `1px solid ${designTokens.colors.semantic.success}40`
          }}>
            ✓ 已验证
          </span>
        )}
      </div>

      {/* 关键属性 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div>
          <p style={{
            fontSize: '11px',
            color: designTokens.colors.light.secondary,
            margin: '0 0 4px 0'
          }}>
            密度
          </p>
          <p style={{
            fontSize: '14px',
            color: designTokens.colors.light.primary,
            margin: 0,
            fontWeight: 500
          }}>
            {material.properties.density.toLocaleString()} kg/m³
          </p>
        </div>
        
        <div>
          <p style={{
            fontSize: '11px',
            color: designTokens.colors.light.secondary,
            margin: '0 0 4px 0'
          }}>
            弹性模量
          </p>
          <p style={{
            fontSize: '14px',
            color: designTokens.colors.light.primary,
            margin: 0,
            fontWeight: 500
          }}>
            {(material.properties.elasticModulus / 1e9).toFixed(1)} GPa
          </p>
        </div>
      </div>

      {/* 描述 */}
      {material.description && (
        <p style={{
          fontSize: '12px',
          color: designTokens.colors.light.secondary,
          margin: '0 0 16px 0',
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {material.description}
        </p>
      )}

      {/* 操作按钮 */}
      <div style={{
        display: 'flex',
        gap: '8px',
        opacity: isHovered ? 1 : 0.7,
        transition: 'opacity 0.3s ease'
      }}>
        <Button
          variant="outline"
          size="sm"
          caeType="material"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(material);
          }}
          style={{ flex: 1 }}
        >
          ✏️ 编辑
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          caeType="geometry"
          onClick={(e) => {
            e.stopPropagation();
            onAssign(material);
          }}
          style={{ flex: 1 }}
        >
          📎 分配
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          caeType="results"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`确定要删除材料 "${material.name}" 吗？`)) {
              onDelete(material.id);
            }
          }}
          style={{ minWidth: '40px' }}
        >
          🗑️
        </Button>
      </div>

      {/* 使用统计 */}
      {material.usageCount && material.usageCount > 0 && (
        <div style={{
          marginTop: '12px',
          padding: '8px',
          backgroundColor: `${typeInfo.color}10`,
          borderRadius: '6px',
          border: `1px solid ${typeInfo.color}20`
        }}>
          <p style={{
            fontSize: '11px',
            color: typeInfo.color,
            margin: 0,
            textAlign: 'center'
          }}>
            📊 已使用 {material.usageCount} 次
          </p>
        </div>
      )}
    </motion.div>
  );
};

// 材料库主界面组件
const MaterialLibraryView: React.FC = () => {
  // 状态管理
  const [materials, setMaterials] = useState<MaterialDefinition[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<MaterialDefinition[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialDefinition | null>(null);
  const [searchCriteria, setSearchCriteria] = useState<MaterialSearchCriteria>({});
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialDefinition | null>(null);
  const [isImportExportVisible, setIsImportExportVisible] = useState(false);
  const [isImportPanelVisible, setIsImportPanelVisible] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);

  // 搜索状态
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'modified' | 'usage'>('name');

  // 加载材料数据
  const loadMaterials = useCallback(() => {
    const allMaterials = materialDatabase.searchMaterials({});
    setMaterials(allMaterials);
    
    // 加载统计信息
    const stats = materialDatabase.getStatistics();
    setStatistics(stats);
    
    logger.info('材料库数据加载完成', { 
      materialCount: allMaterials.length,
      stats 
    });
  }, []);

  // 初始化
  useEffect(() => {
    loadMaterials();
    
    // 注册数据库事件监听
    const handleDatabaseEvent = (event: string, data: any) => {
      logger.info('材料数据库事件', { event, data });
      loadMaterials(); // 重新加载数据
    };

    materialDatabase.addEventListener('material_added', handleDatabaseEvent);
    materialDatabase.addEventListener('material_updated', handleDatabaseEvent);
    materialDatabase.addEventListener('material_deleted', handleDatabaseEvent);

    return () => {
      materialDatabase.removeEventListener('material_added', handleDatabaseEvent);
      materialDatabase.removeEventListener('material_updated', handleDatabaseEvent);
      materialDatabase.removeEventListener('material_deleted', handleDatabaseEvent);
    };
  }, [loadMaterials]);

  // 搜索和筛选
  useEffect(() => {
    const criteria: MaterialSearchCriteria = {
      name: searchText || undefined,
      sortBy,
      sortOrder: 'asc'
    };

    const results = materialDatabase.searchMaterials(criteria);
    setFilteredMaterials(results);
    setSearchCriteria(criteria);
  }, [searchText, sortBy, materials]);

  // 处理材料编辑
  const handleEditMaterial = useCallback((material?: MaterialDefinition) => {
    setEditingMaterial(material || null);
    setIsEditorVisible(true);
  }, []);

  // 处理材料保存
  const handleSaveMaterial = useCallback((material: MaterialDefinition) => {
    if (editingMaterial) {
      // 更新现有材料
      materialDatabase.updateMaterial(material.id, material);
    } else {
      // 添加新材料
      materialDatabase.addMaterial(material);
    }
    
    setIsEditorVisible(false);
    setEditingMaterial(null);
    loadMaterials();
  }, [editingMaterial, loadMaterials]);

  // 处理材料删除
  const handleDeleteMaterial = useCallback((materialId: string) => {
    materialDatabase.deleteMaterial(materialId);
    if (selectedMaterial?.id === materialId) {
      setSelectedMaterial(null);
    }
    loadMaterials();
  }, [selectedMaterial, loadMaterials]);

  // 处理材料分配
  const handleAssignMaterial = useCallback((material: MaterialDefinition) => {
    logger.info('材料分配请求', { materialId: material.id, materialName: material.name });
    
    // 发布材料分配事件到moduleHub
    moduleHub.emit('material:assign_requested', {
      id: material.id,
      action: 'material_assign_requested',
      materialData: material,
      timestamp: Date.now()
    });

    // 这里可以打开材料分配对话框或界面
    alert(`材料分配功能开发中...\n材料: ${material.name}\n将与几何建模工作流集成`);
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: `linear-gradient(135deg, ${designTokens.colors.dark.deepSpace} 0%, ${designTokens.colors.dark.quantum} 100%)`,
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* 头部 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            margin: 0,
            background: `linear-gradient(45deg, ${designTokens.colors.accent.glow}, ${designTokens.colors.accent.quantum})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            🏗️ 材料库管理
          </h1>
          <p style={{
            color: designTokens.colors.light.secondary,
            margin: '4px 0 0 0',
            fontSize: '16px'
          }}>
            2号几何专家 • 专业CAE材料属性管理
            {statistics && ` • ${statistics.totalMaterials}个材料 • ${statistics.validatedMaterials}个已验证`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="outline"
            size="md"
            caeType="material"
            onClick={() => setIsImportPanelVisible(true)}
          >
            📊 Excel导入
          </Button>
          
          <Button
            variant="outline"
            size="md"
            caeType="material"
            onClick={() => setIsImportExportVisible(true)}
          >
            📁 导入导出
          </Button>
          
          <Button
            variant="primary"
            size="md"
            caeType="material"
            glow={true}
            onClick={() => handleEditMaterial()}
          >
            ➕ 新建材料
          </Button>
        </div>
      </div>

      {/* 搜索和筛选栏 */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        alignItems: 'center'
      }}>
        {/* 搜索框 */}
        <div style={{ flex: 1 }}>
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索材料名称或描述..."
            variant="outline"
            size="md"
            caeType="material"
            fluid={true}
          />
        </div>


        {/* 排序 */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          style={{
            padding: '8px 12px',
            border: `1px solid ${designTokens.colors.accent.glow}40`,
            borderRadius: '6px',
            backgroundColor: `${designTokens.colors.dark.surface}90`,
            color: designTokens.colors.light.primary,
            fontSize: '14px',
            minWidth: '120px'
          }}
        >
          <option value="name">按名称</option>
          <option value="modified">按修改时间</option>
          <option value="usage">按使用次数</option>
        </select>
      </div>

      {/* 统计信息卡片 */}
      {statistics && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <GlassmorphismCard variant="pro" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: designTokens.colors.accent.glow }}>
              {statistics.totalMaterials}
            </div>
            <div style={{ fontSize: '12px', color: designTokens.colors.light.secondary }}>
              总材料数
            </div>
          </GlassmorphismCard>

          <GlassmorphismCard variant="pro" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: designTokens.colors.semantic.success }}>
              {statistics.validatedMaterials}
            </div>
            <div style={{ fontSize: '12px', color: designTokens.colors.light.secondary }}>
              已验证材料
            </div>
          </GlassmorphismCard>

          <GlassmorphismCard variant="pro" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: designTokens.colors.accent.quantum }}>
              {statistics.totalUsage}
            </div>
            <div style={{ fontSize: '12px', color: designTokens.colors.light.secondary }}>
              总使用次数
            </div>
          </GlassmorphismCard>

          <GlassmorphismCard variant="pro" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: designTokens.colors.accent.visualization }}>
              {statistics.totalLibraries}
            </div>
            <div style={{ fontSize: '12px', color: designTokens.colors.light.secondary }}>
              材料库数量
            </div>
          </GlassmorphismCard>
        </div>
      )}

      {/* 材料卡片网格 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px',
        padding: '0 4px'
      }}>
        <AnimatePresence>
          {filteredMaterials.map(material => (
            <MaterialCard
              key={material.id}
              material={material}
              onEdit={handleEditMaterial}
              onDelete={handleDeleteMaterial}
              onAssign={handleAssignMaterial}
              isSelected={selectedMaterial?.id === material.id}
              onClick={() => setSelectedMaterial(material)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* 空状态 */}
      {filteredMaterials.length === 0 && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: designTokens.colors.light.secondary
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <h3 style={{ fontSize: '18px', margin: '0 0 8px 0' }}>未找到材料</h3>
          <p style={{ fontSize: '14px', margin: 0 }}>
            {searchText 
              ? '尝试调整搜索条件'
              : '点击"新建材料"创建第一个材料'
            }
          </p>
        </div>
      )}

      {/* 材料编辑器 */}
      <MaterialEditor
        material={editingMaterial}
        isVisible={isEditorVisible}
        onClose={() => {
          setIsEditorVisible(false);
          setEditingMaterial(null);
        }}
        onSave={handleSaveMaterial}
        onValidation={(result: MaterialValidationResult) => {
          logger.info('材料验证结果', result);
        }}
      />

      {/* 材料导入导出 */}
      <MaterialImportExport
        isVisible={isImportExportVisible}
        onClose={() => setIsImportExportVisible(false)}
        onImportComplete={(materials) => {
          logger.info('材料批量导入完成', { count: materials.length });
          loadMaterials(); // 重新加载材料列表
        }}
        onExportComplete={(data) => {
          logger.info('材料导出完成', { dataLength: data.length });
        }}
      />

      {/* Excel材料导入面板 */}
      <MaterialImportPanel
        visible={isImportPanelVisible}
        onCancel={() => setIsImportPanelVisible(false)}
        onImportComplete={(materials) => {
          logger.info('Excel材料导入完成', { count: materials.length });
          loadMaterials(); // 重新加载材料列表
        }}
      />
    </div>
  );
};

export default MaterialLibraryView;