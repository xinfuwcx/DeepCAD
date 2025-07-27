# 🔧 3号计算专家 - 主界面集成指南

**为0号架构师提供的完整接入指南**

## 📋 快速开始

### 1. 基础导入

```typescript
// 方式1: 导入单个组件
import { 
  ComputationControlPanel,
  createComputationModule,
  ComputationModuleConfig 
} from './components';

// 方式2: 导入整个模块
import ComputationModule from './components';
```

### 2. 基础使用

```typescript
import React, { useEffect, useState } from 'react';
import { createComputationModule, ComputationModuleConfig } from './components';

const MainInterface: React.FC = () => {
  const [computationModule, setComputationModule] = useState(null);

  useEffect(() => {
    // 创建计算模块
    const config: ComputationModuleConfig = {
      moduleId: 'main-computation',
      moduleName: '主界面计算模块',
      version: '1.0.0',
      
      performance: {
        enableGPUMonitoring: true,
        enableQualityFeedback: true,
        maxComputeUnits: 64,
        memoryLimit: 4096
      },
      
      geometryCollaboration: {
        enableAutoGeometryImport: true,
        enableQualityFeedback: true,
        meshQualityThreshold: 0.7
      },
      
      ui: {
        theme: 'dark',
        enableAdvancedControls: true,
        showPerformanceMetrics: true,
        showQualityAnalysis: true
      }
    };

    const module = createComputationModule(config);
    
    // 初始化模块
    module.initialize().then(() => {
      setComputationModule(module);
    });
  }, []);

  // 获取React组件
  const components = computationModule?.getReactComponents();

  return (
    <div className="main-interface">
      {components && (
        <>
          <components.ComputationControlPanel {...components.props} />
          <components.PhysicsAIPanel {...components.props} />
        </>
      )}
    </div>
  );
};
```

## 🎯 高级集成

### 1. 完整配置示例

```typescript
import { ComputationModuleIntegration, ComputationModuleConfig } from './components';

class MainApplicationIntegration {
  private computationModule: ComputationModuleIntegration;
  
  constructor() {
    const config: ComputationModuleConfig = {
      moduleId: 'deepcad-computation',
      moduleName: 'DeepCAD计算引擎',
      version: '1.0.0',
      
      // Three.js场景（如果有的话）
      scene: this.threeScene,
      
      performance: {
        enableGPUMonitoring: true,
        enableQualityFeedback: true,
        maxComputeUnits: navigator.hardwareConcurrency || 8,
        memoryLimit: 8192 // 8GB
      },
      
      geometryCollaboration: {
        enableAutoGeometryImport: true,
        enableQualityFeedback: true,
        meshQualityThreshold: 0.75
      },
      
      ui: {
        theme: 'dark',
        enableAdvancedControls: true,
        showPerformanceMetrics: true,
        showQualityAnalysis: true
      }
    };

    this.computationModule = new ComputationModuleIntegration(config);
    
    // 设置事件监听
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // 监听计算状态变化
    this.computationModule.onStateChange('status_changed', (status) => {
      console.log('计算状态变化:', status);
      this.updateMainUIStatus(status);
    });

    // 监听计算结果更新
    this.computationModule.onStateChange('results_updated', (results) => {
      console.log('计算结果更新:', results);
      this.handleComputationResults(results);
    });

    // 监听错误
    this.computationModule.onStateChange('error', (error) => {
      console.error('计算错误:', error);
      this.showErrorToUser(error);
    });
  }

  async initialize(): Promise<void> {
    await this.computationModule.initialize();
  }

  // 启动具体计算任务
  async startDeepExcavationAnalysis(): Promise<void> {
    await this.computationModule.startComputation('comprehensive_analysis', {
      excavationDepth: 15,
      soilLayers: this.getSoilLayerData(),
      retainingSystem: this.getRetainingSystemData()
    });
  }
}
```

### 2. 路由集成

```typescript
// 在主路由中集成
import { Routes, Route } from 'react-router-dom';
import { ComputationControlPanel } from './components';

const AppRoutes = () => (
  <Routes>
    <Route 
      path="/computation" 
      element={
        <ComputationControlPanel 
          scene={threeScene}
          onStatusChange={handleStatusChange}
          onResultsUpdate={handleResultsUpdate}
          enablePerformanceMonitoring={true}
          enableQualityAnalysis={true}
          theme="dark"
        />
      } 
    />
    {/* 其他路由 */}
  </Routes>
);
```

### 3. 状态管理集成

```typescript
// 与Redux/Zustand等状态管理集成
import { create } from 'zustand';

interface ComputationStore {
  computationModule: ComputationModuleIntegration | null;
  currentTask: string | null;
  progress: number;
  results: any;
  
  initializeComputation: (config: ComputationModuleConfig) => Promise<void>;
  startTask: (taskType: string, params?: any) => Promise<void>;
  updateProgress: (progress: number) => void;
}

const useComputationStore = create<ComputationStore>((set, get) => ({
  computationModule: null,
  currentTask: null,
  progress: 0,
  results: null,

  initializeComputation: async (config) => {
    const module = new ComputationModuleIntegration(config);
    await module.initialize();
    
    // 设置状态监听
    module.onStateChange('status_changed', (status) => {
      set({ currentTask: status });
    });
    
    set({ computationModule: module });
  },

  startTask: async (taskType, params) => {
    const { computationModule } = get();
    if (computationModule) {
      await computationModule.startComputation(taskType, params);
    }
  },

  updateProgress: (progress) => set({ progress })
}));
```

## 🔌 组件Props接口

### ComputationControlPanel Props

```typescript
interface ComputationControlPanelProps {
  // 必需props
  scene: THREE.Scene;                    // Three.js场景对象
  
  // 回调函数
  onStatusChange?: (status: ComputationStatus) => void;
  onResultsUpdate?: (results: any) => void;
  onError?: (error: string) => void;
  
  // 功能配置
  enablePerformanceMonitoring?: boolean;  // 启用性能监控
  enableQualityAnalysis?: boolean;        // 启用质量分析
  enableGeometryCollaboration?: boolean;  // 启用几何协作
  
  // UI配置
  theme?: 'dark' | 'light';              // 主题
  showAdvancedControls?: boolean;         // 显示高级控制
  
  // 性能配置
  maxComputeUnits?: number;              // 最大计算单元
  memoryLimit?: number;                  // 内存限制(MB)
  qualityThreshold?: number;             // 质量阈值(0-1)
}
```

### PhysicsAIEmbeddedPanel Props

```typescript
interface PhysicsAIPanelProps {
  // 可选props
  scene?: THREE.Scene;                   // Three.js场景
  collapsible?: boolean;                 // 是否可折叠
  defaultCollapsed?: boolean;            // 默认折叠状态
  
  // 回调函数
  onDesignVariableChange?: (variables: any) => void;
  onOptimizationComplete?: (results: any) => void;
}
```

## 🎨 样式定制

### CSS类名约定

```css
/* 主要容器 */
.computation-control-panel {
  /* 主计算控制面板 */
}

.performance-monitoring-panel {
  /* 性能监控面板 */
}

.quality-feedback-panel {
  /* 质量反馈面板 */
}

/* 性能指标 */
.performance-card {
  /* 性能卡片 */
}

.memory-usage,
.metrics-list {
  /* 内存使用和指标列表 */
}

/* 质量分析 */
.quality-report,
.quality-score {
  /* 质量报告和评分 */
}

.metric-item {
  /* 质量指标项 */
}

.metric-excellent { color: #52c41a; }
.metric-good { color: #1890ff; }
.metric-acceptable { color: #faad14; }
.metric-poor { color: #ff7875; }
.metric-unacceptable { color: #ff4d4f; }
```

### 主题定制

```typescript
// 主题配置
const computationTheme = {
  dark: {
    background: '#1f1f1f',
    surface: '#2d2d2d',
    primary: '#00d9ff',
    secondary: '#667eea',
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    text: '#ffffff',
    textSecondary: '#a0a0a0'
  },
  
  light: {
    background: '#ffffff',
    surface: '#f5f5f5',
    primary: '#1890ff',
    secondary: '#722ed1',
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    text: '#000000',
    textSecondary: '#666666'
  }
};
```

## 🔧 故障排除

### 常见问题

1. **WebGPU不支持**
```typescript
import { checkComputationCompatibility } from './components';

const compatibility = checkComputationCompatibility();
if (!compatibility.webgpu) {
  console.warn('WebGPU不支持，将使用WebGL2后备方案');
}
```

2. **内存不足**
```typescript
const config = {
  performance: {
    memoryLimit: navigator.deviceMemory ? navigator.deviceMemory * 512 : 2048
  }
};
```

3. **Three.js场景未传入**
```typescript
// 确保传入有效的Three.js场景
const scene = new THREE.Scene();
<ComputationControlPanel scene={scene} />
```

## 📊 性能优化建议

### 1. 懒加载组件

```typescript
import { lazy, Suspense } from 'react';

const ComputationControlPanel = lazy(() => import('./components/ComputationControlPanel'));

const App = () => (
  <Suspense fallback={<div>加载计算模块中...</div>}>
    <ComputationControlPanel />
  </Suspense>
);
```

### 2. 内存管理

```typescript
// 定期清理资源
useEffect(() => {
  const cleanup = () => {
    computationModule?.dispose?.();
  };
  
  return cleanup;
}, [computationModule]);
```

### 3. 性能监控

```typescript
// 监控性能指标
computationModule.onStateChange('performance_update', (metrics) => {
  if (metrics.memoryUsage > 0.9) {
    console.warn('内存使用率过高，考虑减少计算单元数量');
  }
});
```

## 🚀 部署注意事项

1. **HTTPS要求**: WebGPU需要HTTPS环境
2. **跨域配置**: 确保正确配置CORS
3. **内存限制**: 生产环境建议至少8GB内存
4. **浏览器兼容性**: Chrome 94+, Firefox 95+, Safari 15+

## 📞 技术支持

如需技术支持，请联系：
- **3号计算专家**: 计算算法和性能优化
- **文档位置**: `src/components/EXPERT_3_COMPONENT_REFERENCE.md`
- **示例代码**: `src/examples/ComputationExamples.tsx`

---

**🎯 3号计算专家团队**  
*专注计算精度和性能优化* 🚀