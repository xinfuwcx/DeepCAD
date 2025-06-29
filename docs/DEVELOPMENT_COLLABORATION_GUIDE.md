# 深基坑分析系统开发协作指南

## 1. 团队责任分工

### 1.1 核心技术团队职责

核心技术团队负责以下模块的开发与集成：

- **几何建模引擎** (基于OpenCascade)
- **网格生成引擎** (基于Netgen)
- **有限元计算引擎** (基于Kratos)
- **结果数据处理**
- **后端API实现**
- **核心算法优化**
- **物理AI系统**

### 1.2 Copilot团队职责

Copilot团队负责以下方面的设计与实现：

- **用户界面设计** (基于Figma)
- **UI组件开发** (React)
- **前端工程架构**
- **交互体验设计**
- **可视化实现** (基于Trame/Three.js)
- **Figma设计系统维护与集成**

## 2. 技术路线与数据流

系统采用标准的 **Three.js/OCC → Netgen → Kratos → Trame → 物理AI** 技术路线，为确保各团队协作顺畅，明确定义以下数据流程：

### 2.1 几何数据流

```
核心团队                                              Copilot团队
+------------------+        JSON格式几何数据         +------------------+
| OpenCascade引擎  | ---------------------------->   | Three.js前端渲染 |
+------------------+                                 +------------------+
        ^                                                   |
        |            UI几何操作指令                         |
        +-------------------------------------------------- +
```

### 2.2 分析数据流

```
核心团队                                              Copilot团队
+------------------+        网格/计算参数           +------------------+
| Netgen/Kratos    | <---------------------------- | 前端参数界面     |
+------------------+                                +------------------+
        |                                                   ^
        |            计算结果数据                           |
        +-------------------------------------------------->+
```

### 2.3 可视化数据流

```
核心团队                                              Copilot团队
+------------------+        VTK/云图数据            +------------------+
| Trame服务器      | ---------------------------->  | 前端可视化组件  |
+------------------+                                +------------------+
        ^                                                   |
        |            可视化控制指令                         |
        +-------------------------------------------------- +
```

## 3. 接口规范

为确保两个团队的模块能够无缝集成，必须遵循以下接口规范：

### 3.1 API接口规范

- 使用OpenAPI 3.0规范定义所有API
- 接口文档位于`src/api/README.md`
- 严格遵循RESTful设计原则
- 所有接口必须包含版本信息
- 统一使用JSON格式传输数据
- 错误处理遵循标准HTTP状态码

### 3.2 前后端数据交换标准

#### 几何数据格式
```json
{
  "modelId": "unique_id",
  "geometryType": "CAD",
  "entities": [
    {
      "id": "entity_1",
      "type": "solid",
      "representation": { ... }
    }
  ],
  "metadata": { ... }
}
```

#### 计算参数格式
```json
{
  "analysisType": "static",
  "materialModels": [ ... ],
  "boundaryConditions": [ ... ],
  "meshParameters": {
    "elementType": "tetrahedral",
    "elementSize": 0.5,
    "refinementRegions": [ ... ]
  },
  "solverSettings": { ... }
}
```

#### 结果数据格式
```json
{
  "resultId": "unique_id",
  "analysisType": "static",
  "timeStep": 2,
  "fields": [
    {
      "name": "displacement",
      "type": "vector",
      "values": [ ... ]
    },
    {
      "name": "stress",
      "type": "tensor",
      "values": [ ... ]
    }
  ],
  "metadata": { ... }
}
```

## 4. 开发工作流

### 4.1 版本控制规范

- 使用Git Flow工作流模式
- `main`分支为稳定发布版本
- `develop`分支为开发主线
- 功能开发使用`feature/*`分支
- 版本发布使用`release/*`分支
- Bug修复使用`hotfix/*`分支

### 4.2 集成与测试流程

```
功能开发 → 单元测试 → 模块集成 → 集成测试 → 系统测试 → 发布
```

- 单元测试覆盖率要求：≥85%
- 每日构建与集成测试
- 每周系统集成测试
- 预发布环境验证

### 4.3 协作工具

- **代码托管**：GitHub
- **问题追踪**：GitHub Issues
- **设计协作**：Figma
- **文档管理**：Markdown + GitHub Wiki
- **通信工具**：Slack

## 5. Figma集成说明

### 5.1 设计令牌同步

Figma设计系统中定义的设计令牌会自动同步到代码中，同步流程如下：

1. 设计师在Figma中更新设计令牌
2. 运行`npm run figma:sync`同步令牌
3. 设计令牌以三种格式输出：
   - JSON格式：供JS代码使用
   - TypeScript格式：提供类型提示
   - CSS变量：用于样式应用

### 5.2 组件开发流程

1. 设计师在Figma中创建/更新组件设计
2. 将Figma组件ID记录在组件文档中
3. 前端开发者基于设计实现React组件
4. 使用`FigmaThemeProvider`应用主题

### 5.3 设计变更处理

当Figma设计发生变更时：
1. 设计团队通过GitHub Issues提交设计变更请求
2. 前端团队评估变更影响
3. 同步设计令牌并更新相关组件
4. 进行UI回归测试
5. 提交变更审核

## 6. 核心技术接口

### 6.1 几何建模接口

核心团队提供以下Python API供前端调用：

```python
# occ_wrapper.py
class OCCWrapper:
    def create_shape(self, shape_type, params):
        """创建几何形状"""
        pass
        
    def boolean_operation(self, shape1, shape2, operation_type):
        """执行布尔运算"""
        pass
        
    def export_to_threejs(self, shapes):
        """导出Three.js兼容格式"""
        pass
```

### 6.2 网格生成接口

```python
# gmsh_wrapper.py
class MeshGenerator:
    def generate_mesh(self, geometry, params):
        """生成网格"""
        pass
        
    def optimize_mesh(self, mesh, quality_params):
        """优化网格质量"""
        pass
        
    def export_mesh(self, format="vtk"):
        """导出网格"""
        pass
```

### 6.3 计算引擎接口

```python
# kratos_solver.py
class KratosSolver:
    def initialize_model(self, mesh, materials, conditions):
        """初始化计算模型"""
        pass
        
    def solve(self, params):
        """求解计算"""
        pass
        
    def get_results(self, result_type, timestep=None):
        """获取计算结果"""
        pass
```

### 6.4 可视化服务接口

```python
# trame_server.py
class TrameServer:
    def initialize(self, port=8080):
        """初始化服务器"""
        pass
        
    def visualize_results(self, results, options):
        """可视化结果"""
        pass
        
    def export_scene(self, format="json"):
        """导出场景描述"""
        pass
```

## 7. 常见协作问题解决

### 7.1 技术栈冲突解决

- 当核心技术和UI实现需求冲突时，优先保证功能正确性
- 针对性能和用户体验的平衡，通过共同评审决定
- 复杂算法的前端实现可考虑使用WebAssembly

### 7.2 数据传输优化

- 大型几何数据使用LOD技术分级传输
- 计算结果采用流式传输
- 考虑使用WebSocket维持长连接

### 7.3 跨团队问题追踪

使用标准化的问题报告格式：

```
### 问题描述
[简明描述问题]

### 复现步骤
1. [步骤1]
2. [步骤2]
3. [步骤3]

### 预期行为
[描述期望的行为]

### 实际行为
[描述实际观察到的行为]

### 环境信息
- 浏览器版本:
- 操作系统: 
- 后端版本:
- 前端版本:

### 附加信息
[日志、截图等]
```

## 8. 技术文档管理

### 8.1 文档结构

```
docs/
|-- TECHNICAL_SUMMARY.md       # 技术概述
|-- ARCHITECTURE.md           # 系统架构文档
|-- API_DOCUMENTATION.md      # API文档
|-- UI_DESIGN_DOCUMENT.md     # UI设计文档
|-- FIGMA_INTEGRATION_TECHNICAL.md  # Figma集成技术文档
|-- DEVELOPMENT_COLLABORATION_GUIDE.md  # 本文档
`-- images/                   # 文档图片
```

### 8.2 文档更新流程

1. 创建文档变更分支
2. 更新相关文档
3. 提交Pull Request
4. 进行文档审核
5. 合并到主分支

## 9. 联系方式

### 核心技术团队

- **联系人**：[姓名]
- **邮箱**：[email]
- **工作时间**：[时区和工作时间]

### Copilot团队

- **联系人**：[姓名]
- **邮箱**：[email]
- **工作时间**：[时区和工作时间]

---

本协作指南旨在促进核心技术团队与Copilot UI团队的高效协作，定期更新以反映项目需求和流程变化。

最后更新：2024年7月 