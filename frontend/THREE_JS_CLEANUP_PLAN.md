# Three.js依赖清理方案

## 🎯 目标
统一Three.js版本到 `0.164.1`，移除不必要的依赖，减少包体积和版本冲突。

## 📋 当前状况分析

### ✅ 保留的核心依赖
```json
{
  "three": "^0.164.1",           // 核心库 - 必需
  "three-stdlib": "^2.36.0",    // 标准扩展 - 必需（加载器等）
  "@types/three": "^0.161.2"    // TypeScript类型 - 必需
}
```

### ⚠️ 需要评估的依赖
```json
{
  "@react-three/fiber": "^9.2.0",    // React集成 - 可选（我们有CAEThreeEngine）
  "@react-three/drei": "^10.5.1"     // 工具组件 - 可选（部分组件使用）
}
```

### ❌ 建议移除的依赖
```json
{
  "@monogrid/gainmap-js": "^3.1.0",        // HDR相关 - 不需要
  "@react-three/postprocessing": "^3.0.4", // 后处理 - 我们有自己的系统
  "camera-controls": "^3.1.0",             // 相机控制 - 我们有OrbitControls
  "maath": "^0.10.8",                      // 数学库 - 重复功能
  "meshline": "^3.3.1",                   // 线条渲染 - 不常用
  "n8ao": "^1.10.1",                      // AO效果 - 不需要
  "postprocessing": "^6.37.6",            // 后处理效果 - 重复
  "stats-gl": "^2.4.2",                   // 性能统计 - 有更好的方案
  "three-mesh-bvh": "^0.8.3",             // BVH加速 - 暂不需要
  "troika-three-text": "^0.52.4",         // 文本渲染 - 不常用
  "troika-three-utils": "^0.52.4"         // 工具 - 不常用
}
```

## 🔧 清理步骤

### 1. 备份当前状态
```bash
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup
```

### 2. 移除不必要依赖
```bash
npm uninstall @monogrid/gainmap-js @react-three/postprocessing camera-controls maath meshline n8ao postprocessing stats-gl three-mesh-bvh troika-three-text troika-three-utils
```

### 3. 检查组件兼容性
检查以下组件是否受影响：
- `BoreholeVisualization3D.tsx` - 使用@react-three/fiber和drei
- `Model.tsx` - 使用@react-three/drei的useGLTF

### 4. 迁移方案
对于使用@react-three的组件，有两个选择：
- **A方案**：保留@react-three/fiber和@react-three/drei
- **B方案**：重写为原生Three.js，集成到CAEThreeEngine

## 📊 预期收益

### 包体积减少
- 预计减少 15-20MB
- 构建时间减少 20%
- 依赖冲突消除

### 性能提升
- 统一Three.js版本，避免重复加载
- 减少bundle中的死代码
- 更快的启动时间

### 维护性改善
- 单一Three.js版本，更容易升级
- 减少类型冲突
- 清晰的依赖关系

## 🚀 推荐行动
1. **立即执行**：移除明显不需要的依赖
2. **谨慎评估**：@react-three相关依赖的去留
3. **逐步迁移**：将旧组件迁移到CAEThreeEngine架构
4. **版本锁定**：在package.json中锁定Three.js版本

## 📝 后续任务
- [ ] 移除不必要依赖
- [ ] 测试系统功能完整性  
- [ ] 重写或移除@react-three依赖组件
- [ ] 更新构建配置
- [ ] 文档更新