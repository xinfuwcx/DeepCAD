# 📊 3号计算专家 - 结果显示技术规范

**为0号架构师提供的计算结果显示技术文档**

## 🎯 技术架构概览

### 核心显示系统
- **3D可视化引擎**: Three.js + WebGPU加速渲染
- **数据处理管线**: PyVista后处理 + 标准化接口
- **实时更新机制**: 事件驱动 + 状态管理
- **导出系统**: Excel/PDF/JSON多格式支持

## 📊 核心数据接口

### 计算结果主接口
```typescript
interface ComputationResults {
  // 深基坑计算结果
  excavationResults?: DeepExcavationResults;
  
  // 施工阶段分析结果
  stageResults?: PyVistaStageResult[];
  
  // 安全评估结果
  safetyResults?: SafetyAssessmentResult;
  
  // 应力数据（Three.js可视化用）
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

### 深基坑分析结果详细结构
```typescript
interface DeepExcavationResults {
  // 基本信息
  analysisId: string;
  timestamp: Date;
  computationTime: number; // 计算时间(秒)
  
  // 计算参数
  parameters: {
    excavationDepth: number;    // 开挖深度(m)
    excavationWidth: number;    // 开挖宽度(m)
    excavationLength: number;   // 开挖长度(m)
    soilLayers: SoilLayerData[];
    retainingSystem: RetainingSystemData;
  };
  
  // 主要结果
  results: {
    // 整体稳定性
    overallStability: {
      safetyFactor: number;        // 整体安全系数
      stabilityStatus: 'safe' | 'warning' | 'critical';
      criticalFailureMode: string; // 关键破坏模式
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
  
  // 3D网格数据（Three.js渲染用）
  mesh: {
    vertices: Float32Array;     // 顶点坐标
    faces: Uint32Array;         // 面索引
    normals: Float32Array;      // 法向量
    nodeCount: number;          // 节点数
    elementCount: number;       // 单元数
  };
  
  // 可视化数据（GPU渲染优化）
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
```

### 安全评估结果接口
```typescript
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
```

## 🎨 显示组件技术规范

### 1. 结果总览组件
```typescript
interface ComputationResultsOverviewProps {
  results: ComputationResults;
  onDetailView?: (resultType: string) => void;
  theme?: 'dark' | 'light';
  enableAnimation?: boolean;
  showKeyMetrics?: boolean;
}

// 使用示例
<ComputationResultsOverview 
  results={computationResults}
  onDetailView={(type) => handleDetailView(type)}
  theme="dark"
  enableAnimation={true}
  showKeyMetrics={true}
/>
```

#### 关键指标卡片
```jsx
{/* 安全系数显示 */}
<div className="metric-card safety-factor">
  <div className="metric-value">
    {results.excavationResults?.results.overallStability.safetyFactor.toFixed(2)}
  </div>
  <div className="metric-label">整体安全系数</div>
  <div className={`metric-status status-${getStatusColor(safetyFactor)}`}>
    {results.excavationResults?.results.overallStability.stabilityStatus}
  </div>
</div>

{/* 最大位移显示 */}
<div className="metric-card deformation">
  <div className="metric-value">
    {results.excavationResults?.results.deformation.maxHorizontalDisplacement.toFixed(1)}
    <span className="unit">mm</span>
  </div>
  <div className="metric-label">最大水平位移</div>
  <div className="trend-indicator">
    {getTrendIcon(displacementTrend)}
  </div>
</div>

{/* 风险等级显示 */}
<div className="metric-card risk-level">
  <div className={`risk-badge risk-${results.safetyResults?.overallRiskLevel}`}>
    {translateRiskLevel(results.safetyResults?.overallRiskLevel)}
  </div>
  <div className="metric-label">总体风险等级</div>
  <div className="risk-score">
    评分: {results.safetyResults?.overallSafetyScore}/100
  </div>
</div>
```

### 2. 3D可视化组件
```typescript
interface ResultsVisualizationProps {
  results: ComputationResults;
  scene: THREE.Scene;
  visualizationType: 'stress' | 'displacement' | 'seepage' | 'safety';
  showAnimations?: boolean;
  colorScheme?: 'rainbow' | 'thermal' | 'viridis';
  onVisualizationChange?: (type: string) => void;
}

// 使用示例
<ResultsVisualization
  results={computationResults}
  scene={threeScene}
  visualizationType="stress"
  showAnimations={true}
  colorScheme="rainbow"
  onVisualizationChange={setVisualizationType}
/>
```

#### 3D渲染实现核心
```typescript
class ResultsVisualizationRenderer {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private meshObject: THREE.Mesh;
  
  // 更新应力云图
  updateStressVisualization(stressData: Float32Array) {
    // 创建颜色纹理
    const colorTexture = this.createStressColorTexture(stressData);
    
    // 更新材质
    const material = new THREE.MeshBasicMaterial({
      map: colorTexture,
      transparent: true,
      opacity: 0.8
    });
    
    this.meshObject.material = material;
    
    // 添加颜色条
    this.updateColorBar(stressData);
  }
  
  // 创建变形动画
  createDeformationAnimation(originalVertices: Float32Array, deformedVertices: Float32Array) {
    const frames = 60;
    const animationDuration = 3000; // 3秒
    
    for (let i = 0; i < frames; i++) {
      const t = i / (frames - 1);
      const interpolatedVertices = this.interpolateVertices(
        originalVertices, 
        deformedVertices, 
        this.easeInOutCubic(t)
      );
      
      setTimeout(() => {
        this.updateMeshGeometry(interpolatedVertices);
      }, (animationDuration / frames) * i);
    }
  }
  
  // 渲染渗流场
  renderSeepageField(seepageData: PyVistaSeepageData) {
    // 创建速度矢量箭头
    const arrowGroup = new THREE.Group();
    
    for (let i = 0; i < seepageData.velocityVectors.length; i += 3) {
      const arrow = this.createVelocityArrow(
        seepageData.velocityVectors[i],
        seepageData.velocityVectors[i + 1],
        seepageData.velocityVectors[i + 2],
        seepageData.velocityMagnitude[i / 3]
      );
      arrowGroup.add(arrow);
    }
    
    this.scene.add(arrowGroup);
  }
}
```

### 3. 数据表格组件
```typescript
interface ResultsDataTableProps {
  results: ComputationResults;
  dataType: 'summary' | 'detailed' | 'stages' | 'safety';
  exportEnabled?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  onExport?: (format: 'csv' | 'excel' | 'pdf') => void;
}

// 表格数据处理
const prepareTableData = (results: ComputationResults, dataType: string) => {
  switch (dataType) {
    case 'summary':
      return [
        { parameter: '整体安全系数', value: results.excavationResults?.results.overallStability.safetyFactor, unit: '-', status: 'safe' },
        { parameter: '最大水平位移', value: results.excavationResults?.results.deformation.maxHorizontalDisplacement, unit: 'mm', status: 'warning' },
        { parameter: '最大主应力', value: results.excavationResults?.results.stress.maxPrincipalStress, unit: 'kPa', status: 'safe' },
        { parameter: '最大支撑力', value: results.excavationResults?.results.supportForces.maxStrutForce, unit: 'kN', status: 'safe' }
      ];
      
    case 'detailed':
      return results.excavationResults?.visualization.stressField.map((stress, index) => ({
        nodeId: index + 1,
        stress: stress,
        displacement: results.excavationResults?.visualization.displacementField[index],
        safetyFactor: calculateNodeSafetyFactor(stress, index)
      }));
      
    case 'stages':
      return results.stageResults?.map((stage, index) => ({
        stageId: stage.stageId,
        stageName: stage.stageName,
        constructionDays: stage.constructionDays,
        safetyFactor: stage.stageStability.safetyFactor,
        riskLevel: stage.stageStability.riskLevel,
        maxDisplacement: Math.max(...stage.incrementalDeformation.horizontalDisplacement)
      }));
      
    case 'safety':
      return [
        { category: '整体稳定', riskLevel: results.safetyResults?.riskAssessment.overallStability.riskLevel, safetyMargin: results.safetyResults?.riskAssessment.overallStability.safetyMargin },
        { category: '局部失稳', riskLevel: results.safetyResults?.riskAssessment.localInstability.riskLevel, preventiveMeasures: results.safetyResults?.riskAssessment.localInstability.preventiveMeasures.length },
        { category: '渗流破坏', riskLevel: results.safetyResults?.riskAssessment.seepageFailure.riskLevel, pipingRisk: results.safetyResults?.riskAssessment.seepageFailure.pipingRisk },
        { category: '变形超限', riskLevel: results.safetyResults?.riskAssessment.excessiveDeformation.riskLevel, maxRatio: results.safetyResults?.riskAssessment.excessiveDeformation.maxDeformationRatio }
      ];
  }
};
```

### 4. 安全评估显示组件
```typescript
interface SafetyAssessmentDisplayProps {
  safetyResults: SafetyAssessmentResult;
  showRecommendations?: boolean;
  showEmergencyPlan?: boolean;
  onActionRequired?: (action: string) => void;
}

// 风险等级可视化
const RiskLevelIndicator = ({ riskLevel, score }: { riskLevel: string, score: number }) => (
  <div className={`risk-indicator risk-${riskLevel}`}>
    <div className="risk-circle">
      <svg className="risk-progress" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#e6e6e6"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={getRiskColor(riskLevel)}
          strokeWidth="8"
          strokeDasharray={`${score * 2.83} 283`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="risk-score">{score}</div>
    </div>
    <div className="risk-label">{translateRiskLevel(riskLevel)}</div>
  </div>
);

// 监测建议显示
const MonitoringRecommendations = ({ recommendations }: { recommendations: any }) => (
  <div className="monitoring-recommendations">
    <h4>📊 监测建议</h4>
    <div className="monitoring-grid">
      {recommendations.monitoringPoints.map((point: MonitoringPoint) => (
        <div key={point.id} className="monitoring-point-card">
          <div className="point-type">{translateMonitoringType(point.type)}</div>
          <div className="point-location">
            位置: ({point.location.x.toFixed(1)}, {point.location.y.toFixed(1)})
          </div>
          <div className="point-frequency">频率: {point.frequency}</div>
        </div>
      ))}
    </div>
    
    <div className="alert-thresholds">
      <h5>预警阈值</h5>
      {recommendations.alertThresholds.map((threshold: AlertThreshold) => (
        <div key={threshold.parameter} className="threshold-item">
          <span className="parameter">{threshold.parameter}</span>
          <span className="yellow-alert">黄色: {threshold.yellowAlert} {threshold.unit}</span>
          <span className="red-alert">红色: {threshold.redAlert} {threshold.unit}</span>
        </div>
      ))}
    </div>
  </div>
);
```

## 🔄 实时更新机制

### 事件监听接口
```typescript
class ComputationResultsManager {
  private eventListeners: Map<string, Function[]> = new Map();
  
  // 监听计算结果更新
  onResultsUpdate(callback: (results: ComputationResults) => void) {
    this.addEventListener('results_updated', callback);
  }
  
  // 监听特定类型结果更新
  onSpecificResultUpdate(resultType: string, callback: (data: any) => void) {
    this.addEventListener(`${resultType}_updated`, callback);
  }
  
  // 更新结果数据
  updateResults(newResults: ComputationResults) {
    // 数据验证
    if (!this.validateResults(newResults)) {
      console.error('结果数据验证失败');
      return;
    }
    
    // 触发更新事件
    this.triggerEvent('results_updated', newResults);
    
    // 触发具体类型更新事件
    if (newResults.excavationResults) {
      this.triggerEvent('excavation_updated', newResults.excavationResults);
    }
    
    if (newResults.safetyResults) {
      this.triggerEvent('safety_updated', newResults.safetyResults);
    }
    
    // 更新3D可视化
    this.update3DVisualization(newResults);
  }
  
  // 实时性能监控
  startRealtimeMonitoring() {
    setInterval(() => {
      const performanceData = this.collectPerformanceData();
      this.triggerEvent('performance_updated', performanceData);
    }, 5000); // 5秒更新一次
  }
}
```

### 组件状态同步
```typescript
// 主界面集成示例
const MainInterfaceWithResults = () => {
  const [computationResults, setComputationResults] = useState<ComputationResults | null>(null);
  const [selectedVisualization, setSelectedVisualization] = useState<string>('stress');
  const [performanceData, setPerformanceData] = useState<any>(null);
  
  useEffect(() => {
    const resultsManager = new ComputationResultsManager();
    
    // 监听结果更新
    resultsManager.onResultsUpdate((results) => {
      setComputationResults(results);
      
      // 自动选择最重要的可视化类型
      if (results.safetyResults?.overallRiskLevel === 'critical') {
        setSelectedVisualization('safety');
      }
    });
    
    // 监听性能数据
    resultsManager.addEventListener('performance_updated', setPerformanceData);
    
    // 启动实时监控
    resultsManager.startRealtimeMonitoring();
    
    return () => {
      resultsManager.cleanup();
    };
  }, []);
  
  return (
    <div className="main-interface-with-results">
      {/* 结果总览 */}
      {computationResults && (
        <ComputationResultsOverview 
          results={computationResults}
          onDetailView={setSelectedVisualization}
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
        />
      )}
      
      {/* 性能监控面板 */}
      {performanceData && (
        <PerformanceMonitoringPanel data={performanceData} />
      )}
    </div>
  );
};
```

## 📊 导出系统技术规范

### 多格式导出接口
```typescript
class ComputationResultsExporter {
  // 导出为Excel工作簿
  static async exportToExcel(results: ComputationResults): Promise<Blob> {
    const workbook = {
      sheets: {
        '计算结果摘要': this.createSummarySheet(results),
        '详细数据': this.createDetailSheet(results),
        '安全评估': this.createSafetySheet(results),
        '施工阶段': this.createStageSheet(results),
        '监测建议': this.createMonitoringSheet(results)
      }
    };
    
    return this.generateExcelBlob(workbook);
  }
  
  // 导出为PDF技术报告
  static async exportToPDF(results: ComputationResults): Promise<Blob> {
    const reportData = {
      title: '深基坑计算分析技术报告',
      timestamp: new Date(),
      projectInfo: this.extractProjectInfo(results),
      executiveSummary: this.generateExecutiveSummary(results),
      detailedAnalysis: this.generateDetailedAnalysis(results),
      safetyAssessment: this.generateSafetySection(results),
      recommendations: this.generateRecommendations(results),
      appendices: this.generateAppendices(results),
      visualizations: await this.generateVisualizationImages(results)
    };
    
    return this.generatePDFBlob(reportData);
  }
  
  // 导出为CAD格式（DXF）
  static exportToCAD(results: ComputationResults): string {
    const dxfContent = this.generateDXFContent(results);
    return dxfContent;
  }
  
  // 导出为Kratos格式
  static exportToKratos(results: ComputationResults): string {
    const kratosData = this.convertToKratosFormat(results);
    return JSON.stringify(kratosData, null, 2);
  }
}
```

### 图表生成系统
```typescript
class ChartGenerator {
  // 生成应力分布图表
  static generateStressChart(stressData: Float32Array): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 配置图表
    const chartConfig = {
      type: 'line',
      data: {
        labels: Array.from({ length: stressData.length }, (_, i) => i),
        datasets: [{
          label: '应力分布',
          data: Array.from(stressData),
          borderColor: '#00d9ff',
          backgroundColor: 'rgba(0, 217, 255, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: '应力 (kPa)'
            }
          },
          x: {
            title: {
              display: true,
              text: '节点编号'
            }
          }
        }
      }
    };
    
    // 渲染图表到canvas
    new Chart(ctx, chartConfig);
    return canvas;
  }
  
  // 生成安全系数雷达图
  static generateSafetyRadarChart(safetyResults: SafetyAssessmentResult): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const radarConfig = {
      type: 'radar',
      data: {
        labels: ['整体稳定', '局部失稳', '渗流破坏', '变形超限'],
        datasets: [{
          label: '安全评估',
          data: [
            this.riskLevelToScore(safetyResults.riskAssessment.overallStability.riskLevel),
            this.riskLevelToScore(safetyResults.riskAssessment.localInstability.riskLevel),
            this.riskLevelToScore(safetyResults.riskAssessment.seepageFailure.riskLevel),
            this.riskLevelToScore(safetyResults.riskAssessment.excessiveDeformation.riskLevel)
          ],
          borderColor: '#52c41a',
          backgroundColor: 'rgba(82, 196, 26, 0.2)'
        }]
      },
      options: {
        scales: {
          r: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    };
    
    new Chart(ctx, radarConfig);
    return canvas;
  }
}
```

## 🎨 样式规范

### CSS变量定义
```css
/* 结果显示专用CSS变量 */
:root {
  /* 主色调 */
  --results-primary: #00d9ff;
  --results-secondary: #667eea;
  --results-success: #52c41a;
  --results-warning: #faad14;
  --results-error: #ff4d4f;
  
  /* 背景色 */
  --results-background: #1f1f1f;
  --results-surface: #2d2d2d;
  --results-card: #363636;
  
  /* 文字色 */
  --results-text: #ffffff;
  --results-text-secondary: #a0a0a0;
  --results-text-muted: #666666;
  
  /* 边框色 */
  --results-border: #404040;
  --results-border-light: #505050;
  
  /* 风险等级色 */
  --risk-low: #52c41a;
  --risk-medium: #faad14;
  --risk-high: #ff7a45;
  --risk-critical: #ff4d4f;
}
```

### 关键样式类
```css
/* 结果总览样式 */
.computation-results-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
  padding: 20px;
  background: var(--results-background);
  border-radius: 12px;
}

.result-metric-card {
  background: var(--results-surface);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--results-border);
  transition: all 0.3s ease;
}

.result-metric-card:hover {
  border-color: var(--results-primary);
  box-shadow: 0 4px 12px rgba(0, 217, 255, 0.1);
}

.metric-value {
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--results-primary);
  margin-bottom: 8px;
  font-family: 'JetBrains Mono', monospace;
}

.metric-label {
  color: var(--results-text-secondary);
  font-size: 0.9rem;
  margin-bottom: 12px;
}

.metric-status {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
}

.status-safe { 
  background: rgba(82, 196, 26, 0.2); 
  color: var(--risk-low); 
  border: 1px solid var(--risk-low);
}

.status-warning { 
  background: rgba(250, 173, 20, 0.2); 
  color: var(--risk-medium); 
  border: 1px solid var(--risk-medium);
}

.status-critical { 
  background: rgba(255, 77, 79, 0.2); 
  color: var(--risk-critical); 
  border: 1px solid var(--risk-critical);
}

/* 3D可视化容器 */
.results-visualization-container {
  background: var(--results-background);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  position: relative;
  min-height: 600px;
  border: 1px solid var(--results-border);
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
  background: var(--results-surface);
  border: 1px solid var(--results-border);
  color: var(--results-text);
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.visualization-button:hover {
  background: var(--results-primary);
  color: white;
  border-color: var(--results-primary);
}

.visualization-button.active {
  background: var(--results-primary);
  color: white;
  border-color: var(--results-primary);
}

/* 安全评估显示 */
.safety-assessment-display {
  background: var(--results-surface);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--results-border);
}

.risk-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 20px;
}

.risk-circle {
  position: relative;
  width: 120px;
  height: 120px;
}

.risk-progress {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.risk-score {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.8rem;
  font-weight: bold;
  color: var(--results-text);
}

/* 数据表格样式 */
.results-data-table {
  background: var(--results-surface);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--results-border);
}

.results-table {
  width: 100%;
  border-collapse: collapse;
}

.results-table th {
  background: var(--results-card);
  color: var(--results-text);
  padding: 15px 12px;
  text-align: left;
  font-weight: 600;
  border-bottom: 1px solid var(--results-border);
}

.results-table td {
  padding: 12px;
  border-bottom: 1px solid var(--results-border-light);
  color: var(--results-text);
}

.results-table tr:hover {
  background: rgba(0, 217, 255, 0.05);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .computation-results-overview {
    grid-template-columns: 1fr;
    gap: 15px;
    padding: 15px;
  }
  
  .result-metric-card {
    padding: 15px;
  }
  
  .metric-value {
    font-size: 2rem;
  }
  
  .visualization-controls {
    flex-direction: column;
    gap: 8px;
  }
  
  .results-visualization-container {
    min-height: 400px;
    padding: 15px;
  }
}

@media (max-width: 480px) {
  .metric-value {
    font-size: 1.5rem;
  }
  
  .results-data-table {
    overflow-x: auto;
  }
  
  .results-table {
    min-width: 600px;
  }
}
```

## 🔌 集成示例代码

### 完整集成示例
```typescript
// 主界面集成示例
import React, { useEffect, useState } from 'react';
import {
  ComputationResultsOverview,
  ResultsVisualization,
  SafetyAssessmentDisplay,
  ResultsDataTable,
  ComputationResultsManager,
  ComputationResultsExporter
} from './computation-results';

const ResultsDisplayIntegration: React.FC = () => {
  const [resultsManager] = useState(() => new ComputationResultsManager());
  const [computationResults, setComputationResults] = useState<ComputationResults | null>(null);
  const [selectedVisualization, setSelectedVisualization] = useState<string>('stress');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // 初始化结果管理器
    resultsManager.initialize();
    
    // 监听结果更新
    resultsManager.onResultsUpdate((results) => {
      setComputationResults(results);
      setLoading(false);
      
      // 自动切换到最需要关注的可视化类型
      if (results.safetyResults?.overallRiskLevel === 'critical') {
        setSelectedVisualization('safety');
      } else if (results.excavationResults?.results.deformation.maxHorizontalDisplacement > 30) {
        setSelectedVisualization('displacement');
      }
    });
    
    // 监听计算开始
    resultsManager.addEventListener('computation_started', () => {
      setLoading(true);
    });
    
    return () => {
      resultsManager.cleanup();
    };
  }, [resultsManager]);
  
  // 处理导出
  const handleExport = async (format: 'excel' | 'pdf' | 'json') => {
    if (!computationResults) return;
    
    try {
      let blob: Blob;
      let filename: string;
      
      switch (format) {
        case 'excel':
          blob = await ComputationResultsExporter.exportToExcel(computationResults);
          filename = `深基坑分析结果_${new Date().getTime()}.xlsx`;
          break;
        case 'pdf':
          blob = await ComputationResultsExporter.exportToPDF(computationResults);
          filename = `深基坑分析报告_${new Date().getTime()}.pdf`;
          break;
        case 'json':
          const jsonStr = ComputationResultsExporter.exportToJSON(computationResults);
          blob = new Blob([jsonStr], { type: 'application/json' });
          filename = `深基坑分析数据_${new Date().getTime()}.json`;
          break;
      }
      
      // 下载文件
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('导出失败:', error);
      // 显示错误提示
    }
  };
  
  if (loading) {
    return (
      <div className="results-loading">
        <div className="loading-spinner"></div>
        <p>计算结果生成中...</p>
      </div>
    );
  }
  
  if (!computationResults) {
    return (
      <div className="results-empty">
        <p>暂无计算结果</p>
        <button onClick={() => resultsManager.startSampleComputation()}>
          运行示例计算
        </button>
      </div>
    );
  }
  
  return (
    <div className="results-display-integration">
      {/* 顶部工具栏 */}
      <div className="results-toolbar">
        <h2>深基坑计算分析结果</h2>
        <div className="toolbar-actions">
          <button onClick={() => handleExport('excel')}>
            📊 导出Excel
          </button>
          <button onClick={() => handleExport('pdf')}>
            📄 导出报告
          </button>
          <button onClick={() => handleExport('json')}>
            💾 导出数据
          </button>
        </div>
      </div>
      
      {/* 结果总览 */}
      <ComputationResultsOverview 
        results={computationResults}
        onDetailView={setSelectedVisualization}
        theme="dark"
        enableAnimation={true}
        showKeyMetrics={true}
      />
      
      {/* 主要显示区域 */}
      <div className="results-main-area">
        {/* 3D可视化 */}
        <div className="visualization-section">
          <ResultsVisualization
            results={computationResults}
            scene={threeScene} // 假设已有Three.js场景
            visualizationType={selectedVisualization}
            showAnimations={true}
            colorScheme="rainbow"
            onVisualizationChange={setSelectedVisualization}
          />
        </div>
        
        {/* 侧边面板 */}
        <div className="results-sidebar">
          {/* 安全评估显示 */}
          {computationResults.safetyResults && (
            <SafetyAssessmentDisplay
              safetyResults={computationResults.safetyResults}
              showRecommendations={true}
              showEmergencyPlan={true}
              onActionRequired={(action) => console.log('需要执行操作:', action)}
            />
          )}
        </div>
      </div>
      
      {/* 详细数据表格 */}
      <div className="results-tables-section">
        <div className="table-tabs">
          <button className="tab-button active">摘要数据</button>
          <button className="tab-button">详细数据</button>
          <button className="tab-button">施工阶段</button>
          <button className="tab-button">安全评估</button>
        </div>
        
        <ResultsDataTable
          results={computationResults}
          dataType="summary"
          exportEnabled={true}
          sortable={true}
          filterable={true}
          pagination={true}
          onExport={handleExport}
        />
      </div>
    </div>
  );
};

export default ResultsDisplayIntegration;
```

## 📞 技术支持

### 联系方式
- **3号计算专家**: 实时技术支持
- **专业领域**: 结果显示、数据可视化、导出系统
- **技术文档**: 完整的接口文档和使用示例

### 集成支持
- ✅ 快速集成指导
- ✅ 自定义样式支持
- ✅ 性能优化建议
- ✅ 故障排除支持

---

**🎯 3号计算专家**  
*专业结果显示技术，为0号架构师提供完整的可视化解决方案！*

**文件位置**: `E:\DeepCAD\COMPUTATION_RESULTS_DISPLAY_TECHNICAL_SPEC.md`