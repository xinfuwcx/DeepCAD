/**
 * CAE知识库面板组件
 * 提供专业CAE知识查询、浏览、学习功能
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  KnowledgeBaseAPI, 
  type KnowledgeEntry, 
  type KnowledgeCategory,
  initializeKnowledgeBase 
} from '../services/caeKnowledgeBase';

interface KnowledgeBasePanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const categoryLabels: Record<KnowledgeCategory, string> = {
  deep_excavation: '深基坑工程',
  soil_mechanics: '土力学',
  structural_analysis: '结构分析',
  fem_theory: '有限元理论',
  geology_modeling: '地质建模',
  seepage_analysis: '渗流分析',
  stability_analysis: '稳定性分析',
  construction_methods: '施工方法',
  monitoring_systems: '监测系统',
  safety_standards: '安全标准'
};

const difficultyLabels = {
  beginner: '入门',
  intermediate: '中级',
  advanced: '高级',
  expert: '专家'
};

const KnowledgeBasePanel: React.FC<KnowledgeBasePanelProps> = ({ isVisible, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | 'all'>('all');
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // 初始化知识库
  useEffect(() => {
    if (isVisible && !initialized) {
      initializeKnowledgeBase().then(() => {
        setInitialized(true);
        searchKnowledge();
      });
    }
  }, [isVisible, initialized]);

  // 搜索知识
  const searchKnowledge = async () => {
    setLoading(true);
    try {
      let results: KnowledgeEntry[] = [];
      
      if (searchQuery.trim()) {
        results = await KnowledgeBaseAPI.searchKnowledge(searchQuery);
      } else if (selectedCategory !== 'all') {
        results = await KnowledgeBaseAPI.getKnowledgeByCategory(selectedCategory);
      } else {
        // 获取所有分类的知识
        const allCategories = Object.keys(categoryLabels) as KnowledgeCategory[];
        const allResults = await Promise.all(
          allCategories.map(cat => KnowledgeBaseAPI.getKnowledgeByCategory(cat))
        );
        results = allResults.flat();
      }
      
      setKnowledgeEntries(results);
    } catch (error) {
      console.error('搜索知识时出错:', error);
    } finally {
      setLoading(false);
    }
  };

  // 搜索输入变化
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (initialized) {
        searchKnowledge();
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory, initialized]);

  // 渲染公式
  const renderFormula = (formula: { name: string; latex: string; description: string; variables: { [key: string]: string } }) => (
    <div key={formula.name} className="bg-gray-50 p-4 rounded-lg mb-4">
      <h4 className="font-semibold text-gray-800 mb-2">{formula.name}</h4>
      <div className="bg-white p-3 rounded border mb-2 font-mono text-center">
        {formula.latex}
      </div>
      <p className="text-sm text-gray-600 mb-2">{formula.description}</p>
      <div className="text-xs text-gray-500">
        <strong>变量说明:</strong>
        <ul className="ml-4 mt-1">
          {Object.entries(formula.variables).map(([symbol, meaning]) => (
            <li key={symbol}>{symbol}: {meaning}</li>
          ))}
        </ul>
      </div>
    </div>
  );

  // 渲染参数
  const renderParameters = (parameters: { [key: string]: any }) => (
    <div className="bg-blue-50 p-4 rounded-lg mb-4">
      <h4 className="font-semibold text-blue-800 mb-3">关键参数</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(parameters).map(([key, param]) => (
          <div key={key} className="bg-white p-3 rounded border">
            <div className="font-medium text-gray-800">{key}</div>
            <div className="text-lg font-bold text-blue-600">
              {param.value} {param.unit}
            </div>
            <div className="text-sm text-gray-600">{param.description}</div>
            {param.validRange && (
              <div className="text-xs text-gray-500 mt-1">
                有效范围: {param.validRange[0]} - {param.validRange[1]} {param.unit}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // 渲染案例研究
  const renderCaseStudies = (caseStudies: any[]) => (
    <div className="bg-green-50 p-4 rounded-lg mb-4">
      <h4 className="font-semibold text-green-800 mb-3">工程案例</h4>
      {caseStudies.map((caseStudy, index) => (
        <div key={index} className="bg-white p-4 rounded border mb-3">
          <h5 className="font-semibold text-gray-800">{caseStudy.projectName}</h5>
          <p className="text-sm text-gray-600 mb-2">地点: {caseStudy.location}</p>
          
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <h6 className="font-medium text-gray-700 mb-1">设计参数</h6>
              <div className="text-sm text-gray-600">
                {Object.entries(caseStudy.parameters).map(([key, value]) => (
                  <div key={key}>{key}: {String(value)}</div>
                ))}
              </div>
            </div>
            <div>
              <h6 className="font-medium text-gray-700 mb-1">分析结果</h6>
              <div className="text-sm text-gray-600">
                {Object.entries(caseStudy.results).map(([key, value]) => (
                  <div key={key}>{key}: {String(value)}</div>
                ))}
              </div>
            </div>
          </div>
          
          <div>
            <h6 className="font-medium text-gray-700 mb-1">经验总结</h6>
            <ul className="text-sm text-gray-600 ml-4">
              {caseStudy.lessons.map((lesson: string, i: number) => (
                <li key={i} className="list-disc">{lesson}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );

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
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">KB</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">CAE专业知识库</h2>
                <p className="text-sm text-gray-600">深基坑工程专业知识查询与学习</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <span className="text-gray-600">×</span>
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* 左侧搜索和列表 */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
              {/* 搜索栏 */}
              <div className="p-4 border-b border-gray-100">
                <input
                  type="text"
                  placeholder="搜索知识条目..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* 分类筛选 */}
              <div className="p-4 border-b border-gray-100">
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as KnowledgeCategory | 'all')}
                >
                  <option value="all">所有分类</option>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* 知识条目列表 */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <span className="ml-2 text-gray-600">搜索中...</span>
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {knowledgeEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedEntry?.id === entry.id
                            ? 'bg-blue-50 border-2 border-blue-200'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <h3 className="font-medium text-gray-800 mb-1">{entry.title}</h3>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            {categoryLabels[entry.category]}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            {difficultyLabels[entry.difficulty]}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {entry.content.substring(0, 100)}...
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 右侧详情 */}
            <div className="flex-1 flex flex-col">
              {selectedEntry ? (
                <div className="flex-1 overflow-y-auto p-6">
                  {/* 条目头部 */}
                  <div className="mb-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {categoryLabels[selectedEntry.category]}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                        {difficultyLabels[selectedEntry.difficulty]}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedEntry.title}</h2>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedEntry.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 内容 */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">内容描述</h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {selectedEntry.content}
                    </p>
                  </div>

                  {/* 参数 */}
                  {selectedEntry.parameters && renderParameters(selectedEntry.parameters)}

                  {/* 公式 */}
                  {selectedEntry.formulas && selectedEntry.formulas.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">相关公式</h3>
                      {selectedEntry.formulas.map(renderFormula)}
                    </div>
                  )}

                  {/* 案例研究 */}
                  {selectedEntry.caseStudies && selectedEntry.caseStudies.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">工程案例</h3>
                      {renderCaseStudies(selectedEntry.caseStudies)}
                    </div>
                  )}

                  {/* 更新时间 */}
                  <div className="text-sm text-gray-500 mt-8 pt-4 border-t border-gray-200">
                    最后更新: {selectedEntry.lastUpdated.toLocaleDateString('zh-CN')}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <span className="text-2xl">📚</span>
                    </div>
                    <p>选择左侧知识条目查看详细内容</p>
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

export default KnowledgeBasePanel;