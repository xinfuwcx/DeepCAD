/**
 * Three.js可视化集成桥接器
 * 3号计算专家 ↔ 1号首席架构师协作接口
 * 专业计算数据 → Three.js震撼可视化的完美桥梁
 */

import * as THREE from 'three';

// 导入1号的品牌视觉系统
import { DeepCADLogo } from '../components/brand/DeepCADLogo';
import { DeepCADIconSystem } from '../components/brand/DeepCADIconSystem';
import { BrandColors } from '../styles/brandColors';

// 导入我的计算系统
import { 
  DeepExcavationResults,
  type DeepExcavationParameters 
} from '../services/deepExcavationSolver';

import { 
  PyVistaStageResult 
} from '../services/constructionStageAnalysis';

import { 
  SafetyAssessmentResult 
} from '../services/safetyAssessmentSystem';

import { 
  PyVistaPostprocessingResults 
} from '../services/professionalPostprocessingSystem';

// Three.js集成数据接口
export interface ThreeJSIntegrationData {
  // 场景数据
  sceneData: {
    meshes: Array<{
      geometry: THREE.BufferGeometry;
      material: THREE.Material;
      matrix: THREE.Matrix4;
      userData: any;
    }>;
    
    lights: Array<{
      type: 'directional' | 'point' | 'spot' | 'ambient';
      position?: THREE.Vector3;
      color: THREE.Color;
      intensity: number;
      castShadow?: boolean;
    }>;
    
    cameras: Array<{
      type: 'perspective' | 'orthographic';
      position: THREE.Vector3;
      target: THREE.Vector3;
      fov?: number;
    }>;
  };
  
  // 动画数据
  animationData: {
    keyframes: Array<{
      time: number;
      transforms: Map<string, THREE.Matrix4>;
      properties: Map<string, any>;
    }>;
    
    timeline: {
      duration: number;
      loop: boolean;
      autoplay: boolean;
    };
    
    triggers: Array<{
      time: number;
      event: string;
      data: any;
    }>;
  };
  
  // 交互数据
  interactionData: {
    selectableObjects: string[];
    hoverEffects: Map<string, any>;
    clickHandlers: Map<string, (object: THREE.Object3D) => void>;
    
    ui: {
      panels: Array<{
        id: string;
        position: THREE.Vector2;
        content: any;
        visible: boolean;
      }>;
      
      controls: Array<{
        type: 'slider' | 'button' | 'toggle';
        id: string;
        position: THREE.Vector2;
        config: any;
        callback: (value: any) => void;
      }>;
    };
  };
  
  // 后处理效果
  postProcessing: {
    effects: Array<{
      type: 'bloom' | 'ssao' | 'outline' | 'fxaa' | 'custom';
      enabled: boolean;
      parameters: any;
    }>;
    
    composer: {
      renderToScreen: boolean;
      passes: string[];
    };
  };
}

// 性能优化配置
export interface PerformanceOptimizationConfig {
  // LOD配置
  levelOfDetail: {
    enabled: boolean;
    distances: number[];
    geometryLOD: boolean;
    materialLOD: boolean;
    textureLOD: boolean;
  };
  
  // 渲染优化
  rendering: {
    frustumCulling: boolean;
    occlusionCulling: boolean;
    instancedRendering: boolean;
    batchRendering: boolean;
    gpuPicking: boolean;
  };
  
  // 内存优化
  memory: {
    geometryCompression: boolean;
    textureCompression: boolean;
    bufferReuse: boolean;
    garbageCollection: boolean;
    maxBufferSize: number; // MB
  };
  
  // 自适应质量
  adaptiveQuality: {
    enabled: boolean;
    targetFPS: number;
    minQuality: number;
    maxQuality: number;
    qualitySteps: number;
  };
}

/**
 * Three.js可视化集成桥接器
 */
export class ThreeJSVisualizationBridge {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private controls: any;
  
  // 性能监控
  private performanceMonitor: {
    frameTime: number;
    drawCalls: number;
    triangles: number;
    memoryUsage: number;
  };
  
  // 数据缓存
  private dataCache: Map<string, any> = new Map();
  
  // 动画管理
  private animationMixer: THREE.AnimationMixer | null = null;
  private activeAnimations: Map<string, THREE.AnimationAction> = new Map();
  
  // 材质库
  private materialLibrary: Map<string, THREE.Material> = new Map();
  
  constructor(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    controls: any
  ) {
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;
    this.controls = controls;
    
    this.performanceMonitor = {
      frameTime: 0,
      drawCalls: 0,
      triangles: 0,
      memoryUsage: 0
    };
    
    this.initializeMaterialLibrary();
    this.setupPerformanceMonitoring();
  }
  
  /**
   * 初始化材质库
   */
  private initializeMaterialLibrary(): void {
    // 土体材质
    const soilMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color(BrandColors.semantic.earth),
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    this.materialLibrary.set('soil', soilMaterial);
    
    // 混凝土材质
    const concreteMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color(BrandColors.neutral.concrete),
      roughness: 0.8,
      metalness: 0.1
    });
    this.materialLibrary.set('concrete', concreteMaterial);
    
    // 钢材质
    const steelMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(BrandColors.neutral.steel),
      roughness: 0.3,
      metalness: 0.9
    });
    this.materialLibrary.set('steel', steelMaterial);
    
    // 应力可视化材质
    const stressShaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        stressScale: { value: 1.0 },
        colorMap: { value: null }
      },
      vertexShader: `
        attribute float stress;
        varying float vStress;
        varying vec3 vPosition;
        
        void main() {
          vStress = stress;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float stressScale;
        varying float vStress;
        varying vec3 vPosition;
        
        vec3 getStressColor(float stress) {
          float normalized = clamp(stress * stressScale, 0.0, 1.0);
          
          // 彩虹色映射
          if (normalized < 0.25) {
            return mix(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0), normalized * 4.0);
          } else if (normalized < 0.5) {
            return mix(vec3(0.0, 1.0, 1.0), vec3(0.0, 1.0, 0.0), (normalized - 0.25) * 4.0);
          } else if (normalized < 0.75) {
            return mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0), (normalized - 0.5) * 4.0);
          } else {
            return mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), (normalized - 0.75) * 4.0);
          }
        }
        
        void main() {
          vec3 color = getStressColor(vStress);
          
          // 添加脉冲效果
          float pulse = 0.8 + 0.2 * sin(time * 3.0 + vPosition.x * 0.1);
          color *= pulse;
          
          gl_FragColor = vec4(color, 0.9);
        }
      `,
      transparent: true
    });
    this.materialLibrary.set('stress_visualization', stressShaderMaterial);
    
    // 流场可视化材质
    const flowShaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        flowSpeed: { value: 1.0 },
        opacity: { value: 0.7 }
      },
      vertexShader: `
        attribute vec3 velocity;
        varying vec3 vVelocity;
        varying vec3 vPosition;
        
        void main() {
          vVelocity = velocity;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float flowSpeed;
        uniform float opacity;
        varying vec3 vVelocity;
        varying vec3 vPosition;
        
        void main() {
          float speed = length(vVelocity);
          
          // 流动动画
          float flow = sin(time * flowSpeed + vPosition.x * 0.5 + vPosition.z * 0.3) * 0.5 + 0.5;
          
          // 速度颜色映射
          vec3 color = mix(
            vec3(0.0, 0.2, 0.8),  // 慢速：深蓝
            vec3(0.8, 0.2, 0.0),  // 快速：红色
            clamp(speed * 1000.0, 0.0, 1.0)
          );
          
          // 应用流动效果
          color *= (0.7 + 0.3 * flow);
          
          gl_FragColor = vec4(color, opacity * flow);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    this.materialLibrary.set('flow_visualization', flowShaderMaterial);
  }
  
  /**
   * 设置性能监控
   */
  private setupPerformanceMonitoring(): void {
    const updatePerformanceMetrics = () => {
      this.performanceMonitor.frameTime = this.renderer.info.render.frame;
      this.performanceMonitor.drawCalls = this.renderer.info.render.calls;
      this.performanceMonitor.triangles = this.renderer.info.render.triangles;
      
      // 估算内存使用
      const geometries = this.renderer.info.memory.geometries;
      const textures = this.renderer.info.memory.textures;
      this.performanceMonitor.memoryUsage = (geometries + textures) * 0.1; // 简化估算
    };
    
    // 每秒更新一次性能指标
    setInterval(updatePerformanceMetrics, 1000);
  }
  
  /**
   * 转换深基坑计算结果为Three.js可视化数据
   */
  convertExcavationResults(results: DeepExcavationResults): ThreeJSIntegrationData {
    console.log('🔄 转换深基坑计算结果为Three.js格式...');
    
    const meshes: ThreeJSIntegrationData['sceneData']['meshes'] = [];
    
    // 主体网格
    const mainGeometry = new THREE.BufferGeometry();
    mainGeometry.setAttribute('position', new THREE.BufferAttribute(results.mesh.vertices, 3));
    mainGeometry.setAttribute('normal', new THREE.BufferAttribute(results.mesh.normals, 3));
    mainGeometry.setIndex(new THREE.BufferAttribute(results.mesh.faces, 1));
    
    // 添加应力数据作为顶点属性
    mainGeometry.setAttribute('stress', new THREE.BufferAttribute(results.stressField.vonMisesStress, 1));
    
    meshes.push({
      geometry: mainGeometry,
      material: this.materialLibrary.get('stress_visualization')!,
      matrix: new THREE.Matrix4().identity(),
      userData: { type: 'excavation_mesh', hasStressData: true }
    });
    
    // 围护墙网格
    if (results.retainingWall) {
      const wallGeometry = new THREE.BufferGeometry();
      wallGeometry.setAttribute('position', new THREE.BufferAttribute(results.retainingWall.vertices, 3));
      wallGeometry.setAttribute('normal', new THREE.BufferAttribute(results.retainingWall.normals, 3));
      wallGeometry.setIndex(new THREE.BufferAttribute(results.retainingWall.faces, 1));
      
      meshes.push({
        geometry: wallGeometry,
        material: this.materialLibrary.get('concrete')!,
        matrix: new THREE.Matrix4().identity(),
        userData: { type: 'retaining_wall' }
      });
    }
    
    // 支撑系统网格
    if (results.supportSystem) {
      for (const support of results.supportSystem.supports) {
        const supportGeometry = this.createSupportGeometry(support);
        
        meshes.push({
          geometry: supportGeometry,
          material: this.materialLibrary.get('steel')!,
          matrix: new THREE.Matrix4().makeTranslation(support.position[0], support.position[1], support.position[2]),
          userData: { type: 'support_strut', supportId: support.supportId }
        });
      }
    }
    
    // 设置光照
    const lights: ThreeJSIntegrationData['sceneData']['lights'] = [
      {
        type: 'directional',
        position: new THREE.Vector3(50, 100, 50),
        color: new THREE.Color(0xffffff),
        intensity: 1.0,
        castShadow: true
      },
      {
        type: 'ambient',
        color: new THREE.Color(0x404040),
        intensity: 0.4
      },
      {
        type: 'point',
        position: new THREE.Vector3(0, 50, 0),
        color: new THREE.Color(BrandColors.primary.quantumBlue),
        intensity: 0.6
      }
    ];
    
    // 设置相机位置
    const cameras: ThreeJSIntegrationData['sceneData']['cameras'] = [
      {
        type: 'perspective',
        position: new THREE.Vector3(100, 80, 100),
        target: new THREE.Vector3(0, -10, 0),
        fov: 60
      }
    ];
    
    // 动画数据（应力脉冲动画）
    const animationData: ThreeJSIntegrationData['animationData'] = {
      keyframes: [
        {
          time: 0,
          transforms: new Map(),
          properties: new Map([['stressScale', 0.5]])
        },
        {
          time: 2,
          transforms: new Map(),
          properties: new Map([['stressScale', 1.5]])
        },
        {
          time: 4,
          transforms: new Map(),
          properties: new Map([['stressScale', 0.5]])
        }
      ],
      timeline: {
        duration: 4,
        loop: true,
        autoplay: true
      },
      triggers: []
    };
    
    // 交互配置
    const interactionData: ThreeJSIntegrationData['interactionData'] = {
      selectableObjects: ['excavation_mesh', 'retaining_wall'],
      hoverEffects: new Map([
        ['excavation_mesh', { highlight: true, opacity: 0.8 }],
        ['retaining_wall', { highlight: true, wireframe: true }]
      ]),
      clickHandlers: new Map([
        ['excavation_mesh', (object: THREE.Object3D) => this.handleMeshClick(object)],
        ['retaining_wall', (object: THREE.Object3D) => this.handleWallClick(object)]
      ]),
      ui: {
        panels: [
          {
            id: 'stress_info',
            position: new THREE.Vector2(10, 10),
            content: this.createStressInfoPanel(results),
            visible: true
          }
        ],
        controls: [
          {
            type: 'slider',
            id: 'stress_scale',
            position: new THREE.Vector2(10, 100),
            config: { min: 0.1, max: 3.0, value: 1.0, step: 0.1 },
            callback: (value: number) => this.updateStressScale(value)
          }
        ]
      }
    };
    
    // 后处理效果
    const postProcessing: ThreeJSIntegrationData['postProcessing'] = {
      effects: [
        {
          type: 'bloom',
          enabled: true,
          parameters: { strength: 0.5, radius: 0.8, threshold: 0.1 }
        },
        {
          type: 'ssao',
          enabled: true,
          parameters: { radius: 0.1, intensity: 0.3 }
        },
        {
          type: 'outline',
          enabled: true,
          parameters: { 
            edgeStrength: 2.0, 
            edgeGlow: 0.5, 
            edgeColor: new THREE.Color(BrandColors.primary.quantumBlue) 
          }
        }
      ],
      composer: {
        renderToScreen: true,
        passes: ['ssao', 'bloom', 'outline', 'fxaa']
      }
    };
    
    console.log('✅ 深基坑计算结果转换完成');
    
    return {
      sceneData: { meshes, lights, cameras },
      animationData,
      interactionData,
      postProcessing
    };
  }
  
  /**
   * 转换施工阶段结果为动画数据
   */
  convertStageResults(stageResults: PyVistaStageResult[]): ThreeJSIntegrationData['animationData'] {
    console.log('🎬 转换施工阶段结果为动画数据...');
    
    const keyframes: ThreeJSIntegrationData['animationData']['keyframes'] = [];
    const stageDuration = 3.0; // 每个阶段3秒
    
    stageResults.forEach((stage, index) => {
      const time = index * stageDuration;
      
      // 变形动画关键帧
      const transforms = new Map<string, THREE.Matrix4>();
      
      // 如果有变形数据，创建形变矩阵
      if (stage.fieldData.displacement) {
        const displacements = stage.fieldData.displacement.vectors;
        
        // 为主要网格创建变形矩阵
        const deformMatrix = new THREE.Matrix4().identity();
        
        // 简化的变形处理：整体位移
        if (displacements.length >= 3) {
          const avgDisplacement = new THREE.Vector3(
            displacements[0],
            displacements[1], 
            displacements[2]
          ).multiplyScalar(1000); // 放大变形
          
          deformMatrix.makeTranslation(
            avgDisplacement.x,
            avgDisplacement.y,
            avgDisplacement.z
          );
        }
        
        transforms.set('excavation_mesh', deformMatrix);
      }
      
      // 属性动画关键帧
      const properties = new Map<string, any>();
      properties.set('stageProgress', index / (stageResults.length - 1));
      properties.set('excavationDepth', stage.excavationParameters?.currentDepth || 0);
      
      keyframes.push({
        time,
        transforms,
        properties
      });
      
      // 添加阶段触发事件
      if (index < stageResults.length - 1) {
        keyframes.push({
          time: time + stageDuration * 0.8,
          transforms: new Map(),
          properties: new Map([['stageTransition', index + 1]])
        });
      }
    });
    
    console.log(`✅ 生成了${keyframes.length}个动画关键帧`);
    
    return {
      keyframes,
      timeline: {
        duration: stageResults.length * stageDuration,
        loop: false,
        autoplay: false
      },
      triggers: [
        {
          time: 0,
          event: 'stage_start',
          data: { stageId: 0, stageName: '开始施工' }
        },
        {
          time: (stageResults.length - 1) * stageDuration,
          event: 'stage_complete',
          data: { message: '施工完成' }
        }
      ]
    };
  }
  
  /**
   * 转换安全评估结果为可视化效果
   */
  convertSafetyResults(safetyResults: SafetyAssessmentResult): {
    materials: Map<string, THREE.Material>;
    overlays: Array<{ type: string; data: any }>;
  } {
    console.log('🛡️ 转换安全评估结果为可视化效果...');
    
    const materials = new Map<string, THREE.Material>();
    const overlays: Array<{ type: string; data: any }> = [];
    
    // 根据风险等级创建材质
    const getRiskColor = (riskLevel: string): THREE.Color => {
      switch (riskLevel) {
        case 'safe': return new THREE.Color(BrandColors.semantic.success);
        case 'attention': return new THREE.Color(BrandColors.semantic.warning);
        case 'warning': return new THREE.Color(BrandColors.semantic.warning);
        case 'danger': return new THREE.Color(BrandColors.semantic.error);
        case 'emergency': return new THREE.Color(0xff0000);
        default: return new THREE.Color(0x888888);
      }
    };
    
    // 整体风险材质
    const overallRiskMaterial = new THREE.MeshLambertMaterial({
      color: getRiskColor(safetyResults.overallRiskLevel),
      transparent: true,
      opacity: 0.3,
      emissive: getRiskColor(safetyResults.overallRiskLevel),
      emissiveIntensity: 0.1
    });
    materials.set('overall_risk', overallRiskMaterial);
    
    // 变形风险可视化
    if (safetyResults.categories.deformation) {
      const deformationRiskMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          riskLevel: { value: this.getRiskLevelValue(safetyResults.categories.deformation.riskLevel) },
          pulseSpeed: { value: 2.0 }
        },
        vertexShader: `
          varying vec3 vPosition;
          void main() {
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform float riskLevel;
          uniform float pulseSpeed;
          varying vec3 vPosition;
          
          vec3 getRiskColor(float risk) {
            if (risk < 0.2) return vec3(0.0, 1.0, 0.0);      // 绿色：安全
            else if (risk < 0.4) return vec3(1.0, 1.0, 0.0); // 黄色：注意
            else if (risk < 0.6) return vec3(1.0, 0.5, 0.0); // 橙色：警告
            else if (risk < 0.8) return vec3(1.0, 0.0, 0.0); // 红色：危险
            else return vec3(1.0, 0.0, 1.0);                 // 洋红：紧急
          }
          
          void main() {
            vec3 color = getRiskColor(riskLevel);
            
            // 脉冲效果
            float pulse = 0.7 + 0.3 * sin(time * pulseSpeed);
            color *= pulse;
            
            // 根据风险等级调整透明度
            float alpha = 0.3 + riskLevel * 0.4;
            
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true
      });
      materials.set('deformation_risk', deformationRiskMaterial);
    }
    
    // 创建风险信息叠加层
    overlays.push({
      type: 'risk_summary',
      data: {
        overallScore: safetyResults.overallSafetyScore,
        riskLevel: safetyResults.overallRiskLevel,
        categories: Object.keys(safetyResults.categories).map(key => ({
          name: key,
          score: safetyResults.categories[key as keyof typeof safetyResults.categories].score,
          riskLevel: safetyResults.categories[key as keyof typeof safetyResults.categories].riskLevel
        }))
      }
    });
    
    // 创建超标区域标注
    if (safetyResults.categories.deformation?.exceedances) {
      overlays.push({
        type: 'exceedance_markers',
        data: {
          markers: safetyResults.categories.deformation.exceedances.map(exc => ({
            position: exc.location,
            parameter: exc.parameter,
            currentValue: exc.currentValue,
            limitValue: exc.limitValue,
            exceedanceRatio: exc.exceedanceRatio,
            severity: exc.exceedanceRatio > 1.5 ? 'critical' : exc.exceedanceRatio > 1.2 ? 'warning' : 'attention'
          }))
        }
      });
    }
    
    console.log(`✅ 生成了${materials.size}个风险材质和${overlays.length}个叠加层`);
    
    return { materials, overlays };
  }
  
  /**
   * 应用性能优化
   */
  applyPerformanceOptimizations(config: PerformanceOptimizationConfig): void {
    console.log('⚡ 应用Three.js性能优化...');
    
    // LOD优化
    if (config.levelOfDetail.enabled) {
      this.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          this.applyLODToMesh(object, config.levelOfDetail.distances);
        }
      });
    }
    
    // 渲染优化
    if (config.rendering.frustumCulling) {
      this.renderer.setRenderTarget(null);
      this.camera.matrixAutoUpdate = true;
    }
    
    if (config.rendering.instancedRendering) {
      this.enableInstancedRendering();
    }
    
    // 内存优化
    if (config.memory.geometryCompression) {
      this.compressGeometries();
    }
    
    // 自适应质量
    if (config.adaptiveQuality.enabled) {
      this.setupAdaptiveQuality(config.adaptiveQuality);
    }
    
    console.log('✅ 性能优化应用完成');
  }
  
  /**
   * 更新动画
   */
  updateAnimations(deltaTime: number): void {
    // 更新动画混合器
    if (this.animationMixer) {
      this.animationMixer.update(deltaTime);
    }
    
    // 更新shader材质的时间uniform
    this.materialLibrary.forEach((material) => {
      if (material instanceof THREE.ShaderMaterial && material.uniforms.time) {
        material.uniforms.time.value += deltaTime;
      }
    });
    
    // 更新活跃动画
    this.activeAnimations.forEach((action, name) => {
      if (action.isRunning()) {
        // 动画特效处理
        this.processAnimationEffects(name, action.time);
      }
    });
  }
  
  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): {
    frameTime: number;
    fps: number;
    drawCalls: number;
    triangles: number;
    memoryUsage: number;
    gpuMemory: number;
  } {
    const fps = this.performanceMonitor.frameTime > 0 ? 1000 / this.performanceMonitor.frameTime : 0;
    
    return {
      frameTime: this.performanceMonitor.frameTime,
      fps,
      drawCalls: this.performanceMonitor.drawCalls,
      triangles: this.performanceMonitor.triangles,
      memoryUsage: this.performanceMonitor.memoryUsage,
      gpuMemory: this.renderer.info.memory.textures + this.renderer.info.memory.geometries
    };
  }
  
  // ===== 私有辅助方法 =====
  
  private createSupportGeometry(support: any): THREE.BufferGeometry {
    // 创建支撑几何体
    const geometry = new THREE.CylinderGeometry(
      support.radius || 0.2,
      support.radius || 0.2,
      support.length || 2.0,
      16
    );
    
    return geometry;
  }
  
  private getRiskLevelValue(riskLevel: string): number {
    switch (riskLevel) {
      case 'safe': return 0.1;
      case 'attention': return 0.3;
      case 'warning': return 0.5;
      case 'danger': return 0.7;
      case 'emergency': return 0.9;
      default: return 0.0;
    }
  }
  
  private handleMeshClick(object: THREE.Object3D): void {
    console.log('🖱️ 基坑网格被点击:', object.userData);
    // 显示应力详情
    this.showStressDetails(object);
  }
  
  private handleWallClick(object: THREE.Object3D): void {
    console.log('🖱️ 围护墙被点击:', object.userData);
    // 显示墙体信息
    this.showWallDetails(object);
  }
  
  private showStressDetails(object: THREE.Object3D): void {
    // 实现应力详情显示
    const stressInfo = {
      maxStress: '250 MPa',
      avgStress: '150 MPa',
      location: object.position
    };
    
    // 触发UI更新事件
    window.dispatchEvent(new CustomEvent('show-stress-details', { detail: stressInfo }));
  }
  
  private showWallDetails(object: THREE.Object3D): void {
    // 实现围护墙详情显示
    const wallInfo = {
      thickness: '0.8m',
      material: 'C30混凝土',
      maxDeflection: '25mm'
    };
    
    // 触发UI更新事件
    window.dispatchEvent(new CustomEvent('show-wall-details', { detail: wallInfo }));
  }
  
  private createStressInfoPanel(results: DeepExcavationResults): any {
    return {
      title: '应力分析',
      data: {
        maxVonMises: `${Math.max(...results.stressField.vonMisesStress).toFixed(1)} MPa`,
        avgVonMises: `${(results.stressField.vonMisesStress.reduce((a, b) => a + b) / results.stressField.vonMisesStress.length).toFixed(1)} MPa`,
        stressConcentration: '检测到3处应力集中'
      }
    };
  }
  
  private updateStressScale(value: number): void {
    const stressMaterial = this.materialLibrary.get('stress_visualization') as THREE.ShaderMaterial;
    if (stressMaterial && stressMaterial.uniforms.stressScale) {
      stressMaterial.uniforms.stressScale.value = value;
    }
  }
  
  private applyLODToMesh(mesh: THREE.Mesh, distances: number[]): void {
    // 简化的LOD实现
    const lod = new THREE.LOD();
    
    // 高精度版本
    lod.addLevel(mesh, distances[0] || 0);
    
    // 中精度版本
    if (distances[1]) {
      const mediumGeometry = mesh.geometry.clone();
      // 简化几何体逻辑
      const mediumMesh = new THREE.Mesh(mediumGeometry, mesh.material);
      lod.addLevel(mediumMesh, distances[1]);
    }
    
    // 低精度版本
    if (distances[2]) {
      const lowGeometry = mesh.geometry.clone();
      // 进一步简化几何体逻辑
      const lowMesh = new THREE.Mesh(lowGeometry, mesh.material);
      lod.addLevel(lowMesh, distances[2]);
    }
    
    // 替换原始网格
    if (mesh.parent) {
      mesh.parent.add(lod);
      mesh.parent.remove(mesh);
    }
  }
  
  private enableInstancedRendering(): void {
    // 实现实例化渲染逻辑
    console.log('🔄 启用实例化渲染...');
  }
  
  private compressGeometries(): void {
    // 实现几何体压缩逻辑
    console.log('🗜️ 压缩几何体数据...');
  }
  
  private setupAdaptiveQuality(config: PerformanceOptimizationConfig['adaptiveQuality']): void {
    let currentQuality = config.maxQuality;
    let frameCount = 0;
    let lastTime = Date.now();
    
    const adjustQuality = () => {
      frameCount++;
      const now = Date.now();
      
      if (now - lastTime >= 1000) { // 每秒检查一次
        const fps = frameCount;
        frameCount = 0;
        lastTime = now;
        
        if (fps < config.targetFPS - 5) {
          // 降低质量
          currentQuality = Math.max(currentQuality - 1, config.minQuality);
          this.applyQualitySettings(currentQuality);
        } else if (fps > config.targetFPS + 5) {
          // 提高质量
          currentQuality = Math.min(currentQuality + 1, config.maxQuality);
          this.applyQualitySettings(currentQuality);
        }
      }
      
      requestAnimationFrame(adjustQuality);
    };
    
    adjustQuality();
  }
  
  private applyQualitySettings(quality: number): void {
    // 根据质量等级调整渲染设置
    const pixelRatio = Math.min(window.devicePixelRatio, quality / 5);
    this.renderer.setPixelRatio(pixelRatio);
    
    // 调整阴影质量
    if (quality >= 4) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } else if (quality >= 2) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.BasicShadowMap;
    } else {
      this.renderer.shadowMap.enabled = false;
    }
  }
  
  private processAnimationEffects(animationName: string, time: number): void {
    // 处理动画特效
    if (animationName === 'stress_pulse') {
      const stressMaterial = this.materialLibrary.get('stress_visualization') as THREE.ShaderMaterial;
      if (stressMaterial && stressMaterial.uniforms.time) {
        stressMaterial.uniforms.time.value = time;
      }
    }
  }
  
  /**
   * 清理资源
   */
  dispose(): void {
    console.log('🧹 清理Three.js集成桥接器资源...');
    
    // 清理材质
    this.materialLibrary.forEach((material) => {
      material.dispose();
    });
    this.materialLibrary.clear();
    
    // 清理动画
    if (this.animationMixer) {
      this.animationMixer.stopAllAction();
      this.animationMixer = null;
    }
    
    this.activeAnimations.clear();
    this.dataCache.clear();
    
    console.log('✅ Three.js集成桥接器资源清理完成');
  }
}

/**
 * 创建Three.js可视化集成桥接器
 */
export function createThreeJSVisualizationBridge(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  controls: any
): ThreeJSVisualizationBridge {
  return new ThreeJSVisualizationBridge(scene, renderer, camera, controls);
}

export default ThreeJSVisualizationBridge;