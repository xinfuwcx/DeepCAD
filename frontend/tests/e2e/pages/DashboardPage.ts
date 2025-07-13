import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  // 页面元素选择器
  private readonly selectors = {
    pageTitle: 'h1',
    navigationMenu: '[data-testid="navigation-menu"]',
    dashboardCards: '[data-testid="dashboard-card"]',
    projectsList: '[data-testid="projects-list"]',
    recentFiles: '[data-testid="recent-files"]',
    quickActions: '[data-testid="quick-actions"]',
    statisticsSection: '[data-testid="statistics"]',
    newProjectButton: '[data-testid="new-project-btn"]',
    importFileButton: '[data-testid="import-file-btn"]',
    viewAllProjectsButton: '[data-testid="view-all-projects-btn"]',
  };

  constructor(page: Page) {
    super(page);
  }

  // 导航到仪表板
  async goto() {
    await this.navigateTo('/dashboard');
  }

  // 验证页面加载
  async verifyPageLoaded() {
    await this.waitForElement(this.selectors.pageTitle);
    await this.waitForLoadingComplete();
  }

  // 获取页面标题
  async getPageTitle(): Promise<string> {
    return await this.getElementText(this.selectors.pageTitle);
  }

  // 验证导航菜单存在
  async verifyNavigationMenu() {
    return await this.isElementVisible(this.selectors.navigationMenu);
  }

  // 获取仪表板卡片数量
  async getDashboardCardsCount(): Promise<number> {
    const cards = await this.page.locator(this.selectors.dashboardCards).all();
    return cards.length;
  }

  // 点击新建项目按钮
  async clickNewProject() {
    await this.clickElement(this.selectors.newProjectButton);
    await this.waitForLoadingComplete();
  }

  // 点击导入文件按钮
  async clickImportFile() {
    await this.clickElement(this.selectors.importFileButton);
    await this.waitForLoadingComplete();
  }

  // 获取最近文件列表
  async getRecentFiles(): Promise<string[]> {
    const fileElements = await this.page.locator(`${this.selectors.recentFiles} [data-testid="file-item"]`).all();
    const fileNames: string[] = [];
    
    for (const element of fileElements) {
      const fileName = await element.textContent();
      if (fileName) {
        fileNames.push(fileName.trim());
      }
    }
    
    return fileNames;
  }

  // 获取项目统计信息
  async getProjectStatistics(): Promise<Record<string, string>> {
    const stats: Record<string, string> = {};
    const statElements = await this.page.locator(`${this.selectors.statisticsSection} [data-testid="stat-item"]`).all();
    
    for (const element of statElements) {
      const label = await element.locator('[data-testid="stat-label"]').textContent();
      const value = await element.locator('[data-testid="stat-value"]').textContent();
      
      if (label && value) {
        stats[label.trim()] = value.trim();
      }
    }
    
    return stats;
  }

  // 搜索项目
  async searchProjects(query: string) {
    const searchInput = '[data-testid="project-search"]';
    await this.waitForElement(searchInput);
    await this.fillInput(searchInput, query);
    await this.pressKey('Enter');
    await this.waitForLoadingComplete();
  }

  // 选择项目
  async selectProject(projectName: string) {
    const projectSelector = `[data-testid="project-item"][data-project-name="${projectName}"]`;
    await this.clickElement(projectSelector);
    await this.waitForLoadingComplete();
  }

  // 验证快速操作按钮
  async verifyQuickActions(): Promise<boolean> {
    const quickActions = [
      '几何建模',
      'DXF导入',
      '网格划分',
      '数值分析'
    ];

    for (const action of quickActions) {
      const isVisible = await this.isElementVisible(`[data-testid="quick-action"][data-action="${action}"]`);
      if (!isVisible) {
        return false;
      }
    }

    return true;
  }

  // 点击快速操作
  async clickQuickAction(actionName: string) {
    await this.clickElement(`[data-testid="quick-action"][data-action="${actionName}"]`);
    await this.waitForLoadingComplete();
  }

  // 导航到其他页面
  async navigateToGeometry() {
    await this.clickElement('[data-testid="nav-geometry"]');
    await this.waitForLoadingComplete();
  }

  async navigateToDXFImport() {
    await this.clickElement('[data-testid="nav-dxf-import"]');
    await this.waitForLoadingComplete();
  }

  async navigateToMeshing() {
    await this.clickElement('[data-testid="nav-meshing"]');
    await this.waitForLoadingComplete();
  }

  async navigateToAnalysis() {
    await this.clickElement('[data-testid="nav-analysis"]');
    await this.waitForLoadingComplete();
  }

  // 检查系统状态
  async checkSystemStatus(): Promise<{ frontend: boolean; backend: boolean }> {
    const status = { frontend: true, backend: false };

    // 检查前端状态
    try {
      await this.waitForElement('body', 5000);
      status.frontend = true;
    } catch {
      status.frontend = false;
    }

    // 检查后端状态
    try {
      const response = await this.waitForApiResponse('/api/health', 5000);
      status.backend = response.ok();
    } catch {
      status.backend = false;
    }

    return status;
  }

  // 验证主题切换
  async toggleTheme() {
    await this.clickElement('[data-testid="theme-toggle"]');
    await this.page.waitForTimeout(500); // 等待主题切换动画
  }

  // 验证语言切换
  async changeLanguage(language: string) {
    await this.clickElement('[data-testid="language-selector"]');
    await this.clickElement(`[data-testid="language-option"][data-lang="${language}"]`);
    await this.waitForLoadingComplete();
  }

  // 获取通知数量
  async getNotificationCount(): Promise<number> {
    const notificationBadge = '[data-testid="notification-badge"]';
    const isVisible = await this.isElementVisible(notificationBadge);
    
    if (!isVisible) {
      return 0;
    }

    const countText = await this.getElementText(notificationBadge);
    return parseInt(countText) || 0;
  }

  // 打开用户菜单
  async openUserMenu() {
    await this.clickElement('[data-testid="user-menu-trigger"]');
    await this.waitForElement('[data-testid="user-menu-content"]');
  }

  // 注销
  async logout() {
    await this.openUserMenu();
    await this.clickElement('[data-testid="logout-button"]');
    await this.waitForLoadingComplete();
  }
}