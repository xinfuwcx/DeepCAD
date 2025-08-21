/**
 * 超级简化的地连墙生成算法
 * 彻底避开复杂的坐标变换，直接在世界坐标系生成
 */

import * as THREE from 'three';

export interface SimpleWallParams {
  width: number;    // 基坑宽度 (m)
  height: number;   // 基坑高度 (m) 
  thickness: number; // 墙厚度 (m)
  depth: number;     // 墙深度 (m)
  centerX?: number;  // 基坑中心X坐标
  centerZ?: number;  // 基坑中心Z坐标
}

/**
 * 生成一个简单的矩形基坑地连墙
 * 直接在指定位置生成，无复杂变换
 */
export function generateSimpleRectangularWall(
  params: SimpleWallParams,
  wallMaterial: THREE.Material,
  edgeMaterial: THREE.Material
): THREE.Group {
  
  const { width, height, thickness, depth, centerX = 0, centerZ = 0 } = params;
  
  console.log('🔧 [简单算法] 生成矩形地连墙:', params);
  
  const group = new THREE.Group();
  group.name = 'SIMPLE_DIAPHRAGM_WALL_GROUP';
  
  // 基坑的四个边界（外边界）
  const boundaries = [
    { // 下边 (南边)
      name: '下边',
      p1: { x: centerX - width/2, z: centerZ - height/2 },
      p2: { x: centerX + width/2, z: centerZ - height/2 },
      inward: { x: 0, z: 1 } // 向北（+Z）
    },
    { // 右边 (东边)
      name: '右边', 
      p1: { x: centerX + width/2, z: centerZ - height/2 },
      p2: { x: centerX + width/2, z: centerZ + height/2 },
      inward: { x: -1, z: 0 } // 向西（-X）
    },
    { // 上边 (北边)
      name: '上边',
      p1: { x: centerX + width/2, z: centerZ + height/2 },
      p2: { x: centerX - width/2, z: centerZ + height/2 },
      inward: { x: 0, z: -1 } // 向南（-Z）
    },
    { // 左边 (西边)
      name: '左边',
      p1: { x: centerX - width/2, z: centerZ + height/2 },
      p2: { x: centerX - width/2, z: centerZ - height/2 },
      inward: { x: 1, z: 0 } // 向东（+X）
    }
  ];
  
  boundaries.forEach((boundary, index) => {
    // 计算边长
    const edgeLength = Math.hypot(
      boundary.p2.x - boundary.p1.x, 
      boundary.p2.z - boundary.p1.z
    );
    
    // 边界中点
    const boundaryMidX = (boundary.p1.x + boundary.p2.x) / 2;
    const boundaryMidZ = (boundary.p1.z + boundary.p2.z) / 2;
    
    // 墙体中心：从边界点向内偏移 thickness/2
    const wallCenterX = boundaryMidX + boundary.inward.x * (thickness / 2);
    const wallCenterZ = boundaryMidZ + boundary.inward.z * (thickness / 2);
    const wallCenterY = -depth / 2; // Y坐标：从地面向下到墙体中心
    
    console.log(`🧱 ${boundary.name}: 边界中点(${boundaryMidX.toFixed(2)}, ${boundaryMidZ.toFixed(2)}) -> 墙体中心(${wallCenterX.toFixed(2)}, ${wallCenterZ.toFixed(2)})`);
    
    // 创建墙板几何体
    const geometry = new THREE.BoxGeometry(edgeLength, depth, thickness);
    const mesh = new THREE.Mesh(geometry, wallMaterial);
    
    // 计算旋转角度
    const angle = Math.atan2(boundary.p2.z - boundary.p1.z, boundary.p2.x - boundary.p1.x);
    
    // 设置位置和旋转
    mesh.position.set(wallCenterX, wallCenterY, wallCenterZ);
    mesh.rotation.y = angle;
    
    // 保存元数据
    (mesh as any).userData = {
      __wallSeg: {
        segLen: edgeLength,
        thickness: thickness,
        angle: angle,
        boundaryName: boundary.name
      }
    };
    
    group.add(mesh);
    
    // 添加边线
    try {
      const edges = new THREE.EdgesGeometry(geometry);
      const lineSegments = new THREE.LineSegments(edges, edgeMaterial);
      lineSegments.position.copy(mesh.position);
      lineSegments.rotation.copy(mesh.rotation as any);
      lineSegments.renderOrder = 999;
      group.add(lineSegments);
    } catch (error) {
      console.warn(`边线创建失败 (${boundary.name}):`, error);
    }
    
    console.log(`✅ ${boundary.name}墙板创建完成: 长度=${edgeLength.toFixed(2)}m, 角度=${(angle * 180 / Math.PI).toFixed(1)}°`);
  });
  
  console.log(`🎉 简单矩形地连墙生成完成: ${boundaries.length}个墙板, ${group.children.length}个3D对象`);
  return group;
}

/**
 * 测试函数：生成一个10m x 8m的矩形基坑地连墙
 */
export function createTestWall(): THREE.Group {
  const wallMaterial = new THREE.MeshPhysicalMaterial({ 
    color: 0x5b6b7a, 
    transparent: true, 
    opacity: 0.7,
    side: THREE.DoubleSide 
  });
  
  const edgeMaterial = new THREE.LineBasicMaterial({ 
    color: 0xffffff, 
    transparent: true, 
    opacity: 0.9 
  });
  
  return generateSimpleRectangularWall({
    width: 10,      // 10米宽
    height: 8,      // 8米高  
    thickness: 0.8, // 0.8米厚
    depth: 15,      // 15米深
    centerX: 0,     // 中心在原点
    centerZ: 0
  }, wallMaterial, edgeMaterial);
}