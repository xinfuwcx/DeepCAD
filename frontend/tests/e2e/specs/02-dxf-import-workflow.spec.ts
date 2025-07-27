import { test, expect } from '../fixtures/base-test';

test.describe('DXF导入工作流程测试', () => {
  let testDXFPath: string;
  let complexDXFPath: string;
  let corruptedDXFPath: string;

  test.beforeAll(async ({ testDataManager }) => {
    // 创建测试用的DXF文件
    testDXFPath = await testDataManager.createTestDXF('test-basic.dxf');
    complexDXFPath = await testDataManager.createComplexTestDXF('test-complex.dxf');
    corruptedDXFPath = await testDataManager.createCorruptedDXF('test-corrupted.dxf');
  });

  test.beforeEach(async ({ dxfImportPage }) => {
    await dxfImportPage.goto();
    await dxfImportPage.verifyPageLoaded();
  });

  test('基本DXF文件上传和分析', async ({ dxfImportPage }) => {
    // 上传DXF文件
    await dxfImportPage.uploadDXFFile(testDXFPath);
    
    // 验证文件已选择
    const fileInfo = await dxfImportPage.getFileInfo();
    expect(fileInfo['文件名']).toContain('test-basic.dxf');
    
    // 分析文件
    await dxfImportPage.analyzeDXFFile();
    
    // 验证分析结果
    const statistics = await dxfImportPage.getStatistics();
    expect(statistics['总实体数']).toBeGreaterThan(0);
    expect(statistics['图层数']).toBeGreaterThan(0);
    
    // 检查图层信息
    const layers = await dxfImportPage.getLayersList();
    expect(layers.length).toBeGreaterThan(0);
    expect(layers[0].name).toBeTruthy();
  });

  test('复杂DXF文件处理', async ({ dxfImportPage }) => {
    // 上传复杂DXF文件
    await dxfImportPage.uploadDXFFile(complexDXFPath);
    
    // 分析文件
    await dxfImportPage.analyzeDXFFile();
    
    // 验证复杂文件的统计信息
    const statistics = await dxfImportPage.getStatistics();
    expect(statistics['总实体数']).toBeGreaterThan(5);
    expect(statistics['图层数']).toBeGreaterThan(1);
    
    // 验证包含多种实体类型
    const layers = await dxfImportPage.getLayersList();
    const hasMultipleLayers = layers.length > 1;
    expect(hasMultipleLayers).toBe(true);
    
    // 配置处理选项
    await dxfImportPage.configureProcessingOptions({
      mode: 'tolerant',
      scaleFactor: 1.0,
      repairOptions: {
        fixDuplicateVertices: true,
        fixZeroLengthLines: true,
        fixInvalidGeometries: true,
      },
    });
    
    // 处理文件
    await dxfImportPage.processDXFFile();
    await dxfImportPage.waitForProcessingComplete();
    
    // 验证处理结果
    const isSuccessful = await dxfImportPage.isProcessingSuccessful();
    expect(isSuccessful).toBe(true);
    
    const results = await dxfImportPage.getProcessingResults();
    expect(results['已处理实体']).toBeGreaterThan(0);
  });

  test('图层过滤功能', async ({ dxfImportPage }) => {
    // 上传并分析复杂DXF文件
    await dxfImportPage.uploadDXFFile(complexDXFPath);
    await dxfImportPage.analyzeDXFFile();
    
    // 获取图层列表
    const layers = await dxfImportPage.getLayersList();
    expect(layers.length).toBeGreaterThan(1);
    
    // 取消选择第一个图层
    await dxfImportPage.toggleLayer(layers[0].name, false);
    
    // 应用图层过滤
    await dxfImportPage.applyLayerFilter();
    
    // 配置处理选项保留图层过滤
    await dxfImportPage.configureProcessingOptions({
      mode: 'tolerant',
    });
    
    // 处理文件
    await dxfImportPage.processDXFFile();
    await dxfImportPage.waitForProcessingComplete();
    
    // 验证过滤效果
    const results = await dxfImportPage.getProcessingResults();
    const processedEntities = results['已处理实体'] as number;
    const originalEntityCount = layers.reduce((sum, layer) => sum + layer.entityCount, 0);
    const filteredEntityCount = originalEntityCount - layers[0].entityCount;
    
    // 处理的实体数应该小于原始实体数
    expect(processedEntities).toBeLessThan(originalEntityCount);
    expect(processedEntities).toBeCloseTo(filteredEntityCount, 5);
  });

  test('处理选项配置', async ({ dxfImportPage }) => {
    await dxfImportPage.uploadDXFFile(testDXFPath);
    
    // 配置各种处理选项
    await dxfImportPage.configureProcessingOptions({
      mode: 'repair',
      coordinateSystem: 'wcs',
      scaleFactor: 2.0,
      rotationAngle: 45,
      repairOptions: {
        fixDuplicateVertices: true,
        fixZeroLengthLines: true,
        fixInvalidGeometries: true,
      },
    });
    
    // 分析和处理
    await dxfImportPage.analyzeDXFFile();
    await dxfImportPage.processDXFFile();
    await dxfImportPage.waitForProcessingComplete();
    
    // 验证处理成功
    const isSuccessful = await dxfImportPage.isProcessingSuccessful();
    expect(isSuccessful).toBe(true);
    
    // 验证输出文件生成
    const outputFiles = await dxfImportPage.getOutputFiles();
    expect(outputFiles.length).toBeGreaterThan(0);
  });

  test('错误文件处理', async ({ dxfImportPage }) => {
    // 上传损坏的DXF文件
    await dxfImportPage.uploadDXFFile(corruptedDXFPath);
    
    // 尝试分析
    await dxfImportPage.analyzeDXFFile();
    
    // 验证是否有验证问题
    const validationIssues = await dxfImportPage.getValidationIssues();
    expect(validationIssues.length).toBeGreaterThan(0);
    
    // 验证错误严重程度
    const hasErrors = validationIssues.some(issue => issue.severity === 'error');
    expect(hasErrors).toBe(true);
    
    // 尝试修复模式处理
    await dxfImportPage.configureProcessingOptions({
      mode: 'repair',
      repairOptions: {
        fixDuplicateVertices: true,
        fixZeroLengthLines: true,
        fixInvalidGeometries: true,
      },
    });
    
    await dxfImportPage.processDXFFile();
    await dxfImportPage.waitForProcessingComplete();
    
    // 验证修复结果
    const results = await dxfImportPage.getProcessingResults();
    const repairedEntities = results['修复的实体'] as number;
    expect(repairedEntities).toBeGreaterThan(0);
  });

  test('文件下载功能', async ({ dxfImportPage, page }) => {
    // 上传和处理文件
    await dxfImportPage.uploadDXFFile(testDXFPath);
    await dxfImportPage.analyzeDXFFile();
    await dxfImportPage.processDXFFile();
    await dxfImportPage.waitForProcessingComplete();
    
    // 获取输出文件列表
    const outputFiles = await dxfImportPage.getOutputFiles();
    expect(outputFiles.length).toBeGreaterThan(0);
    
    // 下载第一个输出文件
    const downloadPromise = page.waitForDownload();
    await dxfImportPage.downloadFile(outputFiles[0]);
    const download = await downloadPromise;
    
    // 验证下载
    expect(download.suggestedFilename()).toContain('.dxf');
  });

  test('拖拽上传功能', async ({ dxfImportPage, page }) => {
    // 模拟拖拽文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testDXFPath);
    
    // 验证文件选择
    const fileInfo = await dxfImportPage.getFileInfo();
    expect(fileInfo['文件名']).toContain('test-basic.dxf');
    
    // 继续正常流程
    await dxfImportPage.analyzeDXFFile();
    
    const statistics = await dxfImportPage.getStatistics();
    expect(statistics['总实体数']).toBeGreaterThan(0);
  });

  test('多标签页切换', async ({ dxfImportPage }) => {
    // 上传文件
    await dxfImportPage.uploadDXFFile(testDXFPath);
    
    // 测试标签页切换
    await dxfImportPage.switchToTab('analysis');
    await dxfImportPage.analyzeDXFFile();
    
    await dxfImportPage.switchToTab('options');
    await dxfImportPage.configureProcessingOptions({
      mode: 'tolerant',
    });
    
    await dxfImportPage.switchToTab('results');
    await dxfImportPage.processDXFFile();
    await dxfImportPage.waitForProcessingComplete();
    
    // 验证结果标签页显示正确信息
    const results = await dxfImportPage.getProcessingResults();
    expect(results['已处理实体']).toBeGreaterThan(0);
  });

  test('API集成测试', async ({ apiHelper, testDataManager }) => {
    // 直接通过API测试DXF导入
    const healthStatus = await apiHelper.healthCheck();
    expect(healthStatus).toBe(true);
    
    // 创建测试文件
    const testFile = await testDataManager.createTestDXF('api-test.dxf');
    
    // 分析DXF文件
    const analysisResult = await apiHelper.analyzeDXFFile(testFile);
    expect(analysisResult.statistics.total_entities).toBeGreaterThan(0);
    
    // 上传并处理文件
    const uploadResult = await apiHelper.uploadDXFFile(testFile, {
      mode: 'tolerant',
      fix_duplicate_vertices: true,
    });
    
    expect(uploadResult.import_id).toBeTruthy();
    expect(uploadResult.status).toBe('analyzing');
    
    // 轮询处理状态
    const finalStatus = await apiHelper.waitForAsyncOperation(
      () => apiHelper.getDXFImportStatus(uploadResult.import_id),
      (result) => result.status === 'completed' || result.status === 'failed',
      30000
    );
    
    expect(finalStatus.status).toBe('completed');
    expect(finalStatus.processing_result.success).toBe(true);
  });

  test('性能测试 - 大文件处理', async ({ dxfImportPage, testDataManager }) => {
    // 创建包含更多实体的测试文件
    const largeDXFContent = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1018
0
ENDSEC
0
SECTION
2
ENTITIES`;

    // 添加1000个线段
    let entityContent = '';
    for (let i = 0; i < 1000; i++) {
      entityContent += `
0
LINE
8
TestLayer
10
${i}.0
20
0.0
30
0.0
11
${i + 1}.0
21
1.0
31
0.0`;
    }

    const largeContent = largeDXFContent + entityContent + `
0
ENDSEC
0
EOF`;

    const largeDXFPath = await testDataManager.createTestDXF('large-test.dxf', largeContent);
    
    // 记录处理时间
    const startTime = Date.now();
    
    await dxfImportPage.uploadDXFFile(largeDXFPath);
    await dxfImportPage.analyzeDXFFile();
    
    const analysisTime = Date.now() - startTime;
    
    // 验证分析结果
    const statistics = await dxfImportPage.getStatistics();
    expect(statistics['总实体数']).toBe(1000);
    
    // 处理时间应该在合理范围内（小于30秒）
    expect(analysisTime).toBeLessThan(30000);
    
    // 处理文件
    const processStart = Date.now();
    await dxfImportPage.processDXFFile();
    await dxfImportPage.waitForProcessingComplete(60000); // 增加超时时间
    
    const processTime = Date.now() - processStart;
    expect(processTime).toBeLessThan(60000);
    
    // 验证处理结果
    const isSuccessful = await dxfImportPage.isProcessingSuccessful();
    expect(isSuccessful).toBe(true);
  });

  test.afterAll(async ({ testDataManager }) => {
    // 清理测试数据
    await testDataManager.cleanup();
  });
});