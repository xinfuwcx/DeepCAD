/**
 * DXF几何处理服务 - 2号几何专家核心服务
 * 负责CAD文件解析、几何提取、布尔运算等复杂几何处理
 */

export interface DXFEntity {
  type: 'LINE' | 'ARC' | 'CIRCLE' | 'POLYLINE' | 'LWPOLYLINE' | 'SPLINE';
  layer: string;
  points: Point3D[];
  properties: Record<string, any>;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface CADGeometry {
  entities: DXFEntity[];
  layers: string[];
  bounds: {
    min: Point3D;
    max: Point3D;
    center: Point3D;
    dimensions: Point3D;
  };
  area: number;
  perimeter: number;
  metadata: {
    filename: string;
    version: string;
    units: string;
    parseTime: number;
  };
}

export interface GeometryValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  quality: {
    score: number; // 0-1
    meshReadiness: boolean;
    complexity: 'low' | 'medium' | 'high';
  };
}

class DXFGeometryService {
  private static instance: DXFGeometryService;
  private workerPool: Worker[] = [];
  private cache: Map<string, CADGeometry> = new Map();

  static getInstance(): DXFGeometryService {
    if (!DXFGeometryService.instance) {
      DXFGeometryService.instance = new DXFGeometryService();
    }
    return DXFGeometryService.instance;
  }

  /**
   * 解析DXF文件 - 主要入口函数
   */
  async parseDXFFile(file: File): Promise<CADGeometry> {
    const startTime = performance.now();
    
    // 检查缓存
    const fileHash = await this.calculateFileHash(file);
    if (this.cache.has(fileHash)) {
      console.log('🗂️ DXF缓存命中:', file.name);
      return this.cache.get(fileHash)!;
    }

    console.log('📄 开始解析DXF文件:', file.name, `${(file.size / 1024 / 1024).toFixed(2)}MB`);

    try {
      // 读取文件内容
      const content = await this.readFileContent(file);
      
      // 使用Worker解析（如果文件较大）
      let geometry: CADGeometry;
      if (file.size > 1024 * 1024) { // > 1MB使用Worker
        geometry = await this.parseWithWorker(content, file.name);
      } else {
        geometry = await this.parseInMainThread(content, file.name);
      }

      // 后处理和验证
      geometry = await this.postProcessGeometry(geometry);
      
      const parseTime = performance.now() - startTime;
      geometry.metadata.parseTime = parseTime;

      // 缓存结果
      this.cache.set(fileHash, geometry);
      
      console.log('✅ DXF解析完成:', {
        实体数: geometry.entities.length,
        图层数: geometry.layers.length,
        面积: geometry.area.toFixed(2) + 'm²',
        周长: geometry.perimeter.toFixed(2) + 'm',
        解析时间: parseTime.toFixed(0) + 'ms'
      });

      return geometry;

    } catch (error) {
      console.error('❌ DXF解析失败:', error);
      throw new Error(`DXF文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 主线程DXF解析 - 小文件专用
   */
  private async parseInMainThread(content: string, filename: string): Promise<CADGeometry> {
    const lines = content.split('\n');
    const entities: DXFEntity[] = [];
    const layers = new Set<string>();
    
    let currentEntity: Partial<DXFEntity> | null = null;
    let currentSection = '';
    
    for (let i = 0; i < lines.length; i += 2) {
      const code = parseInt(lines[i]?.trim() || '0');
      const value = lines[i + 1]?.trim() || '';
      
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
            currentEntity.points = currentEntity.points || [];
            currentEntity.points.push({ x, y: 0, z: 0 });
          }
          break;
          
        case 20: // Y坐标
          if (currentEntity && currentEntity.points && currentEntity.points.length > 0) {
            const lastPoint = currentEntity.points[currentEntity.points.length - 1];
            lastPoint.y = parseFloat(value);
          }
          break;
          
        case 30: // Z坐标
          if (currentEntity && currentEntity.points && currentEntity.points.length > 0) {
            const lastPoint = currentEntity.points[currentEntity.points.length - 1];
            lastPoint.z = parseFloat(value);
          }
          break;
      }
    }
    
    // 处理最后一个实体
    if (currentEntity) {
      entities.push(currentEntity as DXFEntity);
    }

    // 计算几何属性
    const bounds = this.calculateBounds(entities);
    const area = this.calculateArea(entities);
    const perimeter = this.calculatePerimeter(entities);

    return {
      entities: entities.filter(e => e.points && e.points.length > 0),
      layers: Array.from(layers),
      bounds,
      area,
      perimeter,
      metadata: {
        filename,
        version: 'AC1015', // 默认版本
        units: 'mm',
        parseTime: 0 // 后续设置
      }
    };
  }

  /**
   * Worker解析 - 大文件专用
   */
  private async parseWithWorker(content: string, filename: string): Promise<CADGeometry> {
    return new Promise((resolve, reject) => {
      // 创建专用的DXF解析Worker
      const worker = new Worker(new URL('../workers/DXFParseWorker.ts', import.meta.url));
      
      worker.postMessage({
        type: 'PARSE_DXF',
        content,
        filename
      });
      
      worker.onmessage = (event) => {
        const { type, result, error } = event.data;
        
        if (type === 'PARSE_COMPLETE') {
          worker.terminate();
          resolve(result);
        } else if (type === 'PARSE_ERROR') {
          worker.terminate();
          reject(new Error(error));
        } else if (type === 'PARSE_PROGRESS') {
          console.log(`📊 DXF解析进度: ${result.progress}%`);
        }
      };
      
      worker.onerror = (error) => {
        worker.terminate();
        reject(error);
      };
      
      // 超时处理
      setTimeout(() => {
        worker.terminate();
        reject(new Error('DXF解析超时'));
      }, 30000); // 30秒超时
    });
  }

  /**
   * 几何后处理 - 清理和优化
   */
  private async postProcessGeometry(geometry: CADGeometry): Promise<CADGeometry> {
    console.log('🔧 开始几何后处理...');
    
    // 1. 移除重复实体
    geometry.entities = await this.removeDuplicateEntities(geometry.entities);
    
    // 2. 合并共线的线段
    geometry.entities = await this.mergeCollinearLines(geometry.entities);
    
    // 3. 封闭断开的轮廓
    geometry.entities = await this.closeOpenContours(geometry.entities);
    
    // 4. 重新计算几何属性
    geometry.bounds = this.calculateBounds(geometry.entities);
    geometry.area = this.calculateArea(geometry.entities);
    geometry.perimeter = this.calculatePerimeter(geometry.entities);
    
    console.log('✅ 几何后处理完成');
    return geometry;
  }

  /**
   * 移除重复实体
   */
  private async removeDuplicateEntities(entities: DXFEntity[]): Promise<DXFEntity[]> {
    const unique: DXFEntity[] = [];
    const seen = new Set<string>();
    
    for (const entity of entities) {
      const hash = this.hashEntity(entity);
      if (!seen.has(hash)) {
        seen.add(hash);
        unique.push(entity);
      }
    }
    
    console.log(`🗑️ 移除${entities.length - unique.length}个重复实体`);
    return unique;
  }

  /**
   * 合并共线线段
   */
  private async mergeCollinearLines(entities: DXFEntity[]): Promise<DXFEntity[]> {
    // 简化版本：仅处理LINE类型实体
    const lines = entities.filter(e => e.type === 'LINE');
    const nonLines = entities.filter(e => e.type !== 'LINE');
    const mergedLines: DXFEntity[] = [];
    const processed = new Set<number>();
    
    for (let i = 0; i < lines.length; i++) {
      if (processed.has(i)) continue;
      
      const currentLine = lines[i];
      let merged = false;
      
      // 寻找可以合并的共线线段
      for (let j = i + 1; j < lines.length; j++) {
        if (processed.has(j)) continue;
        
        const otherLine = lines[j];
        if (this.areCollinear(currentLine, otherLine)) {
          // 合并线段
          const mergedLine = this.mergeLines(currentLine, otherLine);
          if (mergedLine) {
            mergedLines.push(mergedLine);
            processed.add(i);
            processed.add(j);
            merged = true;
            break;
          }
        }
      }
      
      if (!merged) {
        mergedLines.push(currentLine);
        processed.add(i);
      }
    }
    
    console.log(`🔗 合并${lines.length - mergedLines.length}条共线线段`);
    return [...mergedLines, ...nonLines];
  }

  /**
   * 封闭断开的轮廓
   */
  private async closeOpenContours(entities: DXFEntity[]): Promise<DXFEntity[]> {
    // 简化版本：检测并修复小的间隙
    const tolerance = 0.001; // 1mm容差
    let closedCount = 0;
    
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
        if (entity.points.length >= 3) {
          const firstPoint = entity.points[0];
          const lastPoint = entity.points[entity.points.length - 1];
          const distance = this.distance3D(firstPoint, lastPoint);
          
          if (distance > tolerance && distance < 10 * tolerance) {
            // 封闭轮廓
            entity.points.push({ ...firstPoint });
            closedCount++;
          }
        }
      }
    }
    
    if (closedCount > 0) {
      console.log(`🔒 封闭${closedCount}个断开轮廓`);
    }
    
    return entities;
  }

  /**
   * 几何验证
   */
  async validateGeometry(geometry: CADGeometry): Promise<GeometryValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // 检查基本几何有效性
    if (geometry.entities.length === 0) {
      errors.push('未找到有效的几何实体');
    }
    
    if (geometry.area <= 0) {
      errors.push('几何面积无效或为零');
    }
    
    // 检查封闭性
    const openContours = geometry.entities.filter(e => 
      (e.type === 'POLYLINE' || e.type === 'LWPOLYLINE') && 
      e.points.length >= 3 &&
      this.distance3D(e.points[0], e.points[e.points.length - 1]) > 0.001
    );
    
    if (openContours.length > 0) {
      warnings.push(`发现${openContours.length}个未封闭的轮廓`);
      suggestions.push('建议封闭所有轮廓以确保布尔运算正确');
    }
    
    // 检查复杂度
    const entityCount = geometry.entities.length;
    let complexity: 'low' | 'medium' | 'high' = 'low';
    
    if (entityCount > 1000) {
      complexity = 'high';
      warnings.push('几何过于复杂，可能影响计算性能');
      suggestions.push('考虑简化几何或使用分层处理');
    } else if (entityCount > 100) {
      complexity = 'medium';
    }
    
    // 计算质量评分
    let score = 1.0;
    score -= errors.length * 0.3;
    score -= warnings.length * 0.1;
    score = Math.max(0, score);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      quality: {
        score,
        meshReadiness: errors.length === 0 && warnings.length <= 2,
        complexity
      }
    };
  }

  // 辅助方法
  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  private async calculateFileHash(file: File): Promise<string> {
    // 简化版本：使用文件名+大小+修改时间
    return `${file.name}_${file.size}_${file.lastModified}`;
  }

  private calculateBounds(entities: DXFEntity[]): CADGeometry['bounds'] {
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

  private calculateArea(entities: DXFEntity[]): number {
    // 简化版本：仅计算多边形面积
    let totalArea = 0;
    
    entities.forEach(entity => {
      if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && entity.points.length >= 3) {
        totalArea += this.polygonArea(entity.points);
      }
    });
    
    return Math.abs(totalArea);
  }

  private calculatePerimeter(entities: DXFEntity[]): number {
    let totalPerimeter = 0;
    
    entities.forEach(entity => {
      for (let i = 0; i < entity.points.length - 1; i++) {
        totalPerimeter += this.distance3D(entity.points[i], entity.points[i + 1]);
      }
    });
    
    return totalPerimeter;
  }

  private polygonArea(points: Point3D[]): number {
    let area = 0;
    const n = points.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    
    return area / 2;
  }

  private distance3D(p1: Point3D, p2: Point3D): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private hashEntity(entity: DXFEntity): string {
    const pointsStr = entity.points.map(p => `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`).join('|');
    return `${entity.type}:${entity.layer}:${pointsStr}`;
  }

  private areCollinear(line1: DXFEntity, line2: DXFEntity): boolean {
    // 简化版本：检查两条线段是否共线
    if (line1.points.length !== 2 || line2.points.length !== 2) return false;
    
    // 实现共线检测逻辑
    // 这里需要更复杂的几何算法
    return false;
  }

  private mergeLines(line1: DXFEntity, line2: DXFEntity): DXFEntity | null {
    // 简化版本：合并两条共线线段
    // 实际实现需要更复杂的几何算法
    return null;
  }
}

export default DXFGeometryService;
export { DXFGeometryService };