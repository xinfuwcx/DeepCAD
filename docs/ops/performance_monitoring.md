---
title: 性能与监控
---

# 性能与监控

## Celery & Redis

- 调整并发 Worker 数量：`celery -A gateway.main worker --concurrency=4`  
- Redis 配置 `maxmemory-policy`。

## Kratos 并行

- 设置 OpenMP 线程数：环境变量 `OMP_NUM_THREADS`。  
- 编译时开启 `USE_MPI`（如需分布式）。

## 监控

- Prometheus: 后端暴露 `/metrics`。  
- Grafana: 可视化系统性能面板。 