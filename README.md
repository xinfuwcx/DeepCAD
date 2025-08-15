# DeepCAD 后端快速开始（跨平台可复现）

本指南保证克隆仓库后，无需本机特定配置即可启动后端。默认用 FastAPI + Uvicorn，地质模块路线为“GemPy 原生 → Three.js”（不依赖 PyVista）。

## 1. 安装依赖
- Windows
  ```powershell
  cd E:\DeepCAD
  python -m pip install -r requirements.txt
  ```
- macOS/Linux
  ```bash
  cd /path/to/DeepCAD
  python3 -m pip install -r requirements.txt
  ```

说明：`requirements.txt` 不再强制依赖 PyVista。仅当使用旧的 glTF 导出接口时，才需要手动安装：
```powershell
python -m pip install pyvista
```

## 2. 启动后端（建议无 reload）
- Windows
  ```powershell
  cd E:\DeepCAD
  python -m uvicorn gateway.main:app --host 127.0.0.1 --port 8010
  ```
- macOS/Linux
  ```bash
  cd /path/to/DeepCAD
  python3 -m uvicorn gateway.main:app --host 127.0.0.1 --port 8010
  ```

提示：Windows 下请避免 `--reload`，否则可能导致进程异常退出。端口改用 8000 也可以，将 `--port 8010` 改为 `--port 8000` 即可。

## 3. 健康检查
- Windows
  ```powershell
  Invoke-RestMethod -Method Get -Uri http://127.0.0.1:8010/api/health | ConvertTo-Json -Depth 4
  ```
- macOS/Linux
  ```bash
  curl http://127.0.0.1:8010/api/health
  ```

返回包含 `{\"status\":\"healthy\"}` 即表示后端就绪。

## 4. 地质重建（异步任务）
- 预览
  - POST `/api/geology/reconstruct/preview` → 返回 `{ jobId }`
- 轮询
  - GET `/api/geology/jobs/{jobId}/status` → `{ status, progress }`
- 结果
  - GET `/api/geology/jobs/{jobId}/result` → `{ threeJsData, quality, metadata, serverMeta, serverCost }`

说明：管线优先使用 GemPy → Three.js 直出；如环境未安装 GemPy，将自动回退到增强 RBF 或占位几何，确保接口稳定。

## 5. 常见问题
- 访问 `/api/info` 提示缺少 gmsh/pyvista：该端点会尝试探测可选依赖；如未安装会返回 500，不影响其他接口。请使用 `/api/health` 做健康检查。
- VS Code 提示选择 Python 解释器：选择你机器上的任意 Python 3.10+ 解释器即可；仓库未提交本机解释器设置（.vscode 已忽略）。

## 6. 目录
- `gateway/main.py`：后端入口（自动将仓库根加入 `sys.path`，不需要设置 PYTHONPATH）。
- `gateway/modules/geology`：地质路由与管线，产出 Three.js 数据。

如需前端使用说明或完整工作流，可以在 Issues 中提出需求。
