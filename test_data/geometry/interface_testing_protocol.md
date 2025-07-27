# 几何模块接口联调测试协议
## 📋 2号-3号协作测试规范

### 🎯 **测试目标**
- 验证几何数据传递的完整性和准确性 
- 确保网格生成质量满足工程要求
- 优化数据传输性能和实时响应
- 建立稳定的协作工作流程

---

## 🔄 **测试流程**

### **阶段1: 基础连通性测试** (预计1天)
1. **WebSocket连接测试**
   - 验证实时数据通道
   - 测试断线重连机制
   - 确认消息格式兼容性

2. **数据格式验证**
   - JSON格式解析测试
   - 二进制数据传输测试
   - 数据完整性校验

3. **简单几何传递**
   - 传输`simple_rectangular_pit.json`
   - 验证几何数据正确接收
   - 确认材料属性映射

### **阶段2: 复杂场景测试** (预计2天)
1. **锚杆系统数据传递**
   - 传输`complex_anchor_system.json`
   - 验证多材料接口处理
   - 测试约束条件传递

2. **网格质量反馈**
   - 接收网格质量报告
   - 验证问题区域标识
   - 测试优化建议解析

3. **性能压力测试**
   - 传输大规模几何数据
   - 监控内存和CPU使用
   - 测试并发处理能力

### **阶段3: 优化调试** (预计2天)
1. **参数调优**
   - 根据质量反馈调整网格尺寸
   - 优化几何精度设置
   - 微调材料分区策略

2. **错误处理测试**
   - 测试异常数据处理
   - 验证错误恢复机制
   - 完善日志记录

---

## 📊 **测试用例明细**

### **TC001: WebSocket实时通信** ⭐⭐⭐
```javascript
// 测试脚本示例
const testWebSocketConnection = async () => {
  const ws = new WebSocket('ws://localhost:8084/geometry-mesh-collab');
  
  // 连接测试
  await new Promise((resolve, reject) => {
    ws.onopen = () => {
      console.log('✅ WebSocket连接成功');
      resolve();
    };
    ws.onerror = reject;
    setTimeout(reject, 5000); // 5秒超时
  });
  
  // 数据传输测试
  const testData = {
    action: 'geometry-data-transfer',
    geometryId: 'test_connection',
    timestamp: new Date().toISOString(),
    data: { vertices: [0,0,0, 1,0,0, 0,1,0], faces: [0,1,2] }
  };
  
  ws.send(JSON.stringify(testData));
  
  // 响应验证
  const response = await new Promise((resolve) => {
    ws.onmessage = (event) => {
      resolve(JSON.parse(event.data));
    };
  });
  
  console.log('📨 响应数据:', response);
  return response.success === true;
};
```

### **TC002: 简单几何数据传递** ⭐⭐⭐
```json
{
  "testId": "TC002",
  "description": "矩形基坑几何数据传递测试",
  "inputFile": "simple_rectangular_pit.json",
  "expectedOutput": {
    "meshGenerated": true,
    "elementCount": {"min": 1500, "max": 2000},
    "nodeCount": {"min": 400, "max": 600},
    "avgQuality": {"min": 0.6},
    "processingTime": {"max": 30}
  },
  "validationChecks": [
    "几何边界完整性",
    "材料属性正确映射", 
    "网格尺寸符合指导",
    "质量指标达标"
  ]
}
```

### **TC003: 复杂锚杆系统** ⭐⭐
```json
{
  "testId": "TC003", 
  "description": "6层锚杆系统网格生成测试",
  "inputFile": "complex_anchor_system.json",
  "expectedOutput": {
    "meshGenerated": true,
    "elementCount": {"min": 8000, "max": 12000},
    "nodeCount": {"min": 2000, "max": 3000},
    "avgQuality": {"min": 0.5},
    "processingTime": {"max": 120},
    "memoryUsage": {"max": "4GB"}
  },
  "specialChecks": [
    "锚杆-墙体接触面网格质量",
    "腰梁几何正确建模",
    "预应力边界条件",
    "多材料界面处理"
  ]
}
```

### **TC004: 性能压力测试** ⭐
```json
{
  "testId": "TC004",
  "description": "10层锚杆极限场景性能测试", 
  "inputFile": "extreme_ten_layer_scene.json",
  "performanceTargets": {
    "maxProcessingTime": 300,
    "maxMemoryUsage": "8GB",
    "maxElementCount": 50000,
    "minQuality": 0.4
  },
  "stressTest": {
    "concurrentRequests": 3,
    "dataSize": "大型几何(>100MB)",
    "resourceMonitoring": true
  }
}
```

---

## 📈 **质量指标**

### **网格质量标准**
| 指标 | 优秀 | 良好 | 可接受 | 不合格 |
|------|------|------|--------|--------|
| 平均质量 | >0.8 | 0.6-0.8 | 0.4-0.6 | <0.4 |
| 最小角度 | >25° | 15°-25° | 10°-15° | <10° |
| 最大长宽比 | <3.0 | 3.0-5.0 | 5.0-8.0 | >8.0 |
| 扭曲度 | <0.2 | 0.2-0.4 | 0.4-0.6 | >0.6 |

### **性能指标标准**
| 场景 | 处理时间 | 内存使用 | 元素数量 |
|------|----------|----------|----------|
| 简单几何 | <30秒 | <500MB | <2000 |
| 复杂几何 | <120秒 | <2GB | <12000 |
| 极限场景 | <300秒 | <8GB | <50000 |

---

## 🔧 **测试工具和环境**

### **测试工具脚本**
```typescript
// 自动化测试脚本
import { GeometryTestRunner } from './test_runner';

const runInterfaceTests = async () => {
  const runner = new GeometryTestRunner({
    geometryService: 'http://localhost:8080',
    meshingService: 'http://localhost:8081', 
    websocketUrl: 'ws://localhost:8084',
    testDataPath: 'E:\\DeepCAD\\test_data\\geometry'
  });
  
  // 基础连通性测试
  await runner.testConnection();
  
  // 数据传递测试  
  for (const testCase of ['TC001', 'TC002', 'TC003', 'TC004']) {
    const result = await runner.runTest(testCase);
    console.log(`${testCase}: ${result.success ? '✅' : '❌'}`);
    
    if (!result.success) {
      console.error('失败原因:', result.errors);
    }
  }
  
  // 生成测试报告
  await runner.generateReport();
};
```

### **监控和日志**
```javascript
// 实时监控脚本
const monitorInterfaceHealth = () => {
  const metrics = {
    messagesSent: 0,
    messagesReceived: 0,
    avgResponseTime: 0,
    errorCount: 0,
    lastError: null
  };
  
  // WebSocket监控
  ws.onmessage = (event) => {
    metrics.messagesReceived++;
    const data = JSON.parse(event.data);
    
    if (data.eventType === 'mesh-quality-report') {
      console.log('📊 网格质量报告:', data.qualityMetrics);
    }
    
    if (data.eventType === 'error') {
      metrics.errorCount++;
      metrics.lastError = data.message;
      console.error('❌ 接口错误:', data.message);
    }
  };
  
  // 定期输出监控数据
  setInterval(() => {
    console.log('📈 接口健康状况:', metrics);
  }, 30000); // 每30秒
};
```

---

## 📋 **测试检查清单**

### **3号计算专家需要验证的项目**
- [ ] **数据接收**
  - [ ] JSON格式数据能正确解析
  - [ ] 二进制数据能正确读取
  - [ ] 几何数据结构完整
  - [ ] 材料属性正确映射

- [ ] **网格生成**
  - [ ] 能根据几何数据生成网格
  - [ ] 网格质量满足要求
  - [ ] 材料分区正确识别
  - [ ] 边界条件正确应用

- [ ] **质量反馈**
  - [ ] 能生成质量评估报告
  - [ ] 问题区域准确标识
  - [ ] 优化建议合理可行
  - [ ] 反馈格式符合API规范

- [ ] **性能表现**
  - [ ] 处理时间在可接受范围
  - [ ] 内存使用控制合理
  - [ ] 能处理大规模几何数据
  - [ ] 错误处理机制完善

### **2号几何专家需要验证的项目**
- [ ] **数据输出**
  - [ ] 几何数据格式标准化
  - [ ] 网格指导信息准确
  - [ ] 材料分区定义清晰
  - [ ] 边界条件完整

- [ ] **反馈处理**
  - [ ] 能正确解析质量反馈
  - [ ] 根据反馈调整参数
  - [ ] 优化建议能有效执行
  - [ ] 迭代改进流程顺畅

---

## 🤝 **协作约定**

### **测试时间安排**
- **每日联调时间**: 上午10:00-12:00，下午14:00-16:00
- **问题反馈**: 实时通过WebSocket或即时消息
- **周总结**: 每周五汇总测试结果和改进建议

### **沟通协议**
- **紧急问题**: 立即通知，30分钟内响应
- **一般问题**: 当日反馈，次日处理
- **优化建议**: 每周汇总，统一讨论

### **测试数据管理**
- **数据更新**: 几何数据变更时立即通知
- **版本管理**: 使用版本号标识测试数据
- **结果归档**: 所有测试结果保存备查

---

## 📞 **联系和支持**

**2号几何专家承诺**:
- 🔧 提供稳定可靠的几何数据
- 📊 及时响应质量反馈和优化建议  
- 🚀 持续改进几何建模算法
- 🤝 全力配合所有测试需求

**期待与3号计算专家的紧密协作，共同打造高质量的深基坑分析系统！** ✨🏗️

---

## 📈 **测试进度跟踪**

| 测试阶段 | 计划时间 | 实际时间 | 完成状态 | 备注 |
|----------|----------|----------|----------|------|
| 基础连通性 | 1天 | - | 🔄 准备中 | 等待3号就绪 |
| 复杂场景 | 2天 | - | ⏳ 待开始 | - |
| 优化调试 | 2天 | - | ⏳ 待开始 | - |
| **总计** | **5天** | - | **0%** | 随时可开始 |