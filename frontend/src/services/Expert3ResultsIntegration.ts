/**
 * 3号专家计算结果与1号Epic控制中心联动集成
 * 实现真实的计算结果显示和数据流转
 * @author 1号专家
 */

import * as THREE from 'three';
import { systemIntegrationHub } from './SystemIntegrationHub';

// ======================= 3号计算结果接口定义 =======================

export interface KratosAnalysisResult {
  analysisId: string;
  analysisType: 'structural' | 'thermal' | 'geotechnical' | 'flow';
  projectId: string;
  timestamp: number;
  meshInfo: {
    nodeCount: number;
    elementCount: number;
    dimensions: 2 | 3;
  };
  fields: {
    [fieldName: string]: {
      name: string;
      type: 'scalar' | 'vector' | 'tensor';
      location: 'nodes' | 'elements';
      unit: string;
      range: { min: number; max: number };
    };
  };
  nodeData: {
    coordinates: Float32Array; // xyz坐标 [x1,y1,z1,x2,y2,z2,...]
    displacements?: Float32Array; // 位移 [dx1,dy1,dz1,...]
    vonMisesStress?: Float32Array; // Von Mises应力
    temperature?: Float32Array; // 温度
    pressure?: Float32Array; // 压力
    velocity?: Float32Array; // 速度
  };
  elementData: {
    connectivity: Uint32Array; // 单元连接关系
    stresses?: Float32Array; // 单元应力
    strains?: Float32Array; // 单元应变
    energyDensity?: Float32Array; // 能量密度
  };
  timeSteps?: number[];
  loadCases?: string[];
  convergenceInfo: {
    converged: boolean;
    iterations: number;
    residual: number;
  };
}

export interface VisualizationConfig {
  fieldName: string;
  colormap: 'viridis' | 'plasma' | 'jet' | 'rainbow' | 'cool' | 'hot';
  range: { min: number; max: number } | 'auto';
  showMesh: boolean;
  showDeformed: boolean;
  deformationScale: number;
  opacity: number;
  clampToGround: boolean;
}

// ======================= 3号结果集成管理器 =======================

export class Expert3ResultsIntegration {
  private scene: THREE.Scene;
  private resultMeshes: Map<string, THREE.Mesh> = new Map();
  private currentResults: KratosAnalysisResult | null = null;
  private wsConnection: WebSocket | null = null;
  private colorTexture: THREE.DataTexture | null = null;
  
  // 可视化配置
  private currentConfig: VisualizationConfig = {
    fieldName: 'vonMisesStress',
    colormap: 'viridis',
    range: 'auto',
    showMesh: true,
    showDeformed: true,
    deformationScale: 1.0,
    opacity: 1.0,
    clampToGround: false
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initializeWebSocketConnection();
    this.setupSystemIntegration();
    console.log('🔗 3号专家结果集成系统初始化');
  }

  // ======================= 初始化和连接 =======================

  private initializeWebSocketConnection(): void {
    try {
      // 连接到3号专家的后处理服务
      this.wsConnection = new WebSocket('ws://localhost:8001/ws/postprocessing');
      
      this.wsConnection.onopen = () => {
        console.log('✅ 已连接到3号专家计算服务');
        this.requestLatestResults();
      };

      this.wsConnection.onmessage = (event) => {
        this.handleResultsUpdate(JSON.parse(event.data));
      };

      this.wsConnection.onclose = () => {
        console.warn('⚠️ 与3号专家连接断开，5秒后重连');
        setTimeout(() => this.initializeWebSocketConnection(), 5000);
      };

      this.wsConnection.onerror = (error) => {
        console.error('❌ 3号专家连接错误:', error);
      };

    } catch (error) {
      console.warn('⚠️ WebSocket连接失败，使用HTTP轮询模式:', error);
      this.setupHTTPPolling();
    }
  }

  private setupHTTPPolling(): void {
    // HTTP轮询作为WebSocket的降级方案
    setInterval(async () => {
      try {
        const response = await fetch('/api/postprocessing/latest');
        if (response.ok) {
          const results = await response.json();
          this.handleResultsUpdate(results);
        }
      } catch (error) {
        console.warn('⚠️ HTTP轮询获取结果失败:', error);
      }
    }, 5000);
  }

  private setupSystemIntegration(): void {
    // 注册到系统集成中心
    systemIntegrationHub.registerSystem('expert3Results', this, [
      'visualization', 'analysis', 'project'
    ]);

    // 监听项目变更事件
    systemIntegrationHub.on('projectSelected', (projectData) => {
      this.loadProjectResults(projectData.projectId);
    });

    // 监听可视化配置变更
    systemIntegrationHub.on('visualizationConfigChanged', (config) => {
      this.updateVisualizationConfig(config);
    });
  }

  // ======================= 结果数据处理 =======================

  private handleResultsUpdate(data: any): void {
    console.log('📊 收到3号专家计算结果:', data);

    if (data.type === 'analysis_completed') {
      this.processAnalysisResults(data.payload);
    } else if (data.type === 'field_updated') {
      this.updateFieldVisualization(data.payload);
    } else if (data.type === 'progress_update') {
      this.updateAnalysisProgress(data.payload);
    }
  }

  private async processAnalysisResults(results: KratosAnalysisResult): Promise<void> {
    console.log(`🧮 处理 ${results.analysisType} 分析结果`);
    console.log(`📈 网格信息: ${results.meshInfo.nodeCount} 节点, ${results.meshInfo.elementCount} 单元`);

    this.currentResults = results;

    try {
      // 创建结果可视化网格
      await this.createResultVisualization(results);
      
      // 通知系统集成中心
      systemIntegrationHub.broadcastData({
        id: `results_${Date.now()}`,
        sourceSystem: 'expert3Results',
        targetSystem: ['visualizationSystem', 'projectSystem'],
        type: 'visualization',
        payload: {
          analysisId: results.analysisId,
          meshInfo: results.meshInfo,
          fields: Object.keys(results.fields),
          convergenceInfo: results.convergenceInfo
        },
        timestamp: Date.now(),
        priority: 'high'
      });

      console.log('✅ 3号专家结果处理完成');

    } catch (error) {
      console.error('❌ 结果处理失败:', error);
    }
  }

  private async createResultVisualization(results: KratosAnalysisResult): Promise<void> {
    // 清理之前的结果
    this.clearPreviousResults();

    // 创建几何体
    const geometry = this.createMeshGeometry(results);
    
    // 创建着色器材质
    const material = this.createResultShaderMaterial(results);
    
    // 创建网格对象
    const resultMesh = new THREE.Mesh(geometry, material);
    resultMesh.name = `results_${results.analysisId}`;
    resultMesh.userData = {
      type: 'kratosMesh',
      analysisId: results.analysisId,
      analysisType: results.analysisType
    };

    // 添加到场景
    this.scene.add(resultMesh);
    this.resultMeshes.set(results.analysisId, resultMesh);

    // 如果有变形数据，创建原始和变形状态
    if (results.nodeData.displacements && this.currentConfig.showDeformed) {
      this.createDeformedVisualization(results, geometry);
    }

    console.log('📊 结果可视化网格创建完成');
  }

  private createMeshGeometry(results: KratosAnalysisResult): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    // 设置顶点位置
    const positions = new Float32Array(results.nodeData.coordinates);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // 设置索引（单元连接关系）
    const indices = new Uint32Array(results.elementData.connectivity);
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    // 添加结果数据作为顶点属性
    if (results.nodeData.vonMisesStress) {
      geometry.setAttribute('vonMisesStress', 
        new THREE.BufferAttribute(results.nodeData.vonMisesStress, 1));
    }

    if (results.nodeData.displacements) {
      geometry.setAttribute('displacement', 
        new THREE.BufferAttribute(results.nodeData.displacements, 3));
    }

    if (results.nodeData.temperature) {
      geometry.setAttribute('temperature',
        new THREE.BufferAttribute(results.nodeData.temperature, 1));
    }

    if (results.nodeData.pressure) {
      geometry.setAttribute('pressure',
        new THREE.BufferAttribute(results.nodeData.pressure, 1));
    }

    // 计算法向量
    geometry.computeVertexNormals();

    return geometry;
  }

  private createResultShaderMaterial(results: KratosAnalysisResult): THREE.ShaderMaterial {
    // 创建颜色映射纹理
    this.colorTexture = this.createColormapTexture(this.currentConfig.colormap);

    // 获取当前字段的数据范围
    const fieldInfo = results.fields[this.currentConfig.fieldName];
    const range = this.currentConfig.range === 'auto' ? 
      fieldInfo.range : this.currentConfig.range;

    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uColormap: { value: this.colorTexture },
        uFieldRange: { value: new THREE.Vector2(range.min, range.max) },
        uDeformationScale: { value: this.currentConfig.deformationScale },
        uShowDeformed: { value: this.currentConfig.showDeformed },
        uOpacity: { value: this.currentConfig.opacity },
        uShowMesh: { value: this.currentConfig.showMesh }
      },
      vertexShader: `
        attribute float vonMisesStress;
        attribute float temperature;
        attribute float pressure;
        attribute vec3 displacement;
        
        uniform float uTime;
        uniform float uDeformationScale;
        uniform bool uShowDeformed;
        
        varying float vFieldValue;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          
          // 根据当前显示的字段选择值
          #ifdef FIELD_VONMISES
            vFieldValue = vonMisesStress;
          #elif defined(FIELD_TEMPERATURE)
            vFieldValue = temperature;
          #elif defined(FIELD_PRESSURE)
            vFieldValue = pressure;
          #else
            vFieldValue = vonMisesStress; // 默认显示应力
          #endif
          
          vec3 pos = position;
          
          // 应用变形
          if (uShowDeformed && displacement.length() > 0.0) {
            pos += displacement * uDeformationScale;
          }
          
          vPosition = pos;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uColormap;
        uniform vec2 uFieldRange;
        uniform float uOpacity;
        uniform bool uShowMesh;
        
        varying float vFieldValue;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        vec3 getColormapColor(float value, vec2 range) {
          float normalized = clamp((value - range.x) / (range.y - range.x), 0.0, 1.0);
          return texture2D(uColormap, vec2(normalized, 0.5)).rgb;
        }
        
        void main() {
          // 获取颜色映射颜色
          vec3 fieldColor = getColormapColor(vFieldValue, uFieldRange);
          
          // 计算光照
          vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
          float lambert = max(dot(vNormal, lightDirection), 0.0);
          vec3 finalColor = fieldColor * (0.3 + 0.7 * lambert);
          
          // 网格线显示
          if (uShowMesh) {
            vec3 grid = abs(fract(vPosition * 0.1) - 0.5) / fwidth(vPosition * 0.1);
            float line = min(min(grid.x, grid.y), grid.z);
            float meshOpacity = 1.0 - min(line, 1.0);
            finalColor = mix(finalColor, vec3(0.0), meshOpacity * 0.3);
          }
          
          gl_FragColor = vec4(finalColor, uOpacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      defines: {
        [`FIELD_${this.currentConfig.fieldName.toUpperCase()}`]: ''
      }
    });
  }

  private createDeformedVisualization(
    results: KratosAnalysisResult, 
    originalGeometry: THREE.BufferGeometry
  ): void {
    // 创建变形动画
    if (!results.nodeData.displacements) return;

    const positions = originalGeometry.getAttribute('position') as THREE.BufferAttribute;
    const displacements = results.nodeData.displacements;

    // 创建变形后的位置
    const deformedPositions = new Float32Array(positions.array.length);
    for (let i = 0; i < positions.count; i++) {
      const i3 = i * 3;
      deformedPositions[i3] = positions.array[i3] + displacements[i3] * this.currentConfig.deformationScale;
      deformedPositions[i3 + 1] = positions.array[i3 + 1] + displacements[i3 + 1] * this.currentConfig.deformationScale;
      deformedPositions[i3 + 2] = positions.array[i3 + 2] + displacements[i3 + 2] * this.currentConfig.deformationScale;
    }

    // 创建变形动画关键帧
    const deformationAnimation = {
      original: positions.array,
      deformed: deformedPositions,
      currentFrame: 0,
      totalFrames: 60
    };

    // 保存动画数据
    const resultMesh = this.resultMeshes.get(results.analysisId);
    if (resultMesh) {
      resultMesh.userData.deformationAnimation = deformationAnimation;
    }
  }

  private createColormapTexture(colormap: string): THREE.DataTexture {
    const width = 256;
    const height = 1;
    const data = new Uint8Array(width * height * 3);

    // 预定义颜色映射
    const colormaps = {
      viridis: this.generateViridisColormap(width),
      plasma: this.generatePlasmaColormap(width),
      jet: this.generateJetColormap(width),
      rainbow: this.generateRainbowColormap(width),
      cool: this.generateCoolColormap(width),
      hot: this.generateHotColormap(width)
    };

    const colors = colormaps[colormap] || colormaps.viridis;
    
    for (let i = 0; i < width; i++) {
      const color = colors[i];
      data[i * 3] = color.r;
      data[i * 3 + 1] = color.g;
      data[i * 3 + 2] = color.b;
    }

    const texture = new THREE.DataTexture(data, width, height, THREE.RGBFormat);
    texture.needsUpdate = true;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    return texture;
  }

  // ======================= 颜色映射生成 =======================

  private generateViridisColormap(size: number): Array<{r: number, g: number, b: number}> {
    const colors = [];
    for (let i = 0; i < size; i++) {
      const t = i / (size - 1);
      // Viridis颜色映射近似
      const r = Math.round(255 * (0.267004 * t * t * t - 0.265068 * t * t + 0.129766 * t + 0.267326));
      const g = Math.round(255 * (-0.214982 * t * t * t + 1.132272 * t * t - 0.125472 * t + 0.004374));
      const b = Math.round(255 * (-0.318627 * t * t * t + 1.618683 * t * t - 0.746730 * t + 0.329415));
      colors.push({ r: Math.max(0, Math.min(255, r)), g: Math.max(0, Math.min(255, g)), b: Math.max(0, Math.min(255, b)) });
    }
    return colors;
  }

  private generateJetColormap(size: number): Array<{r: number, g: number, b: number}> {
    const colors = [];
    for (let i = 0; i < size; i++) {
      const t = i / (size - 1);
      let r, g, b;
      
      if (t < 0.25) {
        r = 0;
        g = 4 * t;
        b = 1;
      } else if (t < 0.5) {
        r = 0;
        g = 1;
        b = 1 - 4 * (t - 0.25);
      } else if (t < 0.75) {
        r = 4 * (t - 0.5);
        g = 1;
        b = 0;
      } else {
        r = 1;
        g = 1 - 4 * (t - 0.75);
        b = 0;
      }
      
      colors.push({
        r: Math.round(255 * r),
        g: Math.round(255 * g),
        b: Math.round(255 * b)
      });
    }
    return colors;
  }

  private generateRainbowColormap(size: number): Array<{r: number, g: number, b: number}> {
    const colors = [];
    for (let i = 0; i < size; i++) {
      const hue = (i / (size - 1)) * 360;
      const rgb = this.hslToRgb(hue / 360, 1, 0.5);
      colors.push({
        r: Math.round(rgb.r * 255),
        g: Math.round(rgb.g * 255),
        b: Math.round(rgb.b * 255)
      });
    }
    return colors;
  }

  private generatePlasmaColormap(size: number): Array<{r: number, g: number, b: number}> {
    // Plasma颜色映射的简化实现
    return this.generateViridisColormap(size); // 暂时使用Viridis
  }

  private generateCoolColormap(size: number): Array<{r: number, g: number, b: number}> {
    const colors = [];
    for (let i = 0; i < size; i++) {
      const t = i / (size - 1);
      colors.push({
        r: Math.round(255 * t),
        g: Math.round(255 * (1 - t)),
        b: 255
      });
    }
    return colors;
  }

  private generateHotColormap(size: number): Array<{r: number, g: number, b: number}> {
    const colors = [];
    for (let i = 0; i < size; i++) {
      const t = i / (size - 1);
      let r, g, b;
      
      if (t < 1/3) {
        r = 3 * t;
        g = 0;
        b = 0;
      } else if (t < 2/3) {
        r = 1;
        g = 3 * (t - 1/3);
        b = 0;
      } else {
        r = 1;
        g = 1;
        b = 3 * (t - 2/3);
      }
      
      colors.push({
        r: Math.round(255 * r),
        g: Math.round(255 * g),
        b: Math.round(255 * b)
      });
    }
    return colors;
  }

  private hslToRgb(h: number, s: number, l: number): {r: number, g: number, b: number} {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return { r, g, b };
  }

  // ======================= 可视化控制方法 =======================

  public updateVisualizationConfig(config: Partial<VisualizationConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...config };
    
    if (this.currentResults) {
      this.updateFieldVisualization(this.currentResults);
    }
  }

  public switchField(fieldName: string): void {
    if (this.currentResults && this.currentResults.fields[fieldName]) {
      this.currentConfig.fieldName = fieldName;
      this.updateFieldVisualization(this.currentResults);
      
      console.log(`🔄 切换到字段: ${fieldName}`);
    }
  }

  public setColormap(colormap: VisualizationConfig['colormap']): void {
    this.currentConfig.colormap = colormap;
    
    if (this.colorTexture) {
      this.colorTexture.dispose();
    }
    
    this.colorTexture = this.createColormapTexture(colormap);
    
    // 更新所有结果网格的颜色映射
    this.resultMeshes.forEach(mesh => {
      const material = mesh.material as THREE.ShaderMaterial;
      if (material.uniforms.uColormap) {
        material.uniforms.uColormap.value = this.colorTexture;
      }
    });
    
    console.log(`🎨 切换颜色映射: ${colormap}`);
  }

  public setDeformationScale(scale: number): void {
    this.currentConfig.deformationScale = scale;
    
    this.resultMeshes.forEach(mesh => {
      const material = mesh.material as THREE.ShaderMaterial;
      if (material.uniforms.uDeformationScale) {
        material.uniforms.uDeformationScale.value = scale;
      }
    });
    
    console.log(`📏 设置变形比例: ${scale}`);
  }

  public playDeformationAnimation(): void {
    this.resultMeshes.forEach(mesh => {
      const animation = mesh.userData.deformationAnimation;
      if (animation) {
        this.animateDeformation(mesh, animation);
      }
    });
  }

  private animateDeformation(mesh: THREE.Mesh, animation: any): void {
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    
    const animate = () => {
      const t = animation.currentFrame / animation.totalFrames;
      const easedT = this.easeInOutQuad(t);
      
      // 插值计算当前帧的位置
      for (let i = 0; i < positions.count * 3; i++) {
        positions.array[i] = animation.original[i] + 
          (animation.deformed[i] - animation.original[i]) * easedT;
      }
      
      positions.needsUpdate = true;
      animation.currentFrame++;
      
      if (animation.currentFrame <= animation.totalFrames) {
        requestAnimationFrame(animate);
      } else {
        animation.currentFrame = 0; // 重置动画
      }
    };
    
    animate();
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  // ======================= 数据请求和管理 =======================

  private requestLatestResults(): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({
        type: 'request_latest_results',
        timestamp: Date.now()
      }));
    }
  }

  public async loadProjectResults(projectId: string): Promise<void> {
    console.log(`🔍 加载项目结果: ${projectId}`);
    
    try {
      const response = await fetch(`/api/postprocessing/project/${projectId}/latest`);
      if (response.ok) {
        const results = await response.json();
        this.processAnalysisResults(results);
      } else {
        console.warn(`⚠️ 项目 ${projectId} 暂无计算结果`);
      }
    } catch (error) {
      console.error('❌ 加载项目结果失败:', error);
    }
  }

  private updateFieldVisualization(results: KratosAnalysisResult): void {
    const mesh = this.resultMeshes.get(results.analysisId);
    if (!mesh) return;

    const material = mesh.material as THREE.ShaderMaterial;
    
    // 更新字段范围
    const fieldInfo = results.fields[this.currentConfig.fieldName];
    if (fieldInfo) {
      const range = this.currentConfig.range === 'auto' ? 
        fieldInfo.range : this.currentConfig.range;
      material.uniforms.uFieldRange.value.set(range.min, range.max);
    }

    // 更新着色器定义
    material.defines = {
      [`FIELD_${this.currentConfig.fieldName.toUpperCase()}`]: ''
    };
    material.needsUpdate = true;
  }

  private updateAnalysisProgress(progress: any): void {
    console.log(`📈 分析进度: ${progress.percentage}%`);
    
    // 广播进度更新到系统集成中心
    systemIntegrationHub.broadcastData({
      id: `progress_${Date.now()}`,
      sourceSystem: 'expert3Results',
      targetSystem: ['visualizationSystem'],
      type: 'visualization',
      payload: progress,
      timestamp: Date.now(),
      priority: 'low'
    });
  }

  private clearPreviousResults(): void {
    this.resultMeshes.forEach((mesh, analysisId) => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    
    this.resultMeshes.clear();
    
    if (this.colorTexture) {
      this.colorTexture.dispose();
    }
  }

  // ======================= 公共接口 =======================

  public getCurrentResults(): KratosAnalysisResult | null {
    return this.currentResults;
  }

  public getAvailableFields(): string[] {
    return this.currentResults ? Object.keys(this.currentResults.fields) : [];
  }

  public getFieldInfo(fieldName: string) {
    return this.currentResults?.fields[fieldName] || null;
  }

  public getCurrentConfig(): VisualizationConfig {
    return { ...this.currentConfig };
  }

  public exportResults(format: 'json' | 'csv' | 'vtk' = 'json'): string {
    if (!this.currentResults) return '';

    switch (format) {
      case 'json':
        return JSON.stringify(this.currentResults, null, 2);
      case 'csv':
        return this.exportToCSV();
      case 'vtk':
        return this.exportToVTK();
      default:
        return '';
    }
  }

  private exportToCSV(): string {
    if (!this.currentResults) return '';

    const headers = ['NodeID', 'X', 'Y', 'Z'];
    const fields = Object.keys(this.currentResults.fields);
    headers.push(...fields);

    const rows = [headers.join(',')];
    
    const coords = this.currentResults.nodeData.coordinates;
    const nodeCount = coords.length / 3;

    for (let i = 0; i < nodeCount; i++) {
      const row = [
        i.toString(),
        coords[i * 3].toString(),
        coords[i * 3 + 1].toString(),
        coords[i * 3 + 2].toString()
      ];

      // 添加字段数据
      fields.forEach(fieldName => {
        const fieldData = (this.currentResults!.nodeData as any)[fieldName];
        if (fieldData) {
          row.push(fieldData[i]?.toString() || '0');
        } else {
          row.push('0');
        }
      });

      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  private exportToVTK(): string {
    // VTK格式导出实现
    if (!this.currentResults) return '';
    
    const coords = this.currentResults.nodeData.coordinates;
    const nodeCount = coords.length / 3;
    const connectivity = this.currentResults.elementData.connectivity;
    const elementCount = connectivity.length / 4; // 假设四面体单元

    let vtk = '# vtk DataFile Version 3.0\n';
    vtk += 'DeepCAD Analysis Results\n';
    vtk += 'ASCII\n';
    vtk += 'DATASET UNSTRUCTURED_GRID\n\n';

    // 点数据
    vtk += `POINTS ${nodeCount} double\n`;
    for (let i = 0; i < nodeCount; i++) {
      vtk += `${coords[i * 3]} ${coords[i * 3 + 1]} ${coords[i * 3 + 2]}\n`;
    }

    // 单元数据
    vtk += `\nCELLS ${elementCount} ${elementCount * 5}\n`;
    for (let i = 0; i < elementCount; i++) {
      vtk += `4 ${connectivity[i * 4]} ${connectivity[i * 4 + 1]} ${connectivity[i * 4 + 2]} ${connectivity[i * 4 + 3]}\n`;
    }

    vtk += `\nCELL_TYPES ${elementCount}\n`;
    for (let i = 0; i < elementCount; i++) {
      vtk += '10\n'; // VTK_TETRA
    }

    // 字段数据
    vtk += `\nPOINT_DATA ${nodeCount}\n`;
    
    Object.entries(this.currentResults.fields).forEach(([fieldName, fieldInfo]) => {
      const fieldData = (this.currentResults!.nodeData as any)[fieldName];
      if (fieldData) {
        vtk += `SCALARS ${fieldName} double 1\n`;
        vtk += 'LOOKUP_TABLE default\n';
        for (let i = 0; i < nodeCount; i++) {
          vtk += `${fieldData[i] || 0}\n`;
        }
        vtk += '\n';
      }
    });

    return vtk;
  }

  public dispose(): void {
    console.log('🗑️ 清理3号专家结果集成系统');

    // 关闭WebSocket连接
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }

    // 清理结果网格
    this.clearPreviousResults();

    // 清理纹理
    if (this.colorTexture) {
      this.colorTexture.dispose();
      this.colorTexture = null;
    }
  }
}

export default Expert3ResultsIntegration;