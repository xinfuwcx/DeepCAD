# DeepCAD 系统架构文档

## 版本信息
- **文档版本**: v2.0
- **系统版本**: DeepCAD Phase 2 
- **最后更新**: 2025年1月
- **维护者**: 0号架构师

## 1. 系统概述

DeepCAD 是一个基于专家协作模式的深基坑CAE分析系统，采用模块化架构设计，支持从几何建模到计算分析的完整工作流程。

### 1.1 核心特性

- 🏗️ **专业级深基坑分析**: 支持复杂开挖几何、支护结构设计和多阶段施工模拟
- 🤖 **专家协作架构**: 多个专业领域专家模块协同工作
- 🔄 **完整数据流**: 几何建模 → 网格生成 → 计算分析 → 结果可视化
- 📊 **实时可视化**: 基于Three.js和PyVista的高性能3D渲染
- 🎯 **智能质量评估**: 集成Kratos质量标准的网格自动评估
- 📐 **专业桩基建模**: 基于工程实践的置换型/挤密型桩基分类建模

### 1.2 专家模块架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        0号架构师                                   │
│                     (系统总体架构)                                 │
└─────────────────────────────────────────────────────────────────┘
           │                    │                    │
┌──────────▼──────────┐┌────────▼────────┐┌─────────▼──────────┐
│    1号GIS专家       ││   2号几何专家    ││   3号计算专家      │
│  (Epic控制中心)     ││  (几何建模算法)  ││ (数值计算分析)     │
│ - 项目管理         ││ - DXF导入处理   ││ - Kratos集成      │
│ - 数据协调         ││ - 布尔运算算法   ││ - PyVista可视化   │
│ - 专家调度         ││ - 智能几何优化   ││ - GPU加速计算     │
└────────────────────┘└─────────────────┘└───────────────────┘
```

## 2. 技术架构

### 2.1 技术栈

**前端框架**
- React 18 + TypeScript
- Vite 构建工具
- Tailwind CSS 样式框架

**3D渲染引擎**
- Three.js (主要3D渲染)
- PyVista (科学可视化)
- WebGL 硬件加速

**状态管理**
- Zustand (轻量级状态管理)
- React Context (主题和配置)

**数据处理**
- Kratos 计算引擎集成
- GMSH 网格生成
- OpenCASCADE 几何内核

**后端集成**
- WebSocket 实时通信
- REST API 数据交换
- Python 科学计算后端

### 2.2 模块架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                           前端层                                │
├─────────────────┬───────────────────┬─────────────────────────┤
│   UI组件层      │    业务逻辑层      │      数据层             │
│ - 工作空间      │ - 几何建模        │ - 服务抽象              │
│ - 控制面板      │ - 网格生成        │ - 状态管理              │
│ - 可视化组件    │ - 计算分析        │ - 缓存机制              │
└─────────────────┴───────────────────┴─────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                         服务层                                  │
├──────────────┬──────────────┬──────────────┬─────────────────┤
│ 几何服务     │ 网格服务     │ 计算服务     │ 可视化服务      │
│- DXF处理     │- 质量评估    │- Kratos集成  │- Three.js渲染   │
│- 布尔运算    │- 自适应网格  │- 多物理场    │- PyVista集成    │
│- 桩基建模    │- 格式转换    │- GPU加速      │- 实时更新       │
└──────────────┴──────────────┴──────────────┴─────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                        后端层                                   │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   计算引擎      │   数据存储      │        外部集成             │
│ - Kratos Core   │ - 项目数据      │ - GMSH网格生成              │
│ - 求解器集群    │ - 结果缓存      │ - OpenCASCADE几何内核       │
│ - 并行计算      │ - 配置管理      │ - 气象数据API               │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

## 3. 核心模块详解

### 3.1 几何建模模块 (2号专家负责)

**核心功能**:
- DXF文件智能导入和解析
- 复杂几何体布尔运算 (并集、差集、交集)
- 开挖轮廓自动识别和优化
- 支护结构几何生成

**关键组件**:
```typescript
// 几何建模工作空间
GeometryModelingWorkspace
├── DXFBooleanInterface        // DXF导入和布尔运算
├── PileTypeSelector           // 专业桩基类型选择
├── GeometryQualityAssessment  // 几何质量评估
└── 3DGeometryVisualization    // 实时3D预览

// 核心服务
GeometryAlgorithmIntegration
├── enhancedDXFProcessing()    // 增强DXF处理
├── intelligentBooleanOps()    // 智能布尔运算
├── geometryOptimization()     // 几何优化算法
└── qualityAssessment()        // 质量评估
```

**桩基建模专业分类**:
```typescript
// 置换型桩基 (BEAM_ELEMENT)
- 钻孔灌注桩 (BORED_CAST_IN_PLACE)
- 人工挖孔桩 (HAND_DUG) 
- 预制管桩 (PRECAST_DRIVEN)

// 挤密型桩基 (SHELL_ELEMENT)
- SWM工法桩 (SWM_METHOD)
- CFG桩 (CFG_PILE)
- 高压旋喷桩 (HIGH_PRESSURE_JET)
```

### 3.2 网格生成模块

**核心功能**:
- 自适应网格生成算法
- Kratos格式数据转换
- 专业质量评估标准
- 多种网格算法支持

**关键组件**:
```typescript
// 网格生成模块
MeshGenerationModule
├── MeshParameterControls      // 网格参数控制
├── QualityMetricsDisplay     // 质量指标显示
├── KratosDataExport          // Kratos数据导出
└── PyVistaIntegration        // PyVista集成

// Kratos数据转换服务
KratosDataConverter
├── KratosElementConverter    // 单元类型转换
├── MeshQualityCalculator     // 质量计算器
├── QualityStandards         // 深基坑质量标准
└── DataFormatOptimizer      // 数据格式优化
```

**质量评估指标**:
- 长宽比 (Aspect Ratio): 优秀 ≤ 3, 可接受 ≤ 10
- 偏斜度 (Skewness): 优秀 ≤ 0.25, 可接受 ≤ 0.6  
- 雅可比行列式 (Jacobian): 优秀 ≥ 0.5, 可接受 ≥ 0.1
- 正交性 (Orthogonality): 优秀 ≥ 0.8, 可接受 ≥ 0.5

### 3.3 计算分析模块 (3号专家负责)

**核心功能**:
- Kratos多物理场耦合求解
- GPU加速并行计算
- 自适应网格细化
- PyVista科学可视化

**关键组件**:
```typescript
// 计算服务架构
ComputationModule
├── MultiphysicsSolver        // 多物理场求解器
├── AdaptiveMeshAlgorithm     // 自适应网格算法  
├── GPUAccelerationEngine    // GPU加速引擎
└── PyVistaResultsViewer     // PyVista结果查看器

// PyVista集成服务
PyVistaIntegrationService
├── RealtimeDataStreaming    // 实时数据流
├── ScientificVisualization  // 科学可视化
├── InteractiveAnalysis      // 交互式分析
└── ResultsExport           // 结果导出
```

### 3.4 Epic控制中心 (1号专家负责)

**核心功能**:
- 项目生命周期管理
- 专家模块协调调度
- 数据流监控管理
- 用户界面统一入口

**关键组件**:
```typescript
// Epic控制中心架构
EpicControlCenter
├── ProjectFlightSystem      // 项目飞行系统
├── ExpertCollaborationHub   // 专家协作中心
├── UnifiedWorkspace        // 统一工作空间
└── SystemHealthMonitor     // 系统健康监控
```

## 4. 数据流架构

### 4.1 完整数据流程

```
用户输入 → 几何建模 → 网格生成 → 计算分析 → 结果可视化
   ↓           ↓           ↓           ↓           ↓
DXF文件    CAD几何体    Kratos网格   求解结果    PyVista渲染
   │           │           │           │           │
   ├─质量检查   ├─优化算法   ├─质量评估   ├─后处理     ├─交互分析
   ├─格式转换   ├─布尔运算   ├─格式转换   ├─数据提取   ├─结果导出
   └─错误处理   └─几何修复   └─导出功能   └─动画生成   └─报告生成
```

### 4.2 服务间通信

**事件驱动架构**:
```typescript
// 事件总线模式
EventBus
├── GeometryModelingComplete  // 几何建模完成
├── MeshGenerationFinished    // 网格生成完成  
├── ComputationResultReady    // 计算结果就绪
└── VisualizationUpdated     // 可视化更新
```

**数据传递接口**:
```typescript
interface DataPipeline {
  geometryData: CADGeometry;        // 几何数据
  meshData: KratosModelData;        // 网格数据
  computationData: SolutionResult; // 计算数据
  visualizationData: PyVistaData;  // 可视化数据
}
```

## 5. 服务层架构

### 5.1 统一服务导出

所有服务通过 `src/services/index.ts` 统一导出，避免循环依赖：

```typescript
// 统一导入模式
import { 
  PileType, 
  PileModelingStrategy,
  KratosElementConverter,
  geometryAlgorithmIntegration,
  PyVistaIntegrationService
} from '../services';
```

### 5.2 核心服务清单

| 服务分类 | 服务名称 | 主要功能 | 负责专家 |
|---------|---------|---------|---------|
| 桩基建模 | PileModelingStrategy | 专业桩基分类和建模策略 | 2号专家 |
| 数据转换 | KratosDataConverter | 网格数据转换和质量评估 | 3号专家 |
| 几何算法 | GeometryAlgorithmIntegration | DXF处理和几何优化 | 2号专家 |
| 可视化 | PyVistaIntegrationService | 科学可视化和结果展示 | 3号专家 |
| 项目管理 | EpicControlCenter | 项目协调和专家调度 | 1号专家 |
| 计算求解 | MultiphysicsSolver | 多物理场耦合计算 | 3号专家 |

## 6. 部署架构

### 6.1 开发环境

```bash
# 前端开发服务器
npm run dev          # Vite开发服务器 (端口: 5173)

# 后端服务
python start_backend.py  # Python计算服务 (端口: 8000)

# 数据库服务
# 使用本地文件存储 + Redis缓存
```

### 6.2 生产环境

```
┌─────────────────────────────────────────────────────────────────┐
│                      负载均衡器                                  │
└─────────────────────────────────────────────────────────────────┘
           │                    │                    │
┌──────────▼──────────┐┌────────▼────────┐┌─────────▼──────────┐
│    前端集群        ││   API网关       ││   计算集群         │
│ - React SPA       ││ - 路由转发      ││ - Kratos引擎       │
│ - CDN加速         ││ - 认证授权      ││ - 并行计算         │
│ - 静态资源        ││ - 限流监控      ││ - GPU加速          │
└───────────────────┘└─────────────────┘└───────────────────┘
           │                    │                    │
┌──────────▼──────────┐┌────────▼────────┐┌─────────▼──────────┐
│    存储层          ││   缓存层        ││   监控层           │
│ - PostgreSQL      ││ - Redis         ││ - 日志收集         │
│ - 文件存储        ││ - 会话存储      ││ - 性能监控         │
│ - 备份策略        ││ - 计算缓存      ││ - 告警系统         │
└───────────────────┘└─────────────────┘└───────────────────┘
```

## 7. 性能优化

### 7.1 前端优化策略

**代码分割和懒加载**:
```typescript
// React.lazy动态导入
const GeometryModule = React.lazy(() => 
  import('./components/GeometryModelingWorkspace')
);
const MeshModule = React.lazy(() => 
  import('./components/MeshGenerationModule')
);
```

**Three.js性能优化**:
- LOD (Level of Detail) 层次细节
- 实例化渲染 (InstancedMesh)
- 几何体缓存和重用
- 材质共享机制

**内存管理**:
- WebGL资源自动清理
- 大数据集分块加载
- 结果数据压缩存储

### 7.2 计算优化策略

**GPU加速计算**:
- WebGPU compute shaders
- CUDA并行计算
- 矩阵运算优化

**网格自适应**:
- 误差驱动的网格细化
- 动态负载均衡
- 内存使用优化

## 8. 质量保证

### 8.1 代码质量

**TypeScript严格模式**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**ESLint规则**:
- 导入规范检查
- 代码风格统一
- 潜在错误检测

**测试覆盖率**:
- 单元测试: Jest + React Testing Library
- 集成测试: Playwright E2E
- 性能测试: 自动化基准测试

### 8.2 工程质量

**网格质量标准**:
- 深基坑工程专业标准
- Kratos求解器兼容性检查
- 自动质量评估和警告

**数据完整性**:
- 几何数据验证
- 计算结果一致性检查
- 可视化数据完整性验证

## 9. 安全考虑

### 9.1 数据安全

- 用户数据本地化处理
- 敏感信息加密存储
- 计算结果访问控制

### 9.2 系统安全

- API接口鉴权
- 输入数据验证
- XSS/CSRF防护

## 10. 扩展性设计

### 10.1 模块化扩展

**新专家模块接入**:
```typescript
interface ExpertModule {
  id: string;
  name: string;
  capabilities: string[];
  dataInterface: DataExchangeInterface;
  initialize(): Promise<void>;
  process(input: any): Promise<any>;
}
```

**插件化架构**:
- 渲染引擎插件
- 求解器插件  
- 后处理插件
- 导入导出插件

### 10.2 云端扩展

- 微服务化改造
- 容器化部署
- 弹性伸缩支持
- 多租户架构

## 11. 监控和运维

### 11.1 系统监控

**性能指标**:
- 前端渲染帧率
- 内存使用情况
- 网络请求耗时
- 计算任务队列

**业务指标**:
- 用户活跃度
- 功能使用统计
- 错误率统计
- 计算成功率

### 11.2 日志管理

**日志分级**:
- ERROR: 系统错误和异常
- WARN: 性能警告和兼容性问题
- INFO: 关键业务操作
- DEBUG: 详细调试信息

**日志收集**:
- 前端错误监控 (Sentry)
- 后端日志聚合 (ELK Stack)
- 性能监控 (APM工具)

## 12. 开发指南

### 12.1 开发环境设置

```bash
# 1. 克隆项目
git clone <repository-url>
cd DeepCAD

# 2. 安装前端依赖
cd frontend
npm install

# 3. 安装后端依赖
cd ..
pip install -r requirements.txt

# 4. 启动开发服务器
npm run dev          # 前端开发服务器
python start_backend.py  # 后端服务器
```

### 12.2 开发规范

**组件开发规范**:
```typescript
/**
 * 组件名称和功能描述
 * 负责专家 - 具体职责说明
 */
import React from 'react';
import { ComponentProps } from '../types';

const ComponentName: React.FC<ComponentProps> = ({ 
  prop1, 
  prop2 
}) => {
  // 组件逻辑
  return (
    <div className="component-wrapper">
      {/* 组件内容 */}
    </div>
  );
};

export default ComponentName;
```

**服务开发规范**:
```typescript
/**
 * 服务名称和功能描述
 * 负责专家 - 服务职责范围
 */
export class ServiceName {
  private static instance: ServiceName;
  
  static getInstance(): ServiceName {
    if (!this.instance) {
      this.instance = new ServiceName();
    }
    return this.instance;
  }
  
  // 服务方法实现
}

export const serviceName = ServiceName.getInstance();
```

### 12.3 提交规范

**Git提交格式**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型定义**:
- feat: 新功能
- fix: Bug修复  
- refactor: 代码重构
- perf: 性能优化
- docs: 文档更新
- test: 测试相关

## 13. FAQ常见问题

### 13.1 开发问题

**Q: 如何添加新的桩基类型？**
A: 在 `PileModelingStrategy.ts` 中的 `PileType` 枚举和 `PILE_CLASSIFICATION_MAPPING` 中添加新类型定义。

**Q: 如何自定义网格质量标准？**
A: 修改 `KratosDataConverter.ts` 中的 `QualityStandards` 配置。

**Q: 如何集成新的可视化组件？**
A: 实现 `VisualizationComponent` 接口，并注册到可视化服务中。

### 13.2 性能问题

**Q: Three.js渲染性能不佳怎么办？**
A: 检查几何体复杂度，启用LOD优化，减少材质数量。

**Q: 大模型加载缓慢如何解决？**  
A: 使用分块加载，启用数据压缩，实现渐进式加载。

### 13.3 部署问题

**Q: 如何配置生产环境？**
A: 参考部署架构章节，配置负载均衡和缓存策略。

**Q: 如何监控系统健康状态？**
A: 集成监控服务，设置关键指标告警。

---

**维护说明**: 本文档随系统版本更新，请定期查看最新版本。如有问题请联系开发团队。