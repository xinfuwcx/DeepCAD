import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class GeometryPage extends BasePage {
  private readonly selectors = {
    pageTitle: 'h1',
    viewport3D: '[data-testid="3d-viewport"]',
    toolbar: '[data-testid="geometry-toolbar"]',
    propertiesPanel: '[data-testid="properties-panel"]',
    sceneTree: '[data-testid="scene-tree"]',
    
    // 工具按钮
    createBoxButton: '[data-testid="create-box"]',
    createSphereButton: '[data-testid="create-sphere"]',
    createCylinderButton: '[data-testid="create-cylinder"]',
    importButton: '[data-testid="import-geometry"]',
    exportButton: '[data-testid="export-geometry"]',
    
    // 视图控制
    zoomFitButton: '[data-testid="zoom-fit"]',
    viewFrontButton: '[data-testid="view-front"]',
    viewTopButton: '[data-testid="view-top"]',
    viewIsometricButton: '[data-testid="view-isometric"]',
    
    // 属性编辑
    positionX: '[data-testid="position-x"]',
    positionY: '[data-testid="position-y"]',
    positionZ: '[data-testid="position-z"]',
    rotationX: '[data-testid="rotation-x"]',
    rotationY: '[data-testid="rotation-y"]',
    rotationZ: '[data-testid="rotation-z"]',
    scaleX: '[data-testid="scale-x"]',
    scaleY: '[data-testid="scale-y"]',
    scaleZ: '[data-testid="scale-z"]',
    
    // 场景树
    treeNode: '[data-testid="tree-node"]',
    treeNodeExpander: '[data-testid="tree-node-expander"]',
    treeNodeCheckbox: '[data-testid="tree-node-checkbox"]',
    
    // 状态信息
    statusBar: '[data-testid="status-bar"]',
    objectCount: '[data-testid="object-count"]',
    selectionInfo: '[data-testid="selection-info"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.navigateTo('/geometry');
  }

  async verifyPageLoaded() {
    await this.waitForElement(this.selectors.pageTitle);
    await this.waitForElement(this.selectors.viewport3D);
    await this.waitForLoadingComplete();
  }

  // 几何体创建
  async createBox(width = 1, height = 1, depth = 1) {
    await this.clickElement(this.selectors.createBoxButton);
    
    // 等待创建对话框
    await this.waitForElement('[data-testid="create-box-dialog"]');
    
    // 设置尺寸
    await this.fillInput('[data-testid="box-width"]', width.toString());
    await this.fillInput('[data-testid="box-height"]', height.toString());
    await this.fillInput('[data-testid="box-depth"]', depth.toString());
    
    // 确认创建
    await this.clickElement('[data-testid="confirm-create"]');
    await this.waitForLoadingComplete();
  }

  async createSphere(radius = 1) {
    await this.clickElement(this.selectors.createSphereButton);
    await this.waitForElement('[data-testid="create-sphere-dialog"]');
    
    await this.fillInput('[data-testid="sphere-radius"]', radius.toString());
    await this.clickElement('[data-testid="confirm-create"]');
    await this.waitForLoadingComplete();
  }

  async createCylinder(radius = 1, height = 2) {
    await this.clickElement(this.selectors.createCylinderButton);
    await this.waitForElement('[data-testid="create-cylinder-dialog"]');
    
    await this.fillInput('[data-testid="cylinder-radius"]', radius.toString());
    await this.fillInput('[data-testid="cylinder-height"]', height.toString());
    await this.clickElement('[data-testid="confirm-create"]');
    await this.waitForLoadingComplete();
  }

  // 视图控制
  async zoomFit() {
    await this.clickElement(this.selectors.zoomFitButton);
    await this.page.waitForTimeout(500); // 等待缩放动画
  }

  async setView(view: 'front' | 'top' | 'isometric') {
    const viewButtons = {
      front: this.selectors.viewFrontButton,
      top: this.selectors.viewTopButton,
      isometric: this.selectors.viewIsometricButton,
    };
    
    await this.clickElement(viewButtons[view]);
    await this.page.waitForTimeout(500);
  }

  // 对象选择和操作
  async selectObjectInViewport(objectName: string) {
    // 在3D视口中点击对象
    const viewport = this.getElement(this.selectors.viewport3D);
    await viewport.click({ position: { x: 400, y: 300 } }); // 点击中心位置
    await this.waitForLoadingComplete();
  }

  async selectObjectInTree(objectName: string) {
    const treeNode = this.page.locator(`${this.selectors.treeNode}[data-object="${objectName}"]`);
    await treeNode.click();
    await this.waitForLoadingComplete();
  }

  async toggleObjectVisibility(objectName: string) {
    const checkbox = this.page.locator(
      `${this.selectors.treeNode}[data-object="${objectName}"] ${this.selectors.treeNodeCheckbox}`
    );
    await checkbox.click();
  }

  async deleteSelectedObject() {
    await this.pressKey('Delete');
    await this.waitForLoadingComplete();
  }

  // 属性编辑
  async setPosition(x: number, y: number, z: number) {
    await this.fillInput(this.selectors.positionX, x.toString());
    await this.fillInput(this.selectors.positionY, y.toString());
    await this.fillInput(this.selectors.positionZ, z.toString());
    await this.pressKey('Enter');
    await this.waitForLoadingComplete();
  }

  async setRotation(x: number, y: number, z: number) {
    await this.fillInput(this.selectors.rotationX, x.toString());
    await this.fillInput(this.selectors.rotationY, y.toString());
    await this.fillInput(this.selectors.rotationZ, z.toString());
    await this.pressKey('Enter');
    await this.waitForLoadingComplete();
  }

  async setScale(x: number, y: number, z: number) {
    await this.fillInput(this.selectors.scaleX, x.toString());
    await this.fillInput(this.selectors.scaleY, y.toString());
    await this.fillInput(this.selectors.scaleZ, z.toString());
    await this.pressKey('Enter');
    await this.waitForLoadingComplete();
  }

  // 获取对象信息
  async getObjectCount(): Promise<number> {
    const countText = await this.getElementText(this.selectors.objectCount);
    return parseInt(countText) || 0;
  }

  async getSelectedObjectInfo(): Promise<Record<string, string>> {
    const info: Record<string, string> = {};
    
    // 获取选择信息
    const selectionText = await this.getElementText(this.selectors.selectionInfo);
    if (selectionText) {
      info['selection'] = selectionText;
    }
    
    // 获取属性值
    if (await this.isElementVisible(this.selectors.positionX)) {
      info['positionX'] = await this.getElementText(this.selectors.positionX);
      info['positionY'] = await this.getElementText(this.selectors.positionY);
      info['positionZ'] = await this.getElementText(this.selectors.positionZ);
    }
    
    return info;
  }

  async getSceneTreeNodes(): Promise<string[]> {
    const nodes = await this.page.locator(this.selectors.treeNode).all();
    const nodeNames: string[] = [];
    
    for (const node of nodes) {
      const name = await node.getAttribute('data-object');
      if (name) {
        nodeNames.push(name);
      }
    }
    
    return nodeNames;
  }

  // 导入导出
  async importGeometry(filePath: string) {
    await this.clickElement(this.selectors.importButton);
    await this.waitForElement('[data-testid="import-dialog"]');
    
    await this.uploadFile('[data-testid="import-file-input"]', filePath);
    await this.clickElement('[data-testid="confirm-import"]');
    await this.waitForLoadingComplete();
  }

  async exportGeometry(format: 'obj' | 'stl' | 'ply' = 'obj') {
    await this.clickElement(this.selectors.exportButton);
    await this.waitForElement('[data-testid="export-dialog"]');
    
    await this.selectOption('[data-testid="export-format"]', format);
    
    const downloadPromise = this.page.waitForDownload();
    await this.clickElement('[data-testid="confirm-export"]');
    return await downloadPromise;
  }

  // 测量工具
  async activateMeasureTool() {
    await this.clickElement('[data-testid="measure-tool"]');
    await this.waitForElement('[data-testid="measure-instructions"]');
  }

  async measureDistance(point1: { x: number; y: number }, point2: { x: number; y: number }): Promise<number> {
    await this.activateMeasureTool();
    
    const viewport = this.getElement(this.selectors.viewport3D);
    await viewport.click({ position: point1 });
    await viewport.click({ position: point2 });
    
    // 获取测量结果
    await this.waitForElement('[data-testid="measure-result"]');
    const resultText = await this.getElementText('[data-testid="measure-result"]');
    
    // 解析距离值
    const match = resultText.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }

  // 材质设置
  async setObjectMaterial(materialId: string) {
    await this.waitForElement('[data-testid="material-selector"]');
    await this.selectOption('[data-testid="material-selector"]', materialId);
    await this.waitForLoadingComplete();
  }

  async createCustomMaterial(materialData: {
    name: string;
    color: string;
    metallic?: number;
    roughness?: number;
  }) {
    await this.clickElement('[data-testid="create-material"]');
    await this.waitForElement('[data-testid="material-editor"]');
    
    await this.fillInput('[data-testid="material-name"]', materialData.name);
    await this.fillInput('[data-testid="material-color"]', materialData.color);
    
    if (materialData.metallic !== undefined) {
      await this.fillInput('[data-testid="material-metallic"]', materialData.metallic.toString());
    }
    
    if (materialData.roughness !== undefined) {
      await this.fillInput('[data-testid="material-roughness"]', materialData.roughness.toString());
    }
    
    await this.clickElement('[data-testid="save-material"]');
    await this.waitForLoadingComplete();
  }

  // 网格操作
  async generateMesh() {
    await this.clickElement('[data-testid="generate-mesh"]');
    await this.waitForElement('[data-testid="mesh-settings"]');
    
    await this.clickElement('[data-testid="start-meshing"]');
    await this.waitForLoadingComplete();
  }

  async setMeshQuality(quality: 'coarse' | 'normal' | 'fine') {
    await this.selectOption('[data-testid="mesh-quality"]', quality);
  }

  // 快照和渲染
  async takeSnapshot(): Promise<any> {
    const downloadPromise = this.page.waitForDownload();
    await this.clickElement('[data-testid="take-snapshot"]');
    return await downloadPromise;
  }

  async toggleWireframe() {
    await this.clickElement('[data-testid="toggle-wireframe"]');
    await this.page.waitForTimeout(200);
  }

  async toggleGridDisplay() {
    await this.clickElement('[data-testid="toggle-grid"]');
    await this.page.waitForTimeout(200);
  }

  // 键盘快捷键
  async useKeyboardShortcuts() {
    // 测试常用快捷键
    await this.pressKey('Control+KeyZ'); // 撤销
    await this.waitForLoadingComplete();
    
    await this.pressKey('Control+KeyY'); // 重做
    await this.waitForLoadingComplete();
    
    await this.pressKey('Control+KeyA'); // 全选
    await this.waitForLoadingComplete();
  }

  // 性能监控
  async getPerformanceInfo(): Promise<Record<string, number>> {
    const performanceInfo: Record<string, number> = {};
    
    // 获取FPS信息
    if (await this.isElementVisible('[data-testid="fps-counter"]')) {
      const fpsText = await this.getElementText('[data-testid="fps-counter"]');
      const fps = parseInt(fpsText.replace('FPS: ', ''));
      performanceInfo.fps = fps;
    }
    
    // 获取多边形数量
    if (await this.isElementVisible('[data-testid="poly-count"]')) {
      const polyText = await this.getElementText('[data-testid="poly-count"]');
      const polyCount = parseInt(polyText.replace('Polygons: ', '').replace(',', ''));
      performanceInfo.polygons = polyCount;
    }
    
    return performanceInfo;
  }

  // 验证3D视口功能
  async verify3DViewportFunctional(): Promise<boolean> {
    // 检查WebGL支持
    const webglSupported = await this.page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    });
    
    if (!webglSupported) {
      return false;
    }
    
    // 检查3D视口是否渲染
    const viewport = this.getElement(this.selectors.viewport3D);
    const isVisible = await viewport.isVisible();
    
    return isVisible;
  }
}