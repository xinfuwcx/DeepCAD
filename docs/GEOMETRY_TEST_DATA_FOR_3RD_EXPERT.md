# 几何数据测试用例
## 📋 供3号计算专家联调测试

### 📊 **测试数据概览**
- **创建时间**: 2025-01-23
- **负责人**: 2号几何专家
- **目标**: 为3号计算专家提供标准几何数据进行网格生成测试

---

## 🧪 **测试用例集合**

### **用例1: 简单矩形基坑** ⭐⭐⭐
```json
{
  "testCase": "simple_rectangular_pit",
  "priority": "high",
  "description": "50m×30m×15m矩形基坑，2层锚杆",
  "geometryData": {
    "header": {
      "version": "1.0",
      "timestamp": "2025-01-23T10:00:00Z",
      "geometryType": "excavation",
      "coordinateSystem": "LOCAL",
      "units": "meters"
    },
    "meshGeometry": {
      "vertices": [
        0.0, 0.0, 0.0,    // 基坑顶面角点
        50.0, 0.0, 0.0,
        50.0, 30.0, 0.0,
        0.0, 30.0, 0.0,
        0.0, 0.0, -15.0,  // 基坑底面角点
        50.0, 0.0, -15.0,
        50.0, 30.0, -15.0,
        0.0, 30.0, -15.0
      ],
      "faces": [
        0, 1, 2, 2, 3, 0,    // 顶面
        4, 7, 6, 6, 5, 4,    // 底面
        0, 4, 5, 5, 1, 0,    // 侧面1
        1, 5, 6, 6, 2, 1,    // 侧面2
        2, 6, 7, 7, 3, 2,    // 侧面3
        3, 7, 4, 4, 0, 3     // 侧面4
      ],
      "vertexCount": 8,
      "faceCount": 12
    },
    "materialZones": [
      {
        "zoneId": "pit_volume",
        "zoneName": "开挖区域",
        "materialType": "soil",
        "faceIndices": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        "properties": {
          "density": 1800,
          "elasticModulus": 20000000,
          "poissonRatio": 0.35,
          "cohesion": 15000,
          "frictionAngle": 25,
          "permeability": 1e-8
        }
      }
    ],
    "meshGuidance": {
      "globalElementSize": 2.0,
      "localRefinement": [
        {
          "region": "corner",
          "faceIndices": [0, 1, 2, 3],
          "targetSize": 1.0,
          "priority": "high"
        }
      ],
      "qualityRequirements": {
        "minAngle": 20,
        "maxAspectRatio": 3.0,
        "targetQuality": 0.8
      }
    }
  },
  "expectedResults": {
    "elementCount": "约1500-2000个四面体",
    "nodeCount": "约400-600个节点",
    "minQuality": ">0.6",
    "maxAspectRatio": "<4.0"
  }
}
```

### **用例2: 复杂不规则基坑** ⭐⭐
```json
{
  "testCase": "irregular_pit_with_anchors",
  "priority": "medium",
  "description": "不规则基坑 + 6层锚杆系统",
  "geometryData": {
    "header": {
      "version": "1.0",
      "timestamp": "2025-01-23T10:30:00Z",
      "geometryType": "excavation",
      "coordinateSystem": "LOCAL",
      "units": "meters"
    },
    "excavationGeometry": {
      "boundary": [
        {"x": 0, "y": 0, "z": 0},
        {"x": 60, "y": 0, "z": 0},
        {"x": 65, "y": 20, "z": 0},
        {"x": 45, "y": 35, "z": 0},
        {"x": 15, "y": 40, "z": 0},
        {"x": -5, "y": 25, "z": 0},
        {"x": 0, "y": 0, "z": 0}
      ],
      "depth": 18.0,
      "stages": [
        {"depth": 3.0, "stage_name": "第一层开挖"},
        {"depth": 6.0, "stage_name": "第二层开挖"},
        {"depth": 10.0, "stage_name": "第三层开挖"},
        {"depth": 14.0, "stage_name": "第四层开挖"},
        {"depth": 18.0, "stage_name": "第五层开挖"}
      ]
    },
    "anchorSystem": {
      "totalAnchors": 72,
      "levels": 6,
      "anchors": [
        {
          "id": "anchor_L1_S0_1",
          "levelId": 1,
          "position": {"x": 5.0, "y": 0.4, "z": -2.0},
          "endPosition": {"x": 17.5, "y": 0.4, "z": -5.9},
          "length": 15.0,
          "diameter": 32,
          "angle": 15,
          "preStress": 200
        }
      ]
    },
    "materialZones": [
      {
        "zoneId": "clay_layer",
        "zoneName": "粘土层",
        "materialType": "soil",
        "properties": {
          "density": 1900,
          "elasticModulus": 25000000,
          "poissonRatio": 0.4,
          "cohesion": 20000,
          "frictionAngle": 18,
          "permeability": 5e-10
        }
      },
      {
        "zoneId": "sand_layer", 
        "zoneName": "砂层",
        "materialType": "soil",
        "properties": {
          "density": 2000,
          "elasticModulus": 45000000,
          "poissonRatio": 0.3,
          "cohesion": 0,
          "frictionAngle": 35,
          "permeability": 1e-5
        }
      }
    ]
  },
  "expectedResults": {
    "elementCount": "约8000-12000个四面体",
    "nodeCount": "约2000-3000个节点",
    "processingTime": "<60秒",
    "memoryUsage": "<2GB"
  }
}
```

### **用例3: 极限复杂场景** ⭐
```json
{
  "testCase": "extreme_complex_scenario",
  "priority": "low",
  "description": "大型基坑 + 10层锚杆 + 隧道穿越",
  "geometryData": {
    "header": {
      "version": "1.0",
      "timestamp": "2025-01-23T11:00:00Z",
      "geometryType": "composite",
      "coordinateSystem": "CGCS2000",
      "units": "meters"
    },
    "complexGeometry": {
      "excavation": {
        "area": 5000,
        "maxDepth": 25.0,
        "volume": 62500
      },
      "anchorSystem": {
        "totalAnchors": 240,
        "levels": 10,
        "totalLength": 3600,
        "waleBeams": 48
      },
      "tunnel": {
        "diameter": 6.0,
        "length": 80.0,
        "inclination": 3.5,
        "intersectsExcavation": true
      },
      "diaphragmWall": {
        "thickness": 1.2,
        "perimeter": 280,
        "depth": 30.0
      }
    },
    "meshGuidance": {
      "globalElementSize": 3.0,
      "localRefinement": [
        {
          "region": "tunnel_intersection",
          "targetSize": 0.5,
          "priority": "critical"
        },
        {
          "region": "anchor_connections", 
          "targetSize": 1.0,
          "priority": "high"
        }
      ],
      "qualityRequirements": {
        "minAngle": 15,
        "maxAspectRatio": 5.0,
        "targetQuality": 0.7
      }
    }
  },
  "performanceTest": {
    "maxElementCount": 50000,
    "maxNodeCount": 15000,
    "maxProcessingTime": "300秒",
    "maxMemoryUsage": "8GB"
  }
}
```

---

## 📊 **数据文件输出**

### **文件路径约定**
```
E:\DeepCAD\test_data\geometry\
├── simple_rectangular_pit.json        # 简单矩形基坑
├── irregular_pit_with_anchors.json    # 复杂不规则基坑
├── extreme_complex_scenario.json      # 极限复杂场景
├── geometry_mesh_data.bin             # 二进制网格数据
└── test_results\
    ├── mesh_quality_report.json       # 网格质量报告
    ├── performance_metrics.json       # 性能指标
    └── validation_results.json        # 验证结果
```

### **数据传递API**
```typescript
// 几何数据传递接口
POST /api/geometry/export-for-meshing
{
  "geometryId": "simple_rectangular_pit",
  "targetFormat": "json",
  "includeGuidance": true,
  "optimizeForMeshing": true
}

// 响应格式
{
  "success": true,
  "dataUrl": "/api/geometry/export/simple_rectangular_pit.json",
  "binaryDataUrl": "/api/geometry/export/simple_rectangular_pit_mesh.bin",
  "visualModelUrl": "/api/geometry/export/simple_rectangular_pit.gltf",
  "fileSize": "156KB",
  "checksum": "md5:a1b2c3d4e5f6..."
}
```

---

## 🔄 **希望接收的反馈格式**

### **网格质量反馈** 
```json
{
  "geometryId": "simple_rectangular_pit",
  "timestamp": "2025-01-23T12:00:00Z",
  "processingResults": {
    "success": true,
    "processingTime": 15.6,
    "memoryUsage": "1.2GB"
  },
  "qualityMetrics": {
    "elementCount": 1847,
    "nodeCount": 521,
    "averageQuality": 0.83,
    "minAngle": 22.5,
    "maxAspectRatio": 2.8,
    "skewnessMax": 0.15
  },
  "problemAreas": [
    {
      "issueType": "high_aspect_ratio",
      "severity": "warning", 
      "affectedElements": [234, 567, 890],
      "geometryRegion": "corner",
      "suggestedFix": "减小该区域网格尺寸至1.0m"
    }
  ],
  "geometryOptimization": {
    "adjustMeshSize": [
      {
        "region": "pit_corners",
        "currentSize": 2.0,
        "suggestedSize": 1.5,
        "reason": "改善角点网格质量"
      }
    ],
    "simplifyFeatures": ["minor_chamfers"],
    "topologyChanges": []
  }
}
```

---

## 🚀 **实时数据推送**

### **WebSocket接口**
```javascript
// 连接实时数据流
const ws = new WebSocket('ws://localhost:8084/geometry-mesh-collab');

// 监听几何数据更新
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.eventType) {
    case 'geometry-ready':
      console.log('✅ 几何数据已准备就绪:', data.geometryId);
      break;
      
    case 'mesh-processing-start':
      console.log('🔧 网格生成开始:', data.geometryId);
      break;
      
    case 'mesh-quality-report':
      console.log('📊 网格质量报告:', data.qualityMetrics);
      break;
  }
};

// 发送几何数据
ws.send(JSON.stringify({
  action: 'send-geometry-data',
  geometryId: 'simple_rectangular_pit',
  data: geometryData
}));
```

---

## 📋 **测试检查清单**

### **3号计算专家需验证**
- [ ] **数据格式兼容性** - JSON/Binary格式能否正确解析
- [ ] **网格生成质量** - 是否满足质量要求 
- [ ] **性能表现** - 处理时间和内存使用是否合理
- [ ] **错误处理** - 异常数据的处理能力
- [ ] **实时通信** - WebSocket数据流是否稳定

### **几何数据验证**
- [ ] **几何完整性** - 无自相交、无悬空面
- [ ] **材料分区** - 材料属性正确分配
- [ ] **边界条件** - 约束和载荷定义清晰
- [ ] **尺寸建议** - 网格尺寸指导合理

---

## 🤝 **协作约定**

### **数据交换频率**
- **开发阶段**: 每日同步测试结果
- **问题反馈**: 实时通过WebSocket推送
- **优化建议**: 每周汇总优化建议

### **质量标准**
- **几何精度**: ±1mm
- **网格质量**: 平均质量>0.7
- **处理性能**: <2分钟完成中等复杂度场景

---

## 📞 **联系方式**

**2号几何专家承诺**:
- 🔧 提供稳定的几何数据输出
- 📊 及时响应网格质量反馈
- 🚀 持续优化几何建模算法
- 🤝 配合所有联调测试需求

**测试数据准备完毕！期待与3号计算专家的深度协作！** ✨🏗️