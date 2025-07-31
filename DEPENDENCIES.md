# DeepCAD 依赖库管理总结 (兼容性修正版 2025-07-30)

## 项目依赖结构

### 前端依赖 (frontend/package.json) - 兼容性修正版
- **框架**: React 18.3.1, Vite 5.4.19 (稳定兼容版本)
- **3D图形**: Three.js 0.171.0, @react-three/fiber 8.18.0, @react-three/drei 9.122.0
- **UI组件**: Ant Design 5.26.7 (包含React 19兼容修复), Framer Motion 11.18.2
- **状态管理**: Zustand 5.0.6, Immer 10.1.1
- **表单验证**: React Hook Form 7.54.2, Zod 3.25.76
- **数据可视化**: Recharts 2.15.4, D3 7.9.0
- **路由**: React Router DOM 6.30.1
- **测试**: Vitest 2.1.9, Testing Library
- **开发工具**: TypeScript 5.2.2, ESLint 6.21.0

### 后端依赖 (requirements.txt)
#### 核心框架
- **Web框架**: FastAPI 0.115.0+, Uvicorn 0.35.0+, Starlette 0.47.2+
- **数据验证**: Pydantic 2.10.0+
- **数据库**: SQLAlchemy 2.0.42+, PostgreSQL支持

#### 科学计算 - 兼容性修正版
- **数值计算**: NumPy 2.1.0-2.2.x, SciPy 1.14.0-1.15.x, Pandas 2.2.0-2.3.x
- **可视化**: Matplotlib 3.9.0-3.10.x, VTK 9.4.0-9.5.x, PyVista 0.45.0-0.45.x
- **深度学习**: PyTorch 2.6.0 (CUDA 12.1兼容), TensorFlow 2.17.0-2.18.x

#### CAE专用库
- **几何建模**: Gmsh 4.13.1+, EZDXF 1.3.4+, Shapely 2.1.0+
- **网格处理**: Netgen 6.2.2506+, MeshIO 5.3.7+
- **地质建模**: GemPy 2025.1.0 (实际存在版本), GSTools 1.5.2+
- **多物理场**: Kratos Multiphysics 10.3.0+ (预安装)

#### GPU计算
- **WebGPU**: WGPU 0.18.0+, ModernGL 5.12.0+
- **并行计算**: CuPY 13.4.0+, Numba 0.61.0+
- **大数据**: Dask 2024.12.0+, XArray 2024.11.0+

### 服务特定依赖

#### 网格服务 (services/meshing_service/)
- Gmsh 4.13.1+
- MeshIO 5.3.7+
- FastAPI 0.115.0+

#### 后处理服务 (services/postprocessing_service/)
- PyVista[all] 0.45.3+
- VTK 9.5.0+
- Matplotlib 3.10.0+

#### 深基坑后端 (deep_excavation/backend/)
- 完整科学计算栈
- Kratos集成
- 地质建模支持

## 安全更新记录

### 前端安全修复
- **Vite**: 5.4.10 → 7.0.6 (修复esbuild安全漏洞)
- **Vitest**: 2.0.5 → 3.2.4 (修复相关漏洞)

### 版本升级亮点
- **React生态**: 升级到React 19.1.1，支持新特性
- **Three.js**: 0.171.0 → 0.178.0，性能优化
- **科学计算**: NumPy 2.3.2+, SciPy 1.16.1+，数值精度提升
- **地质建模**: GemPy升级到2025.2.0，新增功能

## 依赖管理策略

### 版本固定原则
1. **核心框架**: 使用`>=`版本约束，确保兼容性
2. **科学计算**: 固定主要版本，避免API变更
3. **开发工具**: 跟随最新稳定版本
4. **安全补丁**: 及时更新修复漏洞

### 依赖分层
```
应用层: React/FastAPI应用代码
├── UI层: Ant Design, Three.js, 图表组件
├── 业务层: CAE计算, 地质建模, WebGPU
├── 数据层: NumPy, VTK, 数据库ORM
└── 系统层: Node.js, Python运行时
```

### 构建优化
- **前端**: Vite构建优化，Tree-shaking
- **后端**: 按服务拆分依赖，减少镜像大小
- **GPU**: CUDA工具链版本匹配

## 后续维护计划

1. **定期更新**: 每月检查安全更新
2. **兼容性测试**: 主要版本升级前完整测试
3. **性能监控**: 跟踪依赖库性能影响
4. **文档同步**: 保持依赖文档最新

## 注意事项

- Kratos Multiphysics需要预安装，不通过pip管理
- PyTorch需要对应CUDA工具链支持
- WebGPU功能主要在前端实现，后端提供数据支持
- 地质建模库GemPy包含复杂依赖链，需谨慎更新