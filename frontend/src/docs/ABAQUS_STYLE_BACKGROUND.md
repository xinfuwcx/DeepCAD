# ABAQUS风格渐变背景实现

## 概述

本文档描述了如何在DeepCAD的3D视口中实现ABAQUS风格的渐变背景效果。

## 实现的组件

### 1. Viewport3D.tsx
- 在场景初始化时创建ABAQUS风格的渐变背景
- 使用Three.js ShaderMaterial实现垂直渐变效果
- 颜色从天空蓝(#87CEEB)渐变到淡蓝白色(#F0F8FF)

### 2. CAEThreeEngine.tsx
- 在CAE引擎中集成了相同的渐变背景
- 提供了createAbaqusGradientBackground()私有方法
- 更新了React组件的CSS背景以匹配3D场景

### 3. Viewport.tsx
- 更新了视口容器的CSS背景样式
- 调整了内阴影效果以配合新的颜色方案

### 4. EnvironmentManager.ts
- 扩展了环境管理器，添加了多种CAE软件风格的背景
- 提供了createAbaqusBackground()、createAnsysBackground()、createSolidWorksBackground()方法

## 颜色方案

### ABAQUS风格
- 顶部颜色: #87CEEB (天空蓝)
- 底部颜色: #F0F8FF (淡蓝白色)

### ANSYS风格
- 顶部颜色: #4169E1 (皇家蓝)
- 底部颜色: #E6E6FA (淡紫色)

### SolidWorks风格
- 顶部颜色: #87CEFA (浅天空蓝)
- 底部颜色: #F5F5F5 (烟白色)

## 使用方法

### 在现有组件中应用ABAQUS背景

```typescript
// 使用EnvironmentManager
const envManager = new EnvironmentManager(scene);
envManager.createAbaqusBackground();

// 或直接在场景中创建
const createAbaqusGradientBackground = () => {
  const gradientShader = {
    uniforms: {
      topColor: { value: new THREE.Color(0x87CEEB) },
      bottomColor: { value: new THREE.Color(0xF0F8FF) },
      offset: { value: 33 },
      exponent: { value: 0.6 }
    },
    vertexShader: `...`,
    fragmentShader: `...`
  };

  const skyGeometry = new THREE.SphereGeometry(450000, 32, 15);
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: gradientShader.uniforms,
    vertexShader: gradientShader.vertexShader,
    fragmentShader: gradientShader.fragmentShader,
    side: THREE.BackSide,
    depthWrite: false
  });

  const skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(skyMesh);
};
```

## 技术细节

### Shader实现
- 使用Three.js的ShaderMaterial创建自定义渐变效果
- 顶点着色器计算世界坐标
- 片段着色器基于Y坐标实现垂直渐变
- 使用mix函数在两种颜色间平滑插值

### 性能优化
- 使用大半径球体(450000单位)作为天空盒
- 设置side: THREE.BackSide只渲染内表面
- 禁用深度写入(depthWrite: false)避免遮挡其他对象

## 自定义选项

可以通过修改uniforms中的参数来调整渐变效果：
- `topColor`: 顶部颜色
- `bottomColor`: 底部颜色  
- `offset`: 渐变偏移量
- `exponent`: 渐变曲线的指数值

## 兼容性

- 支持所有现代WebGL浏览器
- 与现有的Three.js渲染管线完全兼容
- 不影响其他3D对象的渲染性能