/**
 * 项目分析面板组件
 * 提供综合的深基坑项目分析和管理功能
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FunctionalIcons } from '../icons/FunctionalIconsQuickFix';
import { StatusIcons } from '../icons/StatusIcons';

interface ProjectData {
  id: string;
  name: string;
  location: string;
  depth: number;
  area: number;
  status: 'planning' | 'designing' | 'analyzing' | 'completed';
  progress: number;
  lastModified: Date;
  riskLevel: 'low' | 'medium' | 'high';
  
  // 工程参数
  parameters: {
    excavationDepth: number;
    excavationArea: number;
    soilType: string;
    groundwaterLevel: number;
    supportType: string;
  };
  
  // 分析结果
  results?: {
    maxDeformation: number;
    safetyFactor: number;
    estimatedCost: number;
    constructionTime: number;
  };
}

interface ProjectAnalysisPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const ProjectAnalysisPanel: React.FC<ProjectAnalysisPanelProps> = ({ isVisible, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'reports'>('overview');
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // 模拟项目数据
  useEffect(() => {
    if (isVisible) {
      setProjects([
        {
          id: 'proj-001',
          name: '上海中心深基坑工程',
          location: '上海市浦东新区',
          depth: 18.5,
          area: 2500,
          status: 'analyzing',
          progress: 75,
          lastModified: new Date('2024-01-20T10:30:00'),
          riskLevel: 'medium',
          parameters: {
            excavationDepth: 18.5,
            excavationArea: 2500,
            soilType: '软土',
            groundwaterLevel: 3.2,
            supportType: '地下连续墙+内支撑'
          },
          results: {
            maxDeformation: 28.6,
            safetyFactor: 1.35,
            estimatedCost: 12500000,
            constructionTime: 180
          }
        },
        {
          id: 'proj-002',
          name: '北京地铁车站基坑',
          location: '北京市朝阳区',
          depth: 15.2,
          area: 1800,
          status: 'designing',
          progress: 45,
          lastModified: new Date('2024-01-19T14:15:00'),
          riskLevel: 'high',
          parameters: {
            excavationDepth: 15.2,
            excavationArea: 1800,
            soilType: '粘性土',
            groundwaterLevel: 4.5,
            supportType: '钻孔灌注桩+预应力锚杆'
          }
        },
        {
          id: 'proj-003',
          name: '深圳商业中心基坑',
          location: '深圳市南山区',
          depth: 12.0,
          area: 3200,
          status: 'completed',
          progress: 100,
          lastModified: new Date('2024-01-15T09:45:00'),
          riskLevel: 'low',
          parameters: {
            excavationDepth: 12.0,
            excavationArea: 3200,
            soilType: '砂土',
            groundwaterLevel: 8.0,
            supportType: '排桩+土钉墙'
          },
          results: {
            maxDeformation: 15.2,
            safetyFactor: 1.52,
            estimatedCost: 8900000,
            constructionTime: 120
          }
        }
      ]);
    }
  }, [isVisible]);

  // 状态颜色映射
  const getStatusColor = (status: ProjectData['status']) => {
    switch (status) {
      case 'planning': return '#f59e0b';
      case 'designing': return '#3b82f6';
      case 'analyzing': return '#8b5cf6';
      case 'completed': return '#10b981';
      default: return '#64748b';
    }
  };

  const getRiskColor = (risk: ProjectData['riskLevel']) => {
    switch (risk) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusLabel = (status: ProjectData['status']) => {
    switch (status) {
      case 'planning': return '规划中';
      case 'designing': return '设计中';
      case 'analyzing': return '分析中';
      case 'completed': return '已完成';
      default: return '未知';
    }
  };

  const getRiskLabel = (risk: ProjectData['riskLevel']) => {
    switch (risk) {
      case 'low': return '低风险';
      case 'medium': return '中等风险';
      case 'high': return '高风险';
      default: return '未评估';
    }
  };

  // 创建新项目
  const handleCreateProject = () => {
    const newProject: ProjectData = {
      id: `proj-${Date.now()}`,
      name: '新建深基坑项目',
      location: '待定位置',
      depth: 10.0,
      area: 1000,
      status: 'planning',
      progress: 0,
      lastModified: new Date(),
      riskLevel: 'medium',
      parameters: {
        excavationDepth: 10.0,
        excavationArea: 1000,
        soilType: '待确定',
        groundwaterLevel: 5.0,
        supportType: '待设计'
      }
    };
    
    setProjects([newProject, ...projects]);
    setSelectedProject(newProject);
    setIsCreatingProject(false);
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
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">PA</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">项目分析管理</h2>
                <p className="text-sm text-gray-600">深基坑工程项目综合分析与管理</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCreateProject}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                新建项目
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <span className="text-gray-600">×</span>
              </button>
            </div>
          </div>

          {/* 标签页 */}
          <div className="flex border-b border-gray-200">
            {[
              { key: 'overview', label: '项目概览', icon: '📊' },
              { key: 'analysis', label: '分析结果', icon: '🔬' },
              { key: 'reports', label: '报告导出', icon: '📋' }
            ].map((tab) => (
              <button
                key={tab.key}
                className={`flex items-center space-x-2 px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab(tab.key as any)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* 左侧项目列表 */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-2">项目列表</h3>
                <input
                  type="text"
                  placeholder="搜索项目..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                      selectedProject?.id === project.id
                        ? 'bg-blue-50 border-l-4 border-l-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedProject(project)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-800 text-sm">{project.name}</h4>
                      <div className="flex items-center space-x-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getStatusColor(project.status) }}
                        />
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getRiskColor(project.riskLevel) }}
                        />
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-2">{project.location}</p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>深度: {project.depth}m</span>
                      <span>面积: {project.area}m²</span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        {project.lastModified.toLocaleDateString('zh-CN')}
                      </span>
                      <span className="text-blue-600 font-medium">
                        {project.progress}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 右侧详情 */}
            <div className="flex-1 flex flex-col">
              {selectedProject ? (
                <div className="flex-1 overflow-y-auto p-6">
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      {/* 项目基本信息 */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">项目信息</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">项目名称</label>
                            <p className="text-gray-900">{selectedProject.name}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">项目位置</label>
                            <p className="text-gray-900">{selectedProject.location}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">项目状态</label>
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: getStatusColor(selectedProject.status) }}
                              />
                              <span>{getStatusLabel(selectedProject.status)}</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">风险等级</label>
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: getRiskColor(selectedProject.riskLevel) }}
                              />
                              <span>{getRiskLabel(selectedProject.riskLevel)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 工程参数 */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">工程参数</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <FunctionalIcons.ExcavationDesign size={24} color="#3b82f6" />
                            <p className="text-sm font-medium text-gray-700 mt-2">开挖深度</p>
                            <p className="text-xl font-bold text-blue-600">{selectedProject.parameters.excavationDepth}m</p>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <FunctionalIcons.MaterialProperties size={24} color="#10b981" />
                            <p className="text-sm font-medium text-gray-700 mt-2">开挖面积</p>
                            <p className="text-xl font-bold text-green-600">{selectedProject.parameters.excavationArea}m²</p>
                          </div>
                          <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <FunctionalIcons.GeologyModeling size={24} color="#8b5cf6" />
                            <p className="text-sm font-medium text-gray-700 mt-2">地下水位</p>
                            <p className="text-xl font-bold text-purple-600">{selectedProject.parameters.groundwaterLevel}m</p>
                          </div>
                        </div>
                        
                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">土层类型</label>
                            <p className="text-gray-900">{selectedProject.parameters.soilType}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">支护方案</label>
                            <p className="text-gray-900">{selectedProject.parameters.supportType}</p>
                          </div>
                        </div>
                      </div>

                      {/* 进度跟踪 */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">项目进度</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700">总体进度</span>
                            <span className="font-semibold text-blue-600">{selectedProject.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                              style={{ width: `${selectedProject.progress}%` }}
                            />
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2 text-xs text-center mt-4">
                            <div className={`p-2 rounded ${selectedProject.progress >= 25 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                              规划设计
                            </div>
                            <div className={`p-2 rounded ${selectedProject.progress >= 50 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                              参数确定
                            </div>
                            <div className={`p-2 rounded ${selectedProject.progress >= 75 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                              分析计算
                            </div>
                            <div className={`p-2 rounded ${selectedProject.progress >= 100 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                              结果验证
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'analysis' && selectedProject.results && (
                    <div className="space-y-6">
                      {/* 分析结果概览 */}
                      <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-gray-800 mb-4">安全性评估</h3>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700">最大变形</span>
                              <span className="font-semibold text-orange-600">{selectedProject.results.maxDeformation}mm</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700">安全系数</span>
                              <span className="font-semibold text-green-600">{selectedProject.results.safetyFactor}</span>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <StatusIcons.Completed size={16} color="#10b981" />
                                <span className="text-sm font-medium text-green-800">安全性符合规范要求</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-gray-800 mb-4">经济性分析</h3>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700">预估造价</span>
                              <span className="font-semibold text-blue-600">
                                ¥{(selectedProject.results.estimatedCost / 10000).toFixed(0)}万
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700">工期预计</span>
                              <span className="font-semibold text-purple-600">{selectedProject.results.constructionTime}天</span>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <StatusIcons.Processing size={16} color="#3b82f6" />
                                <span className="text-sm font-medium text-blue-800">经济性评估合理</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 详细分析图表区域 */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">分析图表</h3>
                        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <FunctionalIcons.ResultVisualization size={48} color="#64748b" />
                            <p className="mt-2">分析图表区域</p>
                            <p className="text-sm">变形云图、应力分布、稳定性分析</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'reports' && (
                    <div className="space-y-6">
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">报告生成</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
                            <FunctionalIcons.ResultVisualization size={32} color="#3b82f6" />
                            <p className="mt-2 font-medium text-gray-800">技术报告</p>
                            <p className="text-sm text-gray-600">详细的分析计算报告</p>
                          </button>
                          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
                            <FunctionalIcons.StructuralAnalysis size={32} color="#10b981" />
                            <p className="mt-2 font-medium text-gray-800">设计图纸</p>
                            <p className="text-sm text-gray-600">CAD格式的设计图纸</p>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <span className="text-2xl">📊</span>
                    </div>
                    <p>选择左侧项目查看详细信息</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProjectAnalysisPanel;