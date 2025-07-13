import { test, expect } from '../fixtures/base-test';

test.describe('端到端核心工作流测试', () => {
  test.beforeEach(async ({ geometryPage, page }) => {
    // 每个测试都从几何页面开始
    await geometryPage.goto();
    await page.waitForLoadState('networkidle');
    await geometryPage.verifyPageLoaded();
  });

  test('创建构件 -> 指派材料 -> 配置网格 -> 生成', async ({ geometryPage, meshingPage, page }) => {
    // 1. 创建地连墙构件
    await test.step('创建地连墙', async () => {
      await geometryPage.createDiaphragmWall([
        { x: -20, y: -15 },
        { x: 20, y: -15 },
        { x: 20, y: 15 },
        { x: -20, y: 15 },
        { x: -20, y: -15 },
      ]);
      await expect(page.locator('[data-testid="scene-tree-node-DiaphragmWall"]')).toBeVisible();
    });

    // 2. 选择构件并指派材料
    await test.step('指派材料', async () => {
      await geometryPage.selectObjectInTree('DiaphragmWall');
      await geometryPage.assignMaterial('混凝土 C30');
      // 验证材料是否已指派（可添加更具体的断言，如检查属性面板的值）
      const materialAssigned = await geometryPage.page.locator(`text='混凝土 C30'`);
      await expect(materialAssigned).toBeVisible();
    });

    // 3. 切换到网格页面
    await test.step('导航到网格页面', async () => {
      await geometryPage.navigateTo('meshing');
      await meshingPage.verifyPageLoaded();
    });

    // 4. 配置高级网格参数
    await test.step('配置高级网格', async () => {
      await meshingPage.openAdvancedSettings();
      await meshingPage.selectAlgorithm('3d', 'Netgen');
      await meshingPage.setGlobalElementSize(1.5);
      await meshingPage.setQualityMode('High Quality');
    });

    // 5. 生成网格
    await test.step('生成网格', async () => {
      // 监听WebSocket消息以确认网格生成成功
      const wsMessage = meshingPage.page.waitForEvent('websocket', ws => ws.url().includes('/ws/meshing'));
      
      await meshingPage.clickGenerateMesh();
      
      // 等待并验证WebSocket消息
      const ws = await wsMessage;
      const successMessage = await new Promise(resolve => {
        ws.on('framereceived', frame => {
          const payload = JSON.parse(frame.payload as string);
          if (payload.status === 'completed') {
            resolve(payload);
          }
        });
      });

      expect(successMessage).toBeDefined();
      expect(successMessage.status).toBe('completed');
      expect(successMessage.stats.elements).toBeGreaterThan(100);
    });

    // 6. 验证3D视图中是否显示了网格
    await test.step('验证网格显示', async () => {
        const isMeshVisible = await meshingPage.isMeshVisibleInViewport();
        expect(isMeshVisible).toBe(true);
    });
  });
}); 