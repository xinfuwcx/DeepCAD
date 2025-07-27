/**
 * E2E测试全局清理
 * 3号计算专家 - 测试环境清理和资源释放
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 开始清理DeepCAD E2E测试环境...');
  
  // 1. 清理测试数据
  const fs = await import('fs');
  const path = await import('path');
  
  const testDataDir = path.join(__dirname, 'test-data');
  if (fs.existsSync(testDataDir)) {
    try {
      fs.rmSync(testDataDir, { recursive: true, force: true });
      console.log('📁 清理深基坑测试数据目录');
    } catch (error) {
      console.warn('⚠️ 清理测试数据失败:', error);
    }
  }
  
  // 2. 清理临时文件和计算缓存
  const tempDirs = [
    path.join(process.cwd(), 'temp'),
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'cache'),
    path.join(process.cwd(), 'test-results'),
  ];
  
  for (const dir of tempDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        const testFiles = files.filter(file => 
          file.includes('test') || 
          file.includes('e2e') || 
          file.includes('temp') ||
          file.includes('cache')
        );
        for (const file of testFiles) {
          const filePath = path.join(dir, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        }
        console.log(`🗑️ 清理临时文件: ${dir}`);
      } catch (error) {
        console.warn(`⚠️ 清理 ${dir} 失败:`, error);
      }
    }
  }
  
  // 3. 清理测试项目缓存（如果有的话）
  try {
    const projectCacheDir = path.join(process.cwd(), '.deepcad-cache');
    if (fs.existsSync(projectCacheDir)) {
      fs.rmSync(projectCacheDir, { recursive: true, force: true });
      console.log('🗂️ 清理项目缓存目录');
    }
  } catch (error) {
    console.warn('⚠️ 清理项目缓存失败:', error);
  }
  
  // 4. 清理GPU资源缓存（如果存在）
  try {
    const gpuCacheDir = path.join(process.cwd(), 'gpu-cache');
    if (fs.existsSync(gpuCacheDir)) {
      fs.rmSync(gpuCacheDir, { recursive: true, force: true });
      console.log('🎮 清理GPU资源缓存');
    }
  } catch (error) {
    console.warn('⚠️ 清理GPU缓存失败:', error);
  }
  
  // 5. 生成测试总结报告（如果需要）
  try {
    const reportData = {
      timestamp: new Date().toISOString(),
      testEnvironment: 'DeepCAD E2E',
      cleanup: {
        testDataCleaned: true,
        tempFilesCleaned: true,
        cacheCleaned: true
      }
    };
    
    const reportPath = path.join(process.cwd(), 'test-results', 'cleanup-report.json');
    if (!fs.existsSync(path.dirname(reportPath))) {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    }
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log('📊 生成清理报告');
  } catch (error) {
    console.warn('⚠️ 生成清理报告失败:', error);
  }
  
  console.log('✅ DeepCAD E2E测试环境清理完成');
}

export default globalTeardown;