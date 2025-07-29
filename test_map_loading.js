/**
 * 地图加载测试脚本
 * 验证geo-three地图组件是否能正常初始化
 */

const testMapLoading = () => {
  console.log('🧪 开始测试地图加载功能...');
  
  // 模拟DOM环境
  if (typeof document === 'undefined') {
    console.log('❌ 需要在浏览器环境中运行');
    return false;
  }
  
  // 创建测试容器
  const testContainer = document.createElement('div');
  testContainer.id = 'map-test-container';
  testContainer.style.width = '800px';
  testContainer.style.height = '600px';
  testContainer.style.position = 'absolute';
  testContainer.style.top = '-9999px'; // 隐藏测试容器
  document.body.appendChild(testContainer);
  
  try {
    // 测试基本的THREE.js功能
    console.log('🔍 检查THREE.js库...');
    if (typeof THREE === 'undefined') {
      throw new Error('THREE.js库未找到');
    }
    console.log('✅ THREE.js库检查通过');
    
    // 测试geo-three库
    console.log('🔍 检查geo-three库...');
    if (typeof MapView === 'undefined') {
      throw new Error('geo-three MapView类未找到');
    }
    console.log('✅ geo-three库检查通过');
    
    // 创建基本的Three.js场景
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 800/600, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(800, 600);
    testContainer.appendChild(renderer.domElement);
    
    console.log('✅ Three.js基础组件创建成功');
    
    // 测试地图提供商
    console.log('🔍 测试地图提供商...');
    if (typeof OpenStreetMapsProvider !== 'undefined') {
      const mapProvider = new OpenStreetMapsProvider();
      console.log('✅ OpenStreetMapsProvider创建成功');
    } else {
      console.warn('⚠️ OpenStreetMapsProvider未找到，但可以继续');
    }
    
    console.log('🎉 地图加载测试完成 - 基础功能正常');
    return true;
    
  } catch (error) {
    console.error('❌ 地图加载测试失败:', error.message);
    return false;
  } finally {
    // 清理测试容器
    if (testContainer && testContainer.parentNode) {
      testContainer.parentNode.removeChild(testContainer);
    }
  }
};

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
  window.testMapLoading = testMapLoading;
} else {
  console.log('ℹ️ 这是一个浏览器测试脚本，请在浏览器控制台中运行 testMapLoading()');
}

module.exports = testMapLoading;