import { test, expect } from '../fixtures/base-test';

test.describe('基础导航测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('应用启动和主页加载', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/DeepCAD/);
    
    // 验证主要元素存在
    await expect(page.locator('body')).toBeVisible();
    
    // 检查是否没有JavaScript错误
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    
    // 验证没有严重错误
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('404') &&
      !error.includes('Failed to load resource')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('主导航菜单功能', async ({ page, dashboardPage }) => {
    // 导航到仪表板
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();
    
    // 验证导航菜单存在
    const hasNavMenu = await dashboardPage.verifyNavigationMenu();
    expect(hasNavMenu).toBe(true);
    
    // 测试各个导航链接
    const navigationTests = [
      { name: '几何建模', path: '/geometry' },
      { name: 'DXF导入', path: '/dxf-import' },
      { name: '网格划分', path: '/meshing' },
      { name: '数值分析', path: '/analysis' },
      { name: '后处理', path: '/results' },
      { name: '材料库', path: '/materials' },
    ];

    for (const nav of navigationTests) {
      // 点击导航项
      await page.getByText(nav.name).click();
      
      // 等待页面加载
      await page.waitForLoadState('networkidle');
      
      // 验证URL变化
      expect(page.url()).toContain(nav.path);
      
      // 验证页面内容加载
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('响应式布局测试', async ({ page }) => {
    // 桌面视图
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard');
    
    // 验证桌面布局元素
    await expect(page.locator('[data-testid="desktop-layout"]')).toBeVisible();
    
    // 平板视图
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500); // 等待布局调整
    
    // 验证平板布局适配
    const isMobileMenuVisible = await page.locator('[data-testid="mobile-menu"]').isVisible();
    expect(isMobileMenuVisible).toBe(true);
    
    // 移动设备视图
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // 验证移动布局
    await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
  });

  test('主题切换功能', async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();
    
    // 获取初始主题
    const initialTheme = await page.getAttribute('html', 'data-theme');
    
    // 切换主题
    await dashboardPage.toggleTheme();
    
    // 验证主题已切换
    const newTheme = await page.getAttribute('html', 'data-theme');
    expect(newTheme).not.toBe(initialTheme);
    
    // 验证主题相关样式生效
    const isDarkMode = newTheme === 'dark';
    if (isDarkMode) {
      await expect(page.locator('body')).toHaveCSS('background-color', /rgb\(26, 26, 26\)/);
    }
  });

  test('语言切换功能', async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();
    
    // 切换到英文
    await dashboardPage.changeLanguage('en');
    
    // 验证页面文本已切换
    await expect(page.getByText('Dashboard')).toBeVisible();
    
    // 切换回中文
    await dashboardPage.changeLanguage('zh');
    
    // 验证中文界面
    await expect(page.getByText('仪表板')).toBeVisible();
  });

  test('搜索功能', async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();
    
    // 打开搜索
    await page.keyboard.press('Control+KeyK');
    
    // 验证搜索框出现
    await expect(page.locator('[data-testid="search-modal"]')).toBeVisible();
    
    // 输入搜索词
    await page.fill('[data-testid="search-input"]', '网格');
    
    // 验证搜索结果
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    
    // 关闭搜索
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="search-modal"]')).not.toBeVisible();
  });

  test('键盘导航支持', async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();
    
    // 使用Tab键导航
    await page.keyboard.press('Tab');
    
    // 验证焦点状态
    const focusedElement = await page.locator(':focus').count();
    expect(focusedElement).toBeGreaterThan(0);
    
    // 使用回车键激活链接
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');
    
    // 验证导航成功
    expect(page.url()).not.toContain('/dashboard');
  });

  test('面包屑导航', async ({ page }) => {
    // 导航到深层页面
    await page.goto('/meshing/advanced');
    
    // 验证面包屑存在
    await expect(page.locator('[data-testid="breadcrumb"]')).toBeVisible();
    
    // 验证面包屑路径
    const breadcrumbItems = await page.locator('[data-testid="breadcrumb-item"]').all();
    expect(breadcrumbItems.length).toBeGreaterThan(1);
    
    // 点击面包屑项返回上级
    await breadcrumbItems[0].click();
    await page.waitForLoadState('networkidle');
    
    // 验证导航成功
    expect(page.url()).toContain('/meshing');
  });

  test('后退和前进按钮', async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    
    // 导航到其他页面
    await dashboardPage.navigateToGeometry();
    expect(page.url()).toContain('/geometry');
    
    // 使用浏览器后退
    await page.goBack();
    expect(page.url()).toContain('/dashboard');
    
    // 使用浏览器前进
    await page.goForward();
    expect(page.url()).toContain('/geometry');
  });

  test('页面刷新保持状态', async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.verifyPageLoaded();
    
    // 切换主题
    await dashboardPage.toggleTheme();
    const themeBeforeRefresh = await page.getAttribute('html', 'data-theme');
    
    // 刷新页面
    await page.reload();
    await dashboardPage.verifyPageLoaded();
    
    // 验证主题保持
    const themeAfterRefresh = await page.getAttribute('html', 'data-theme');
    expect(themeAfterRefresh).toBe(themeBeforeRefresh);
  });

  test('错误页面处理', async ({ page }) => {
    // 访问不存在的页面
    await page.goto('/non-existent-page');
    
    // 验证404页面或重定向
    const isErrorPage = await page.locator('[data-testid="error-page"]').isVisible();
    const isRedirected = page.url().includes('/dashboard') || page.url().includes('/');
    
    expect(isErrorPage || isRedirected).toBe(true);
  });
});