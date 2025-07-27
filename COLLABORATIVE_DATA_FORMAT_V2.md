# 2号几何专家 ↔ 3号计算专家协作数据格式 v2.0

## 📋 基于3号专家建议的MaterialZone完整定义

根据3号专家的技术评估，我完善了MaterialZone数据结构：

```typescript
/**
 * 材料分区完整定义 - 2号+3号专家协作标准
 * 兼容GMSH OCC和Kratos计算要求
 */
interface MaterialZone {
  // 基础标识
  zoneId: string;                    // 唯一标识符
  zoneName: string;                  // 可读名称
  materialType: 'clay' | 'sand' | 'rock' | 'concrete' | 'steel' | 'composite';
  
  // 3号专家要求的物理属性
  physicalProperties: {
    // 弹性参数
    elasticModulus: number;          // 弹性模量 (MPa)
    poissonRatio: number;            // 泊松比 (0-0.5)
    density: number;                 // 密度 (kg/m³)
    
    // 土工参数 (适用于土体材料)
    cohesion: number;                // 粘聚力 (kPa)
    frictionAngle: number;           // 内摩擦角 (degrees)
    permeability: number;            // 渗透系数 (m/s)
    
    // 结构材料参数 (适用于混凝土/钢材)
    compressiveStrength?: number;    // 抗压强度 (MPa)
    tensileStrength?: number;        // 抗拉强度 (MPa)
    yieldStrength?: number;          // 屈服强度 (MPa)
    
    // 高级参数 (非线性分析)
    constitutiveModel?: 'linear_elastic' | 'mohr_coulomb' | 'drucker_prager' | 'cam_clay';
    nonlinearParameters?: {
      hardening?: number;
      dilatancy?: number;
      stateParameter?: number;
    };
  };
  
  // 2号专家几何区域定义
  geometryRegion: {
    vertices: number[];              // 区域顶点索引（对应GeometryToMeshData）
    boundingBox: [number, number, number, number, number, number]; // [xmin,ymin,zmin,xmax,ymax,zmax]
    volume: number;                  // 区域体积 (m³)
    surfaceArea: number;             // 表面积 (m²)
    centroid: [number, number, number]; // 几何中心
    
    // 几何质量指标
    geometryQuality: {
      aspectRatio: number;           // 长宽比
      skewness: number;              // 偏斜度
      jacobianDeterminant: number;   // 雅可比行列式
    };
  };
  
  // 3号专家网格要求
  meshRequirements: {
    targetElementSize: number;       // 目标单元尺寸 (m)
    qualityThreshold: number;        // 质量阈值 (0-1)
    refinementPriority: 'high' | 'medium' | 'low';
    
    // 网格类型偏好
    preferredElementType: 'tetrahedra' | 'hexahedra' | 'prism' | 'pyramid';
    maxAspectRatio: number;          // 最大长宽比
    minAngle: number;                // 最小角度 (degrees)
    
    // 特殊要求
    boundaryLayerMesh?: boolean;     // 是否需要边界层网格
    transitionZone?: boolean;        // 是否为过渡区域
    interfaceRefinement?: boolean;   // 是否在界面处加密
  };
  
  // 协作元数据
  collaborationMetadata: {
    geometryExpert: '2号几何专家';
    computationExpert: '3号计算专家';
    lastModified: string;            // ISO时间戳
    version: string;                 // 数据格式版本
    validationStatus: 'verified' | 'pending' | 'failed';
    notes: string[];                 // 协作备注
  };
}
```

## 🔧 增强的GeometryToMeshData格式

基于3号专家反馈，我升级了数据传输格式：

```typescript
/**
 * 几何到网格数据传输格式 v2.0
 * 2号专家 → 3号专家数据协议
 */
interface GeometryToMeshData {
  // 元数据
  dataHeader: {
    version: '2.0.0';
    timestamp: string;
    geometryExpert: '2号几何专家';
    targetExpert: '3号计算专家';
    dataIntegrity: string;           // MD5校验和
  };
  
  // 几何数据（2号专家输出）
  geometryData: {
    vertices: Float32Array;          // 顶点坐标 [x1,y1,z1,x2,y2,z2,...]
    faces: Uint32Array;              // 面索引 [v1,v2,v3,v1,v2,v3,...]
    normals: Float32Array;           // 法向量 [nx1,ny1,nz1,...]
    uvCoordinates?: Float32Array;    // 纹理坐标（可选）
    
    // 几何质量指标
    qualityMetrics: {
      averageElementQuality: number;  // 平均单元质量
      minElementQuality: number;      // 最小单元质量
      maxAspectRatio: number;         // 最大长宽比
      degenerateElements: number;     // 退化单元数量
      boundingBoxVolume: number;      // 包围盒体积
    };
  };
  
  // 材料映射（协作标准）
  materialMapping: MaterialZone[];
  
  // 3号专家专用网格指导
  meshGuidance: {
    // 全局网格参数
    globalMeshSize: number;          // 全局网格尺寸 (m)
    meshDensityField: Float32Array;  // 密度场分布
    
    // 特殊区域标记
    refinementZones: Array<{
      regionId: string;
      center: [number, number, number];
      radius: number;
      targetSize: number;
      priority: number;               // 1-10
    }>;
    
    // 边界条件提示
    boundaryConditions: Array<{
      surfaceId: string;
      conditionType: 'displacement' | 'force' | 'pressure' | 'fixed';
      magnitude?: number;
      direction?: [number, number, number];
    }>;
    
    // 计算建议
    computationHints: {
      estimatedDOF: number;           // 预估自由度数
      recommendedSolver: string;      // 推荐求解器
      memoryEstimate: number;         // 内存估算 (GB)
      timeEstimate: number;           // 时间估算 (hours)
    };
  };
  
  // 实时协作通道
  realtimeChannels: {
    progressCallback: string;        // WebSocket URL
    qualityFeedback: string;         // 质量反馈通道
    errorReporting: string;          // 错误报告通道
  };
}
```

## 📊 质量反馈机制设计

响应3号专家的质量反馈需求：

```typescript
/**
 * 三方协作质量反馈接口
 * 2号几何专家 ↔ 3号计算专家 ↔ 0号架构师
 */
interface QualityFeedbackMessage {
  source: '2号几何专家' | '3号计算专家' | '0号架构师';
  target: '2号几何专家' | '3号计算专家' | '0号架构师';
  timestamp: string;
  
  feedbackType: 'geometry_quality' | 'mesh_quality' | 'computation_result' | 'integration_issue';
  
  content: {
    // 问题描述
    issue?: {
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      location?: [number, number, number];
      affectedElements?: number[];
    };
    
    // 建议改进
    suggestion?: {
      action: 'refine_geometry' | 'adjust_mesh_size' | 'change_material' | 'modify_boundary';
      parameters: Record<string, any>;
      expectedImprovement: string;
    };
    
    // 验证结果
    validation?: {
      passed: boolean;
      score: number;                 // 0-100
      metrics: Record<string, number>;
      notes: string[];
    };
  };
  
  // 协作状态
  status: 'pending' | 'acknowledged' | 'resolved' | 'escalated';
  assignedTo?: string;               // 负责人
  priority: number;                  // 1-10
}
```

## 🚀 实时协作WebSocket协议

```typescript
/**
 * 三方实时协作WebSocket消息格式
 */
interface CollaborationMessage {
  messageId: string;
  timestamp: string;
  source: '2号几何专家' | '3号计算专家' | '0号架构师';
  
  messageType: 'progress_update' | 'quality_alert' | 'data_ready' | 'error_report' | 'coordinate_request';
  
  payload: {
    // 进度更新
    progress?: {
      phase: string;
      percentage: number;
      eta: number;                   // 剩余时间(秒)
      currentTask: string;
    };
    
    // 质量警报
    qualityAlert?: {
      alertLevel: 'info' | 'warning' | 'error' | 'critical';
      metric: string;
      value: number;
      threshold: number;
      recommendation: string;
    };
    
    // 数据就绪通知
    dataReady?: {
      dataType: 'geometry' | 'mesh' | 'results';
      dataUrl: string;
      checksum: string;
      size: number;                  // bytes
    };
    
    // 协调请求
    coordinateRequest?: {
      requestType: 'parameter_adjustment' | 'priority_change' | 'resource_allocation';
      details: Record<string, any>;
      urgency: 'low' | 'medium' | 'high';
    };
  };
}
```

## ✅ 网格尺寸兼容性矩阵

基于3号专家的GMSH OCC和Kratos要求：

| 几何复杂度 | 2号推荐尺寸 | 3号计算要求 | 协调尺寸 | 质量阈值 |
|------------|-------------|-------------|----------|----------|
| 简单几何   | 2.0-3.0m    | 1.5-2.5m    | 2.0m     | >0.7     |
| 中等复杂   | 1.5-2.0m    | 1.0-1.8m    | 1.5m     | >0.65    |
| 复杂几何   | 1.0-1.5m    | 0.8-1.2m    | 1.0m     | >0.6     |
| 关键区域   | 0.5-1.0m    | 0.5-0.8m    | 0.5m     | >0.8     |

## 🔗 API端点更新

```typescript
// 新增协作API端点
POST /api/collaboration/geometry-to-mesh
GET  /api/collaboration/quality-feedback
POST /api/collaboration/mesh-validation
WS   /ws/collaboration/realtime

// 数据格式验证端点
POST /api/validation/material-zone
POST /api/validation/geometry-data
GET  /api/validation/compatibility-check
```

---

**协作确认**：请3号计算专家和0号架构师确认此数据格式是否满足计算需求和系统架构要求！

**向后兼容承诺**：所有v1.0接口将继续支持，新增字段均为可选或有默认值。

**性能保证**：数据传输采用二进制+JSON混合格式，支持压缩，大文件分块传输。