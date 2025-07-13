import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 启动E2E测试环境...');
  
  // 检查后端服务是否运行
  try {
    const response = await fetch('http://localhost:8000/api/health');
    if (!response.ok) {
      console.warn('⚠️ 后端服务可能未启动，某些测试可能失败');
    } else {
      console.log('✅ 后端服务运行正常');
    }
  } catch (error) {
    console.warn('⚠️ 无法连接到后端服务，API相关测试将被跳过');
  }
  
  // 创建浏览器实例进行预热
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // 预加载主页面以确保应用正常启动
  try {
    await page.goto(config.projects[0].use?.baseURL || 'http://localhost:3000');
    await page.waitForSelector('body', { timeout: 10000 });
    console.log('✅ 前端应用启动正常');
  } catch (error) {
    console.error('❌ 前端应用启动失败:', error);
    throw error;
  }
  
  await browser.close();
  
  // 设置测试数据目录
  const fs = await import('fs');
  const path = await import('path');
  
  const testDataDir = path.join(__dirname, 'test-data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
    console.log('📁 创建测试数据目录');
  }
  
  // 创建测试用的DXF文件
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
0
10
0.0
20
0.0
30
0.0
11
100.0
21
0.0
31
0.0
0
CIRCLE
8
1
10
50.0
20
50.0
30
0.0
40
25.0
0
ENDSEC
0
EOF`;
  
  const testDxfPath = path.join(testDataDir, 'test-sample.dxf');
  fs.writeFileSync(testDxfPath, testDxfContent);
  console.log('📄 创建测试DXF文件');
  
  console.log('🎉 E2E测试环境准备完成');
}

export default globalSetup;