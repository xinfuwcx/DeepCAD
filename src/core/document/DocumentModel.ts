/**
 * 文档-对象模型
 * 
 * 参考FreeCAD的文档-对象模型设计，实现参数化对象系统
 */

import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';

// 基本属性接口
export interface Property<T = any> {
  name: string;
  value: T;
  type: string;
  description?: string;
  min?: number;
  max?: number;
  options?: any[];
  readOnly?: boolean;
  visible?: boolean;
  onChange?: (value: T) => void;
}

// 对象依赖关系
export interface Dependency {
  objectId: string;
  relation: 'parent' | 'child' | 'reference';
}

// 基本对象接口
export interface DocumentObject {
  id: string;
  name: string;
  type: string;
  properties: Property[];
  dependencies: Dependency[];
  visible: boolean;
  selectable: boolean;
  selected: boolean;
  geometryId?: string; // 关联的几何ID (chili3d)
}

// 文档接口
export interface Document {
  id: string;
  name: string;
  objects: DocumentObject[];
  activeObject?: string;
  modified: boolean;
  version: string;
  created: Date;
  lastModified: Date;
}

// 文档状态接口
interface DocumentState {
  documents: Document[];
  activeDocument: string | null;
  
  // 创建新文档
  createDocument: (name: string) => Document;
  
  // 激活文档
  activateDocument: (id: string) => void;
  
  // 获取当前激活的文档
  getActiveDocument: () => Document | null;
  
  // 添加对象到文档
  addObject: (documentId: string, objectType: string, name: string, properties?: Property[]) => DocumentObject;
  
  // 更新对象属性
  updateObjectProperty: (documentId: string, objectId: string, propertyName: string, value: any) => void;
  
  // 删除对象
  removeObject: (documentId: string, objectId: string) => void;
  
  // 选择对象
  selectObject: (documentId: string, objectId: string, multiSelect?: boolean) => void;
  
  // 取消选择所有对象
  clearSelection: (documentId: string) => void;
}

// 创建文档状态管理
export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  activeDocument: null,
  
  createDocument: (name: string) => {
    const newDocument: Document = {
      id: uuidv4(),
      name,
      objects: [],
      modified: false,
      version: '1.0',
      created: new Date(),
      lastModified: new Date()
    };
    
    set(state => ({
      documents: [...state.documents, newDocument],
      activeDocument: newDocument.id
    }));
    
    return newDocument;
  },
  
  activateDocument: (id: string) => {
    set({ activeDocument: id });
  },
  
  getActiveDocument: () => {
    const { documents, activeDocument } = get();
    return documents.find(doc => doc.id === activeDocument) || null;
  },
  
  addObject: (documentId: string, objectType: string, name: string, properties: Property[] = []) => {
    const newObject: DocumentObject = {
      id: uuidv4(),
      name,
      type: objectType,
      properties,
      dependencies: [],
      visible: true,
      selectable: true,
      selected: false
    };
    
    set(state => ({
      documents: state.documents.map(doc => {
        if (doc.id === documentId) {
          return {
            ...doc,
            objects: [...doc.objects, newObject],
            modified: true,
            lastModified: new Date()
          };
        }
        return doc;
      })
    }));
    
    return newObject;
  },
  
  updateObjectProperty: (documentId: string, objectId: string, propertyName: string, value: any) => {
    set(state => ({
      documents: state.documents.map(doc => {
        if (doc.id === documentId) {
          return {
            ...doc,
            objects: doc.objects.map(obj => {
              if (obj.id === objectId) {
                return {
                  ...obj,
                  properties: obj.properties.map(prop => {
                    if (prop.name === propertyName) {
                      // 调用属性的onChange回调（如果存在）
                      if (prop.onChange) {
                        prop.onChange(value);
                      }
                      return { ...prop, value };
                    }
                    return prop;
                  })
                };
              }
              return obj;
            }),
            modified: true,
            lastModified: new Date()
          };
        }
        return doc;
      })
    }));
  },
  
  removeObject: (documentId: string, objectId: string) => {
    set(state => ({
      documents: state.documents.map(doc => {
        if (doc.id === documentId) {
          return {
            ...doc,
            objects: doc.objects.filter(obj => obj.id !== objectId),
            modified: true,
            lastModified: new Date()
          };
        }
        return doc;
      })
    }));
  },
  
  selectObject: (documentId: string, objectId: string, multiSelect = false) => {
    set(state => ({
      documents: state.documents.map(doc => {
        if (doc.id === documentId) {
          return {
            ...doc,
            objects: doc.objects.map(obj => ({
              ...obj,
              selected: obj.id === objectId ? true : (multiSelect ? obj.selected : false)
            })),
            activeObject: objectId
          };
        }
        return doc;
      })
    }));
  },
  
  clearSelection: (documentId: string) => {
    set(state => ({
      documents: state.documents.map(doc => {
        if (doc.id === documentId) {
          return {
            ...doc,
            objects: doc.objects.map(obj => ({
              ...obj,
              selected: false
            })),
            activeObject: undefined
          };
        }
        return doc;
      })
    }));
  }
})); 