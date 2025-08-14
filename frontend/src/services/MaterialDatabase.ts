/**
 * DeepCAD 材料数据库管理系统
 * 2号几何专家 - 专业CAE材料数据管理
 */

import { 
  MaterialDefinition, 
  MaterialLibrary, 
  MaterialType, 
  ConstitutiveModel,
  MaterialSearchCriteria,
  MaterialValidationResult,
  MaterialImportExportOptions,
  MaterialAssignment
} from '../interfaces/MaterialInterfaces';
import { moduleHub } from '../integration/ModuleIntegrationHub';
import { logger } from '../utils/advancedLogger';
import { materialAPIService } from './MaterialAPIService';

// 数据库事件类型
export type MaterialDatabaseEvent = 
  | 'material_added'
  | 'material_updated' 
  | 'material_deleted'
  | 'library_created'
  | 'library_updated'
  | 'library_deleted'
  | 'database_synced';

// 事件回调接口
export interface MaterialDatabaseEventCallback {
  (event: MaterialDatabaseEvent, data: any): void;
}

/**
 * 材料数据库管理器
 */
export class MaterialDatabase {
  private libraries: Map<string, MaterialLibrary> = new Map();
  private materials: Map<string, MaterialDefinition> = new Map();
  private assignments: Map<string, MaterialAssignment[]> = new Map();
  private eventCallbacks: Map<MaterialDatabaseEvent, MaterialDatabaseEventCallback[]> = new Map();
  
  // 默认材料库
  private defaultLibraryId = 'default_library';
  
  constructor() {
    this.initializeDatabase();
    this.loadDefaultMaterials().catch(error => {
      logger.error('初始化材料数据库失败', { error });
    });
  }

  /**
   * 初始化数据库
   */
  private initializeDatabase() {
    // 创建默认材料库
    const defaultLibrary: MaterialLibrary = {
      id: this.defaultLibraryId,
      name: 'DeepCAD 默认材料库',
      description: '系统内置的标准工程材料库',
      materials: [],
      isDefault: true,
      isReadOnly: false,
      version: '1.0.0',
      created: new Date(),
      modified: new Date()
    };
    
    this.libraries.set(this.defaultLibraryId, defaultLibrary);
    
    logger.info('材料数据库初始化完成', { 
      defaultLibraryId: this.defaultLibraryId 
    });
  }

  /**
   * 加载默认材料 - 从后端API获取
   */
  private async loadDefaultMaterials() {
    try {
      console.log('MaterialDatabase: 开始加载材料数据...');
      // 尝试从后端API加载材料
      const backendMaterials = await materialAPIService.getMaterials();
      console.log('MaterialDatabase: 收到后端材料数据:', backendMaterials);
      
      if (backendMaterials && backendMaterials.length > 0) {
        // 转换后端数据格式并添加到本地数据库
        for (const backendMaterial of backendMaterials) {
          const material = materialAPIService.convertFromBackend(backendMaterial);
          console.log('MaterialDatabase: 转换材料:', material.name);
          this.materials.set(material.id, material);
          
          // 添加到默认库
          const library = this.libraries.get(this.defaultLibraryId)!;
          library.materials.push(material);
        }
        
        console.log('MaterialDatabase: 成功加载', backendMaterials.length, '个材料');
        logger.info('从后端API加载材料成功', { 
          materialCount: backendMaterials.length 
        });
        
        return;
      }
    } catch (error) {
      console.error('MaterialDatabase: 从后端加载失败:', error);
      logger.warn('从后端API加载材料失败，使用默认材料', { error });
    }

    // 后端加载失败时的兜底默认材料
    const defaultMaterials: MaterialDefinition[] = [
      // C30混凝土
      {
        id: 'concrete_c30',
        name: 'C30混凝土',
        type: MaterialType.CONCRETE,
        constitutiveModel: ConstitutiveModel.LINEAR_ELASTIC,
        properties: {
          density: 2400,
          elasticModulus: 30e9,
          poissonRatio: 0.2,
          compressiveStrength: 30e6,
          tensileStrength: 2.65e6,
          thermalExpansion: 1e-5
        },
        description: '标准C30混凝土，适用于一般结构工程',
        standard: 'GB 50010-2010',
        created: new Date(),
        modified: new Date(),
        version: '1.0.0',
        validated: true,
        reliability: 'standard',
        tags: ['混凝土', '结构', '标准'],
        category: '建筑材料'
      }
    ];

    // 添加默认材料到数据库
    for (const material of defaultMaterials) {
      this.addMaterial(material, this.defaultLibraryId);
    }

    logger.info('默认材料加载完成', { 
      materialCount: defaultMaterials.length 
    });
  }

  /**
   * 添加材料
   */
  public addMaterial(material: MaterialDefinition, libraryId?: string): boolean {
    try {
      const targetLibraryId = libraryId || this.defaultLibraryId;
      const library = this.libraries.get(targetLibraryId);
      
      if (!library) {
        throw new Error(`材料库不存在: ${targetLibraryId}`);
      }

      if (library.isReadOnly) {
        throw new Error(`材料库为只读: ${targetLibraryId}`);
      }

      // 检查材料ID是否已存在
      if (this.materials.has(material.id)) {
        throw new Error(`材料ID已存在: ${material.id}`);
      }

      // 添加到材料映射
      this.materials.set(material.id, material);
      
      // 添加到库中
      library.materials.push(material);
      library.modified = new Date();

      // 触发事件
      this.emitEvent('material_added', { material, libraryId: targetLibraryId });

      // 发布到moduleHub
      moduleHub.emit('material:created', {
        id: material.id,
        action: 'material_created',
        materialData: material,
        timestamp: Date.now()
      });

      logger.info('材料添加成功', { 
        materialId: material.id,
        materialName: material.name,
        libraryId: targetLibraryId
      });

      return true;
    } catch (error) {
      logger.error('添加材料失败', { error, materialId: material.id });
      return false;
    }
  }

  /**
   * 更新材料
   */
  public updateMaterial(materialId: string, updates: Partial<MaterialDefinition>): boolean {
    try {
      const material = this.materials.get(materialId);
      if (!material) {
        throw new Error(`材料不存在: ${materialId}`);
      }

      // 更新材料
      const updatedMaterial = {
        ...material,
        ...updates,
        modified: new Date()
      };

      this.materials.set(materialId, updatedMaterial);

      // 更新库中的材料
      for (const library of this.libraries.values()) {
        const index = library.materials.findIndex(m => m.id === materialId);
        if (index !== -1) {
          library.materials[index] = updatedMaterial;
          library.modified = new Date();
          break;
        }
      }

      // 触发事件
      this.emitEvent('material_updated', { material: updatedMaterial });

      // 发布到moduleHub
      moduleHub.emit('material:updated', {
        id: materialId,
        action: 'material_updated',
        materialData: updatedMaterial,
        timestamp: Date.now()
      });

      logger.info('材料更新成功', { materialId, materialName: updatedMaterial.name });

      return true;
    } catch (error) {
      logger.error('更新材料失败', { error, materialId });
      return false;
    }
  }

  /**
   * 删除材料
   */
  public deleteMaterial(materialId: string): boolean {
    try {
      const material = this.materials.get(materialId);
      if (!material) {
        throw new Error(`材料不存在: ${materialId}`);
      }

      // 检查是否有关联的几何体
      const assignments = this.assignments.get(materialId);
      if (assignments && assignments.length > 0) {
        throw new Error(`材料正在使用中，无法删除: ${assignments.length}个关联`);
      }

      // 从材料映射中删除
      this.materials.delete(materialId);

      // 从库中删除
      for (const library of this.libraries.values()) {
        const index = library.materials.findIndex(m => m.id === materialId);
        if (index !== -1) {
          library.materials.splice(index, 1);
          library.modified = new Date();
          break;
        }
      }

      // 触发事件
      this.emitEvent('material_deleted', { materialId });

      // 发布到moduleHub
      moduleHub.emit('material:deleted', {
        id: materialId,
        action: 'material_deleted',
        timestamp: Date.now()
      });

      logger.info('材料删除成功', { materialId });

      return true;
    } catch (error) {
      logger.error('删除材料失败', { error, materialId });
      return false;
    }
  }

  /**
   * 获取材料
   */
  public getMaterial(materialId: string): MaterialDefinition | null {
    return this.materials.get(materialId) || null;
  }

  /**
   * 搜索材料
   */
  public searchMaterials(criteria: MaterialSearchCriteria): MaterialDefinition[] {
    let results = Array.from(this.materials.values());

    // 名称过滤
    if (criteria.name) {
      const namePattern = new RegExp(criteria.name, 'i');
      results = results.filter(m => namePattern.test(m.name) || namePattern.test(m.description || ''));
    }

    // 类型过滤
    if (criteria.type && criteria.type.length > 0) {
      results = results.filter(m => criteria.type!.includes(m.type));
    }

    // 本构模型过滤
    if (criteria.model && criteria.model.length > 0) {
      results = results.filter(m => criteria.model!.includes(m.constitutiveModel));
    }

    // 密度范围过滤
    if (criteria.densityRange) {
      const [min, max] = criteria.densityRange;
      results = results.filter(m => {
        const density = m.properties.density;
        return density >= min && density <= max;
      });
    }

    // 弹性模量范围过滤
    if (criteria.modulusRange) {
      const [min, max] = criteria.modulusRange;
      results = results.filter(m => {
        const modulus = m.properties.elasticModulus;
        return modulus >= min && modulus <= max;
      });
    }

    // 标签过滤
    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter(m => {
        if (!m.tags) return false;
        return criteria.tags!.some(tag => m.tags!.includes(tag));
      });
    }

    // 验证状态过滤
    if (criteria.validated !== undefined) {
      results = results.filter(m => m.validated === criteria.validated);
    }

    // 排序
    if (criteria.sortBy) {
      results.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (criteria.sortBy) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'type':
            aValue = a.type;
            bValue = b.type;
            break;
          case 'modified':
            aValue = a.modified.getTime();
            bValue = b.modified.getTime();
            break;
          case 'usage':
            aValue = a.usageCount || 0;
            bValue = b.usageCount || 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return criteria.sortOrder === 'desc' ? 1 : -1;
        if (aValue > bValue) return criteria.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }

    return results;
  }

  /**
   * 分配材料到几何体
   */
  public assignMaterial(assignment: MaterialAssignment): boolean {
    try {
      // 验证材料存在
      if (!this.materials.has(assignment.materialId)) {
        throw new Error(`材料不存在: ${assignment.materialId}`);
      }

      // 获取或创建几何体的分配列表
      if (!this.assignments.has(assignment.geometryId)) {
        this.assignments.set(assignment.geometryId, []);
      }

      const geometryAssignments = this.assignments.get(assignment.geometryId)!;
      
      // 检查是否已有分配
      const existingIndex = geometryAssignments.findIndex(a => 
        a.regionId === assignment.regionId
      );

      if (existingIndex !== -1) {
        // 更新现有分配
        geometryAssignments[existingIndex] = assignment;
      } else {
        // 添加新分配
        geometryAssignments.push(assignment);
      }

      // 更新材料使用统计
      const material = this.materials.get(assignment.materialId)!;
      material.usageCount = (material.usageCount || 0) + 1;
      material.lastUsed = new Date();

      // 发布到moduleHub
      moduleHub.emit('material:assigned', {
        id: `assignment_${Date.now()}`,
        action: 'material_assigned',
        assignmentData: assignment,
        timestamp: Date.now()
      });

      logger.info('材料分配成功', {
        geometryId: assignment.geometryId,
        materialId: assignment.materialId,
        regionId: assignment.regionId
      });

      return true;
    } catch (error) {
      logger.error('材料分配失败', { error, assignment });
      return false;
    }
  }

  /**
   * 获取几何体的材料分配
   */
  public getGeometryAssignments(geometryId: string): MaterialAssignment[] {
    return this.assignments.get(geometryId) || [];
  }

  /**
   * 获取所有材料库
   */
  public getLibraries(): MaterialLibrary[] {
    return Array.from(this.libraries.values());
  }

  /**
   * 获取默认材料库
   */
  public getDefaultLibrary(): MaterialLibrary | null {
    return this.libraries.get(this.defaultLibraryId) || null;
  }

  /**
   * 注册事件回调
   */
  public addEventListener(event: MaterialDatabaseEvent, callback: MaterialDatabaseEventCallback): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  /**
   * 移除事件回调
   */
  public removeEventListener(event: MaterialDatabaseEvent, callback: MaterialDatabaseEventCallback): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  private emitEvent(event: MaterialDatabaseEvent, data: any): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event, data);
        } catch (error) {
          logger.error(`材料数据库事件回调错误: ${event}`, error);
        }
      });
    }
  }

  /**
   * 导出材料数据
   */
  public exportMaterials(options: MaterialImportExportOptions): string {
    const materials = options.filterCriteria 
      ? this.searchMaterials(options.filterCriteria)
      : Array.from(this.materials.values());

    switch (options.format) {
      case 'json':
        return JSON.stringify(materials, null, 2);
      case 'csv':
        return this.exportToCSV(materials);
      default:
        throw new Error(`不支持的导出格式: ${options.format}`);
    }
  }

  /**
   * 导出为CSV格式
   */
  private exportToCSV(materials: MaterialDefinition[]): string {
    const headers = ['ID', '名称', '类型', '密度', '弹性模量', '泊松比', '描述'];
    const rows = materials.map(m => [
      m.id,
      m.name,
      m.type,
      m.properties.density,
      m.properties.elasticModulus,
      m.properties.poissonRatio,
      m.description || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * 刷新材料数据 - 从后端重新加载
   */
  public async refreshMaterials(): Promise<void> {
    try {
      // 清空现有材料
      this.materials.clear();
      const library = this.libraries.get(this.defaultLibraryId)!;
      library.materials = [];
      
      // 重新加载
      await this.loadDefaultMaterials();
      
      // 触发刷新事件
      this.emitEvent('database_synced', { materialCount: this.materials.size });
      
      logger.info('材料数据刷新完成', { materialCount: this.materials.size });
    } catch (error) {
      logger.error('材料数据刷新失败', { error });
      throw error;
    }
  }

  /**
   * 获取数据库统计信息
   */
  public getStatistics() {
    const materialsByType = new Map<MaterialType, number>();
    const materialsByModel = new Map<ConstitutiveModel, number>();
    let validatedCount = 0;
    let totalUsage = 0;

    for (const material of this.materials.values()) {
      // 按类型统计
      materialsByType.set(
        material.type, 
        (materialsByType.get(material.type) || 0) + 1
      );

      // 按本构模型统计
      materialsByModel.set(
        material.constitutiveModel,
        (materialsByModel.get(material.constitutiveModel) || 0) + 1
      );

      // 验证统计
      if (material.validated) validatedCount++;

      // 使用统计
      totalUsage += material.usageCount || 0;
    }

    return {
      totalMaterials: this.materials.size,
      totalLibraries: this.libraries.size,
      validatedMaterials: validatedCount,
      totalUsage,
      materialsByType: Object.fromEntries(materialsByType),
      materialsByModel: Object.fromEntries(materialsByModel),
      averageUsage: totalUsage / this.materials.size || 0
    };
  }
}

// 单例导出
export const materialDatabase = new MaterialDatabase();