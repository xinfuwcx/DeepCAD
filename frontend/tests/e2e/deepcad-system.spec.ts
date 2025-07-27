/**
 * DeepCAD深基坑CAE平台端到端测试
 * 3号计算专家 - 完整系统工作流测试
 */

import { test, expect, Page } from '@playwright/test';

test.describe('DeepCAD深基坑CAE平台 - 完整工作流', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('http://localhost:5173');
    
    // 等待应用加载完成
    await page.waitForSelector('[data-testid="deepcad-main-app"]', { timeout: 10000 });
  });

  test('完整深基坑分析工作流 - 从项目创建到结果导出', async () => {
    // 1. 创建新项目
    await page.click('[data-testid="create-new-project"]');
    await page.fill('[data-testid="project-name-input"]', 'E2E测试基坑项目');
    await page.selectOption('[data-testid="project-type-select"]', 'deep_excavation');
    await page.click('[data-testid="confirm-create-project"]');

    // 验证项目创建成功
    await expect(page.locator('[data-testid="project-title"]')).toContainText('E2E测试基坑项目');

    // 2. 几何建模阶段
    await page.click('[data-testid="geometry-modeling-tab"]');
    
    // 设置基坑几何参数
    await page.fill('[data-testid="excavation-depth"]', '10');
    await page.fill('[data-testid="excavation-width"]', '30');
    await page.fill('[data-testid="excavation-length"]', '40');
    
    // 确认几何创建
    await page.click('[data-testid="create-geometry"]');
    await page.waitForSelector('[data-testid="geometry-preview"]', { timeout: 15000 });

    // 验证几何模型显示
    await expect(page.locator('[data-testid="geometry-status"]')).toContainText('几何创建完成');

    // 3. 土层参数设置
    await page.click('[data-testid="soil-properties-tab"]');
    
    // 添加土层
    await page.click('[data-testid="add-soil-layer"]');
    await page.fill('[data-testid="soil-layer-0-name"]', '粘土层');
    await page.fill('[data-testid="soil-layer-0-elastic-modulus"]', '15');
    await page.fill('[data-testid="soil-layer-0-poisson-ratio"]', '0.3');
    await page.fill('[data-testid="soil-layer-0-cohesion"]', '25');
    await page.fill('[data-testid="soil-layer-0-friction-angle"]', '18');

    // 4. 围护结构设计
    await page.click('[data-testid="retaining-system-tab"]');
    await page.selectOption('[data-testid="wall-type-select"]', 'diaphragm_wall');
    await page.fill('[data-testid="wall-thickness"]', '0.8');
    
    // 添加支撑
    await page.click('[data-testid="add-support-level"]');
    await page.fill('[data-testid="support-elevation-0"]', '-2');
    await page.fill('[data-testid="support-prestress-0"]', '300');

    // 5. 开始计算分析
    await page.click('[data-testid="analysis-tab"]');
    await page.click('[data-testid="start-analysis"]');

    // 等待计算完成（带进度监控）
    await page.waitForSelector('[data-testid="analysis-progress"]', { timeout: 5000 });
    
    // 验证计算进度显示
    const progressText = await page.locator('[data-testid="analysis-progress"]').textContent();
    expect(progressText).toMatch(/计算进行中|计算完成/);

    // 等待计算完成
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 });
    await expect(page.locator('[data-testid="analysis-status"]')).toContainText('分析完成');

    // 6. 结果可视化验证
    await page.click('[data-testid="results-tab"]');
    
    // 验证应力云图显示
    await page.click('[data-testid="stress-cloud-visualization"]');
    await page.waitForSelector('[data-testid="stress-cloud-canvas"]', { timeout: 10000 });
    
    // 验证应力值范围显示
    const stressLegend = page.locator('[data-testid="stress-legend"]');
    await expect(stressLegend).toBeVisible();
    
    // 验证变形云图显示
    await page.click('[data-testid="deformation-visualization"]');
    await page.waitForSelector('[data-testid="deformation-canvas"]', { timeout: 10000 });

    // 7. 安全性评估结果
    await page.click('[data-testid="safety-assessment-tab"]');
    
    // 验证安全系数显示
    const safetyFactor = await page.locator('[data-testid="overall-safety-factor"]').textContent();
    expect(parseFloat(safetyFactor || '0')).toBeGreaterThan(1.0);
    
    // 验证最大变形值
    const maxDeformation = await page.locator('[data-testid="max-deformation-value"]').textContent();
    expect(parseFloat(maxDeformation || '0')).toBeLessThan(50); // mm

    // 8. 报告生成和导出
    await page.click('[data-testid="generate-report"]');
    
    // 等待报告生成
    await page.waitForSelector('[data-testid="report-ready"]', { timeout: 15000 });
    
    // 开始下载
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-pdf-report"]');
    const download = await downloadPromise;
    
    // 验证下载文件名
    expect(download.suggestedFilename()).toMatch(/E2E测试基坑项目.*\.pdf/);

    // 9. 项目保存验证
    await page.click('[data-testid="save-project"]');
    await page.waitForSelector('[data-testid="save-success"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="save-status"]')).toContainText('保存成功');
  });

  test('性能监控 - 大规模计算性能测试', async () => {
    // 创建大规模项目
    await page.click('[data-testid="create-new-project"]');
    await page.fill('[data-testid="project-name-input"]', '大规模性能测试');
    await page.selectOption('[data-testid="project-type-select"]', 'deep_excavation');
    await page.click('[data-testid="confirm-create-project"]');

    // 设置大规模几何参数
    await page.click('[data-testid="geometry-modeling-tab"]');
    await page.fill('[data-testid="excavation-depth"]', '25');
    await page.fill('[data-testid="excavation-width"]', '100');
    await page.fill('[data-testid="excavation-length"]', '150');

    // 启用性能监控
    await page.click('[data-testid="enable-performance-monitoring"]');
    
    // 开始计算并监控性能
    await page.click('[data-testid="analysis-tab"]');
    
    const startTime = Date.now();
    await page.click('[data-testid="start-analysis"]');
    
    // 监控内存使用
    await page.waitForSelector('[data-testid="memory-usage-monitor"]', { timeout: 5000 });
    
    // 验证性能指标显示
    const memoryUsage = page.locator('[data-testid="current-memory-usage"]');
    await expect(memoryUsage).toBeVisible();
    
    const cpuUsage = page.locator('[data-testid="current-cpu-usage"]');
    await expect(cpuUsage).toBeVisible();

    // 等待计算完成
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 60000 });
    const endTime = Date.now();
    
    // 验证计算时间在合理范围内
    const computationTime = endTime - startTime;
    expect(computationTime).toBeLessThan(45000); // 45秒内完成大规模计算

    // 验证最终性能报告
    await page.click('[data-testid="performance-report"]');
    const performanceData = await page.locator('[data-testid="performance-summary"]').textContent();
    expect(performanceData).toContain('计算完成');
    expect(performanceData).toContain('内存峰值');
  });

  test('错误处理 - 异常情况恢复测试', async () => {
    // 创建项目
    await page.click('[data-testid="create-new-project"]');
    await page.fill('[data-testid="project-name-input"]', '错误恢复测试');
    await page.selectOption('[data-testid="project-type-select"]', 'deep_excavation');
    await page.click('[data-testid="confirm-create-project"]');

    // 1. 测试无效参数处理
    await page.click('[data-testid="geometry-modeling-tab"]');
    await page.fill('[data-testid="excavation-depth"]', '-5'); // 无效负值
    
    await page.click('[data-testid="create-geometry"]');
    
    // 验证错误提示显示
    await expect(page.locator('[data-testid="error-message"]')).toContainText('开挖深度必须为正值');
    
    // 修正参数
    await page.fill('[data-testid="excavation-depth"]', '8');
    await page.click('[data-testid="create-geometry"]');
    await page.waitForSelector('[data-testid="geometry-preview"]', { timeout: 10000 });

    // 2. 测试计算中断恢复
    await page.click('[data-testid="analysis-tab"]');
    await page.click('[data-testid="start-analysis"]');
    
    // 等待计算开始
    await page.waitForSelector('[data-testid="analysis-progress"]', { timeout: 5000 });
    
    // 模拟中断
    await page.click('[data-testid="stop-analysis"]');
    await expect(page.locator('[data-testid="analysis-status"]')).toContainText('计算已停止');
    
    // 恢复计算
    await page.click('[data-testid="resume-analysis"]');
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 });

    // 3. 测试GPU回退机制
    // 模拟GPU不可用
    await page.evaluate(() => {
      (window as any).mockGPUFailure = true;
    });
    
    await page.click('[data-testid="results-tab"]');
    await page.click('[data-testid="stress-cloud-visualization"]');
    
    // 验证WebGL回退提示
    await expect(page.locator('[data-testid="gpu-fallback-notice"]')).toContainText('使用WebGL渲染');
    
    // 验证可视化仍然正常工作
    await page.waitForSelector('[data-testid="stress-cloud-canvas"]', { timeout: 10000 });
  });

  test('多项目管理 - 并发项目操作', async () => {
    // 创建第一个项目
    await page.click('[data-testid="create-new-project"]');
    await page.fill('[data-testid="project-name-input"]', '并发测试项目1');
    await page.selectOption('[data-testid="project-type-select"]', 'deep_excavation');
    await page.click('[data-testid="confirm-create-project"]');

    // 快速设置几何和开始计算
    await page.click('[data-testid="geometry-modeling-tab"]');
    await page.fill('[data-testid="excavation-depth"]', '8');
    await page.fill('[data-testid="excavation-width"]', '20');
    await page.click('[data-testid="create-geometry"]');
    await page.waitForSelector('[data-testid="geometry-preview"]');

    await page.click('[data-testid="analysis-tab"]');
    await page.click('[data-testid="start-analysis"]');

    // 在新标签页创建第二个项目
    const secondPage = await page.context().newPage();
    await secondPage.goto('http://localhost:5173');
    await secondPage.waitForSelector('[data-testid="deepcad-main-app"]');

    await secondPage.click('[data-testid="create-new-project"]');
    await secondPage.fill('[data-testid="project-name-input"]', '并发测试项目2');
    await secondPage.selectOption('[data-testid="project-type-select"]', 'deep_excavation');
    await secondPage.click('[data-testid="confirm-create-project"]');

    // 设置不同参数
    await secondPage.click('[data-testid="geometry-modeling-tab"]');
    await secondPage.fill('[data-testid="excavation-depth"]', '12');
    await secondPage.fill('[data-testid="excavation-width"]', '25');
    await secondPage.click('[data-testid="create-geometry"]');
    await secondPage.waitForSelector('[data-testid="geometry-preview"]');

    await secondPage.click('[data-testid="analysis-tab"]');
    await secondPage.click('[data-testid="start-analysis"]');

    // 验证两个项目都能正常计算
    await Promise.all([
      page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 }),
      secondPage.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 })
    ]);

    // 验证结果不冲突
    const result1 = await page.locator('[data-testid="max-deformation-value"]').textContent();
    const result2 = await secondPage.locator('[data-testid="max-deformation-value"]').textContent();
    
    expect(result1).not.toBe(result2); // 不同参数应有不同结果

    await secondPage.close();
  });

  test('移动端响应式测试', async () => {
    // 模拟移动设备
    await page.setViewportSize({ width: 375, height: 667 });

    await page.click('[data-testid="create-new-project"]');
    await page.fill('[data-testid="project-name-input"]', '移动端测试项目');
    await page.selectOption('[data-testid="project-type-select"]', 'deep_excavation');
    await page.click('[data-testid="confirm-create-project"]');

    // 验证移动端界面适配
    await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
    
    // 验证折叠菜单工作
    await page.click('[data-testid="mobile-menu-toggle"]');
    await expect(page.locator('[data-testid="navigation-menu"]')).toBeVisible();

    // 验证移动端几何设置
    await page.click('[data-testid="geometry-modeling-tab"]');
    await page.fill('[data-testid="excavation-depth"]', '6');
    
    // 验证移动端可视化
    await page.click('[data-testid="create-geometry"]');
    await page.waitForSelector('[data-testid="geometry-preview"]');
    
    // 验证触控操作
    await page.touchscreen.tap(200, 300); // 点击预览区域
    
    // 验证移动端计算界面
    await page.click('[data-testid="analysis-tab"]');
    await page.click('[data-testid="start-analysis"]');
    
    // 验证进度显示适配移动端
    await page.waitForSelector('[data-testid="mobile-progress-indicator"]');
    
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 });
    
    // 验证移动端结果查看
    await page.click('[data-testid="results-tab"]');
    await page.click('[data-testid="stress-cloud-visualization"]');
    
    // 验证移动端可视化控件
    await expect(page.locator('[data-testid="mobile-visualization-controls"]')).toBeVisible();
  });

  test('系统稳定性 - 长时间运行测试', async () => {
    // 创建项目
    await page.click('[data-testid="create-new-project"]');
    await page.fill('[data-testid="project-name-input"]', '稳定性测试项目');
    await page.selectOption('[data-testid="project-type-select"]', 'deep_excavation');
    await page.click('[data-testid="confirm-create-project"]');

    // 执行多轮计算测试
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid="geometry-modeling-tab"]');
      await page.fill('[data-testid="excavation-depth"]', String(8 + i * 2));
      await page.fill('[data-testid="excavation-width"]', String(20 + i * 5));
      
      await page.click('[data-testid="create-geometry"]');
      await page.waitForSelector('[data-testid="geometry-preview"]');

      await page.click('[data-testid="analysis-tab"]');
      await page.click('[data-testid="start-analysis"]');
      await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 });

      // 验证每轮计算后内存稳定
      const memoryInfo = await page.evaluate(() => {
        return (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize
        } : { used: 0, total: 0 };
      });
      
      // 验证内存使用合理（小于1GB）
      expect(memoryInfo.used).toBeLessThan(1024 * 1024 * 1024);

      // 清理上轮结果
      await page.click('[data-testid="clear-results"]');
    }

    // 验证系统仍然响应正常
    await expect(page.locator('[data-testid="deepcad-main-app"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-title"]')).toContainText('稳定性测试项目');
  });
});