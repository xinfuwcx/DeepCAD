# 🎯 2号几何专家接口文档 - 主界面集成指南

## 📋 概述

本文档为0号架构师提供完整的2号几何专家系统接口规范，用于将增强几何建模功能集成到主界面中。基于最新的高级算法实现，包含完整的UI组件、API接口和集成流程。

---

## 🔧 核心服务接口

### 1. 增强RBF插值服务

**端点**: `POST /api/geometry/enhanced-rbf-interpolation`

**输入格式**:
```typescript
interface RBFInterpolationRequest {
  boreholes: BoreholePoint[];
  config: {
    kernelType: 'gaussian' | 'multiquadric' | 'thin_plate_spline' | 'cubic';
    kernelParameter: number;
    smoothingFactor: number;
    meshCompatibility: {
      targetMeshSize: number;
      qualityThreshold: number;
      maxElements: number;
    };
    optimization: {
      adaptiveRefinement: boolean;
      cornerPreservation: boolean;
      useParallelProcessing: boolean;
    };
  };
}
```

**输出格式**:
```typescript
interface RBFInterpolationResponse {
  success: boolean;
  expert_id: "2号几何专家";
  algorithm: "enhanced_rbf_interpolation_v2";
  interpolation_result: {
    kernel_type: string;
    smoothing_factor: number;
    r_squared: number;
    cross_validation_score: number;
  };
  geometry_data: {
    vertices: number[];
    faces: number[];
    normals: number[];
  };
  quality_metrics: {
    mesh_quality: number;
    interpolation_accuracy: number;
    fragment_compliance: boolean;
  };
  performance: {
    processing_time_ms: number;
    memory_usage_mb: number;
    parallel_efficiency: number;
  };
}
```

---

### 2. 高级开挖几何生成服务

**端点**: `POST /api/geometry/advanced-excavation`

**输入格式**:
```typescript
interface ExcavationRequest {
  excavation_data: {
    id: string;
    name: string;
    excavationType: string;
    totalDepth: number;
    area: number;
    slopeRatio: number;
    drainageSystem: boolean;
    coordinates: { x: number; y: number; z: number }[];
    stages: { stage_id: string; depth: number }[];
  };
  design_parameters: {
    safetyFactor: number;
    groundwaterLevel: number;
    temporarySlope: boolean;
    supportRequired: boolean;
  };
  algorithm_config: {
    precision: 'speed' | 'balanced' | 'accuracy' | 'quality';
    enableOptimization: boolean;
    enableMonitoring: boolean;
  };
}
```

**输出格式**:
```typescript
interface ExcavationResponse {
  success: boolean;
  geometry_id: string;
  excavation_volume: number;
  surface_area: number;
  stages: {
    stage_id: string;
    depth: number;
    volume: number;
  }[];
  mesh_data: {
    vertices: number[];
    faces: number[];
    normals: number[];
  };
  gltf_url: string;
  performance_metrics: {
    memory_usage: number;
    cpu_utilization: number;
    algorithm_efficiency: number;
  };
  warnings: string[];
}
```

---

### 3. 智能支护结构生成服务

**端点**: `POST /api/support/intelligent-generation`

**输入格式**:
```typescript
interface SupportGenerationRequest {
  geometry_data: {
    excavation_id: string;
    dimensions: { width: number; height: number; depth: number };
    soil_properties: { cohesion: number; friction_angle: number; density: number };
  };
  system_config: {
    enabledTypes: {
      diaphragmWall: boolean;
      pileSystem: boolean;
      anchorSystem: boolean;
      steelSupport: boolean;
    };
    advanced: {
      meshResolution: 'low' | 'medium' | 'high' | 'ultra';
      performanceMode: 'speed' | 'balanced' | 'accuracy' | 'quality';
      enableSmartOptimization: boolean;
      enableRealTimeMonitoring: boolean;
    };
  };
}
```

**输出格式**:
```typescript
interface SupportGenerationResponse {
  success: boolean;
  structure_id: string;
  structure_type: string;
  components: {
    type: string;
    count: number;
    volume: number;
    parameters: Record<string, any>;
  }[];
  total_volume: number;
  safety_factor: number;
  structural_analysis: {
    max_displacement: number;
    max_stress: number;
    stability_coefficient: number;
  };
  construction_guidance: string[];
  gltf_url: string;
}
```

---

### 4. 几何质量评估服务

**端点**: `POST /api/geometry/quality-assessment`

**输入格式**:
```typescript
interface QualityAssessmentRequest {
  geometry_data: {
    vertices: number[];
    faces: number[];
    format: 'mesh' | 'pointcloud' | 'cad';
  };
  standards: {
    fragment_compliance: boolean;
    custom_thresholds?: {
      min_element_quality: number;
      max_aspect_ratio: number;
      max_element_count: number;
    };
  };
}
```

**输出格式**:
```typescript
interface QualityAssessmentResponse {
  success: boolean;
  assessment_id: string;
  overall_score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  fragment_compliance: {
    mesh_size_range: string;
    element_quality: string;
    element_count: string;
    aspect_ratio: string;
  };
  detailed_metrics: {
    average_element_quality: number;
    min_jacobian_determinant: number;
    max_aspect_ratio: number;
    degenerate_elements: number;
  };
  recommendations: string[];
}
```

---

## 🖥️ React组件接口

### 1. EnhancedGeologyModule 组件

**组件路径**: `frontend/src/components/EnhancedGeologyModule.tsx`

**Props接口**:
```typescript
interface EnhancedGeologyModuleProps {
  onGeologyModelGenerated?: (modelData: GeologyModelData) => void;
  onError?: (error: Error) => void;
  initialConfig?: Partial<RBFAdvancedConfig>;
  className?: string;
  style?: CSSProperties;
}

interface GeologyModelData {
  modelId: string;
  vertices: Float32Array;
  faces: Uint32Array;
  quality: QualityMetrics;
  gltfUrl: string;
}
```

**集成示例**:
```typescript
import { EnhancedGeologyModule } from '@/components/EnhancedGeologyModule';

<EnhancedGeologyModule
  onGeologyModelGenerated={(modelData) => {
    // 处理生成的地质模型
    console.log('地质模型已生成:', modelData);
    // 可以将模型数据传递给3D视口或其他组件
    update3DViewport(modelData);
  }}
  onError={(error) => {
    console.error('地质建模错误:', error);
    showErrorNotification(error.message);
  }}
  initialConfig={{
    kernelType: 'gaussian',
    smoothingFactor: 0.1,
    meshCompatibility: {
      targetMeshSize: 2.0,
      qualityThreshold: 0.65,
      maxElements: 2000000
    }
  }}
/>
```

---

### 2. EnhancedSupportModule 组件

**组件路径**: `frontend/src/components/EnhancedSupportModule.tsx`

**Props接口**:
```typescript
interface EnhancedSupportModuleProps {
  excavationData?: ExcavationData;
  onSupportGenerated?: (supportData: SupportStructureData) => void;
  onError?: (error: Error) => void;
  initialConfig?: Partial<SupportSystemConfig>;
  className?: string;
  style?: CSSProperties;
}

interface SupportStructureData {
  structureId: string;
  components: SupportComponent[];
  totalVolume: number;
  safetyFactor: number;
  gltfUrl: string;
}
```

**集成示例**:
```typescript
import { EnhancedSupportModule } from '@/components/EnhancedSupportModule';

<EnhancedSupportModule
  excavationData={currentExcavation}
  onSupportGenerated={(supportData) => {
    // 处理生成的支护结构
    console.log('支护结构已生成:', supportData);
    // 更新3D视图和分析结果
    update3DViewport(supportData);
    updateAnalysisPanel(supportData);
  }}
  onError={(error) => {
    console.error('支护生成错误:', error);
  }}
  initialConfig={{
    enabledTypes: {
      diaphragmWall: true,
      pileSystem: true,
      anchorSystem: false,
      steelSupport: true
    },
    advanced: {
      meshResolution: 'high',
      performanceMode: 'balanced',
      enableSmartOptimization: true,
      enableRealTimeMonitoring: true
    }
  }}
/>
```

---

### 3. GeometryViewport3D 组件

**组件路径**: `frontend/src/components/geometry/GeometryViewport3D.tsx`

**Props接口**:
```typescript
interface GeometryViewport3DProps {
  geometryData?: GeometryData[];
  cameraConfig?: CameraConfig;
  renderConfig?: RenderConfig;
  onGeometrySelect?: (geometry: GeometryData) => void;
  onViewportReady?: (viewport: GeometryViewport3D) => void;
  className?: string;
  style?: CSSProperties;
}

interface GeometryData {
  id: string;
  type: 'geology' | 'excavation' | 'support';
  vertices: Float32Array;
  faces: Uint32Array;
  materials: Material[];
  transform: Matrix4;
}
```

---

### 4. CADToolbar 组件

**组件路径**: `frontend/src/components/geometry/CADToolbar.tsx`

**Props接口**:
```typescript
interface CADToolbarProps {
  onToolSelect?: (tool: CADTool) => void;
  onGeometryCreate?: (geometry: CADGeometry) => void;
  onOperation?: (operation: CADOperation) => void;
  activeGeometry?: CADGeometry[];
  className?: string;
  style?: CSSProperties;
}

interface CADTool {
  id: string;
  name: string;
  category: 'geometry' | 'boolean' | 'transform' | 'utility';
  icon: string;
  parameters: Record<string, any>;
}
```

---

## 🔗 服务集成接口

### GeometryAlgorithmIntegration 服务

```typescript
import { geometryAlgorithmIntegration } from '@/services/GeometryAlgorithmIntegration';

// 增强RBF插值
const interpolationResult = await geometryAlgorithmIntegration.enhancedRBFInterpolation({
  boreholes: boreholeData,
  config: rbfConfig
});

// DXF几何处理
const dxfResult = await geometryAlgorithmIntegration.processDXFGeometry({
  dxfFile: file,
  config: processingConfig
});

// 网格质量评估
const qualityResult = await geometryAlgorithmIntegration.assessGeometryQuality({
  geometry: meshData,
  standards: fragmentStandards
});
```

---

## 📡 WebSocket实时通信

### 连接配置
```typescript
const wsConnection = new WebSocket('ws://localhost:8084/ws/geometry-expert');

wsConnection.onopen = () => {
  console.log('已连接到2号几何专家服务');
};

wsConnection.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'progress_update':
      // 处理进度更新
      updateProgress(data.progress);
      break;
    case 'geometry_ready':
      // 处理几何生成完成
      handleGeometryReady(data.geometry);
      break;
    case 'quality_assessment':
      // 处理质量评估结果
      handleQualityResult(data.assessment);
      break;
  }
};
```

### 消息格式
```typescript
// 进度更新消息
interface ProgressMessage {
  type: 'progress_update';
  operation: string;
  progress: number; // 0-100
  stage: string;
  estimated_time: number;
}

// 几何完成消息
interface GeometryReadyMessage {
  type: 'geometry_ready';
  geometry_id: string;  
  geometry_data: GeometryData;
  quality_metrics: QualityMetrics;
  file_urls: {
    gltf: string;
    mesh: string;
  };
}
```

---

## 🔄 主界面集成流程

### 1. 初始化集成
```typescript
// 在主应用中初始化几何专家服务
class MainApplication {
  async initializeGeometryExpert() {
    // 检查服务可用性
    const healthCheck = await fetch('/api/health');
    if (!healthCheck.ok) {
      throw new Error('2号几何专家服务不可用');
    }
    
    // 建立WebSocket连接
    this.setupWebSocketConnection();
    
    // 初始化核心组件
    this.initializeGeometryComponents();
  }
  
  setupWebSocketConnection() {
    this.wsConnection = new WebSocket('ws://localhost:8084/ws/geometry-expert');
    this.wsConnection.onmessage = this.handleGeometryMessages.bind(this);
  }
}
```

### 2. 工作流集成
```typescript
// 完整工作流示例
class GeologyWorkflow {
  async executeCompleteWorkflow(projectData: ProjectData) {
    try {
      // 1. 地质建模
      const geologyModel = await this.performGeologyModeling(projectData.boreholes);
      
      // 2. 开挖设计
      const excavationDesign = await this.designExcavation(geologyModel, projectData.excavationParams);
      
      // 3. 支护结构设计
      const supportStructure = await this.designSupportStructure(excavationDesign);
      
      // 4. 质量评估
      const qualityAssessment = await this.assessOverallQuality([
        geologyModel,
        excavationDesign,
        supportStructure
      ]);
      
      return {
        geology: geologyModel,
        excavation: excavationDesign,
        support: supportStructure,
        quality: qualityAssessment
      };
      
    } catch (error) {
      console.error('工作流执行失败:', error);
      throw error;
    }
  }
}
```

---

## 🎨 UI布局建议

### 主界面布局结构
```typescript
// 建议的主界面布局
<Layout className="main-layout">
  <Header className="main-header">
    <ProjectSelector />
    <GeometryExpertStatus />
  </Header>
  
  <Layout>
    <Sider className="geometry-panel">
      <Tabs>
        <TabPane tab="地质建模" key="geology">
          <EnhancedGeologyModule {...geologyProps} />
        </TabPane>
        <TabPane tab="开挖设计" key="excavation">
          <ExcavationDesign {...excavationProps} />
        </TabPane>
        <TabPane tab="支护结构" key="support">
          <EnhancedSupportModule {...supportProps} />
        </TabPane>
      </Tabs>
    </Sider>
    
    <Content className="main-content">
      <GeometryViewport3D {...viewportProps} />
      <CADToolbar {...toolbarProps} />
    </Content>
    
    <Sider className="analysis-panel">
      <QualityAssessment />
      <PerformanceMonitor />
      <ExportOptions />
    </Sider>
  </Layout>
</Layout>
```

---

## 📊 性能监控接口

### 性能指标
```typescript
interface PerformanceMetrics {
  algorithm_performance: {
    rbf_interpolation_time: number;
    mesh_generation_time: number;
    boolean_operations_time: number;
  };
  resource_usage: {
    memory_mb: number;
    cpu_percent: number;
    gpu_utilization: number;
  };
  quality_metrics: {
    mesh_quality: number;
    fragment_compliance: boolean;
    element_count: number;
  };
}

// 获取实时性能数据
const performanceData = await fetch('/api/performance/metrics');
```

---

## 🔧 配置管理

### 全局配置
```typescript
interface GeometryExpertConfig {
  api_base_url: string;
  websocket_url: string;
  default_quality_standards: QualityStandards;
  performance_targets: PerformanceTargets;
  ui_preferences: UIPreferences;
}

// 配置文件示例 (geometry-expert-config.json)
{
  "api_base_url": "http://localhost:8084/api",
  "websocket_url": "ws://localhost:8084/ws/geometry-expert",
  "default_quality_standards": {
    "fragment_compliance": true,
    "target_mesh_size": 2.0,
    "min_element_quality": 0.65,
    "max_element_count": 2000000
  },
  "performance_targets": {
    "rbf_interpolation_timeout": 30000,
    "mesh_generation_timeout": 60000,
    "memory_limit_mb": 4096
  },
  "ui_preferences": {
    "enable_real_time_updates": true,
    "show_performance_metrics": true,
    "auto_save_interval": 300000
  }
}
```

---

## 🛠️ 错误处理

### 错误类型定义
```typescript
enum GeometryExpertErrorType {
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INVALID_INPUT = 'INVALID_INPUT', 
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  QUALITY_CHECK_FAILED = 'QUALITY_CHECK_FAILED',
  TIMEOUT = 'TIMEOUT',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED'
}

interface GeometryExpertError {
  type: GeometryExpertErrorType;
  message: string;
  details: Record<string, any>;
  suggestions: string[];
}
```

### 错误处理示例
```typescript
try {
  const result = await geometryAlgorithmIntegration.enhancedRBFInterpolation(request);
} catch (error) {
  if (error.type === GeometryExpertErrorType.SERVICE_UNAVAILABLE) {
    // 显示服务不可用提示
    showServiceUnavailableDialog();
  } else if (error.type === GeometryExpertErrorType.QUALITY_CHECK_FAILED) {
    // 显示质量检查失败详情
    showQualityIssuesDialog(error.details);
  }
}
```

---

## 📚 集成测试指南

### 测试检查清单
```typescript
// 集成测试检查项
const integrationChecklist = [
  '✅ API服务健康检查通过',
  '✅ WebSocket连接建立成功', 
  '✅ React组件正确渲染',
  '✅ 数据流向正确传递',
  '✅ 错误处理机制有效',
  '✅ 性能指标符合预期',
  '✅ 质量标准验证通过',
  '✅ UI交互响应正常'
];
```

### 测试用例示例
```typescript
describe('几何专家主界面集成', () => {
  test('应该成功初始化几何专家服务', async () => {
    const app = new MainApplication();
    await expect(app.initializeGeometryExpert()).resolves.toBeTruthy();
  });
  
  test('应该正确处理地质建模请求', async () => {
    const module = new EnhancedGeologyModule(testProps);
    const result = await module.performGeologyModeling(testData);
    expect(result.success).toBeTruthy();
    expect(result.quality_metrics.fragment_compliance).toBeTruthy();
  });
});
```

---

## 🚀 部署配置

### 生产环境配置
```bash
# 环境变量设置
export GEOMETRY_EXPERT_API_URL=https://api.deepcad.com/geometry-expert
export GEOMETRY_EXPERT_WS_URL=wss://api.deepcad.com/ws/geometry-expert
export GEOMETRY_EXPERT_TIMEOUT=30000
export GEOMETRY_EXPERT_MEMORY_LIMIT=4096
```

### Docker配置
```dockerfile
# geometry-expert-integration.dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 📞 技术支持

### 联系方式
- **专家**: 2号几何专家
- **服务端口**: 8084
- **WebSocket**: ws://localhost:8084/ws/geometry-expert
- **文档**: /api/docs
- **健康检查**: /api/health

### 常见问题
1. **Q**: 服务启动失败怎么办？
   **A**: 检查端口8084是否被占用，运行 `python start_expert_backend.py`

2. **Q**: 几何生成很慢怎么办？
   **A**: 调整性能模式为'speed'，降低网格分辨率

3. **Q**: 质量检查不通过怎么办？
   **A**: 检查Fragment标准设置，调整网格参数

---

**📋 集成清单完成状态**: ✅ 就绪
**🎯 建议下一步**: 按照本文档进行逐步集成测试
**📞 如需支持**: 联系2号几何专家进行技术协助