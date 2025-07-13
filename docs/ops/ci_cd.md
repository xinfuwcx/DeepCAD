---
title: CI/CD Pipeline
---

# CI/CD Pipeline

## GitHub Actions

- `/.github/workflows/ci.yml`:
  1. 安装依赖  
  2. Lint & Format 检查  
  3. 单元测试 & 覆盖率报告  
  4. 构建前端应用  
  5. 构建并推送 Docker 镜像

## 发布流程

- 使用 Git 标签触发发布  
- Docker 镜像自动推送至 Docker Registry 