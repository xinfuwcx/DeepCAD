/**
 * 完全重新设计的地连墙生成算法 V2.0
 * 彻底解决坐标系混乱和偏移问题，确保墙体内侧面精确贴合基坑边界
 */

import * as THREE from 'three';

export interface DiaphragmWallParams {
  thickness: number;
  depth: number;
}

export interface WallPanel {
  center: THREE.Vector3;
  segLen: number;
  angle: number;
  along: THREE.Vector3;
  outward: THREE.Vector3;
}

/**
 * 生成地连墙 - 新算法
 * 关键原则：墙体在本地坐标系(0,0,0)中心生成，不依赖外部坐标变换
 */
export function generateDiaphragmWall(
  rotatedPolys: Array<Array<{x: number; y: number}>>,
  params: DiaphragmWallParams,
  scale: number,
  cx: number,
  cy: number,
  depthWorld: number,
  thicknessScaled: number,
  mat: THREE.Material,
  edgeMat: THREE.Material
): {
  group: THREE.Group;
  wallPanels: WallPanel[];
} {
  const group = new THREE.Group();
  group.name = 'DIAPHRAGM_WALL_GROUP';
  const wallPanels: WallPanel[] = [];

  console.log('🔧 开始生成地连墙，参数:', { 
    scale, 
    cx, 
    cy, 
    thickness: thicknessScaled, 
    depth: depthWorld,
    polyCount: rotatedPolys.length 
  });

  // 计算多边形方向（顺时针/逆时针）
  const getSignedArea = (poly: Array<{x: number; y: number}>) => {
    let s = 0;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      s += (p.x * q.y - q.x * p.y);
    }
    return s / 2;
  };

  for (const poly of rotatedPolys) {
    if (!poly || poly.length < 2) continue;
    
    const area = getSignedArea(poly);
    const isCCW = area > 0;
    console.log(`📐 多边形方向: ${isCCW ? '逆时针' : '顺时针'}, 面积: ${area.toFixed(3)}`);

    // 遍历每条边，生成对应的墙板
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];

      // 计算边长，跳过过短的边
      const edgeLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (edgeLen < 0.01) {
        console.log(`⚠️ 跳过过短边: 长度=${edgeLen.toFixed(4)}`);
        continue;
      }

      // ===== 关键改进：直接在世界坐标系中计算，不进行双重变换 =====
      
      // 边的世界坐标（已经包含了缩放和偏移）
      const worldP1X = p1.x;
      const worldP1Z = p1.y; // 注意：DXF的Y对应Three.js的Z
      const worldP2X = p2.x;
      const worldP2Z = p2.y;

      // 边的方向向量
      const edgeDx = worldP2X - worldP1X;
      const edgeDz = worldP2Z - worldP1Z;
      const edgeLength = Math.hypot(edgeDx, edgeDz);
      const edgeDirX = edgeDx / edgeLength;
      const edgeDirZ = edgeDz / edgeLength;

      // 计算内法向量（指向基坑内部）
      // 对于逆时针多边形，内侧在左边；对于顺时针多边形，内侧在右边
      let inwardX: number, inwardZ: number;
      if (isCCW) {
        // 逆时针：边向量左转90度 = 内法向量
        inwardX = -edgeDirZ;
        inwardZ = edgeDirX;
      } else {
        // 顺时针：边向量右转90度 = 内法向量
        inwardX = edgeDirZ;
        inwardZ = -edgeDirX;
      }

      // ===== 核心算法：墙体精确定位 =====
      
      // 边界中点（基坑边界上的点）
      const boundaryX = (worldP1X + worldP2X) / 2;
      const boundaryZ = (worldP1Z + worldP2Z) / 2;
      
      // 墙体几何中心：从边界点向基坑内部偏移 thickness/2
      const wallCenterX = boundaryX + inwardX * (thicknessScaled / 2);
      const wallCenterZ = boundaryZ + inwardZ * (thicknessScaled / 2);
      const wallCenterY = -depthWorld / 2; // Y轴：从地面向下到墙体中心

      // 墙体旋转角度
      const wallAngle = Math.atan2(edgeDz, edgeDx);

      console.log(`🧱 墙板${i + 1}: 边界(${boundaryX.toFixed(2)}, ${boundaryZ.toFixed(2)}) -> 中心(${wallCenterX.toFixed(2)}, ${wallCenterZ.toFixed(2)})`);

      // 创建墙板几何体
      const geometry = new THREE.BoxGeometry(edgeLength, depthWorld, thicknessScaled);
      const mesh = new THREE.Mesh(geometry, mat);

      // 设置墙板位置和旋转
      mesh.position.set(wallCenterX, wallCenterY, wallCenterZ);
      mesh.rotation.y = wallAngle;

      // 保存墙板元数据
      const zSign = isCCW ? 1 : -1;
      (mesh as any).userData.__wallSeg = {
        segLen: edgeLength,
        thickness: thicknessScaled,
        angle: wallAngle,
        zSign
      };

      group.add(mesh);

      // 添加边线增强可见性
      try {
        const edges = new THREE.EdgesGeometry(geometry);
        const lineSegments = new THREE.LineSegments(edges, edgeMat);
        lineSegments.position.copy(mesh.position);
        lineSegments.rotation.copy(mesh.rotation as any);
        lineSegments.renderOrder = 998;
        group.add(lineSegments);
      } catch (error) {
        console.warn('边线创建失败:', error);
      }

      // 记录墙板信息供锚杆系统使用
      const alongVector = new THREE.Vector3(edgeDirX, 0, edgeDirZ);
      const outwardVector = new THREE.Vector3(-inwardX, 0, -inwardZ); // 外法向量
      
      wallPanels.push({
        center: mesh.position.clone(),
        segLen: edgeLength,
        angle: wallAngle,
        along: alongVector,
        outward: outwardVector
      });
    }
  }

  console.log(`✅ 地连墙生成完成: ${wallPanels.length}个墙板, ${group.children.length}个3D对象`);
  return { group, wallPanels };
}
