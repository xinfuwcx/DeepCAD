// 检查 Ant Design Icons 中可用的图标
const fs = require('fs');
const path = require('path');

// 常见可能不存在的图标和它们的替代品
const iconReplacements = {
  'BrainOutlined': 'BulbOutlined',
  'CubeOutlined': 'BoxPlotOutlined', 
  'NodeIndexOutlined': 'DotChartOutlined',
  'BorderHorizontalOutlined': 'BorderOutlined',
  'CloudUploadOutlined': 'CloudOutlined',
  'SortAscendingOutlined': 'SortAscendingOutlined', // 这个应该存在
  'ArrowUpOutlined': 'UpOutlined',
  'ArrowDownOutlined': 'DownOutlined'
};

// 读取 node_modules 中的图标定义
try {
  const iconsPath = '/mnt/e/DeepCAD/frontend/node_modules/@ant-design/icons/lib/icons';
  if (fs.existsSync(iconsPath)) {
    const files = fs.readdirSync(iconsPath);
    const availableIcons = files
      .filter(f => f.endsWith('.js'))
      .map(f => f.replace('.js', ''));
    
    console.log('Available icons count:', availableIcons.length);
    
    // 检查我们使用的图标
    Object.keys(iconReplacements).forEach(icon => {
      const exists = availableIcons.includes(icon);
      console.log(`${icon}: ${exists ? '✅' : '❌'}`);
      if (!exists) {
        console.log(`  → Suggested replacement: ${iconReplacements[icon]}`);
      }
    });
  } else {
    console.log('Icons directory not found, using predefined replacements');
  }
} catch (error) {
  console.log('Error checking icons:', error.message);
}

console.log('\nRecommended replacements:');
Object.entries(iconReplacements).forEach(([old, replacement]) => {
  console.log(`${old} → ${replacement}`);
});