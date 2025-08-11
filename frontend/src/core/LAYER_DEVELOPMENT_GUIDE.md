# Layer 开发规范 (DeepCAD 新统一渲染架构)

## 目标
提供在统一时间轴 (timeline) + 场景注册表 (sceneRegistry) + 渲染调度器 (rendererScheduler) 下快速实现、管理、调试、释放 Three.js / 可视化逻辑的标准方式。

## 核心概念
- SceneRegistry: 管理多个独立 3D 场景 (scene + camera + renderer + layers)。
- Layer 接口: 定义 init / update / setVisible / dispose 生命周期。
- Timeline: 提供全局 currentTime、play/pause、speed、循环范围 (range)。
- RendererScheduler: 单一 RAF 循环，遍历所有已注册场景并驱动其 layers。

## Layer 接口
```ts
interface BaseLayer {
  id: string;          // 全局唯一 ID (建议: domain-feature 结构)
  visible: boolean;    // 当前可见状态
  init(ctx: LayerInitContext): void;     // 创建几何、材质、对象并添加到 ctx.scene
  update(dt: number, timelineTime: number): void; // 每帧调用 (dt=秒)
  setVisible(v: boolean): void;          // 显隐 (需同步 Three 对象 visible 属性)
  dispose(): void;                       // 释放几何/材质/纹理并从场景移除
}
```

## 创建步骤
1. 新建文件: `src/core/layers/<YourLayer>.ts`。
2. 实现 BaseLayer，命名 `YourLayer`，在构造函数中接收配置 (数据源、回调、样式)。
3. 在 `init` 中:
   - 构造所有 Three.js 对象，添加到 `ctx.scene`。
   - 保存需要后续释放的对象引用 (geometry / material / mesh / group)。
   - 不做动画逻辑 (动画放在 `update`)。
4. 在 `update` 中:
   - 使用传入的 `dt` 与 `timelineTime` 更新旋转、位置、shader uniform 等。
   - 尽量避免创建临时对象 (复用 Vector3/Color)。
5. 在 `dispose` 中:
   - 先 `parent.remove(child)` 再 `geometry.dispose()` / `material.dispose()` / 纹理 dispose。
   - 清空引用数组防止内存泄漏。
6. 在 React 组件中通过 `useThreeScene({ id, layers:[new YourLayer(...)] })` 挂载。

## 命名建议
- Layer ID: `domainPurpose`，如: `epicGlobe`, `riskHeatmap`, `projectBeams`。
- 文件名: `PascalCase + Layer` 后缀，比如 `EpicGlobeLayer.ts`。

## 数据与交互
- 输入数据通过构造函数或 setter 注入。
- 交互 (点击/hover) 建议在 Layer 内部提供 `pick()` 与 `handleClick()`；由外层组件监听 DOM 事件并调用。
- 复杂交互可引入一个 `InteractionController` Layer 单独管理射线拾取。

## 性能与优化
- 大量点/线/面: 使用 BufferGeometry + 合并 (merge) 或 InstancedMesh。
- 动态属性: 使用 `geometry.attributes.xxx.needsUpdate = true` 而不是频繁新建 BufferAttribute。
- 频繁变色: 使用 vertex colors 或 shader uniform (InstancedBufferAttribute)。
- 材质复用: 同类对象共享一个材质实例，材质参数变化用 uniforms / defines。

## Timeline 用法
- `timelineTime` 可用于驱动基于全局时间的动画（循环、同步其他图层）。
- 如需局部暂停，可在 Layer 内维护 `localPlay` 并在 update 时决定是否应用。

## 可见性控制
- 调用 `layer.setVisible(false)` 与 UI 面板绑定。
- 若希望在 Panel 中切换：将 layer 引用保存在外部状态或提供一个 LayerRegistry 扩展 API。

## 释放策略
- 不要在 `dispose` 中调用全局 `deepDispose(scene)`；仅释放自己创建的对象。
- 若 Layer 内部动态创建对象（例如临时高亮 Mesh），需跟踪并在 dispose 时逐个移除与释放。

## 调试工具
- PerformanceOverlay: FPS / FrameTime / Scene & Layer 数量 / Timeline 时间。
- LayerDebugPanel: 列出 scene 与层级结构，可加上可视开关（下一步可扩展为交互式）。

## 常见陷阱
| 问题 | 说明 | 解决 |
|------|------|------|
| 未释放材质/几何 | 内存逐帧增长 | dispose() 内明确释放并清空引用 |
| 多个 RAF 循环 | 帧率不稳定/重复渲染 | 使用 rendererScheduler 单例 |
| 摄像机宽高比不更新 | 窗口缩放变形 | useThreeScene 内已有 resize 监听；自定义 renderer 需手动调用 |
| 长列表数据刷新卡顿 | 频繁重建 Three 对象 | 增量更新 attribute 或设置 flag 延迟批处理 |

## 示例片段
```ts
class DemoLayer implements BaseLayer {
  id = 'demo';
  visible = true;
  private mesh?: THREE.Mesh;
  init({ scene }: LayerInitContext) {
    const geo = new THREE.BoxGeometry(10,10,10);
    const mat = new THREE.MeshStandardMaterial({ color: 0x00ffff });
    this.mesh = new THREE.Mesh(geo, mat);
    scene.add(this.mesh);
  }
  update(dt: number, t: number) {
    if (this.mesh) this.mesh.rotation.y += dt * 0.5;
  }
  setVisible(v: boolean) { this.visible = v; if (this.mesh) this.mesh.visible = v; }
  dispose() { if (this.mesh){ this.mesh.parent?.remove(this.mesh); this.mesh.geometry.dispose(); (this.mesh.material as any).dispose(); } }
}
```

## 后续扩展方向
- Layer 分组与优先级渲染顺序
- Shader 热替换调试面板
- 统一 Picking 管线 (注册 pickable 对象池)
- 资源缓存 (纹理 / 几何) 复用策略

---
如需新增模板层或脚手架命令，可再提出需求。欢迎继续完善本规范。
