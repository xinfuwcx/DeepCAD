/**
 * RBF插值Web Worker - 2号专家地质建模高性能计算
 * 0号架构师实现
 */

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface RBFConfig {
  kernelType: 'gaussian' | 'multiquadric' | 'thinPlateSpline' | 'cubic';
  kernelParameter: number;
  smoothingFactor: number;
  maxIterations: number;
  tolerance: number;
  gridResolution: number;
}

interface WorkerMessage {
  id: string;
  task: 'rbf_interpolation';
  data: {
    points: Point3D[];
    values: number[];
    config: RBFConfig;
  };
}

interface WorkerResponse {
  id: string;
  result?: any;
  error?: string;
  progress?: number;
}

// Worker主逻辑
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, task, data } = event.data;
  
  try {
    console.log(`🔧 Worker开始执行任务: ${task}`);
    
    switch (task) {
      case 'rbf_interpolation':
        await performRBFInterpolation(id, data.points, data.values, data.config);
        break;
      default:
        throw new Error(`Unknown task: ${task}`);
    }
  } catch (error) {
    self.postMessage({
      id,
      error: error.message
    } as WorkerResponse);
  }
};

async function performRBFInterpolation(
  taskId: string,
  points: Point3D[],
  values: number[],
  config: RBFConfig
): Promise<void> {
  const startTime = performance.now();
  
  // 发送开始通知
  self.postMessage({
    id: taskId,
    progress: 0
  } as WorkerResponse);
  
  try {
    // 1. 构建距离矩阵 (20%进度)
    const distanceMatrix = buildDistanceMatrix(points);
    self.postMessage({
      id: taskId,
      progress: 20
    } as WorkerResponse);
    
    // 2. 构建核矩阵 (40%进度)
    const kernelMatrix = buildKernelMatrix(distanceMatrix, config);
    self.postMessage({
      id: taskId,
      progress: 40
    } as WorkerResponse);
    
    // 3. 求解线性系统 (70%进度)
    const coefficients = solveLinearSystem(kernelMatrix, values, config);
    self.postMessage({
      id: taskId,
      progress: 70
    } as WorkerResponse);
    
    // 4. 生成插值网格 (90%进度)
    const gridResult = generateInterpolationGrid(points, coefficients, config);
    self.postMessage({
      id: taskId,
      progress: 90
    } as WorkerResponse);
    
    // 5. 计算统计信息 (100%进度)
    const statistics = calculateInterpolationStats(gridResult.values);
    
    const endTime = performance.now();
    console.log(`⏱️ Worker RBF插值完成: ${(endTime - startTime).toFixed(2)}ms`);
    
    // 发送最终结果
    self.postMessage({
      id: taskId,
      result: {
        gridPoints: gridResult.points,
        values: gridResult.values,
        confidence: gridResult.confidence,
        statistics
      },
      progress: 100
    } as WorkerResponse);
    
  } catch (error) {
    console.error('❌ Worker RBF插值失败:', error);
    throw error;
  }
}

function buildDistanceMatrix(points: Point3D[]): Float32Array {
  const n = points.length;
  const matrix = new Float32Array(n * n);
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i * n + j] = 0;
      } else {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const dz = points[i].z - points[j].z;
        matrix[i * n + j] = Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
    }
  }
  
  return matrix;
}

function buildKernelMatrix(distanceMatrix: Float32Array, config: RBFConfig): Float32Array {
  const n = Math.sqrt(distanceMatrix.length);
  const kernelMatrix = new Float32Array(n * n);
  
  for (let i = 0; i < n * n; i++) {
    const distance = distanceMatrix[i];
    kernelMatrix[i] = rbfKernel(distance, config.kernelType, config.kernelParameter);
  }
  
  // 添加正则化项到对角线
  for (let i = 0; i < n; i++) {
    kernelMatrix[i * n + i] += config.smoothingFactor;
  }
  
  return kernelMatrix;
}

function rbfKernel(distance: number, kernelType: RBFConfig['kernelType'], parameter: number): number {
  switch (kernelType) {
    case 'gaussian':
      return Math.exp(-((parameter * distance) ** 2));
    case 'multiquadric':
      return Math.sqrt(1 + (parameter * distance) ** 2);
    case 'thinPlateSpline':
      if (distance === 0) return 0;
      return distance * distance * Math.log(distance);
    case 'cubic':
      return distance ** 3;
    default:
      throw new Error(`Unsupported RBF kernel: ${kernelType}`);
  }
}

function solveLinearSystem(
  kernelMatrix: Float32Array,
  values: number[],
  config: RBFConfig
): Float32Array {
  const n = values.length;
  const matrix = new Float32Array(kernelMatrix);
  const b = new Float32Array(values);
  
  // 高斯消元法求解 Ax = b
  // 前向消元
  for (let i = 0; i < n; i++) {
    // 寻找主元
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(matrix[k * n + i]) > Math.abs(matrix[maxRow * n + i])) {
        maxRow = k;
      }
    }
    
    // 交换行
    if (maxRow !== i) {
      for (let k = 0; k < n; k++) {
        [matrix[i * n + k], matrix[maxRow * n + k]] = [matrix[maxRow * n + k], matrix[i * n + k]];
      }
      [b[i], b[maxRow]] = [b[maxRow], b[i]];
    }
    
    // 检查主元是否为零
    if (Math.abs(matrix[i * n + i]) < 1e-12) {
      throw new Error(`奇异矩阵，无法求解RBF系统`);
    }
    
    // 消元
    for (let k = i + 1; k < n; k++) {
      const factor = matrix[k * n + i] / matrix[i * n + i];
      for (let j = i; j < n; j++) {
        matrix[k * n + j] -= factor * matrix[i * n + j];
      }
      b[k] -= factor * b[i];
    }
  }
  
  // 回代
  const x = new Float32Array(n);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = b[i];
    for (let j = i + 1; j < n; j++) {
      x[i] -= matrix[i * n + j] * x[j];
    }
    x[i] /= matrix[i * n + i];
  }
  
  return x;
}

function generateInterpolationGrid(
  originalPoints: Point3D[],
  coefficients: Float32Array,
  config: RBFConfig
): {
  points: Point3D[],
  values: Float32Array,
  confidence: Float32Array
} {
  // 计算边界框
  const bounds = calculateBounds(originalPoints);
  const resolution = config.gridResolution;
  
  const xStep = (bounds.max.x - bounds.min.x) / resolution;
  const yStep = (bounds.max.y - bounds.min.y) / resolution;
  const zStep = (bounds.max.z - bounds.min.z) / resolution;
  
  const gridPoints: Point3D[] = [];
  const values: number[] = [];
  const confidence: number[] = [];
  
  // 生成规则网格
  for (let i = 0; i <= resolution; i++) {
    for (let j = 0; j <= resolution; j++) {
      for (let k = 0; k <= resolution; k++) {
        const point: Point3D = {
          x: bounds.min.x + i * xStep,
          y: bounds.min.y + j * yStep,
          z: bounds.min.z + k * zStep
        };
        
        // 计算插值值
        let interpolatedValue = 0;
        let minDistance = Infinity;
        
        for (let p = 0; p < originalPoints.length; p++) {
          const distance = calculateDistance(point, originalPoints[p]);
          const weight = rbfKernel(distance, config.kernelType, config.kernelParameter);
          interpolatedValue += coefficients[p] * weight;
          
          minDistance = Math.min(minDistance, distance);
        }
        
        // 计算置信度（基于到最近数据点的距离）
        const avgStep = (xStep + yStep + zStep) / 3;
        const confidenceValue = Math.exp(-minDistance / avgStep);
        
        gridPoints.push(point);
        values.push(interpolatedValue);
        confidence.push(confidenceValue);
      }
    }
  }
  
  return {
    points: gridPoints,
    values: new Float32Array(values),
    confidence: new Float32Array(confidence)
  };
}

function calculateDistance(p1: Point3D, p2: Point3D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function calculateBounds(points: Point3D[]): {
  min: Point3D,
  max: Point3D
} {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  
  for (const point of points) {
    min.x = Math.min(min.x, point.x);
    min.y = Math.min(min.y, point.y);
    min.z = Math.min(min.z, point.z);
    max.x = Math.max(max.x, point.x);
    max.y = Math.max(max.y, point.y);
    max.z = Math.max(max.z, point.z);
  }
  
  return { min, max };
}

function calculateInterpolationStats(values: Float32Array): {
  meanValue: number;
  stdDev: number;
  minValue: number;
  maxValue: number;
  rmse: number;
} {
  const n = values.length;
  if (n === 0) {
    return {
      meanValue: 0,
      stdDev: 0,
      minValue: 0,
      maxValue: 0,
      rmse: 0
    };
  }
  
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  
  for (let i = 0; i < n; i++) {
    sum += values[i];
    min = Math.min(min, values[i]);
    max = Math.max(max, values[i]);
  }
  
  const mean = sum / n;
  
  let variance = 0;
  for (let i = 0; i < n; i++) {
    variance += (values[i] - mean) ** 2;
  }
  const stdDev = Math.sqrt(variance / n);
  
  return {
    meanValue: mean,
    stdDev,
    minValue: min,
    maxValue: max,
    rmse: stdDev // 简化的RMSE计算
  };
}

// 处理错误
self.onerror = (error) => {
  console.error('❌ RBF Worker错误:', error);
};

// 导出类型（仅用于TypeScript）
export type { WorkerMessage, WorkerResponse };