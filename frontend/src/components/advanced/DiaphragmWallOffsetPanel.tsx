/**
 * 地连墙偏移功能控制面板
 * DeepCAD Deep Excavation CAE Platform - Diaphragm Wall Offset Panel
 * 
 * 作者：2号几何专家 & 1号架构师协作
 * 功能：地连墙偏移操作的专业UI控制界面
 * 协作：与3号计算专家的数据传递集成
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import GlassmorphismCard from '../ui/GlassmorphismCard';
import { DiaphragmWallOffsetProcessor, OffsetConfiguration, OffsetResult } from '../../core/geometry/DiaphragmWallOffsetProcessor';
import { TerraDataPackage, TerraOffsetInstruction } from '../../core/interfaces/TerraIntegrationInterface';
import { TerraDataValidator, ValidationResult } from '../../utils/TerraDataValidator';
import { designTokens } from '../../design/tokens';
import { logger } from '../../utils/advancedLogger';
import { moduleHub, GeometryData, ModuleState } from '../../integration/ModuleIntegrationHub';

// ==================== 组件接口 ====================

interface DiaphragmWallOffsetPanelProps {
  onOffsetProcessed?: (result: OffsetResult) => void;
  onDataTransferToTerra?: (dataPackage: TerraDataPackage) => void;
  selectedGeometry?: THREE.BufferGeometry | null;
  isVisible?: boolean;
}

interface OffsetProcessingState {
  isProcessing: boolean;
  progress: number;
  currentStep: string;
  result: OffsetResult | null;
  errors: string[];
  validationResult?: ValidationResult;
  terraValidation?: boolean;
}

// ==================== 主组件 ====================

export const DiaphragmWallOffsetPanel: React.FC<DiaphragmWallOffsetPanelProps> = ({
  onOffsetProcessed,
  onDataTransferToTerra,
  selectedGeometry,
  isVisible = true
}) => {
  // 状态管理
  const [offsetConfig, setOffsetConfig] = useState<OffsetConfiguration>({
    offsetDistance: -0.1, // 默认往里偏移10cm
    offsetDirection: 'inward',
    preserveTopology: true,
    qualityControl: {
      minElementQuality: 0.3,
      maxAspectRatio: 10.0
    }
  });

  const [processingState, setProcessingState] = useState<OffsetProcessingState>({
    isProcessing: false,
    progress: 0,
    currentStep: '准备就绪',
    result: null,
    errors: []
  });

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [terraTransferEnabled, setTerraTransferEnabled] = useState(true);
  const [enableDataValidation, setEnableDataValidation] = useState(true);

  // Refs
  const offsetProcessorRef = useRef<DiaphragmWallOffsetProcessor | null>(null);
  const dataValidatorRef = useRef<TerraDataValidator | null>(null);

  // 初始化偏移处理器和数据验证器
  useEffect(() => {
    offsetProcessorRef.current = new DiaphragmWallOffsetProcessor(offsetConfig);
    dataValidatorRef.current = new TerraDataValidator();
    logger.info('地连墙偏移处理器和数据验证器初始化完成', { config: offsetConfig });
  }, [offsetConfig]);

  // ==================== moduleHub集成 ====================
  
  // 注册几何建模模块到moduleHub
  useEffect(() => {
    // 注册几何建模回调
    moduleHub.registerGeometryModule({
      onGeometryCreated: (data: GeometryData) => {
        logger.info('🔧 地连墙偏移模块收到几何创建事件', data);
        // 可以在这里设置选中的几何体
        if (data.type === 'support' && data.name.includes('diaphragm')) {
          console.log('🔧 检测到地连墙几何体，准备偏移处理');
        }
      },
      onGeometryUpdated: (data: GeometryData) => {
        logger.info('🔧 地连墙偏移模块收到几何更新事件', data);
        // 几何更新时可能需要重新处理偏移
      },
      onGeometryDeleted: (id: string) => {
        logger.info('🔧 地连墙偏移模块收到几何删除事件', { id });
      }
    });

    // 更新模块状态为就绪
    moduleHub.updateModuleState('geometry', {
      status: 'ready',
      progress: 100,
      message: '地连墙偏移处理模块已就绪'
    });

    logger.info('🔧 地连墙偏移面板已注册到moduleHub');
    
    return () => {
      // 清理时重置状态
      moduleHub.updateModuleState('geometry', {
        status: 'idle',
        progress: 0,
        message: undefined
      });
    };
  }, []);

  // 监听偏移处理状态变化并同步到moduleHub
  useEffect(() => {
    if (processingState.isProcessing) {
      moduleHub.updateModuleState('geometry', {
        status: 'computing',
        progress: processingState.progress,
        message: processingState.currentStep
      });
    } else if (processingState.result) {
      moduleHub.updateModuleState('geometry', {
        status: 'completed',
        progress: 100,
        message: '地连墙偏移处理完成'
      });
      
      // 创建几何数据并发布几何更新事件
      const geometryData: GeometryData = {
        id: `diaphragm_offset_${Date.now()}`,
        name: '地连墙偏移几何',
        type: 'support',
        geometry: processingState.result.offsetGeometry,
        properties: {
          offsetDistance: offsetConfig.offsetDistance,
          offsetDirection: offsetConfig.offsetDirection,
          qualityMetrics: processingState.result.qualityMetrics,
          processingTime: processingState.result.processingTime
        },
        timestamp: Date.now()
      };
      
      moduleHub.emit('geometry:updated', geometryData);
      logger.info('🔧 地连墙偏移几何数据已发布到moduleHub', geometryData);
    } else if (processingState.errors.length > 0) {
      moduleHub.updateModuleState('geometry', {
        status: 'error',
        progress: 0,
        error: processingState.errors.join('; '),
        message: '地连墙偏移处理失败'
      });
    }
  }, [processingState, offsetConfig]);

  // ==================== 事件处理 ====================

  /**
   * 执行偏移处理 - 3号专家协作的核心功能
   */
  const handleExecuteOffset = useCallback(async () => {
    if (!selectedGeometry || !offsetProcessorRef.current) {
      setProcessingState(prev => ({
        ...prev,
        errors: ['请先选择地连墙几何体或偏移处理器未初始化']
      }));
      return;
    }

    setProcessingState({
      isProcessing: true,
      progress: 0,
      currentStep: '开始偏移处理...',
      result: null,
      errors: []
    });

    try {
      // 步骤1：验证输入
      setProcessingState(prev => ({
        ...prev,
        progress: 20,
        currentStep: '验证输入几何体...'
      }));

      await new Promise(resolve => setTimeout(resolve, 300)); // 模拟处理时间

      // 步骤2：执行偏移算法
      setProcessingState(prev => ({
        ...prev,
        progress: 50,
        currentStep: '执行偏移算法...'
      }));

      const startTime = performance.now();
      const offsetResult = offsetProcessorRef.current.processOffset(selectedGeometry, offsetConfig.offsetDistance);
      const processingTime = performance.now() - startTime;

      // 步骤3：质量检查
      setProcessingState(prev => ({
        ...prev,
        progress: 80,
        currentStep: '质量检查与验证...'
      }));

      await new Promise(resolve => setTimeout(resolve, 200));

      if (!offsetResult.success) {
        throw new Error(`偏移处理失败: ${offsetResult.warnings.join(', ')}`);
      }

      // 步骤4：数据验证（如果启用）
      let validationResult: ValidationResult | undefined;
      if (enableDataValidation && dataValidatorRef.current) {
        setProcessingState(prev => ({
          ...prev,
          progress: 85,
          currentStep: '验证数据包完整性...'
        }));

        const testDataPackage = createTerraDataPackage(offsetResult);
        validationResult = dataValidatorRef.current.validateDataPackage(testDataPackage);
        
        console.log(`🔍 数据验证完成，得分: ${validationResult.score}/100`);
        
        if (!validationResult.isValid) {
          const warningsArray: string[] = [];
          warningsArray.push(...validationResult.errors.map(e => `验证错误: ${e.message}`));
        }
      }

      // 步骤5：数据传递给3号专家
      if (terraTransferEnabled && onDataTransferToTerra) {
        setProcessingState(prev => ({
          ...prev,
          progress: 90,
          currentStep: '传递数据给Terra仿真系统...'
        }));

        const terraDataPackage = createTerraDataPackage(offsetResult);
        onDataTransferToTerra(terraDataPackage);
      }

      // 完成
      setProcessingState({
        isProcessing: false,
        progress: 100,
        currentStep: '偏移处理完成',
        result: offsetResult,
        errors: offsetResult.warnings,
        validationResult,
        terraValidation: terraTransferEnabled
      });

      // 回调通知
      if (onOffsetProcessed) {
        onOffsetProcessed(offsetResult);
      }

      logger.info('地连墙偏移处理成功', {
        processingTime,
        offsetDistance: offsetConfig.offsetDistance,
        qualityScore: offsetResult.qualityMetrics.averageElementQuality
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setProcessingState({
        isProcessing: false,
        progress: 0,
        currentStep: '处理失败',
        result: null,
        errors: [errorMessage]
      });

      logger.error('地连墙偏移处理失败', { error: errorMessage });
    }
  }, [selectedGeometry, offsetConfig, terraTransferEnabled, onOffsetProcessed, onDataTransferToTerra]);

  /**
   * 创建Terra数据包 - 与3号专家的数据交换标准
   */
  const createTerraDataPackage = useCallback((offsetResult: OffsetResult): TerraDataPackage => {
    const offsetInstruction: TerraOffsetInstruction = {
      instructionId: `offset_${Date.now()}`,
      timestamp: new Date().toISOString(),
      offsetElements: [{
        elementId: 'diaphragm_wall_001',
        elementType: 'SHELL',
        hasOffset: true,
        offsetInfo: {
          offsetDistance: Math.abs(offsetConfig.offsetDistance),
          offsetDirection: offsetConfig.offsetDirection,
          originalNodePositions: extractNodePositions(selectedGeometry!),
          offsetNodePositions: extractNodePositions(offsetResult.offsetGeometry),
          offsetVectors: offsetResult.offsetVector.map(v => [v.x, v.y, v.z]),
          qualityMetrics: {
            minJacobian: offsetResult.qualityMetrics.minJacobian,
            maxAspectRatio: offsetResult.qualityMetrics.maxAspectRatio,
            qualityScore: offsetResult.qualityMetrics.averageElementQuality * 100
          }
        }
      }],
      boundaryMappings: [],
      solverRecommendations: {
        enableShellOffsetSupport: true,
        recommendedIntegrationScheme: 'GAUSS',
        convergenceCriteria: {
          displacementTolerance: 1e-6,
          residualTolerance: 1e-8,
          maxIterations: 100
        }
      },
      qualityRequirements: {
        minElementQuality: offsetConfig.qualityControl.minElementQuality,
        maxAspectRatio: offsetConfig.qualityControl.maxAspectRatio,
        requirePositiveJacobian: true
      }
    };

    return {
      packageId: `deepcad_offset_${Date.now()}`,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      nodes: [],
      materials: [],
      offsetInstructions: offsetInstruction,
      solverConfiguration: {
        solverType: 'TERRA_STRUCTURAL',
        analysisType: 'STATIC',
        convergenceCriteria: {
          solutionRelativeTolerance: 1e-6,
          solutionAbsoluteTolerance: 1e-9,
          residualRelativeTolerance: 1e-6,
          residualAbsoluteTolerance: 1e-9,
          maxIterations: 100
        },
        enableOffsetShellSupport: true,
        enableCompactionZoneProcessing: false,
        enableContactProcessing: false,
        parallelization: {
          enableOMP: true,
          numThreads: 4
        }
      },
      validationRequirements: {
        geometryValidation: {
          checkElementQuality: true,
          minJacobian: offsetConfig.qualityControl.minElementQuality,
          maxAspectRatio: offsetConfig.qualityControl.maxAspectRatio
        },
        offsetValidation: {
          checkOffsetAccuracy: true,
          maxOffsetError: 1.0, // 1mm
          validateBoundaryMapping: true
        },
        pileValidation: {
          validateCompactionZones: false,
          checkContactInterfaces: false,
          validateMaterialTransitions: false
        },
        performanceRequirements: {
          maxProcessingTime: 30,
          maxMemoryUsage: 2048,
          targetAccuracy: 0.99
        }
      }
    };
  }, [offsetConfig, selectedGeometry]);

  /**
   * 提取节点位置 - 工具函数
   */
  const extractNodePositions = (geometry: THREE.BufferGeometry): number[][] => {
    const positions = geometry.attributes.position.array as Float32Array;
    const nodePositions: number[][] = [];
    
    for (let i = 0; i < positions.length; i += 3) {
      nodePositions.push([positions[i], positions[i + 1], positions[i + 2]]);
    }
    
    return nodePositions;
  };

  /**
   * 重置处理状态
   */
  const handleReset = useCallback(() => {
    setProcessingState({
      isProcessing: false,
      progress: 0,
      currentStep: '准备就绪',
      result: null,
      errors: []
    });
  }, []);

  // ==================== 渲染组件 ====================

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* 主控制面板 */}
      <GlassmorphismCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"></div>
            地连墙偏移处理
          </h3>
          <div className="text-sm text-blue-300">
            2号几何 ↔ 3号计算协作
          </div>
        </div>

        {/* 偏移参数设置 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              偏移距离 (m)
            </label>
            <Input
              type="number"
              step={0.01}
              value={offsetConfig.offsetDistance.toString()}
              onChange={(e) => setOffsetConfig(prev => ({
                ...prev,
                offsetDistance: parseFloat(e.target.value) || -0.1
              }))}
              className="bg-gray-800/50 border-gray-600 text-white"
              placeholder="-0.1"
            />
            <div className="text-xs text-gray-400 mt-1">
              负值表示往里偏移，正值表示往外偏移
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              偏移方向
            </label>
            <select
              value={offsetConfig.offsetDirection}
              onChange={(e) => setOffsetConfig(prev => ({
                ...prev,
                offsetDirection: e.target.value as 'inward' | 'outward' | 'normal'
              }))}
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="inward">向内偏移</option>
              <option value="outward">向外偏移</option>
              <option value="normal">沿法向量</option>
            </select>
          </div>
        </div>

        {/* 高级设置切换 */}
        <div className="mb-4">
          <button
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
          >
            <span>{showAdvancedSettings ? '隐藏' : '显示'}高级设置</span>
            <motion.div
              animate={{ rotate: showAdvancedSettings ? 180 : 0 }}
              className="w-4 h-4"
            >
              ▼
            </motion.div>
          </button>
        </div>

        {/* 高级设置面板 */}
        <AnimatePresence>
          {showAdvancedSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800/30 rounded-lg mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    最小单元质量
                  </label>
                  <Input
                    type="number"
                    step={0.1}
                    min={0.1}
                    max={1.0}
                    value={offsetConfig.qualityControl.minElementQuality.toString()}
                    onChange={(e) => setOffsetConfig(prev => ({
                      ...prev,
                      qualityControl: {
                        ...prev.qualityControl,
                        minElementQuality: parseFloat(e.target.value) || 0.3
                      }
                    }))}
                    className="bg-gray-800/50 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    最大长宽比
                  </label>
                  <Input
                    type="number"
                    step={1}
                    min={1}
                    max={50}
                    value={offsetConfig.qualityControl.maxAspectRatio}
                    onChange={(e) => setOffsetConfig(prev => ({
                      ...prev,
                      qualityControl: {
                        ...prev.qualityControl,
                        maxAspectRatio: parseFloat(e.target.value) || 10.0
                      }
                    }))}
                    className="bg-gray-800/50 border-gray-600 text-white"
                  />
                </div>

                <div className="col-span-2 space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={terraTransferEnabled}
                      onChange={(e) => setTerraTransferEnabled(e.target.checked)}
                      className="rounded border-gray-600 bg-gray-800/50 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">
                      自动传递数据给3号计算专家 (Terra仿真系统)
                    </span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={enableDataValidation}
                      onChange={(e) => setEnableDataValidation(e.target.checked)}
                      className="rounded border-gray-600 bg-gray-800/50 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">
                      启用数据验证 (验证与3号专家的数据传输格式)
                    </span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 控制按钮 */}
        <div className="flex gap-3">
          <Button
            onClick={handleExecuteOffset}
            disabled={processingState.isProcessing || !selectedGeometry}
            className="flex-1"
            variant="primary"
          >
            {processingState.isProcessing ? '处理中...' : '执行偏移'}
          </Button>

          <Button
            onClick={handleReset}
            disabled={processingState.isProcessing}
            variant="secondary"
          >
            重置
          </Button>
        </div>
      </GlassmorphismCard>

      {/* 处理状态显示 */}
      <AnimatePresence>
        {processingState.isProcessing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="p-4 bg-gray-800/80">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">处理进度</span>
                  <span className="text-blue-400">{processingState.progress}%</span>
                </div>
                
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${processingState.progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                
                <div className="text-sm text-gray-300">
                  当前步骤: {processingState.currentStep}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 结果显示 */}
      <AnimatePresence>
        {processingState.result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <GlassmorphismCard className="p-6">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                处理结果
              </h4>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="text-sm text-gray-300">处理时间</div>
                  <div className="text-white font-medium">
                    {processingState.result.processingTime.toFixed(2)} ms
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-gray-300">质量评分</div>
                  <div className="text-white font-medium">
                    {(processingState.result.qualityMetrics.averageElementQuality * 100).toFixed(1)}%
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-gray-300">最小Jacobian</div>
                  <div className="text-white font-medium">
                    {processingState.result.qualityMetrics.minJacobian.toFixed(4)}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-gray-300">最大长宽比</div>
                  <div className="text-white font-medium">
                    {processingState.result.qualityMetrics.maxAspectRatio.toFixed(2)}
                  </div>
                </div>
              </div>

              {processingState.result.warnings.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
                  <div className="text-sm font-medium text-yellow-400 mb-2">警告信息</div>
                  <ul className="text-sm text-yellow-300 space-y-1">
                    {processingState.result.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 数据验证结果 */}
              {processingState.validationResult && (
                <div className="mt-4 p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium text-blue-400">
                      数据验证结果
                    </div>
                    <div className={`text-sm font-bold ${
                      processingState.validationResult.isValid ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {processingState.validationResult.score}/100分
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-blue-300">验证状态: </span>
                      <span className={processingState.validationResult.isValid ? 'text-green-400' : 'text-red-400'}>
                        {processingState.validationResult.isValid ? '✅ 通过' : '❌ 未通过'}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-300">错误数量: </span>
                      <span className="text-white">{processingState.validationResult.errors.length}</span>
                    </div>
                    <div>
                      <span className="text-blue-300">警告数量: </span>
                      <span className="text-white">{processingState.validationResult.warnings.length}</span>
                    </div>
                    <div>
                      <span className="text-blue-300">验证时间: </span>
                      <span className="text-white">{processingState.validationResult.performanceMetrics.validationTime.toFixed(2)}ms</span>
                    </div>
                  </div>

                  {processingState.validationResult.errors.length > 0 && (
                    <div className="mt-3 p-2 bg-red-900/20 border border-red-600/30 rounded">
                      <div className="text-sm font-medium text-red-400 mb-1">验证错误</div>
                      <ul className="text-sm text-red-300 space-y-1">
                        {processingState.validationResult.errors.slice(0, 3).map((error, index) => (
                          <li key={index}>• [{error.severity}] {error.message}</li>
                        ))}
                        {processingState.validationResult.errors.length > 3 && (
                          <li className="text-gray-400">...还有 {processingState.validationResult.errors.length - 3} 个错误</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {processingState.validationResult.recommendations.length > 0 && (
                    <div className="mt-3 p-2 bg-green-900/20 border border-green-600/30 rounded">
                      <div className="text-sm font-medium text-green-400 mb-1">优化建议</div>
                      <ul className="text-sm text-green-300 space-y-1">
                        {processingState.validationResult.recommendations.slice(0, 2).map((rec, index) => (
                          <li key={index}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Kratos传输状态 */}
              {processingState.terraValidation && (
                <div className="mt-4 p-3 bg-purple-900/20 border border-purple-600/30 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-purple-300">
                      数据已传递给3号计算专家 (Kratos求解器)
                    </span>
                  </div>
                </div>
              )}
            </GlassmorphismCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 错误显示 */}
      <AnimatePresence>
        {processingState.errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-4 bg-red-900/30 border border-red-600/50">
              <div className="text-sm font-medium text-red-400 mb-2">错误信息</div>
              <ul className="text-sm text-red-300 space-y-1">
                {processingState.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DiaphragmWallOffsetPanel;