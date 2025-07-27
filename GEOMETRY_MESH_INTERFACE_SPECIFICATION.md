# 几何-网格数据交换接口规范
## 2号几何专家 ↔ 3号网格专家 协作文档

**版本**: v2.1  
**更新时间**: 2025-01-26  
**作者**: 2号几何专家  
**目标用户**: 3号网格专家

---

## 📋 概述

本文档定义了2号几何专家与3号网格专家之间的数据交换接口和协作流程。基于Fragment验证标准，确保几何数据能够高效转换为高质量网格。

### 🎯 核心目标
- **网格质量**: >0.65 (Fragment标准)
- **网格尺寸**: 1.5-2.0m (可调节)
- **单元上限**: 200万单元
- **处理效率**: 秒级响应

---

## 🔄 数据流程图

```
[几何数据] → [质量评估] → [关键区域识别] → [网格指导] → [3号网格生成]
     ↓              ↓              ↓              ↓              ↓
[CAD导入]    [GeometryQuality]  [CriticalRegions] [MeshGuidance] [高质量网格]
```

---

## 📊 核心数据接口

### 1. 几何质量报告 (GeometryQualityReport)

```typescript
interface GeometryQualityReport {
  // 总体评估
  overall: {
    score: number;           // 0-1 总体质量评分
    grade: 'A' | 'B' | 'C' | 'D';  // 质量等级
    meshReadiness: boolean;  // 网格生成就绪状态 ⭐
    recommendation: string;  // 改进建议
  };
  
  // 详细质量指标
  detailed: {
    completeness: QualityMetric;     // 完整性: 实体数量、面积、封闭性
    topology: QualityMetric;         // 拓扑: 重叠、自相交、孤立点
    geometry: QualityMetric;         // 精度: 坐标、尺度、角度
    meshCompatibility: QualityMetric; // 网格适配性 ⭐ 重点
  };
  
  // 关键区域识别 ⭐ 3号重点关注
  criticalRegions: {
    corners: CriticalRegion[];       // 角点区域(优先级最高)
    boundaries: CriticalRegion[];    // 边界区域
    intersections: CriticalRegion[]; // 交叉区域
    highCurvature: CriticalRegion[]; // 高曲率区域
  };
  
  // 网格生成指导 ⭐ 直接用于网格参数
  meshGuidance: {
    recommendedMeshSize: number;     // 推荐网格尺寸
    estimatedElements: number;       // 预估单元数
    refinementZones: RefinementZone[]; // 细化区域定义
    qualityPrediction: number;       // 网格质量预测
  };
}
```

### 2. 关键区域定义 (CriticalRegion)

```typescript
interface CriticalRegion {
  location: Point3D;              // 区域中心坐标
  type: 'corner' | 'boundary' | 'intersection' | 'curvature';
  severity: 'critical' | 'important' | 'moderate';  // 严重程度
  description: string;            // 描述信息
  suggestedMeshSize: number;      // 建议的局部网格尺寸 ⭐
  priority: number;               // 处理优先级 1-10 ⭐
}
```

**优先级说明**:
- **10-8**: 关键区域，必须细化
- **7-5**: 重要区域，建议细化  
- **4-1**: 一般区域，可选细化

### 3. 网格细化区域 (RefinementZone)

```typescript
interface RefinementZone {
  center: Point3D;        // 细化中心
  radius: number;         // 影响半径
  meshSize: number;       // 局部网格尺寸 ⭐
  reason: string;         // 细化原因
  elements: number;       // 预估局部单元数
}
```

---

## 🛠️ 主要服务接口

### 1. 几何质量评估服务

```typescript
// 主接口 - 全面质量评估
const qualityService = GeometryQualityService.getInstance();
const report = await qualityService.assessGeometryQuality(cadGeometry);

// 快速检查接口 - 实时验证
const readinessCheck = await qualityService.quickMeshReadinessCheck(cadGeometry);
```

**返回数据用途**:
- `report.overall.meshReadiness` → 是否可以开始网格生成
- `report.meshGuidance.recommendedMeshSize` → 全局网格尺寸
- `report.criticalRegions` → 需要特殊处理的区域
- `report.meshGuidance.refinementZones` → 局部细化参数

### 2. 几何数据获取服务

```typescript
// DXF几何解析
const dxfService = DXFGeometryService.getInstance();
const cadGeometry = await dxfService.parseDXFFile(file);

// 几何验证
const validation = await dxfService.validateGeometry(cadGeometry);
```

### 3. RBF地质插值服务

```typescript
// 地质数据插值 - 用于复杂地层建模
const rbfInterpolator = new RBFInterpolator({
  kernel: 'multiquadric',
  meshCompatibility: {
    targetMeshSize: 1.75,    // 与网格尺寸匹配
    qualityThreshold: 0.65,  // Fragment标准
    maxElements: 2000000     // 单元上限
  }
});

const result = await rbfInterpolator.interpolate(
  geologicalPoints, 
  values, 
  queryPoints
);
```

---

## 📏 质量标准与阈值

### Fragment验证标准
```typescript
const QUALITY_STANDARDS = {
  TARGET_MESH_SIZE: 1.75,      // 1.5-2.0m中值
  QUALITY_THRESHOLD: 0.65,     // 最低质量要求
  MAX_ELEMENTS: 2000000,       // 单元数上限
  MIN_ANGLE: 15,               // 最小角度(度)
  MAX_ASPECT_RATIO: 10,        // 最大长宽比
  CURVATURE_THRESHOLD: 0.1,    // 曲率阈值
  GAP_TOLERANCE: 0.001,        // 间隙容差(m)
};
```

### 质量等级定义
- **A级 (≥0.9)**: 优秀，可直接生成高质量网格
- **B级 (≥0.75)**: 良好，建议关键区域细化
- **C级 (≥0.6)**: 可接受，需要优化拓扑和适配性
- **D级 (<0.6)**: 较差，建议全面优化后再网格化

---

## 🎯 协作工作流程

### 阶段1: 几何数据准备
```
2号几何专家:
1. 解析CAD文件 (DXF/DWG)
2. 几何后处理 (去重、合并、修复)
3. 质量初步检查
4. 生成几何数据包
```

### 阶段2: 质量评估与分析
```
2号几何专家:
1. 全面质量评估
2. 关键区域识别
3. 网格适配性分析
4. 生成评估报告
```

### 阶段3: 网格指导生成
```
2号几何专家:
1. 推荐全局网格尺寸
2. 定义细化区域
3. 预测网格质量
4. 估算计算资源需求
```

### 阶段4: 网格生成 (3号负责)
```
3号网格专家:
1. 接收几何数据和指导参数
2. 应用全局网格尺寸
3. 在关键区域应用细化
4. 生成高质量网格
5. 验证网格质量
```

### 阶段5: 质量验证与反馈
```
协作验证:
1. 网格质量检查
2. 单元数量确认
3. 关键区域验证
4. 性能评估
5. 优化建议
```

---

## 🔧 实际使用示例

### 示例1: 标准几何质量检查

```typescript
// 1. 解析几何文件
const cadGeometry = await dxfService.parseDXFFile(dxfFile);

// 2. 质量评估
const qualityReport = await qualityService.assessGeometryQuality(cadGeometry);

// 3. 检查是否可以网格化
if (qualityReport.overall.meshReadiness) {
  console.log('✅ 几何质量满足要求，可以开始网格生成');
  console.log(`推荐网格尺寸: ${qualityReport.meshGuidance.recommendedMeshSize}m`);
  console.log(`预估单元数: ${qualityReport.meshGuidance.estimatedElements}`);
  
  // 4. 传递给3号专家
  const meshParams = {
    globalMeshSize: qualityReport.meshGuidance.recommendedMeshSize,
    refinementZones: qualityReport.meshGuidance.refinementZones,
    criticalRegions: qualityReport.criticalRegions
  };
  
  // → 3号专家使用这些参数生成网格
  
} else {
  console.log('❌ 几何质量不满足要求');
  console.log('问题:', qualityReport.overall.recommendation);
}
```

### 示例2: 关键区域处理

```typescript
// 遍历关键区域，按优先级处理
qualityReport.criticalRegions.corners
  .filter(region => region.priority >= 8)  // 高优先级区域
  .forEach(region => {
    console.log(`🎯 关键角点: ${region.description}`);
    console.log(`位置: (${region.location.x}, ${region.location.y})`);
    console.log(`建议网格尺寸: ${region.suggestedMeshSize}m`);
    
    // 3号专家在此区域应用细化
  });
```

### 示例3: 复杂地质建模

```typescript
// 地质钻孔数据插值
const geologicalModel = await rbfInterpolator.interpolate(
  boreholePoints,      // 钻孔位置
  stratumElevations,   // 地层标高
  meshNodes           // 网格节点
);

// 质量验证
if (geologicalModel.qualityMetrics.meshReadiness) {
  console.log('🗻 地质模型质量满足网格要求');
  console.log(`复杂度: ${geologicalModel.qualityMetrics.complexity}`);
  
  // 关键区域分析
  const criticalGeology = geologicalModel.criticalRegions;
  console.log(`高梯度区域: ${criticalGeology.highGradientAreas.length}处`);
  console.log(`不连续点: ${criticalGeology.discontinuities.length}处`);
}
```

---

## ⚡ 性能优化建议

### 对于3号专家:

1. **并行处理**: 可以同时处理多个细化区域
2. **优先级处理**: 先处理priority≥8的关键区域
3. **内存管理**: 大几何可分块处理，避免内存溢出
4. **质量监控**: 实时监控网格质量，及时调整参数

### 数据传输优化:
```typescript
// 大数据量时使用压缩传输
const compressedData = {
  geometry: compressGeometry(cadGeometry),
  quality: qualityReport,
  guidance: meshGuidance
};
```

---

## 🚨 常见问题与解决方案

### Q1: 几何质量评分低怎么办?
**A**: 查看`qualityReport.detailed`中的具体问题:
- 完整性问题 → 补充缺失几何
- 拓扑问题 → 修复重叠和自相交
- 精度问题 → 调整坐标精度
- 网格适配性问题 → 调整网格尺寸或简化几何

### Q2: 预估单元数超过200万怎么办?
**A**: 
1. 增大`recommendedMeshSize`
2. 简化几何细节
3. 分区域网格化
4. 使用多级网格策略

### Q3: 关键区域太多怎么处理?
**A**: 按优先级分批处理:
```typescript
const highPriority = criticalRegions.filter(r => r.priority >= 8);
const mediumPriority = criticalRegions.filter(r => r.priority >= 5 && r.priority < 8);
// 先处理高优先级，再处理中等优先级
```

### Q4: 复杂几何网格化失败?
**A**: 
1. 检查`geometryComplexity`评分
2. 如果>0.8，考虑分步处理
3. 使用更保守的网格参数
4. 增加细化区域数量

---

## 📞 技术支持

**几何算法问题**: 联系2号几何专家  
**接口集成问题**: 参考本文档或提交Issue  
**性能优化建议**: 基于实际使用场景讨论

---

## 📝 更新日志

**v2.1 (2025-01-26)**:
- ✅ 完成GeometryQualityService核心实现
- ✅ 优化RBF插值性能，支持大规模数据
- ✅ 实现DXF解析Worker版本
- ✅ 增加关键区域智能识别
- ✅ 完善网格指导算法

**v2.0**: 初始完整版本，包含所有核心接口

---

**🤝 期待与3号专家的高效协作！**

*如有接口问题或需要技术讨论，随时联系2号几何专家*