---
title: 依赖与环境管理
---

# 依赖与环境管理

## 后端 (Python)

- 使用 `pip-tools` 管理 `requirements.in` 和 `requirements.txt`，或使用 `poetry`。  
- 建议在虚拟环境中安装：  
  ```
  python -m venv .venv
  .venv\\Scripts\\Activate.ps1
  pip install -r requirements.txt
  ```

## 前端 (TypeScript)

- 使用 `pnpm` 进行依赖安装：  
  ```
  cd frontend
  pnpm install
  ```  
- 保持锁文件 `pnpm-lock.yaml` 与代码同步，保证可重复安装。

## 系统依赖

- Kratos Multiphysics 二进制或源码编译版本，需包含 GeoMechanicsApplication 和 MeshMovingApplication。  
- Gmsh（可选，用于网格预处理）。 