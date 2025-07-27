# DeepCAD TypeScript类型定义标准

> **0号架构师** - 统一TypeScript类型定义标准，确保专家间协作接口一致性

## 🎯 核心原则

### 1. 接口命名规范
```typescript
// ✅ 正确：使用PascalCase，语义清晰
export interface GeometryModel { }
export interface MeshQualityMetrics { }

// ❌ 错误：驼峰不一致，语义模糊
export interface geometryModel { }
export interface meshQuality { }
```

### 2. 枚举定义标准
```typescript
// ✅ 正确：SCREAMING_SNAKE_CASE
export enum PileType {
  BORED_CAST_IN_PLACE = 'BORED_CAST_IN_PLACE',
  HIGH_PRESSURE_JET = 'HIGH_PRESSURE_JET'
}

// ❌ 错误：不一致的命名
export enum pileType {
  boredCastInPlace = 'bored_cast_in_place'
}
```

### 3. 联合类型使用
```typescript
// ✅ 正确：字符串字面量类型
type Priority = 'low' | 'medium' | 'high';
type Status = 'pending' | 'in_progress' | 'completed' | 'failed';

// ❌ 错误：魔法字符串
type Priority = string;
```

## 📋 专家协作接口标准

### Point3D - 三维坐标点
```typescript
export interface Point3D {
  x: number;
  y: number;
  z: number;
}
```
**使用场景：** 所有涉及3D坐标的接口
**导入位置：** `../types/ExpertCollaboration`

### BoundingBox - 边界框
```typescript
export interface BoundingBox {
  min: Point3D;
  max: Point3D;
}
```
**使用场景：** 几何体边界、区域定义
**导入位置：** `../types/ExpertCollaboration`

### 质量评估接口
```typescript
export interface DetailedQualityMetrics {
  connectivity: number;     // 0-1
  aspectRatio: number;      // 0-1
  skewness: number;         // 0-1
  orthogonality: number;    // 0-1
}
```

### 问题区域定义
```typescript
export interface ProblemArea {
  id: string;
  type: 'geometry' | 'mesh' | 'computation' | 'visualization';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: BoundingBox;
  affectedElements?: number[];
}
```

## 🔧 服务接口标准

### 1. 服务类命名
```typescript
// ✅ 正确：Service后缀，PascalCase
export class GeometryArchitectureService { }
export class GeometryToMeshService { }

// ❌ 错误：不一致的命名
export class geometryService { }
export class MeshConverter { }
```

### 2. 方法返回类型
```typescript
// ✅ 正确：明确的返回类型
public async processGeometry(model: GeometryModel): Promise<MeshData> { }
public getStatistics(): ServiceStatistics { }

// ❌ 错误：隐式any类型
public async processGeometry(model) { }
```

### 3. 配置接口
```typescript
// ✅ 正确：Config后缀，可选属性标明
export interface GeometryToMeshConfig {
  meshQuality: MeshQualityConfig;
  materialMapping: boolean;
  boundaryDetection: boolean;
  optimizationLevel?: 'fast' | 'balanced' | 'quality';
}
```

## 🚀 专家分工类型标准

### 1号专家 - UI组件类型
```typescript
// Props接口必须以Props结尾
export interface DashboardComponentProps {
  isVisible: boolean;
  onClose: () => void;
  onUpdate?: (data: any) => void;
}

// 状态接口使用State后缀
export interface ComponentState {
  loading: boolean;
  error: string | null;
  data: any[];
}
```

### 2号专家 - 几何类型
```typescript
// 几何体接口必须包含基本属性
export interface GeometryModel {
  id: string;
  type: 'geology' | 'excavation' | 'support' | 'combined';
  vertices: Float32Array;
  faces: Uint32Array;
  metadata: ModelMetadata;
}

// 材料属性标准化
export interface MaterialInfo {
  id: number;
  name: string;
  properties: Record<string, number | string>;
}
```

### 3号专家 - 计算类型
```typescript
// 分析结果接口标准
export interface AnalysisResult {
  id: string;
  type: 'static' | 'dynamic' | 'thermal';
  status: 'completed' | 'failed' | 'in_progress';
  results: Record<string, number>;
  metadata: {
    timestamp: number;
    duration: number;
    expert: '3号';
  };
}

// 网格质量标准
export interface MeshQualityMetrics {
  averageQuality: number;    // 0-1
  minimumQuality: number;    // 0-1
  maximumQuality: number;    // 0-1
  elementCount: number;
  nodeCount: number;
}
```

## ⚡ 性能优化类型

### 1. 大数据类型优化
```typescript
// ✅ 正确：使用TypedArray
export interface MeshData {
  vertices: Float32Array;    // 而不是number[]
  faces: Uint32Array;        // 而不是number[]
  materials: Uint8Array;     // 而不是number[]
}
```

### 2. 可选属性合理使用
```typescript
// ✅ 正确：根据业务逻辑合理设置可选
export interface GeometryAdjustment {
  id: string;                // 必需
  type: AdjustmentType;      // 必需
  geometryId?: string;       // 可选：可能是全局调整
  priority: Priority;        // 必需
}
```

## 🛡️ 类型安全检查

### 1. 严格模式配置
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### 2. 类型守卫使用
```typescript
// ✅ 正确：使用类型守卫
function isGeometryModel(obj: any): obj is GeometryModel {
  return obj && typeof obj.id === 'string' && obj.vertices instanceof Float32Array;
}

// 使用示例
if (isGeometryModel(data)) {
  // TypeScript知道data是GeometryModel类型
  console.log(data.vertices.length);
}
```

## 📦 导入/导出标准

### 1. 统一导出位置
```typescript
// services/index.ts - 统一服务导出
export { geometryArchitecture } from './GeometryArchitectureService';
export { geometryToMeshService } from './geometryToMeshService';

// types/index.ts - 统一类型导出
export type { Point3D, BoundingBox } from './ExpertCollaboration';
```

### 2. 导入最佳实践
```typescript
// ✅ 正确：具名导入，明确来源
import { GeometryModel, MeshQualityFeedback } from '../services';
import type { Point3D, BoundingBox } from '../types/ExpertCollaboration';

// ❌ 错误：全部导入，增加包大小
import * as Services from '../services';
```

## 🔍 验证清单

- [ ] 所有接口使用PascalCase命名
- [ ] 枚举使用SCREAMING_SNAKE_CASE  
- [ ] 服务类以Service结尾
- [ ] Props接口以Props结尾
- [ ] 使用TypedArray替代普通数组
- [ ] 合理使用可选属性
- [ ] 导入导出路径统一
- [ ] 类型守卫保证运行时安全
- [ ] 配置接口提供默认值
- [ ] 错误类型明确定义

---

**维护者：** 0号架构师  
**最后更新：** 2024-07-26  
**版本：** v1.0