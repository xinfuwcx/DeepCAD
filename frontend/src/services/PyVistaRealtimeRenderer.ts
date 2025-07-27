/**
 * PyVista实时渲染器
 * 0号架构师 - 基于3号专家PyVista接口规范
 * 管理PyVista数据的实时更新和Three.js显示
 */

import * as THREE from 'three';
import { 
  PyVistaToThreeConverter, 
  PyVistaRealtimeStream, 
  PyVistaDataAPI,
  PyVistaDataSet,
  PyVistaDeepExcavationResults,
  PyVistaStageResults
} from './PyVistaIntegrationService';

export interface PyVistaRenderingConfig {
  autoUpdate: boolean;              // 是否自动更新
  maxUpdateRate: number;            // 最大更新频率 (fps)
  showVectors: boolean;             // 是否显示向量场
  vectorSampleRate: number;         // 向量采样率 (0-1)
  scalarOpacity: number;            // 标量场透明度
  enableAnimations: boolean;        // 是否启用动画
  animationDuration: number;        // 动画持续时间 (ms)
}

export interface PyVistaVisualizationState {
  currentDataset: PyVistaDataSet | null;
  activeScalarField: string | null;
  activeVectorField: string | null;
  displayMode: 'stress' | 'displacement' | 'seepage' | 'safety';
  isAnimating: boolean;
  currentStage: number;
}

export class PyVistaRealtimeRenderer {
  private scene: THREE.Scene;
  private converter: PyVistaToThreeConverter;
  private stream: PyVistaRealtimeStream;
  private api: PyVistaDataAPI;
  
  private config: PyVistaRenderingConfig;
  private state: PyVistaVisualizationState;
  
  private currentMeshes: Map<string, THREE.Group> = new Map();
  private animationMixer: THREE.AnimationMixer | null = null;
  private animationId: number | null = null;
  
  private lastUpdateTime = 0;
  private updateCallbacks: Set<(state: PyVistaVisualizationState) => void> = new Set();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.converter = new PyVistaToThreeConverter(scene);
    this.stream = new PyVistaRealtimeStream();
    this.api = new PyVistaDataAPI();

    this.config = {
      autoUpdate: true,
      maxUpdateRate: 30, // 30 fps
      showVectors: false,
      vectorSampleRate: 0.1,
      scalarOpacity: 0.9,
      enableAnimations: true,
      animationDuration: 1000
    };

    this.state = {
      currentDataset: null,
      activeScalarField: null,
      activeVectorField: null,
      displayMode: 'stress',
      isAnimating: false,
      currentStage: 0
    };

    this.setupEventHandlers();
  }

  // 启动实时渲染
  startRealtimeRendering(streamId: string): void {
    console.log('🚀 启动PyVista实时渲染:', streamId);

    // 订阅各种数据更新
    this.stream.subscribe('computation_update', (data: PyVistaDataSet) => {
      this.handleComputationUpdate(data);
    });

    this.stream.subscribe('stage_update', (stageData: PyVistaStageResults) => {
      this.handleStageUpdate(stageData);
    });

    this.stream.subscribe('analysis_complete', (results: PyVistaDeepExcavationResults) => {
      this.handleAnalysisComplete(results);
    });

    // 建立WebSocket连接
    this.stream.connect();

    // 启动渲染循环
    this.startRenderLoop();
  }

  // 停止实时渲染
  stopRealtimeRendering(): void {
    console.log('⏹️ 停止PyVista实时渲染');

    this.stream.disconnect();
    this.stopRenderLoop();
    this.clearAllMeshes();
  }

  // 更新渲染配置
  updateConfig(newConfig: Partial<PyVistaRenderingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ PyVista渲染配置更新:', this.config);

    // 应用配置变更
    this.applyConfigChanges();
  }

  // 切换显示模式
  setDisplayMode(mode: PyVistaVisualizationState['displayMode']): void {
    if (this.state.displayMode !== mode) {
      this.state.displayMode = mode;
      console.log('🔄 切换PyVista显示模式:', mode);
      
      this.updateVisualizationMode();
      this.notifyStateChange();
    }
  }

  // 设置活动标量场
  setActiveScalarField(fieldName: string): void {
    if (this.state.activeScalarField !== fieldName) {
      this.state.activeScalarField = fieldName;
      console.log('📊 切换活动标量场:', fieldName);
      
      this.updateScalarFieldDisplay();
      this.notifyStateChange();
    }
  }

  // 设置活动向量场
  setActiveVectorField(fieldName: string): void {
    if (this.state.activeVectorField !== fieldName) {
      this.state.activeVectorField = fieldName;
      console.log('🎯 切换活动向量场:', fieldName);
      
      this.updateVectorFieldDisplay();
      this.notifyStateChange();
    }
  }

  // 添加状态变化监听器
  onStateChange(callback: (state: PyVistaVisualizationState) => void): void {
    this.updateCallbacks.add(callback);
  }

  // 移除状态变化监听器
  offStateChange(callback: (state: PyVistaVisualizationState) => void): void {
    this.updateCallbacks.delete(callback);
  }

  // 获取当前状态
  getState(): PyVistaVisualizationState {
    return { ...this.state };
  }

  // 获取当前配置
  getConfig(): PyVistaRenderingConfig {
    return { ...this.config };
  }

  // ============ 私有方法 ============

  private setupEventHandlers(): void {
    // 设置场景事件监听
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleComputationUpdate(dataset: PyVistaDataSet): void {
    if (!this.shouldUpdate()) return;

    console.log('📊 收到PyVista计算更新');
    
    this.state.currentDataset = dataset;
    this.updateVisualization(dataset);
    this.notifyStateChange();
  }

  private handleStageUpdate(stageData: PyVistaStageResults): void {
    console.log('🏗️ 收到PyVista施工阶段更新:', stageData.stageName);
    
    this.state.currentStage = stageData.stageId;
    
    // 创建阶段过渡动画
    if (this.config.enableAnimations) {
      this.animateStageTransition(stageData);
    } else {
      this.updateStageVisualization(stageData);
    }
    
    this.notifyStateChange();
  }

  private handleAnalysisComplete(results: PyVistaDeepExcavationResults): void {
    console.log('✅ 收到PyVista分析完成结果');
    
    // 转换分析结果为完整数据集
    const dataset = this.convertAnalysisResultsToDataSet(results);
    this.state.currentDataset = dataset;
    
    this.displayFinalResults(results);
    this.notifyStateChange();
  }

  private shouldUpdate(): boolean {
    const now = performance.now();
    const minInterval = 1000 / this.config.maxUpdateRate;
    
    if (now - this.lastUpdateTime < minInterval) {
      return false;
    }
    
    this.lastUpdateTime = now;
    return this.config.autoUpdate;
  }

  private updateVisualization(dataset: PyVistaDataSet): void {
    try {
      // 清除旧的可视化
      this.clearCurrentMeshes();

      // 创建新的可视化
      const meshGroup = this.converter.convertDataSet(
        dataset,
        `pyvista_${Date.now()}`
      );
      
      // 应用当前配置
      this.applyRenderingConfig(meshGroup);
      
      // 添加到场景
      this.scene.add(meshGroup);
      this.currentMeshes.set('current', meshGroup);

      console.log('✅ PyVista可视化更新完成');

    } catch (error) {
      console.error('❌ PyVista可视化更新失败:', error);
    }
  }

  private updateVisualizationMode(): void {
    if (!this.state.currentDataset) return;

    // 根据显示模式调整可视化
    this.currentMeshes.forEach(meshGroup => {
      meshGroup.children.forEach(child => {
        if (child.userData.type === 'pyvista_scalar') {
          const scalarName = child.userData.scalarName;
          
          // 根据显示模式决定是否显示
          let shouldShow = false;
          switch (this.state.displayMode) {
            case 'stress':
              shouldShow = scalarName.includes('stress') || scalarName.includes('vonMises');
              break;
            case 'displacement':
              shouldShow = scalarName.includes('displacement') || scalarName.includes('magnitude');
              break;
            case 'seepage':
              shouldShow = scalarName.includes('pressure') || scalarName.includes('velocity');
              break;
            case 'safety':
              shouldShow = scalarName.includes('safety') || scalarName.includes('factor');
              break;
          }
          
          child.visible = shouldShow;
        }
      });
    });
  }

  private updateScalarFieldDisplay(): void {
    if (!this.state.activeScalarField) return;

    this.currentMeshes.forEach(meshGroup => {
      meshGroup.children.forEach(child => {
        if (child.userData.type === 'pyvista_scalar') {
          child.visible = child.userData.scalarName === this.state.activeScalarField;
        }
      });
    });
  }

  private updateVectorFieldDisplay(): void {
    if (!this.state.activeVectorField) return;

    this.currentMeshes.forEach(meshGroup => {
      meshGroup.children.forEach(child => {
        if (child.name.includes('vector')) {
          const vectorName = child.name.split('_').pop();
          child.visible = 
            this.config.showVectors && 
            vectorName === this.state.activeVectorField;
        }
      });
    });
  }

  private animateStageTransition(stageData: PyVistaStageResults): void {
    if (this.state.isAnimating) return;

    this.state.isAnimating = true;
    
    // 创建新的可视化数据
    const newDataset = this.convertAnalysisResultsToDataSet(stageData.results);
    const newMeshGroup = this.converter.convertDataSet(
      newDataset,
      `stage_${stageData.stageId}`
    );

    // 设置初始透明度
    newMeshGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
        child.material.transparent = true;
        child.material.opacity = 0;
      }
    });

    this.scene.add(newMeshGroup);

    // 创建淡入动画
    const fadeIn = (progress: number) => {
      newMeshGroup.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
          child.material.opacity = progress * this.config.scalarOpacity;
        }
      });
    };

    // 创建淡出动画（对旧网格）
    const oldMeshes = Array.from(this.currentMeshes.values());
    const fadeOut = (progress: number) => {
      oldMeshes.forEach(meshGroup => {
        meshGroup.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
            child.material.opacity = (1 - progress) * this.config.scalarOpacity;
          }
        });
      });
    };

    // 执行动画
    this.animateTransition(fadeIn, fadeOut, () => {
      // 动画完成回调
      this.clearCurrentMeshes();
      this.currentMeshes.set('current', newMeshGroup);
      this.state.currentDataset = newDataset;
      this.state.isAnimating = false;
    });
  }

  private animateTransition(
    fadeInFn: (progress: number) => void,
    fadeOutFn: (progress: number) => void,
    onComplete: () => void
  ): void {
    const startTime = performance.now();
    const duration = this.config.animationDuration;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      fadeInFn(progress);
      fadeOutFn(progress);

      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        onComplete();
        this.animationId = null;
      }
    };

    this.animationId = requestAnimationFrame(animate);
  }

  private updateStageVisualization(stageData: PyVistaStageResults): void {
    const dataset = this.convertAnalysisResultsToDataSet(stageData.results);
    this.updateVisualization(dataset);
  }

  private displayFinalResults(results: PyVistaDeepExcavationResults): void {
    console.log('🎨 显示最终分析结果');

    // 清除所有现有可视化
    this.clearAllMeshes();

    // 创建应力可视化
    const stressDataset = {
      geometry: results.mesh,
      scalars: [results.stressField.vonMises],
      vectors: [],
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'final_stress',
        units: { stress: 'Pa' }
      }
    };

    // 创建位移可视化
    const displacementDataset = {
      geometry: results.mesh,
      scalars: [results.displacementField.magnitude],
      vectors: [results.displacementField.displacement],
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'final_displacement',
        units: { displacement: 'm' }
      }
    };

    // 创建安全系数可视化
    const safetyDataset = {
      geometry: results.mesh,
      scalars: [results.safetyFactor],
      vectors: [],
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'final_safety',
        units: { safety: 'dimensionless' }
      }
    };

    // 添加到场景
    const stressMesh = this.converter.convertDataSet(stressDataset, 'final_stress');
    const displacementMesh = this.converter.convertDataSet(displacementDataset, 'final_displacement');
    const safetyMesh = this.converter.convertDataSet(safetyDataset, 'final_safety');

    // 默认只显示应力
    displacementMesh.visible = false;
    safetyMesh.visible = false;

    this.scene.add(stressMesh);
    this.scene.add(displacementMesh);
    this.scene.add(safetyMesh);

    this.currentMeshes.set('stress', stressMesh);
    this.currentMeshes.set('displacement', displacementMesh);
    this.currentMeshes.set('safety', safetyMesh);

    // 设置初始状态
    this.state.activeScalarField = results.stressField.vonMises.name;
    this.state.currentDataset = stressDataset;
  }

  private convertAnalysisResultsToDataSet(results: PyVistaDeepExcavationResults): PyVistaDataSet {
    return {
      geometry: results.mesh,
      scalars: [
        results.stressField.vonMises,
        results.displacementField.magnitude,
        results.safetyFactor
      ],
      vectors: [
        results.displacementField.displacement
      ],
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'analysis_results',
        units: {
          stress: 'Pa',
          displacement: 'm',
          safety: 'dimensionless'
        }
      }
    };
  }

  private applyRenderingConfig(meshGroup: THREE.Group): void {
    meshGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.Material) {
          child.material.transparent = true;
          child.material.opacity = this.config.scalarOpacity;
        }
        
        // 向量场显示控制
        if (child.name.includes('vector')) {
          child.visible = this.config.showVectors;
        }
      }
    });
  }

  private applyConfigChanges(): void {
    this.currentMeshes.forEach(meshGroup => {
      this.applyRenderingConfig(meshGroup);
    });
  }

  private clearCurrentMeshes(): void {
    this.currentMeshes.forEach(meshGroup => {
      this.scene.remove(meshGroup);
      this.disposeMeshGroup(meshGroup);
    });
    this.currentMeshes.clear();
  }

  private clearAllMeshes(): void {
    this.clearCurrentMeshes();
  }

  private disposeMeshGroup(meshGroup: THREE.Group): void {
    meshGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  private startRenderLoop(): void {
    // 渲染循环由外部Three.js场景管理，这里只需要确保动画更新
    const animate = () => {
      if (this.animationMixer) {
        this.animationMixer.update(0.016); // 60fps
      }
      
      if (this.animationId !== null) {
        requestAnimationFrame(animate);
      }
    };
    
    if (this.config.enableAnimations) {
      animate();
    }
  }

  private stopRenderLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private handleResize(): void {
    // Three.js渲染器大小调整由外部处理
    // 这里只需要处理PyVista特定的响应式逻辑
    console.log('📐 PyVista渲染器响应窗口大小变化');
  }

  private notifyStateChange(): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(this.getState());
      } catch (error) {
        console.error('状态变化回调执行失败:', error);
      }
    });
  }

  // 清理资源
  dispose(): void {
    this.stopRealtimeRendering();
    this.converter.dispose();
    this.updateCallbacks.clear();
    
    if (this.animationMixer) {
      this.animationMixer.stopAllAction();
      this.animationMixer = null;
    }
  }
}

export default PyVistaRealtimeRenderer;