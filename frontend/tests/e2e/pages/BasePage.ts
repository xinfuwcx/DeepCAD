import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // 通用导航方法
  async navigateTo(path: string) {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  // 等待页面加载完成
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('body');
  }

  // 通用元素查找方法
  protected getElement(selector: string): Locator {
    return this.page.locator(selector);
  }

  protected getElementByText(text: string): Locator {
    return this.page.getByText(text);
  }

  protected getElementByRole(role: string, options?: { name?: string }): Locator {
    return this.page.getByRole(role as any, options);
  }

  protected getElementByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  // 通用交互方法
  async clickElement(selector: string) {
    await this.getElement(selector).click();
  }

  async fillInput(selector: string, text: string) {
    await this.getElement(selector).fill(text);
  }

  async selectOption(selector: string, value: string) {
    await this.getElement(selector).selectOption(value);
  }

  // 等待和验证方法
  async waitForElement(selector: string, timeout = 5000) {
    await this.getElement(selector).waitFor({ timeout });
  }

  async waitForText(text: string, timeout = 5000) {
    await this.getElementByText(text).waitFor({ timeout });
  }

  async isElementVisible(selector: string): Promise<boolean> {
    return await this.getElement(selector).isVisible();
  }

  async getElementText(selector: string): Promise<string> {
    return await this.getElement(selector).textContent() || '';
  }

  // 文件上传方法
  async uploadFile(inputSelector: string, filePath: string) {
    await this.getElement(inputSelector).setInputFiles(filePath);
  }

  // 等待API响应
  async waitForApiResponse(urlPattern: string, timeout = 10000) {
    return await this.page.waitForResponse(
      response => response.url().includes(urlPattern) && response.status() === 200,
      { timeout }
    );
  }

  // 截图方法
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  // 获取当前URL
  getCurrentUrl(): string {
    return this.page.url();
  }

  // 获取页面标题
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  // 检查控制台错误
  async checkConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    return errors;
  }

  // 模拟键盘操作
  async pressKey(key: string) {
    await this.page.keyboard.press(key);
  }

  // 滚动到元素
  async scrollToElement(selector: string) {
    await this.getElement(selector).scrollIntoViewIfNeeded();
  }

  // 拖拽操作
  async dragAndDrop(sourceSelector: string, targetSelector: string) {
    await this.getElement(sourceSelector).dragTo(this.getElement(targetSelector));
  }

  // 等待加载动画完成
  async waitForLoadingComplete() {
    // 等待可能的加载指示器消失
    const loadingSelectors = [
      '[data-testid="loading"]',
      '.loading',
      '.spinner',
      '[aria-busy="true"]'
    ];

    for (const selector of loadingSelectors) {
      try {
        await this.page.waitForSelector(selector, { state: 'detached', timeout: 1000 });
      } catch {
        // 如果选择器不存在，继续检查下一个
      }
    }
  }
}