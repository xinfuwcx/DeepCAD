import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class MeshingPage extends BasePage {
  private readonly selectors = {
    pageTitle: 'h1',
    meshingTabs: '[data-testid="meshing-tabs"]',
    basicTab: '[data-testid="basic-meshing-tab"]',
    advancedTab: '[data-testid="advanced-meshing-tab"]',
    physicalGroupsTab: '[data-testid="physical-groups-tab"]',
    
    // 基础网格设置
    elementSize: '[data-testid="element-size"]',
    meshQuality: '[data-testid="mesh-quality"]',
    algorithm2D: '[data-testid="algorithm-2d"]',
    algorithm3D: '[data-testid="algorithm-3d"]',
    generateButton: '[data-testid="generate-mesh"]',
    
    // 高级设置
    presetSelector: '[data-testid="preset-selector"]',
    customConfigPanel: '[data-testid="custom-config-panel"]',
    elementType2D: '[data-testid="element-type-2d"]',
    elementType3D: '[data-testid="element-type-3d"]',
    qualityMode: '[data-testid="quality-mode"]',
    refinementStrategy: '[data-testid="refinement-strategy"]',
    smoothingAlgorithm: '[data-testid="smoothing-algorithm"]',
    smoothingIterations: '[data-testid="smoothing-iterations"]',
    enableOptimization: '[data-testid="enable-optimization"]',
    generateSecondOrder: '[data-testid="generate-second-order"]',
    
    // 尺寸场控制
    enableSizeField: '[data-testid="enable-size-field"]',
    minSize: '[data-testid="min-size"]',
    maxSize: '[data-testid="max-size"]',
    growthRate: '[data-testid="growth-rate"]',
    curvatureAdaptation: '[data-testid="curvature-adaptation"]',
    
    // 边界层
    enableBoundaryLayers: '[data-testid="enable-boundary-layers"]',
    numberOfLayers: '[data-testid="number-of-layers"]',
    firstLayerThickness: '[data-testid="first-layer-thickness"]',
    layerGrowthRatio: '[data-testid="layer-growth-ratio"]',
    
    // 并行计算
    enableParallel: '[data-testid="enable-parallel"]',
    numThreads: '[data-testid="num-threads"]',
    loadBalancing: '[data-testid="load-balancing"]',
    
    // 物理组管理
    physicalGroupsList: '[data-testid="physical-groups-list"]',
    addGroupButton: '[data-testid="add-group-button"]',
    groupNameInput: '[data-testid="group-name-input"]',
    groupTypeSelect: '[data-testid="group-type-select"]',
    materialSelect: '[data-testid="material-select"]',
    entityTagsInput: '[data-testid="entity-tags-input"]',
    saveGroupButton: '[data-testid="save-group-button"]',
    
    // 结果显示
    meshStats: '[data-testid="mesh-statistics"]',
    nodeCount: '[data-testid="node-count"]',
    elementCount: '[data-testid="element-count"]',
    qualityMetrics: '[data-testid="quality-metrics"]',
    meshViewer: '[data-testid="mesh-viewer"]',
    
    // 性能估算
    performanceEstimate: '[data-testid="performance-estimate"]',
    estimatedElements: '[data-testid="estimated-elements"]',
    estimatedTime: '[data-testid="estimated-time"]',
    estimatedMemory: '[data-testid="estimated-memory"]',
    performanceClass: '[data-testid="performance-class"]',
    recommendations: '[data-testid="recommendations"]',
    
    // 状态和进度
    meshingStatus: '[data-testid="meshing-status"]',
    progressBar: '[data-testid="progress-bar"]',
    progressText: '[data-testid="progress-text"]',
    cancelButton: '[data-testid="cancel-meshing"]',
    
    // 验证和错误
    configValidation: '[data-testid="config-validation"]',
    validationErrors: '[data-testid="validation-errors"]',
    validationWarnings: '[data-testid="validation-warnings"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.navigateTo('/meshing');
  }

  async verifyPageLoaded() {
    await this.waitForElement(this.selectors.pageTitle);
    await this.waitForElement(this.selectors.meshingTabs);
    await this.waitForLoadingComplete();
  }

  // 标签页切换
  async switchToTab(tab: 'basic' | 'advanced' | 'physicalGroups') {
    const tabSelectors = {
      basic: this.selectors.basicTab,
      advanced: this.selectors.advancedTab,
      physicalGroups: this.selectors.physicalGroupsTab,
    };

    await this.clickElement(tabSelectors[tab]);
    await this.waitForLoadingComplete();
  }

  // 基础网格生成
  async generateBasicMesh(options: {
    elementSize?: number;
    quality?: 'coarse' | 'normal' | 'fine';
    algorithm2D?: 'delaunay' | 'frontal' | 'mmg';
    algorithm3D?: 'delaunay' | 'frontal' | 'mmg';
  } = {}) {
    await this.switchToTab('basic');

    // 设置单元尺寸
    if (options.elementSize) {
      await this.fillInput(this.selectors.elementSize, options.elementSize.toString());
    }

    // 设置网格质量
    if (options.quality) {
      await this.selectOption(this.selectors.meshQuality, options.quality);
    }

    // 设置2D算法
    if (options.algorithm2D) {
      await this.selectOption(this.selectors.algorithm2D, options.algorithm2D);
    }

    // 设置3D算法
    if (options.algorithm3D) {
      await this.selectOption(this.selectors.algorithm3D, options.algorithm3D);
    }

    // 生成网格
    await this.clickElement(this.selectors.generateButton);
    await this.waitForMeshingComplete();
  }

  // 高级网格生成
  async generateAdvancedMesh(config: {
    preset?: string;
    elementSize?: number;
    algorithm2D?: string;
    algorithm3D?: string;
    elementType2D?: string;
    elementType3D?: string;
    qualityMode?: string;
    refinementStrategy?: string;
    smoothingAlgorithm?: string;
    smoothingIterations?: number;
    enableOptimization?: boolean;
    generateSecondOrder?: boolean;
    sizeField?: {
      enable: boolean;
      minSize?: number;
      maxSize?: number;
      growthRate?: number;
      curvatureAdaptation?: boolean;
    };
    boundaryLayers?: {
      enable: boolean;
      numberOfLayers?: number;
      firstLayerThickness?: number;
      growthRatio?: number;
    };
    parallel?: {
      enable: boolean;
      numThreads?: number;
      loadBalancing?: boolean;
    };
  }) {
    await this.switchToTab('advanced');

    // 选择预设
    if (config.preset) {
      await this.selectOption(this.selectors.presetSelector, config.preset);
      await this.waitForLoadingComplete();
    }

    // 配置基本参数
    if (config.elementSize) {
      await this.fillInput(this.selectors.elementSize, config.elementSize.toString());
    }

    if (config.algorithm2D) {
      await this.selectOption(this.selectors.algorithm2D, config.algorithm2D);
    }

    if (config.algorithm3D) {
      await this.selectOption(this.selectors.algorithm3D, config.algorithm3D);
    }

    if (config.elementType2D) {
      await this.selectOption(this.selectors.elementType2D, config.elementType2D);
    }

    if (config.elementType3D) {
      await this.selectOption(this.selectors.elementType3D, config.elementType3D);
    }

    if (config.qualityMode) {
      await this.selectOption(this.selectors.qualityMode, config.qualityMode);
    }

    if (config.refinementStrategy) {
      await this.selectOption(this.selectors.refinementStrategy, config.refinementStrategy);
    }

    // 配置平滑选项
    if (config.smoothingAlgorithm) {
      await this.selectOption(this.selectors.smoothingAlgorithm, config.smoothingAlgorithm);
    }

    if (config.smoothingIterations) {
      await this.fillInput(this.selectors.smoothingIterations, config.smoothingIterations.toString());
    }

    // 配置优化选项
    if (config.enableOptimization !== undefined) {
      const checkbox = this.getElement(this.selectors.enableOptimization);
      const isChecked = await checkbox.isChecked();
      if (isChecked !== config.enableOptimization) {
        await checkbox.click();
      }
    }

    if (config.generateSecondOrder !== undefined) {
      const checkbox = this.getElement(this.selectors.generateSecondOrder);
      const isChecked = await checkbox.isChecked();
      if (isChecked !== config.generateSecondOrder) {
        await checkbox.click();
      }
    }

    // 配置尺寸场
    if (config.sizeField) {
      const enableCheckbox = this.getElement(this.selectors.enableSizeField);
      const isEnabled = await enableCheckbox.isChecked();
      if (isEnabled !== config.sizeField.enable) {
        await enableCheckbox.click();
      }

      if (config.sizeField.enable) {
        if (config.sizeField.minSize) {
          await this.fillInput(this.selectors.minSize, config.sizeField.minSize.toString());
        }
        if (config.sizeField.maxSize) {
          await this.fillInput(this.selectors.maxSize, config.sizeField.maxSize.toString());
        }
        if (config.sizeField.growthRate) {
          await this.fillInput(this.selectors.growthRate, config.sizeField.growthRate.toString());
        }
        if (config.sizeField.curvatureAdaptation !== undefined) {
          const checkbox = this.getElement(this.selectors.curvatureAdaptation);
          const isChecked = await checkbox.isChecked();
          if (isChecked !== config.sizeField.curvatureAdaptation) {
            await checkbox.click();
          }
        }
      }
    }

    // 配置边界层
    if (config.boundaryLayers) {
      const enableCheckbox = this.getElement(this.selectors.enableBoundaryLayers);
      const isEnabled = await enableCheckbox.isChecked();
      if (isEnabled !== config.boundaryLayers.enable) {
        await enableCheckbox.click();
      }

      if (config.boundaryLayers.enable) {
        if (config.boundaryLayers.numberOfLayers) {
          await this.fillInput(this.selectors.numberOfLayers, config.boundaryLayers.numberOfLayers.toString());
        }
        if (config.boundaryLayers.firstLayerThickness) {
          await this.fillInput(this.selectors.firstLayerThickness, config.boundaryLayers.firstLayerThickness.toString());
        }
        if (config.boundaryLayers.growthRatio) {
          await this.fillInput(this.selectors.layerGrowthRatio, config.boundaryLayers.growthRatio.toString());
        }
      }
    }

    // 配置并行计算
    if (config.parallel) {
      const enableCheckbox = this.getElement(this.selectors.enableParallel);
      const isEnabled = await enableCheckbox.isChecked();
      if (isEnabled !== config.parallel.enable) {
        await enableCheckbox.click();
      }

      if (config.parallel.enable) {
        if (config.parallel.numThreads) {
          await this.fillInput(this.selectors.numThreads, config.parallel.numThreads.toString());
        }
        if (config.parallel.loadBalancing !== undefined) {
          const checkbox = this.getElement(this.selectors.loadBalancing);
          const isChecked = await checkbox.isChecked();
          if (isChecked !== config.parallel.loadBalancing) {
            await checkbox.click();
          }
        }
      }
    }

    // 生成网格
    await this.clickElement(this.selectors.generateButton);
    await this.waitForMeshingComplete();
  }

  // 物理组管理
  async createPhysicalGroup(groupData: {
    name: string;
    type: string;
    material: string;
    entityTags: string[];
  }) {
    await this.switchToTab('physicalGroups');

    await this.clickElement(this.selectors.addGroupButton);
    await this.waitForElement('[data-testid="group-editor"]');

    await this.fillInput(this.selectors.groupNameInput, groupData.name);
    await this.selectOption(this.selectors.groupTypeSelect, groupData.type);
    await this.selectOption(this.selectors.materialSelect, groupData.material);
    await this.fillInput(this.selectors.entityTagsInput, groupData.entityTags.join(','));

    await this.clickElement(this.selectors.saveGroupButton);
    await this.waitForLoadingComplete();
  }

  async getPhysicalGroups(): Promise<Array<{
    name: string;
    type: string;
    material: string;
    entityCount: number;
  }>> {
    await this.switchToTab('physicalGroups');
    
    const groups: Array<{
      name: string;
      type: string;
      material: string;
      entityCount: number;
    }> = [];

    const groupElements = await this.page.locator(`${this.selectors.physicalGroupsList} [data-testid="group-item"]`).all();

    for (const element of groupElements) {
      const name = await element.locator('[data-testid="group-name"]').textContent() || '';
      const type = await element.locator('[data-testid="group-type"]').textContent() || '';
      const material = await element.locator('[data-testid="group-material"]').textContent() || '';
      const entityCountText = await element.locator('[data-testid="group-entity-count"]').textContent() || '0';
      const entityCount = parseInt(entityCountText) || 0;

      groups.push({ name, type, material, entityCount });
    }

    return groups;
  }

  async deletePhysicalGroup(groupName: string) {
    await this.switchToTab('physicalGroups');
    
    const groupElement = this.page.locator(`[data-testid="group-item"][data-group-name="${groupName}"]`);
    const deleteButton = groupElement.locator('[data-testid="delete-group"]');
    
    await deleteButton.click();
    await this.waitForElement('[data-testid="confirm-delete-dialog"]');
    await this.clickElement('[data-testid="confirm-delete"]');
    await this.waitForLoadingComplete();
  }

  // 性能估算
  async getPerformanceEstimate(): Promise<{
    estimatedElements: number;
    estimatedTime: number;
    estimatedMemory: number;
    performanceClass: string;
    recommendations: string[];
  }> {
    await this.waitForElement(this.selectors.performanceEstimate);

    const elementsText = await this.getElementText(this.selectors.estimatedElements);
    const timeText = await this.getElementText(this.selectors.estimatedTime);
    const memoryText = await this.getElementText(this.selectors.estimatedMemory);
    const performanceClass = await this.getElementText(this.selectors.performanceClass);

    const recommendations: string[] = [];
    const recommendationElements = await this.page.locator(`${this.selectors.recommendations} li`).all();
    for (const element of recommendationElements) {
      const text = await element.textContent();
      if (text) {
        recommendations.push(text.trim());
      }
    }

    return {
      estimatedElements: parseInt(elementsText.replace(/,/g, '')) || 0,
      estimatedTime: parseFloat(timeText.replace('s', '')) || 0,
      estimatedMemory: parseFloat(memoryText.replace('MB', '')) || 0,
      performanceClass: performanceClass.trim(),
      recommendations,
    };
  }

  // 配置验证
  async validateConfiguration(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    await this.waitForElement(this.selectors.configValidation);

    const isValid = await this.getElementText(this.selectors.configValidation) === 'Valid';

    const errors: string[] = [];
    const warnings: string[] = [];

    if (await this.isElementVisible(this.selectors.validationErrors)) {
      const errorElements = await this.page.locator(`${this.selectors.validationErrors} li`).all();
      for (const element of errorElements) {
        const text = await element.textContent();
        if (text) {
          errors.push(text.trim());
        }
      }
    }

    if (await this.isElementVisible(this.selectors.validationWarnings)) {
      const warningElements = await this.page.locator(`${this.selectors.validationWarnings} li`).all();
      for (const element of warningElements) {
        const text = await element.textContent();
        if (text) {
          warnings.push(text.trim());
        }
      }
    }

    return { isValid, errors, warnings };
  }

  // 网格统计和质量
  async getMeshStatistics(): Promise<{
    nodeCount: number;
    elementCount: number;
    qualityMetrics: Record<string, number>;
  }> {
    await this.waitForElement(this.selectors.meshStats);

    const nodeCountText = await this.getElementText(this.selectors.nodeCount);
    const elementCountText = await this.getElementText(this.selectors.elementCount);

    const nodeCount = parseInt(nodeCountText.replace(/,/g, '')) || 0;
    const elementCount = parseInt(elementCountText.replace(/,/g, '')) || 0;

    const qualityMetrics: Record<string, number> = {};
    const metricElements = await this.page.locator(`${this.selectors.qualityMetrics} [data-testid="metric-item"]`).all();

    for (const element of metricElements) {
      const label = await element.locator('[data-testid="metric-label"]').textContent();
      const value = await element.locator('[data-testid="metric-value"]').textContent();

      if (label && value) {
        qualityMetrics[label.trim()] = parseFloat(value.trim()) || 0;
      }
    }

    return { nodeCount, elementCount, qualityMetrics };
  }

  // 等待网格生成完成
  async waitForMeshingComplete(timeout = 60000) {
    // 等待生成开始
    await this.waitForElement(this.selectors.meshingStatus, 5000);

    // 等待生成完成
    await this.page.waitForFunction(
      () => {
        const statusElement = document.querySelector('[data-testid="meshing-status"]');
        if (!statusElement) return false;
        
        const status = statusElement.textContent || '';
        return status.includes('完成') || status.includes('完成') || status.includes('failed');
      },
      { timeout }
    );

    await this.waitForLoadingComplete();
  }

  // 获取网格生成进度
  async getMeshingProgress(): Promise<{
    status: string;
    progress: number;
    currentStep: string;
  }> {
    const status = await this.getElementText(this.selectors.meshingStatus);
    
    let progress = 0;
    if (await this.isElementVisible(this.selectors.progressBar)) {
      const progressText = await this.getElementText(this.selectors.progressText);
      const match = progressText.match(/(\d+)%/);
      progress = match ? parseInt(match[1]) : 0;
    }

    const currentStep = status;

    return { status, progress, currentStep };
  }

  // 取消网格生成
  async cancelMeshing() {
    if (await this.isElementVisible(this.selectors.cancelButton)) {
      await this.clickElement(this.selectors.cancelButton);
      await this.waitForLoadingComplete();
    }
  }

  // 导出网格
  async exportMesh(format: 'vtk' | 'msh' | 'unv' = 'vtk') {
    await this.clickElement('[data-testid="export-mesh"]');
    await this.waitForElement('[data-testid="export-dialog"]');

    await this.selectOption('[data-testid="export-format"]', format);

    const downloadPromise = this.page.waitForDownload();
    await this.clickElement('[data-testid="confirm-export"]');
    return await downloadPromise;
  }

  // 查看网格
  async viewMeshIn3D() {
    await this.clickElement('[data-testid="view-mesh-3d"]');
    await this.waitForElement(this.selectors.meshViewer);
  }

  async toggleMeshWireframe() {
    await this.clickElement('[data-testid="toggle-wireframe"]');
    await this.page.waitForTimeout(200);
  }

  async colorMeshByQuality() {
    await this.clickElement('[data-testid="color-by-quality"]');
    await this.waitForLoadingComplete();
  }

  // 网格分析
  async analyzeMeshQuality(): Promise<{
    minQuality: number;
    maxQuality: number;
    averageQuality: number;
    poorElements: number;
  }> {
    await this.clickElement('[data-testid="analyze-quality"]');
    await this.waitForElement('[data-testid="quality-analysis-results"]');

    const minQualityText = await this.getElementText('[data-testid="min-quality"]');
    const maxQualityText = await this.getElementText('[data-testid="max-quality"]');
    const avgQualityText = await this.getElementText('[data-testid="avg-quality"]');
    const poorElementsText = await this.getElementText('[data-testid="poor-elements"]');

    return {
      minQuality: parseFloat(minQualityText) || 0,
      maxQuality: parseFloat(maxQualityText) || 0,
      averageQuality: parseFloat(avgQualityText) || 0,
      poorElements: parseInt(poorElementsText) || 0,
    };
  }

  // 网格细化
  async refineMesh(regions?: string[]) {
    await this.clickElement('[data-testid="refine-mesh"]');
    await this.waitForElement('[data-testid="refinement-dialog"]');

    if (regions) {
      for (const region of regions) {
        await this.clickElement(`[data-testid="region-checkbox"][data-region="${region}"]`);
      }
    }

    await this.clickElement('[data-testid="start-refinement"]');
    await this.waitForMeshingComplete();
  }
}