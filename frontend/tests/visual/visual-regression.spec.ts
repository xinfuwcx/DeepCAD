/**
 * DeepCAD视觉回归测试
 * 3号计算专家 - UI一致性和视觉效果验证
 */

import { test, expect, Page } from '@playwright/test';

test.describe('DeepCAD视觉回归测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="deepcad-main-app"]');
  });

  test('主界面视觉一致性验证', async ({ page }) => {
    // 等待所有UI元素加载完成
    await page.waitForLoadState('networkidle');
    
    // 隐藏动态内容（时间、随机数等）
    await page.addStyleTag({
      content: `
        [data-testid="current-time"],
        [data-testid="session-id"],
        .loading-animation {
          visibility: hidden !important;
        }
      `
    });

    // 截图对比
    await expect(page).toHaveScreenshot('main-interface.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('项目创建界面视觉验证', async ({ page }) => {
    await page.click('[data-testid="create-new-project"]');
    await page.waitForSelector('[data-testid="project-creation-dialog"]');
    
    await expect(page.locator('[data-testid="project-creation-dialog"]')).toHaveScreenshot(
      'project-creation-dialog.png'
    );
  });

  test('几何建模界面视觉验证', async ({ page }) => {
    // 创建测试项目
    await page.click('[data-testid="create-new-project"]');
    await page.fill('[data-testid="project-name-input"]', '视觉测试项目');
    await page.selectOption('[data-testid="project-type-select"]', 'deep_excavation');
    await page.click('[data-testid="confirm-create-project"]');

    // 进入几何建模
    await page.click('[data-testid="geometry-modeling-tab"]');
    await page.waitForSelector('[data-testid="geometry-canvas"]');
    
    // 设置标准参数
    await page.fill('[data-testid="excavation-depth"]', '10');
    await page.fill('[data-testid="excavation-width"]', '30');
    await page.click('[data-testid="create-geometry"]');
    
    // 等待几何生成完成
    await page.waitForSelector('[data-testid="geometry-preview"]', { timeout: 15000 });
    
    await expect(page.locator('[data-testid="geometry-modeling-panel"]')).toHaveScreenshot(
      'geometry-modeling-interface.png'
    );
  });

  test('应力云图可视化视觉验证', async ({ page }) => {
    // 快速创建项目并完成分析
    await createAndAnalyzeProject(page);
    
    // 进入结果查看
    await page.click('[data-testid="results-tab"]');
    await page.click('[data-testid="stress-cloud-visualization"]');
    
    // 等待应力云图渲染完成
    await page.waitForSelector('[data-testid="stress-cloud-canvas"]', { timeout: 20000 });
    await page.waitForTimeout(2000); // 等待WebGPU渲染稳定
    
    await expect(page.locator('[data-testid="visualization-container"]')).toHaveScreenshot(
      'stress-cloud-visualization.png',
      { threshold: 0.3 } // GPU渲染可能有细微差异
    );
  });

  test('变形动画视觉验证', async ({ page }) => {
    await createAndAnalyzeProject(page);
    
    await page.click('[data-testid="results-tab"]');
    await page.click('[data-testid="deformation-animation"]');
    await page.waitForSelector('[data-testid="deformation-canvas"]');
    
    // 暂停动画以获得一致的截图
    await page.click('[data-testid="pause-animation"]');
    await page.waitForTimeout(1000);
    
    await expect(page.locator('[data-testid="deformation-container"]')).toHaveScreenshot(
      'deformation-animation.png'
    );
  });

  test('报告预览界面视觉验证', async ({ page }) => {
    await createAndAnalyzeProject(page);
    
    await page.click('[data-testid="generate-report"]');
    await page.waitForSelector('[data-testid="report-preview"]', { timeout: 10000 });
    
    await expect(page.locator('[data-testid="report-preview-container"]')).toHaveScreenshot(
      'report-preview.png',
      { fullPage: true }
    );
  });

  test('响应式设计视觉验证 - 移动端', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('mobile-main-interface.png', {
      fullPage: true
    });
    
    // 验证移动端菜单
    await page.click('[data-testid="mobile-menu-toggle"]');
    await expect(page.locator('[data-testid="mobile-navigation"]')).toHaveScreenshot(
      'mobile-navigation-menu.png'
    );
  });

  test('响应式设计视觉验证 - 平板端', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('tablet-main-interface.png', {
      fullPage: true
    });
  });

  test('深色主题视觉验证', async ({ page }) => {
    // 切换到深色主题
    await page.click('[data-testid="theme-toggle"]');
    await page.waitForTimeout(500); // 等待主题切换动画
    
    await expect(page).toHaveScreenshot('dark-theme-interface.png', {
      fullPage: true
    });
  });

  test('错误状态界面视觉验证', async ({ page }) => {
    // 模拟创建无效项目触发错误
    await page.click('[data-testid="create-new-project"]');
    await page.fill('[data-testid="project-name-input"]', ''); // 空名称
    await page.click('[data-testid="confirm-create-project"]');
    
    await page.waitForSelector('[data-testid="error-message"]');
    
    await expect(page.locator('[data-testid="error-container"]')).toHaveScreenshot(
      'error-state-interface.png'
    );
  });
});

/**
 * 辅助函数：快速创建项目并完成分析
 */
async function createAndAnalyzeProject(page: Page) {
  await page.click('[data-testid="create-new-project"]');
  await page.fill('[data-testid="project-name-input"]', '视觉测试分析项目');
  await page.selectOption('[data-testid="project-type-select"]', 'deep_excavation');
  await page.click('[data-testid="confirm-create-project"]');

  // 快速设置几何参数
  await page.click('[data-testid="geometry-modeling-tab"]');
  await page.fill('[data-testid="excavation-depth"]', '8');
  await page.fill('[data-testid="excavation-width"]', '20');
  await page.click('[data-testid="create-geometry"]');
  await page.waitForSelector('[data-testid="geometry-preview"]');

  // 快速设置土层参数（使用默认值）
  await page.click('[data-testid="soil-properties-tab"]');
  await page.click('[data-testid="use-default-soil-params"]');

  // 开始分析
  await page.click('[data-testid="analysis-tab"]');
  await page.click('[data-testid="start-analysis"]');
  await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 });
}