---
title: 快速上手
---

## 环境准备

1. 安装 Python 3.10.x  
```
python -m venv .venv
.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
```
2. 安装 Node.js (>=16) 和 pnpm  
```
npm install -g pnpm
cd frontend
pnpm install
```
3. 安装 Kratos Multiphysics  
- 请参考 [Kratos 官方文档](https://github.com/KratosMultiphysics/Kratos) 进行下载和安装。

## 本地运行

1. 启动后端 API  
```
python -m gateway.main
```
2. 启动前端应用  
```
cd frontend; pnpm run dev
```
3. 打开浏览器访问 `http://localhost:3000`，加载示例钻孔数据，点击“运行计算”。 