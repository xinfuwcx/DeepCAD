# 项目优化与修改计划技术文档

## 1. 概述
本技术文档基于《设计规格与当前实现对比》文档，针对项目核心功能与架构，提出优化和修改计划，供开发团队参考。

> **当前测试环境说明**：目前所有功能均在 _单机模式_（本地一台工作站，未接入服务器集群或云环境）下进行验证。因此，本计划中的 CI/CD、性能调优和多实例部署相关工作将以“本地可运行、方便迁移”为前提，后续如引入集群再行扩展。

## 2. 优化目标
- 提升 UI/UX 视觉一致性和交互体验
- 增强表单校验与鲁棒性
- 完善 3D 视口和网格交互能力
- 强化智能助理和语音交互功能
- 增加后端几何/网格处理可配置性与物理组管理
- 建立完善的 CI/CD 测试与监控流程

## 3. 范围与优先级
- **P0（高优）**：全局样式与主题体系、表单 Schema 驱动、主容器布局 & 视口填充
- **P0.5（高优）**：本地 CI/Test Gate（确保单机开发质量，为未来分布式部署奠定基础）
- **P1（中优）**：Gmsh 物理组 & mesh_file 支持、Terra 求解器网格输入、智能助理增强
- **P2（低优）**：DXF 导入健壮性、远程/集群部署脚本、可访问性 & 国际化

## 4. 技术方案

### 4.1 全局样式与主题体系
- 在 `src/styles/themes.css` 引入 CSS 变量（`--bg-primary`、`--accent` 等），统一设计 Token
- 在 `App.tsx` 或全局 Context/Store 中实现暗/亮模式切换，并持久化用户偏好
- 使用 Styled Components 或 Tailwind Utilities，由变量驱动创建玻璃态、渐变背景、统一动画曲线

### 4.2 表单 Schema 驱动
- 全面使用 React-Hook-Form + Zod 定义表单 Schema，替换 AntD `<Form>` + `useState` 方案
- 封装通用组件：`<FormInput>`、`<FormSelect>`、`<FormArray>`、`<FormItemWithTooltip>` 等
- 动态条件显示与验证：利用 `useFieldArray`、`watch` 实现复杂表单逻辑

### 4.3 布局与 3D 视口
- 统一主容器：`MainContainer` 100vw×100vh，渐变背景 + 内阴影，左右可收缩侧边栏、底部状态栏
- 在 `Viewport3D.tsx` 内部保证 R3F `Canvas` 宽高 100%，支持 `useGLTF` + Draco 压缩 + LOD 切换
- 在路由层 (`router.tsx`) 全面启用 `React.lazy` + `Suspense`，分包优化首屏加载体积 (<150 KB gzip)

### 4.4 智能助理 & 语音交互
- 扩展 `AIAssistant.tsx`：集成 `TypingIndicator`、消息列表 `ChatMessage`、进度条 `ProgressBar`
- 使用 Web Speech API 实现语音输入与合成，封装 `VoiceInputButton` 与 `VoiceResponsePlayer`
- 增加 VisualGuidanceAgent 动态高亮、步骤动画、Tooltip 引导等交互辅助

### 4.5 Gmsh 物理组 & mesh_file 支持
- 在 `/meshing` 模块调用 `gmsh.model.addPhysicalGroup` + `setPhysicalName`，为面、体、线分别定义物理分组
- 导出的 `.msh` 文件将包含 `PhysicalEntities`，前端或后端可通过 `meshio` / PyVista `.cell_data"PhysicalIds"` 获取分组标签
- 修改 `TerraSolver.initialize_analysis` 接口，加载用户上传或 Meshing 生成的 `.msh`，直接构建 Kratos `ModelPart`

### 4.6 DXF 导入健壮性
- 在 `ExcavationGenerator._load_dxf_contour` 前，利用 Shapely 清理自交、多环孔洞、采样点平滑
- 增加下载/解析进度回调接口（WebSocket 或 HTTP SSE），前端显示进度条和错误提示

### 4.7 CI/CD 与自动化测试
- 在 **单机本地** 环境下配置 GitHub Actions _自托管 Runner_（或使用 `act` 工具模拟），保证离线运行能力
- 引入 Storybook，维护 Atom/Molecule/Organism 组件文档与快照测试
- 使用 Playwright/Cypress 编写关键 E2E 流程测试（表单输入、网格生成、Terra 分析启动）
- 本地脚本：`./scripts/run_all_tests.ps1` 一键执行 `npm run lint && npm test && pytest`，供无 CI 环境时快速自检
- 后端加入 pytest 单元测试与 Coverage 报告，API 文档通过 OpenAPI 同步到前端 TS 类型

## 5. 时间表与里程碑
- **Week 1（P0）**：完成全局样式与主题体系 + 表单 Schema 驱动 + 主容器布局 & 视口填充
- **Week 2（P1）**：落地 Gmsh 物理组管理 + Terra mesh_file 支持 + 智能助理增强
- **Week 3（P2）**：补齐 DXF 健壮性 + CI/CD 测试完善 + 可访问性 & 国际化

## 6. 风险与对策
- **样式迁移风险**：先逐步在新组件引入变量体系，保留 AntD 兼容层，避免一次性重构
- **表单驱动兼容性**：分批替换，保持旧表单并行，验证新旧表单输出一致性后删除旧逻辑
- **mesh_file 兼容性**：提前测试不同版本 Gmsh `.msh` 格式，编写小批量测试用例验证导入流程

## 7. 附录
- **参考文档**：`docs/design_and_implementation_comparison.md`
- **UI 原型**：https://figma.com/file/xxxxx/DeepCAD-UI 