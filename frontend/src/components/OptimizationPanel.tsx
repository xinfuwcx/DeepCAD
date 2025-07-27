/**
 * 智能优化面板组件
 * 提供参数优化配置、执行、结果展示功能
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IntelligentOptimizationAPI,
  type OptimizationConfig,
  type OptimizationResult,
  type OptimizationVariable,
  type OptimizationObjective
} from '../services/intelligentOptimization';

interface OptimizationPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const objectiveLabels: Record<OptimizationObjective, string> = {
  minimize_deformation: '最小化变形',
  minimize_stress: '最小化应力',
  maximize_safety_factor: '最大化安全系数',
  minimize_cost: '最小化成本',
  minimize_construction_time: '最小化施工时间'
};

const algorithmLabels = {
  genetic_algorithm: '遗传算法',
  particle_swarm: '粒子群优化',
  gradient_descent: '梯度下降',
  bayesian_optimization: '贝叶斯优化'
};

const OptimizationPanel: React.FC<OptimizationPanelProps> = ({ isVisible, onClose }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'progress' | 'results'>('config');
  const [config, setConfig] = useState<OptimizationConfig | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentIteration, setCurrentIteration] = useState(0);

  // 初始化配置
  useEffect(() => {
    if (isVisible && !config) {
      IntelligentOptimizationAPI.getRecommendedConfig('深基坑工程').then(setConfig);
    }
  }, [isVisible, config]);

  // 开始优化
  const startOptimization = async () => {
    if (!config) return;

    setIsOptimizing(true);
    setActiveTab('progress');
    setProgress(0);
    setCurrentIteration(0);

    try {
      // 模拟评估函数
      const evaluationFunction = async (params: any) => {
        // 模拟计算延迟
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 模拟结果
        return {
          deformation: {
            wallDeflection: { maxValue: Math.random() * 50, location: [0, 0, 0], distribution: new Float32Array() },
            groundSettlement: { maxValue: Math.random() * 30, location: [0, 0, 0], distributionSurface: new Float32Array(), influenceZone: new Float32Array() }
          },
          stress: {
            maxPrincipalStress: { maxValue: Math.random() * 20, location: [0, 0, 0], distribution: new Float32Array() },
            minPrincipalStress: { maxValue: Math.random() * 15, location: [0, 0, 0], distribution: new Float32Array() },
            vonMisesStress: { maxValue: Math.random() * 18, location: [0, 0, 0], distribution: new Float32Array() }
          },
          stability: {
            overallStabilityFactor: 1.2 + Math.random() * 0.5,
            localStabilityFactors: new Float32Array(),
            criticalSlipSurface: { vertices: new Float32Array(), safetyFactor: 1.1 + Math.random() * 0.3 }
          },
          seepage: {
            totalFlowRate: Math.random() * 10,
            hydraulicGradients: new Float32Array(),
            pressureDistribution: new Float32Array(),
            criticalGradient: 0.8 + Math.random() * 0.4
          }
        };
      };

      const optimizer = IntelligentOptimizationAPI.createOptimizationTask(config, evaluationFunction);
      
      // 模拟优化进度
      const maxIterations = config.convergence.maxIterations;
      const progressInterval = setInterval(() => {
        setCurrentIteration(prev => {
          const next = prev + 1;
          setProgress((next / maxIterations) * 100);
          return next;
        });
      }, 200);

      const result = await optimizer.optimize();
      
      clearInterval(progressInterval);
      setOptimizationResult(result);
      setActiveTab('results');
    } catch (error) {
      console.error('优化过程出错:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  // 更新配置
  const updateConfig = (updates: Partial<OptimizationConfig>) => {
    if (config) {
      setConfig({ ...config, ...updates });
    }
  };

  // 添加优化变量
  const addVariable = () => {
    if (!config) return;
    
    const newVariable: OptimizationVariable = {
      name: '新变量',
      parameterPath: 'geometry.excavationDepth',
      type: 'continuous',
      bounds: { min: 0, max: 100 },
      initialValue: 50,
      description: '新的优化变量'
    };
    
    updateConfig({
      variables: [...config.variables, newVariable]
    });
  };

  // 移除优化变量
  const removeVariable = (index: number) => {
    if (!config) return;
    
    const newVariables = config.variables.filter((_, i) => i !== index);
    updateConfig({ variables: newVariables });
  };

  // 更新变量
  const updateVariable = (index: number, updates: Partial<OptimizationVariable>) => {
    if (!config) return;
    
    const newVariables = [...config.variables];
    newVariables[index] = { ...newVariables[index], ...updates };
    updateConfig({ variables: newVariables });
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
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">OPT</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">智能参数优化</h2>
                <p className="text-sm text-gray-600">基于AI的深基坑参数智能优化系统</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <span className="text-gray-600">×</span>
            </button>
          </div>

          {/* 标签页 */}
          <div className="flex border-b border-gray-200">
            {[
              { key: 'config', label: '优化配置', icon: '⚙️' },
              { key: 'progress', label: '优化进度', icon: '📊' },
              { key: 'results', label: '优化结果', icon: '🎯' }
            ].map((tab) => (
              <button
                key={tab.key}
                className={`flex items-center space-x-2 px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab(tab.key as any)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'config' && config && (
              <div className="h-full overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* 优化目标 */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">优化目标</h3>
                    <div className="space-y-4">
                      {config.objectives.map((objective, index) => (
                        <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                          <select
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                            value={objective.type}
                            onChange={(e) => {
                              const newObjectives = [...config.objectives];
                              newObjectives[index].type = e.target.value as OptimizationObjective;
                              updateConfig({ objectives: newObjectives });
                            }}
                          >
                            {Object.entries(objectiveLabels).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="权重"
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                            value={objective.weight}
                            onChange={(e) => {
                              const newObjectives = [...config.objectives];
                              newObjectives[index].weight = parseFloat(e.target.value) || 0;
                              updateConfig({ objectives: newObjectives });
                            }}
                          />
                          <select
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                            value={objective.direction}
                            onChange={(e) => {
                              const newObjectives = [...config.objectives];
                              newObjectives[index].direction = e.target.value as 'minimize' | 'maximize';
                              updateConfig({ objectives: newObjectives });
                            }}
                          >
                            <option value="minimize">最小化</option>
                            <option value="maximize">最大化</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 优化变量 */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">优化变量</h3>
                      <button
                        onClick={addVariable}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        添加变量
                      </button>
                    </div>
                    <div className="space-y-4">
                      {config.variables.map((variable, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg">
                          <div className="grid grid-cols-4 gap-4 mb-3">
                            <input
                              type="text"
                              placeholder="变量名称"
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                              value={variable.name}
                              onChange={(e) => updateVariable(index, { name: e.target.value })}
                            />
                            <input
                              type="text"
                              placeholder="参数路径"
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                              value={variable.parameterPath}
                              onChange={(e) => updateVariable(index, { parameterPath: e.target.value })}
                            />
                            <select
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                              value={variable.type}
                              onChange={(e) => updateVariable(index, { type: e.target.value as any })}
                            >
                              <option value="continuous">连续</option>
                              <option value="discrete">离散</option>
                              <option value="categorical">分类</option>
                            </select>
                            <button
                              onClick={() => removeVariable(index)}
                              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              删除
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <input
                              type="number"
                              placeholder="最小值"
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                              value={variable.bounds.min || ''}
                              onChange={(e) => updateVariable(index, { 
                                bounds: { ...variable.bounds, min: parseFloat(e.target.value) || 0 }
                              })}
                            />
                            <input
                              type="number"
                              placeholder="最大值"
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                              value={variable.bounds.max || ''}
                              onChange={(e) => updateVariable(index, { 
                                bounds: { ...variable.bounds, max: parseFloat(e.target.value) || 100 }
                              })}
                            />
                            <input
                              type="text"
                              placeholder="单位"
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                              value={variable.unit || ''}
                              onChange={(e) => updateVariable(index, { unit: e.target.value })}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 算法配置 */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">算法配置</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <select
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        value={config.algorithm.type}
                        onChange={(e) => updateConfig({
                          algorithm: { ...config.algorithm, type: e.target.value as any }
                        })}
                      >
                        {Object.entries(algorithmLabels).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="最大迭代次数"
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        value={config.convergence.maxIterations}
                        onChange={(e) => updateConfig({
                          convergence: { 
                            ...config.convergence, 
                            maxIterations: parseInt(e.target.value) || 100 
                          }
                        })}
                      />
                    </div>
                  </div>

                  {/* 开始优化按钮 */}
                  <div className="flex justify-center">
                    <button
                      onClick={startOptimization}
                      disabled={isOptimizing}
                      className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isOptimizing ? '优化中...' : '开始优化'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'progress' && (
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                  <div className="w-32 h-32 mx-auto mb-6">
                    <div className="relative w-full h-full">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="6"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="url(#gradient)"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={`${progress * 2.83} 283`}
                          className="transition-all duration-300"
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#ec4899" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-800">
                          {Math.round(progress)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {isOptimizing ? '正在执行优化...' : '优化已完成'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    当前迭代: {currentIteration} / {config?.convergence.maxIterations || 100}
                  </p>
                  
                  {isOptimizing && (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'results' && optimizationResult && (
              <div className="h-full overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* 优化概要 */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">优化结果概要</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {optimizationResult.success ? '成功' : '失败'}
                        </div>
                        <div className="text-sm text-gray-600">优化状态</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {optimizationResult.statistics.totalIterations}
                        </div>
                        <div className="text-sm text-gray-600">总迭代次数</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {(optimizationResult.statistics.executionTime / 1000).toFixed(1)}s
                        </div>
                        <div className="text-sm text-gray-600">执行时间</div>
                      </div>
                    </div>
                  </div>

                  {/* 最优目标值 */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">最优目标值</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(optimizationResult.optimalObjectiveValues).map(([key, value]) => (
                        <div key={key} className="p-4 bg-gray-50 rounded-lg">
                          <div className="font-medium text-gray-800">
                            {objectiveLabels[key as OptimizationObjective] || key}
                          </div>
                          <div className="text-2xl font-bold text-blue-600">
                            {typeof value === 'number' ? value.toFixed(3) : value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 收敛历史图表 */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">收敛历史</h3>
                    <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                      <div className="text-gray-500">
                        📈 收敛历史图表 (需要图表库支持)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OptimizationPanel;