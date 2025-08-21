// 简化的地连墙生成算法
export const generateSimpleWall = (poly: Array<{x:number;y:number}>, isCCW: boolean, thicknessScaled: number, scale: number, cx: number, cy: number) => {
  const segments = [];
  
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % poly.length];
    
    // 转换到Three.js坐标系
    const sx = (p1.x - cx) * scale;
    const sz = (p1.y - cy) * scale;
    const ex = (p2.x - cx) * scale;
    const ez = (p2.y - cy) * scale;
    
    const dx = ex - sx;
    const dz = ez - sz;
    const segLen = Math.hypot(dx, dz);
    
    if (segLen < 0.02) continue; // 跳过过短的段
    
    // 计算段的中心位置
    const centerX = (sx + ex) / 2;
    const centerZ = (sz + ez) / 2;
    const angle = Math.atan2(dz, dx);
    
    // 计算外法向量（垂直于边的方向）
    const normalX = isCCW ? dz / segLen : -dz / segLen;
    const normalZ = isCCW ? -dx / segLen : dx / segLen;
    
    // 墙体中心向外偏移thickness/2
    const offsetX = centerX + normalX * thicknessScaled / 2;
    const offsetZ = centerZ + normalZ * thicknessScaled / 2;
    
    segments.push({
      position: { x: offsetX, y: -depthWorld/2, z: offsetZ },
      rotation: { y: angle },
      length: segLen,
      normal: { x: normalX, z: normalZ }
    });
  }
  
  return segments;
};
