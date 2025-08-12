# DeepCAD 控制中心一体化技术方案 (项目管理融合版)

版本: 1.0  
作者: AI 架构助手  
日期: 2025-08-11  
状态: Draft

---
## 1. 目标与范围
| 目标 | 说明 |
|------|------|
| 统一入口 | 将当前“项目管理”视图 / 菜单 / 独立页面整合进控制中心 (Epic Control Center) | 
| 体验升级 | 提供沉浸式 3D/多视图实时驾驶舱 + 业务面板无缝联动 | 
| 降低上下文切换 | 单页面内完成：项目筛选 → 3D 定位 → 数据分析 → 结果/动画/等值线 | 
| 提升炫酷与可用性 | 采用全局时间轴、动态粒子/地球/数据流特效、Cinematic Camera、可配置布局 | 
| 可扩展性 | 插件化 (Panels / Layers / Data Providers / 交互工具) | 
| 可维护性 | 分层架构 + 明确 Store 边界 + 生命周期统一 Hook | 

不在本期范围：权限系统重构、离线缓存策略、移动端适配（列为后续选项）。

---
## 2. 现状概览 (精要)
组件族群划分：
- Visualization: Three.js / 地图 / 云图 / 等值线 / 动画播放器 / 粒子 / EarthRenderer
- Views: ResultsView / DashboardViewPro / ExcavationView / 项目列表等
- Services: GempyDirectService、RealisticRenderingEngine、数据抓取与计算接口
- Utilities: safeThreeDetach / deepDispose / threejsCleanup 等

核心问题：
- 分散导航：业务数据与 3D 需跳页 -> 打断流
- 重复状态：项目选中状态、过滤条件在不同视图内局部维护
- 渲染生命周期模式不统一：不同 3D 组件各自管理 requestAnimationFrame
- 缺少统一“场景/图层”注册体系与时间轴协调机制

---
## 3. 技术栈可达效果 (当前能力)
利用现有库可实现：
1. 多 3D 视图区 (主地球 + 局部剖面 + 结果动画 + 等值线) 并行渲染（共享单独 RAF 调度器 或 任务调度器）
2. 三维/二维混合 HUD (Ant Design + Framer Motion 叠加 WebGL Canvas)
3. 动态项目聚合层：点云 / 标记 / 热力 / Extrusion 柱状 (Three + 自定义着色器)
4. 实时结果播放：位移 / 应力 云图 + 动画/时间插值 + 性能监控
5. 等值线 / 截面 / 剖切平面交互 (动态重算 + GPU 加速可拓展)
6. Cinematic Camera 路径 (样条插值 + Easing + 事件触发)
7. 多维过滤 (Zustand Store + 派生选择器 + Debounce 查询)
8. 资源安全回收 (统一 Hook + safeDetachRenderer + deepDispose)
9. GPU Shader 扩展：Bloom/Glow/Line Trail/Instanced Particles/Atmospheric Scattering (后处理可加 postprocessing 包)

---
## 4. 炫酷 & 易用性增强策划
| 类别 | 方案 | 技术点 | 价值 |
|------|------|--------|------|
| 视觉沉浸 | Cinematic Intro & 场景过渡 | GSAP/自研 Easing + Camera Keyframes JSON | 首屏冲击感 |
| 数据存在感 | 地球表面流动粒子 / 热力光晕 | InstancedBufferGeometry + GPU attribute 更新 | 强化“实时”感 |
| 交互效率 | Command Palette (Ctrl+K) | Fuzzy 搜索 + Action Registry | 减少菜单导航 |
| 时序理解 | 全局时间轴 (统一驱动动画/云图/等值线) | Central Timeline Store | 一致的时间同步 |
| 关系洞察 | 项目依赖/风险力导图 | Force Simulation (d3-force) + WebGL lines | 项目关联可视 |
| 分析对比 | Split-View / 多帧对照 | Multi Scene Composite + Shader Quad | 快速对比方案 |
| 情境模式 | “演示模式”自动巡航 | Camera Path Player + Narration | 对外展示 |
| 协同预留 | 多用户光标 / 注释 | WebSocket / WebRTC (后续) | 协作扩展 |
| 个性主题 | 暗/霓虹 / 工程风皮肤 | CSS Vars + Design Tokens 扩展层 | 品牌化 |
| 快速操作 | 可停靠浮动工具条 | Portals + Drag Layout | 降低鼠标移动距离 |

---
## 5. 统一架构设计
```
App (Single Entry)
 ├─ CoreProviders (Theme/Zustand Stores/QueryClient)
 ├─ ControlCenterShell
 │   ├─ GlobalTopBar / CommandPalette / Notifications
 │   ├─ LayoutEngine (Dock + Grid + Tabs)
 │   │   ├─ ViewportCluster (Primary 3D / Secondary 3D / MiniMap)
 │   │   ├─ DataPanels (ProjectMeta / Results / Logs / Tasks)
 │   │   ├─ TimelineBar / PlaybackControls
 │   │   └─ OverlayHUD (Performance / Camera / Selection)
 │   └─ PluginHost (Panels + Layers + Tools)
 └─ Modal/Drawer Portals
```

### 5.1 分层
| 层 | 职责 | 示例 |
|----|------|------|
| domain-project | 项目实体/过滤/进度 | useProjectsStore.ts |
| domain-visualization | 场景/图层管理/渲染调度 | SceneRegistry, LayerManager |
| domain-simulation | 结果/云图/等值线/时序 | TimeSeriesController |
| core-render | RendererPool / RAF Scheduler | useThreeRenderer.ts |
| ui-shell | Dock / Tabs / Timeline / Command | LayoutEngine.tsx |
| plugins | 可插拔 Panel & Layer | registerPlugin(plugin) |

### 5.2 统一时间轴 (Timeline Store)
```ts
interface TimelineState {
  currentTime: number; // 秒
  playing: boolean;
  speed: number; // 倍速
  range: { start: number; end: number };
  subscribers: Set<(t:number)=>void>;
  register(fn:(t:number)=>void): () => void;
}
```
单一 RAF 驱动：更新 currentTime -> 回调 -> 各模块（动画播放器 / 云图更新 / 等值线重算）同步。

### 5.3 Scene & Layer Registry
```ts
interface Layer {
  id: string;
  kind: 'points' | 'mesh' | 'heatmap' | 'contour' | 'custom';
  init(scene:THREE.Scene, context:LayerContext): void;
  update(dt:number, state:GlobalVizState): void;
  dispose(): void;
  setVisibility(v:boolean): void;
}
class SceneRegistry { /* addScene, removeScene, getPrimary, broadcast */ }
```
好处：
- 动态启用/关闭层（项目标记、热力、等值线）
- 统一资源释放 & 性能统计

### 5.4 Renderer Pool & RAF Scheduler
集中 requestAnimationFrame，遍历活跃场景调用 scene.update & renderer.render，避免多个组件各自 RAF。可做自适应降帧 (FPS < 阈值 -> 降低更新频率)。

### 5.5 Command Palette & Action Registry
```ts
interface Command { id:string; title:string; run():void; keywords?:string[]; category?:string; }
registerCommand({ id:'project.focus', run:()=> focusProject(id) })
```
UI：模糊搜索(快速跳转项目/打开面板/切换图层/摄像机预设)。

### 5.6 插件机制
Plugin 包含：Panels[] + Layers[] + Commands[] + KeyBindings。提供 registerPlugin(plugin)。后续可外部扩展。

---
## 6. 迁移/整合步骤 (增量)
| 阶段 | 关键输出 | 工期建议 |
|------|----------|----------|
| 1. 基础底座 | 新 Shell + LayoutEngine + Timeline Store | 1-2d |
| 2. 渲染统一 | RendererPool + useThreeScene Hook 改造主要 3D 组件 | 2-3d |
| 3. 项目融合 | 把项目列表/详情面板嵌入左侧 Dock Panel + 替换旧路由 | 1d |
| 4. 时间轴联动 | 动画 / 云图 / 等值线接入统一 timeline | 1-2d |
| 5. Layer Registry | 标记/热力/等值线/粒子改造成 Layer | 2d |
| 6. Command Palette | Action Registry + 快捷键 | 1d |
| 7. 视觉特效 | Camera 路径 + Glow + 粒子流 + 主题切换 | 2-4d |
| 8. 性能 & 清理 | 逐页资源诊断 + 内存快照 + 移除旧页面 | 1-2d |

并行注意：保持主分支可运行，通过 feature flags 控制新 Shell。

---
## 7. Hook & 代码骨架示例
### useThreeScene (简化示意)
```ts
export function useThreeScene(opts: { id:string; layers?: Layer[] }) {
  const mountRef = useRef<HTMLDivElement|null>(null);
  const { registerScene, removeScene } = useSceneRegistry();
  useEffect(()=> {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 5000);
    const renderer = obtainRenderer(); // from pool
    const handle = registerScene({ id:opts.id, scene, camera, renderer });
    opts.layers?.forEach(l => l.init(scene, { camera }));
    return () => {
      opts.layers?.forEach(l => l.dispose());
      handle.dispose();
    };
  }, []);
  return { mountRef };
}
```

### RendererPool (简化示意)
```ts
class RendererPool {
  private renderers: THREE.WebGLRenderer[] = [];
  obtain() { /* reuse or create */ }
  release(r:THREE.WebGLRenderer) { /* mark idle */ }
}
```

### RAF Scheduler
```ts
function startLoop() {
  let last = performance.now();
  function frame(now:number){
    const dt = now - last; last = now;
    registry.forEach(sceneCtx => sceneCtx.update(dt));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
```

---
## 8. 性能策略
| 维度 | 策略 |
|------|------|
| Draw Calls | 合并几何 / Instancing / 对静态层冻结更新 |
| 内存释放 | Layer dispose + deepDispose + 场景复用 |
| 更新频率 | 时间轴暂停即停止更新；低优先级层隔帧刷新 |
| 后处理 | 条件启用（设备能力检测）|
| 资源加载 | Lazy + Prefetch（选中项目前加载其纹理） |
| 指标监控 | 自定义 PerformanceOverlay + WebGL info + 内存快照按钮 |

---
## 9. 风险与缓解
| 风险 | 描述 | 缓解 |
|------|------|------|
| 大型合并造成回归 | 原页面逻辑丢失 | 分阶段 feature flag / 回滚开关 |
| RAF 合并影响动画时序 | 不同模块节奏不一致 | 统一 Timeline + Layer update 优先级 |
| Layer 插件滥用性能 | 未限制实例数量 | Layer 配额 + 性能预算告警 |
| 复杂可拖布局持久化 | 状态膨胀 | JSON Layout Schema + 校验 | 
| 着色器特效兼容性 | 低端 GPU 闪烁 | Capability Probe + 降级路径 |

---
## 10. 验收指标 (KPIs)
| 指标 | 目标 |
|------|------|
| 页面切换次数 | 核心操作（查看项目详情+定位+播放动画）≤ 1 切换 | 
| 初次渲染时间 | < 2.5s (缓存后 < 1.8s) |
| 典型场景 FPS | ≥ 50 (桌面中端) |
| 内存泄漏 | 连续 10 分钟无显著增长 (<5%) |
| 操作步骤减少 | 主要任务路径减少 ≥ 30% |

---
## 11. 实施清单 (Backlog 摘要)
- [ ] 新 Shell: ControlCenterShell.tsx
- [ ] Timeline Store + 全局 Provider
- [ ] SceneRegistry + Layer 接口定义
- [ ] useThreeScene Hook
- [ ] RendererPool & RAF Scheduler
- [ ] 抽象 Existing 3D Components -> Layers (MarkersLayer / HeatmapLayer / ContourLayer / AnimationLayer)
- [ ] 迁移项目列表/详情 -> Dock Panel (ProjectPanel)
- [ ] CommandPalette + ActionRegistry
- [ ] CameraPathService (JSON 轨迹 + 播放)
- [ ] PerformanceOverlay 插件化
- [ ] Theme & 视觉特效模块 (Bloom/Glow Switch)
- [ ] 旧路由与冗余组件下线

---
## 12. 后续扩展 (未来版本)
| 方向 | 说明 |
|------|------|
| 协同标注 | WebSocket 多光标 + 注释锚点 |
| AI 语音驾驶 | 语音指令生成命令执行序列 |
| WebGPU 迁移 | 更高效的大规模点/粒子/体渲染 |
| 历史回放/比较 | 双时间轴差异可视化 |
| 可视化脚本 DSL | JSON/DSL 描述动态布局与摄像机脚本 |

---
## 13. 总结
通过统一 Shell + Timeline + Layer/Scene 抽象 + 插件体系，可以在保留现有可视化能力的基础上大幅简化交互路径，同时为炫酷效果与扩展性预留清晰插入点。迁移采取分阶段与回滚策略降低风险。

> 下一步建议立即创建: `timelineStore.ts`, `sceneRegistry.ts`, `useThreeScene.ts` 三个基石文件，然后挑选一个现有可视化组件改造成首个 Layer 作为示范。
