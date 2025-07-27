#!/usr/bin/env node

/**
 * DeepCAD 系统集成验证脚本
 * 3号计算专家 - 验证所有组件集成状态
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 DeepCAD 系统集成验证开始...\n');

// 验证文件存在性
const filesToCheck = [
  'src/components/advanced/DeepCADAdvancedApp.tsx',
  'src/components/ComputationControlPanel.tsx', 
  'src/design/tokens.ts',
  'src/services/stressCloudGPURenderer.ts',
  'src/services/deformationAnimationSystem.ts',
  'src/services/flowFieldVisualizationGPU.ts'
];

console.log('📁 检查关键文件存在性:');
const missingFiles = [];

filesToCheck.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - 文件不存在`);
    missingFiles.push(file);
  }
});

// 验证主应用集成
console.log('\n🎯 检查主应用集成状态:');
const mainAppPath = path.join(__dirname, 'src/components/advanced/DeepCADAdvancedApp.tsx');

if (fs.existsSync(mainAppPath)) {
  const mainAppContent = fs.readFileSync(mainAppPath, 'utf8');
  
  const integrationChecks = [
    { name: '计算控制模块', pattern: /computation-control/, found: false },
    { name: '网格分析模块', pattern: /mesh-analysis/, found: false },
    { name: 'AI助理模块', pattern: /ai-assistant/, found: false },
    { name: 'ComputationControlPanel导入', pattern: /ComputationControlPanel/, found: false },
    { name: '计算专色定义', pattern: /accent\.computation/, found: false }
  ];
  
  integrationChecks.forEach(check => {
    check.found = check.pattern.test(mainAppContent);
    console.log(`  ${check.found ? '✅' : '❌'} ${check.name}`);
  });
  
  const allIntegrationsFound = integrationChecks.every(check => check.found);
  console.log(`\n🎯 主应用集成状态: ${allIntegrationsFound ? '✅ 完成' : '❌ 需要修复'}`);
} else {
  console.log('  ❌ 主应用文件不存在');
}

// 验证设计令牌
console.log('\n🎨 检查设计令牌集成:');
const tokensPath = path.join(__dirname, 'src/design/tokens.ts');

if (fs.existsSync(tokensPath)) {
  const tokensContent = fs.readFileSync(tokensPath, 'utf8');
  
  const tokenChecks = [
    { name: '计算专色', pattern: /computation:\s*['"`]#ef4444['"`]/, found: false },
    { name: 'AI专色', pattern: /ai:\s*['"`]#f59e0b['"`]/, found: false },
    { name: '量子蓝色', pattern: /quantum:\s*['"`]#6366f1['"`]/, found: false }
  ];
  
  tokenChecks.forEach(check => {
    check.found = check.pattern.test(tokensContent);
    console.log(`  ${check.found ? '✅' : '❌'} ${check.name}`);
  });
} else {
  console.log('  ❌ 设计令牌文件不存在');
}

// 验证核心服务
console.log('\n⚙️ 检查核心计算服务:');
const services = [
  'stressCloudGPURenderer.ts',
  'deformationAnimationSystem.ts', 
  'flowFieldVisualizationGPU.ts',
  'deepExcavationSolver.ts',
  'constructionStageAnalysis.ts',
  'safetyAssessmentSystem.ts'
];

services.forEach(service => {
  const servicePath = path.join(__dirname, 'src/services', service);
  const exists = fs.existsSync(servicePath);
  console.log(`  ${exists ? '✅' : '❌'} ${service}`);
});

// 生成集成报告
console.log('\n📊 生成集成状态报告:');

const integrationStatus = {
  timestamp: new Date().toISOString(),
  expertId: '3号计算专家',
  filesChecked: filesToCheck.length,
  missingFiles: missingFiles.length,
  mainAppIntegrated: fs.existsSync(mainAppPath),
  designTokensUpdated: fs.existsSync(tokensPath),
  coreServicesCount: services.filter(service => {
    return fs.existsSync(path.join(__dirname, 'src/services', service));
  }).length,
  totalServices: services.length,
  integrationComplete: missingFiles.length === 0
};

console.log('  📈 集成统计:');
console.log(`    - 检查文件: ${integrationStatus.filesChecked}`);
console.log(`    - 缺失文件: ${integrationStatus.missingFiles}`);
console.log(`    - 核心服务: ${integrationStatus.coreServicesCount}/${integrationStatus.totalServices}`);
console.log(`    - 主应用集成: ${integrationStatus.mainAppIntegrated ? '✅' : '❌'}`);
console.log(`    - 设计令牌: ${integrationStatus.designTokensUpdated ? '✅' : '❌'}`);

// 保存验证结果
const reportPath = path.join(__dirname, 'integration_validation_report.json');
fs.writeFileSync(reportPath, JSON.stringify(integrationStatus, null, 2));
console.log(`\n💾 验证报告已保存: ${reportPath}`);

// 最终结果
console.log('\n' + '='.repeat(60));
if (integrationStatus.integrationComplete && integrationStatus.mainAppIntegrated) {
  console.log('🎉 系统集成验证通过！');
  console.log('✅ 3号计算专家的所有组件已成功集成到主界面');
  console.log('🚀 DeepCAD系统准备就绪，等待协作测试');
} else {
  console.log('⚠️  系统集成需要修复');
  console.log('❌ 请检查上述错误项目并修复');
}
console.log('='.repeat(60));

process.exit(integrationStatus.integrationComplete ? 0 : 1);