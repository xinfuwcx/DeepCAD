/**
 * 集成导航系统
 * 0号架构师 - 统一界面导航管理
 * 欢迎界面 ↔ 统一工作空间 ↔ 专家模块导航
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FunctionalIcons } from './icons/FunctionalIconsQuickFix';

interface NavigationState {
  currentView: 'welcome' | 'workspace' | 'expert_focus';
  currentExpert?: 1 | 2 | 3;
  breadcrumb: BreadcrumbItem[];
  history: NavigationHistoryItem[];
}

interface BreadcrumbItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ComponentType<any>;
}

interface NavigationHistoryItem {
  timestamp: Date;
  view: string;
  expert?: number;
  context?: any;
}

interface QuickAccessItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  action: () => void;
  hotkey?: string;
  category: 'expert' | 'tool' | 'view';
}

interface IntegratedNavigationSystemProps {
  currentView: 'welcome' | 'workspace' | 'expert_focus';
  currentExpert?: 1 | 2 | 3;
  onNavigate: (view: string, expert?: number) => void;
  onQuickAccess?: (actionId: string) => void;
  showBreadcrumb?: boolean;
  showQuickAccess?: boolean;
}

const IntegratedNavigationSystem: React.FC<IntegratedNavigationSystemProps> = ({
  currentView,
  currentExpert,
  onNavigate,
  onQuickAccess,
  showBreadcrumb = true,
  showQuickAccess = true
}) => {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentView,
    currentExpert,
    breadcrumb: [],
    history: []
  });

  const [quickAccessVisible, setQuickAccessVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 更新导航状态
  useEffect(() => {
    const newBreadcrumb = generateBreadcrumb(currentView, currentExpert);
    const historyItem: NavigationHistoryItem = {
      timestamp: new Date(),
      view: currentView,
      expert: currentExpert,
      context: {}
    };

    setNavigationState(prev => ({
      currentView,
      currentExpert,
      breadcrumb: newBreadcrumb,
      history: [...prev.history.slice(-9), historyItem] // 保留最近10个历史记录
    }));
  }, [currentView, currentExpert]);

  // 生成面包屑导航
  const generateBreadcrumb = (view: string, expert?: number): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      {
        id: 'home',
        label: 'DeepCAD',
        path: '/',
        icon: FunctionalIcons.ProjectManagement
      }
    ];

    switch (view) {
      case 'welcome':
        items.push({
          id: 'welcome',
          label: '欢迎界面',
          path: '/welcome',
          icon: FunctionalIcons.Welcome
        });
        break;
        
      case 'workspace':
        items.push({
          id: 'workspace',  
          label: '统一工作空间',
          path: '/workspace',
          icon: FunctionalIcons.Workspace
        });
        
        if (expert) {
          items.push({
            id: `expert-${expert}`,
            label: getExpertLabel(expert),
            path: `/workspace/expert-${expert}`,
            icon: getExpertIcon(expert)
          });
        }
        break;
        
      case 'expert_focus':
        items.push({
          id: 'workspace',
          label: '工作空间',
          path: '/workspace',
          icon: FunctionalIcons.Workspace
        });
        
        if (expert) {
          items.push({
            id: `expert-${expert}`,
            label: getExpertLabel(expert),
            path: `/expert-${expert}`,
            icon: getExpertIcon(expert)
          });
        }
        break;
    }

    return items;
  };

  // 获取专家标签
  const getExpertLabel = (expertId: number): string => {
    switch (expertId) {
      case 1: return '1号专家 - Epic控制';
      case 2: return '2号专家 - 几何建模';
      case 3: return '3号专家 - 计算分析';
      default: return `${expertId}号专家`;
    }
  };

  // 获取专家图标
  const getExpertIcon = (expertId: number): React.ComponentType<any> => {
    switch (expertId) {
      case 1: return FunctionalIcons.GISMapping;
      case 2: return FunctionalIcons.GeometryModeling;
      case 3: return FunctionalIcons.StructuralAnalysis;
      default: return FunctionalIcons.ProjectManagement;
    }
  };

  // 快速访问项目
  const quickAccessItems: QuickAccessItem[] = [
    // 专家切换
    {
      id: 'expert-1',
      label: '1号专家 Epic控制',
      icon: FunctionalIcons.GISMapping,
      action: () => onNavigate('workspace', 1),
      hotkey: 'Alt+1',
      category: 'expert'
    },
    {
      id: 'expert-2',
      label: '2号专家 几何建模',
      icon: FunctionalIcons.GeometryModeling,
      action: () => onNavigate('workspace', 2),
      hotkey: 'Alt+2',
      category: 'expert'
    },
    {
      id: 'expert-3',
      label: '3号专家 计算分析',
      icon: FunctionalIcons.StructuralAnalysis,
      action: () => onNavigate('workspace', 3),
      hotkey: 'Alt+3',
      category: 'expert'
    },
    
    // 视图切换
    {
      id: 'welcome',
      label: '返回欢迎界面',
      icon: FunctionalIcons.Welcome,
      action: () => onNavigate('welcome'),
      hotkey: 'Alt+H',
      category: 'view'
    },
    {
      id: 'workspace',
      label: '统一工作空间',
      icon: FunctionalIcons.Workspace,
      action: () => onNavigate('workspace'),
      hotkey: 'Alt+W',
      category: 'view'
    },
    
    // 工具快捷访问
    {
      id: 'support-structures',
      label: '支护结构系统',
      icon: FunctionalIcons.StructuralAnalysis,
      action: () => {
        onNavigate('workspace', 2);
        onQuickAccess?.('support-structures');
      },
      hotkey: 'Alt+S',
      category: 'tool'
    },
    {
      id: 'pile-modeling',
      label: '桩基建模',
      icon: FunctionalIcons.GeometryModeling,
      action: () => {
        onNavigate('workspace', 2);
        onQuickAccess?.('pile-modeling');
      },
      hotkey: 'Alt+P',
      category: 'tool'
    },
    {
      id: 'computation-control',
      label: '计算控制面板',
      icon: FunctionalIcons.StructuralAnalysis,
      action: () => {
        onNavigate('workspace', 3);
        onQuickAccess?.('computation-control');
      },
      hotkey: 'Ctrl+C',
      category: 'tool'
    }
  ];

  // 处理面包屑点击
  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    if (item.id === 'home' || item.id === 'welcome') {
      onNavigate('welcome');
    } else if (item.id === 'workspace') {
      onNavigate('workspace');
    } else if (item.id.startsWith('expert-')) {
      const expertId = parseInt(item.id.split('-')[1]);
      onNavigate('workspace', expertId);
    }
  };

  // 处理快速访问
  const handleQuickAccessClick = (item: QuickAccessItem) => {
    item.action();
    setQuickAccessVisible(false);
    onQuickAccess?.(item.id);
  };

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 快速访问热键
      if (event.ctrlKey && event.key === 'k') {
        event.preventDefault();
        setQuickAccessVisible(!quickAccessVisible);
        return;
      }

      // 专家切换热键
      if (event.altKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            onNavigate('workspace', 1);
            break;
          case '2':
            event.preventDefault();
            onNavigate('workspace', 2);
            break;
          case '3':
            event.preventDefault();
            onNavigate('workspace', 3);
            break;
          case 'h':
            event.preventDefault();
            onNavigate('welcome');
            break;
          case 'w':
            event.preventDefault();
            onNavigate('workspace');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickAccessVisible, onNavigate]);

  // 过滤快速访问项目
  const filteredQuickAccessItems = quickAccessItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="integrated-navigation-system">
      {/* 面包屑导航 */}
      {showBreadcrumb && (
        <nav className="breadcrumb-nav flex items-center space-x-2 p-4 bg-gray-900/30 backdrop-blur-sm rounded-lg mb-4">
          {navigationState.breadcrumb.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && (
                <FunctionalIcons.ArrowRight size={16} color="#6b7280" />
              )}
              <motion.button
                className={`flex items-center space-x-2 px-3 py-1 rounded-md transition-colors ${
                  index === navigationState.breadcrumb.length - 1
                    ? 'text-white bg-blue-600/20'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
                onClick={() => handleBreadcrumbClick(item)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {item.icon && <item.icon size={16} />}
                <span className="text-sm font-medium">{item.label}</span>
              </motion.button>
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* 快速访问按钮 */}
      {showQuickAccess && (
        <div className="quick-access-button fixed top-4 right-4 z-50">
          <motion.button
            className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg text-white"
            onClick={() => setQuickAccessVisible(!quickAccessVisible)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="快速访问 (Ctrl+K)"
          >
            <FunctionalIcons.Search size={20} />
          </motion.button>
        </div>
      )}

      {/* 快速访问面板 */}
      <AnimatePresence>
        {quickAccessVisible && (
          <motion.div
            className="quick-access-panel fixed inset-0 z-40 flex items-start justify-center pt-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* 背景遮罩 */}
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setQuickAccessVisible(false)}
            />

            {/* 快速访问内容 */}
            <motion.div
              className="relative w-full max-w-2xl mx-4 bg-gray-900 rounded-xl shadow-2xl border border-gray-700"
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.9 }}
            >
              {/* 搜索框 */}
              <div className="p-4 border-b border-gray-700">
                <div className="relative">
                  <FunctionalIcons.Search 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2" 
                    size={20} 
                    color="#6b7280" 
                  />
                  <input
                    type="text"
                    placeholder="搜索专家、工具或视图..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              {/* 快速访问项目列表 */}
              <div className="max-h-96 overflow-y-auto">
                {['expert', 'view', 'tool'].map(category => {
                  const categoryItems = filteredQuickAccessItems.filter(item => item.category === category);
                  if (categoryItems.length === 0) return null;

                  return (
                    <div key={category} className="p-2">
                      <h3 className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {category === 'expert' && '专家模块'}
                        {category === 'view' && '视图切换'}
                        {category === 'tool' && '工具快捷'}
                      </h3>
                      {categoryItems.map(item => (
                        <motion.button
                          key={item.id}
                          className="w-full flex items-center justify-between px-3 py-3 text-left hover:bg-gray-800 rounded-lg transition-colors"
                          onClick={() => handleQuickAccessClick(item)}
                          whileHover={{ x: 4 }}
                        >
                          <div className="flex items-center space-x-3">
                            <item.icon size={20} color="#9ca3af" />
                            <span className="text-white">{item.label}</span>
                          </div>
                          {item.hotkey && (
                            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                              {item.hotkey}
                            </span>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* 快捷键提示 */}
              <div className="p-4 border-t border-gray-700 bg-gray-800/50">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>使用键盘快捷键快速导航</span>
                  <span>按 ESC 关闭</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 历史记录指示器 */}
      <div className="navigation-history fixed bottom-4 left-4 z-30">
        <motion.div
          className="flex items-center space-x-2 p-2 bg-gray-900/50 backdrop-blur-sm rounded-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-xs text-gray-400">历史:</span>
          {navigationState.history.slice(-3).map((historyItem, index) => (
            <div 
              key={index}
              className="w-2 h-2 bg-blue-500 rounded-full opacity-50"
              title={`${historyItem.view} ${historyItem.expert ? `- ${historyItem.expert}号专家` : ''}`}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default IntegratedNavigationSystem;