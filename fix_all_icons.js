#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 定义所有已知的图标替换规则
const iconReplacements = {
  'BrainOutlined': 'BulbOutlined',
  'CubeOutlined': 'BoxPlotOutlined',
  'LayersOutlined': 'AppstoreOutlined',
  'CloudUploadOutlined': 'CloudOutlined',
  'ArrowUpOutlined': 'UpOutlined', 
  'ArrowDownOutlined': 'DownOutlined',
  'BorderHorizontalOutlined': 'BorderOutlined',
  'SortAscendingOutlined': 'CaretUpOutlined',
  'SortDescendingOutlined': 'CaretDownOutlined'
};

// 递归搜索并修复文件中的图标导入
function fixIconsInFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  
  // 修复导入语句中的图标
  Object.entries(iconReplacements).forEach(([oldIcon, newIcon]) => {
    // 匹配导入语句中的图标
    const importRegex = new RegExp(`\\b${oldIcon}\\b(?=\\s*[,}])`, 'g');
    if (importRegex.test(content)) {
      content = content.replace(importRegex, `${newIcon} as ${oldIcon}`);
      hasChanges = true;
      console.log(`Fixed ${oldIcon} → ${newIcon} as ${oldIcon} in ${filePath}`);
    }
  });
  
  if (hasChanges) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

// 递归搜索目录中的TypeScript/React文件
function findAndFixFiles(dir) {
  const files = fs.readdirSync(dir);
  let totalFixed = 0;
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !['node_modules', '.git', 'dist', 'build'].includes(file)) {
      totalFixed += findAndFixFiles(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (fixIconsInFile(fullPath)) {
        totalFixed++;
      }
    }
  });
  
  return totalFixed;
}

// 主执行函数
function main() {
  console.log('🔧 Starting icon fix process...\n');
  
  const srcDir = '/mnt/e/DeepCAD/frontend/src';
  if (!fs.existsSync(srcDir)) {
    console.error('Source directory not found:', srcDir);
    process.exit(1);
  }
  
  const fixedFiles = findAndFixFiles(srcDir);
  
  console.log(`\n✅ Icon fix completed!`);
  console.log(`📁 Fixed ${fixedFiles} files`);
  console.log(`🔄 Replacements made:`);
  
  Object.entries(iconReplacements).forEach(([old, replacement]) => {
    console.log(`   ${old} → ${replacement} as ${old}`);
  });
  
  console.log('\n🎯 Next steps:');
  console.log('   1. Restart the frontend development server');
  console.log('   2. Check the browser console for any remaining errors');
  console.log('   3. Test the application functionality');
}

// 运行脚本
if (require.main === module) {
  main();
}