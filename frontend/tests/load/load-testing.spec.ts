/**
 * DeepCAD负载测试
 * 3号计算专家 - 大规模并发用户模拟和性能压力测试
 */

import { test, expect, Browser, Page, chromium } from '@playwright/test';

test.describe('DeepCAD负载和压力测试', () => {
  
  test('并发用户创建项目压力测试', async () => {
    const concurrentUsers = 5; // 模拟5个并发用户
    const browser = await chromium.launch();
    
    const userSessions: Promise<void>[] = [];
    
    for (let i = 0; i < concurrentUsers; i++) {
      userSessions.push(simulateUserSession(browser, i));
    }
    
    // 等待所有用户会话完成
    const startTime = Date.now();
    await Promise.all(userSessions);
    const totalTime = Date.now() - startTime;
    
    console.log(`🏋️ 并发用户测试完成: ${concurrentUsers}个用户，总耗时: ${totalTime}ms`);
    
    // 验证系统在并发负载下的响应时间
    expect(totalTime).toBeLessThan(60000); // 1分钟内完成
    
    await browser.close();
  });

  test('大规模数据处理性能测试', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="deepcad-main-app"]');
    
    // 创建大规模测试项目
    await page.click('[data-testid="create-new-project"]');
    await page.fill('[data-testid="project-name-input"]', '大规模负载测试项目');
    await page.selectOption('[data-testid="project-type-select"]', 'deep_excavation');
    await page.click('[data-testid="confirm-create-project"]');

    // 设置大规模几何参数
    await page.click('[data-testid="geometry-modeling-tab"]');
    await page.fill('[data-testid="excavation-depth"]', '30'); // 深度30m
    await page.fill('[data-testid="excavation-width"]', '100'); // 宽度100m
    await page.fill('[data-testid="excavation-length"]', '150'); // 长度150m
    
    // 启用高精度网格
    await page.click('[data-testid="enable-high-precision-mesh"]');
    
    const geometryStartTime = Date.now();
    await page.click('[data-testid="create-geometry"]');
    await page.waitForSelector('[data-testid="geometry-preview"]', { timeout: 60000 });
    const geometryTime = Date.now() - geometryStartTime;
    
    console.log(`📐 大规模几何创建耗时: ${geometryTime}ms`);
    expect(geometryTime).toBeLessThan(45000); // 45秒内完成大规模几何创建

    // 设置复杂土层
    await page.click('[data-testid="soil-properties-tab"]');
    
    // 添加多层土体
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="add-soil-layer"]');
      await page.fill(`[data-testid="soil-layer-${i}-name"]`, `第${i+1}层土体`);
      await page.fill(`[data-testid="soil-layer-${i}-elastic-modulus"]`, String(10 + i * 5));
    }

    // 启动大规模计算分析
    await page.click('[data-testid="analysis-tab"]');
    await page.click('[data-testid="enable-high-precision-analysis"]');
    
    const analysisStartTime = Date.now();
    await page.click('[data-testid="start-analysis"]');
    
    // 监控分析进度
    let progressChecks = 0;
    while (progressChecks < 30) { // 最多检查5分钟
      try {
        await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 10000 });
        break;
      } catch {
        // 检查是否还在计算中
        const isComputing = await page.locator('[data-testid="analysis-progress"]').isVisible();
        if (!isComputing) {
          throw new Error('分析意外终止');
        }
        progressChecks++;
      }
    }
    
    const analysisTime = Date.now() - analysisStartTime;
    console.log(`🧮 大规模计算分析耗时: ${analysisTime}ms`);
    expect(analysisTime).toBeLessThan(180000); // 3分钟内完成大规模分析
  });

  test('GPU渲染性能压力测试', async ({ page }) => {
    await page.goto('/');
    await createQuickProject(page);
    
    await page.click('[data-testid="results-tab"]');
    
    // 连续快速切换不同可视化模式
    const visualizationModes = [
      'stress-cloud-visualization',
      'deformation-visualization', 
      'seepage-visualization',
      'safety-assessment-visualization'
    ];
    
    const renderingTimes: number[] = [];
    
    for (let cycle = 0; cycle < 3; cycle++) {
      console.log(`🎨 GPU渲染压力测试 - 第${cycle + 1}轮`);
      
      for (const mode of visualizationModes) {
        const startTime = Date.now();
        
        await page.click(`[data-testid="${mode}"]`);
        await page.waitForSelector(`[data-testid="${mode}-canvas"]`, { timeout: 15000 });
        
        // 等待GPU渲染稳定
        await page.waitForTimeout(1000);
        
        const renderTime = Date.now() - startTime;
        renderingTimes.push(renderTime);
        
        console.log(`  📊 ${mode} 渲染耗时: ${renderTime}ms`);
      }
    }
    
    // 验证平均渲染性能
    const avgRenderTime = renderingTimes.reduce((sum, time) => sum + time, 0) / renderingTimes.length;
    console.log(`📈 平均GPU渲染时间: ${avgRenderTime.toFixed(2)}ms`);
    
    expect(avgRenderTime).toBeLessThan(5000); // 平均5秒内完成渲染
    expect(Math.max(...renderingTimes)).toBeLessThan(10000); // 最大渲染时间不超过10秒
  });

  test('内存泄漏压力测试', async ({ page }) => {
    await page.goto('/');
    
    // 获取初始内存使用
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
    });
    
    console.log(`🧠 初始内存使用: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
    
    // 执行多轮项目创建和分析循环
    for (let i = 0; i < 5; i++) {
      console.log(`🔄 内存压力测试 - 第${i + 1}/5轮`);
      
      // 创建项目
      await page.click('[data-testid="create-new-project"]');
      await page.fill('[data-testid="project-name-input"]', `内存测试项目${i + 1}`);
      await page.selectOption('[data-testid="project-type-select"]', 'deep_excavation');
      await page.click('[data-testid="confirm-create-project"]');

      // 快速设置和分析
      await quickAnalysis(page);
      
      // 查看结果和可视化
      await page.click('[data-testid="results-tab"]');
      await page.click('[data-testid="stress-cloud-visualization"]');
      await page.waitForSelector('[data-testid="stress-cloud-canvas"]');
      
      // 清理当前项目
      await page.click('[data-testid="close-project"]');
      await page.click('[data-testid="confirm-close"]');
      
      // 检查内存使用
      const currentMemory = await page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
      });
      
      console.log(`  💾 第${i + 1}轮内存使用: ${(currentMemory / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // 强制垃圾回收
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });
    
    await page.waitForTimeout(2000); // 等待垃圾回收完成
    
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
    });
    
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
    console.log(`📊 最终内存增长: ${memoryIncrease.toFixed(2)} MB`);
    
    // 验证内存泄漏控制在合理范围内
    expect(memoryIncrease).toBeLessThan(100); // 内存增长不超过100MB
  });

  test('API响应时间压力测试', async ({ page }) => {
    await page.goto('/');
    
    // 拦截API请求以测量响应时间
    const apiResponses: { url: string; time: number }[] = [];
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        const responseTime = Date.now() - response.request().timing().requestStart;
        apiResponses.push({
          url: response.url(),
          time: responseTime
        });
      }
    });
    
    // 执行一系列API密集操作
    for (let i = 0; i < 3; i++) {
      await createQuickProject(page, `API压力测试${i + 1}`);
      await quickAnalysis(page);
      
      // 生成报告（API密集操作）
      await page.click('[data-testid="generate-report"]');
      await page.waitForSelector('[data-testid="report-ready"]', { timeout: 20000 });
      
      await page.click('[data-testid="close-project"]');
      await page.click('[data-testid="confirm-close"]');
    }
    
    // 分析API响应时间
    const avgResponseTime = apiResponses.reduce((sum, resp) => sum + resp.time, 0) / apiResponses.length;
    const maxResponseTime = Math.max(...apiResponses.map(resp => resp.time));
    
    console.log(`🌐 API平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`🌐 API最大响应时间: ${maxResponseTime}ms`);
    console.log(`🌐 总API调用次数: ${apiResponses.length}`);
    
    // 验证API性能标准
    expect(avgResponseTime).toBeLessThan(2000); // 平均响应时间小于2秒
    expect(maxResponseTime).toBeLessThan(10000); // 最大响应时间小于10秒
  });

  test('并发分析任务压力测试', async () => {
    const browser = await chromium.launch();
    const concurrentAnalyses = 3;
    
    const analysisPromises: Promise<number>[] = [];
    
    for (let i = 0; i < concurrentAnalyses; i++) {
      analysisPromises.push(runConcurrentAnalysis(browser, i));
    }
    
    const startTime = Date.now();
    const analysisTimes = await Promise.all(analysisPromises);
    const totalTime = Date.now() - startTime;
    
    console.log(`⚡ 并发分析测试完成:`);
    console.log(`  - 并发任务数: ${concurrentAnalyses}`);
    console.log(`  - 总耗时: ${totalTime}ms`);
    console.log(`  - 平均单任务时间: ${(analysisTimes.reduce((sum, t) => sum + t, 0) / analysisTimes.length).toFixed(2)}ms`);
    
    // 验证并发分析性能
    expect(totalTime).toBeLessThan(120000); // 并发分析在2分钟内完成
    analysisTimes.forEach((time, index) => {
      expect(time).toBeLessThan(60000); // 每个任务在1分钟内完成
    });
    
    await browser.close();
  });
});

/**
 * 模拟单个用户会话
 */
async function simulateUserSession(browser: Browser, userId: number): Promise<void> {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    await page.goto('/');
    await page.waitForSelector('[data-testid="deepcad-main-app"]');
    
    // 创建项目
    await page.click('[data-testid="create-new-project"]');
    await page.fill('[data-testid="project-name-input"]', `并发用户${userId}项目`);
    await page.selectOption('[data-testid="project-type-select"]', 'deep_excavation');
    await page.click('[data-testid="confirm-create-project"]');
    
    // 快速分析
    await quickAnalysis(page);
    
    console.log(`👤 用户${userId}会话完成`);
  } finally {
    await context.close();
  }
}

/**
 * 运行并发分析任务
 */
async function runConcurrentAnalysis(browser: Browser, taskId: number): Promise<number> {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    const startTime = Date.now();
    
    await page.goto('/');
    await createQuickProject(page, `并发分析任务${taskId}`);
    await quickAnalysis(page);
    
    const analysisTime = Date.now() - startTime;
    console.log(`🧮 并发分析任务${taskId}完成，耗时: ${analysisTime}ms`);
    
    return analysisTime;
  } finally {
    await context.close();
  }
}

/**
 * 快速创建项目
 */
async function createQuickProject(page: Page, projectName: string = '快速测试项目') {
  await page.click('[data-testid="create-new-project"]');
  await page.fill('[data-testid="project-name-input"]', projectName);
  await page.selectOption('[data-testid="project-type-select"]', 'deep_excavation');
  await page.click('[data-testid="confirm-create-project"]');
}

/**
 * 快速分析流程
 */
async function quickAnalysis(page: Page) {
  // 几何设置
  await page.click('[data-testid="geometry-modeling-tab"]');
  await page.fill('[data-testid="excavation-depth"]', '8');
  await page.fill('[data-testid="excavation-width"]', '20');
  await page.click('[data-testid="create-geometry"]');
  await page.waitForSelector('[data-testid="geometry-preview"]');

  // 使用默认土层参数
  await page.click('[data-testid="soil-properties-tab"]');
  await page.click('[data-testid="use-default-soil-params"]');

  // 开始分析
  await page.click('[data-testid="analysis-tab"]');
  await page.click('[data-testid="start-analysis"]');
  await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 });
}