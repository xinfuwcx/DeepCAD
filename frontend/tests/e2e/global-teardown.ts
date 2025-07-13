import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 清理E2E测试环境...');
  
  // 清理测试数据
  const fs = await import('fs');
  const path = await import('path');
  
  const testDataDir = path.join(__dirname, 'test-data');
  if (fs.existsSync(testDataDir)) {
    try {
      fs.rmSync(testDataDir, { recursive: true, force: true });
      console.log('📁 清理测试数据目录');
    } catch (error) {
      console.warn('⚠️ 清理测试数据失败:', error);
    }
  }
  
  // 清理临时文件
  const tempDirs = [
    path.join(process.cwd(), 'temp'),
    path.join(process.cwd(), 'uploads'),
  ];
  
  for (const dir of tempDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        const testFiles = files.filter(file => file.includes('test') || file.includes('e2e'));
        for (const file of testFiles) {
          fs.unlinkSync(path.join(dir, file));
        }
        console.log(`🗑️ 清理临时文件: ${dir}`);
      } catch (error) {
        console.warn(`⚠️ 清理 ${dir} 失败:`, error);
      }
    }
  }
  
  console.log('✅ E2E测试环境清理完成');
}

export default globalTeardown;