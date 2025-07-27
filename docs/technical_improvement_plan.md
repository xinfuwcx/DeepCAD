# DeepCAD — 技术改进方案 v1.1

（根据最新讨论更新：删除"自适应网格 / Gmsh 动态网格"建议，改为 **Moving-Mesh 动网格技术**）

## 1. 项目现状概览

1. **架构**
   • FastAPI 后端（Python 3.10）
   • React + Vite 前端（TypeScript）
   • Kratos Multiphysics、PyVista、SciPy / scikit-learn、Celery & Redis

2. **主要痛点**
   • 启动不稳定：Kratos `__version__` 属性缺失导致启动中断
   • 若干文件存在空字节或历史冲突痕迹，触发 `SyntaxError: null bytes`
   • 前端脚本在 PowerShell 中需 `;` 或分两条命令执行
   • 缺少自动化测试、CI、依赖锁定、统一 lint / format 规则
   • 文档散落、缺少端到端使用手册与贡献指南

## 2. 已确认改进项

| # | 模块               | 方案                                                                            | 说明                                         |
| - | ------------------ | ------------------------------------------------------------------------------- | -------------------------------------------- |
| 1 | Kratos 接口层      | 安全访问 `__version__`：`getattr(KratosMultiphysics, "__version__", "N/A")` | 彻底避免缺失属性导致的崩溃                   |
| 2 | 可视化             | 新建 `PyVistaWebBridge`（保持轻量）                                           | 解决类缺失 `NameError`                     |
| 3 | 代码完整性         | 用 `git restore` 回滚受损文件；排查空字节                                     | 已执行，后续需在 CI 中加入文件完整性检查     |
| 4 | 启动脚本           | Windows PowerShell 下使用 `cd frontend; npm run dev`                          | 提升 DX                                      |
| 5 | Moving-Mesh 动网格 | 取代原"Gmsh 自适应网格"方案                                                   | 无需改动钻孔密度驱动的细分逻辑，后处理更简单 |
| 6 | 依赖管理           | 后端：`poetry` / `pip-tools`；前端：`pnpm` + `pnpm-lock.yaml`           | 保证可重复安装                               |
| 7 | 质量保障           | `ruff + black`（Python），`eslint + prettier`（TS）；`pytest + coverage`  | 引入 pre-commit 钩子                         |
| 8 | CI/CD              | GitHub Actions：lint → test → build → docker                                 | 自动构建并推送镜像                           |
| 9 | 文档               | 统一到 `docs/`，采用 mkdocs-material                                          | 生成静态站点，方便内部分享                   |

## 3. 动网格技术 (Moving-Mesh) 说明

1. **目的**：在地下开挖、地层变形等问题中保持网格质量，而非依赖前处理阶段的单次自适应剖分。

2. **核心思路**
   • 利用 Kratos 内置 ALE / mesh moving 功能（`MeshMovingApplication`）
   • 以土体沉降、支护结构位移作为驱动场，按时间步更新节点坐标
   • 对于大变形场景可切换 REMESH 模式，同时保持单向接口到 PyVista 的实时渲染

3. **实施步骤**
   1. 在 `core/kratos_integration.py` 暴露 `create_mesh_mover(model_part, parameters)`
   2. 在 `kratos_handler.py` 中新增 `setup_moving_mesh()` & `step_moving_mesh()`
   3. WebSocket 推送结点更新增量，前端 Three.js BufferGeometry 动态更新
   4. 结果写回 HDF5 / VTK，以便离线分析

## 4. 迭代计划

| Sprint | 时间 | 目标                                               | 里程碑                     |
| ------ | ---- | -------------------------------------------------- | -------------------------- |
| 0      | -    | **修复启动阻塞**（Kratos 版本属性 & 空字节） | Back-end 正常跑通健康检查  |
| 1      | +1 w | 依赖锁定、lint/format、CI 骨架                     | `main` 分支 CI 绿灯      |
| 2      | +2 w | Moving-Mesh MVP；PyVista Web 渲染稳定              | 挖孔案例动画演示           |
| 3      | +2 w | 单元 & 集成测试 ≥80% 覆盖；文档迁移               | docs.deepcad.internal 上线 |
| 4      | +2 w | 前端 UX 抛光、进度提示组件完善                     | "一键计算"演示视频       |

## 5. 待办清单（精简）

1. [ ] core: 安全获取 Kratos 版本
2. [ ] gateway.visualization: 恢复/实现 `PyVistaWebBridge`
3. [ ] scripts: Windows/Linux 启动脚本分离
4. [ ] infra: 选型并落地依赖管理工具
5. [ ] ci: 配置 GitHub Actions + pre-commit
6. [ ] mesh: 引入 Moving-Mesh pipeline（详见 §3）
7. [ ] docs: mkdocs 初始化 & 迁移