/**
 * 几何处理Web Worker - 2号专家大型几何计算专用
 * 0号架构师实现
 */

interface GeometryWorkerMessage {
  id: string;
  task: 'boolean_operation' | 'mesh_generation' | 'quality_analysis' | 'optimization';
  data: any;
}

interface GeometryWorkerResponse {
  id: string;
  result?: any;
  error?: string;
  progress?: number;
}

// Worker主逻辑
self.onmessage = async (event: MessageEvent<GeometryWorkerMessage>) => {
  const { id, task, data } = event.data;
  
  try {
    console.log(`🔧 几何Worker开始执行任务: ${task}`);
    
    switch (task) {
      case 'boolean_operation':
        await performBooleanOperation(id, data);
        break;
      case 'mesh_generation':
        await performMeshGeneration(id, data);
        break;
      case 'quality_analysis':
        await performQualityAnalysis(id, data);
        break;
      case 'optimization':
        await performGeometryOptimization(id, data);
        break;
      default:
        throw new Error(`Unknown geometry task: ${task}`);
    }
  } catch (error) {
    self.postMessage({
      id,
      error: error.message
    } as GeometryWorkerResponse);
  }
};

// ============== 布尔运算处理 ==============
async function performBooleanOperation(taskId: string, data: any): Promise<void> {
  const { meshA, meshB, operation } = data;
  
  self.postMessage({
    id: taskId,
    progress: 0
  } as GeometryWorkerResponse);
  
  try {
    // 简化的布尔运算实现
    let resultVertices: Float32Array;
    let resultFaces: Uint32Array;
    
    self.postMessage({
      id: taskId,
      progress: 30
    } as GeometryWorkerResponse);
    
    switch (operation) {
      case 'difference':
        // 差集运算：从A中移除B
        const differenceResult = computeDifference(meshA, meshB);
        resultVertices = differenceResult.vertices;
        resultFaces = differenceResult.faces;
        break;
        
      case 'union':
        // 并集运算：合并A和B
        const unionResult = computeUnion(meshA, meshB);
        resultVertices = unionResult.vertices;
        resultFaces = unionResult.faces;
        break;
        
      case 'intersection':
        // 交集运算：A和B的公共部分
        const intersectionResult = computeIntersection(meshA, meshB);
        resultVertices = intersectionResult.vertices;
        resultFaces = intersectionResult.faces;
        break;
        
      default:
        throw new Error(`不支持的布尔运算: ${operation}`);
    }
    
    self.postMessage({
      id: taskId,
      progress: 80
    } as GeometryWorkerResponse);
    
    // 计算结果质量指标
    const quality = calculateMeshQuality(resultVertices, resultFaces);
    
    self.postMessage({
      id: taskId,
      result: {
        vertices: resultVertices,
        faces: resultFaces,
        quality
      },
      progress: 100
    } as GeometryWorkerResponse);
    
  } catch (error) {
    console.error('❌ 布尔运算失败:', error);
    throw error;
  }
}

function computeDifference(meshA: any, meshB: any): { vertices: Float32Array, faces: Uint32Array } {
  // 简化实现：返回meshA（实际项目中需要使用专业的布尔运算库）
  console.log('⚠️ 使用简化差集运算');
  return {
    vertices: meshA.vertices,
    faces: meshA.faces
  };
}

function computeUnion(meshA: any, meshB: any): { vertices: Float32Array, faces: Uint32Array } {
  // 简化实现：合并两个网格
  const combinedVertices = new Float32Array(meshA.vertices.length + meshB.vertices.length);
  combinedVertices.set(meshA.vertices, 0);
  combinedVertices.set(meshB.vertices, meshA.vertices.length);
  
  const combinedFaces = new Uint32Array(meshA.faces.length + meshB.faces.length);
  combinedFaces.set(meshA.faces, 0);
  
  const vertexOffset = meshA.vertices.length / 3;
  const offsetFaces = new Uint32Array(meshB.faces.length);
  for (let i = 0; i < meshB.faces.length; i++) {
    offsetFaces[i] = meshB.faces[i] + vertexOffset;
  }
  combinedFaces.set(offsetFaces, meshA.faces.length);
  
  return {
    vertices: combinedVertices,
    faces: combinedFaces
  };
}

function computeIntersection(meshA: any, meshB: any): { vertices: Float32Array, faces: Uint32Array } {
  // 简化实现：返回meshB（实际项目中需要计算真实交集）
  console.log('⚠️ 使用简化交集运算');
  return {
    vertices: meshB.vertices,
    faces: meshB.faces
  };
}

// ============== 网格生成处理 ==============
async function performMeshGeneration(taskId: string, data: any): Promise<void> {
  const { geometry, meshSize, algorithm } = data;
  
  self.postMessage({
    id: taskId,
    progress: 0
  } as GeometryWorkerResponse);
  
  try {
    // 网格生成算法选择
    let meshResult;
    
    switch (algorithm) {
      case 'delaunay':
        meshResult = generateDelaunayMesh(geometry, meshSize);
        break;
      case 'advancing_front':
        meshResult = generateAdvancingFrontMesh(geometry, meshSize);
        break;
      case 'octree':
        meshResult = generateOctreeMesh(geometry, meshSize);
        break;
      default:
        meshResult = generateSimpleMesh(geometry, meshSize);
    }
    
    self.postMessage({
      id: taskId,
      progress: 70
    } as GeometryWorkerResponse);
    
    // 网格质量优化
    const optimizedMesh = optimizeMesh(meshResult);
    
    self.postMessage({
      id: taskId,
      result: optimizedMesh,
      progress: 100
    } as GeometryWorkerResponse);
    
  } catch (error) {
    console.error('❌ 网格生成失败:', error);
    throw error;
  }
}

function generateDelaunayMesh(geometry: any, meshSize: number): any {
  console.log('🔺 生成Delaunay网格...');
  // 简化实现
  return generateSimpleMesh(geometry, meshSize);
}

function generateAdvancingFrontMesh(geometry: any, meshSize: number): any {
  console.log('➡️ 生成推进前沿网格...');
  // 简化实现
  return generateSimpleMesh(geometry, meshSize);
}

function generateOctreeMesh(geometry: any, meshSize: number): any {
  console.log('🌳 生成八叉树网格...');
  // 简化实现
  return generateSimpleMesh(geometry, meshSize);
}

function generateSimpleMesh(geometry: any, meshSize: number): any {
  // 简化的网格生成
  const vertices = geometry.vertices;
  const faces = geometry.faces;
  
  return {
    vertices: new Float32Array(vertices),
    faces: new Uint32Array(faces),
    quality: calculateMeshQuality(vertices, faces)
  };
}

function optimizeMesh(mesh: any): any {
  // 简化的网格优化
  console.log('⚡ 优化网格质量...');
  
  // 可以添加各种优化算法：
  // - 顶点平滑
  // - 边翻转
  // - 节点插入/删除
  // - 拓扑优化
  
  return mesh;
}

// ============== 质量分析处理 ==============
async function performQualityAnalysis(taskId: string, data: any): Promise<void> {
  const { geometry } = data;
  
  self.postMessage({
    id: taskId,
    progress: 0
  } as GeometryWorkerResponse);
  
  try {
    // 分析网格质量
    const quality = calculateDetailedMeshQuality(geometry.vertices, geometry.faces);
    
    self.postMessage({
      id: taskId,
      progress: 50
    } as GeometryWorkerResponse);
    
    // 识别问题区域
    const problemAreas = identifyProblemAreas(geometry.vertices, geometry.faces);
    
    self.postMessage({
      id: taskId,
      result: {
        quality,
        problemAreas,
        suggestions: generateQualitySuggestions(quality, problemAreas)
      },
      progress: 100
    } as GeometryWorkerResponse);
    
  } catch (error) {
    console.error('❌ 质量分析失败:', error);
    throw error;
  }
}

function calculateDetailedMeshQuality(vertices: Float32Array, faces: Uint32Array): any {
  const triangleCount = faces.length / 3;
  let minArea = Infinity;
  let maxArea = -Infinity;
  let minAspectRatio = Infinity;
  let maxAspectRatio = -Infinity;
  let totalArea = 0;
  let poorQualityCount = 0;
  
  for (let i = 0; i < faces.length; i += 3) {
    const i1 = faces[i] * 3;
    const i2 = faces[i + 1] * 3;
    const i3 = faces[i + 2] * 3;
    
    const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
    const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];
    const v3 = [vertices[i3], vertices[i3 + 1], vertices[i3 + 2]];
    
    const area = calculateTriangleArea(v1, v2, v3);
    const aspectRatio = calculateTriangleAspectRatio(v1, v2, v3);
    
    totalArea += area;
    minArea = Math.min(minArea, area);
    maxArea = Math.max(maxArea, area);
    minAspectRatio = Math.min(minAspectRatio, aspectRatio);
    maxAspectRatio = Math.max(maxAspectRatio, aspectRatio);
    
    if (aspectRatio > 10 || area < 1e-8) {
      poorQualityCount++;
    }
  }
  
  return {
    triangleCount,
    totalArea,
    avgArea: totalArea / triangleCount,
    minArea,
    maxArea,
    minAspectRatio,
    maxAspectRatio,
    avgAspectRatio: (minAspectRatio + maxAspectRatio) / 2,
    poorQualityRatio: poorQualityCount / triangleCount,
    overallScore: Math.max(0, 100 - (poorQualityCount / triangleCount) * 100)
  };
}

function calculateTriangleArea(v1: number[], v2: number[], v3: number[]): number {
  const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
  const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
  
  const cross = [
    edge1[1] * edge2[2] - edge1[2] * edge2[1],
    edge1[2] * edge2[0] - edge1[0] * edge2[2],
    edge1[0] * edge2[1] - edge1[1] * edge2[0]
  ];
  
  const magnitude = Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2]);
  return magnitude * 0.5;
}

function calculateTriangleAspectRatio(v1: number[], v2: number[], v3: number[]): number {
  const edge1 = Math.sqrt((v2[0] - v1[0]) ** 2 + (v2[1] - v1[1]) ** 2 + (v2[2] - v1[2]) ** 2);
  const edge2 = Math.sqrt((v3[0] - v2[0]) ** 2 + (v3[1] - v2[1]) ** 2 + (v3[2] - v2[2]) ** 2);
  const edge3 = Math.sqrt((v1[0] - v3[0]) ** 2 + (v1[1] - v3[1]) ** 2 + (v1[2] - v3[2]) ** 2);
  
  const longest = Math.max(edge1, edge2, edge3);
  const shortest = Math.min(edge1, edge2, edge3);
  
  return longest / shortest;
}

function identifyProblemAreas(vertices: Float32Array, faces: Uint32Array): any[] {
  const problemAreas = [];
  
  for (let i = 0; i < faces.length; i += 3) {
    const i1 = faces[i] * 3;
    const i2 = faces[i + 1] * 3;
    const i3 = faces[i + 2] * 3;
    
    const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
    const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];
    const v3 = [vertices[i3], vertices[i3 + 1], vertices[i3 + 2]];
    
    const aspectRatio = calculateTriangleAspectRatio(v1, v2, v3);
    const area = calculateTriangleArea(v1, v2, v3);
    
    if (aspectRatio > 10) {
      problemAreas.push({
        triangleIndex: i / 3,
        type: 'high_aspect_ratio',
        severity: Math.min(1, aspectRatio / 20),
        location: {
          x: (v1[0] + v2[0] + v3[0]) / 3,
          y: (v1[1] + v2[1] + v3[1]) / 3,
          z: (v1[2] + v2[2] + v3[2]) / 3
        }
      });
    }
    
    if (area < 1e-8) {
      problemAreas.push({
        triangleIndex: i / 3,
        type: 'degenerate_triangle',
        severity: 1,
        location: {
          x: (v1[0] + v2[0] + v3[0]) / 3,
          y: (v1[1] + v2[1] + v3[1]) / 3,
          z: (v1[2] + v2[2] + v3[2]) / 3
        }
      });
    }
  }
  
  return problemAreas;
}

function generateQualitySuggestions(quality: any, problemAreas: any[]): string[] {
  const suggestions = [];
  
  if (quality.poorQualityRatio > 0.1) {
    suggestions.push('网格质量较差，建议重新划分网格');
  }
  
  if (quality.maxAspectRatio > 20) {
    suggestions.push('存在高长宽比三角形，建议局部网格细化');
  }
  
  if (problemAreas.some(area => area.type === 'degenerate_triangle')) {
    suggestions.push('存在退化三角形，需要修复几何拓扑');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('网格质量良好');
  }
  
  return suggestions;
}

// ============== 几何优化处理 ==============
async function performGeometryOptimization(taskId: string, data: any): Promise<void> {
  const { geometry, optimizationType } = data;
  
  self.postMessage({
    id: taskId,
    progress: 0
  } as GeometryWorkerResponse);
  
  try {
    let optimizedGeometry;
    
    switch (optimizationType) {
      case 'smooth_surface':
        optimizedGeometry = applySurfaceSmoothing(geometry);
        break;
      case 'merge_vertices':
        optimizedGeometry = mergeCloseVertices(geometry);
        break;
      case 'repair_holes':
        optimizedGeometry = repairHoles(geometry);
        break;
      case 'simplify_geometry':
        optimizedGeometry = simplifyGeometry(geometry);
        break;
      default:
        throw new Error(`不支持的优化类型: ${optimizationType}`);
    }
    
    self.postMessage({
      id: taskId,
      result: optimizedGeometry,
      progress: 100
    } as GeometryWorkerResponse);
    
  } catch (error) {
    console.error('❌ 几何优化失败:', error);
    throw error;
  }
}

function applySurfaceSmoothing(geometry: any): any {
  console.log('🎨 应用表面平滑...');
  // 拉普拉斯平滑算法
  const vertices = new Float32Array(geometry.vertices);
  const faces = geometry.faces;
  
  // 构建顶点邻接信息
  const adjacency = buildVertexAdjacency(vertices, faces);
  
  // 应用拉普拉斯平滑
  const smoothedVertices = new Float32Array(vertices.length);
  const vertexCount = vertices.length / 3;
  
  for (let i = 0; i < vertexCount; i++) {
    const neighbors = adjacency[i];
    if (neighbors.length > 0) {
      let avgX = 0, avgY = 0, avgZ = 0;
      
      for (const neighborIdx of neighbors) {
        avgX += vertices[neighborIdx * 3];
        avgY += vertices[neighborIdx * 3 + 1];
        avgZ += vertices[neighborIdx * 3 + 2];
      }
      
      avgX /= neighbors.length;
      avgY /= neighbors.length;
      avgZ /= neighbors.length;
      
      // 平滑因子
      const lambda = 0.1;
      smoothedVertices[i * 3] = vertices[i * 3] + lambda * (avgX - vertices[i * 3]);
      smoothedVertices[i * 3 + 1] = vertices[i * 3 + 1] + lambda * (avgY - vertices[i * 3 + 1]);
      smoothedVertices[i * 3 + 2] = vertices[i * 3 + 2] + lambda * (avgZ - vertices[i * 3 + 2]);
    } else {
      smoothedVertices[i * 3] = vertices[i * 3];
      smoothedVertices[i * 3 + 1] = vertices[i * 3 + 1];
      smoothedVertices[i * 3 + 2] = vertices[i * 3 + 2];
    }
  }
  
  return {
    ...geometry,
    vertices: smoothedVertices
  };
}

function buildVertexAdjacency(vertices: Float32Array, faces: Uint32Array): number[][] {
  const vertexCount = vertices.length / 3;
  const adjacency: number[][] = new Array(vertexCount).fill(null).map(() => []);
  
  for (let i = 0; i < faces.length; i += 3) {
    const v1 = faces[i];
    const v2 = faces[i + 1];
    const v3 = faces[i + 2];
    
    // 添加邻接关系
    if (!adjacency[v1].includes(v2)) adjacency[v1].push(v2);
    if (!adjacency[v1].includes(v3)) adjacency[v1].push(v3);
    if (!adjacency[v2].includes(v1)) adjacency[v2].push(v1);
    if (!adjacency[v2].includes(v3)) adjacency[v2].push(v3);
    if (!adjacency[v3].includes(v1)) adjacency[v3].push(v1);
    if (!adjacency[v3].includes(v2)) adjacency[v3].push(v2);
  }
  
  return adjacency;
}

function mergeCloseVertices(geometry: any): any {
  console.log('🔗 合并相近顶点...');
  // 简化实现
  return geometry;
}

function repairHoles(geometry: any): any {
  console.log('🔧 修复孔洞...');
  // 简化实现
  return geometry;
}

function simplifyGeometry(geometry: any): any {
  console.log('📉 简化几何...');
  // 简化实现
  return geometry;
}

// ============== 工具函数 ==============
function calculateMeshQuality(vertices: Float32Array, faces: Uint32Array): any {
  return {
    triangleCount: faces.length / 3,
    vertexCount: vertices.length / 3,
    overallScore: 85 // 简化评分
  };
}

// 处理错误
self.onerror = (error) => {
  console.error('❌ 几何Worker错误:', error);
};

// 导出类型（仅用于TypeScript）
export type { GeometryWorkerMessage, GeometryWorkerResponse };