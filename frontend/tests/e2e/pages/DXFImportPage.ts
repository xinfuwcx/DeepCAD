import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class DXFImportPage extends BasePage {
  // 页面元素选择器
  private readonly selectors = {
    pageTitle: 'h1',
    tabNavigation: '[data-testid="tab-navigation"]',
    uploadTab: '[data-testid="tab-upload"]',
    analysisTab: '[data-testid="tab-analysis"]',
    optionsTab: '[data-testid="tab-options"]',
    resultsTab: '[data-testid="tab-results"]',
    
    // 文件上传区域
    uploadArea: '[data-testid="upload-area"]',
    fileInput: 'input[type="file"]',
    dragDropZone: '[data-testid="drag-drop-zone"]',
    selectedFile: '[data-testid="selected-file"]',
    analyzeButton: '[data-testid="analyze-button"]',
    processButton: '[data-testid="process-button"]',
    
    // 分析结果
    analysisResults: '[data-testid="analysis-results"]',
    fileInfo: '[data-testid="file-info"]',
    statisticsGrid: '[data-testid="statistics-grid"]',
    layersTable: '[data-testid="layers-table"]',
    validationIssues: '[data-testid="validation-issues"]',
    
    // 处理选项
    processingMode: '[data-testid="processing-mode"]',
    coordinateSystem: '[data-testid="coordinate-system"]',
    scaleFactor: '[data-testid="scale-factor"]',
    rotationAngle: '[data-testid="rotation-angle"]',
    repairOptions: '[data-testid="repair-options"]',
    outputOptions: '[data-testid="output-options"]',
    
    // 处理结果
    processingStatus: '[data-testid="processing-status"]',
    processingProgress: '[data-testid="processing-progress"]',
    resultsSummary: '[data-testid="results-summary"]',
    outputFiles: '[data-testid="output-files"]',
    downloadButtons: '[data-testid="download-button"]',
    
    // 图层管理
    layerCheckbox: '[data-testid="layer-checkbox"]',
    selectAllLayers: '[data-testid="select-all-layers"]',
    applyLayerFilter: '[data-testid="apply-layer-filter"]',
    
    // 错误和状态
    errorMessage: '[data-testid="error-message"]',
    successMessage: '[data-testid="success-message"]',
    loadingSpinner: '[data-testid="loading-spinner"]',
  };

  constructor(page: Page) {
    super(page);
  }

  // 导航到DXF导入页面
  async goto() {
    await this.navigateTo('/dxf-import');
  }

  // 验证页面加载
  async verifyPageLoaded() {
    await this.waitForElement(this.selectors.pageTitle);
    await this.waitForElement(this.selectors.tabNavigation);
    await this.waitForLoadingComplete();
  }

  // 切换到指定选项卡
  async switchToTab(tabName: 'upload' | 'analysis' | 'options' | 'results') {
    const tabSelectors = {
      upload: this.selectors.uploadTab,
      analysis: this.selectors.analysisTab,
      options: this.selectors.optionsTab,
      results: this.selectors.resultsTab,
    };

    await this.clickElement(tabSelectors[tabName]);
    await this.waitForLoadingComplete();
  }

  // 上传DXF文件
  async uploadDXFFile(filePath: string) {
    await this.switchToTab('upload');
    await this.uploadFile(this.selectors.fileInput, filePath);
    await this.waitForElement(this.selectors.selectedFile);
  }

  // 使用拖拽上传文件
  async dragAndDropFile(filePath: string) {
    // 创建文件对象用于拖拽
    const fileContent = await this.page.evaluate(async (path) => {
      const response = await fetch(path);
      return await response.arrayBuffer();
    }, filePath);

    // 模拟拖拽操作
    await this.page.dispatchEvent(this.selectors.dragDropZone, 'drop', {
      dataTransfer: {
        files: [{
          name: 'test.dxf',
          type: 'application/octet-stream',
          content: fileContent
        }]
      }
    });

    await this.waitForElement(this.selectors.selectedFile);
  }

  // 分析DXF文件
  async analyzeDXFFile() {
    await this.clickElement(this.selectors.analyzeButton);
    await this.waitForLoadingComplete();
    await this.waitForElement(this.selectors.analysisResults);
  }

  // 处理DXF文件
  async processDXFFile() {
    await this.clickElement(this.selectors.processButton);
    await this.waitForLoadingComplete();
    
    // 等待处理完成
    await this.waitForElement(this.selectors.processingStatus);
  }

  // 获取文件信息
  async getFileInfo(): Promise<Record<string, string>> {
    await this.switchToTab('analysis');
    const fileInfo: Record<string, string> = {};
    
    const infoItems = await this.page.locator(`${this.selectors.fileInfo} [data-testid="info-item"]`).all();
    
    for (const item of infoItems) {
      const label = await item.locator('[data-testid="info-label"]').textContent();
      const value = await item.locator('[data-testid="info-value"]').textContent();
      
      if (label && value) {
        fileInfo[label.trim()] = value.trim();
      }
    }
    
    return fileInfo;
  }

  // 获取统计信息
  async getStatistics(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};
    
    const statItems = await this.page.locator(`${this.selectors.statisticsGrid} [data-testid="stat-item"]`).all();
    
    for (const item of statItems) {
      const label = await item.locator('[data-testid="stat-label"]').textContent();
      const value = await item.locator('[data-testid="stat-value"]').textContent();
      
      if (label && value) {
        stats[label.trim()] = parseInt(value.trim()) || 0;
      }
    }
    
    return stats;
  }

  // 获取图层列表
  async getLayersList(): Promise<Array<{ name: string; entityCount: number; visible: boolean }>> {
    const layers: Array<{ name: string; entityCount: number; visible: boolean }> = [];
    
    const layerRows = await this.page.locator(`${this.selectors.layersTable} tbody tr`).all();
    
    for (const row of layerRows) {
      const name = await row.locator('[data-testid="layer-name"]').textContent() || '';
      const countText = await row.locator('[data-testid="layer-entity-count"]').textContent() || '0';
      const entityCount = parseInt(countText) || 0;
      const checkbox = row.locator('[data-testid="layer-checkbox"]');
      const visible = await checkbox.isChecked();
      
      layers.push({ name: name.trim(), entityCount, visible });
    }
    
    return layers;
  }

  // 选择/取消选择图层
  async toggleLayer(layerName: string, selected: boolean) {
    const layerRow = this.page.locator(`${this.selectors.layersTable} tr[data-layer="${layerName}"]`);
    const checkbox = layerRow.locator(this.selectors.layerCheckbox);
    
    const isChecked = await checkbox.isChecked();
    if (isChecked !== selected) {
      await checkbox.click();
    }
  }

  // 选择所有图层
  async selectAllLayers() {
    await this.clickElement(this.selectors.selectAllLayers);
  }

  // 应用图层过滤
  async applyLayerFilter() {
    await this.clickElement(this.selectors.applyLayerFilter);
    await this.waitForLoadingComplete();
  }

  // 配置处理选项
  async configureProcessingOptions(options: {
    mode?: 'strict' | 'tolerant' | 'repair' | 'preview';
    coordinateSystem?: 'wcs' | 'ucs' | 'custom';
    scaleFactor?: number;
    rotationAngle?: number;
    repairOptions?: {
      fixDuplicateVertices?: boolean;
      fixZeroLengthLines?: boolean;
      fixInvalidGeometries?: boolean;
    };
  }) {
    await this.switchToTab('options');
    
    // 设置处理模式
    if (options.mode) {
      await this.selectOption(this.selectors.processingMode, options.mode);
    }
    
    // 设置坐标系统
    if (options.coordinateSystem) {
      await this.selectOption(this.selectors.coordinateSystem, options.coordinateSystem);
    }
    
    // 设置缩放因子
    if (options.scaleFactor !== undefined) {
      await this.fillInput(this.selectors.scaleFactor, options.scaleFactor.toString());
    }
    
    // 设置旋转角度
    if (options.rotationAngle !== undefined) {
      await this.fillInput(this.selectors.rotationAngle, options.rotationAngle.toString());
    }
    
    // 设置修复选项
    if (options.repairOptions) {
      const repairSection = this.selectors.repairOptions;
      
      if (options.repairOptions.fixDuplicateVertices !== undefined) {
        const checkbox = this.page.locator(`${repairSection} [data-testid="fix-duplicate-vertices"]`);
        const isChecked = await checkbox.isChecked();
        if (isChecked !== options.repairOptions.fixDuplicateVertices) {
          await checkbox.click();
        }
      }
      
      if (options.repairOptions.fixZeroLengthLines !== undefined) {
        const checkbox = this.page.locator(`${repairSection} [data-testid="fix-zero-length-lines"]`);
        const isChecked = await checkbox.isChecked();
        if (isChecked !== options.repairOptions.fixZeroLengthLines) {
          await checkbox.click();
        }
      }
      
      if (options.repairOptions.fixInvalidGeometries !== undefined) {
        const checkbox = this.page.locator(`${repairSection} [data-testid="fix-invalid-geometries"]`);
        const isChecked = await checkbox.isChecked();
        if (isChecked !== options.repairOptions.fixInvalidGeometries) {
          await checkbox.click();
        }
      }
    }
  }

  // 获取处理状态
  async getProcessingStatus(): Promise<string> {
    await this.switchToTab('results');
    return await this.getElementText(this.selectors.processingStatus);
  }

  // 获取处理进度
  async getProcessingProgress(): Promise<number> {
    const progressText = await this.getElementText(this.selectors.processingProgress);
    const match = progressText.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 0;
  }

  // 获取处理结果摘要
  async getProcessingResults(): Promise<Record<string, string | number>> {
    const results: Record<string, string | number> = {};
    
    const resultItems = await this.page.locator(`${this.selectors.resultsSummary} [data-testid="result-item"]`).all();
    
    for (const item of resultItems) {
      const label = await item.locator('[data-testid="result-label"]').textContent();
      const value = await item.locator('[data-testid="result-value"]').textContent();
      
      if (label && value) {
        const numValue = parseInt(value.trim());
        results[label.trim()] = isNaN(numValue) ? value.trim() : numValue;
      }
    }
    
    return results;
  }

  // 获取输出文件列表
  async getOutputFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const fileItems = await this.page.locator(`${this.selectors.outputFiles} [data-testid="output-file"]`).all();
    
    for (const item of fileItems) {
      const fileName = await item.textContent();
      if (fileName) {
        files.push(fileName.trim());
      }
    }
    
    return files;
  }

  // 下载输出文件
  async downloadFile(fileName: string) {
    const downloadButton = this.page.locator(`${this.selectors.downloadButtons}[data-file="${fileName}"]`);
    const downloadPromise = this.page.waitForDownload();
    await downloadButton.click();
    return await downloadPromise;
  }

  // 获取验证问题
  async getValidationIssues(): Promise<Array<{
    severity: string;
    message: string;
    suggestion?: string;
  }>> {
    const issues: Array<{ severity: string; message: string; suggestion?: string }> = [];
    
    const issueItems = await this.page.locator(`${this.selectors.validationIssues} [data-testid="validation-issue"]`).all();
    
    for (const item of issueItems) {
      const severity = await item.getAttribute('data-severity') || '';
      const message = await item.locator('[data-testid="issue-message"]').textContent() || '';
      const suggestionElement = item.locator('[data-testid="issue-suggestion"]');
      const suggestion = await suggestionElement.isVisible() 
        ? await suggestionElement.textContent() || undefined
        : undefined;
      
      issues.push({ severity, message, suggestion });
    }
    
    return issues;
  }

  // 检查是否有错误
  async hasErrors(): Promise<boolean> {
    return await this.isElementVisible(this.selectors.errorMessage);
  }

  // 获取错误信息
  async getErrorMessage(): Promise<string> {
    if (await this.hasErrors()) {
      return await this.getElementText(this.selectors.errorMessage);
    }
    return '';
  }

  // 检查是否处理成功
  async isProcessingSuccessful(): Promise<boolean> {
    return await this.isElementVisible(this.selectors.successMessage);
  }

  // 等待处理完成
  async waitForProcessingComplete(timeout = 30000) {
    // 等待加载指示器消失
    await this.page.waitForSelector(this.selectors.loadingSpinner, { 
      state: 'detached', 
      timeout 
    });
    
    // 等待结果出现
    await this.waitForElement(this.selectors.resultsSummary, timeout);
  }

  // 重置表单
  async resetForm() {
    const resetButton = '[data-testid="reset-button"]';
    if (await this.isElementVisible(resetButton)) {
      await this.clickElement(resetButton);
      await this.waitForLoadingComplete();
    }
  }
}