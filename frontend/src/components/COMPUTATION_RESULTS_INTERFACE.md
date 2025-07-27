# 📊 3号计算专家 - 结果显示接口

**为0号架构师提供的计算结果显示和处理接口**

## 🎯 计算结果数据结构

### 核心结果接口

```typescript
interface ComputationResults {
  // 深基坑计算结果
  excavationResults?: DeepExcavationResults;
  
  // 施工阶段分析结果
  stageResults?: PyVistaStageResult[];
  
  // 安全评估结果
  safetyResults?: SafetyAssessmentResult;
  
  // 应力数据
  stressData?: PyVistaStressData;
  
  // 渗流数据
  seepageData?: PyVistaSeepageData;
  
  // 变形数据
  deformationData?: PyVistaDeformationData;
  
  // 2号专家几何数据
  geometryModels?: GeometryModel[];
  
  // 网格数据
  meshData?: MeshData;
}
```

### 详细结果类型定义

```typescript
// 深基坑计算结果
interface DeepExcavationResults {
  // 基本信息
  analysisId: string;
  timestamp: Date;
  computationTime: number; // 秒
  
  // 计算参数
  parameters: {
    excavationDepth: number;
    excavationWidth: number;
    excavationLength: number;
    soilLayers: SoilLayerData[];
    retainingSystem: RetainingSystemData;
  };
  
  // 主要结果
  results: {
    // 整体稳定性
    overallStability: {
      safetyFactor: number;        // 整体安全系数
      stabilityStatus: 'safe' | 'warning' | 'critical';
      criticalFailureMode: string;
    };
    
    // 变形结果
    deformation: {
      maxHorizontalDisplacement: number;    // 最大水平位移(mm)
      maxVerticalDisplacement: number;      // 最大竖向位移(mm)
      maxWallDeformation: number;           // 围护墙最大变形(mm)
      groundSettlement: number[];           // 地表沉降分布
    };
    
    // 应力结果
    stress: {
      maxPrincipalStress: number;           // 最大主应力(kPa)
      minPrincipalStress: number;           // 最小主应力(kPa)
      maxShearStress: number;               // 最大剪应力(kPa)
      vonMisesStress: number[];             // 冯米塞斯应力分布
    };
    
    // 支撑力结果
    supportForces: {
      maxStrutForce: number;                // 最大支撑力(kN)
      strutForceDistribution: number[];    // 支撑力分布
      anchorForces: number[];               // 锚杆力分布
    };
    
    // 渗流结果
    seepage: {
      maxSeepageVelocity: number;           // 最大渗流速度(m/s)
      totalInflow: number;                  // 总入渗量(m³/day)
      pipingRiskAreas: RiskArea[];          // 管涌风险区域
      upliftPressure: number[];             // 底板抗浮压力
    };
  };
  
  // 3D网格数据
  mesh: {
    vertices: Float32Array;     // 顶点坐标
    faces: Uint32Array;         // 面索引
    normals: Float32Array;      // 法向量
    nodeCount: number;          // 节点数
    elementCount: number;       // 单元数
  };
  
  // 可视化数据
  visualization: {
    stressField: Float32Array;      // 应力场数据
    displacementField: Float32Array; // 位移场数据
    seepageField: {
      velocityVectors: Float32Array;     // 速度矢量
      velocityMagnitude: Float32Array;   // 速度大小
      poreWaterPressure: Float32Array;   // 孔隙水压力
    };
  };
}

// 施工阶段结果
interface PyVistaStageResult {
  stageId: number;
  stageName: string;
  stageDescription: string;
  constructionDays: number;
  
  // 该阶段的变形增量
  incrementalDeformation: {
    horizontalDisplacement: Float32Array;
    verticalDisplacement: Float32Array;
    wallDeformation: Float32Array;
  };
  
  // 该阶段的应力状态
  stressState: {
    totalStress: Float32Array;
    effectiveStress: Float32Array;
    poreWaterPressure: Float32Array;
  };
  
  // 该阶段的稳定性
  stageStability: {
    safetyFactor: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    criticalElements: number[];
  };
}

// 安全评估结果
interface SafetyAssessmentResult {
  // 总体评估
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  overallSafetyScore: number; // 0-100分
  
  // 各项风险评估
  riskAssessment: {
    // 整体稳定风险
    overallStability: {
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      safetyMargin: number;
      criticalFactors: string[];
    };
    
    // 局部失稳风险
    localInstability: {
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      riskAreas: RiskArea[];
      preventiveMeasures: string[];
    };
    
    // 渗流破坏风险
    seepageFailure: {
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      pipingRisk: number;        // 管涌风险系数
      upliftRisk: number;        // 抗浮风险系数
      drainageEfficiency: number; // 降水效率
    };
    
    // 变形超限风险
    excessiveDeformation: {
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      maxDeformationRatio: number;  // 最大变形比
      affectedStructures: string[]; // 受影响建筑
    };
  };
  
  // 监测建议
  monitoringRecommendations: {
    monitoringPoints: MonitoringPoint[];
    monitoringFrequency: string;
    alertThresholds: AlertThreshold[];
  };
  
  // 应急预案
  emergencyResponse: {
    triggerConditions: string[];
    responseProcedures: string[];
    contactPersons: string[];
  };
}

// 辅助类型定义
interface RiskArea {
  id: string;
  location: { x: number; y: number; z: number };
  riskType: string;
  severity: number; // 0-1
  description: string;
}

interface MonitoringPoint {
  id: string;
  type: 'displacement' | 'stress' | 'pore_pressure' | 'groundwater';
  location: { x: number; y: number; z: number };
  frequency: 'hourly' | 'daily' | 'weekly';
}

interface AlertThreshold {
  parameter: string;
  yellowAlert: number;   // 黄色预警阈值
  redAlert: number;      // 红色预警阈值
  unit: string;
}
```

## 🎨 结果显示组件接口

### 主要显示组件

```typescript
// 结果总览组件
interface ComputationResultsOverviewProps {
  results: ComputationResults;
  onDetailView?: (resultType: string) => void;
  theme?: 'dark' | 'light';
}

// 3D可视化组件
interface ResultsVisualizationProps {
  results: ComputationResults;
  scene: THREE.Scene;
  visualizationType: 'stress' | 'displacement' | 'seepage' | 'safety';
  showAnimations?: boolean;
  onVisualizationChange?: (type: string) => void;
}

// 数据表格组件
interface ResultsDataTableProps {
  results: ComputationResults;
  dataType: 'summary' | 'detailed' | 'stages';
  exportEnabled?: boolean;
  onExport?: (format: 'csv' | 'excel' | 'pdf') => void;
}

// 安全评估显示组件
interface SafetyAssessmentDisplayProps {
  safetyResults: SafetyAssessmentResult;
  showRecommendations?: boolean;
  onActionRequired?: (action: string) => void;
}
```

## 🔌 使用接口示例

### 1. 监听计算结果

```typescript
import { ComputationModuleIntegration } from './components';

const computationModule = new ComputationModuleIntegration(config);

// 监听结果更新
computationModule.onStateChange('results_updated', (results: ComputationResults) => {
  console.log('计算结果更新:', results);
  
  // 处理不同类型的结果
  if (results.excavationResults) {
    handleExcavationResults(results.excavationResults);
  }
  
  if (results.safetyResults) {
    handleSafetyResults(results.safetyResults);
  }
  
  if (results.stressData) {
    updateStressVisualization(results.stressData);
  }
});

// 处理具体结果
const handleExcavationResults = (results: DeepExcavationResults) => {
  // 显示主要指标
  const {
    overallStability,
    deformation,
    stress,
    supportForces,
    seepage
  } = results.results;
  
  // 更新UI显示
  updateStabilityIndicator(overallStability);
  updateDeformationCharts(deformation);
  updateStressContours(stress);
  updateSupportForceDisplay(supportForces);
  updateSeepageVisualization(seepage);
};
```

### 2. 结果显示组件使用

```typescript
const ResultsDisplayPage: React.FC = () => {
  const [computationResults, setComputationResults] = useState<ComputationResults | null>(null);
  const [selectedVisualization, setSelectedVisualization] = useState<string>('stress');

  return (
    <div className="results-display-container">
      {/* 结果总览 */}
      {computationResults && (
        <ComputationResultsOverview 
          results={computationResults}
          onDetailView={(type) => setSelectedVisualization(type)}
          theme="dark"
        />
      )}
      
      {/* 3D可视化 */}
      {computationResults && (
        <ResultsVisualization
          results={computationResults}
          scene={threeScene}
          visualizationType={selectedVisualization}
          showAnimations={true}
          onVisualizationChange={setSelectedVisualization}
        />
      )}
      
      {/* 安全评估显示 */}
      {computationResults?.safetyResults && (
        <SafetyAssessmentDisplay
          safetyResults={computationResults.safetyResults}
          showRecommendations={true}
          onActionRequired={(action) => handleSafetyAction(action)}
        />
      )}
      
      {/* 数据表格 */}
      {computationResults && (
        <ResultsDataTable
          results={computationResults}
          dataType="summary"
          exportEnabled={true}
          onExport={(format) => exportResults(format)}
        />
      )}
    </div>
  );
};
```

### 3. 结果数据处理

```typescript
// 结果数据处理工具函数
export class ComputationResultsProcessor {
  
  // 提取关键指标
  static extractKeyMetrics(results: ComputationResults): KeyMetrics {
    return {
      safetyFactor: results.excavationResults?.results.overallStability.safetyFactor || 0,
      maxDeformation: results.excavationResults?.results.deformation.maxHorizontalDisplacement || 0,
      maxStress: results.excavationResults?.results.stress.maxPrincipalStress || 0,
      riskLevel: results.safetyResults?.overallRiskLevel || 'unknown',
      computationTime: results.excavationResults?.computationTime || 0
    };
  }
  
  // 生成结果摘要
  static generateSummary(results: ComputationResults): ResultsSummary {
    const metrics = this.extractKeyMetrics(results);
    
    return {
      title: '深基坑计算分析结果',
      timestamp: new Date(),
      keyFindings: [
        `整体安全系数: ${metrics.safetyFactor.toFixed(2)}`,
        `最大水平位移: ${metrics.maxDeformation.toFixed(1)}mm`,
        `最大主应力: ${(metrics.maxStress / 1000).toFixed(1)}MPa`,
        `风险等级: ${this.translateRiskLevel(metrics.riskLevel)}`
      ],
      recommendations: this.generateRecommendations(metrics)
    };
  }
  
  // 检查结果异常
  static checkAnomalies(results: ComputationResults): ResultAnomaly[] {
    const anomalies: ResultAnomaly[] = [];
    
    // 检查安全系数
    const safetyFactor = results.excavationResults?.results.overallStability.safetyFactor;
    if (safetyFactor && safetyFactor < 1.2) {
      anomalies.push({
        type: 'safety_factor_low',
        severity: 'critical',
        description: '安全系数过低，存在失稳风险',
        value: safetyFactor,
        threshold: 1.2
      });
    }
    
    // 检查变形
    const maxDeformation = results.excavationResults?.results.deformation.maxHorizontalDisplacement;
    if (maxDeformation && maxDeformation > 30) {
      anomalies.push({
        type: 'excessive_deformation',
        severity: 'warning',
        description: '水平位移过大',
        value: maxDeformation,
        threshold: 30
      });
    }
    
    return anomalies;
  }
}

// 辅助类型
interface KeyMetrics {
  safetyFactor: number;
  maxDeformation: number;
  maxStress: number;
  riskLevel: string;
  computationTime: number;
}

interface ResultsSummary {
  title: string;
  timestamp: Date;
  keyFindings: string[];
  recommendations: string[];
}

interface ResultAnomaly {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  value: number;
  threshold: number;
}
```

## 📊 结果导出接口

### 导出功能

```typescript
// 结果导出服务
export class ComputationResultsExporter {
  
  // 导出为Excel
  static async exportToExcel(results: ComputationResults): Promise<Blob> {
    const workbook = {
      sheets: {
        '计算结果摘要': this.createSummarySheet(results),
        '详细数据': this.createDetailSheet(results),
        '安全评估': this.createSafetySheet(results),
        '可视化数据': this.createVisualizationSheet(results)
      }
    };
    
    return this.generateExcelBlob(workbook);
  }
  
  // 导出为PDF报告
  static async exportToPDF(results: ComputationResults): Promise<Blob> {
    const reportData = {
      title: '深基坑计算分析报告',
      timestamp: new Date(),
      summary: ComputationResultsProcessor.generateSummary(results),
      keyMetrics: ComputationResultsProcessor.extractKeyMetrics(results),
      anomalies: ComputationResultsProcessor.checkAnomalies(results),
      visualizations: await this.generateVisualizationImages(results)
    };
    
    return this.generatePDFBlob(reportData);
  }
  
  // 导出为JSON
  static exportToJSON(results: ComputationResults): string {
    return JSON.stringify(results, null, 2);
  }
}
```

## 🎨 UI样式规范

### 结果显示样式

```css
/* 结果总览样式 */
.computation-results-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.result-metric-card {
  background: var(--computation-surface);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--computation-border);
}

.metric-value {
  font-size: 2rem;
  font-weight: bold;
  color: var(--computation-primary);
  margin-bottom: 8px;
}

.metric-label {
  color: var(--computation-text-secondary);
  font-size: 0.9rem;
}

.metric-status {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-safe { background: #f6ffed; color: #52c41a; }
.status-warning { background: #fffbe6; color: #faad14; }
.status-critical { background: #fff2f0; color: #ff4d4f; }

/* 3D可视化容器 */
.results-visualization-container {
  background: var(--computation-background);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  position: relative;
  min-height: 500px;
}

.visualization-controls {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
  z-index: 10;
}

.visualization-button {
  background: var(--computation-surface);
  border: 1px solid var(--computation-border);
  color: var(--computation-text);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.visualization-button:hover {
  background: var(--computation-primary);
  color: white;
}

.visualization-button.active {
  background: var(--computation-primary);
  color: white;
}
```

## 📞 技术支持

### 联系信息
- **技术负责人**: 3号计算专家
- **支持内容**: 结果数据结构、显示接口、导出功能
- **响应时间**: 实时技术支持

### 常见问题
1. **结果数据为空**: 检查计算是否完成
2. **可视化异常**: 确认Three.js场景正确传入
3. **导出失败**: 检查浏览器导出权限

---

**🎯 3号计算专家**  
*专业计算结果处理，为0号架构师提供完整的结果显示解决方案！*

**文件位置**: `E:\DeepCAD\frontend\src\components\COMPUTATION_RESULTS_INTERFACE.md`