/**
 * 专家模块切换器
 * 0号架构师 - 基于正确架构理解的专家切换界面
 * 1号: Epic控制中心 | 2号: 几何建模(支护结构系统) | 3号: 计算分析
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FunctionalIcons } from './icons/FunctionalIconsQuickFix';

interface ExpertStatus {
  health: 'healthy' | 'warning' | 'error';
  load: number; // 0-1
  memoryUsage: number; // MB
  processingTasks: number;
  lastUpdate: Date;
  currentTask?: string;
}

interface ExpertInfo {
  id: 1 | 2 | 3;
  name: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  capabilities: string[];
  status: ExpertStatus;
  dataReady: boolean;
}

interface ExpertModuleSwitcherProps {
  activeExpert: 1 | 2 | 3;
  onSwitch: (expertId: 1 | 2 | 3) => void;
  onQuickAction?: (expertId: 1 | 2 | 3, action: string) => void;
  switchingAnimation?: 'slide' | 'fade' | 'zoom' | 'epic_flight';
  showStatusDetails?: boolean;
}

const ExpertModuleSwitcher: React.FC<ExpertModuleSwitcherProps> = ({
  activeExpert,
  onSwitch,
  onQuickAction,
  switchingAnimation = 'slide',
  showStatusDetails = true
}) => {
  const [hoveredExpert, setHoveredExpert] = useState<number | null>(null);
  const [switchingInProgress, setSwitchingInProgress] = useState(false);

  // 专家信息配置 - 基于正确的系统架构
  const experts: ExpertInfo[] = [
    {
      id: 1,
      name: '1号专家',
      title: 'Epic控制中心',
      description: '项目地理可视化 · 天气系统 · 3D导航',
      icon: FunctionalIcons.GISMapping,
      color: '#00d9ff',
      capabilities: [
        'Epic飞行控制系统',
        'geo-three地理可视化',
        '实时天气集成',
        '项目3D导航',
        '粒子效果系统'
      ],
      status: {
        health: 'healthy',
        load: 0.3,
        memoryUsage: 245,
        processingTasks: 2,
        lastUpdate: new Date(),
        currentTask: 'Epic项目可视化'
      },
      dataReady: true
    },
    {
      id: 2,
      name: '2号专家', 
      title: '几何建模',
      description: '地质建模 · 支护结构系统 · 桩基工程',
      icon: FunctionalIcons.GeometryModeling,
      color: '#52c41a',
      capabilities: [
        '智能地质建模',
        '支护结构设计',
        '桩基建模(梁元/壳元)',
        '地下连续墙',
        '锚索钢支撑系统'
      ],
      status: {
        health: 'healthy',
        load: 0.6,
        memoryUsage: 512,
        processingTasks: 4,
        lastUpdate: new Date(),
        currentTask: '支护结构优化'
      },
      dataReady: true
    },
    {
      id: 3,
      name: '3号专家',
      title: '计算分析',
      description: '有限元计算 · 网格分析 · 物理AI',
      icon: FunctionalIcons.StructuralAnalysis,
      color: '#ef4444',
      capabilities: [
        '深基坑CAE计算',
        '网格质量分析',
        'PINN物理神经网络',
        'DeepONet算子学习',
        'GPU可视化渲染'
      ],
      status: {
        health: 'healthy',
        load: 0.8,
        memoryUsage: 1024,
        processingTasks: 6,
        lastUpdate: new Date(),
        currentTask: '有限元计算'
      },
      dataReady: true
    }
  ];

  // 处理专家切换
  const handleExpertSwitch = async (expertId: 1 | 2 | 3) => {
    if (switchingInProgress || expertId === activeExpert) return;

    setSwitchingInProgress(true);
    
    // 切换动画延迟
    const animationDelay = switchingAnimation === 'epic_flight' ? 800 : 300;
    
    setTimeout(() => {
      onSwitch(expertId);
      setSwitchingInProgress(false);
    }, animationDelay);
  };

  // 快速操作处理
  const handleQuickAction = (expertId: 1 | 2 | 3, action: string) => {
    onQuickAction?.(expertId, action);
  };

  // 获取状态颜色
  const getStatusColor = (status: ExpertStatus) => {
    switch (status.health) {
      case 'healthy': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // 专家卡片组件
  const ExpertCard: React.FC<{ expert: ExpertInfo }> = ({ expert }) => {
    const isActive = activeExpert === expert.id;
    const isHovered = hoveredExpert === expert.id;

    return (
      <motion.div
        className={`expert-card relative cursor-pointer transition-all duration-300 ${
          isActive 
            ? 'ring-2 ring-blue-500 shadow-2xl scale-105' 
            : 'hover:shadow-xl hover:scale-102'
        }`}
        style={{
          background: `linear-gradient(135deg, ${expert.color}15, ${expert.color}05)`,
          borderColor: isActive ? expert.color : `${expert.color}40`
        }}
        onMouseEnter={() => setHoveredExpert(expert.id)}
        onMouseLeave={() => setHoveredExpert(null)}
        onClick={() => handleExpertSwitch(expert.id)}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="p-6 rounded-xl border backdrop-blur-sm">
          {/* 专家头部信息 */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${expert.color}20` }}
              >
                <expert.icon size={24} color={expert.color} />
              </div>
              <div>
                <h3 className="font-bold text-white">{expert.name}</h3>
                <p className="text-sm text-gray-300">{expert.title}</p>
              </div>
            </div>
            
            {/* 状态指示器 */}
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getStatusColor(expert.status) }}
              />
              {isActive && (
                <motion.div
                  className="w-2 h-2 bg-blue-500 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              )}
            </div>
          </div>

          {/* 专家描述 */}
          <p className="text-sm text-gray-400 mb-4">{expert.description}</p>

          {/* 能力标签 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {expert.capabilities.slice(0, 3).map((capability, index) => (
              <span 
                key={index}
                className="px-2 py-1 text-xs rounded-full bg-gray-800/50 text-gray-300"
              >
                {capability}
              </span>
            ))}
            {expert.capabilities.length > 3 && (
              <span className="px-2 py-1 text-xs rounded-full bg-gray-800/50 text-gray-400">
                +{expert.capabilities.length - 3} 更多
              </span>
            )}
          </div>

          {/* 状态详情 */}
          {showStatusDetails && (isActive || isHovered) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-gray-700/50"
            >
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>系统负载:</span>
                  <span>{Math.round(expert.status.load * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>内存使用:</span>
                  <span>{expert.status.memoryUsage}MB</span>
                </div>
                <div className="flex justify-between">
                  <span>处理任务:</span>
                  <span>{expert.status.processingTasks}个</span>
                </div>
                {expert.status.currentTask && (
                  <div className="flex justify-between">
                    <span>当前任务:</span>
                    <span className="text-blue-400">{expert.status.currentTask}</span>
                  </div>
                )}
              </div>

              {/* 快速操作按钮 */}
              <div className="flex space-x-2 mt-3">
                <button
                  className="px-3 py-1 text-xs bg-gray-700/50 hover:bg-gray-600/50 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickAction(expert.id, 'status');
                  }}
                >
                  状态详情
                </button>
                <button
                  className="px-3 py-1 text-xs bg-gray-700/50 hover:bg-gray-600/50 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickAction(expert.id, 'settings');
                  }}
                >
                  设置
                </button>
              </div>
            </motion.div>
          )}

          {/* 切换中状态 */}
          {switchingInProgress && activeExpert === expert.id && (
            <motion.div
              className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-white text-sm">切换中...</div>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="expert-module-switcher">
      {/* 切换器标题 */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">专家协作系统</h2>
        <p className="text-gray-400 text-sm">
          选择专家模块进行深基坑工程设计与分析
        </p>
      </div>

      {/* 专家卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {experts.map((expert) => (
          <ExpertCard key={expert.id} expert={expert} />
        ))}
      </div>

      {/* 系统协作状态指示 */}
      <div className="mt-6 p-4 bg-gray-900/50 rounded-lg backdrop-blur-sm">
        <h3 className="text-sm font-medium text-gray-300 mb-3">专家协作状态</h3>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>1号→2号 Epic项目传递</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>2号→3号 几何网格协作</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>3号→1号 结果可视化</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpertModuleSwitcher;