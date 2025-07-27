# DeepCAD 测试覆盖率报告

本文档记录了 DeepCAD 前端项目的测试覆盖情况。

## 已测试的模块

### 状态管理 (Stores)

| 模块 | 测试文件 | 覆盖率 | 备注 |
|------|----------|--------|------|
| `useSceneStore` | `src/stores/__tests__/useSceneStore.test.ts` | 中等 | 测试了核心场景操作、组件操作、选择操作和视图设置 |
| `useViewportStore` | `src/stores/__tests__/useViewportStore.test.ts` | 高 | 全面测试了工具栏操作、视口配置、网格操作、坐标系操作、测量功能和相机控制 |

### 视图组件 (Views)

| 模块 | 测试文件 | 覆盖率 | 备注 |
|------|----------|--------|------|
| `DashboardView` | `src/views/__tests__/DashboardView.test.tsx` | 中等 | 测试了仪表板渲染、项目统计、任务进度和导航功能 |

### 组件 (Components)

| 模块 | 测试文件 | 覆盖率 | 备注 |
|------|----------|--------|------|
| `TestClient` | `src/components/__tests__/TestClient.test.tsx` | 高 | 测试了组件渲染、API 调用成功和失败的情况 |
| `DiaphragmWallForm` | `src/components/forms/__tests__/DiaphragmWallForm.test.tsx` | 中等 | 测试了表单渲染、表单提交和表单切换功能 |

### 工具函数 (Utils)

| 模块 | 测试文件 | 覆盖率 | 备注 |
|------|----------|--------|------|
| `helpers` | `src/utils/__tests__/helpers.test.ts` | 高 | 测试了多个工具函数，包括 `shallowEqual`、`deepEqual`、`formatNumber`、`formatFileSize` 等 |

## 未测试的模块

以下是尚未测试的关键模块，建议优先添加测试：

1. **核心组件**:
   - `Viewport3D`
   - `SceneTree`
   - `PropertyEditor`
   - `PostProcessingControls`

2. **自定义 Hooks**:
   - `useComponentGizmo`
   - `useGridSettings`
   - `useMovingMesh`
   - `useDXFImport`

3. **其他状态管理**:
   - `useUIStore`
   - `useResultsStore`

## 测试覆盖率目标

- **短期目标**: 为所有核心组件和状态管理添加基本测试，达到 50% 的覆盖率。
- **中期目标**: 扩展测试覆盖范围，包括更多边缘情况和错误处理，达到 70% 的覆盖率。
- **长期目标**: 实现 80% 以上的测试覆盖率，包括完整的集成测试。

## 如何提高测试覆盖率

1. **优先测试关键功能**: 首先为核心功能和经常使用的组件添加测试。
2. **测试边缘情况**: 确保测试包括错误处理、边界条件和异常情况。
3. **使用快照测试**: 对于 UI 组件，可以使用快照测试确保视觉一致性。
4. **集成测试**: 添加跨组件的集成测试，确保组件之间的交互正常。
5. **自动化测试**: 在 CI/CD 流程中集成测试，确保每次提交都运行测试。

## 如何运行测试

```bash
# 运行所有测试
pnpm test

# 以监视模式运行测试
pnpm test:watch

# 在 UI 界面中运行测试
pnpm test:ui

# 生成测试覆盖率报告
pnpm test:coverage
``` 