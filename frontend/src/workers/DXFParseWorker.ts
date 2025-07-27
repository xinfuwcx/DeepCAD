/**
 * DXF解析Worker - 2号几何专家专用
 * 处理大型DXF文件的后台解析，避免UI阻塞
 */

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface DXFEntity {
  type: 'LINE' | 'ARC' | 'CIRCLE' | 'POLYLINE' | 'LWPOLYLINE' | 'SPLINE';
  layer: string;
  points: Point3D[];
  properties: Record<string, any>;
}

interface WorkerMessage {
  type: string;
  content?: string;
  filename?: string;
}

// Worker消息处理
self.onmessage = function(event: MessageEvent<WorkerMessage>) {
  const { type, content, filename } = event.data;
  
  switch (type) {
    case 'PARSE_DXF':
      if (content && filename) {
        parseDXFContent(content, filename);
      }
      break;
      
    default:
      self.postMessage({
        type: 'PARSE_ERROR',
        error: `未知的Worker消息类型: ${type}`
      });
  }
};

/**
 * DXF内容解析 - Worker版本
 */
function parseDXFContent(content: string, filename: string) {
  try {
    console.log('🏗️ Worker开始解析DXF:', filename);
    
    const lines = content.split('\n');
    const entities: DXFEntity[] = [];
    const layers = new Set<string>();
    
    let currentEntity: Partial<DXFEntity> | null = null;
    let currentSection = '';
    let processedLines = 0;
    const totalLines = lines.length;
    
    // 进度报告间隔
    const progressInterval = Math.max(1000, Math.floor(totalLines / 100));
    
    for (let i = 0; i < lines.length; i += 2) {
      const code = parseInt(lines[i]?.trim() || '0');
      const value = lines[i + 1]?.trim() || '';
      
      // 处理DXF代码
      switch (code) {
        case 0: // 实体类型或段开始
          if (currentEntity) {
            entities.push(currentEntity as DXFEntity);
            currentEntity = null;
          }
          
          if (value === 'SECTION') {
            currentSection = '';
          } else if (['LINE', 'ARC', 'CIRCLE', 'POLYLINE', 'LWPOLYLINE', 'SPLINE'].includes(value)) {
            currentEntity = {
              type: value as DXFEntity['type'],
              layer: '0',
              points: [],
              properties: {}
            };
          }
          break;
          
        case 2: // 段名称
          currentSection = value;
          break;
          
        case 8: // 图层名
          if (currentEntity) {
            currentEntity.layer = value;
            layers.add(value);
          }
          break;
          
        case 10: // X坐标
          if (currentEntity) {
            const x = parseFloat(value);
            if (!isNaN(x)) {
              currentEntity.points = currentEntity.points || [];
              currentEntity.points.push({ x, y: 0, z: 0 });
            }
          }
          break;
          
        case 20: // Y坐标
          if (currentEntity && currentEntity.points && currentEntity.points.length > 0) {
            const y = parseFloat(value);
            if (!isNaN(y)) {
              const lastPoint = currentEntity.points[currentEntity.points.length - 1];
              lastPoint.y = y;
            }
          }
          break;
          
        case 30: // Z坐标
          if (currentEntity && currentEntity.points && currentEntity.points.length > 0) {
            const z = parseFloat(value);
            if (!isNaN(z)) {
              const lastPoint = currentEntity.points[currentEntity.points.length - 1];
              lastPoint.z = z;
            }
          }
          break;
          
        case 40: // 半径（圆弧、圆）
          if (currentEntity) {
            currentEntity.properties = currentEntity.properties || {};
            currentEntity.properties.radius = parseFloat(value);
          }
          break;
          
        case 50: // 起始角度（圆弧）
          if (currentEntity) {
            currentEntity.properties = currentEntity.properties || {};
            currentEntity.properties.startAngle = parseFloat(value);
          }
          break;
          
        case 51: // 结束角度（圆弧）
          if (currentEntity) {
            currentEntity.properties = currentEntity.properties || {};
            currentEntity.properties.endAngle = parseFloat(value);
          }
          break;
      }
      
      processedLines += 2;
      
      // 发送进度更新
      if (processedLines % progressInterval === 0) {
        const progress = Math.floor((processedLines / totalLines) * 100);
        self.postMessage({
          type: 'PARSE_PROGRESS',
          result: { 
            progress,
            processedLines,
            totalLines,
            entitiesFound: entities.length
          }
        });
      }
    }
    
    // 处理最后一个实体
    if (currentEntity) {
      entities.push(currentEntity as DXFEntity);
    }
    
    // 过滤有效实体
    const validEntities = entities.filter(e => e.points && e.points.length > 0);
    
    console.log(`✅ Worker解析完成: ${validEntities.length}个实体, ${layers.size}个图层`);
    
    // 计算几何属性
    const bounds = calculateBounds(validEntities);
    const area = calculateArea(validEntities);
    const perimeter = calculatePerimeter(validEntities);
    
    // 发送解析结果
    self.postMessage({
      type: 'PARSE_COMPLETE',
      result: {
        entities: validEntities,
        layers: Array.from(layers),
        bounds,
        area,
        perimeter,
        metadata: {
          filename,
          version: 'AC1015',
          units: 'mm',
          parseTime: 0 // 主线程计算
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Worker解析错误:', error);
    self.postMessage({
      type: 'PARSE_ERROR',
      error: error instanceof Error ? error.message : '未知解析错误'
    });
  }
}

/**
 * 计算几何边界
 */
function calculateBounds(entities: DXFEntity[]) {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  entities.forEach(entity => {
    entity.points.forEach(point => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      minZ = Math.min(minZ, point.z);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
      maxZ = Math.max(maxZ, point.z);
    });
  });
  
  // 处理空几何的情况
  if (!isFinite(minX)) {
    minX = minY = minZ = maxX = maxY = maxZ = 0;
  }
  
  const min = { x: minX, y: minY, z: minZ };
  const max = { x: maxX, y: maxY, z: maxZ };
  const center = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: (minZ + maxZ) / 2
  };
  const dimensions = {
    x: maxX - minX,
    y: maxY - minY,
    z: maxZ - minZ
  };
  
  return { min, max, center, dimensions };
}

/**
 * 计算几何面积
 */
function calculateArea(entities: DXFEntity[]): number {
  let totalArea = 0;
  
  entities.forEach(entity => {
    if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && entity.points.length >= 3) {
      totalArea += polygonArea(entity.points);
    } else if (entity.type === 'CIRCLE' && entity.properties?.radius) {
      totalArea += Math.PI * entity.properties.radius * entity.properties.radius;
    }
  });
  
  return Math.abs(totalArea);
}

/**
 * 计算几何周长
 */
function calculatePerimeter(entities: DXFEntity[]): number {
  let totalPerimeter = 0;
  
  entities.forEach(entity => {
    if (entity.type === 'LINE' && entity.points.length >= 2) {
      totalPerimeter += distance3D(entity.points[0], entity.points[1]);
    } else if (entity.type === 'CIRCLE' && entity.properties?.radius) {
      totalPerimeter += 2 * Math.PI * entity.properties.radius;
    } else if ((entity.type === 'POLYLINE' || entity.type === 'LWPOLYLINE') && entity.points.length >= 2) {
      for (let i = 0; i < entity.points.length - 1; i++) {
        totalPerimeter += distance3D(entity.points[i], entity.points[i + 1]);
      }
    }
  });
  
  return totalPerimeter;
}

/**
 * 多边形面积计算 - 鞋带公式
 */
function polygonArea(points: Point3D[]): number {
  let area = 0;
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  
  return area / 2;
}

/**
 * 3D点间距离
 */
function distance3D(p1: Point3D, p2: Point3D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// 导出Worker类型（用于TypeScript）
export {};