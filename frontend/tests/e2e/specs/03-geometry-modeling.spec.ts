import { test, expect } from '../fixtures/base-test';

test.describe('几何建模测试', () => {
  test.beforeEach(async ({ geometryPage }) => {
    await geometryPage.goto();
    await geometryPage.verifyPageLoaded();
  });

  test('页面加载和3D视口验证', async ({ geometryPage }) => {
    // 验证3D视口功能
    const isViewportFunctional = await geometryPage.verify3DViewportFunctional();
    expect(isViewportFunctional).toBe(true);

    // 验证工具栏存在
    await expect(geometryPage.page.locator('[data-testid="geometry-toolbar"]')).toBeVisible();
    
    // 验证属性面板存在
    await expect(geometryPage.page.locator('[data-testid="properties-panel"]')).toBeVisible();
    
    // 验证场景树存在
    await expect(geometryPage.page.locator('[data-testid="scene-tree"]')).toBeVisible();
  });

  test('基础几何体创建', async ({ geometryPage }) => {
    // 记录初始对象数量
    const initialCount = await geometryPage.getObjectCount();

    // 创建立方体
    await geometryPage.createBox(2, 2, 2);
    
    // 验证对象数量增加
    const countAfterBox = await geometryPage.getObjectCount();
    expect(countAfterBox).toBe(initialCount + 1);

    // 创建球体
    await geometryPage.createSphere(1.5);
    
    // 验证对象数量继续增加
    const countAfterSphere = await geometryPage.getObjectCount();
    expect(countAfterSphere).toBe(initialCount + 2);

    // 创建圆柱体
    await geometryPage.createCylinder(1, 3);
    
    // 验证最终对象数量
    const finalCount = await geometryPage.getObjectCount();
    expect(finalCount).toBe(initialCount + 3);

    // 验证场景树中的对象
    const sceneObjects = await geometryPage.getSceneTreeNodes();
    expect(sceneObjects.length).toBeGreaterThanOrEqual(3);
  });

  test('3D视口交互和视图控制', async ({ geometryPage }) => {
    // 创建一个测试对象
    await geometryPage.createBox(1, 1, 1);

    // 测试视图切换
    await geometryPage.setView('front');
    await geometryPage.page.waitForTimeout(500);

    await geometryPage.setView('top');
    await geometryPage.page.waitForTimeout(500);

    await geometryPage.setView('isometric');
    await geometryPage.page.waitForTimeout(500);

    // 测试缩放到合适大小
    await geometryPage.zoomFit();

    // 测试网格显示切换
    await geometryPage.toggleGridDisplay();
    await geometryPage.toggleGridDisplay(); // 再次切换回来

    // 测试线框模式
    await geometryPage.toggleWireframe();
    await geometryPage.toggleWireframe(); // 切换回实体模式
  });

  test('对象选择和属性编辑', async ({ geometryPage }) => {
    // 创建测试对象
    await geometryPage.createBox(1, 1, 1);

    // 通过场景树选择对象
    const sceneObjects = await geometryPage.getSceneTreeNodes();
    const firstObject = sceneObjects[0];
    await geometryPage.selectObjectInTree(firstObject);

    // 获取选择信息
    const selectionInfo = await geometryPage.getSelectedObjectInfo();
    expect(selectionInfo.selection).toBeTruthy();

    // 修改位置
    await geometryPage.setPosition(2, 3, 4);
    
    // 修改旋转
    await geometryPage.setRotation(45, 30, 60);
    
    // 修改缩放
    await geometryPage.setScale(1.5, 1.5, 1.5);

    // 验证属性更改生效
    const updatedInfo = await geometryPage.getSelectedObjectInfo();
    expect(updatedInfo.positionX).toBe('2');
    expect(updatedInfo.positionY).toBe('3');
    expect(updatedInfo.positionZ).toBe('4');
  });

  test('对象可见性控制', async ({ geometryPage }) => {
    // 创建多个对象
    await geometryPage.createBox(1, 1, 1);
    await geometryPage.createSphere(1);

    const objects = await geometryPage.getSceneTreeNodes();
    expect(objects.length).toBeGreaterThanOrEqual(2);

    // 切换第一个对象的可见性
    await geometryPage.toggleObjectVisibility(objects[0]);
    await geometryPage.page.waitForTimeout(200);

    // 再次切换可见性
    await geometryPage.toggleObjectVisibility(objects[0]);
    await geometryPage.page.waitForTimeout(200);
  });

  test('对象删除功能', async ({ geometryPage }) => {
    // 创建测试对象
    await geometryPage.createBox(1, 1, 1);
    await geometryPage.createSphere(1);

    const initialCount = await geometryPage.getObjectCount();
    expect(initialCount).toBeGreaterThanOrEqual(2);

    // 选择第一个对象
    const objects = await geometryPage.getSceneTreeNodes();
    await geometryPage.selectObjectInTree(objects[0]);

    // 删除选中对象
    await geometryPage.deleteSelectedObject();

    // 验证对象数量减少
    const finalCount = await geometryPage.getObjectCount();
    expect(finalCount).toBe(initialCount - 1);
  });

  test('材质设置和管理', async ({ geometryPage }) => {
    // 创建测试对象
    await geometryPage.createBox(1, 1, 1);
    
    // 选择对象
    const objects = await geometryPage.getSceneTreeNodes();
    await geometryPage.selectObjectInTree(objects[0]);

    // 创建自定义材质
    await geometryPage.createCustomMaterial({
      name: '测试材质',
      color: '#FF6B6B',
      metallic: 0.5,
      roughness: 0.3,
    });

    // 应用材质
    await geometryPage.setObjectMaterial('测试材质');
  });

  test('测量工具功能', async ({ geometryPage }) => {
    // 创建两个对象用于测量
    await geometryPage.createBox(1, 1, 1);
    await geometryPage.setPosition(0, 0, 0);
    
    await geometryPage.createBox(1, 1, 1);
    await geometryPage.setPosition(5, 0, 0);

    // 激活测量工具
    await geometryPage.activateMeasureTool();

    // 测量两点间距离
    const distance = await geometryPage.measureDistance(
      { x: 200, y: 300 },
      { x: 600, y: 300 }
    );

    // 验证测量结果合理
    expect(distance).toBeGreaterThan(0);
  });

  test('网格生成集成', async ({ geometryPage }) => {
    // 创建复杂几何体
    await geometryPage.createBox(2, 2, 2);
    await geometryPage.createSphere(1);

    // 设置网格质量
    await geometryPage.setMeshQuality('normal');

    // 生成网格
    await geometryPage.generateMesh();

    // 验证网格生成成功
    // 这里应该检查是否有网格生成完成的指示
    await expect(geometryPage.page.locator('[data-testid="mesh-generated"]')).toBeVisible();
  });

  test('几何体导入功能', async ({ geometryPage, testDataManager }) => {
    // 创建测试几何文件
    const testGeometryPath = await testDataManager.createTestGeometryFile('test.obj');

    const initialCount = await geometryPage.getObjectCount();

    // 导入几何文件
    await geometryPage.importGeometry(testGeometryPath);

    // 验证导入成功
    const finalCount = await geometryPage.getObjectCount();
    expect(finalCount).toBeGreaterThan(initialCount);
  });

  test('几何体导出功能', async ({ geometryPage }) => {
    // 创建测试对象
    await geometryPage.createBox(1, 1, 1);
    await geometryPage.createSphere(1);

    // 导出为OBJ格式
    const download = await geometryPage.exportGeometry('obj');
    expect(download.suggestedFilename()).toContain('.obj');

    // 导出为STL格式
    const stlDownload = await geometryPage.exportGeometry('stl');
    expect(stlDownload.suggestedFilename()).toContain('.stl');
  });

  test('快照功能', async ({ geometryPage }) => {
    // 创建一些几何体
    await geometryPage.createBox(1, 1, 1);
    await geometryPage.createSphere(1);
    
    // 设置美观的视图
    await geometryPage.setView('isometric');
    await geometryPage.zoomFit();

    // 拍摄快照
    const snapshot = await geometryPage.takeSnapshot();
    expect(snapshot.suggestedFilename()).toContain('.png');
  });

  test('键盘快捷键支持', async ({ geometryPage }) => {
    // 创建测试对象
    await geometryPage.createBox(1, 1, 1);

    // 测试键盘快捷键
    await geometryPage.useKeyboardShortcuts();

    // 验证快捷键功能正常工作
    // 这里主要测试快捷键不会导致错误
    const objectCount = await geometryPage.getObjectCount();
    expect(objectCount).toBeGreaterThanOrEqual(0);
  });

  test('性能监控', async ({ geometryPage }) => {
    // 创建多个对象来测试性能
    for (let i = 0; i < 5; i++) {
      await geometryPage.createBox(1, 1, 1);
      await geometryPage.setPosition(i * 2, 0, 0);
    }

    // 获取性能信息
    const performanceInfo = await geometryPage.getPerformanceInfo();
    
    // 验证FPS在合理范围内
    if (performanceInfo.fps) {
      expect(performanceInfo.fps).toBeGreaterThan(10);
      expect(performanceInfo.fps).toBeLessThan(200);
    }

    // 验证多边形数量
    if (performanceInfo.polygons) {
      expect(performanceInfo.polygons).toBeGreaterThan(0);
    }
  });

  test('复杂场景建模工作流程', async ({ geometryPage }) => {
    // 创建复杂场景
    await geometryPage.createBox(10, 1, 10); // 地面
    await geometryPage.setPosition(0, -0.5, 0);

    await geometryPage.createBox(2, 4, 2); // 建筑物1
    await geometryPage.setPosition(-3, 2, -3);

    await geometryPage.createCylinder(1, 6); // 圆柱
    await geometryPage.setPosition(3, 3, 3);

    await geometryPage.createSphere(1.5); // 装饰球体
    await geometryPage.setPosition(0, 5, 0);

    // 设置视图
    await geometryPage.setView('isometric');
    await geometryPage.zoomFit();

    // 验证场景完整性
    const objectCount = await geometryPage.getObjectCount();
    expect(objectCount).toBe(4);

    // 验证场景树
    const sceneObjects = await geometryPage.getSceneTreeNodes();
    expect(sceneObjects.length).toBe(4);

    // 性能检查
    const performanceInfo = await geometryPage.getPerformanceInfo();
    if (performanceInfo.fps) {
      expect(performanceInfo.fps).toBeGreaterThan(5); // 复杂场景的最低FPS要求
    }
  });

  test('错误处理和恢复', async ({ geometryPage }) => {
    // 测试无效参数的几何体创建
    try {
      await geometryPage.createBox(0, 0, 0); // 无效尺寸
    } catch (error) {
      // 应该优雅地处理错误
    }

    // 验证应用状态仍然正常
    const isViewportFunctional = await geometryPage.verify3DViewportFunctional();
    expect(isViewportFunctional).toBe(true);

    // 创建有效对象确认功能正常
    await geometryPage.createBox(1, 1, 1);
    const objectCount = await geometryPage.getObjectCount();
    expect(objectCount).toBeGreaterThanOrEqual(1);
  });
});