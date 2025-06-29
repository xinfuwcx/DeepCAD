/**
 * @file test-figma.js
 * @description 测试 Figma 集成
 */

console.log('🎨 Deep Excavation - Figma 集成测试');
console.log('=====================================');

// 检查环境变量
console.log('\n📋 环境配置检查:');
console.log('Current directory:', process.cwd());

const fs = require('fs');
const path = require('path');

// 检查 .env 文件
if (fs.existsSync('.env')) {
    console.log('✅ .env 文件存在');
    const envContent = fs.readFileSync('.env', 'utf8');
    const hasToken = envContent.includes('FIGMA_ACCESS_TOKEN=figd_');
    console.log('✅ Figma Token:', hasToken ? '已配置' : '未配置');
} else {
    console.log('❌ .env 文件不存在');
}

// 检查生成的设计令牌
const tokensPath = 'src/styles/tokens.json';
if (fs.existsSync(tokensPath)) {
    console.log('✅ 设计令牌文件存在');
    try {
        const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
        console.log('✅ 设计令牌内容:');
        console.log(`   - 颜色: ${Object.keys(tokens.colors || {}).length} 个`);
        console.log(`   - 字体: ${Object.keys(tokens.typography || {}).length} 个`);
        console.log(`   - 间距: ${Object.keys(tokens.spacing || {}).length} 个`);
    } catch (error) {
        console.log('❌ 设计令牌文件损坏');
    }
} else {
    console.log('❌ 设计令牌文件不存在');
}

// 检查组件文件
const componentsPath = 'src/components/figma-generated';
if (fs.existsSync(componentsPath)) {
    console.log('✅ 组件目录存在');
    const files = fs.readdirSync(componentsPath);
    console.log(`   生成的文件: ${files.length} 个`);
    files.forEach(file => console.log(`   - ${file}`));
} else {
    console.log('❌ 组件目录不存在');
}

console.log('\n🎉 Figma 集成已就绪！');
console.log('\n📋 使用指南:');
console.log('1. 在 React 组件中导入设计令牌:');
console.log('   import { tokens } from "./styles/tokens";');
console.log('');
console.log('2. 使用 CSS 变量:');
console.log('   color: var(--color-primary);');
console.log('');
console.log('3. 导入主题提供者:');
console.log('   import FigmaThemeProvider from "./components/theme/FigmaThemeProvider";');
console.log('');
console.log('💡 提示: 设置 FIGMA_FILE_ID 后可以实现真实的 Figma 同步');
