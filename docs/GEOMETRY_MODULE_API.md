# 几何建模模块 API 文档

## 📋 **API概览**
- **模块**: 几何建模模块 (Geometry Module)
- **负责人**: 2号几何专家
- **版本**: v1.0
- **更新时间**: 2025-01-23

---

## 🔗 **核心API接口**

### **1. 地质建模API**
```typescript
// 地质建模请求
POST /api/geometry/geology/generate
{
  "boreholes": BoreholeData[],
  "interpolationMethod": "ordinary_kriging" | "rbf",
  "gridResolution": number,
  "domainExpansion": [number, number],
  "qualityControl": {
    "uncertaintyAnalysis": boolean,
    "crossValidation": boolean
  }
}

// 响应格式
{
  "success": boolean,
  "gltfUrl": string,
  "materialZones": MaterialZone[],
  "qualityMetrics": {
    "interpolationError": number,
    "validationScore": number
  },
  "meshGuidance": {
    "suggestedElementSize": number,
    "refinementZones": RefinementZone[]
  }
}
```

### **2. DXF导入API**
```typescript
// DXF文件处理
POST /api/geometry/dxf/import
FormData: {
  "file": File,
  "coordinateSystem": string,
  "boundaryTolerance": number
}

// 响应格式
{
  "success": boolean,
  "boundaries": {
    "mainContour": Point2D[],
    "holes": Point2D[][],
    "area": number,
    "perimeter": number
  },
  "layers": DXFLayer[],
  "quality": {
    "closedContours": number,
    "validationErrors": string[]
  }
}
```

### **3. 开挖几何API**
```typescript
// 开挖体生成
POST /api/geometry/excavation/generate
{
  "type": "rectangular" | "irregular",
  "parameters": {
    "depth": number,
    "stages": ExcavationStage[],
    "slopeRatio": number,
    "boundaryPoints"?: Point2D[]
  },
  "geologicalModel"?: string // GLTF URL
}

// 响应格式 - 标准几何数据给3号
{
  "success": boolean,
  "geometryId": string,
  "excavationVolume": number,
  "meshData": {
    "vertices": Float32Array,
    "faces": Uint32Array,
    "normals": Float32Array,
    "materials": MaterialMapping[]
  },
  "stageInfo": {
    "totalStages": number,
    "stageVolumes": number[]
  }
}
```

### **4. 支护结构API**
```typescript
// 锚杆系统生成 (10层支持)
POST /api/geometry/support/anchors
{
  "levels": number, // 1-10层
  "layoutStrategy": "uniform" | "adaptive",
  "globalConstraints": {
    "minSpacing": number,
    "wallClearance": number
  },
  "levelConfigs": AnchorLevelConfig[]
}

// 响应格式
{
  "success": boolean,
  "anchorSystem": {
    "totalAnchors": number,
    "anchors": AnchorGeometry[],
    "waleBeams": WaleBeamGeometry[],
    "statistics": {
      "totalLength": number,
      "averageSpacing": number
    }
  },
  "geometryData": {
    "anchorMeshData": MeshGeometryData,
    "waleBeamMeshData": MeshGeometryData
  }
}
```

---

## 📊 **给3号的几何数据输出格式**

### **标准几何数据格式**
```typescript
// 向3号网格模块输出的标准格式
interface GeometryToMeshData {
  header: {
    version: "1.0",
    timestamp: string,
    geometryType: "geology" | "excavation" | "support" | "tunnel",
    coordinateSystem: string,
    units: "meters"
  },
  
  // 几何网格数据
  meshGeometry: {
    vertices: Float32Array,      // [x1,y1,z1, x2,y2,z2, ...]
    faces: Uint32Array,          // [v1,v2,v3, v4,v5,v6, ...] 三角形面
    normals: Float32Array,       // [nx1,ny1,nz1, nx2,ny2,nz2, ...]
    uvCoords?: Float32Array,     // 纹理坐标(可选)
    vertexCount: number,
    faceCount: number
  },
  
  // 材料分区信息
  materialZones: [
    {
      zoneId: string,
      zoneName: string,          // "粘土层", "砂土层", "混凝土"
      materialType: "soil" | "concrete" | "steel",
      faceIndices: number[],     // 属于此材料的面索引
      properties: {
        density: number,         // kg/m³
        elasticModulus: number,  // Pa
        poissonRatio: number,
        // 土体特有属性
        cohesion?: number,       // Pa
        frictionAngle?: number,  // degree
        permeability?: number    // m/s
      }
    }
  ],
  
  // 边界条件建议
  boundaryConditions: {
    fixedBoundaries: {
      faceIndices: number[],
      constraintType: "fixed" | "pinned" | "roller"
    },
    loadBoundaries: {
      faceIndices: number[],
      loadType: "pressure" | "force" | "displacement",
      magnitude: number,
      direction: [number, number, number]
    }
  },
  
  // 网格尺寸建议
  meshGuidance: {
    globalElementSize: number,   // 全局单元尺寸 (m)
    localRefinement: [
      {
        region: "corner" | "contact" | "critical",
        faceIndices: number[],
        targetSize: number,       // 目标单元尺寸 (m)
        priority: "high" | "medium" | "low"
      }
    ],
    qualityRequirements: {
      minAngle: number,          // 最小角度要求 (degree)
      maxAspectRatio: number,    // 最大长宽比
      targetQuality: number      // 目标质量 0-1
    }
  },
  
  // 质量检查信息
  qualityInfo: {
    geometryValid: boolean,
    manifoldSurface: boolean,    // 流形面
    selfIntersection: boolean,   // 自相交检查
    precision: number,           // 几何精度 (mm)
    warnings: string[],
    recommendations: string[]
  }
}
```

### **数据文件输出**
```typescript
// 几何数据文件输出方式
interface GeometryDataOutput {
  // 主要输出格式
  primaryFormats: {
    json: "完整的JSON格式数据，包含所有信息",
    binary: "二进制格式，Float32Array和Uint32Array",
    gltf: "3D模型文件，用于可视化"
  },
  
  // 文件路径约定
  outputPaths: {
    geometryData: "/api/geometry/export/{geometryId}.json",
    meshData: "/api/geometry/export/{geometryId}_mesh.bin",
    visualModel: "/api/geometry/export/{geometryId}.gltf"
  },
  
  // 实时数据推送
  realTimeAPI: {
    websocket: "ws://localhost:8084/geometry-updates",
    eventTypes: [
      "geometry-ready",      // 几何生成完成
      "geometry-updated",    // 几何参数更新
      "validation-complete"  // 验证完成
    ]
  }
}
```

---

## 🔄 **希望接收的网格数据格式**

### **网格质量反馈**
```typescript
// 希望3号提供的网格质量反馈格式
interface MeshQualityFeedback {
  geometryId: string,
  timestamp: string,
  
  // 网格质量指标
  qualityMetrics: {
    elementCount: number,
    nodeCount: number,
    averageQuality: number,      // 0-1
    minAngle: number,           // degree
    maxAspectRatio: number,
    skewnessMax: number,
    warpage: number
  },
  
  // 问题区域
  problemAreas: [
    {
      issueType: "low_quality" | "high_aspect_ratio" | "skewed",
      severity: "warning" | "error" | "critical",
      affectedElements: number[], // 有问题的单元ID
      geometryRegion: string,     // "corner", "contact", "interior"
      suggestedFix: string        // 建议的几何修复方法
    }
  ],
  
  // 几何优化建议
  geometryOptimization: {
    simplifyFeatures: string[],   // 建议简化的特征
    adjustMeshSize: [
      {
        region: string,
        currentSize: number,
        suggestedSize: number,
        reason: string
      }
    ],
    topologyChanges: string[]     // 拓扑优化建议
  }
}
```

### **计算需求信息**
```typescript
// 希望了解的计算需求
interface ComputationRequirements {
  analysisType: string,           // "static" | "dynamic" | "seepage"
  elementType: string,            // "tetrahedron" | "hexahedron"
  solverRequirements: {
    maxElementSize: number,       // 求解器要求的最大单元尺寸
    qualityThreshold: number,     // 质量阈值
    specialConstraints: string[]  // 特殊约束条件
  },
  performanceTarget: {
    maxElements: number,          // 最大单元数
    maxNodes: number,            // 最大节点数
    memoryLimit: string          // 内存限制 "4GB"
  }
}
```

---

## 🚀 **组件开发进度**

### **当前状态**
```markdown
## 📅 组件开发计划与进度

### ✅ 已完成 (85%)
- [x] 地质建模基础服务 (GeologyService.ts)
- [x] GMSH几何建模服务 (GmshOccService.ts)  
- [x] Three.js 3D视口 (GeometryViewport3D.tsx)
- [x] 基础UI组件框架

### 🔄 开发中 (当前重点)
- [ ] **DXF解析引擎** (预计2天)
  - DXF文件解析器实现
  - 边界识别算法
  - 坐标系转换功能
  
- [ ] **10层锚杆自动布置算法** (预计3天)
  - 多层参数化配置
  - 间距自动计算
  - 位置坐标生成

### 📋 待开发 (下阶段)
- [ ] 支护结构参数化建模 (3天)
- [ ] 隧道几何集成 (2天)
- [ ] 几何质量优化 (2天)
- [ ] 与3号网格接口测试 (1天)
```

### **近期交付计划**
```markdown
## 📦 本周交付计划

### 今日 (2025-01-23)
- ✅ 完成API文档编写
- 🔄 开始DXF解析引擎开发
- 📋 创建几何数据格式示例

### 明日 (2025-01-24)  
- 🎯 完成DXF导入基础功能
- 🔧 实现边界识别算法
- 📊 为3号准备测试用几何数据

### 本周末 (2025-01-26)
- 🚀 完成10层锚杆布置算法
- 📡 实现与3号的数据接口
- 🧪 提供完整的API测试用例
```

---

## 📞 **实时协作承诺**

### **文档维护**
- ✅ 在 `docs/GEOMETRY_MODULE_API.md` 创建API文档 (已完成)
- ✅ 每次接口变更都会更新文档并通知团队看板
- ✅ 提供详细的TypeScript类型定义

### **进度同步**
- 📅 每日在团队看板更新开发进度
- 🔔 重要节点完成时立即通知1号和3号
- 📊 每周提供详细的功能交付报告

### **测试配合**
- 🧪 提供标准的测试用几何数据
- 📋 配合3号进行接口联调测试
- 🔍 响应1号的架构集成需求

---

## 🎯 **给3号的具体信息**

### **1. 几何数据输出格式**
**主要格式**: JSON + Binary
**实时推送**: WebSocket
**文件路径**: `/api/geometry/export/{geometryId}.json`

### **2. 希望接收的网格数据格式**
**质量反馈**: `MeshQualityFeedback` 接口
**优化建议**: 具体的几何修复建议
**性能指标**: 网格生成时间和内存使用

### **3. 组件开发进度**
**当前进度**: 85%基础完成，重点开发DXF和锚杆算法
**交付计划**: 本周完成核心接口，下周集成测试
**测试配合**: 随时可提供测试数据和接口调试

---

**📢 团队看板通知已发布！准备与1号架构和3号计算进行深度协作！** 🤝✨

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "创建几何模块API文档", "status": "completed", "priority": "high", "id": "create_api_documentation"}, {"content": "响应1号架构师协作方案", "status": "completed", "priority": "high", "id": "respond_to_architecture_collaboration"}, {"content": "开发DXF解析引擎", "status": "in_progress", "priority": "high", "id": "develop_dxf_parsing_engine"}, {"content": "实现10层锚杆自动布置算法", "status": "pending", "priority": "high", "id": "implement_10_layer_anchor_algorithm"}, {"content": "为3号准备几何数据测试用例", "status": "pending", "priority": "high", "id": "prepare_geometry_test_data"}, {"content": "配合3号进行接口联调测试", "status": "pending", "priority": "medium", "id": "coordinate_interface_testing"}]