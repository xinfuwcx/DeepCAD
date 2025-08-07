# 地质重建3D视口使用指南

## 🎯 概述

地质重建3D视口是专门为地质建模设计的可视化组件，完整实现了 **GemPy → PyVista → Three.js** 技术路线，并集成了专业的几何建模工具栏。

## 🚀 技术架构

```
📊 钻孔数据输入
    ↓
🏔️ GemPy 地质建模
    ├── 地质插值计算
    ├── 地层界面重建  
    └── 3D 地质体生成
    ↓
🎨 PyVista 处理
    ├── 网格优化
    ├── 材质赋予
    └── 渲染数据准备
    ↓
🌐 Three.js + 几何工具栏
    ├── CAE引擎渲染
    ├── 几何建模工具
    ├── 专业交互控制
    └── 地质专用功能
```

## 📋 主要功能

### 🛠️ **集成的几何建模工具栏**
- **基础工具**: 选择、平移、缩放、重置视图
- **测量工具**: 距离测量、角度测量
- **高级工具**: 剖切、爆炸视图、线框模式、标注
- **系统工具**: 撤销、重做、保存、导出、设置

### 🏔️ **地质专用功能**
- **多种渲染模式**: 实体、线框、透明、剖面
- **图层控制**: 地层显示/隐藏、透明度调节
- **钻孔可视化**: 3D钻孔柱状图显示
- **剖面分析**: 实时剖面切片功能
- **动画播放**: 地质演化过程动画

### 🎨 **专业视觉效果**
- **ABAQUS风格**: 专业CAE软件外观
- **实时光照**: 物理正确的光照系统
- **材质系统**: 地质专用材质库
- **性能优化**: LOD、硬件加速、内存管理

## 📖 使用方法

### 1. **基本使用**

```tsx
import GeologyReconstructionViewport3D from './components/geology/GeologyReconstructionViewport3D';

<GeologyReconstructionViewport3D
  geologicalData={geologicalModelData}
  boreholeData={boreholeArray}
  onToolSelect={(tool) => console.log('工具选择:', tool)}
  onLayerVisibilityChange={(layerId, visible) => console.log('图层:', layerId, visible)}
  onRenderModeChange={(mode) => console.log('渲染模式:', mode)}
  showToolbar={true}
  showLayerControls={true}
  enableAnimation={true}
/>
```

### 2. **在地质重建面板中使用**

组件已自动集成到 `EnhancedGeologyReconstructionPanel` 中：
- 进入工作区 → 地质重建
- 选择 "地质重建" 标签页
- 上传钻孔数据
- 配置参数并开始重建
- 切换到 "3D视口" 标签页查看结果

### 3. **工具栏操作**

#### **基础操作**
- **选择工具 (S)**: 选择地质对象
- **平移 (P)**: 拖拽移动视图
- **缩放 (Z)**: 滚轮或手势缩放
- **重置 (Home)**: 恢复默认视角

#### **测量功能**
- **距离测量 (D)**: 点击两点测量距离
- **角度测量 (A)**: 选择三点测量角度

#### **高级功能**
- **剖切 (C)**: 创建地质剖面
- **爆炸视图 (E)**: 分离显示各地层
- **线框模式 (W)**: 切换线框/实体显示
- **标注 (T)**: 添加文字标注

### 4. **控制面板功能**

#### **渲染模式**
- **实体模式**: 标准3D实体显示
- **线框模式**: 仅显示边框线条
- **透明模式**: 半透明显示，便于观察内部结构
- **剖面模式**: 实时剖面切片

#### **显示控制**
- **全局透明度**: 调整整体透明度
- **钻孔开关**: 显示/隐藏钻孔数据
- **剖面开关**: 启用/禁用剖面模式
- **剖面位置**: 调整剖面切割位置

## 🔧 数据格式

### **地质模型数据格式**
```typescript
interface GeologicalModelData {
  type: 'geological_model';
  version: string;
  timestamp: number;
  formations: {
    [formationId: string]: {
      type: 'geological_mesh';
      formation: string;
      geometry: {
        vertices: number[];    // [x1,y1,z1, x2,y2,z2, ...]
        normals: number[];     // [nx1,ny1,nz1, nx2,ny2,nz2, ...]
        indices: number[];     // [i1,i2,i3, i4,i5,i6, ...]
        colors: number[];      // [r1,g1,b1, r2,g2,b2, ...]
      };
      material: {
        color: number[];
        opacity: number;
        transparent: boolean;
      };
    }
  };
  statistics: {
    formation_count: number;
    total_vertices: number;
    total_faces: number;
    conversion_time: number;
  };
}
```

### **钻孔数据格式**
```typescript
interface BoreholeData {
  id: string;
  name: string;
  x: number;        // X坐标
  y: number;        // Y坐标
  z: number;        // 孔口高程
  depth: number;    // 钻孔深度
  layers: {
    id: string;
    name: string;
    topDepth: number;
    bottomDepth: number;
    soilType: string;
    color: string;
    visible: boolean;
    opacity: number;
  }[];
}
```

## 🎨 自定义样式

### **主题颜色**
- 主色调: `#00d9ff` (青蓝色)
- 背景色: `#1a1a1a` → `#2c3e50` (渐变)
- 强调色: `#ff6b6b` (红色，用于剖面模式)

### **CSS变量**
```css
:root {
  --geology-primary: #00d9ff;
  --geology-background: linear-gradient(135deg, #1a1a1a 0%, #2c3e50 100%);
  --geology-panel-bg: rgba(0, 0, 0, 0.8);
  --geology-border: rgba(0, 217, 255, 0.3);
}
```

## 🚀 性能优化

### **推荐配置**
- **小型项目** (< 50 钻孔): 全功能开启
- **中型项目** (50-200 钻孔): 适度降低分辨率
- **大型项目** (> 200 钻孔): 启用LOD优化

### **优化建议**
1. **合理使用透明度**: 避免过多透明对象重叠
2. **适时切换渲染模式**: 线框模式性能更好
3. **控制动画频率**: 复杂场景时降低动画帧率
4. **及时清理资源**: 切换数据时清理旧对象

## 🔗 相关文件

### **核心组件**
- `GeologyReconstructionViewport3D.tsx` - 主3D视口组件
- `GeologyReconstructionViewport3D.css` - 样式文件
- `EnhancedGeologyReconstructionPanel.tsx` - 集成面板

### **依赖服务**
- `GeologicalThreeJSRenderer.ts` - 地质渲染器
- `PyVistaIntegrationService.ts` - PyVista集成服务
- `CAEThreeEngine.tsx` - CAE引擎基础
- `VerticalToolbar.tsx` - 几何建模工具栏

### **技术栈**
- `gempy` - 地质建模计算
- `pyvista` - 数据处理和转换
- `three.js` - WebGL渲染
- `react` - UI框架
- `antd` - UI组件库

## 🐛 常见问题

### **Q: 3D视口显示空白**
**A:** 检查以下几点：
1. 确保 GemPy 和 PyVista 已正确安装
2. 检查地质数据格式是否正确
3. 查看浏览器控制台是否有错误信息

### **Q: 工具栏按钮无响应**
**A:** 确认以下设置：
1. `showToolbar={true}` 已设置
2. `onToolSelect` 回调函数已定义
3. 组件已完全初始化

### **Q: 钻孔数据不显示**
**A:** 检查数据格式：
1. 坐标系统是否一致
2. 深度值是否为正数
3. 图层数据是否完整

### **Q: 性能问题**
**A:** 优化建议：
1. 减少同时显示的钻孔数量
2. 使用线框模式替代实体模式
3. 关闭不必要的动画效果
4. 启用LOD优化

## 📞 技术支持

如遇到问题，请提供：
1. 错误信息和控制台日志
2. 使用的数据格式示例
3. 浏览器和版本信息
4. 操作步骤复现方式

---

**🎉 现在你拥有了一个完整的专业级地质重建3D视口！**