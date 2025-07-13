---
title: Kratos 集成与求解器
---

# Kratos 集成与求解器

## kratos_integration

- 封装 KratosMultiphysics 初始化、版本检测、应用加载。  
- 示例：
  ```python
  from core.kratos_integration import get_kratos_integration
  kratos = get_kratos_integration()
  version = getattr(kratos, "__version__", "N/A")
  ```

## GeoMechanicsSolver

- `GeoMechanicsSolver` 类负责仿真流程：`setup()`、`solve()`、`get_results_path()`。  
- 默认参数定义在 `_create_default_parameters()`，支持 JSON 序列化。

## 动网格管线

- 通过 `create_mesh_mover()` 创建网格移动器。  
- 在时间步循环中，调用 `step_moving_mesh()` 更新节点坐标，后端通过 WebSocket 推送给前端。 