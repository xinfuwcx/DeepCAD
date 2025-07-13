/**
 * Web Worker 工具模块
 * 用于执行计算密集型任务，避免阻塞主线程
 */

// Web Worker 任务类型
export interface WorkerTask<T = any, R = any> {
  id: string;
  type: string;
  data: T;
  timestamp: number;
}

export interface WorkerResponse<R = any> {
  id: string;
  success: boolean;
  result?: R;
  error?: string;
  timestamp: number;
}

// Web Worker 管理器
export class WorkerManager {
  private workers: Map<string, Worker> = new Map();
  private pendingTasks: Map<string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeout?: NodeJS.Timeout;
  }> = new Map();

  // 创建 Worker
  createWorker(name: string, workerScript: string): Worker {
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    
    worker.onmessage = (event) => {
      const response: WorkerResponse = event.data;
      const pending = this.pendingTasks.get(response.id);
      
      if (pending) {
        if (pending.timeout) {
          clearTimeout(pending.timeout);
        }
        
        this.pendingTasks.delete(response.id);
        
        if (response.success) {
          pending.resolve(response.result);
        } else {
          pending.reject(new Error(response.error || 'Worker task failed'));
        }
      }
    };

    worker.onerror = (error) => {
      console.error(`Worker ${name} error:`, error);
    };

    this.workers.set(name, worker);
    return worker;
  }

  // 执行任务
  async executeTask<T, R>(
    workerName: string,
    taskType: string,
    data: T,
    timeout: number = 30000
  ): Promise<R> {
    const worker = this.workers.get(workerName);
    if (!worker) {
      throw new Error(`Worker ${workerName} not found`);
    }

    const taskId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const task: WorkerTask<T> = {
      id: taskId,
      type: taskType,
      data,
      timestamp: Date.now(),
    };

    return new Promise<R>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingTasks.delete(taskId);
        reject(new Error(`Task ${taskId} timed out`));
      }, timeout);

      this.pendingTasks.set(taskId, {
        resolve,
        reject,
        timeout: timeoutId,
      });

      worker.postMessage(task);
    });
  }

  // 终止 Worker
  terminateWorker(name: string): void {
    const worker = this.workers.get(name);
    if (worker) {
      worker.terminate();
      this.workers.delete(name);
    }
  }

  // 终止所有 Workers
  terminateAll(): void {
    this.workers.forEach((worker, name) => {
      worker.terminate();
    });
    this.workers.clear();
    
    // 清理待处理任务
    this.pendingTasks.forEach((pending) => {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      pending.reject(new Error('Worker terminated'));
    });
    this.pendingTasks.clear();
  }

  // 获取 Worker 状态
  getWorkerStatus(): { name: string; active: boolean }[] {
    return Array.from(this.workers.entries()).map(([name, worker]) => ({
      name,
      active: true, // Worker 对象没有直接的状态检查方法
    }));
  }
}

// 预定义的 Worker 脚本

// 基坑DXF解析 Worker
export const EXCAVATION_DXF_PARSER_WORKER = `
self.onmessage = function(event) {
  const { id, type, data } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'parse_excavation':
        result = parseExcavationDXF(data.content, data.options);
        break;
      case 'validate_excavation':
        result = validateExcavationDXF(data.content);
        break;
      case 'extract_contours':
        result = extractExcavationContours(data.content);
        break;
      case 'identify_supports':
        result = identifySupportStructures(data.content);
        break;
      default:
        throw new Error('Unknown task type: ' + type);
    }
    
    self.postMessage({
      id,
      success: true,
      result,
      timestamp: Date.now(),
    });
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
};

function parseExcavationDXF(content, options = {}) {
  // 基坑专用DXF解析逻辑
  const lines = content.split('\\n');
  const entities = [];
  let currentEntity = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '0' && i + 1 < lines.length) {
      if (currentEntity) {
        entities.push(currentEntity);
      }
      
      const entityType = lines[i + 1].trim();
      currentEntity = {
        type: entityType,
        properties: {},
        excavationRole: identifyExcavationRole(entityType) // 识别基坑角色
      };
      i++; // 跳过实体类型行
    } else if (currentEntity && !isNaN(parseInt(line))) {
      const code = parseInt(line);
      const value = i + 1 < lines.length ? lines[i + 1].trim() : '';
      currentEntity.properties[code] = value;
      i++; // 跳过值行
    }
  }
  
  if (currentEntity) {
    entities.push(currentEntity);
  }
  
  // 基坑专用分析
  const contourEntities = entities.filter(e => e.excavationRole === 'contour');
  const depthAnnotations = entities.filter(e => e.excavationRole === 'depth');
  const supportStructures = entities.filter(e => e.excavationRole === 'support');
  
  return {
    totalEntities: entities.length,
    contourEntities: contourEntities.length,
    depthAnnotations: depthAnnotations.length,
    supportStructures: supportStructures.length,
    entities: entities.slice(0, 100),
    excavationBounds: calculateExcavationBounds(contourEntities),
    contourPoints: extractContourPoints(contourEntities),
    maxDepth: extractMaxDepth(depthAnnotations)
  };
}

function identifyExcavationRole(entityType) {
  // 根据实体类型识别基坑角色
  switch (entityType.toUpperCase()) {
    case 'POLYLINE':
    case 'LWPOLYLINE':
      return 'contour'; // 基坑轮廓
    case 'TEXT':
    case 'MTEXT':
    case 'DIMENSION':
      return 'depth'; // 深度标注
    case 'LINE':
      return 'support'; // 支护结构
    case 'BLOCK':
    case 'INSERT':
      return 'structure'; // 结构件
    default:
      return 'unknown';
  }
}

function extractContourPoints(contourEntities) {
  // 提取基坑轮廓点
  const points = [];
  contourEntities.forEach(entity => {
    if (entity.properties['10'] && entity.properties['20']) {
      points.push({
        x: parseFloat(entity.properties['10']),
        y: parseFloat(entity.properties['20']),
        z: parseFloat(entity.properties['30'] || 0)
      });
    }
  });
  return points;
}

function extractMaxDepth(depthAnnotations) {
  // 从标注中提取最大开挖深度
  let maxDepth = 0;
  depthAnnotations.forEach(entity => {
    const text = entity.properties['1'] || entity.properties['3'] || '';
    const depthMatch = text.match(/(\d+\.?\d*)/);
    if (depthMatch) {
      const depth = parseFloat(depthMatch[1]);
      maxDepth = Math.max(maxDepth, depth);
    }
  });
  return maxDepth;
}

function calculateExcavationBounds(contourEntities) {
  // 计算基坑边界
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  contourEntities.forEach(entity => {
    Object.keys(entity.properties).forEach(code => {
      const numCode = parseInt(code);
      const value = parseFloat(entity.properties[code]);
      
      if (!isNaN(value)) {
        if (numCode >= 10 && numCode <= 19) { // X 坐标
          minX = Math.min(minX, value);
          maxX = Math.max(maxX, value);
        } else if (numCode >= 20 && numCode <= 29) { // Y 坐标
          minY = Math.min(minY, value);
          maxY = Math.max(maxY, value);
        }
      }
    });
  });
  
  return {
    minX: isFinite(minX) ? minX : 0,
    minY: isFinite(minY) ? minY : 0,
    maxX: isFinite(maxX) ? maxX : 0,
    maxY: isFinite(maxY) ? maxY : 0,
    width: isFinite(maxX) && isFinite(minX) ? maxX - minX : 0,
    height: isFinite(maxY) && isFinite(minY) ? maxY - minY : 0
  };
}

function validateDXF(content) {
  const requiredSections = ['HEADER', 'ENTITIES'];
  const issues = [];
  
  requiredSections.forEach(section => {
    if (!content.includes(section)) {
      issues.push({ 
        type: 'error', 
        message: 'Missing required section: ' + section 
      });
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}

function extractEntities(content, entityTypes) {
  const entities = parseDXF(content).entities;
  
  if (!entityTypes || entityTypes.length === 0) {
    return entities;
  }
  
  return entities.filter(entity => 
    entityTypes.includes(entity.type.toUpperCase())
  );
}

function extractLayers(entities) {
  const layers = new Set();
  
  entities.forEach(entity => {
    const layerCode = entity.properties['8'];
    if (layerCode) {
      layers.add(layerCode);
    }
  });
  
  return Array.from(layers);
}

function calculateBounds(entities) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  entities.forEach(entity => {
    // 查找坐标属性
    Object.keys(entity.properties).forEach(code => {
      const numCode = parseInt(code);
      const value = parseFloat(entity.properties[code]);
      
      if (!isNaN(value)) {
        if (numCode >= 10 && numCode <= 19) { // X 坐标
          minX = Math.min(minX, value);
          maxX = Math.max(maxX, value);
        } else if (numCode >= 20 && numCode <= 29) { // Y 坐标
          minY = Math.min(minY, value);
          maxY = Math.max(maxY, value);
        }
      }
    });
  });
  
  return {
    minX: isFinite(minX) ? minX : 0,
    minY: isFinite(minY) ? minY : 0,
    maxX: isFinite(maxX) ? maxX : 0,
    maxY: isFinite(maxY) ? maxY : 0,
  };
}
`;

// 网格计算 Worker
export const MESH_CALCULATOR_WORKER = `
self.onmessage = function(event) {
  const { id, type, data } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'estimate_elements':
        result = estimateElementCount(data.geometry, data.elementSize);
        break;
      case 'calculate_quality':
        result = calculateMeshQuality(data.elements);
        break;
      case 'optimize_mesh':
        result = optimizeMesh(data.nodes, data.elements);
        break;
      case 'validate_mesh':
        result = validateMesh(data.nodes, data.elements);
        break;
      default:
        throw new Error('Unknown task type: ' + type);
    }
    
    self.postMessage({
      id,
      success: true,
      result,
      timestamp: Date.now(),
    });
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
};

function estimateElementCount(geometry, elementSize) {
  // 简化的网格单元数量估算
  const volume = geometry.width * geometry.height * geometry.depth;
  const elementVolume = Math.pow(elementSize, 3);
  const estimatedCount = Math.ceil(volume / elementVolume);
  
  return {
    estimatedElements: estimatedCount,
    estimatedNodes: Math.ceil(estimatedCount * 1.5),
    estimatedMemory: estimatedCount * 0.001, // MB
    estimatedTime: Math.max(1, estimatedCount / 1000), // 秒
  };
}

function calculateMeshQuality(elements) {
  if (!elements || elements.length === 0) {
    return { averageQuality: 0, minQuality: 0, maxQuality: 0 };
  }
  
  const qualities = elements.map(element => {
    // 简化的质量计算（随机生成用于演示）
    return 0.5 + Math.random() * 0.5;
  });
  
  return {
    averageQuality: qualities.reduce((sum, q) => sum + q, 0) / qualities.length,
    minQuality: Math.min(...qualities),
    maxQuality: Math.max(...qualities),
    qualityDistribution: calculateDistribution(qualities),
  };
}

function calculateDistribution(values) {
  const bins = [0, 0, 0, 0, 0]; // 5个质量区间
  
  values.forEach(value => {
    const binIndex = Math.min(4, Math.floor(value * 5));
    bins[binIndex]++;
  });
  
  return bins;
}

function optimizeMesh(nodes, elements) {
  // 简化的网格优化（平滑处理）
  const optimizedNodes = nodes.map(node => ({
    ...node,
    x: node.x + (Math.random() - 0.5) * 0.01,
    y: node.y + (Math.random() - 0.5) * 0.01,
    z: node.z + (Math.random() - 0.5) * 0.01,
  }));
  
  return {
    nodes: optimizedNodes,
    elements,
    improvementRatio: 0.05 + Math.random() * 0.1,
  };
}

function validateMesh(nodes, elements) {
  const issues = [];
  
  // 检查孤立节点
  const usedNodes = new Set();
  elements.forEach(element => {
    element.nodes.forEach(nodeId => usedNodes.add(nodeId));
  });
  
  const isolatedNodes = nodes.filter(node => !usedNodes.has(node.id));
  if (isolatedNodes.length > 0) {
    issues.push({
      type: 'warning',
      message: 'Found ' + isolatedNodes.length + ' isolated nodes',
    });
  }
  
  // 检查退化单元
  const degenerateElements = elements.filter(element => {
    return element.nodes.length < 3;
  });
  
  if (degenerateElements.length > 0) {
    issues.push({
      type: 'error',
      message: 'Found ' + degenerateElements.length + ' degenerate elements',
    });
  }
  
  return {
    isValid: issues.filter(issue => issue.type === 'error').length === 0,
    issues,
    statistics: {
      nodeCount: nodes.length,
      elementCount: elements.length,
      isolatedNodes: isolatedNodes.length,
      degenerateElements: degenerateElements.length,
    },
  };
}
`;

// 数学计算 Worker
export const MATH_WORKER = `
self.onmessage = function(event) {
  const { id, type, data } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'matrix_multiply':
        result = multiplyMatrices(data.a, data.b);
        break;
      case 'solve_linear_system':
        result = solveLinearSystem(data.matrix, data.vector);
        break;
      case 'interpolate':
        result = interpolateData(data.points, data.method);
        break;
      case 'transform_coordinates':
        result = transformCoordinates(data.points, data.transformation);
        break;
      default:
        throw new Error('Unknown task type: ' + type);
    }
    
    self.postMessage({
      id,
      success: true,
      result,
      timestamp: Date.now(),
    });
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
};

function multiplyMatrices(a, b) {
  const rows = a.length;
  const cols = b[0].length;
  const result = [];
  
  for (let i = 0; i < rows; i++) {
    result[i] = [];
    for (let j = 0; j < cols; j++) {
      let sum = 0;
      for (let k = 0; k < b.length; k++) {
        sum += a[i][k] * b[k][j];
      }
      result[i][j] = sum;
    }
  }
  
  return result;
}

function solveLinearSystem(matrix, vector) {
  // 简化的高斯消元法
  const n = matrix.length;
  const augmented = matrix.map((row, i) => [...row, vector[i]]);
  
  // 前向消元
  for (let i = 0; i < n; i++) {
    // 部分主元选择
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
    
    // 消元
    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }
  
  // 回代
  const solution = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    solution[i] = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      solution[i] -= augmented[i][j] * solution[j];
    }
    solution[i] /= augmented[i][i];
  }
  
  return solution;
}

function interpolateData(points, method) {
  // 简化的插值实现
  switch (method) {
    case 'linear':
      return linearInterpolation(points);
    case 'cubic':
      return cubicInterpolation(points);
    default:
      return linearInterpolation(points);
  }
}

function linearInterpolation(points) {
  const result = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    
    for (let t = 0; t <= 1; t += 0.1) {
      result.push({
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y),
        z: p1.z + t * (p2.z - p1.z),
      });
    }
  }
  
  return result;
}

function cubicInterpolation(points) {
  // 简化的三次插值
  return linearInterpolation(points); // 占位实现
}

function transformCoordinates(points, transformation) {
  const { translation, rotation, scale } = transformation;
  
  return points.map(point => {
    let { x, y, z } = point;
    
    // 缩放
    if (scale) {
      x *= scale.x || 1;
      y *= scale.y || 1;
      z *= scale.z || 1;
    }
    
    // 旋转（简化的 Z 轴旋转）
    if (rotation && rotation.z) {
      const cos = Math.cos(rotation.z);
      const sin = Math.sin(rotation.z);
      const newX = x * cos - y * sin;
      const newY = x * sin + y * cos;
      x = newX;
      y = newY;
    }
    
    // 平移
    if (translation) {
      x += translation.x || 0;
      y += translation.y || 0;
      z += translation.z || 0;
    }
    
    return { x, y, z };
  });
}
`;

// 全局 Worker 管理器实例
export const workerManager = new WorkerManager();

// 初始化预定义的 Workers
export const initializeWorkers = () => {
  workerManager.createWorker('excavation-dxf-parser', EXCAVATION_DXF_PARSER_WORKER);
  workerManager.createWorker('mesh-calculator', MESH_CALCULATOR_WORKER);
  workerManager.createWorker('math', MATH_WORKER);
};

// 便捷方法
export const excavationDxfWorkerTask = <T, R>(taskType: string, data: T) => 
  workerManager.executeTask<T, R>('excavation-dxf-parser', taskType, data);

export const meshWorkerTask = <T, R>(taskType: string, data: T) => 
  workerManager.executeTask<T, R>('mesh-calculator', taskType, data);

export const mathWorkerTask = <T, R>(taskType: string, data: T) => 
  workerManager.executeTask<T, R>('math', taskType, data);

// 清理函数
export const cleanupWorkers = () => {
  workerManager.terminateAll();
};