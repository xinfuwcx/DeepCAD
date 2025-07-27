# 几何数据测试用例
## 📋 供3号计算专家网格生成测试

### 🎯 **测试数据说明**
- **用途**: 网格生成和有限元计算接口联调测试
- **数据格式**: 标准GeometryToMeshData接口
- **测试范围**: 地质建模、基坑开挖、支护结构、锚杆系统
- **复杂度**: 从简单到复杂的3个测试级别

---

## 📊 **测试用例1: 简单矩形基坑 (基础测试)**

### **几何描述**
- 矩形基坑: 50m × 30m × 15m深
- 地连墙厚度: 0.8m  
- 锚杆系统: 3层，均匀布置
- 地质条件: 2层土体（粘土+砂土）

### **测试数据文件**
```json
{
  "header": {
    "version": "1.0",
    "timestamp": "2025-01-23T10:00:00Z",
    "geometryType": "complete_excavation_system",
    "coordinateSystem": "LOCAL",
    "units": "meters"
  },
  
  "meshGeometry": {
    "vertices": "Float32Array_Binary_Data",
    "faces": "Uint32Array_Binary_Data", 
    "normals": "Float32Array_Binary_Data",
    "vertexCount": 2856,
    "faceCount": 5520
  },
  
  "materialZones": [
    {
      "zoneId": "clay_layer",
      "zoneName": "粘土层",
      "materialType": "soil",
      "faceIndices": [0, 150, 1680],
      "properties": {
        "density": 1800,
        "elasticModulus": 15000000,
        "poissonRatio": 0.35,
        "cohesion": 25000,
        "frictionAngle": 18,
        "permeability": 1e-8
      }
    },
    {
      "zoneId": "sand_layer", 
      "zoneName": "砂土层",
      "materialType": "soil",
      "faceIndices": [1681, 3360, 4200],
      "properties": {
        "density": 1900,
        "elasticModulus": 30000000,
        "poissonRatio": 0.3,
        "cohesion": 5000,
        "frictionAngle": 32,
        "permeability": 1e-5
      }
    },
    {
      "zoneId": "diaphragm_wall",
      "zoneName": "地连墙",
      "materialType": "concrete",
      "faceIndices": [4201, 4800, 5200],
      "properties": {
        "density": 2500,
        "elasticModulus": 30000000000,
        "poissonRatio": 0.2
      }
    },
    {
      "zoneId": "anchor_system",
      "zoneName": "锚杆系统", 
      "materialType": "steel",
      "faceIndices": [5201, 5520],
      "properties": {
        "density": 7850,
        "elasticModulus": 200000000000,
        "poissonRatio": 0.3
      }
    }
  ],
  
  "boundaryConditions": {
    "fixedBoundaries": {
      "faceIndices": [0, 50, 100, 200],
      "constraintType": "fixed"
    },
    "loadBoundaries": {
      "faceIndices": [4201, 4400, 4600],
      "loadType": "pressure", 
      "magnitude": 50000,
      "direction": [1, 0, 0]
    }
  },
  
  "meshGuidance": {
    "globalElementSize": 2.0,
    "localRefinement": [
      {
        "region": "corner",
        "faceIndices": [100, 120, 140],
        "targetSize": 0.5,
        "priority": "high"
      },
      {
        "region": "contact",
        "faceIndices": [4200, 4300, 4400],
        "targetSize": 1.0,
        "priority": "medium"
      }
    ],
    "qualityRequirements": {
      "minAngle": 15,
      "maxAspectRatio": 5.0,
      "targetQuality": 0.7
    }
  },
  
  "qualityInfo": {
    "geometryValid": true,
    "manifoldSurface": true,
    "selfIntersection": false,
    "precision": 0.001,
    "warnings": [],
    "recommendations": ["建议在转角处加密网格"]
  }
}
```

### **预期网格要求**
- **网格类型**: 四面体单元
- **单元数量**: 15,000 - 25,000个
- **节点数量**: 8,000 - 12,000个
- **最小质量**: > 0.3
- **处理时间**: < 30秒

---

## 📊 **测试用例2: 复杂不规则基坑 (中等测试)**

### **几何描述**
- 不规则基坑: 基于DXF边界
- 分层开挖: 5个阶段
- 锚杆系统: 6层，不均匀间距
- 地质条件: 4层土体，含地下水

### **关键参数**
```javascript
{
  "excavation": {
    "type": "irregular",
    "boundaryPoints": [
      {"x": 0, "y": 0}, {"x": 45, "y": 5}, {"x": 52, "y": 25},
      {"x": 35, "y": 35}, {"x": 8, "y": 30}, {"x": 0, "y": 0}
    ],
    "stages": [
      {"depth": 3, "slope_ratio": 0.2},
      {"depth": 6, "slope_ratio": 0.3}, 
      {"depth": 9, "slope_ratio": 0.4},
      {"depth": 12, "slope_ratio": 0.4},
      {"depth": 15, "slope_ratio": 0.5}
    ]
  },
  
  "anchorSystem": {
    "levels": 6,
    "anchorsPerLevel": [12, 14, 16, 18, 16, 14],
    "totalAnchors": 90,
    "waleBeams": 24
  }
}
```

### **预期网格要求**
- **网格类型**: 四面体+六面体混合
- **单元数量**: 35,000 - 50,000个
- **节点数量**: 18,000 - 25,000个
- **最小质量**: > 0.25
- **处理时间**: < 60秒

---

## 📊 **测试用例3: 超大型基坑系统 (高级测试)**

### **几何描述**
- 大型地铁站基坑: 150m × 80m × 30m深
- 锚杆系统: 10层满配置
- 隧道干扰: 2条隧道穿越
- 复合支护: 地连墙+锚杆+钢支撑

### **复杂度参数**
```javascript
{
  "scale": "large",
  "dimensions": {"length": 150, "width": 80, "depth": 30},
  "anchorLevels": 10,
  "totalAnchors": 240,
  "tunnels": 2,
  "supportElements": 856,
  "geologicalLayers": 6,
  "excavationStages": 8
}
```

### **性能要求**
- **网格单元**: 80,000 - 120,000个
- **内存使用**: < 4GB
- **处理时间**: < 2分钟
- **网格质量**: > 0.2

---

## 🔧 **测试数据生成脚本**

```typescript
// 测试数据生成器
export class GeometryTestDataGenerator {
  
  /**
   * 生成基础测试数据
   */
  async generateBasicTestData(): Promise<GeometryToMeshData> {
    const config = anchorLayoutService.getDefaultConfig();
    
    // 设置为3层锚杆
    config.levels = config.levels.slice(0, 3);
    config.levels.forEach(level => level.enabled = true);
    
    const anchorResult = await anchorLayoutService.generateAnchorLayout(config);
    
    return this.convertToMeshData(anchorResult, 'basic');
  }
  
  /**
   * 生成复杂测试数据
   */
  async generateComplexTestData(): Promise<GeometryToMeshData> {
    const config = anchorLayoutService.getDefaultConfig();
    
    // 6层锚杆，不规则基坑
    config.levels = config.levels.slice(0, 6);
    config.diaphragmWall.coordinates = [
      { x: 0, y: 0, z: 0 }, { x: 45, y: 5, z: 0 },
      { x: 52, y: 25, z: 0 }, { x: 35, y: 35, z: 0 },
      { x: 8, y: 30, z: 0 }, { x: 0, y: 0, z: 0 }
    ];
    
    const anchorResult = await anchorLayoutService.generateAnchorLayout(config);
    
    return this.convertToMeshData(anchorResult, 'complex');
  }
  
  /**
   * 生成大型测试数据
   */
  async generateLargeTestData(): Promise<GeometryToMeshData> {
    const config = anchorLayoutService.getDefaultConfig();
    
    // 10层满配置
    config.levels.forEach(level => level.enabled = true);
    
    // 大型基坑
    config.diaphragmWall.coordinates = [
      { x: 0, y: 0, z: 0 }, { x: 150, y: 0, z: 0 },
      { x: 150, y: 80, z: 0 }, { x: 0, y: 80, z: 0 },
      { x: 0, y: 0, z: 0 }
    ];
    
    const anchorResult = await anchorLayoutService.generateAnchorLayout(config);
    
    return this.convertToMeshData(anchorResult, 'large');
  }
  
  private convertToMeshData(
    anchorResult: AnchorSystemResult, 
    type: 'basic' | 'complex' | 'large'
  ): GeometryToMeshData {
    // 转换为标准网格数据格式
    // 实际实现中需要调用GMSH几何生成
    return {
      header: {
        version: "1.0",
        timestamp: new Date().toISOString(),
        geometryType: "complete_excavation_system",
        coordinateSystem: "LOCAL",
        units: "meters"
      },
      meshGeometry: {
        vertices: new Float32Array(),
        faces: new Uint32Array(),
        normals: new Float32Array(),
        vertexCount: 0,
        faceCount: 0
      },
      materialZones: [],
      boundaryConditions: {
        fixedBoundaries: { faceIndices: [], constraintType: "fixed" }
      },
      meshGuidance: {
        globalElementSize: type === 'basic' ? 2.0 : type === 'complex' ? 1.5 : 1.0,
        localRefinement: [],
        qualityRequirements: {
          minAngle: 15,
          maxAspectRatio: 5.0,
          targetQuality: 0.7
        }
      },
      qualityInfo: {
        geometryValid: true,
        manifoldSurface: true,
        selfIntersection: false,
        precision: 0.001,
        warnings: [],
        recommendations: []
      }
    };
  }
}
```

---

## 📡 **接口测试建议**

### **测试顺序**
1. **基础测试**: 验证数据格式和基本网格生成
2. **复杂测试**: 验证不规则几何和多材料处理
3. **大型测试**: 验证性能和内存管理

### **验证要点**
- ✅ **数据格式兼容性**: JSON序列化/反序列化
- ✅ **几何有效性**: 流形面、闭合性检查
- ✅ **材料分区**: 正确的材料属性映射
- ✅ **边界条件**: 约束和荷载设置
- ✅ **网格质量**: 满足求解器要求

### **性能基准**
| 测试级别 | 数据大小 | 处理时间 | 内存使用 | 质量要求 |
|---------|---------|---------|---------|---------|
| 基础 | < 5MB | < 30s | < 1GB | > 0.3 |
| 复杂 | < 15MB | < 60s | < 2GB | > 0.25 |
| 大型 | < 50MB | < 120s | < 4GB | > 0.2 |

---

## 🤝 **给3号的协作建议**

### **数据交换方式**
1. **文件交换**: JSON + Binary组合格式
2. **WebSocket**: 实时进度反馈
3. **HTTP API**: 批量数据传输

### **质量反馈格式**
请按照`GEOMETRY_MODULE_API.md`中的`MeshQualityFeedback`接口返回网格质量信息。

### **问题反馈**
如遇到几何数据问题，请提供：
- 具体错误信息
- 问题几何区域标识  
- 建议的几何修复方案

### **优化建议**
基于网格生成结果，请反馈：
- 几何简化建议
- 网格尺寸调整建议
- 拓扑优化建议

---

**📞 联系方式**: 通过团队协作看板或直接@2号几何专家