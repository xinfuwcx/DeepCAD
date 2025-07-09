import * as THREE from 'three';

/**
 * 使用反距离加权法(IDW)的简单实现，根据已知点的值插值目标点的值。
 * @param target - 需要计算插值结果的目标点 (2D)
 * @param points - 已知值的点集 (2D)
 * @param values - 与点集一一对应的值
 * @returns - 目标点的插值结果
 */
export const getInterpolatedY = (target: THREE.Vector2, points: THREE.Vector2[], values: number[]): number => {
  let totalWeight = 0;
  let weightedSum = 0;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const value = values[i];
    const dist = target.distanceTo(point);
    
    // 如果目标点与样本点重合，直接返回值
    if (dist < 1e-6) {
      return value;
    }
    
    const weight = 1.0 / Math.pow(dist, 2); // 权重与距离的平方成反比
    weightedSum += value * weight;
    totalWeight += weight;
  }

  // 避免除以零
  if (totalWeight === 0) {
    return 0;
  }

  return weightedSum / totalWeight;
}; 