# DeepCAD 代码注释规范

## 总体要求

### 1. 语言统一
- **所有注释必须使用中文**
- 专业术语可保留英文，但需附中文说明
- 避免中英文混用

### 2. 格式规范
- **必须采用标准JSDoc格式**
- 使用 `/** */` 进行多行注释
- 使用 `//` 进行单行注释

## 注释标准模板

### 文件头注释
```typescript
/**
 * DeepCAD [模块名称]
 * @description [详细描述模块功能和用途]
 * @author [开发者]
 * @version [版本号]
 * @since [创建日期]
 */
```

### 接口注释
```typescript
/**
 * [接口功能描述]
 * @interface [接口名称]
 * @description [详细功能说明]
 */
interface ExampleInterface {
  /** [字段描述] (单位/格式) */
  fieldName: string;
  /** [可选字段描述] */
  optionalField?: number;
}
```

### 函数/方法注释
```typescript
/**
 * [函数功能描述]
 * @description [详细功能说明]
 * @param paramName - [参数描述]
 * @param optionalParam - [可选参数描述]
 * @returns [返回值描述]
 * @throws {ErrorType} [错误条件描述]
 * @example
 * ```typescript
 * // 使用示例
 * const result = functionName(param1, param2);
 * ```
 */
function functionName(paramName: string, optionalParam?: number): ReturnType {
  // 函数实现
}
```

### 组件注释
```typescript
/**
 * [组件功能描述]
 * @description [详细功能说明]
 * @param props - 组件属性参数
 * @returns JSX.Element - [组件返回说明]
 */
const ComponentName: React.FC<ComponentProps> = (props) => {
  // 组件实现
};
```

### 类注释
```typescript
/**
 * [类功能描述]
 * @class [类名]
 * @description [详细功能说明]
 */
export class ExampleClass {
  /** [属性描述] */
  private property: string;

  /**
   * 构造函数
   * @param param - [参数描述]
   */
  constructor(param: string) {
    this.property = param;
  }

  /**
   * [方法功能描述]
   * @param param - [参数描述]
   * @returns [返回值描述]
   */
  public method(param: string): string {
    return this.property + param;
  }
}
```

## 特殊注释要求

### 1. 数值单位标注
```typescript
interface GeometryParams {
  /** 基坑深度 (米) */
  depth: number;
  /** 开挖角度 (度) */
  angle: number;
  /** 土体密度 (kg/m³) */
  density: number;
}
```

### 2. 专业术语解释
```typescript
/**
 * 深基坑土-结构耦合分析参数
 * @interface SoilStructureParams
 */
interface SoilStructureParams {
  /** 内摩擦角 - 土体抗剪强度参数 (度) */
  frictionAngle: number;
  /** 粘聚力 - 土体粘性强度 (kPa) */
  cohesion: number;
  /** 泊松比 - 材料横向变形系数 */
  poissonRatio: number;
}
```

### 3. 算法步骤说明
```typescript
/**
 * 执行深基坑稳定性分析
 * @description 采用极限平衡法进行基坑整体稳定性分析
 * 分析步骤：
 * 1. 计算滑动面上的总驱动力矩
 * 2. 计算滑动面上的总抗滑力矩  
 * 3. 计算安全系数 = 抗滑力矩 / 驱动力矩
 * 4. 判断稳定性（安全系数 > 1.35为稳定）
 */
function performStabilityAnalysis(params: StabilityParams): StabilityResult {
  // 步骤1: 计算驱动力矩
  const drivingMoment = calculateDrivingMoment(params);
  
  // 步骤2: 计算抗滑力矩
  const resistingMoment = calculateResistingMoment(params);
  
  // 步骤3: 计算安全系数
  const safetyFactor = resistingMoment / drivingMoment;
  
  // 步骤4: 稳定性判断
  const isStable = safetyFactor > 1.35;
  
  return { safetyFactor, isStable };
}
```

### 4. 常量定义注释
```typescript
// CAE分析配置常量
/** 默认网格密度 - 单元/米² */
const DEFAULT_MESH_DENSITY = 100;
/** 收敛精度 - 残差容限 */
const CONVERGENCE_TOLERANCE = 1e-6;
/** 最大迭代次数 */
const MAX_ITERATIONS = 1000;
```

## 注释质量检查清单

### ✅ 必须包含的内容
- [ ] 文件头有完整的模块说明
- [ ] 所有公共接口有JSDoc注释
- [ ] 所有公共函数有参数和返回值说明
- [ ] 复杂算法有步骤说明
- [ ] 数值参数有单位标注
- [ ] 专业术语有中文解释

### ❌ 禁止的做法
- [ ] 中英文混用
- [ ] 无意义的注释（如 `// 设置变量`）
- [ ] 过时的注释内容
- [ ] 拼写错误
- [ ] 格式不规范

## 工具配置

### ESLint 规则
```json
{
  "rules": {
    "jsdoc/require-jsdoc": ["error", {
      "require": {
        "FunctionDeclaration": true,
        "MethodDefinition": true,
        "ClassDeclaration": true,
        "ArrowFunctionExpression": true
      }
    }],
    "jsdoc/require-description": "error",
    "jsdoc/require-param-description": "error",
    "jsdoc/require-returns-description": "error"
  }
}
```

### VS Code 设置
```json
{
  "jsdoc.generateReturns": true,
  "jsdoc.generateDescription": true,
  "jsdoc.language": "zh-CN"
}
```

## 实施计划

### 第一阶段（高优先级）
1. ✅ CAE3DViewport.tsx - 已完成接口和主要函数注释
2. ✅ ExcavationCanvas2D.tsx - 已完成基础注释改进
3. ⏳ FuturisticDashboard.tsx - 待改进
4. ⏳ helpers.ts - 待改进

### 第二阶段（中等优先级）
1. services/computationService.ts
2. services/meshingService.ts
3. utils/geometryValidation.ts
4. types/index.ts

### 第三阶段（持续改进）
1. 所有组件文件的注释统一
2. 测试文件的注释规范
3. 配置文件的注释完善

## 📊 最新进度报告

### 已完成的注释标准化 ✅

#### 第一阶段 - 高优先级文件 (100% 完成)
1. ✅ `CAE3DViewport.tsx` - 完整的中文JSDoc注释
2. ✅ `ExcavationCanvas2D.tsx` - 完整的中文JSDoc注释

#### 第二阶段 - 服务文件 (100% 完成)
1. ✅ `computationService.ts` - 计算服务完整注释
2. ✅ `meshingService.ts` - 网格服务完整注释
3. ✅ `geometryValidation.ts` - 几何验证工具完整注释

#### 第三阶段 - 类型定义 (部分完成)
1. ✅ `ComputationDataTypes.ts` - 计算数据类型完整注释
2. ⏳ `GeologyDataTypes.ts` - 待完成
3. ⏳ `dataFlow.ts` - 待完成

### 📈 整体完成统计

| 阶段 | 文件数 | 已完成 | 进度 |
|------|--------|--------|------|
| 高优先级组件 | 2 | 2 | 100% |
| 服务文件 | 3 | 3 | 100% |
| 类型定义 | 3 | 1 | 33% |
| **总计** | **8** | **6** | **75%** |

### 🎯 注释质量提升

**改进前后对比：**

**标准前：**
```typescript
// 网格生成服务
export interface MeshData {
  id: string;              // ID
  elements: MeshElement[]; // 单元数组
}
```

**标准后：**
```typescript
/**
 * 网格数据接口
 * @interface MeshData
 * @description 完整的有限元网格数据结构，包含网格拓扑、质量指标和元数据
 */
export interface MeshData {
  /** 网格唯一标识符 */
  id: string;
  /** 网格单元数组 */
  elements: MeshElement[];
}
```

### 📋 剩余任务

1. `GeologyDataTypes.ts` - 地质数据类型注释
2. `dataFlow.ts` - 数据流类型注释
3. 全项目注释质量检查

---

**最后更新**: 2025-01-25  
**状态**: 🚀 第三阶段进行中  
**完成度**: 75% (6/8 核心文件已完成)  
**下一步**: 完成剩余类型定义文件注释