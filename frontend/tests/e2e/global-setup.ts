/**
 * E2E测试全局设置
 * 3号计算专家 - 测试环境初始化配置
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 初始化DeepCAD E2E测试环境...');

  // 1. 检查后端服务状态
  try {
    const response = await fetch('http://localhost:8000/api/health');
    if (!response.ok) {
      console.warn('⚠️ 后端服务可能未启动，某些深基坑计算测试可能失败');
    } else {
      console.log('✅ 深基坑计算后端服务运行正常');
    }
  } catch (error) {
    console.warn('⚠️ 无法连接到后端服务，将使用前端模拟数据进行测试');
  }

  // 启动浏览器进行预热
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 2. 验证开发服务器可访问性（使用正确的端口）
    console.log('📡 检查Vite开发服务器状态...');
    const baseURL = config.projects[0].use?.baseURL || 'http://localhost:5173';
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    
    // 等待主应用加载
    await page.waitForSelector('[data-testid="deepcad-main-app"]', { timeout: 30000 });
    console.log('✅ DeepCAD前端应用启动正常');

    // 3. 预加载WebGPU资源（如果可用）
    console.log('🎮 检查WebGPU支持状态...');
    const webgpuSupported = await page.evaluate(() => {
      return 'gpu' in navigator;
    });
    
    if (webgpuSupported) {
      console.log('✅ WebGPU支持已确认，将测试GPU加速功能');
    } else {
      console.log('⚠️  WebGPU不可用，将测试WebGL回退机制');
    }

    // 4. 预热应用核心模块
    console.log('🔥 预热DeepCAD核心计算模块...');
    
    // 模拟创建一个测试项目来预热系统
    await page.click('[data-testid="create-new-project"]');
    await page.fill('[data-testid="project-name-input"]', 'E2E环境预热项目');
    await page.selectOption('[data-testid="project-type-select"]', 'deep_excavation');
    await page.click('[data-testid="confirm-create-project"]');
    
    // 等待项目界面加载
    await page.waitForSelector('[data-testid="project-title"]', { timeout: 10000 });
    console.log('✅ 深基坑分析模块预热完成');

    // 5. 清理预热项目，准备干净的测试环境
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // 6. 设置测试环境标识
    console.log('🏷️  设置E2E测试环境标识...');
    await page.evaluate(() => {
      localStorage.setItem('e2e-test-mode', 'true');
      localStorage.setItem('test-data-prepared', 'true');
      localStorage.setItem('deepcad-test-environment', 'e2e');
    });

    console.log('✅ DeepCAD E2E测试环境初始化完成');

  } catch (error) {
    console.error('❌ E2E测试环境初始化失败:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
  
  // 7. 设置测试数据目录
  console.log('📁 准备测试数据文件...');
  const fs = await import('fs');
  const path = await import('path');
  
  const testDataDir = path.join(__dirname, 'test-data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
    console.log('📁 创建测试数据目录');
  }
  
  // 创建测试用的深基坑DXF几何文件
  const testDxfContent = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1012
9
$INSUNITS
70
4
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
EXCAVATION_BOUNDARY
10
0.0
20
0.0
30
0.0
11
30.0
21
0.0
31
0.0
0
LINE
8
EXCAVATION_BOUNDARY
10
30.0
20
0.0
30
0.0
11
30.0
21
40.0
31
0.0
0
LINE
8
EXCAVATION_BOUNDARY
10
30.0
20
40.0
30
0.0
11
0.0
21
40.0
31
0.0
0
LINE
8
EXCAVATION_BOUNDARY
10
0.0
20
40.0
30
0.0
11
0.0
21
0.0
31
0.0
0
CIRCLE
8
SUPPORT_STRUCTURE
10
15.0
20
20.0
30
-8.0
40
1.0
0
ENDSEC
0
EOF`;
  
  const testDxfPath = path.join(testDataDir, 'test-excavation.dxf');
  fs.writeFileSync(testDxfPath, testDxfContent);
  console.log('📄 创建深基坑测试DXF几何文件');
  
  console.log('🎉 DeepCAD E2E测试环境准备完成 - 开始执行测试');
}

export default globalSetup;