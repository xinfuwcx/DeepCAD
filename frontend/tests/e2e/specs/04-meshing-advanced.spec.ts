import { test, expect } from '../fixtures/base-test';

test.describe('高级网格生成测试', () => {
  test.beforeEach(async ({ meshingPage, geometryPage }) => {
    // 先创建一些几何体用于网格生成
    await geometryPage.goto();
    await geometryPage.verifyPageLoaded();
    await geometryPage.createBox(2, 2, 2);
    
    // 然后切换到网格页面
    await meshingPage.goto();
    await meshingPage.verifyPageLoaded();
  });

  test('页面加载和界面验证', async ({ meshingPage }) => {
    // 验证页面标题
    await expect(meshingPage.page.locator('h1')).toContainText('网格');

    // 验证主要标签页存在
    await expect(meshingPage.page.locator('[data-testid="meshing-tabs"]')).toBeVisible();
    
    // 验证所有标签页都可访问
    await meshingPage.switchToTab('basic');
    await meshingPage.switchToTab('advanced');
    await meshingPage.switchToTab('physicalGroups');
    await meshingPage.switchToTab('basic'); // 回到基础标签页
  });

  test('基础网格生成', async ({ meshingPage }) => {
    // 配置基础网格参数并生成
    await meshingPage.generateBasicMesh({
      elementSize: 0.5,
      quality: 'normal',
      algorithm2D: 'delaunay',
      algorithm3D: 'delaunay',
    });

    // 验证网格生成成功
    const statistics = await meshingPage.getMeshStatistics();
    expect(statistics.nodeCount).toBeGreaterThan(0);
    expect(statistics.elementCount).toBeGreaterThan(0);

    // 验证质量指标
    expect(statistics.qualityMetrics).toBeTruthy();
  });

  test('高级网格配置和生成', async ({ meshingPage }) => {
    // 配置高级网格参数
    await meshingPage.generateAdvancedMesh({
      preset: 'engineering',
      elementSize: 0.3,
      algorithm2D: 'frontal',
      algorithm3D: 'mmg',
      elementType2D: 'triangle',
      elementType3D: 'tetrahedron',
      qualityMode: 'high',
      refinementStrategy: 'adaptive',
      smoothingAlgorithm: 'laplacian',
      smoothingIterations: 5,
      enableOptimization: true,
      generateSecondOrder: false,
      sizeField: {
        enable: true,
        minSize: 0.1,
        maxSize: 1.0,
        growthRate: 1.3,
        curvatureAdaptation: true,
      },
      boundaryLayers: {
        enable: true,
        numberOfLayers: 3,
        firstLayerThickness: 0.05,
        growthRatio: 1.2,
      },
      parallel: {
        enable: true,
        numThreads: 4,
        loadBalancing: true,
      },
    });

    // 验证高级网格生成成功
    const statistics = await meshingPage.getMeshStatistics();
    expect(statistics.nodeCount).toBeGreaterThan(0);
    expect(statistics.elementCount).toBeGreaterThan(0);

    // 验证高级功能产生了更精细的网格
    expect(statistics.elementCount).toBeGreaterThan(50);
  });

  test('网格预设配置测试', async ({ meshingPage }) => {
    const presets = ['rapid', 'engineering', 'research', 'production', 'aerospace', 'automotive'];

    for (const preset of presets) {
      await meshingPage.generateAdvancedMesh({ preset });

      // 验证每个预设都能成功生成网格
      const statistics = await meshingPage.getMeshStatistics();
      expect(statistics.nodeCount).toBeGreaterThan(0);
      expect(statistics.elementCount).toBeGreaterThan(0);

      // 获取性能估算
      const performance = await meshingPage.getPerformanceEstimate();
      expect(performance.estimatedElements).toBeGreaterThan(0);
      expect(performance.estimatedTime).toBeGreaterThan(0);
      expect(performance.performanceClass).toBeTruthy();
    }
  });

  test('物理组管理', async ({ meshingPage }) => {
    await meshingPage.switchToTab('physicalGroups');

    // 创建多个物理组
    const physicalGroups = [
      {
        name: '结构材料',
        type: 'volume',
        material: 'concrete',
        entityTags: ['1', '2'],
      },
      {
        name: '边界条件',
        type: 'surface',
        material: 'steel',
        entityTags: ['3', '4', '5'],
      },
      {
        name: '载荷区域',
        type: 'surface',
        material: 'aluminum',
        entityTags: ['6'],
      },
    ];

    for (const group of physicalGroups) {
      await meshingPage.createPhysicalGroup(group);
    }

    // 验证物理组创建成功
    const groups = await meshingPage.getPhysicalGroups();
    expect(groups.length).toBe(3);

    // 验证组信息正确
    const structuralGroup = groups.find(g => g.name === '结构材料');
    expect(structuralGroup).toBeTruthy();
    expect(structuralGroup!.type).toBe('volume');
    expect(structuralGroup!.material).toBe('concrete');
  });

  test('物理组删除功能', async ({ meshingPage }) => {
    await meshingPage.switchToTab('physicalGroups');

    // 创建测试物理组
    await meshingPage.createPhysicalGroup({
      name: '临时组',
      type: 'volume',
      material: 'aluminum',
      entityTags: ['1'],
    });

    // 验证创建成功
    let groups = await meshingPage.getPhysicalGroups();
    const initialCount = groups.length;
    expect(groups.some(g => g.name === '临时组')).toBe(true);

    // 删除物理组
    await meshingPage.deletePhysicalGroup('临时组');

    // 验证删除成功
    groups = await meshingPage.getPhysicalGroups();
    expect(groups.length).toBe(initialCount - 1);
    expect(groups.some(g => g.name === '临时组')).toBe(false);
  });

  test('配置验证功能', async ({ meshingPage }) => {
    await meshingPage.switchToTab('advanced');

    // 设置一些可能导致警告的配置
    await meshingPage.generateAdvancedMesh({
      elementSize: 10, // 非常大的单元尺寸
      algorithm2D: 'delaunay',
      sizeField: {
        enable: true,
        minSize: 5, // 最小尺寸大于单元尺寸
        maxSize: 1, // 最大尺寸小于最小尺寸
        growthRate: 0.5, // 无效的增长率
      },
    });

    // 验证配置验证结果
    const validation = await meshingPage.validateConfiguration();
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  test('性能估算准确性', async ({ meshingPage }) => {
    await meshingPage.switchToTab('advanced');

    // 配置已知参数
    await meshingPage.generateAdvancedMesh({
      elementSize: 0.5,
      algorithm2D: 'delaunay',
      algorithm3D: 'delaunay',
    });

    // 获取性能估算
    const estimate = await meshingPage.getPerformanceEstimate();
    
    // 验证估算合理性
    expect(estimate.estimatedElements).toBeGreaterThan(10);
    expect(estimate.estimatedElements).toBeLessThan(1000000);
    expect(estimate.estimatedTime).toBeGreaterThan(0);
    expect(estimate.estimatedTime).toBeLessThan(3600); // 不超过1小时
    expect(estimate.estimatedMemory).toBeGreaterThan(0);
    expect(estimate.performanceClass).toMatch(/(Low|Medium|High|Extreme)/);

    // 验证推荐信息
    expect(estimate.recommendations).toBeTruthy();
    expect(Array.isArray(estimate.recommendations)).toBe(true);
  });

  test('网格生成进度监控', async ({ meshingPage }) => {
    // 配置较复杂的网格以观察进度
    await meshingPage.switchToTab('advanced');
    
    // 开始网格生成
    const meshPromise = meshingPage.generateAdvancedMesh({
      elementSize: 0.2,
      algorithm2D: 'frontal',
      algorithm3D: 'mmg',
      enableOptimization: true,
      smoothingIterations: 10,
    });

    // 监控进度
    let progressCount = 0;
    while (progressCount < 5) {
      try {
        const progress = await meshingPage.getMeshingProgress();
        expect(progress.status).toBeTruthy();
        expect(progress.progress).toBeGreaterThanOrEqual(0);
        expect(progress.progress).toBeLessThanOrEqual(100);
        
        if (progress.status.includes('完成')) {
          break;
        }
        
        progressCount++;
        await meshingPage.page.waitForTimeout(1000);
      } catch (error) {
        // 进度监控可能在快速完成时失败，这是正常的
        break;
      }
    }

    // 等待完成
    await meshPromise;
  });

  test('网格取消功能', async ({ meshingPage }) => {
    await meshingPage.switchToTab('advanced');

    // 配置耗时的网格生成
    const meshPromise = meshingPage.generateAdvancedMesh({
      elementSize: 0.1, // 很小的单元尺寸
      algorithm3D: 'mmg',
      smoothingIterations: 20,
    });

    // 等待一段时间后取消
    await meshingPage.page.waitForTimeout(2000);
    await meshingPage.cancelMeshing();

    // 验证取消成功
    const progress = await meshingPage.getMeshingProgress();
    expect(progress.status).toMatch(/(已取消|取消|cancelled)/i);
  });

  test('网格质量分析', async ({ meshingPage }) => {
    // 生成测试网格
    await meshingPage.generateBasicMesh({
      elementSize: 0.5,
      quality: 'fine',
    });

    // 分析网格质量
    const qualityAnalysis = await meshingPage.analyzeMeshQuality();
    
    // 验证质量分析结果
    expect(qualityAnalysis.minQuality).toBeGreaterThan(0);
    expect(qualityAnalysis.maxQuality).toBeLessThanOrEqual(1);
    expect(qualityAnalysis.averageQuality).toBeGreaterThan(qualityAnalysis.minQuality);
    expect(qualityAnalysis.averageQuality).toBeLessThanOrEqual(qualityAnalysis.maxQuality);
    expect(qualityAnalysis.poorElements).toBeGreaterThanOrEqual(0);
  });

  test('网格细化功能', async ({ meshingPage }) => {
    // 生成初始网格
    await meshingPage.generateBasicMesh({
      elementSize: 1.0,
      quality: 'coarse',
    });

    const initialStats = await meshingPage.getMeshStatistics();

    // 进行网格细化
    await meshingPage.refineMesh(['region1', 'region2']);

    // 验证细化后网格更精细
    const refinedStats = await meshingPage.getMeshStatistics();
    expect(refinedStats.elementCount).toBeGreaterThan(initialStats.elementCount);
  });

  test('网格导出功能', async ({ meshingPage }) => {
    // 生成测试网格
    await meshingPage.generateBasicMesh({
      elementSize: 0.5,
      quality: 'normal',
    });

    // 测试不同格式导出
    const formats: ('vtk' | 'msh' | 'unv')[] = ['vtk', 'msh', 'unv'];
    
    for (const format of formats) {
      const download = await meshingPage.exportMesh(format);
      expect(download.suggestedFilename()).toContain(`.${format}`);
    }
  });

  test('网格可视化功能', async ({ meshingPage }) => {
    // 生成测试网格
    await meshingPage.generateBasicMesh({
      elementSize: 0.5,
      quality: 'normal',
    });

    // 在3D视口中查看网格
    await meshingPage.viewMeshIn3D();

    // 测试线框模式切换
    await meshingPage.toggleMeshWireframe();
    await meshingPage.toggleMeshWireframe(); // 切换回实体模式

    // 测试按质量着色
    await meshingPage.colorMeshByQuality();
  });

  test('边界层网格生成', async ({ meshingPage }) => {
    await meshingPage.switchToTab('advanced');

    // 配置边界层网格
    await meshingPage.generateAdvancedMesh({
      elementSize: 0.4,
      boundaryLayers: {
        enable: true,
        numberOfLayers: 5,
        firstLayerThickness: 0.02,
        growthRatio: 1.3,
      },
    });

    // 验证边界层网格生成成功
    const statistics = await meshingPage.getMeshStatistics();
    expect(statistics.nodeCount).toBeGreaterThan(0);
    expect(statistics.elementCount).toBeGreaterThan(0);

    // 边界层应该产生更多的单元
    expect(statistics.elementCount).toBeGreaterThan(100);
  });

  test('并行网格生成', async ({ meshingPage }) => {
    await meshingPage.switchToTab('advanced');

    // 配置并行计算
    await meshingPage.generateAdvancedMesh({
      elementSize: 0.3,
      algorithm3D: 'mmg',
      parallel: {
        enable: true,
        numThreads: 4,
        loadBalancing: true,
      },
    });

    // 验证并行网格生成成功
    const statistics = await meshingPage.getMeshStatistics();
    expect(statistics.nodeCount).toBeGreaterThan(0);
    expect(statistics.elementCount).toBeGreaterThan(0);
  });

  test('网格算法比较', async ({ meshingPage }) => {
    const algorithms = ['delaunay', 'frontal', 'mmg'];
    const results: Record<string, any> = {};

    for (const algorithm of algorithms) {
      await meshingPage.generateAdvancedMesh({
        elementSize: 0.5,
        algorithm2D: algorithm,
        algorithm3D: algorithm,
      });

      const statistics = await meshingPage.getMeshStatistics();
      results[algorithm] = statistics;

      // 验证每种算法都能生成有效网格
      expect(statistics.nodeCount).toBeGreaterThan(0);
      expect(statistics.elementCount).toBeGreaterThan(0);
    }

    // 验证不同算法产生不同的结果
    const elementCounts = Object.values(results).map((r: any) => r.elementCount);
    const hasVariation = new Set(elementCounts).size > 1;
    expect(hasVariation).toBe(true);
  });

  test('复杂几何网格生成工作流程', async ({ meshingPage, geometryPage }) => {
    // 创建复杂几何场景
    await geometryPage.goto();
    await geometryPage.createBox(4, 4, 1); // 底座
    await geometryPage.setPosition(0, 0, 0);
    
    await geometryPage.createCylinder(1, 3); // 圆柱
    await geometryPage.setPosition(0, 0, 2);
    
    await geometryPage.createSphere(0.8); // 球体
    await geometryPage.setPosition(0, 0, 4);

    // 切换到网格页面
    await meshingPage.goto();
    await meshingPage.verifyPageLoaded();

    // 创建材料分组
    await meshingPage.switchToTab('physicalGroups');
    
    await meshingPage.createPhysicalGroup({
      name: '底座',
      type: 'volume',
      material: 'concrete',
      entityTags: ['1'],
    });
    
    await meshingPage.createPhysicalGroup({
      name: '支柱',
      type: 'volume',
      material: 'steel',
      entityTags: ['2'],
    });
    
    await meshingPage.createPhysicalGroup({
      name: '装饰',
      type: 'volume',
      material: 'aluminum',
      entityTags: ['3'],
    });

    // 生成自适应网格
    await meshingPage.switchToTab('advanced');
    await meshingPage.generateAdvancedMesh({
      preset: 'engineering',
      refinementStrategy: 'adaptive',
      sizeField: {
        enable: true,
        minSize: 0.1,
        maxSize: 0.8,
        curvatureAdaptation: true,
      },
      enableOptimization: true,
    });

    // 验证复杂网格生成成功
    const statistics = await meshingPage.getMeshStatistics();
    expect(statistics.nodeCount).toBeGreaterThan(100);
    expect(statistics.elementCount).toBeGreaterThan(50);

    // 验证物理组正确设置
    const groups = await meshingPage.getPhysicalGroups();
    expect(groups.length).toBe(3);

    // 分析网格质量
    const quality = await meshingPage.analyzeMeshQuality();
    expect(quality.averageQuality).toBeGreaterThan(0.3); // 合理的质量要求

    // 导出最终网格
    const download = await meshingPage.exportMesh('vtk');
    expect(download.suggestedFilename()).toContain('.vtk');
  });

  test('错误处理和恢复', async ({ meshingPage }) => {
    // 测试无效配置
    try {
      await meshingPage.generateAdvancedMesh({
        elementSize: 0, // 无效单元尺寸
        sizeField: {
          enable: true,
          minSize: 10,
          maxSize: 1, // 矛盾的尺寸设置
        },
      });
    } catch (error) {
      // 应该优雅地处理错误
    }

    // 验证应用状态仍然正常
    await meshingPage.verifyPageLoaded();

    // 确认正常配置仍然工作
    await meshingPage.generateBasicMesh({
      elementSize: 0.5,
      quality: 'normal',
    });

    const statistics = await meshingPage.getMeshStatistics();
    expect(statistics.nodeCount).toBeGreaterThan(0);
  });
});