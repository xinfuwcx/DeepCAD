/**
 * 🎛️ 可视化参数编辑界面
 * 
 * 第3周开发任务 Day 2 - 2号几何专家
 * 智能参数编辑器，支持实时约束求解和可视化反馈
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GeometricParameter, ParametricConstraint, ParametricConstraintSolver, createParametricConstraintSolver } from '../../services/parametricConstraintSolver';

// 🎨 参数编辑器配置
interface ParametricEditorConfig {
  enableRealTimeUpdate: boolean;
  showConstraintVisualization: boolean;
  enableSmartSuggestions: boolean;
  autoSave: boolean;
  precision: number;
}

// 📊 参数组类型
interface ParameterGroup {
  id: string;
  name: string;
  description: string;
  parameters: string[];
  collapsed: boolean;
  color: string;
}

const ParametricEditor: React.FC = () => {
  // 核心状态管理
  const [solver] = useState(() => createParametricConstraintSolver());
  const [parameters, setParameters] = useState<Map<string, GeometricParameter>>(new Map());
  const [constraints, setConstraints] = useState<Map<string, ParametricConstraint>>(new Map());
  const [parameterGroups, setParameterGroups] = useState<ParameterGroup[]>([]);
  const [selectedParameter, setSelectedParameter] = useState<string | null>(null);
  const [selectedConstraint, setSelectedConstraint] = useState<string | null>(null);
  
  // 编辑器配置
  const [config, setConfig] = useState<ParametricEditorConfig>({
    enableRealTimeUpdate: true,
    showConstraintVisualization: true,
    enableSmartSuggestions: true,
    autoSave: true,
    precision: 3
  });
  
  // 求解状态
  const [issolving, setIsSolving] = useState(false);
  const [lastSolutionResult, setLastSolutionResult] = useState<any>(null);
  const [solutionHistory, setSolutionHistory] = useState<any[]>([]);
  
  // UI状态
  const [activeTab, setActiveTab] = useState<'parameters' | 'constraints' | 'results'>('parameters');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  // 性能优化
  const solveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 🔧 添加新参数
   */
  const addParameter = useCallback((type: GeometricParameter['type'] = 'length') => {
    const newParam: GeometricParameter = {
      id: `param_${Date.now()}`,
      name: `${type}_${parameters.size + 1}`,
      type,
      value: type === 'angle' ? 90 : type === 'ratio' ? 1.0 : 10.0,
      unit: type === 'angle' ? '°' : type === 'ratio' ? '' : 'mm',
      bounds: {
        min: type === 'angle' ? 0 : type === 'ratio' ? 0.1 : 0.1,
        max: type === 'angle' ? 360 : type === 'ratio' ? 10 : 1000
      },
      precision: type === 'angle' ? 1 : 2,
      description: `${type}参数`
    };
    
    const updatedParams = new Map(parameters);
    updatedParams.set(newParam.id, newParam);
    setParameters(updatedParams);
    
    solver.addParameter(newParam);
    
    // 触发实时求解
    if (config.enableRealTimeUpdate) {
      triggerRealTimeSolve();
    }
    
    console.log(`➕ 添加参数: ${newParam.name}`);
  }, [parameters, solver, config.enableRealTimeUpdate]);

  /**
   * 🔗 添加新约束
   */
  const addConstraint = useCallback((type: ParametricConstraint['type'] = 'equality') => {
    const availableParams = Array.from(parameters.keys());
    if (availableParams.length < 2) {
      alert('至少需要2个参数才能创建约束');
      return;
    }
    
    const newConstraint: ParametricConstraint = {
      id: `constraint_${Date.now()}`,
      name: `${type}_${constraints.size + 1}`,
      type,
      parameters: availableParams.slice(0, 2), // 默认使用前两个参数
      relationship: type === 'equality' ? 'p1 = p2' : type === 'inequality' ? 'p1 > p2' : 'distance(p1, p2) > 0',
      tolerance: 0.01,
      priority: 'medium',
      description: `${type}约束`
    };
    
    const updatedConstraints = new Map(constraints);
    updatedConstraints.set(newConstraint.id, newConstraint);
    setConstraints(updatedConstraints);
    
    solver.addConstraint(newConstraint);
    
    if (config.enableRealTimeUpdate) {
      triggerRealTimeSolve();
    }
    
    console.log(`🔗 添加约束: ${newConstraint.name}`);
  }, [constraints, parameters, solver, config.enableRealTimeUpdate]);

  /**
   * ⚡ 实时求解触发器
   */
  const triggerRealTimeSolve = useCallback(() => {
    if (solveTimeoutRef.current) {
      clearTimeout(solveTimeoutRef.current);
    }
    
    solveTimeoutRef.current = setTimeout(async () => {
      if (parameters.size > 0 && constraints.size > 0) {
        setIsSolving(true);
        try {
          const result = await solver.solve();
          setLastSolutionResult(result);
          setSolutionHistory(prev => [...prev, result].slice(-10)); // 保留最近10次结果
        } catch (error) {
          console.error('求解失败:', error);
        } finally {
          setIsSolving(false);
        }
      }
    }, 300); // 300ms防抖
  }, [solver, parameters.size, constraints.size]);

  /**
   * 📝 更新参数值
   */
  const updateParameterValue = useCallback((paramId: string, newValue: number) => {
    const param = parameters.get(paramId);
    if (!param) return;
    
    // 边界检查
    const clampedValue = Math.max(param.bounds.min, Math.min(param.bounds.max, newValue));
    
    const updatedParam = { ...param, value: clampedValue };
    const updatedParams = new Map(parameters);
    updatedParams.set(paramId, updatedParam);
    setParameters(updatedParams);
    
    // 更新求解器中的参数
    solver.addParameter(updatedParam);
    
    if (config.enableRealTimeUpdate) {
      triggerRealTimeSolve();
    }
  }, [parameters, solver, config.enableRealTimeUpdate, triggerRealTimeSolve]);

  /**
   * 🎨 参数类型图标
   */
  const getParameterIcon = (type: GeometricParameter['type']): string => {
    switch (type) {
      case 'length': return '📏';
      case 'angle': return '📐';
      case 'coordinate': return '📍';
      case 'radius': return '⭕';
      case 'ratio': return '⚖️';
      default: return '🔧';
    }
  };

  /**
   * 🎯 约束类型图标
   */
  const getConstraintIcon = (type: ParametricConstraint['type']): string => {
    switch (type) {
      case 'equality': return '=';
      case 'inequality': return '≠';
      case 'geometric': return '📐';
      case 'engineering': return '⚙️';
      default: return '🔗';
    }
  };

  /**
   * 🌈 优先级颜色
   */
  const getPriorityColor = (priority: ParametricConstraint['priority']): string => {
    switch (priority) {
      case 'critical': return 'text-red-400 border-red-500';
      case 'high': return 'text-orange-400 border-orange-500';
      case 'medium': return 'text-yellow-400 border-yellow-500';
      case 'low': return 'text-green-400 border-green-500';
      default: return 'text-gray-400 border-gray-500';
    }
  };

  // 初始化示例数据
  useEffect(() => {
    // 添加一些示例参数
    const exampleParams: GeometricParameter[] = [
      {
        id: 'length_1',
        name: '基坑长度',
        type: 'length',
        value: 50.0,
        unit: 'm',
        bounds: { min: 10, max: 100 },
        precision: 1,
        description: '基坑开挖的长度尺寸'
      },
      {
        id: 'width_1',
        name: '基坑宽度',
        type: 'length',
        value: 30.0,
        unit: 'm',
        bounds: { min: 10, max: 80 },
        precision: 1,
        description: '基坑开挖的宽度尺寸'
      },
      {
        id: 'depth_1',
        name: '开挖深度',
        type: 'length',
        value: 15.0,
        unit: 'm',
        bounds: { min: 5, max: 25 },
        precision: 1,
        description: '基坑开挖深度'
      },
      {
        id: 'slope_angle',
        name: '边坡角度',
        type: 'angle',
        value: 75.0,
        unit: '°',
        bounds: { min: 45, max: 90 },
        precision: 1,
        description: '基坑边坡角度'
      }
    ];

    const paramMap = new Map();
    exampleParams.forEach(param => {
      paramMap.set(param.id, param);
      solver.addParameter(param);
    });
    setParameters(paramMap);

    // 添加示例约束
    const exampleConstraints: ParametricConstraint[] = [
      {
        id: 'aspect_ratio',
        name: '长宽比约束',
        type: 'inequality',
        parameters: ['length_1', 'width_1'],
        relationship: 'length_1 / width_1 <= 3.0',
        tolerance: 0.1,
        priority: 'high',
        description: '确保基坑长宽比不超过3:1'
      },
      {
        id: 'stability_constraint',
        name: '稳定性约束',
        type: 'engineering',
        parameters: ['depth_1', 'slope_angle'],
        relationship: 'depth_1 * tan(slope_angle) <= 20',
        tolerance: 0.5,
        priority: 'critical',
        description: '确保边坡稳定性'
      }
    ];

    const constraintMap = new Map();
    exampleConstraints.forEach(constraint => {
      constraintMap.set(constraint.id, constraint);
      solver.addConstraint(constraint);
    });
    setConstraints(constraintMap);

    // 初始化参数组
    setParameterGroups([
      {
        id: 'geometry',
        name: '🏗️ 几何尺寸',
        description: '基坑的基本几何参数',
        parameters: ['length_1', 'width_1', 'depth_1'],
        collapsed: false,
        color: 'blue'
      },
      {
        id: 'engineering',
        name: '⚙️ 工程参数',
        description: '工程设计相关参数',
        parameters: ['slope_angle'],
        collapsed: false,
        color: 'green'
      }
    ]);

  }, [solver]);

  return (
    <div className="w-full h-screen bg-gray-900 text-white flex flex-col">
      {/* 头部工具栏 */}
      <div className="h-16 bg-gradient-to-r from-indigo-800 to-purple-800 border-b border-indigo-500/30 flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="text-2xl">🎛️</div>
          <div>
            <h1 className="text-xl font-bold">智能参数化编辑器</h1>
            <p className="text-sm text-indigo-200">2号几何专家 | 实时约束求解</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* 求解状态 */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${issolving ? 'bg-yellow-400 animate-pulse' : lastSolutionResult?.status === 'solved' ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-sm">
              {issolving ? '求解中...' : lastSolutionResult?.status === 'solved' ? '已收敛' : '未收敛'}
            </span>
          </div>

          {/* 配置选项 */}
          <button
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm transition-colors"
          >
            ⚙️ 设置
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex">
        {/* 左侧：参数/约束列表 */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          {/* 标签页 */}
          <div className="flex border-b border-gray-700">
            {(['parameters', 'constraints', 'results'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white border-b-2 border-indigo-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {tab === 'parameters' ? '📐 参数' : tab === 'constraints' ? '🔗 约束' : '📊 结果'}
              </button>
            ))}
          </div>

          {/* 内容区 */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'parameters' && (
              <div className="space-y-4">
                {/* 添加参数按钮 */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => addParameter('length')}
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                  >
                    + 长度
                  </button>
                  <button
                    onClick={() => addParameter('angle')}
                    className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                  >
                    + 角度
                  </button>
                </div>

                {/* 参数组 */}
                {parameterGroups.map(group => (
                  <div key={group.id} className="bg-gray-700/50 rounded-lg overflow-hidden">
                    <div className="p-3 border-b border-gray-600">
                      <h3 className="font-medium text-sm">{group.name}</h3>
                      <p className="text-xs text-gray-400 mt-1">{group.description}</p>
                    </div>
                    <div className="p-2 space-y-2">
                      {group.parameters.map(paramId => {
                        const param = parameters.get(paramId);
                        if (!param) return null;
                        
                        return (
                          <div
                            key={paramId}
                            className={`p-3 rounded bg-gray-800 border transition-colors cursor-pointer ${
                              selectedParameter === paramId ? 'border-indigo-500' : 'border-gray-600 hover:border-gray-500'
                            }`}
                            onClick={() => setSelectedParameter(paramId)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">{getParameterIcon(param.type)}</span>
                                <span className="font-medium text-sm">{param.name}</span>
                              </div>
                              <span className="text-xs text-gray-400">{param.unit}</span>
                            </div>
                            
                            <div className="space-y-2">
                              <input
                                type="number"
                                value={param.value}
                                min={param.bounds.min}
                                max={param.bounds.max}
                                step={Math.pow(10, -param.precision)}
                                onChange={(e) => updateParameterValue(paramId, parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm focus:border-indigo-500 focus:outline-none"
                              />
                              
                              <div className="flex text-xs text-gray-400 justify-between">
                                <span>min: {param.bounds.min}</span>
                                <span>max: {param.bounds.max}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'constraints' && (
              <div className="space-y-4">
                {/* 添加约束按钮 */}
                <button
                  onClick={() => addConstraint('equality')}
                  className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
                >
                  + 添加约束
                </button>

                {/* 约束列表 */}
                {Array.from(constraints.values()).map(constraint => (
                  <div
                    key={constraint.id}
                    className={`p-3 rounded bg-gray-700 border transition-colors cursor-pointer ${
                      selectedConstraint === constraint.id ? 'border-purple-500' : 'border-gray-600 hover:border-gray-500'
                    }`}
                    onClick={() => setSelectedConstraint(constraint.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getConstraintIcon(constraint.type)}</span>
                        <span className="font-medium text-sm">{constraint.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(constraint.priority)}`}>
                        {constraint.priority}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-400 mb-2">
                      {constraint.relationship}
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      参数: {constraint.parameters.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'results' && (
              <div className="space-y-4">
                {lastSolutionResult ? (
                  <div className="space-y-3">
                    {/* 求解状态 */}
                    <div className={`p-3 rounded border ${
                      lastSolutionResult.status === 'solved' ? 'bg-green-500/20 border-green-500' :
                      lastSolutionResult.status === 'partial' ? 'bg-yellow-500/20 border-yellow-500' :
                      'bg-red-500/20 border-red-500'
                    }`}>
                      <div className="font-medium text-sm">
                        状态: {lastSolutionResult.status === 'solved' ? '✅ 已求解' : 
                              lastSolutionResult.status === 'partial' ? '⚠️ 部分求解' : '❌ 求解失败'}
                      </div>
                    </div>

                    {/* 性能指标 */}
                    <div className="bg-gray-700/50 rounded p-3">
                      <h4 className="font-medium text-sm mb-2">📊 性能指标</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">迭代次数:</span>
                          <span>{lastSolutionResult.performance.iterationCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">收敛时间:</span>
                          <span>{lastSolutionResult.performance.convergenceTime}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">最大误差:</span>
                          <span>{lastSolutionResult.performance.maxError.toExponential(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* 约束满足情况 */}
                    <div className="bg-gray-700/50 rounded p-3">
                      <h4 className="font-medium text-sm mb-2">🎯 约束满足情况</h4>
                      <div className="space-y-1">
                        {Array.from(lastSolutionResult.constraintSatisfaction.entries()).map(([constraintId, satisfaction]) => {
                          const constraint = constraints.get(constraintId);
                          return (
                            <div key={constraintId} className="flex items-center justify-between text-xs">
                              <span className="text-gray-400 truncate">{constraint?.name || constraintId}</span>
                              <span className={satisfaction.satisfied ? 'text-green-400' : 'text-red-400'}>
                                {satisfaction.satisfied ? '✅' : '❌'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 优化建议 */}
                    {lastSolutionResult.recommendations.conflictingConstraints?.length > 0 && (
                      <div className="bg-orange-500/20 border border-orange-500 rounded p-3">
                        <h4 className="font-medium text-sm mb-2">💡 优化建议</h4>
                        <div className="space-y-1 text-xs">
                          {lastSolutionResult.recommendations.relaxationSuggestions?.slice(0, 3).map((suggestion: any, index: number) => (
                            <div key={index} className="text-orange-300">
                              • {suggestion.reason}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-sm">暂无求解结果</p>
                    <p className="text-xs mt-1">添加参数和约束后自动求解</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：3D可视化区域（预留） */}
        <div className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center relative">
          <div className="text-center">
            <div className="text-6xl mb-4">🏗️</div>
            <h2 className="text-2xl font-bold text-indigo-400 mb-2">3D几何可视化</h2>
            <p className="text-gray-400 mb-4">实时几何预览区域</p>
            <div className="text-sm text-gray-500">
              将与3号的高性能渲染系统集成
            </div>
          </div>

          {/* 状态指示器 */}
          <div className="absolute top-4 right-4 bg-gray-800/90 rounded-lg p-4 min-w-48">
            <h3 className="font-semibold text-sm mb-3 text-indigo-400">🔄 实时状态</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">参数数量:</span>
                <span className="text-white">{parameters.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">约束数量:</span>
                <span className="text-white">{constraints.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">求解状态:</span>
                <span className={issolving ? 'text-yellow-400' : lastSolutionResult?.status === 'solved' ? 'text-green-400' : 'text-red-400'}>
                  {issolving ? '计算中' : lastSolutionResult?.status === 'solved' ? '已收敛' : '待求解'}
                </span>
              </div>
              {lastSolutionResult && (
                <div className="flex justify-between">
                  <span className="text-gray-400">求解时间:</span>
                  <span className="text-cyan-400">{lastSolutionResult.performance.convergenceTime}ms</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 高级配置面板 */}
      {showAdvancedOptions && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">⚙️ 编辑器配置</h3>
              <button
                onClick={() => setShowAdvancedOptions(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={config.enableRealTimeUpdate}
                  onChange={(e) => setConfig(prev => ({ ...prev, enableRealTimeUpdate: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span className="text-sm">启用实时更新</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={config.showConstraintVisualization}
                  onChange={(e) => setConfig(prev => ({ ...prev, showConstraintVisualization: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span className="text-sm">显示约束可视化</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={config.enableSmartSuggestions}
                  onChange={(e) => setConfig(prev => ({ ...prev, enableSmartSuggestions: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span className="text-sm">启用智能建议</span>
              </label>
              
              <div>
                <label className="block text-sm mb-1">数值精度</label>
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={config.precision}
                  onChange={(e) => setConfig(prev => ({ ...prev, precision: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-400 mt-1">当前: {config.precision} 位小数</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParametricEditor;