# 几何数据测试用例
## 供3号计算专家参考的标准测试数据

---

## 📦 **测试数据包结构**

```
E:\DeepCAD\test_data\geometry\
├── basic_excavation\           # 基础开挖几何
│   ├── rectangular_pit.json   # 矩形基坑
│   ├── circular_pit.json      # 圆形基坑
│   └── irregular_pit.json     # 不规则基坑
├── geology_models\            # 地质模型
│   ├── simple_soil_layers.json
│   ├── complex_stratigraphy.json
│   └── rbf_interpolation.json
├── support_structures\        # 支护结构
│   ├── diaphragm_wall.json    # 地连墙
│   ├── anchor_system_6_levels.json # 6层锚杆
│   └── steel_struts.json      # 钢支撑
└── integrated_models\         # 集成模型
    ├── complete_excavation.json
    └── mesh_ready_geometry.json
```

---

## 🎯 **标准测试用例**

### **用例1: 矩形基坑 + 地质模型**
```json
{
  "testId": "rectangular_pit_geology",
  "description": "30m×20m×15m矩形基坑，包含3层土体",
  "geometryData": {
    "header": {
      "version": "1.0",
      "timestamp": "2025-01-23T14:30:00Z",
      "geometryType": "excavation",
      "coordinateSystem": "LOCAL",
      "units": "meters"
    },
    "meshGeometry": {
      "vertices": "Float32Array[1440]", // 480个顶点 × 3坐标
      "faces": "Uint32Array[2832]",     // 944个三角形 × 3顶点
      "normals": "Float32Array[1440]",  // 法向量
      "vertexCount": 480,
      "faceCount": 944
    },
    "materialZones": [
      {
        "zoneId": "clay_layer",
        "zoneName": "粘土层",
        "materialType": "soil",
        "faceIndices": [0, 1, 2, "...314"],
        "properties": {
          "density": 1800,
          "elasticModulus": 8000000,
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
        "faceIndices": [315, 316, "...629"],
        "properties": {
          "density": 1900,
          "elasticModulus": 15000000,
          "poissonRatio": 0.3,
          "cohesion": 5000,
          "frictionAngle": 32,
          "permeability": 1e-5
        }
      },
      {
        "zoneId": "bedrock",
        "zoneName": "基岩",
        "materialType": "soil", 
        "faceIndices": [630, 631, "...943"],
        "properties": {
          "density": 2500,
          "elasticModulus": 50000000,
          "poissonRatio": 0.25,
          "cohesion": 100000,
          "frictionAngle": 45,
          "permeability": 1e-10
        }
      }
    ],
    "boundaryConditions": {
      "fixedBoundaries": {
        "faceIndices": [800, 801, "...943"], // 底面固定
        "constraintType": "fixed"
      },
      "loadBoundaries": {
        "faceIndices": [0, 1, "...99"], // 顶面荷载
        "loadType": "pressure",
        "magnitude": -20000, // 20kPa向下
        "direction": [0, 0, -1]
      }
    },
    "meshGuidance": {
      "globalElementSize": 2.0,
      "localRefinement": [
        {
          "region": "corner",
          "faceIndices": [100, 101, "...199"],
          "targetSize": 0.5,
          "priority": "high"
        }
      ],
      "qualityRequirements": {
        "minAngle": 20,
        "maxAspectRatio": 10,
        "targetQuality": 0.8
      }
    }
  },
  "expectedResults": {
    "meshElementCount": 2000,
    "meshNodeCount": 800,
    "processingTime": 5000,
    "memoryUsage": "200MB",
    "qualityScore": 0.85
  }
}
```

### **用例2: 6层锚杆支护系统**
```json
{
  "testId": "anchor_system_6_levels",
  "description": "6层锚杆支护系统，均匀间距2.5m",
  "geometryData": {
    "header": {
      "version": "1.0",
      "geometryType": "support",
      "coordinateSystem": "LOCAL",
      "units": "meters"
    },
    "anchorSystem": {
      "totalAnchors": 48,
      "levels": [
        {
          "levelId": 1,
          "elevation": -2.0,
          "anchorCount": 8,
          "spacing": 2.5,
          "length": 15.0,
          "diameter": 32,
          "angle": 15,
          "preStress": 300
        },
        {
          "levelId": 2,
          "elevation": -4.5,
          "anchorCount": 8,
          "spacing": 2.5,
          "length": 18.0,
          "diameter": 32,
          "angle": 15,
          "preStress": 350
        }
      ]
    },
    "meshGeometry": {
      "vertices": "Float32Array[864]", // 288个顶点
      "faces": "Uint32Array[1728]",    // 576个三角形
      "vertexCount": 288,
      "faceCount": 576
    },
    "materialZones": [
      {
        "zoneId": "steel_anchor",
        "materialType": "steel",
        "properties": {
          "density": 7850,
          "elasticModulus": 200000000000,
          "poissonRatio": 0.3,
          "yieldStrength": 500000000
        }
      }
    ]
  }
}
```

### **用例3: 复杂地质分层模型**
```json
{
  "testId": "complex_stratigraphy",
  "description": "基于30个钻孔的RBF插值地质模型",
  "geometryData": {
    "header": {
      "geometryType": "geology",
      "interpolationMethod": "rbf_multiquadric"
    },
    "boreholeData": [
      {
        "id": "BH001",
        "x": 10.0, "y": 15.0, "z": -5.5,
        "soilType": "clay",
        "layerId": 1
      },
      {
        "id": "BH002", 
        "x": 25.0, "y": 30.0, "z": -8.2,
        "soilType": "sand",
        "layerId": 2
      }
    ],
    "interpolationParameters": {
      "gridResolution": 2.0,
      "domainExpansion": [50.0, 50.0],
      "rbfFunction": "multiquadric",
      "smoothingFactor": 0.1
    },
    "qualityMetrics": {
      "interpolationError": 0.15,
      "crossValidationScore": 0.92,
      "dataPoints": 30,
      "interpolatedVolume": 45000
    }
  }
}
```

---

## 📊 **网格质量基准**

### **质量指标目标值**
```json
{
  "meshQualityTargets": {
    "elementQuality": {
      "minimum": 0.3,
      "average": 0.7,
      "target": 0.8
    },
    "aspectRatio": {
      "maximum": 20,
      "average": 5,
      "target": 3
    },
    "skewness": {
      "maximum": 0.9,
      "average": 0.3,
      "target": 0.2
    },
    "angles": {
      "minimum": 15, // 度
      "maximum": 150, // 度
      "target": [30, 120]
    }
  },
  "performanceTargets": {
    "maxProcessingTime": 30000, // 30秒
    "maxMemoryUsage": "2GB",
    "maxElementCount": 50000,
    "maxNodeCount": 15000
  }
}
```

---

## 🔄 **测试流程建议**

### **阶段1: 基础几何验证**
1. **简单几何体测试**
   - 立方体网格生成
   - 圆柱体网格生成  
   - 球体网格生成

2. **质量检查**
   - 几何完整性验证
   - 网格质量评估
   - 边界条件检查

### **阶段2: 工程几何测试**
1. **基坑几何**
   - 矩形基坑 (30×20×15m)
   - 不规则基坑 (基于DXF边界)
   - 分层开挖几何

2. **支护结构**
   - 地连墙几何 (厚度1.0m)
   - 锚杆系统 (6层)
   - 钢支撑系统

### **阶段3: 集成测试**
1. **完整模型**
   - 地质 + 开挖 + 支护
   - 材料分区验证
   - 边界条件设置

2. **性能测试**
   - 大规模网格生成
   - 内存使用监控
   - 处理时间评估

---

## 📁 **测试数据文件路径**

### **几何数据输出**
```
/api/geometry/export/rectangular_pit.json      # 几何数据
/api/geometry/export/rectangular_pit_mesh.bin  # 二进制网格
/api/geometry/export/rectangular_pit.gltf      # 可视化模型
```

### **实时数据推送**
```
ws://localhost:8084/geometry-updates
事件类型:
- geometry-ready        # 几何生成完成
- mesh-quality-report   # 网格质量报告
- validation-complete   # 验证完成
```

---

## 🧪 **给3号的测试建议**

### **优先测试项目**
1. **矩形基坑几何** - 最简单，先验证基础功能
2. **材料分区处理** - 验证多材料网格生成
3. **边界条件设置** - 确保约束条件正确传递
4. **网格质量反馈** - 测试质量评估算法

### **性能基准测试**
1. **小规模** (<1000单元) - 响应时间 <2秒
2. **中等规模** (1000-10000单元) - 响应时间 <15秒  
3. **大规模** (>10000单元) - 响应时间 <60秒

### **错误处理测试**
1. **无效几何输入** - 验证错误检测
2. **材料参数缺失** - 测试默认值处理
3. **网格生成失败** - 验证降级策略

---

## 📞 **联调协作方案**

### **数据交换格式**
- 使用标准JSON格式传递几何数据
- 二进制格式传递大型网格数据
- WebSocket实时推送状态更新

### **接口测试顺序**
1. 几何数据验证接口
2. 材料分区处理接口  
3. 网格生成请求接口
4. 质量反馈接口

### **问题反馈机制**
- 网格质量问题 → 几何优化建议
- 处理性能问题 → 几何简化建议
- 材料分区问题 → 分区策略调整

---

**🤝 准备就绪！期待与3号计算专家的深度协作！**