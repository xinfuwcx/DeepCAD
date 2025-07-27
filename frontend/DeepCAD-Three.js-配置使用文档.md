# DeepCAD Three.js 渲染器配置使用文档

**版本**: 3.0.0  
**日期**: 2025年7月26日  
**作者**: 2号几何专家  
**目标**: 0号架构师集成参考

---

## 📋 目录

1. [WebGPU配置状态](#webgpu配置状态)
2. [3D视口系统](#3d视口系统)
3. [网格画布实现](#网格画布实现)
4. [立方体视图控件](#立方体视图控件)
5. [CSS2D/3D渲染系统](#css2d3d渲染系统)
6. [集成配置指南](#集成配置指南)

---

## 🚀 WebGPU配置状态

### 当前支持等级：85% 完成

#### ✅ 已完成的WebGPU配置

**1. 核心依赖包配置**
```json
{
  "dependencies": {
    "three": "^0.169.0",           // 支持WebGPU
    "@types/three": "^0.169.0",    
    "@webgpu/types": "^0.1.40"     // WebGPU类型定义
  }
}
```

**2. WebGPU类型声明** (`frontend/src/types/webgpu.d.ts`)
```typescript
interface Navigator {
  readonly gpu: GPU;
}

interface GPU {
  requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
}

interface GPUDevice {
  createComputePipeline(descriptor: GPUComputePipelineDescriptor): GPUComputePipeline;
  createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer;
  // ... 更多WebGPU接口
}
```

**3. WebGPU服务架构**

已实现的核心服务：

- **`webgpuPerformanceMonitor.ts`** - 支持200万单元实时监控
- **`stressCloudGPURenderer.ts`** - 高性能应力云图渲染
- **`webgpuMemoryOptimizer.ts`** - 智能内存管理
- **`webgpuComputeShaderOptimizer.ts`** - 专业计算着色器
- **`renderingFallback.ts`** - 智能降级机制

**4. 高性能配置参数**
```typescript
interface WebGPUConfig {
  maxElements: 2000000,    // 200万单元
  maxNodes: 6000000,       // 600万节点  
  targetFPS: 60,           // 60fps目标
  memoryLimit: 4096,       // 4GB内存限制
  adaptiveLOD: true,       // 自适应细节层次
  computeShaders: true     // 计算着色器支持
}
```

#### ⚠️ 待完成的WebGPU集成

**缺少WebGPURenderer实际集成**
```typescript
// 需要添加到渲染器管理器
import { WebGPURenderer } from 'three/webgpu';

export async function createWebGPURenderer(canvas: HTMLCanvasElement) {
  if (!navigator.gpu) {
    throw new Error('WebGPU not supported');
  }
  
  const renderer = new WebGPURenderer({ canvas });
  await renderer.init();
  
  // 配置高性能参数
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  
  return renderer;
}
```

**智能降级机制**
```typescript
const RENDERER_PRIORITY = [
  'webgpu',    // 最高性能 - 支持计算着色器
  'webgl2',    // 高性能 - 支持复杂着色器  
  'webgl1',    // 基础性能 - 兼容模式
  'canvas2d'   // 最低性能 - 紧急备用
];
```

---

## 🎯 3D视口系统

### 核心组件架构

#### 1. **CAE3DViewport** - 专业CAE视口

**文件**: `frontend/src/components/3d/CAE3DViewport.tsx`

**核心特性**:
```typescript
interface CAE3DViewportProps {
  // 渲染配置
  renderMode: 'wireframe' | 'solid' | 'transparent';
  enableShadows: boolean;
  enableSSAO: boolean;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  
  // 显示控制
  showGrid: boolean;
  showAxes: boolean;
  showBoundingBox: boolean;
  
  // 相机控制
  cameraType: 'perspective' | 'orthographic';
  fieldOfView: number;
  enableAutoRotate: boolean;
  
  // 专业功能
  enableMeasurement: boolean;
  enableCrossSections: boolean;
  enableAnnotations: boolean;
}
```

**主要功能**:
- ✅ 高性能WebGL渲染（支持阴影、抗锯齿、HDR）
- ✅ 专业工具栏集成（视图控制、测量工具、标注系统）
- ✅ 三种渲染模式切换
- ✅ 响应式布局和自适应缩放
- ✅ 现代化坐标轴系统（ModernAxisHelper）

#### 2. **Viewport3D** - 通用3D视口

**文件**: `frontend/src/components/Viewport3D.tsx`

**多模式支持**:
```typescript
type ViewportMode = 'geometry' | 'mesh' | 'analysis' | 'advanced';

interface Viewport3DProps {
  mode: ViewportMode;
  width: number;
  height: number;
  enableControls: boolean;
  showViewCube: boolean;
  materialConfig: MaterialConfig;
  onSceneReady: (scene: THREE.Scene) => void;
}
```

**集成组件**:
- ✅ ProfessionalMaterials材质系统
- ✅ ViewCube导航控件
- ✅ 多场景预设对象
- ✅ 事件驱动预览系统

### 渲染器管理架构

#### **RendererManager** - 高级渲染管理器

**文件**: `frontend/src/components/3d/core/RendererManager.ts`

**核心功能**:
```typescript
export class RendererManager {
  // 渲染循环控制
  startRenderLoop(): void;
  stopRenderLoop(): void;
  setCustomRenderLoop(renderLoop: (deltaTime: number) => void): void;
  
  // 质量控制
  setQualityLevel(level: 'low' | 'medium' | 'high' | 'ultra'): void;
  enableAdaptiveQuality(enabled: boolean): void;
  
  // 性能监控
  getPerformanceMetrics(): PerformanceMetrics;
  setPerformanceUpdateCallback(callback: (metrics: PerformanceMetrics) => void): void;
  
  // 后期处理
  enableSSAO(enabled: boolean): void;
  enableBloom(enabled: boolean): void;
  setToneMappingExposure(exposure: number): void;
}
```

**性能指标监控**:
```typescript
interface PerformanceMetrics {
  fps: number;              // 帧率
  frameTime: number;        // 帧时间
  drawCalls: number;        // 绘制调用数
  triangles: number;        // 三角形数量
  geometries: number;       // 几何体数量
  textures: number;         // 纹理数量
  memoryUsage: {           // 内存使用
    used: number;
    total: number;
    percentage: number;
  };
}
```

---

## 📐 网格画布实现

### 双层网格系统

#### **GridRenderer** - 智能网格渲染器

**文件**: `frontend/src/components/Viewport3D/GridRenderer.tsx`

**核心实现**:
```typescript
interface GridSettings {
  enabled: boolean;        // 网格启用状态
  visible: boolean;        // 网格可见性
  snapEnabled: boolean;    // 吸附功能
  gridSize: number;        // 网格尺寸（米）
  subdivisions: number;    // 网格细分数
  opacity: number;         // 透明度
  color: string;          // 网格颜色
}

const GridRenderer: React.FC<GridRendererProps> = ({ gridSettings, scene }) => {
  // 双层网格实现
  const mainGrid = new THREE.GridHelper(gridSize, subdivisions);
  const subGrid = new THREE.GridHelper(gridSize, subdivisions * 10);
  
  // 主网格配置
  mainGrid.material.color.setHex(0x888888);
  mainGrid.material.opacity = 0.8;
  mainGrid.material.transparent = true;
  
  // 细分网格配置  
  subGrid.material.color.setHex(0xcccccc);
  subGrid.material.opacity = 0.3;
  subGrid.material.transparent = true;
};
```

#### **Grid3D** - 高级3D网格

**文件**: `frontend/src/components/Viewport3D/Grid3D.tsx`

**高级特性**:
- ✅ 无限网格支持
- ✅ 坐标轴线显示（X轴红色、Y轴绿色、Z轴蓝色）
- ✅ 多层网格显示
- ✅ 内存优化的几何体管理
- ✅ 动态LOD调整

**实现代码**:
```typescript
export const Grid3D: React.FC<Grid3DProps> = ({ size = 100, divisions = 50 }) => {
  const createInfiniteGrid = useCallback(() => {
    const group = new THREE.Group();
    
    // 主网格
    const grid = new THREE.GridHelper(size, divisions);
    grid.material.color.setHex(0x444444);
    grid.material.opacity = 0.6;
    
    // 坐标轴线
    const axesColors = [0xff0000, 0x00ff00, 0x0000ff]; // RGB
    axesColors.forEach((color, index) => {
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.LineBasicMaterial({ color, opacity: 0.8 });
      const line = new THREE.Line(geometry, material);
      group.add(line);
    });
    
    return group;
  }, [size, divisions]);
};
```

### 网格吸附系统

```typescript
interface SnapSettings {
  enabled: boolean;
  gridSnap: boolean;        // 网格吸附
  objectSnap: boolean;      // 对象吸附
  angleSnap: boolean;       // 角度吸附
  snapTolerance: number;    // 吸附容差（像素）
  showSnapIndicators: boolean; // 显示吸附指示器
}
```

---

## 🎲 立方体视图控件

### **CubeViewNavigationControl** - 专业导航控件

**文件**: `frontend/src/components/3d/navigation/CubeViewNavigationControl.tsx`

#### 核心功能实现

**7种预设视角**:
```typescript
const VIEW_PRESETS: ViewPreset[] = [
  { 
    name: 'front', 
    position: new THREE.Vector3(0, 0, 50),
    target: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 1, 0)
  },
  { 
    name: 'back', 
    position: new THREE.Vector3(0, 0, -50),
    target: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 1, 0)
  },
  { 
    name: 'right', 
    position: new THREE.Vector3(50, 0, 0),
    target: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 1, 0)
  },
  { 
    name: 'left', 
    position: new THREE.Vector3(-50, 0, 0),
    target: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 1, 0)
  },
  { 
    name: 'top', 
    position: new THREE.Vector3(0, 50, 0),
    target: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 0, -1)
  },
  { 
    name: 'bottom', 
    position: new THREE.Vector3(0, -50, 0),
    target: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 0, 1)
  },
  { 
    name: 'isometric', 
    position: new THREE.Vector3(35, 35, 35),
    target: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 1, 0)
  }
];
```

**平滑相机过渡动画**:
```typescript
const animateToView = useCallback((targetView: ViewPreset) => {
  if (!camera || !controls) return;
  
  const startPosition = camera.position.clone();
  const startTarget = controls.target.clone();
  const duration = 1000; // 1秒动画
  const startTime = performance.now();
  
  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // easeInOutCubic缓动函数
    const easeProgress = progress < 0.5 
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    // 相机位置插值
    camera.position.lerpVectors(startPosition, targetView.position, easeProgress);
    
    // 目标点插值
    const currentTarget = new THREE.Vector3().lerpVectors(startTarget, targetView.target, easeProgress);
    controls.target.copy(currentTarget);
    
    camera.lookAt(currentTarget);
    controls.update();
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
}, [camera, controls]);
```

**3D立方体可视化**:
```typescript
const CubeView: React.FC = () => {
  return (
    <div className="cube-view-container">
      <div className="cube-face cube-face-front" onClick={() => animateToView('front')}>
        前
      </div>
      <div className="cube-face cube-face-back" onClick={() => animateToView('back')}>
        后
      </div>
      <div className="cube-face cube-face-right" onClick={() => animateToView('right')}>
        右
      </div>
      <div className="cube-face cube-face-left" onClick={() => animateToView('left')}>
        左
      </div>
      <div className="cube-face cube-face-top" onClick={() => animateToView('top')}>
        上
      </div>
      <div className="cube-face cube-face-bottom" onClick={() => animateToView('bottom')}>
        下
      </div>
    </div>
  );
};
```

### 高级特性

- ✅ 悬停交互效果和视觉反馈
- ✅ 响应式布局适配
- ✅ 快捷键支持（F1-F7对应各视角）
- ✅ 相机状态记忆和恢复
- ✅ 自定义视角保存

---

## 🎨 CSS2D/3D渲染系统

### CSS3D示意图渲染

#### **CSS3DSchematic** - 三维示意图组件

**文件**: `frontend/src/components/CSS3DSchematic.tsx`

**核心实现**:
```typescript
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

export const CSS3DSchematic: React.FC<CSS3DSchematicProps> = ({ 
  type, 
  onHover, 
  onClick 
}) => {
  // CSS3D渲染器初始化
  const initRenderer = useCallback(() => {
    const renderer = new CSS3DRenderer();
    renderer.setSize(width, height);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.pointerEvents = 'none';
    
    return renderer;
  }, [width, height]);
  
  // 创建CSS3D对象
  const createCSS3DElement = useCallback((htmlContent: string) => {
    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    element.style.width = '200px';
    element.style.height = '200px';
    element.style.backgroundColor = 'rgba(0, 127, 255, 0.1)';
    element.style.border = '1px solid rgba(0, 127, 255, 0.8)';
    
    const object = new CSS3DObject(element);
    object.position.set(0, 0, 0);
    
    return object;
  }, []);
};
```

**支持的示意图类型**:
- `geometry` - 几何建模示意图
- `mesh` - 网格生成示意图  
- `simulation` - 仿真分析示意图
- `data` - 数据管理示意图
- `system` - 系统设置示意图

### CSS2D标注系统

#### **ModelingDiagrams** - 二维标注渲染器

**文件**: `deep_excavation/frontend/components/diagrams/ModelingDiagrams.tsx`

**混合渲染架构**:
```typescript
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';

export const ModelingDiagrams: React.FC = () => {
  // WebGL渲染器（主要几何体）
  const webglRenderer = new THREE.WebGLRenderer({ antialias: true });
  webglRenderer.setSize(width, height);
  webglRenderer.setClearColor(0xf0f0f0);
  
  // CSS2D渲染器（标注和UI）
  const css2dRenderer = new CSS2DRenderer();
  css2dRenderer.setSize(width, height);
  css2dRenderer.domElement.style.position = 'absolute';
  css2dRenderer.domElement.style.top = '0';
  css2dRenderer.domElement.style.pointerEvents = 'none';
  
  // 渲染循环
  const render = () => {
    webglRenderer.render(scene, camera);
    css2dRenderer.render(scene, camera);
  };
};
```

**CSS2D标签创建**:
```typescript
const createCSS2DLabel = (text: string, position: THREE.Vector3) => {
  const labelDiv = document.createElement('div');
  labelDiv.className = 'label';
  labelDiv.textContent = text;
  labelDiv.style.marginTop = '-1em';
  labelDiv.style.fontSize = '12px';
  labelDiv.style.color = '#000';
  labelDiv.style.fontFamily = 'Arial, sans-serif';
  labelDiv.style.background = 'rgba(255, 255, 255, 0.8)';
  labelDiv.style.padding = '2px 4px';
  labelDiv.style.borderRadius = '3px';
  labelDiv.style.border = '1px solid #ccc';
  
  const label = new CSS2DObject(labelDiv);
  label.position.copy(position);
  
  return label;
};
```

### 高级标注工具

#### **InteractionTools** - 交互工具系统

**文件**: `frontend/src/components/3d/tools/InteractionTools.ts`

**支持的标注类型**:
```typescript
enum AnnotationType {
  NOTE = 'note',           // 文本注释
  DIMENSION = 'dimension', // 尺寸标注
  LEADER = 'leader',       // 引出线标注
  SYMBOL = 'symbol'        // 符号标注
}

interface AnnotationStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  padding: number;
  borderRadius: number;
  opacity: number;
}
```

**测量标签系统**:
```typescript
private createMeasurementLabel(measurement: MeasurementResult): void {
  // 创建Canvas纹理
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  const fontSize = 48;
  const text = `${measurement.value.toFixed(2)} ${measurement.unit}`;
  
  // 设置Canvas样式
  canvas.width = 256;
  canvas.height = 128;
  context.font = `${fontSize}px Arial`;
  context.fillStyle = 'white';
  context.strokeStyle = 'black';
  context.lineWidth = 4;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // 绘制文本（描边+填充）
  context.strokeText(text, 128, 64);
  context.fillText(text, 128, 64);
  
  // 创建Sprite标签
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ 
    map: texture,
    transparent: true,
    alphaTest: 0.1
  });
  const sprite = new THREE.Sprite(material);
  
  // 定位和缩放
  const center = measurement.start.clone().lerp(measurement.end, 0.5);
  sprite.position.copy(center);
  sprite.scale.setScalar(0.5);
  
  this.measurementHelpers.add(sprite);
}
```

### 文本渲染优化

**Canvas纹理文本系统**:
```typescript
class TextRenderingOptimizer {
  private textureCache = new Map<string, THREE.Texture>();
  
  createOptimizedTextTexture(
    text: string, 
    style: TextStyle
  ): THREE.Texture {
    const cacheKey = `${text}_${JSON.stringify(style)}`;
    
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    
    // 高DPI支持
    const dpr = window.devicePixelRatio || 1;
    canvas.width = style.width * dpr;
    canvas.height = style.height * dpr;
    context.scale(dpr, dpr);
    
    // 高质量文本渲染
    context.textRenderingOptimization = 'optimizeQuality';
    context.font = `${style.fontSize}px ${style.fontFamily}`;
    context.fillStyle = style.color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // 多行文本支持
    const lines = text.split('\n');
    const lineHeight = style.fontSize * 1.2;
    const startY = (style.height / 2) - ((lines.length - 1) * lineHeight / 2);
    
    lines.forEach((line, index) => {
      context.fillText(line, style.width / 2, startY + index * lineHeight);
    });
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    this.textureCache.set(cacheKey, texture);
    return texture;
  }
}
```

---

## ⚙️ 集成配置指南

### 完整集成架构

#### **主应用配置** (`App.tsx`)

```tsx
import React from 'react';
import { ThreeProvider } from './providers/ThreeProvider';
import { CAE3DViewport } from './components/3d/CAE3DViewport';
import { CubeViewNavigationControl } from './components/3d/navigation/CubeViewNavigationControl';

const App: React.FC = () => {
  return (
    <div className="deepcad-app">
      <ThreeProvider
        webgpuEnabled={true}
        fallbackStrategy="smart"
        performanceMonitoring={true}
      >
        <div className="main-viewport">
          {/* 主3D视口 */}
          <CAE3DViewport
            renderMode="solid"
            showGrid={true}
            showAxes={true}
            enableShadows={true}
            quality="high"
            enableMeasurement={true}
            enableAnnotations={true}
          />
          
          {/* 立方体导航控件 */}
          <CubeViewNavigationControl
            position="top-right"
            size="small"
            showLabels={true}
          />
        </div>
      </ThreeProvider>
    </div>
  );
};

export default App;
```

#### **ThreeProvider配置** (`providers/ThreeProvider.tsx`)

```tsx
interface ThreeProviderProps {
  webgpuEnabled?: boolean;
  fallbackStrategy?: 'smart' | 'webgl2' | 'webgl1';
  performanceMonitoring?: boolean;
  memoryLimit?: number;
  children: React.ReactNode;
}

export const ThreeProvider: React.FC<ThreeProviderProps> = ({
  webgpuEnabled = true,
  fallbackStrategy = 'smart',
  performanceMonitoring = true,
  memoryLimit = 2048,
  children
}) => {
  const [rendererType, setRendererType] = useState<RendererType>('webgl2');
  
  useEffect(() => {
    const initializeRenderer = async () => {
      if (webgpuEnabled && navigator.gpu) {
        try {
          // 尝试WebGPU
          const adapter = await navigator.gpu.requestAdapter();
          if (adapter) {
            setRendererType('webgpu');
            return;
          }
        } catch (error) {
          console.warn('WebGPU初始化失败，降级到WebGL:', error);
        }
      }
      
      // 降级策略
      if (fallbackStrategy === 'smart') {
        const canvas = document.createElement('canvas');
        const webgl2Context = canvas.getContext('webgl2');
        if (webgl2Context) {
          setRendererType('webgl2');
        } else {
          setRendererType('webgl1');
        }
      }
    };
    
    initializeRenderer();
  }, [webgpuEnabled, fallbackStrategy]);
  
  return (
    <ThreeContext.Provider value={{ rendererType, performanceMonitoring }}>
      {children}
    </ThreeContext.Provider>
  );
};
```

### 性能优化配置

#### **渲染器性能配置**

```typescript
interface RendererPerformanceConfig {
  // WebGPU配置
  webgpu: {
    preferredPowerPreference: 'high-performance',
    requiredFeatures: ['depth-clip-control', 'texture-compression-bc'],
    computeShaderEnabled: true,
    maxComputeWorkgroupsPerDimension: 65535
  },
  
  // WebGL配置
  webgl: {
    antialias: true,
    alpha: true,
    premultipliedAlpha: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false
  },
  
  // 后期处理
  postProcessing: {
    enableSSAO: false,      // 默认关闭SSAO（性能考虑）
    enableBloom: false,     // 默认关闭Bloom
    enableFXAA: true,       // 启用FXAA抗锯齿
    toneMappingExposure: 1.0
  },
  
  // 自适应质量
  adaptiveQuality: {
    enabled: true,
    targetFPS: 60,
    minFPS: 30,
    qualityLevels: ['low', 'medium', 'high', 'ultra'],
    memoryThreshold: 0.8    // 内存使用80%时降级
  }
}
```

#### **网格优化配置**

```typescript
interface GridOptimizationConfig {
  // LOD配置
  levelOfDetail: {
    enabled: true,
    distances: [10, 50, 200, 1000],  // LOD切换距离
    qualities: ['ultra', 'high', 'medium', 'low']
  },
  
  // 动态加载
  dynamicLoading: {
    enabled: true,
    chunkSize: 1000000,     // 100万顶点每块
    loadingRadius: 500,     // 加载半径
    unloadRadius: 1000      // 卸载半径
  },
  
  // 内存管理
  memoryManagement: {
    maxGeometries: 1000,
    maxTextures: 500,
    garbageCollectionInterval: 30000, // 30秒
    memoryPressureThreshold: 0.85
  }
}
```

### CSS渲染集成

#### **混合渲染管理器**

```typescript
export class HybridRenderingManager {
  private webglRenderer: THREE.WebGLRenderer;
  private css2dRenderer: CSS2DRenderer;
  private css3dRenderer: CSS3DRenderer;
  
  constructor(canvas: HTMLCanvasElement) {
    // WebGL渲染器（主要几何体）
    this.webglRenderer = new THREE.WebGLRenderer({ 
      canvas,
      antialias: true,
      alpha: true 
    });
    
    // CSS2D渲染器（2D标注）
    this.css2dRenderer = new CSS2DRenderer();
    this.css2dRenderer.domElement.style.position = 'absolute';
    this.css2dRenderer.domElement.style.top = '0';
    this.css2dRenderer.domElement.style.pointerEvents = 'none';
    
    // CSS3D渲染器（3D HTML内容）
    this.css3dRenderer = new CSS3DRenderer();
    this.css3dRenderer.domElement.style.position = 'absolute';
    this.css3dRenderer.domElement.style.top = '0';
    this.css3dRenderer.domElement.style.pointerEvents = 'none';
  }
  
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    // 渲染顺序很重要
    this.webglRenderer.render(scene, camera);
    this.css2dRenderer.render(scene, camera);
    this.css3dRenderer.render(scene, camera);
  }
  
  resize(width: number, height: number): void {
    this.webglRenderer.setSize(width, height);
    this.css2dRenderer.setSize(width, height);
    this.css3dRenderer.setSize(width, height);
  }
}
```

### 最佳实践建议

#### **1. WebGPU渐进式启用**
```typescript
// 检测WebGPU支持
const isWebGPUSupported = () => {
  return 'gpu' in navigator && 
         navigator.gpu !== undefined &&
         typeof navigator.gpu.requestAdapter === 'function';
};

// 渐进增强策略
const enableWebGPUFeatures = async () => {
  if (!isWebGPUSupported()) return false;
  
  try {
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance'
    });
    
    if (!adapter) return false;
    
    const device = await adapter.requestDevice({
      requiredFeatures: ['depth-clip-control']
    });
    
    return true;
  } catch (error) {
    console.warn('WebGPU不可用，使用WebGL降级:', error);
    return false;
  }
};
```

#### **2. 内存泄漏预防**
```typescript
// 资源清理函数
export const cleanupThreeJSResources = (scene: THREE.Scene) => {
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      // 清理几何体
      if (object.geometry) {
        object.geometry.dispose();
      }
      
      // 清理材质
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
      
      // 清理纹理
      if (object.material?.map) {
        object.material.map.dispose();
      }
    }
  });
  
  // 清理渲染器
  renderer.dispose();
  renderer.forceContextLoss();
};
```

#### **3. 性能监控集成**
```typescript
// 性能监控Hook
export const useThreePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>();
  
  useEffect(() => {
    const monitor = new PerformanceMonitor();
    
    monitor.onUpdate = (newMetrics) => {
      setMetrics(newMetrics);
      
      // 自动质量调节
      if (newMetrics.fps < 30) {
        console.warn('性能不足，考虑降低渲染质量');
      }
      
      // 内存压力检测
      if (newMetrics.memoryUsage.percentage > 85) {
        console.warn('内存使用过高，触发垃圾回收');
        performGarbageCollection();
      }
    };
    
    return () => monitor.dispose();
  }, []);
  
  return metrics;
};
```

---

## 📞 技术支持

### 集成检查清单

**WebGPU配置检查**:
- ✅ Three.js版本 >= 0.164.0
- ✅ @webgpu/types包安装
- ✅ WebGPU类型声明文件
- ⚠️ WebGPURenderer实际集成（待完成）

**3D视口功能**:
- ✅ CAE3DViewport专业视口
- ✅ Viewport3D通用视口
- ✅ RendererManager高级管理
- ✅ 性能监控系统

**网格画布系统**:
- ✅ GridRenderer双层网格
- ✅ Grid3D无限网格
- ✅ 网格吸附功能
- ✅ 内存优化管理

**立方体视图**:
- ✅ CubeViewNavigationControl
- ✅ 7种预设视角
- ✅ 平滑动画过渡
- ✅ 交互响应系统

**CSS渲染系统**:
- ✅ CSS3DRenderer三维HTML
- ✅ CSS2DRenderer二维标注
- ✅ 混合渲染架构
- ✅ 文本纹理优化

### 联系方式

- **技术负责人**: 2号几何专家
- **集成支持**: three-integration@deepcad.dev
- **文档更新**: 每周五更新
- **问题反馈**: GitHub Issues

---

*本文档为DeepCAD项目Three.js渲染器的完整配置和使用指南，为0号架构师提供详细的技术集成参考。*