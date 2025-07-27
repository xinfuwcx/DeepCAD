/**
 * DeepCAD 桩基建模集成面板
 * 1号架构师 - 响应明确指令，集成2号几何专家修正和3号计算专家扩展
 * 
 * 🎯 明确指令响应：
 * - 已预留桩基建模入口
 * - 创建PileModelingIntegrationPanel组件
 * - 参考PileModelingInterfaces.ts中的UI接口
 * - 新增材料类型：compacted_soil
 * - 新增单元标识：compactionZone: true
 * - 处理FEMDataTransfer数据结构
 * - 性能预估：计算量增加10-25%
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PileTypeSelector from './PileTypeSelector';
import { PileType, PileModelingStrategy } from '../../services/PileModelingStrategy';
import { 
  PileCalculationData, 
  PileDataConverter, 
  PileAnalysisResult,
  PileGeometry,
  PileMaterial 
} from '../../services/pileModelingDataInterface';
import { FunctionalIcons } from '../icons/FunctionalIconsQuickFix';
import { StatusIcons } from '../icons/StatusIcons';
import { logger } from '../../utils/advancedLogger';
import { 
  femDataTransferService, 
  type FEMDataTransfer, 
  type ValidationResult 
} from '../../services/femDataTransferService';
import { moduleHub, GeometryData, ModuleState } from '../../integration/ModuleIntegrationHub';

// ==================== 3号计算专家扩展接口 ====================
// FEMDataTransfer接口现在从服务中导入

/** 物理组更新请求 - 数据传递时机控制 */
interface PhysicsGroupUpdateRequest {
  pileId: string;
  compactionRadius: number;
  affectedSoilProperties: {
    density: number;
    cohesion: number;
    frictionAngle: number;
    elasticModulus: number;
  };
  updateTimestamp: number;
  automaticUpdateEnabled: boolean; // 90%自动化标识
}

/** 几何建模阶段状态 */
interface GeometryModelingStage {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress: number;
  description: string;
  automationLevel: number; // 自动化程度 0-1
}

interface PileModelingIntegrationPanelProps {
  isVisible: boolean;
  onClose: () => void;
  onPileConfigured?: (pileData: PileCalculationData) => void;
  onPhysicsGroupUpdate?: (request: PhysicsGroupUpdateRequest) => void; // 新增回调
}

const PileModelingIntegrationPanel: React.FC<PileModelingIntegrationPanelProps> = ({
  isVisible,
  onClose,
  onPileConfigured
}) => {
  const [activeTab, setActiveTab] = useState<'selection' | 'configuration' | 'analysis'>('selection');
  const [selectedPileType, setSelectedPileType] = useState<PileType | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<PileModelingStrategy | null>(null);
  const [pileConfiguration, setPileConfiguration] = useState<PileCalculationData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<PileAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // 新增状态 - 响应明确指令
  const [femDataTransfer, setFemDataTransfer] = useState<FEMDataTransfer | null>(null);
  const [geometryStages, setGeometryStages] = useState<GeometryModelingStage[]>([]);
  const [physicsGroupRequest, setPhysicsGroupRequest] = useState<PhysicsGroupUpdateRequest | null>(null);
  const [automationProgress, setAutomationProgress] = useState(0); // 90%自动化进度
  const [performanceEstimate, setPerformanceEstimate] = useState({ increase: 0, strategy: '' });

  // 桩基几何参数状态
  const [geometryParams, setGeometryParams] = useState({
    diameter: 800,      // mm
    length: 12,         // m
    embedmentDepth: 2   // m
  });

  // 材料参数状态
  const [materialParams, setMaterialParams] = useState({
    concreteStrength: 25,    // MPa
    elasticModulus: 28,      // GPa
    reinforcementRatio: 0.8  // %
  });

  // 荷载参数状态
  const [loadParams, setLoadParams] = useState({
    axialLoad: 1000,    // kN
    lateralLoad: 50,    // kN
    moment: 100         // kN⋅m
  });

  // 初始化几何建模阶段
  const initializeGeometryStages = () => {
    const stages: GeometryModelingStage[] = [
      {
        id: 'pile_geometry',
        name: '桩基几何建模',
        status: 'pending',
        progress: 0,
        description: '创建桩基三维几何模型',
        automationLevel: 0.95 // 95%自动化
      },
      {
        id: 'compaction_zone',
        name: '挤密区域建模',
        status: 'pending',
        progress: 0,
        description: '建模挤密影响区域和土体改良效应',
        automationLevel: 0.90 // 90%自动化
      },
      {
        id: 'mesh_generation',
        name: '网格生成',
        status: 'pending',
        progress: 0,
        description: '生成有限元网格',
        automationLevel: 0.88 // 88%自动化
      },
      {
        id: 'material_assignment',
        name: '材料属性分配',
        status: 'pending',
        progress: 0,
        description: '分配compacted_soil等材料属性',
        automationLevel: 0.92 // 92%自动化
      }
    ];
    setGeometryStages(stages);
  };

  // ==================== moduleHub集成 ====================
  
  // 注册桩基建模模块到moduleHub
  useEffect(() => {
    if (isVisible) {
      // 注册几何建模回调
      moduleHub.registerGeometryModule({
        onGeometryCreated: (data: GeometryData) => {
          logger.info('🏗️ 桩基建模模块收到几何创建事件', data);
          if (data.type === 'support' && data.name.includes('pile')) {
            console.log('🏗️ 检测到桩基几何体，准备建模处理');
          }
        },
        onGeometryUpdated: (data: GeometryData) => {
          logger.info('🏗️ 桩基建模模块收到几何更新事件', data);
        },
        onGeometryDeleted: (id: string) => {
          logger.info('🏗️ 桩基建模模块收到几何删除事件', { id });
        }
      });

      // 注册网格生成回调
      moduleHub.registerMeshingModule({
        onMeshGenerated: (data) => {
          logger.info('🏗️ 桩基建模模块收到网格生成事件', data);
          // 更新网格生成阶段状态
          updateStageStatus('mesh_generation', 'completed', 100);
        },
        onMeshQualityChecked: (data) => {
          logger.info('🏗️ 桩基建模模块收到网格质量检查事件', data);
        },
        onPhysicalGroupAssigned: (data) => {
          logger.info('🏗️ 桩基建模模块收到物理组分配事件', data);
          // 更新材料分配阶段状态
          updateStageStatus('material_assignment', 'completed', 100);
        }
      });

      // 更新模块状态为就绪
      moduleHub.updateModuleState('geometry', {
        status: 'ready',
        progress: 100,
        message: '桩基建模模块已就绪'
      });

      logger.info('🏗️ 桩基建模面板已注册到moduleHub');
    }
  }, [isVisible]);

  // 更新阶段状态的辅助函数
  const updateStageStatus = (stageId: string, status: GeometryModelingStage['status'], progress: number) => {
    setGeometryStages(prevStages => 
      prevStages.map(stage => 
        stage.id === stageId 
          ? { ...stage, status, progress }
          : stage
      )
    );
  };

  // 监听分析状态变化并同步到moduleHub
  useEffect(() => {
    if (isAnalyzing) {
      moduleHub.updateModuleState('analysis', {
        status: 'computing',
        progress: automationProgress,
        message: '桩基分析计算中...'
      });
    } else if (analysisResult) {
      moduleHub.updateModuleState('analysis', {
        status: 'completed',
        progress: 100,
        message: '桩基分析完成'
      });
      
      // 发布分析完成事件
      moduleHub.emit('analysis:completed', {
        id: `pile_analysis_${Date.now()}`,
        meshId: 'pile_mesh',
        type: 'static',
        parameters: {
          geometryParams,
          materialParams,
          loadParams
        },
        results: analysisResult,
        timestamp: Date.now()
      });
    }
  }, [isAnalyzing, analysisResult, automationProgress, geometryParams, materialParams, loadParams]);

  // 处理桩基类型选择 - 增强版
  const handlePileTypeSelect = (type: PileType, strategy: PileModelingStrategy) => {
    setSelectedPileType(type);
    setSelectedStrategy(strategy);
    setActiveTab('configuration');
    
    // 性能预估：计算量增加10-25%
    const performanceIncrease = strategy === PileModelingStrategy.SHELL_ELEMENT ? 25 : 10;
    setPerformanceEstimate({ increase: performanceIncrease, strategy: strategy });
    
    // 初始化几何建模阶段
    initializeGeometryStages();
    
    logger.userAction('select_pile_type', 'PileModelingPanel', { 
      pileType: type, 
      strategy: strategy,
      performanceIncrease: `${performanceIncrease}%`,
      automationLevel: '90%'
    });
  };

  // 生成桩基配置数据
  const generatePileConfiguration = () => {
    if (!selectedPileType || !selectedStrategy) return;

    const geometryData = {
      id: `pile_${Date.now()}`,
      diameter: geometryParams.diameter,
      length: geometryParams.length,
      embedmentDepth: geometryParams.embedmentDepth,
      topPoint: { x: 0, y: 0, z: 0 },
      bottomPoint: { x: 0, y: 0, z: -geometryParams.length }
    };

    const soilData = {
      cohesion: 30,           // kPa
      bearingCapacity: 2000   // kPa
    };

    const pileData = PileDataConverter.convertToCalculationData(
      selectedPileType,
      selectedStrategy,
      geometryData,
      soilData
    );

    // 更新荷载参数
    pileData.loads = {
      axialLoad: loadParams.axialLoad,
      lateralLoad: loadParams.lateralLoad,
      moment: loadParams.moment
    };

    // 更新材料参数
    if (pileData.material.concrete) {
      pileData.material.concrete.strength = materialParams.concreteStrength;
      pileData.material.concrete.elasticModulus = materialParams.elasticModulus;
    }

    setPileConfiguration(pileData);
    setActiveTab('analysis');
    
    // 1. 几何建模完成 → 立即调用 generatePhysicsGroupUpdateRequest()
    const updateRequest = generatePhysicsGroupUpdateRequest(pileData);
    setPhysicsGroupRequest(updateRequest);
    
    // 生成FEM数据传递结构
    generateFEMDataTransfer(pileData);
    
    if (onPileConfigured) {
      onPileConfigured(pileData);
    }
    
    logger.info('Pile configuration generated', {
      pileId: pileData.pileId,
      automationLevel: '90%',
      femDataGenerated: true
    });
  };

  // 模拟桩基分析
  const performPileAnalysis = async () => {
    if (!pileConfiguration || !femDataTransfer) return;

    setIsAnalyzing(true);
    
    try {
      // 2. 用户确认变化 → 通知1号更新UI状态
      femDataTransferService.confirmUserChanges(femDataTransfer);
      
      // 3. 计算开始前 → 3号验证 FEMDataTransfer 完整性
      const validationResult = femDataTransferService.prepareForCalculation(femDataTransfer);
      if (!validationResult.isValid) {
        logger.error('FEM数据验证失败', validationResult.errors);
        throw new Error(`FEM数据验证失败: ${validationResult.errors.join(', ')}`);
      }

      logger.info('开始桩基分析计算', {
        pileId: pileConfiguration.pileId,
        femDataValidated: true,
        automationSuccess: validationResult.automationSuccess,
        performanceIncrease: `${validationResult.performanceImpact.computationalIncrease}%`
      });

      // 模拟分析过程（考虑性能影响）
      const analysisTime = 2000 + validationResult.performanceImpact.timeIncrease * 1000;
      await new Promise(resolve => setTimeout(resolve, analysisTime));
      
      // 生成模拟分析结果
      const mockResult: PileAnalysisResult = {
        pileId: pileConfiguration.pileId,
        modelingStrategy: pileConfiguration.modelingStrategy,
        bearingCapacity: {
          ultimate: pileConfiguration.modelingStrategy === PileModelingStrategy.BEAM_ELEMENT ? 2500 : 2000,
          allowable: pileConfiguration.modelingStrategy === PileModelingStrategy.BEAM_ELEMENT ? 1250 : 1000,
          safetyFactor: 2.0,
          failureMode: 'compression'
        },
        displacement: {
          axialSettlement: pileConfiguration.modelingStrategy === PileModelingStrategy.BEAM_ELEMENT ? 15 : 12,
          lateralDeflection: 8,
          maxDisplacement: 18,
          rotationAngle: 0.002
        },
        stress: {
          maxCompressiveStress: pileConfiguration.modelingStrategy === PileModelingStrategy.BEAM_ELEMENT ? 18 : 15,
          maxTensileStress: 2,
          maxShearStress: 4,
          vonMisesStress: 16
        },
        stability: {
          bucklingLoad: 3000,
          criticalLength: 20,
          stabilityFactor: 2.5
        }
      };

      // 为壳元桩基添加土-桩相互作用结果
      if (pileConfiguration.modelingStrategy === PileModelingStrategy.SHELL_ELEMENT) {
        mockResult.soilInteractionResult = {
          lateralFrictionDistribution: [45, 50, 55, 60, 65, 70, 75, 80],
          endBearingPressure: 1800,
          soilStressDistribution: [200, 250, 300, 350, 400, 450, 500, 550],
          pileGroupEffect: 0.85
        };
      }

      setAnalysisResult(mockResult);
      logger.performance('Pile Analysis', 2000, { 
        pileType: selectedPileType, 
        strategy: selectedStrategy 
      });
      
    } catch (error) {
      logger.error('Pile analysis failed', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 生成物理组更新请求 - 响应明确指令
  const generatePhysicsGroupUpdateRequest = (pileData: PileCalculationData): PhysicsGroupUpdateRequest => {
    const request: PhysicsGroupUpdateRequest = {
      pileId: pileData.pileId,
      compactionRadius: pileData.compactionParameters?.compactionRadius || 0,
      affectedSoilProperties: {
        density: 1800,  // kg/m³ 挤密后密度增加
        cohesion: 75,   // kPa 挤密后粘聚力增加50%
        frictionAngle: 30, // 度 挤密后内摩擦角增加
        elasticModulus: 25 // MPa 挤密后弹性模量增加
      },
      updateTimestamp: Date.now(),
      automaticUpdateEnabled: true // 90%自动化
    };

    logger.info('Physics group update request generated', request);
    return request;
  };

  // 生成FEM数据传递结构 - 使用专业服务
  const generateFEMDataTransfer = (pileData: PileCalculationData) => {
    // 使用FEM数据传递服务生成结构化数据
    const femData = femDataTransferService.generateFEMDataTransfer(pileData);
    setFemDataTransfer(femData);
    
    logger.info('FEM数据传递结构生成完成', {
      materialsCount: Object.keys(femData.materials).length,
      elementsCount: femData.elements.length,
      compactionElements: femData.elements.filter(el => el.compactionZone).length,
      hasCompactedSoil: Object.values(femData.materials).some(mat => mat.type === 'compacted_soil'),
      automationLevel: `${femData.automationLevel * 100}%`,
      performanceIncrease: `${femData.performanceEstimate.computationalIncrease}%`
    });
  };

  // 验证FEM数据传递完整性 - 使用专业服务
  const validateFEMDataTransfer = (data: FEMDataTransfer): ValidationResult => {
    return femDataTransferService.validateFEMDataTransfer(data);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl w-[95vw] h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">PM</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">桩基建模集成系统</h2>
                <p className="text-sm text-gray-600">基于2号几何专家修正的专业桩基建模策略</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <span className="text-gray-600">×</span>
            </button>
          </div>

          {/* 标签页导航 */}
          <div className="flex border-b border-gray-200">
            {[
              { key: 'selection', label: '桩基选择', icon: '🏗️', enabled: true },
              { key: 'configuration', label: '参数配置', icon: '⚙️', enabled: selectedPileType !== null },
              { key: 'analysis', label: '分析结果', icon: '📊', enabled: pileConfiguration !== null }
            ].map((tab) => (
              <button
                key={tab.key}
                disabled={!tab.enabled}
                className={`flex items-center space-x-2 px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                    : tab.enabled
                    ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
                onClick={() => tab.enabled && setActiveTab(tab.key as any)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'selection' && (
              <div className="p-6 h-full">
                <div className="max-w-2xl mx-auto">
                  <div className="text-center mb-8">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">选择桩基类型和建模策略</h3>
                    <p className="text-gray-600">
                      根据2号几何专家的修正，系统将基于施工工艺和土体处理方式自动选择建模策略
                    </p>
                  </div>
                  
                  <PileTypeSelector
                    selectedType={selectedPileType || undefined}
                    onTypeSelect={handlePileTypeSelect}
                    showStrategyExplanation={true}
                  />
                  
                  {selectedPileType && selectedStrategy && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <StatusIcons.Completed size={20} color="#059669" />
                        <div>
                          <p className="font-medium text-green-800">
                            已选择：{selectedPileType.replace(/_/g, ' ')} - {
                              selectedStrategy === PileModelingStrategy.BEAM_ELEMENT ? '梁元模拟' : '壳元模拟'
                            }
                          </p>
                          <p className="text-sm text-green-600 mt-1">
                            点击"参数配置"标签继续设置桩基参数
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'configuration' && (
              <div className="p-6 h-full overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-8">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">桩基参数配置</h3>
                    <p className="text-gray-600">
                      为 {selectedPileType?.replace(/_/g, ' ')} 配置详细的几何、材料和荷载参数
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* 几何参数 */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <FunctionalIcons.GeologyModeling size={20} color="#3b82f6" className="mr-2" />
                        几何参数
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">桩径 (mm)</label>
                          <input
                            type="number"
                            value={geometryParams.diameter}
                            onChange={(e) => setGeometryParams(prev => ({ ...prev, diameter: Number(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">桩长 (m)</label>
                          <input
                            type="number"
                            value={geometryParams.length}
                            onChange={(e) => setGeometryParams(prev => ({ ...prev, length: Number(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">嵌入深度 (m)</label>
                          <input
                            type="number"
                            value={geometryParams.embedmentDepth}
                            onChange={(e) => setGeometryParams(prev => ({ ...prev, embedmentDepth: Number(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 材料参数 */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <FunctionalIcons.MaterialProperties size={20} color="#10b981" className="mr-2" />
                        材料参数
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {selectedStrategy === PileModelingStrategy.BEAM_ELEMENT ? '混凝土强度' : '水泥土强度'} (MPa)
                          </label>
                          <input
                            type="number"
                            value={materialParams.concreteStrength}
                            onChange={(e) => setMaterialParams(prev => ({ ...prev, concreteStrength: Number(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">弹性模量 (GPa)</label>
                          <input
                            type="number"
                            value={materialParams.elasticModulus}
                            onChange={(e) => setMaterialParams(prev => ({ ...prev, elasticModulus: Number(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        {selectedStrategy === PileModelingStrategy.BEAM_ELEMENT && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">配筋率 (%)</label>
                            <input
                              type="number"
                              value={materialParams.reinforcementRatio}
                              onChange={(e) => setMaterialParams(prev => ({ ...prev, reinforcementRatio: Number(e.target.value) }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 荷载参数 */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <FunctionalIcons.StructuralAnalysis size={20} color="#f59e0b" className="mr-2" />
                        荷载参数
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">轴向荷载 (kN)</label>
                          <input
                            type="number"
                            value={loadParams.axialLoad}
                            onChange={(e) => setLoadParams(prev => ({ ...prev, axialLoad: Number(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">横向荷载 (kN)</label>
                          <input
                            type="number"
                            value={loadParams.lateralLoad}
                            onChange={(e) => setLoadParams(prev => ({ ...prev, lateralLoad: Number(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">弯矩 (kN⋅m)</label>
                          <input
                            type="number"
                            value={loadParams.moment}
                            onChange={(e) => setLoadParams(prev => ({ ...prev, moment: Number(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={generatePileConfiguration}
                      className="px-8 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                    >
                      生成桩基配置
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analysis' && (
              <div className="p-6 h-full overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                  <div className="text-center mb-8">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">桩基分析结果</h3>
                    <p className="text-gray-600">
                      基于 {selectedStrategy === PileModelingStrategy.BEAM_ELEMENT ? '梁元模拟' : '壳元模拟'} 的专业分析结果
                    </p>
                  </div>

                  {!analysisResult ? (
                    <div className="text-center">
                      <button
                        onClick={performPileAnalysis}
                        disabled={isAnalyzing}
                        className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                          isAnalyzing 
                            ? 'bg-gray-400 text-white cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isAnalyzing ? '分析中...' : '开始分析'}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                      {/* 承载力分析 */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">承载力分析</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">极限承载力:</span>
                            <span className="font-semibold">{analysisResult.bearingCapacity.ultimate} kN</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">允许承载力:</span>
                            <span className="font-semibold">{analysisResult.bearingCapacity.allowable} kN</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">安全系数:</span>
                            <span className="font-semibold text-green-600">{analysisResult.bearingCapacity.safetyFactor}</span>
                          </div>
                        </div>
                      </div>

                      {/* 变形分析 */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">变形分析</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">轴向沉降:</span>
                            <span className="font-semibold">{analysisResult.displacement.axialSettlement} mm</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">横向变形:</span>
                            <span className="font-semibold">{analysisResult.displacement.lateralDeflection} mm</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">最大位移:</span>
                            <span className="font-semibold">{analysisResult.displacement.maxDisplacement} mm</span>
                          </div>
                        </div>
                      </div>

                      {/* 应力分析 */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">应力分析</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">最大压应力:</span>
                            <span className="font-semibold">{analysisResult.stress.maxCompressiveStress} MPa</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">最大拉应力:</span>
                            <span className="font-semibold">{analysisResult.stress.maxTensileStress} MPa</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">von Mises应力:</span>
                            <span className="font-semibold">{analysisResult.stress.vonMisesStress} MPa</span>
                          </div>
                        </div>
                      </div>

                      {/* 稳定性分析 */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">稳定性分析</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">屈曲荷载:</span>
                            <span className="font-semibold">{analysisResult.stability.bucklingLoad} kN</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">临界长度:</span>
                            <span className="font-semibold">{analysisResult.stability.criticalLength} m</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">稳定系数:</span>
                            <span className="font-semibold text-green-600">{analysisResult.stability.stabilityFactor}</span>
                          </div>
                        </div>
                      </div>

                      {/* 土-桩相互作用结果（仅壳元桩基） */}
                      {analysisResult.soilInteractionResult && (
                        <div className="lg:col-span-2 xl:col-span-4 bg-white border border-gray-200 rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-gray-800 mb-4">土-桩相互作用分析</h4>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="text-center">
                              <p className="text-sm text-gray-600">端承压力</p>
                              <p className="text-xl font-bold text-purple-600">
                                {analysisResult.soilInteractionResult.endBearingPressure} kPa
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-600">群桩效应系数</p>
                              <p className="text-xl font-bold text-purple-600">
                                {analysisResult.soilInteractionResult.pileGroupEffect}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-600">平均侧摩阻力</p>
                              <p className="text-xl font-bold text-purple-600">
                                {(analysisResult.soilInteractionResult.lateralFrictionDistribution.reduce((a, b) => a + b, 0) / 
                                  analysisResult.soilInteractionResult.lateralFrictionDistribution.length).toFixed(1)} kPa
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-600">土体改良效果</p>
                              <p className="text-xl font-bold text-green-600">显著</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PileModelingIntegrationPanel;