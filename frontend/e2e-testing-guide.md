# DeepCAD E2E测试指南

这是DeepCAD深基坑CAE分析平台的端到端（E2E）测试框架指南。我们使用Playwright构建了全面的E2E测试套件，确保整个应用的功能完整性和用户体验质量。

## 🎯 测试框架概述

### 核心技术栈
- **Playwright** - 跨浏览器E2E测试框架
- **TypeScript** - 类型安全的测试代码
- **Page Object Model** - 结构化的页面对象设计模式
- **Test Data Management** - 自动化测试数据生成和管理
- **API Integration** - 前后端集成测试

### 测试覆盖范围
- ✅ 基础导航和用户界面
- ✅ DXF文件导入工作流程
- ✅ 几何建模操作
- ✅ 网格生成和配置
- ✅ 物理组管理
- ✅ 3D视口交互
- ✅ API集成测试
- ✅ 性能和稳定性测试

## 🚀 快速开始

### 环境准备

```bash
# 1. 安装依赖
cd frontend
npm install

# 2. 安装Playwright浏览器
npm run test:install

# 3. 启动后端服务
cd ../gateway
python start_backend.py

# 4. 启动前端服务
cd ../frontend
npm run dev
```

### 运行测试

```bash
# 运行所有E2E测试
npm run test:e2e

# 在可视化界面中运行测试
npm run test:e2e:ui

# 在有头模式下运行测试（可以看到浏览器）
npm run test:e2e:headed

# 调试单个测试
npm run test:e2e:debug

# 查看测试报告
npm run test:e2e:report
```

### 运行特定测试

```bash
# 运行特定测试文件
npx playwright test specs/01-basic-navigation.spec.ts

# 运行特定测试用例
npx playwright test -g "DXF导入工作流程"

# 在特定浏览器中运行
npx playwright test --project=firefox

# 运行失败的测试
npx playwright test --last-failed
```

## 📁 项目结构

```
tests/e2e/
├── fixtures/
│   └── base-test.ts              # 测试基础配置和固件
├── pages/
│   ├── BasePage.ts               # 页面对象基类
│   ├── DashboardPage.ts          # 仪表板页面对象
│   ├── DXFImportPage.ts          # DXF导入页面对象
│   ├── GeometryPage.ts           # 几何建模页面对象
│   └── MeshingPage.ts            # 网格生成页面对象
├── specs/
│   ├── 01-basic-navigation.spec.ts    # 基础导航测试
│   ├── 02-dxf-import-workflow.spec.ts # DXF导入流程测试
│   ├── 03-geometry-modeling.spec.ts   # 几何建模测试
│   └── 04-meshing-advanced.spec.ts    # 高级网格测试
├── utils/
│   ├── TestDataManager.ts        # 测试数据管理
│   └── ApiHelper.ts              # API辅助工具
├── test-data/                    # 测试数据目录（自动生成）
├── global-setup.ts              # 全局测试设置
└── global-teardown.ts           # 全局测试清理
```

## 📋 测试用例说明

### 1. 基础导航测试 (`01-basic-navigation.spec.ts`)

**测试目标**: 验证应用的基础功能和导航体验

**主要测试点**:
- 应用启动和主页加载
- 主导航菜单功能
- 响应式布局适配
- 主题和语言切换
- 搜索功能
- 键盘导航支持
- 面包屑导航
- 错误页面处理

**示例用法**:
```typescript
test('主导航菜单功能', async ({ page, dashboardPage }) => {
  await dashboardPage.goto();
  await dashboardPage.verifyPageLoaded();
  
  // 测试导航到几何建模
  await dashboardPage.navigateToGeometry();
  expect(page.url()).toContain('/geometry');
});
```

### 2. DXF导入工作流程测试 (`02-dxf-import-workflow.spec.ts`)

**测试目标**: 验证DXF文件导入的完整工作流程

**主要测试点**:
- 基本DXF文件上传和分析
- 复杂DXF文件处理
- 图层过滤功能
- 处理选项配置
- 错误文件处理
- 文件下载功能
- 拖拽上传
- API集成测试
- 性能测试

**示例用法**:
```typescript
test('基本DXF文件上传和分析', async ({ dxfImportPage, testDataManager }) => {
  const testDXFPath = await testDataManager.createTestDXF('test.dxf');
  
  await dxfImportPage.uploadDXFFile(testDXFPath);
  await dxfImportPage.analyzeDXFFile();
  
  const statistics = await dxfImportPage.getStatistics();
  expect(statistics['总实体数']).toBeGreaterThan(0);
});
```

### 3. 几何建模测试 (`03-geometry-modeling.spec.ts`)

**测试目标**: 验证3D几何建模功能

**主要测试点**:
- 基础几何体创建
- 3D视口交互
- 对象选择和编辑
- 材质设置
- 视图控制
- 测量工具
- 导入导出功能

### 4. 网格生成测试 (`04-meshing-advanced.spec.ts`)

**测试目标**: 验证高级网格生成功能

**主要测试点**:
- 基础网格生成
- 高级网格配置
- 物理组管理
- 性能估算
- 网格质量分析
- 并行计算

## 🎨 Page Object Model设计

### BasePage基类

所有页面对象都继承自`BasePage`，提供通用功能：

```typescript
export abstract class BasePage {
  // 通用导航方法
  async navigateTo(path: string);
  async waitForPageLoad();
  
  // 通用元素查找
  protected getElement(selector: string);
  protected getElementByText(text: string);
  protected getElementByTestId(testId: string);
  
  // 通用交互方法
  async clickElement(selector: string);
  async fillInput(selector: string, text: string);
  async uploadFile(inputSelector: string, filePath: string);
  
  // 等待和验证
  async waitForApiResponse(urlPattern: string);
  async takeScreenshot(name: string);
  async checkConsoleErrors();
}
```

### 页面专用方法

每个页面对象都实现特定的业务逻辑方法：

```typescript
// DXFImportPage示例
class DXFImportPage extends BasePage {
  async uploadDXFFile(filePath: string);
  async analyzeDXFFile();
  async configureProcessingOptions(options);
  async getStatistics();
  async waitForProcessingComplete();
}
```

## 🔧 测试数据管理

### 自动化测试数据生成

`TestDataManager`类提供完整的测试数据管理：

```typescript
// 创建测试用DXF文件
const testFile = await testDataManager.createTestDXF('basic.dxf');
const complexFile = await testDataManager.createComplexTestDXF('complex.dxf');
const corruptedFile = await testDataManager.createCorruptedDXF('corrupted.dxf');

// 创建测试项目
const project = await testDataManager.createTestProject('测试项目');

// 创建测试材料
const materials = await testDataManager.createTestMaterials();
```

### 数据清理

测试完成后自动清理测试数据：

```typescript
test.afterAll(async ({ testDataManager }) => {
  await testDataManager.cleanup();
});
```

## 🔗 API集成测试

### API辅助工具

`ApiHelper`类提供直接的API测试能力：

```typescript
// 健康检查
const isHealthy = await apiHelper.healthCheck();

// DXF文件处理
const analysisResult = await apiHelper.analyzeDXFFile(filePath);
const uploadResult = await apiHelper.uploadDXFFile(filePath, options);

// 等待异步操作完成
const finalResult = await apiHelper.waitForAsyncOperation(
  () => apiHelper.getDXFImportStatus(importId),
  (result) => result.status === 'completed',
  30000
);
```

### 性能测试

测量API响应性能：

```typescript
const performance = await apiHelper.measureApiPerformance(
  () => apiHelper.analyzeDXFFile(testFile),
  10
);

expect(performance.averageTime).toBeLessThan(5000);
expect(performance.successRate).toBeGreaterThan(0.95);
```

## 📊 测试报告和CI/CD

### 本地测试报告

```bash
# 生成HTML报告
npx playwright test --reporter=html

# 查看报告
npx playwright show-report
```

### CI/CD集成

GitHub Actions自动运行测试：

```yaml
- name: Run E2E tests
  run: npx playwright test --project=chromium
  
- name: Upload test results
  uses: actions/upload-artifact@v4
  with:
    name: e2e-results
    path: test-results/
```

### 测试报告特性

- 📸 自动截图（失败时）
- 🎥 视频录制（失败时）
- 📋 详细的执行日志
- 📈 性能指标统计
- 🔍 交互式调试

## 🛠️ 调试和故障排除

### 调试技巧

1. **可视化调试**:
   ```bash
   npm run test:e2e:debug
   ```

2. **暂停执行**:
   ```typescript
   await page.pause(); // 在测试中暂停
   ```

3. **查看网络请求**:
   ```typescript
   page.on('request', request => console.log(request.url()));
   ```

4. **截图调试**:
   ```typescript
   await page.screenshot({ path: 'debug.png' });
   ```

### 常见问题解决

**Q: 测试超时**
```typescript
// 增加超时时间
test.setTimeout(60000);

// 或者在等待时设置超时
await page.waitForSelector('.element', { timeout: 10000 });
```

**Q: 元素找不到**
```typescript
// 使用更灵活的选择器
await page.getByRole('button', { name: '提交' }).click();
await page.getByText('保存').click();
```

**Q: 网络请求失败**
```typescript
// 等待网络空闲
await page.waitForLoadState('networkidle');

// 等待特定API响应
await page.waitForResponse(response => 
  response.url().includes('/api/upload') && response.status() === 200
);
```

## 📈 性能和最佳实践

### 测试性能优化

1. **并行执行**: 默认启用并行测试
2. **浏览器复用**: 自动管理浏览器实例
3. **智能等待**: 使用Playwright的智能等待机制
4. **资源清理**: 自动清理测试数据和临时文件

### 编写测试的最佳实践

1. **使用Page Object Model**: 保持测试代码的可维护性
2. **独立的测试用例**: 每个测试应该独立运行
3. **清晰的断言**: 使用描述性的断言信息
4. **适当的等待**: 避免硬编码的延迟
5. **测试数据隔离**: 使用独立的测试数据

### 示例最佳实践

```typescript
test('用户完整工作流程', async ({ 
  dashboardPage, 
  dxfImportPage, 
  meshingPage, 
  testDataManager 
}) => {
  // 1. 准备测试数据
  const testFile = await testDataManager.createTestDXF('workflow.dxf');
  
  // 2. 导航到起始页面
  await dashboardPage.goto();
  await dashboardPage.verifyPageLoaded();
  
  // 3. 执行主要工作流程
  await dashboardPage.navigateToDXFImport();
  await dxfImportPage.uploadDXFFile(testFile);
  await dxfImportPage.analyzeDXFFile();
  
  // 4. 验证结果
  const statistics = await dxfImportPage.getStatistics();
  expect(statistics['总实体数']).toBeGreaterThan(0);
  
  // 5. 继续后续流程
  await dxfImportPage.processDXFFile();
  await dxfImportPage.waitForProcessingComplete();
  
  // 6. 验证最终状态
  const isSuccessful = await dxfImportPage.isProcessingSuccessful();
  expect(isSuccessful).toBe(true);
});
```

## 🔄 持续改进

### 测试覆盖率监控

- 定期审查测试覆盖范围
- 添加新功能的测试用例
- 重构和优化现有测试

### 测试维护

- 定期更新选择器和断言
- 优化测试执行时间
- 保持测试数据的时效性

### 团队协作

- 统一的测试编写规范
- 代码审查包含测试
- 测试失败时及时修复

---

这个E2E测试框架为DeepCAD平台提供了全面的质量保证，确保每个功能模块都能在真实用户场景下正常工作。通过持续的测试和改进，我们能够及早发现问题，提供更稳定、可靠的用户体验。