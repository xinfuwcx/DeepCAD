# DeepCAD 三人协作接口文档
## 版本: v1.0 | 负责人: 1号架构师 | 更新时间: 2025-01-23

---

## 🎯 **协作流程规范**

### **文档更新流程**
```
修改者 → 更新文档 → @提及相关人员 → 确认接收 → 实施变更
```

### **紧急变更流程**  
```
发起人 → 群聊通知 → 30分钟内响应 → 快速决策 → 记录变更
```

---

## 📐 **1号 ↔ 2号 接口规范** (架构 ↔ 几何)

### **A. 几何数据格式标准**
```typescript
// 1号定义，2号实现
interface GeometryDataExchange {
  // 地质模型数据
  geology: {
    points: Point3D[];           // 地质钻孔点
    surfaces: GeologySurface[];  // 地质面
    materials: MaterialZone[];   // 材料分区
    interpolation_method: 'rbf' | 'kriging' | 'idw';
    confidence_level: number;    // 插值置信度
  };
  
  // 基坑几何数据
  excavation: {
    outline: Polygon2D;          // 基坑轮廓
    stages: ExcavationStage[];   // 开挖阶段
    depth_profile: DepthCurve;   // 深度剖面
    slope_angles: number[];      // 边坡角度
  };
  
  // 支护结构数据
  support: {
    retaining_walls: Wall[];     // 挡土墙
    anchor_systems: Anchor[];    // 锚杆系统
    struts: Strut[];            // 支撑系统
    drainage: DrainageSystem;    // 排水系统
  };
  
  // 元数据
  metadata: {
    created_by: '2号-几何专家';
    timestamp: string;
    version: string;
    coordinate_system: 'WGS84' | 'Local';
    units: 'meter' | 'millimeter';
  };
}
```

### **B. API接口规范 (1号定义路由，2号实现逻辑)**
```yaml
# 地质建模接口
POST /api/geometry/geology/interpolate
  Request: { points: Point3D[], method: string, parameters: object }
  Response: { surfaces: Surface[], confidence: number, metadata: object }
  
GET /api/geometry/geology/validate
  Response: { valid: boolean, issues: ValidationIssue[], suggestions: string[] }

# 基坑设计接口  
POST /api/geometry/excavation/generate
  Request: { outline: Polygon2D, depth: number, stages: number }
  Response: { geometry: ExcavationGeometry, volume: number, area: number }
  
PUT /api/geometry/excavation/modify
  Request: { id: string, modifications: Modification[] }
  Response: { updated_geometry: ExcavationGeometry, validation: ValidationResult }

# 支护结构接口
POST /api/geometry/support/design
  Request: { excavation_id: string, soil_properties: SoilData, safety_factor: number }
  Response: { support_system: SupportSystem, analysis: StructuralAnalysis }
```

---

## 🔬 **1号 ↔ 3号 接口规范** (架构 ↔ 网格计算)

### **A. 网格数据格式标准**
```typescript
// 1号定义，3号实现
interface MeshDataExchange {
  // 网格几何数据
  mesh: {
    nodes: MeshNode[];           // 节点坐标
    elements: MeshElement[];     // 单元连接
    boundaries: BoundaryFace[];  // 边界面
    groups: PhysicalGroup[];     // 物理组
    quality_metrics: QualityReport; // 网格质量
  };
  
  // 计算设置数据
  computation: {
    analysis_type: 'static' | 'dynamic' | 'seepage' | 'thermal';
    solver_settings: SolverConfig;
    boundary_conditions: BoundaryCondition[];
    loads: LoadCondition[];
    materials: MaterialProperties[];
    time_settings?: TimeStepConfig;
  };
  
  // 结果数据
  results: {
    fields: ResultField[];       // 结果场数据
    time_series: TimeData[];     // 时程数据
    convergence: ConvergenceInfo; // 收敛信息
    performance: ComputeStats;   // 计算性能
  };
}
```

### **B. API接口规范 (1号定义路由，3号实现逻辑)**
```yaml
# 网格生成接口
POST /api/meshing/generate
  Request: { geometry_id: string, mesh_config: MeshConfig }
  Response: { mesh_id: string, quality_report: QualityReport, statistics: MeshStats }
  
GET /api/meshing/quality-check/{mesh_id}
  Response: { quality_score: number, issues: QualityIssue[], recommendations: string[] }

# 计算分析接口
POST /api/computation/setup
  Request: { mesh_id: string, analysis_config: AnalysisConfig }
  Response: { job_id: string, estimated_time: number, resource_usage: ResourceInfo }
  
GET /api/computation/status/{job_id}
  Response: { status: 'running'|'completed'|'failed', progress: number, message: string }
  
GET /api/computation/results/{job_id}
  Response: { results: ComputationResults, visualization_data: VizData }
```

---

## 🔄 **2号 ↔ 3号 接口规范** (几何 ↔ 网格计算)

### **A. 几何到网格的数据传递**
```typescript
// 2号输出，3号接收
interface GeometryToMeshData {
  // 几何文件
  brep_file: string;           // OpenCascade BREP文件路径
  step_file?: string;          // STEP文件路径 (备用)
  
  // 网格约束
  mesh_constraints: {
    global_max_size: number;   // 全局最大单元尺寸
    global_min_size: number;   // 全局最小单元尺寸
    surface_constraints: SurfaceConstraint[]; // 面网格约束
    curve_constraints: CurveConstraint[];     // 线网格约束
    point_constraints: PointConstraint[];     // 点网格约束
  };
  
  // 物理区域定义
  physical_regions: {
    soil_layers: SoilRegion[];    // 土层区域
    structure_parts: StructurePart[]; // 结构部件
    interfaces: InterfaceRegion[];    // 接触面
    boundary_zones: BoundaryZone[];   // 边界区域
  };
  
  // 材料属性映射
  material_mapping: {
    region_id: string;
    material_properties: MaterialData;
    constitutive_model: ConstitutiveModel;
  }[];
}
```

### **B. 协作API接口**
```yaml
# 几何验证接口 (2号调用3号的网格预检)
POST /api/meshing/geometry-validation
  Request: { brep_file: string, constraints: MeshConstraints }
  Response: { meshable: boolean, warnings: Warning[], suggestions: Suggestion[] }

# 网格反馈接口 (3号向2号反馈网格问题)  
POST /api/geometry/mesh-feedback
  Request: { geometry_id: string, mesh_issues: MeshIssue[] }
  Response: { geometry_fixes: GeometryFix[], auto_fix_applied: boolean }
```

---

## 📞 **实时沟通协议**

### **消息格式标准**
```typescript
interface TeamMessage {
  from: '1号' | '2号' | '3号';
  to: '1号' | '2号' | '3号' | 'all';
  type: 'info' | 'question' | 'urgent' | 'review';
  module: 'geometry' | 'mesh' | 'compute' | 'integration' | 'architecture';
  title: string;
  content: string;
  attachments?: string[];
  requires_response: boolean;
  deadline?: string;
}
```

### **紧急情况处理**
```yaml
级别1 - 系统崩溃: "@all 系统级问题，需要立即处理"
级别2 - 模块故障: "@相关负责人 模块故障，1小时内响应"  
级别3 - 接口问题: "@接口双方 接口调试，4小时内解决"
级别4 - 功能优化: "正常讨论，24小时内回复"
```

---

## 📊 **进度同步机制**

### **每日状态更新格式**
```markdown
## 1号架构师日报 - YYYY-MM-DD
### ✅ 今日完成
- [ ] 任务1描述
- [ ] 任务2描述

### 🔄 进行中  
- [ ] 任务描述 (预计完成时间)

### ⚠️ 遇到的问题
- 问题描述 (@需要支持的人员)

### 📋 明日计划
- [ ] 计划任务1
- [ ] 计划任务2

### 🤝 需要协作
- [ ] 与2号：具体协作内容
- [ ] 与3号：具体协作内容
```

---

## 🎯 **质量检查清单**

### **代码提交前检查 (所有人)**
- [ ] 功能测试通过
- [ ] 接口文档已更新
- [ ] 性能测试达标
- [ ] 错误处理完善
- [ ] 日志输出规范

### **集成测试检查 (1号负责)**
- [ ] 模块间数据流测试
- [ ] API接口联通测试  
- [ ] 前后端集成测试
- [ ] 性能压力测试
- [ ] 用户体验测试

---

**📋 使用说明:**
1. 每次接口变更必须更新此文档
2. 重要变更需要@相关人员确认
3. 每周五进行文档同步检查
4. 问题追踪使用GitHub Issues

**📞 紧急联系:**
- 1号架构师: 系统架构、集成问题
- 2号几何专家: 几何算法、建模问题  
- 3号计算专家: 网格生成、求解器问题