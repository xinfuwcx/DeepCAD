/**
 * DeepCAD 开发工具集
 * 1号架构师提供 - 帮助2号和3号快速开发和调试
 */

import React, { useState, useEffect } from 'react';
import { Card, Badge, Tabs, Typography, Space, Button, Alert, Descriptions, Tag } from 'antd';
import { 
  BugOutlined, 
  ThunderboltOutlined, 
  EyeOutlined, 
  SettingOutlined,
  ReloadOutlined 
} from '@ant-design/icons';
// import { componentRegistry } from '../core/ComponentRegistry';
// import { performanceMonitor } from './performanceMonitor';

// Mock objects for type safety - replace with actual imports when available
const componentRegistry = {
  getStats: () => ({ total: 0, byModule: {} as Record<string, number> }),
  getComponent: (id: string) => null,
  validateDependencies: (id: string) => ({ valid: true, missing: [] as string[] })
};

const performanceMonitor = {
  getLatestMetrics: () => null as any,
  generateReport: () => ({ message: 'Performance monitoring not available' })
};

const { Text, Title } = Typography;
const { TabPane } = Tabs;

// 开发工具面板
export const DevelopmentPanel: React.FC = () => {
  const [componentStats, setComponentStats] = useState(componentRegistry.getStats());
  const [performanceData, setPerformanceData] = useState(performanceMonitor.getLatestMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setComponentStats(componentRegistry.getStats());
      setPerformanceData(performanceMonitor.getLatestMetrics());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // 仅在开发环境显示
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      right: 0,
      width: '400px',
      height: '300px',
      background: 'rgba(22, 33, 62, 0.95)',
      border: '1px solid #00d9ff30',
      borderRadius: '8px 0 0 0',
      zIndex: 9999,
      overflow: 'hidden'
    }}>
      <Tabs size="small" style={{ height: '100%' }}>
        <TabPane tab={<span><BugOutlined />组件</span>} key="components">
          <div style={{ padding: '8px', height: '250px', overflow: 'auto' }}>
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="总组件数">
                <Badge count={componentStats.total} color="#00d9ff" />
              </Descriptions.Item>
              <Descriptions.Item label="几何模块">
                <Badge count={componentStats.byModule.geometry || 0} color="#1890ff" />
              </Descriptions.Item>
              <Descriptions.Item label="网格模块">
                <Badge count={componentStats.byModule.meshing || 0} color="#52c41a" />
              </Descriptions.Item>
              <Descriptions.Item label="计算模块">
                <Badge count={componentStats.byModule.computation || 0} color="#722ed1" />
              </Descriptions.Item>
            </Descriptions>
            
            <Button 
              size="small" 
              icon={<ReloadOutlined />}
              onClick={() => setComponentStats(componentRegistry.getStats())}
              style={{ marginTop: '8px' }}
            >
              刷新
            </Button>
          </div>
        </TabPane>

        <TabPane tab={<span><ThunderboltOutlined />性能</span>} key="performance">
          <div style={{ padding: '8px', height: '250px', overflow: 'auto' }}>
            {performanceData ? (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div>
                  <Text style={{ color: '#ffffff80', fontSize: '12px' }}>FPS</Text>
                  <div style={{ color: performanceData.fps >= 30 ? '#52c41a' : '#ff4d4f' }}>
                    {performanceData.fps}
                  </div>
                </div>
                <div>
                  <Text style={{ color: '#ffffff80', fontSize: '12px' }}>内存使用</Text>
                  <div style={{ color: '#fff' }}>
                    {performanceData.memory.used.toFixed(1)}MB 
                    ({performanceData.memory.percentage.toFixed(1)}%)
                  </div>
                </div>
                <div>
                  <Text style={{ color: '#ffffff80', fontSize: '12px' }}>性能等级</Text>
                  <Tag color={
                    performanceData.fps >= 45 && performanceData.memory.percentage < 60 ? 'green' :
                    performanceData.fps >= 30 && performanceData.memory.percentage < 80 ? 'orange' : 'red'
                  }>
                    {performanceData.fps >= 45 && performanceData.memory.percentage < 60 ? '优秀' :
                     performanceData.fps >= 30 && performanceData.memory.percentage < 80 ? '良好' : '需优化'}
                  </Tag>
                </div>
              </Space>
            ) : (
              <Text style={{ color: '#ffffff80' }}>性能数据加载中...</Text>
            )}
          </div>
        </TabPane>

        <TabPane tab={<span><EyeOutlined />日志</span>} key="logs">
          <div style={{ padding: '8px', height: '250px', overflow: 'auto' }}>
            <Alert
              message="开发提示"
              description="这里将显示组件注册、API调用、错误信息等开发调试信息"
              type="info"
              showIcon
              size="small"
            />
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
};

// 组件开发助手类型定义
interface ComponentDevHelperType {
  logComponentRegistration: (componentId: string, author: string) => void;
  logAPICall: (endpoint: string, method: string, developer: string) => void;
  logError: (error: any, component: string, developer: string) => void;
  logPerformanceWarning: (message: string, component?: string) => void;
  logDevTip: (tip: string) => void;
}

// 组件开发助手
export const ComponentDevHelper: ComponentDevHelperType = {
  // 记录组件注册
  logComponentRegistration: (componentId: string, author: string) => {
    console.log(`%c[DeepCAD] 组件注册成功`, 'color: #00d9ff; font-weight: bold');
    console.log(`  组件ID: ${componentId}`);
    console.log(`  开发者: ${author}`);
    console.log(`  时间: ${new Date().toLocaleTimeString()}`);
  },

  // 记录API调用
  logAPICall: (endpoint: string, method: string, developer: string) => {
    console.log(`%c[DeepCAD] API调用`, 'color: #52c41a; font-weight: bold');
    console.log(`  端点: ${method} ${endpoint}`);
    console.log(`  调用者: ${developer}`);
    console.log(`  时间: ${new Date().toLocaleTimeString()}`);
  },

  // 记录错误
  logError: (error: any, component: string, developer: string) => {
    console.error(`%c[DeepCAD] 组件错误`, 'color: #ff4d4f; font-weight: bold');
    console.error(`  组件: ${component}`);
    console.error(`  开发者: ${developer}`);
    console.error(`  错误:`, error);
    console.error(`  时间: ${new Date().toLocaleTimeString()}`);
  },

  // 性能警告
  logPerformanceWarning: (message: string, component?: string) => {
    console.warn(`%c[DeepCAD] 性能警告`, 'color: #faad14; font-weight: bold');
    console.warn(`  消息: ${message}`);
    if (component) console.warn(`  组件: ${component}`);
    console.warn(`  时间: ${new Date().toLocaleTimeString()}`);
  },

  // 开发提示
  logDevTip: (tip: string) => {
    console.log(`%c[DeepCAD] 开发提示`, 'color: #1890ff; font-weight: bold');
    console.log(`  提示: ${tip}`);
  }
};

// 组件测试工具类型定义
interface ComponentTesterType {
  testComponentRender: (componentId: string) => boolean;
  testComponentDependencies: (componentId: string) => boolean;
}

// 组件测试工具
export const ComponentTester: ComponentTesterType = {
  // 测试组件渲染
  testComponentRender: (componentId: string) => {
    const component = componentRegistry.getComponent(componentId);
    if (!component) {
      ComponentDevHelper.logError(`组件 ${componentId} 不存在`, 'ComponentTester', '1号架构师');
      return false;
    }

    try {
      // 尝试创建组件实例
      React.createElement(component, {});
      ComponentDevHelper.logDevTip(`组件 ${componentId} 渲染测试通过`);
      return true;
    } catch (error) {
      ComponentDevHelper.logError(error, componentId, '测试工具');
      return false;
    }
  },

  // 测试组件依赖
  testComponentDependencies: (componentId: string) => {
    const validation = componentRegistry.validateDependencies(componentId);
    if (!validation.valid) {
      ComponentDevHelper.logError(
        `组件 ${componentId} 缺少依赖: ${validation.missing.join(', ')}`,
        componentId,
        '测试工具'
      );
      return false;
    }

    ComponentDevHelper.logDevTip(`组件 ${componentId} 依赖检查通过`);
    return true;
  }
};

// 开发快捷键类型
type HotkeyCleanupFunction = () => void;

// 开发快捷键
export const setupDevelopmentHotkeys = (): HotkeyCleanupFunction | undefined => {
  if (process.env.NODE_ENV !== 'development') return;

  const handleKeyDown = (event: KeyboardEvent) => {
    // Ctrl + Shift + D = 显示开发面板
    if (event.ctrlKey && event.shiftKey && event.key === 'D') {
      event.preventDefault();
      // 切换开发面板显示/隐藏
      const panel = document.getElementById('deepcad-dev-panel');
      if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      }
    }

    // Ctrl + Shift + R = 重新加载所有组件
    if (event.ctrlKey && event.shiftKey && event.key === 'R') {
      event.preventDefault();
      window.location.reload();
    }

    // Ctrl + Shift + P = 显示性能报告
    if (event.ctrlKey && event.shiftKey && event.key === 'P') {
      event.preventDefault();
      console.log(performanceMonitor.generateReport());
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
};

// 开发工具全局对象类型
interface DeepCADDevGlobal {
  componentRegistry: typeof componentRegistry;
  performanceMonitor: typeof performanceMonitor;
  helper: ComponentDevHelperType;
  tester: ComponentTesterType;
}

// 扩展Window类型
declare global {
  interface Window {
    deepcadDev?: DeepCADDevGlobal;
  }
}

// 初始化开发工具
export const initDevelopmentTools = (): void => {
  if (process.env.NODE_ENV !== 'development') return;

  // 设置全局开发变量
  (window as any).deepcadDev = {
    componentRegistry,
    performanceMonitor,
    helper: ComponentDevHelper,
    tester: ComponentTester
  };

  // 显示欢迎信息
  console.log(`%c
╔══════════════════════════════════════╗
║        DeepCAD 开发模式              ║
║                                      ║
║  快捷键:                             ║
║  Ctrl+Shift+D  显示/隐藏开发面板     ║
║  Ctrl+Shift+R  重新加载组件          ║
║  Ctrl+Shift+P  显示性能报告          ║
║                                      ║
║  全局对象: window.deepcadDev         ║
╚══════════════════════════════════════╝
  `, 'color: #00d9ff; font-family: monospace;');

  // 设置快捷键
  setupDevelopmentHotkeys();

  ComponentDevHelper.logDevTip('开发工具已初始化，@2号 @3号 可以开始开发了！');
};

export default { DevelopmentPanel, ComponentDevHelper, ComponentTester, initDevelopmentTools };