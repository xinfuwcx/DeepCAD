---
title: 代码规范与质量保障
---

# 代码规范与质量保障

## Python

- Lint：`ruff`  
- 格式化：`black`  
- 测试：`pytest` + `coverage`  
- pre-commit：配置 `.pre-commit-config.yaml`，自动执行 lint/format/tests。

## TypeScript / React

- Lint：`eslint`  
- 格式化：`prettier`  
- 测试：`vitest` 或 `jest`  
- Husky / lint-staged：提交时执行格式检查。

## 提交规范

- 使用 [Conventional Commits](https://www.conventionalcommits.org/)。  
- PR Review 包括单元测试覆盖率和代码质量检查。 