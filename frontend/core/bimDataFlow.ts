/**
 * BIM数据流和物理组管理系统
 * 基于Revit Families和Bentley Elements的数据组织结构
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import { Vector3, Quaternion, Box3 } from 'three';
import { getBIMMaterial, createBIMMaterial } from './bimColorSystem';

// ==================== BIM构件基础接口 ====================

// BIM构件基类
export interface BIMElement {
  id: string;
  name: string;
  type: BIMElementType;
  category: BIMCategory;
  family: string;
  familyType: string;
  
  // 几何属性
  geometry: {
    position: Vector3;
    rotation: Quaternion;
    scale: Vector3;
    bounds: Box3;
    vertices: number[][];
    faces: number[][];
  };
  
  // 材质属性
  material: {
    category: string;
    name: string;
    properties: any;
  };
  
  // BIM属性
  properties: {
    // 基本信息
    mark?: string;                    // 构件标记
    description?: string;             // 描述
    comments?: string;               // 注释
    
    // 几何参数
    length?: number;                 // 长度
    width?: number;                  // 宽度
    height?: number;                 // 高度
    diameter?: number;               // 直径
    thickness?: number;              // 厚度
    area?: number;                   // 面积
    volume?: number;                 // 体积
    
    // 材料属性
    materialName?: string;           // 材料名称
    materialGrade?: string;          // 材料等级
    density?: number;                // 密度 kg/m³
    strength?: number;               // 强度 MPa
    
    // 工程属性
    phase?: 'existing' | 'new' | 'demolished' | 'temporary';
    constructionSequence?: number;   // 施工工序
    workset?: string;                // 工作集
    designOption?: string;           // 设计选项
    
    // 自定义参数
    [key: string]: any;
  };
  
  // 状态信息
  status: {
    visible: boolean;
    locked: boolean;
    selected: boolean;
    highlighted: boolean;
    phase: string;
    workset: string;
  };
  
  // 关联关系
  relationships: {
    parent?: string;                 // 父构件ID
    children: string[];              // 子构件ID列表
    dependencies: string[];          // 依赖构件ID列表
    conflicts: string[];             // 冲突构件ID列表
  };
  
  // 时间信息
  timestamps: {
    created: string;
    modified: string;
    version: string;
  };
}

// BIM构件类型
export type BIMElementType = 
  | 'SoilLayer'           // 土层
  | 'DiaphragmWall'       // 地下连续墙
  | 'BoredPile'           // 钻孔灌注桩
  | 'AnchorBolt'          // 预应力锚杆
  | 'AnchorCable'         // 预应力锚索
  | 'SteelStrut'          // 钢支撑
  | 'ConcreteStrut'       // 混凝土支撑
  | 'TunnelSegment'       // 隧道管片
  | 'TunnelLining'        // 隧道衬砌
  | 'DewateringWell'      // 降水井
  | 'MonitoringPoint'     // 监测点
  | 'Building'            // 建筑物
  | 'Excavation'          // 基坑
  | 'Foundation'          // 基础
  | 'Slab'               // 楼板
  | 'Beam'               // 梁
  | 'Column'             // 柱
  | 'Wall'               // 墙
  | 'Generic';           // 通用构件

// BIM类别
export type BIMCategory = 
  | 'Geotechnical'        // 岩土工程
  | 'Structural'          // 结构工程
  | 'Tunnel'             // 隧道工程
  | 'Foundation'         // 基础工程
  | 'Support'            // 支护工程
  | 'Monitoring'         // 监测工程
  | 'Hydraulic'          // 水工工程
  | 'Architecture'       // 建筑工程
  | 'MEP'               // 机电工程
  | 'Site';             // 场地工程

// ==================== 物理组管理系统 ====================

// 物理组接口
export interface BIMPhysicalGroup {
  id: string;
  name: string;
  description: string;
  category: BIMCategory;
  
  // 组成员
  members: string[];              // 构件ID列表
  
  // 组属性
  properties: {
    isAssembly: boolean;          // 是否为装配体
    isSystem: boolean;            // 是否为系统
    materialTakeoff: boolean;     // 是否计算工程量
    costCenter?: string;          // 成本中心
    phase: string;               // 工程阶段
    workset: string;             // 工作集
  };
  
  // 几何属性
  bounds: Box3;                   // 包围盒
  centroid: Vector3;              // 质心
  
  // 计算属性
  quantities: {
    totalVolume: number;          // 总体积
    totalArea: number;            // 总面积
    totalLength: number;          // 总长度
    totalWeight: number;          // 总重量
    elementCount: number;         // 构件数量
  };
  
  // 状态
  status: {
    visible: boolean;
    locked: boolean;
    isolated: boolean;
  };
  
  // 时间信息
  timestamps: {
    created: string;
    modified: string;
  };
}

// ==================== BIM数据管理器 ====================

class BIMDataManager {
  private elements: Map<string, BIMElement> = new Map();
  private groups: Map<string, BIMPhysicalGroup> = new Map();
  private worksets: Map<string, string[]> = new Map();
  private phases: Map<string, string[]> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeDefaultWorksets();
    this.initializeDefaultPhases();
  }

  // ==================== 构件管理 ====================

  /**
   * 添加BIM构件
   */
  addElement(element: BIMElement): void {
    // 验证构件数据
    if (!this.validateElement(element)) {
      throw new Error(`无效的BIM构件数据: ${element.id}`);
    }

    // 计算几何属性
    this.calculateGeometryProperties(element);
    
    // 设置材质属性
    this.assignMaterial(element);
    
    this.elements.set(element.id, element);
    this.emit('elementAdded', element);
    
    console.log(`🏗️ BIM构件已添加: ${element.name} (${element.type})`);
  }

  /**
   * 更新BIM构件
   */
  updateElement(elementId: string, updates: Partial<BIMElement>): boolean {
    const element = this.elements.get(elementId);
    if (!element) return false;

    const updatedElement = { ...element, ...updates };
    updatedElement.timestamps.modified = new Date().toISOString();
    
    // 重新计算几何属性
    this.calculateGeometryProperties(updatedElement);
    
    this.elements.set(elementId, updatedElement);
    this.emit('elementUpdated', updatedElement);
    
    return true;
  }

  /**
   * 删除BIM构件
   */
  deleteElement(elementId: string): boolean {
    const element = this.elements.get(elementId);
    if (!element) return false;

    // 清理关联关系
    this.cleanupRelationships(elementId);
    
    this.elements.delete(elementId);
    this.emit('elementDeleted', element);
    
    return true;
  }

  /**
   * 获取BIM构件
   */
  getElement(elementId: string): BIMElement | undefined {
    return this.elements.get(elementId);
  }

  /**
   * 按类型获取构件
   */
  getElementsByType(type: BIMElementType): BIMElement[] {
    return Array.from(this.elements.values()).filter(el => el.type === type);
  }

  /**
   * 按类别获取构件
   */
  getElementsByCategory(category: BIMCategory): BIMElement[] {
    return Array.from(this.elements.values()).filter(el => el.category === category);
  }

  /**
   * 按工作集获取构件
   */
  getElementsByWorkset(workset: string): BIMElement[] {
    return Array.from(this.elements.values()).filter(el => el.status.workset === workset);
  }

  /**
   * 按阶段获取构件
   */
  getElementsByPhase(phase: string): BIMElement[] {
    return Array.from(this.elements.values()).filter(el => el.status.phase === phase);
  }

  // ==================== 物理组管理 ====================

  /**
   * 创建物理组
   */
  createGroup(
    name: string,
    category: BIMCategory,
    memberIds: string[],
    properties?: Partial<BIMPhysicalGroup['properties']>
  ): BIMPhysicalGroup {
    const group: BIMPhysicalGroup = {
      id: this.generateId(),
      name,
      description: `${category}物理组`,
      category,
      members: memberIds,
      properties: {
        isAssembly: false,
        isSystem: false,
        materialTakeoff: true,
        phase: 'new',
        workset: 'default',
        ...properties
      },
      bounds: new Box3(),
      centroid: new Vector3(),
      quantities: {
        totalVolume: 0,
        totalArea: 0,
        totalLength: 0,
        totalWeight: 0,
        elementCount: memberIds.length
      },
      status: {
        visible: true,
        locked: false,
        isolated: false
      },
      timestamps: {
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    };

    // 计算组属性
    this.calculateGroupProperties(group);
    
    this.groups.set(group.id, group);
    this.emit('groupCreated', group);
    
    return group;
  }

  /**
   * 更新物理组
   */
  updateGroup(groupId: string, updates: Partial<BIMPhysicalGroup>): boolean {
    const group = this.groups.get(groupId);
    if (!group) return false;

    const updatedGroup = { ...group, ...updates };
    updatedGroup.timestamps.modified = new Date().toISOString();
    
    // 重新计算组属性
    this.calculateGroupProperties(updatedGroup);
    
    this.groups.set(groupId, updatedGroup);
    this.emit('groupUpdated', updatedGroup);
    
    return true;
  }

  /**
   * 删除物理组
   */
  deleteGroup(groupId: string): boolean {
    const group = this.groups.get(groupId);
    if (!group) return false;

    this.groups.delete(groupId);
    this.emit('groupDeleted', group);
    
    return true;
  }

  /**
   * 向组中添加构件
   */
  addToGroup(groupId: string, elementIds: string[]): boolean {
    const group = this.groups.get(groupId);
    if (!group) return false;

    // 添加新成员（去重）
    const newMembers = [...new Set([...group.members, ...elementIds])];
    
    return this.updateGroup(groupId, { members: newMembers });
  }

  /**
   * 从组中移除构件
   */
  removeFromGroup(groupId: string, elementIds: string[]): boolean {
    const group = this.groups.get(groupId);
    if (!group) return false;

    const newMembers = group.members.filter(id => !elementIds.includes(id));
    
    return this.updateGroup(groupId, { members: newMembers });
  }

  // ==================== 工程量计算 ====================

  /**
   * 计算构件工程量
   */
  calculateQuantities(elementId: string): Record<string, number> {
    const element = this.elements.get(elementId);
    if (!element) return {};

    const quantities: Record<string, number> = {};
    
    // 基本几何量
    if (element.properties.volume) {
      quantities['体积'] = element.properties.volume;
    }
    if (element.properties.area) {
      quantities['面积'] = element.properties.area;
    }
    if (element.properties.length) {
      quantities['长度'] = element.properties.length;
    }

    // 材料量
    if (element.properties.volume && element.properties.density) {
      quantities['重量'] = element.properties.volume * element.properties.density;
    }

    // 特定构件量
    switch (element.type) {
      case 'DiaphragmWall':
        if (element.properties.length && element.properties.thickness) {
          quantities['地连墙面积'] = element.properties.length * (element.properties.height || 20);
          quantities['混凝土体积'] = quantities['地连墙面积'] * element.properties.thickness;
        }
        break;
        
      case 'BoredPile':
        if (element.properties.diameter && element.properties.length) {
          const radius = element.properties.diameter / 2;
          quantities['桩体积'] = Math.PI * radius * radius * element.properties.length;
        }
        break;
        
      case 'AnchorBolt':
      case 'AnchorCable':
        quantities['锚杆长度'] = element.properties.length || 0;
        quantities['锚杆数量'] = 1;
        break;
    }

    return quantities;
  }

  /**
   * 计算组工程量
   */
  calculateGroupQuantities(groupId: string): Record<string, number> {
    const group = this.groups.get(groupId);
    if (!group) return {};

    const totalQuantities: Record<string, number> = {};
    
    group.members.forEach(memberId => {
      const quantities = this.calculateQuantities(memberId);
      
      Object.entries(quantities).forEach(([key, value]) => {
        totalQuantities[key] = (totalQuantities[key] || 0) + value;
      });
    });

    return totalQuantities;
  }

  // ==================== 冲突检测 ====================

  /**
   * 检测构件冲突
   */
  detectConflicts(elementId: string): string[] {
    const element = this.elements.get(elementId);
    if (!element) return [];

    const conflicts: string[] = [];
    const elementBounds = element.geometry.bounds;

    // 检查与其他构件的空间冲突
    this.elements.forEach((otherElement, otherId) => {
      if (otherId === elementId) return;
      
      // 检查包围盒相交
      if (elementBounds.intersectsBox(otherElement.geometry.bounds)) {
        // 进一步检查几何冲突
        if (this.checkGeometryIntersection(element, otherElement)) {
          conflicts.push(otherId);
        }
      }
    });

    return conflicts;
  }

  /**
   * 检查几何相交
   */
  private checkGeometryIntersection(element1: BIMElement, element2: BIMElement): boolean {
    // 简化的相交检测（实际应用中需要更复杂的算法）
    const bounds1 = element1.geometry.bounds;
    const bounds2 = element2.geometry.bounds;
    
    // 计算重叠体积
    const intersection = bounds1.clone().intersect(bounds2);
    const volume = intersection.getSize(new Vector3()).x * 
                  intersection.getSize(new Vector3()).y * 
                  intersection.getSize(new Vector3()).z;
    
    // 如果重叠体积大于阈值，认为存在冲突
    return volume > 0.01; // 1cm³
  }

  // ==================== 私有方法 ====================

  private validateElement(element: BIMElement): boolean {
    return !!(element.id && element.name && element.type && element.category);
  }

  private calculateGeometryProperties(element: BIMElement): void {
    // 计算包围盒
    if (element.geometry.vertices.length > 0) {
      const bounds = new Box3();
      element.geometry.vertices.forEach(vertex => {
        bounds.expandByPoint(new Vector3(vertex[0], vertex[1], vertex[2]));
      });
      element.geometry.bounds = bounds;
      
      // 计算基本几何属性
      const size = bounds.getSize(new Vector3());
      element.properties.length = size.x;
      element.properties.width = size.y;
      element.properties.height = size.z;
      element.properties.volume = size.x * size.y * size.z;
    }
  }

  private assignMaterial(element: BIMElement): void {
    if (element.material.category && element.material.name) {
      const materialData = getBIMMaterial(element.material.category, element.material.name);
      element.material.properties = materialData;
    }
  }

  private calculateGroupProperties(group: BIMPhysicalGroup): void {
    let totalVolume = 0;
    let totalArea = 0;
    let totalLength = 0;
    let totalWeight = 0;
    const bounds = new Box3();
    
    group.members.forEach(memberId => {
      const element = this.elements.get(memberId);
      if (element) {
        totalVolume += element.properties.volume || 0;
        totalArea += element.properties.area || 0;
        totalLength += element.properties.length || 0;
        
        if (element.properties.volume && element.properties.density) {
          totalWeight += element.properties.volume * element.properties.density;
        }
        
        bounds.union(element.geometry.bounds);
      }
    });
    
    group.quantities = {
      totalVolume,
      totalArea,
      totalLength,
      totalWeight,
      elementCount: group.members.length
    };
    
    group.bounds = bounds;
    group.centroid = bounds.getCenter(new Vector3());
  }

  private cleanupRelationships(elementId: string): void {
    this.elements.forEach(element => {
      // 清理父子关系
      element.relationships.children = element.relationships.children.filter(id => id !== elementId);
      if (element.relationships.parent === elementId) {
        element.relationships.parent = undefined;
      }
      
      // 清理依赖关系
      element.relationships.dependencies = element.relationships.dependencies.filter(id => id !== elementId);
      element.relationships.conflicts = element.relationships.conflicts.filter(id => id !== elementId);
    });
  }

  private initializeDefaultWorksets(): void {
    this.worksets.set('岩土工程', []);
    this.worksets.set('结构工程', []);
    this.worksets.set('隧道工程', []);
    this.worksets.set('支护工程', []);
    this.worksets.set('监测工程', []);
  }

  private initializeDefaultPhases(): void {
    this.phases.set('现状', []);
    this.phases.set('基坑开挖', []);
    this.phases.set('结构施工', []);
    this.phases.set('回填完成', []);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // ==================== 公共接口 ====================

  /**
   * 添加事件监听器
   */
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * 获取所有构件
   */
  getAllElements(): BIMElement[] {
    return Array.from(this.elements.values());
  }

  /**
   * 获取所有物理组
   */
  getAllGroups(): BIMPhysicalGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    const elementsByType: Record<string, number> = {};
    const elementsByCategory: Record<string, number> = {};
    
    this.elements.forEach(element => {
      elementsByType[element.type] = (elementsByType[element.type] || 0) + 1;
      elementsByCategory[element.category] = (elementsByCategory[element.category] || 0) + 1;
    });
    
    return {
      totalElements: this.elements.size,
      totalGroups: this.groups.size,
      elementsByType,
      elementsByCategory,
      worksets: Array.from(this.worksets.keys()),
      phases: Array.from(this.phases.keys())
    };
  }

  /**
   * 导出BIM数据
   */
  exportBIMData(): string {
    const data = {
      elements: Array.from(this.elements.values()),
      groups: Array.from(this.groups.values()),
      worksets: Object.fromEntries(this.worksets),
      phases: Object.fromEntries(this.phases),
      timestamp: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * 导入BIM数据
   */
  importBIMData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      // 清空现有数据
      this.elements.clear();
      this.groups.clear();
      
      // 导入构件
      data.elements?.forEach((element: BIMElement) => {
        this.elements.set(element.id, element);
      });
      
      // 导入物理组
      data.groups?.forEach((group: BIMPhysicalGroup) => {
        this.groups.set(group.id, group);
      });
      
      // 导入工作集和阶段
      if (data.worksets) {
        this.worksets = new Map(Object.entries(data.worksets));
      }
      if (data.phases) {
        this.phases = new Map(Object.entries(data.phases));
      }
      
      this.emit('dataImported', data);
      return true;
    } catch (error) {
      console.error('导入BIM数据失败:', error);
      return false;
    }
  }
}

// 全局BIM数据管理器实例
export const bimDataManager = new BIMDataManager();

// 导出类型和实例
export default BIMDataManager; 