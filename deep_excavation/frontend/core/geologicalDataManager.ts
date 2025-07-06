/**
 * 地质体数据持久化管理系统
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import { Vector3, Color } from 'three';

// 地质体数据接口
export interface GeologicalLayer {
  id: string;
  name: string;
  type: 'time' | 'lithology' | 'shanghai';
  soilType: string;
  depth: {
    top: number;
    bottom: number;
  };
  thickness: number;
  color: string;
  opacity: number;
  materialType: 'standard' | 'physical' | 'toon';
  properties: {
    density?: number;
    porosity?: number;
    permeability?: number;
    cohesion?: number;
    frictionAngle?: number;
    youngModulus?: number;
    poissonRatio?: number;
    [key: string]: any;
  };
  geometry: {
    vertices: number[][];
    faces: number[][];
    bounds: {
      min: Vector3;
      max: Vector3;
    };
  };
  visible: boolean;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

// 地质模型数据
export interface GeologicalModel {
  id: string;
  name: string;
  description: string;
  layers: GeologicalLayer[];
  metadata: {
    location: {
      name: string;
      coordinates: [number, number]; // [经度, 纬度]
    };
    scale: number;
    units: string;
    coordinateSystem: string;
    author: string;
    version: string;
  };
  settings: {
    visualization: {
      preset: 'realistic' | 'scientific' | 'artistic' | 'analysis';
      enableShadows: boolean;
      enableFog: boolean;
      ambientLight: number;
      directionalLight: number;
    };
    rendering: {
      quality: 'low' | 'medium' | 'high' | 'ultra';
      lodEnabled: boolean;
      chunkSize: number;
    };
  };
  createdAt: string;
  updatedAt: string;
}

// 存储键名
const STORAGE_KEYS = {
  MODELS: 'geological_models',
  CURRENT_MODEL: 'current_geological_model',
  SETTINGS: 'geological_settings',
  BACKUP: 'geological_backup'
};

class GeologicalDataManager {
  private currentModel: GeologicalModel | null = null;
  private models: Map<string, GeologicalModel> = new Map();
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.loadFromStorage();
    this.startAutoSave();
    
    // 监听页面关闭事件，确保数据保存
    window.addEventListener('beforeunload', () => {
      this.saveToStorage();
    });
  }

  /**
   * 创建新的地质模型
   */
  createModel(name: string, description: string = ''): GeologicalModel {
    const model: GeologicalModel = {
      id: this.generateId(),
      name,
      description,
      layers: [],
      metadata: {
        location: {
          name: '上海',
          coordinates: [121.4737, 31.2304]
        },
        scale: 1.0,
        units: 'meters',
        coordinateSystem: 'WGS84',
        author: 'Deep Excavation User',
        version: '1.0.0'
      },
      settings: {
        visualization: {
          preset: 'scientific',
          enableShadows: true,
          enableFog: false,
          ambientLight: 0.4,
          directionalLight: 0.8
        },
        rendering: {
          quality: 'medium',
          lodEnabled: true,
          chunkSize: 1000
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.models.set(model.id, model);
    this.currentModel = model;
    this.saveToStorage();
    this.emit('modelCreated', model);
    
    return model;
  }

  /**
   * 加载地质模型
   */
  loadModel(modelId: string): GeologicalModel | null {
    const model = this.models.get(modelId);
    if (model) {
      this.currentModel = model;
      this.saveCurrentModel();
      this.emit('modelLoaded', model);
      return model;
    }
    return null;
  }

  /**
   * 删除地质模型
   */
  deleteModel(modelId: string): boolean {
    if (this.models.has(modelId)) {
      this.models.delete(modelId);
      
      // 如果删除的是当前模型，清空当前模型
      if (this.currentModel?.id === modelId) {
        this.currentModel = null;
      }
      
      this.saveToStorage();
      this.emit('modelDeleted', modelId);
      return true;
    }
    return false;
  }

  /**
   * 获取当前模型
   */
  getCurrentModel(): GeologicalModel | null {
    return this.currentModel;
  }

  /**
   * 获取所有模型
   */
  getAllModels(): GeologicalModel[] {
    return Array.from(this.models.values());
  }

  /**
   * 添加地质层
   */
  addLayer(layer: Omit<GeologicalLayer, 'id' | 'createdAt' | 'updatedAt'>): GeologicalLayer | null {
    if (!this.currentModel) return null;

    const newLayer: GeologicalLayer = {
      ...layer,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.currentModel.layers.push(newLayer);
    this.currentModel.updatedAt = new Date().toISOString();
    this.saveToStorage();
    this.emit('layerAdded', newLayer);
    
    return newLayer;
  }

  /**
   * 更新地质层
   */
  updateLayer(layerId: string, updates: Partial<GeologicalLayer>): boolean {
    if (!this.currentModel) return false;

    const layerIndex = this.currentModel.layers.findIndex(l => l.id === layerId);
    if (layerIndex === -1) return false;

    this.currentModel.layers[layerIndex] = {
      ...this.currentModel.layers[layerIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.currentModel.updatedAt = new Date().toISOString();
    this.saveToStorage();
    this.emit('layerUpdated', this.currentModel.layers[layerIndex]);
    
    return true;
  }

  /**
   * 删除地质层
   */
  deleteLayer(layerId: string): boolean {
    if (!this.currentModel) return false;

    const layerIndex = this.currentModel.layers.findIndex(l => l.id === layerId);
    if (layerIndex === -1) return false;

    const deletedLayer = this.currentModel.layers.splice(layerIndex, 1)[0];
    this.currentModel.updatedAt = new Date().toISOString();
    this.saveToStorage();
    this.emit('layerDeleted', deletedLayer);
    
    return true;
  }

  /**
   * 获取地质层
   */
  getLayer(layerId: string): GeologicalLayer | null {
    if (!this.currentModel) return null;
    return this.currentModel.layers.find(l => l.id === layerId) || null;
  }

  /**
   * 获取所有地质层
   */
  getAllLayers(): GeologicalLayer[] {
    return this.currentModel?.layers || [];
  }

  /**
   * 切换地质层可见性
   */
  toggleLayerVisibility(layerId: string): boolean {
    if (!this.currentModel) return false;

    const layer = this.currentModel.layers.find(l => l.id === layerId);
    if (!layer) return false;

    layer.visible = !layer.visible;
    layer.updatedAt = new Date().toISOString();
    this.currentModel.updatedAt = new Date().toISOString();
    this.saveToStorage();
    this.emit('layerVisibilityChanged', layer);
    
    return true;
  }

  /**
   * 导出地质模型
   */
  exportModel(modelId?: string): string {
    const model = modelId ? this.models.get(modelId) : this.currentModel;
    if (!model) throw new Error('模型不存在');

    return JSON.stringify(model, null, 2);
  }

  /**
   * 导入地质模型
   */
  importModel(jsonData: string): GeologicalModel {
    try {
      const model: GeologicalModel = JSON.parse(jsonData);
      
      // 验证数据格式
      if (!model.id || !model.name || !Array.isArray(model.layers)) {
        throw new Error('无效的模型数据格式');
      }

      // 生成新的ID避免冲突
      model.id = this.generateId();
      model.updatedAt = new Date().toISOString();
      
      this.models.set(model.id, model);
      this.currentModel = model;
      this.saveToStorage();
      this.emit('modelImported', model);
      
      return model;
    } catch (error) {
      throw new Error(`导入模型失败: ${error.message}`);
    }
  }

  /**
   * 创建备份
   */
  createBackup(): string {
    const backup = {
      timestamp: new Date().toISOString(),
      models: Array.from(this.models.values()),
      currentModelId: this.currentModel?.id || null
    };
    
    const backupData = JSON.stringify(backup);
    localStorage.setItem(STORAGE_KEYS.BACKUP, backupData);
    
    return backupData;
  }

  /**
   * 恢复备份
   */
  restoreBackup(backupData: string): boolean {
    try {
      const backup = JSON.parse(backupData);
      
      // 清空当前数据
      this.models.clear();
      this.currentModel = null;
      
      // 恢复模型数据
      backup.models.forEach((model: GeologicalModel) => {
        this.models.set(model.id, model);
      });
      
      // 恢复当前模型
      if (backup.currentModelId) {
        this.currentModel = this.models.get(backup.currentModelId) || null;
      }
      
      this.saveToStorage();
      this.emit('backupRestored', backup);
      
      return true;
    } catch (error) {
      console.error('恢复备份失败:', error);
      return false;
    }
  }

  /**
   * 清空所有数据
   */
  clearAllData(): void {
    this.models.clear();
    this.currentModel = null;
    this.clearStorage();
    this.emit('dataCleared');
  }

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
   * 移除事件监听器
   */
  removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 获取存储统计信息
   */
  getStorageStats(): {
    totalModels: number;
    totalLayers: number;
    storageSize: number;
    lastSaved: string;
  } {
    const totalLayers = Array.from(this.models.values())
      .reduce((sum, model) => sum + model.layers.length, 0);
    
    const storageData = localStorage.getItem(STORAGE_KEYS.MODELS);
    const storageSize = storageData ? new Blob([storageData]).size : 0;
    
    return {
      totalModels: this.models.size,
      totalLayers,
      storageSize,
      lastSaved: this.currentModel?.updatedAt || 'Never'
    };
  }

  // 私有方法
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  private saveToStorage(): void {
    try {
      const modelsData = Array.from(this.models.values());
      localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(modelsData));
      this.saveCurrentModel();
    } catch (error) {
      console.error('保存数据到本地存储失败:', error);
    }
  }

  private saveCurrentModel(): void {
    if (this.currentModel) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_MODEL, this.currentModel.id);
    }
  }

  private loadFromStorage(): void {
    try {
      // 加载模型数据
      const modelsData = localStorage.getItem(STORAGE_KEYS.MODELS);
      if (modelsData) {
        const models: GeologicalModel[] = JSON.parse(modelsData);
        models.forEach(model => {
          this.models.set(model.id, model);
        });
      }

      // 加载当前模型
      const currentModelId = localStorage.getItem(STORAGE_KEYS.CURRENT_MODEL);
      if (currentModelId && this.models.has(currentModelId)) {
        this.currentModel = this.models.get(currentModelId)!;
      }
    } catch (error) {
      console.error('从本地存储加载数据失败:', error);
    }
  }

  private clearStorage(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  private startAutoSave(): void {
    // 每30秒自动保存一次
    this.autoSaveInterval = setInterval(() => {
      this.saveToStorage();
    }, 30000);
  }

  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // 清理资源
  destroy(): void {
    this.stopAutoSave();
    this.saveToStorage();
    this.eventListeners.clear();
  }
}

// 全局实例
export const geologicalDataManager = new GeologicalDataManager();

// 导出类型和实例
export default GeologicalDataManager; 