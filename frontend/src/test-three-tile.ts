/**
 * 最简单的three-tile测试
 */
import * as THREE from 'three';
import { TileMap, TileSource } from 'three-tile';

// 创建基本的three.js场景
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

export function testThreeTile() {
  console.log('🧪 开始three-tile基础测试...');
  
  try {
    // 1. 测试TileSource构造
    console.log('1️⃣ 测试TileSource构造...');
    const source = new TileSource({
      dataType: 'image',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap',
      minLevel: 8,
      maxLevel: 15,
      projectionID: '3857'
    });
    console.log('✅ TileSource构造成功:', source);
    
    // 2. 测试TileMap.create
    console.log('2️⃣ 测试TileMap.create...');
    const map = TileMap.create({
      imgSource: source,
      minLevel: 8,
      maxLevel: 15,
      backgroundColor: 0xff0000, // 红色背景便于识别
      debug: 1
    });
    console.log('✅ TileMap.create成功:', map);
    
    // 3. 添加到场景
    console.log('3️⃣ 添加地图到场景...');
    scene.add(map);
    console.log('✅ 地图已添加到场景');
    
    // 4. 设置相机
    camera.position.set(0, 1000, 0);
    camera.lookAt(0, 0, 0);
    
    // 5. 手动更新测试
    console.log('4️⃣ 测试地图更新...');
    camera.updateMatrixWorld();
    map.update(camera);
    console.log('✅ 地图更新成功');
    
    // 6. 检查地图状态
    console.log('5️⃣ 检查地图状态...');
    console.log('- 地图子对象数量:', map.children.length);
    console.log('- 地图autoUpdate:', map.autoUpdate);
    console.log('- 地图LODThreshold:', map.LODThreshold);
    console.log('- 地图minLevel:', map.minLevel);
    console.log('- 地图maxLevel:', map.maxLevel);
    
    return {
      success: true,
      map: map,
      source: source
    };
    
  } catch (error) {
    console.error('❌ three-tile测试失败:', error);
    return {
      success: false,
      error: error
    };
  }
}