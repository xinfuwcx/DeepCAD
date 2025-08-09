DeepCAD Frontend
=================

## Scripts

- dev / build / preview 常规 Vite
- dev:pv3d 启动独立 3D 视口 (pv3d.html)
- type:core / type:full / type:perf TS 类型检查
- lint:core 可通过 CLI 参数 / 环境变量 / lint-core.config.json 定制目标
- analyze:unused / analyze:unused:json 统计未使用符号 (TS6133/6192/6196/6198)，支持 `--fail-if <N>` 设阈值
- test / test:run / test:ui / test:coverage 由 Vitest 运行单测

## 性能监控全局配置注入

在宿主页面 (index.html 或 上层系统) 注入全局变量以控制前端性能上报行为：

```html
<script>
	window.__DEEPCAD_PERF_ENDPOINT__ = '/api/perf/report';
	window.__DEEPCAD_PERF_CONFIG__ = {
		flush: {
			intervalMs: 12000,      // 周期性检查间隔
			batchSize: 8,           // 满 N 条立即 flush
			maxDelayMs: 18000,      // 单条最长等待时间
			baseBackoffMs: 4000,    // 初始退避
			backoffMultiplier: 2,   // 退避指数倍率
			maxBackoffMs: 60000     // 退避上限
		},
		features: {
			network: true,          // 采集 fetch 延迟
			interactions: true,     // 用户交互响应
			threeStats: true,       // Three.js 渲染统计
			memory: true            // JS Heap 使用（浏览器支持）
		},
		immediateFlushOn: {
			visibilityHidden: true, // 页面隐藏时 flush (sendBeacon)
			beforeUnload: true,     // 卸载前 flush
			error: true             // 捕获 error / unhandledrejection 触发 flush
		},
		maxQueue: 500             // 队列总上限
	};
</script>
```

### Flush / ACK 协议 (POST __DEEPCAD_PERF_ENDPOINT__)

请求体：

```jsonc
{
	"source": "frontend",
	"module": "viewport",
	"batch": [ { /* ProtocolPerformanceMetrics */ } ]
}
```

期望响应：

```jsonc
{ "ok": true, "accepted": 10, "nextHintMs": 5000 }
```

错误响应（客户端触发退避）：

```jsonc
{ "ok": false, "error": "rate_limit", "nextHintMs": 15000 }
```

## 手动触发性能上报

```ts
import { performanceMonitor } from './src/utils/performanceMonitor';
performanceMonitor.flushNow();
```

## 导出性能报告 (PV3D 页面)

pv3d 独立入口右上角按钮可下载最新增强报告，也可在控制台：

```js
performanceMonitor.generateEnhancedReport();
```

## 测试 (Vitest)

运行：

```bash
npm test             # watch / ui 视图可用 test:ui
npm run test:run     # CI 模式
npm run test:coverage
```

新增示例：tests/performanceMonitor.test.ts 覆盖 adaptToProtocol 报警逻辑。

## 未使用符号清理策略

1. `npm run analyze:unused` 查看 Top 50 文件
2. 按文件集中清理导入 / 变量 / 形参
3. 可在 CI: `npm run analyze:unused -- --json --fail-if 400 > unused.json`

## 轻量 3D 入口 (pv3d)

用于：
- 快速验证 CAD 交互 / CSG / 性能
- 独立打包分析 (Vite 多入口)
- 嵌入第三方系统 iframe

运行：

```bash
npm run dev:pv3d
```

## 目录提示 (节选)

```
src/
	utils/performanceMonitor.ts   # 统一性能监控与上报
	pv3d-entry.tsx                # 独立 3D 启动入口 + ErrorBoundary + 导出报告按钮
	types/perf-config.d.ts        # 全局配置类型声明
	services/UnifiedMapService.ts # MapLibre + Deck.gl 统一地图服务
```

## 后续计划 (建议)

- 增加 fetch mock 单测覆盖退避与队列截断
- 分层 lazy import（map / deck / geology）进一步减小主包
- 后端统一指标聚合与可视化看板
- GitHub Actions 已添加基础 CI (type check / tests / unused gate / build / bundle snapshot)
- 参考 scripts/lazy-mapdeck-example.mjs 进行地图模块按需加载改造
- UnifiedMapService 已改为动态 import 懒加载 maplibre / deck
- 使用 size-limit (npm run size) 设定核心/three/pv3d 体积基线 (.size-limit.json)
