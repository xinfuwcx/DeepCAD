# DeepCAD 统一技术设计文档 v1.0

## 0. 文档目的

本文档旨在综合项目初期 "o3"、"Gemini" 与 "Opus" 提出的各项方案与建议，形成一份统一的、具有指导性的技术设计与实施纲领。它将作为项目后续开发的核心参考，确保产品在功能丰富度、架构健壮性与开发效率之间取得最佳平衡。

---

## 1. 核心设计原则

我们将遵循以下五大原则，指导所有的架构决策与功能开发：

### 1.1. 工作流驱动的交互 (Workflow-Driven Interaction)
UI 布局与交互将严格遵循岩土工程师的自然工作流程，而非罗列孤立的功能。
- **左侧边栏为“工作流时间线”**: 严格按“地质建模 → 结构开挖 → 支护与荷载 → 边界条件 → 网格剖分 → 计算分析”的线性顺序组织，引导用户按部就班操作。
- **右侧面板为“属性检查器”**: 在 3D 视口中选中任何对象，右侧面板即时显示其详细参数与二维示意图，实现“所见即所得”的编辑体验。
- **核心交互理念**: 左手（侧栏）创造，右手（面板）编辑，中央（视口）观察与选择。

### 1.2. 数据驱动的场景管理 (Data-Driven Scene Management)
系统将围绕一个单一、权威的数据源来构建，确保状态同步的清晰与健壮。
- **单一数据源 (Single Source of Truth)**: 整个项目场景（包含所有几何、材料、工况参数）以一个完整的 JSON 文档形式，由后端数据库统一管理。
- **批量更新与自动保存**: 前端允许多次编辑，并在切换主要模块或闲置超时后，将变更“批量更新”至后端。这在保证最终一致性的前提下，兼顾了性能与用户体验。
- **为撤销/重做设计**: 基于后端的场景快照，实现可靠的、覆盖全局操作的 Undo/Redo 功能。

### 1.3. 即时反馈与乐观 UI (Instant Feedback & Optimistic UI)
最大化消除用户等待感，提供流畅、不间断的操作体验。
- **区分轻/重计算**: 参数化建模、几何变换等“轻计算”在前端实时完成；三维重建、布尔运算、网格剖分等“重计算”交由后端异步处理。
- **应用乐观 UI**: 对于重计算，前端立即显示一个“虚拟占位符”（如半透明线框），并在后端任务完成后用真实模型将其替换，避免界面卡顿和长时间的 loading 动画。

### 1.4. 渐进式架构扩展 (Progressive Architectural Scalability)
架构设计既要面向未来，也要避免在项目初期过度工程化。
- **初期 - 保持简单**: 采用直接的组件结构，但保持清晰的文件组织与接口定义。
- **中期 - 模块化重构**: 当功能复杂度提升时，引入“插件化”思想，将每种建模工具（如基坑、隧道）重构为符合统一接口（如 `IModelingTool`）的独立模块。
- **长期 - 插件化架构**: 最终实现一个可动态注册、易于扩展的工具系统。

### 1.5. 垂直切片的开发策略 (Vertical Slice Development)
我们将采用“小而完整”的垂直切片模式进行迭代，确保每个开发周期都能产出可用的、端到端的功能。这比水平分层（先做完所有UI，再做完所有后端）更能带来持续的成就感和价值。

---

## 2. 系统架构

### 2.1. 整体技术栈
- **前端**: React 18+, Vite, Ant Design 5.x, Zustand, React-Three-Fiber (for Three.js), Axios
- **后端**: FastAPI (Python 3.9+), Uvicorn, SQLAlchemy (用于数据库交互), Celery (用于异步任务)
- **数据库**: PostgreSQL (用于场景存储), Redis (用于 Celery 消息代理)
- **核心计算**: Kratos Multiphysics, Gmsh/MMG, PyTorch/MindSpore (for Physics AI)

### 2.2. 数据流与组件交互
系统的数据流遵循一个单向、清晰的循环，确保可预测性。

```mermaid
graph TD;
    subgraph Browser
        User -- 1. User Interaction --> ReactUI[React UI Components];
        ReactUI -- 2. Call Action --> ZustandStore[Zustand Store];
        ZustandStore -- 3. Trigger API Call --> APIClient[API Client / Axios];
    end

    APIClient -- 4. HTTP Request --> Backend;

    subgraph Backend
        APIGateway[FastAPI Gateway] -- 5. Route Request --> Modules[Service Modules <br/> (Geometry, Meshing, etc.)];
        Modules -- 6. Process & <br/>DB Operation --> Database[(PostgreSQL)];
        Modules -- 7. Return Result --> APIGateway;
    end
    
    Backend -- 8. HTTP Response --> APIClient;
    APIClient -- 9. Update Store --> ZustandStore;
    ZustandStore -- 10. State Change --> ReactUI;
    ReactUI -- 11. Re-render --> User;
```
---

## 3. 核心功能模块设计

### 3.1. 建模 (Geometry)

#### 3.1.1. 计算域 (Computational Domain)
- **UI/交互**: 侧栏提供“新建/编辑”按钮，弹窗中包含钻孔数据CSV导入、地质分层参数输入、三维重建算法选择（如Kriging）及分辨率控制。
- **数据模型**: `scene.domain = { boreholes: [...], stratums: [...], reconstructionParams: {...} }`
- **2D示意**: 右侧面板显示代表性的地质剖面图。
- **API (Draft)**: `POST /api/scene/domain/from-boreholes`

#### 3.1.2. 基坑 (Excavation)
- **UI/交互**: 侧栏提供DXF导入按钮、开挖深度输入框。导入时自动抓取DXF闭合曲线形心，并将其对齐到计算域的XY平面形心。
- **数据模型**: `scene.components.excavations = [{ id, dxfUrl, depth, wallType, ... }]`
- **2D示意**: 平面图显示轮廓与形心；剖面图显示深度、支护结构与土层关系。
- **API (Draft)**: `POST /api/components/excavation` (上传DXF文件，返回创建的构件ID)

#### 3.1.3. 隧道 (Tunnel)
- **UI/交互**: 侧栏提供“参数化新建”（圆形、马蹄形）、“沿折线绘制”、“导入中心线”等多种创建方式。
- **数据模型**: `scene.components.tunnels = [{ id, path: [...], profile: {...}, materialId, ... }]`
- **2D示意**: 可沿隧道里程拖动滑块，右侧同步显示对应位置的截面图。
- **API (Draft)**: `POST /api/components/tunnel`

#### 3.1.4. 支护、锚杆、荷载等
- 均遵循相似的设计模式：在侧栏通过参数化表单或导入方式创建，数据模型作为 `scene.components` 的一部分，支持在3D视口中交互并可在右侧面板查看详情。
- **锚杆**需包含预应力、长度、角度等关键参数。
- **临近建筑物**主要作为施加荷载的几何代理。

#### 3.1.5. 材料库 (Materials)
- **UI/交互**: 全局统一的材料库弹窗，支持按类型（土体、混凝土、钢材）筛选，可新建、编辑、导入/导出，支持拖拽到3D构件上进行赋予。
- **数据模型**: `scene.materials = [{ id, name, type, parameters: {...} }]`
- **API (Draft)**: `GET /api/materials`, `POST /api/materials`

### 3.2. 网格 (Meshing)
- **UI/交互**: 侧栏提供全局网格尺寸、局部细化设置、算法选择（Tet/Hex）、无限元边界设置等。点击“生成网格”触发后端异步任务，界面通过WebSocket接收进度。
- **数据模型**: `scene.meshingParams = { globalSize, refinements: [...], algorithm, ... }`
- **API (Draft)**: `POST /api/meshing/generate` -> `202 { task_id }`

### 3.3. 计算 (Analysis)
- **UI/交互**: 页面顶部用Tabs区分为“FEM分析”和“物理AI”。
    - **FEM**: 设置求解类型、计算步、荷载工况、非线性参数等。提交后显示计算进度，完成后自动跳转至后处理页面。
    - **物理AI**: 设置反演/优化目标、约束PDE、关联IoT数据源等。
- **数据模型**: `scene.analysisCases = [{ id, type: 'FEM' | 'PINN', params: {...} }]`
- **API (Draft)**: `POST /api/analysis/run` -> `202 { task_id }`

---

## 4. 实施路线图 (Phased Plan)

我们将采用4个主要的Sprint来逐步实现核心功能，确保快速迭代和持续交付。

### Sprint 1: “A-B-C”垂直切片验证
- **目标**: 打通最核心的“建模-网格-计算”流程，验证整体架构。
- **任务**:
    1. **后端**: 建立`Project Scene`数据库模型及基础CRUD API。
    2. **前端**:
        - 建立Zustand `sceneStore`并实现与后端的基本同步。
        - 实现**简化版计算域**：手动输入单层土参数。
        - 实现**基坑**工具：仅支持参数化创建一个立方体代表基坑。
        - 实现**简化版网格**：仅设置全局尺寸。
        - 实现**简化版计算**：调用后端执行一个象征性的“计算”，并返回成功状态。
    - **产出**: 一个可以从头走到尾，虽然功能极简，但流程完整的应用原型。

### Sprint 2: 丰富核心建模功能
- **目标**: 完善主要建模工具，实现动态模型交互。
- **任务**:
    1.  实现带钻孔导入的**计算域**三维地质重建。
    2.  实现完整的**基坑**DXF导入、布尔运算、及二维示意图。
    3.  实现参数化的**隧道**建模。
    4.  实现**材料库**及赋予功能。
    5.  完善3D视口的选中、编辑、撤销/重做交互。

### Sprint 3: 网格剖分与异步任务
- **目标**: 实现真正可用的网格剖分功能。
- **任务**:
    1.  对接Gmsh/MMG，实现带局部细化和边界层（无限元）功能的网格生成。
    2.  封装通用的WebSocket服务，处理所有后端长时任务（网格、计算）的进度反馈。
    3.  在视口中实现网格质量的可视化检查。

### Sprint 4: FEM计算与初步后处理
- **目标**: 完成一个端到端的FEM静力分析案例。
- **任务**:
    1.  完善FEM计算参数设置面板。
    2.  对接Kratos求解器，完成自重应力分析。
    3.  开发初步的后处理功能，至少能显示位移云图。
    4.  为后续的物理AI模块搭建基本框架。

---
*本文档将作为动态文档，随项目进展持续更新。*
*最后更新: [当前日期]* 