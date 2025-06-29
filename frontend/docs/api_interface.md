# 深基坑IGA分析系统API接口文档

本文档详细描述深基坑IGA分析系统的API接口，为前端开发提供参考。

## 目录

- [API概述](#api概述)
- [基本URL](#基本url)
- [认证方式](#认证方式)
- [错误处理](#错误处理)
- [IGA几何API](#iga几何api)
- [计算分析API](#计算分析api)
- [结果可视化API](#结果可视化api)
- [数据结构](#数据结构)

## API概述

深基坑IGA分析系统API采用RESTful风格设计，使用JSON格式进行数据交换。API主要提供以下功能：

- IGA几何模型创建与管理
- NURBS曲面操作
- 分析计算
- 结果获取与可视化

## 基本URL

所有API请求均使用以下基本URL：

```
http://localhost:6000/api
```

## 认证方式

_待实现：将采用Bearer Token认证_

## 错误处理

当API请求失败时，将返回相应的HTTP状态码和错误信息。常见错误格式如下：

```json
{
  "detail": "错误详情描述"
}
```

常见HTTP状态码：

- `400 Bad Request`: 请求参数错误
- `404 Not Found`: 请求的资源不存在
- `500 Internal Server Error`: 服务器内部错误

## IGA几何API

### 创建IGA几何模型

创建新的IGA几何模型。

**请求**

```
POST /api/iga/create
```

**参数**

```json
{
  "project_id": 1,
  "name": "基坑模型",
  "dimension": 2,
  "degree": {
    "u": 3,
    "v": 3
  },
  "control_points_count": {
    "u": 5,
    "v": 5
  },
  "domain_size": {
    "width": 10.0,
    "length": 10.0
  }
}
```

**响应**

```json
{
  "id": 1,
  "name": "基坑模型",
  "message": "IGA几何创建成功",
  "geometry_info": {
    "name": "基坑模型",
    "dimension": 2,
    "degree": {
      "u": 3,
      "v": 3
    },
    "control_points_count": {
      "u": 5,
      "v": 5
    },
    "control_points": [[0,0,0], [0,2.5,0], ...],
    "weights": [1.0, 1.0, ...],
    "knot_vectors": {
      "u": [0.0, 0.0, 0.0, 0.0, 0.5, 1.0, 1.0, 1.0, 1.0],
      "v": [0.0, 0.0, 0.0, 0.0, 0.5, 1.0, 1.0, 1.0, 1.0]
    }
  }
}
```

### 添加/更新NURBS曲面片

添加或更新NURBS曲面片。

**请求**

```
POST /api/iga/patch
```

**参数**

```json
{
  "project_id": 1,
  "geometry_id": null,
  "name": "地层曲面",
  "dimension": 2,
  "degree": {
    "u": 3,
    "v": 3
  },
  "control_points": {
    "coordinates": [[0,0,0], [0,1,0], [0,2,0], ...],
    "weights": [1.0, 1.0, 1.0, ...]
  },
  "knot_vectors": {
    "u": [0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0],
    "v": [0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0]
  }
}
```

**响应**

```json
{
  "id": 1,
  "name": "地层曲面",
  "message": "NURBS曲面片添加成功",
  "geometry_info": {
    "id": 1,
    "name": "地层曲面",
    "dimension": 2,
    "degree": {
      "u": 3,
      "v": 3
    },
    "control_points": [[0,0,0], [0,1,0], ...],
    "weights": [1.0, 1.0, ...],
    "knot_vectors": {
      "u": [0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0],
      "v": [0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0]
    }
  }
}
```

### 获取IGA几何信息

获取指定ID的IGA几何信息。

**请求**

```
GET /api/iga/{geometry_id}
```

**响应**

```json
{
  "id": 1,
  "name": "IGA几何1",
  "message": "获取IGA几何信息成功",
  "geometry_info": {
    "id": 1,
    "name": "IGA几何1",
    "dimension": 2,
    "degree": {
      "u": 3,
      "v": 3
    },
    "control_points_count": {
      "u": 5,
      "v": 5
    },
    "control_points": [[0,0,0], [2,0,0], ...],
    "weights": [1.0, 1.0, ...],
    "knot_vectors": {
      "u": [0.0, 0.0, 0.0, 0.0, 0.5, 1.0, 1.0, 1.0, 1.0],
      "v": [0.0, 0.0, 0.0, 0.0, 0.5, 1.0, 1.0, 1.0, 1.0]
    }
  }
}
```

### 导入NURBS几何文件

导入NURBS几何文件。

**请求**

```
POST /api/iga/import
```

使用`multipart/form-data`格式：
- `project_id`: 项目ID
- `geometry_file`: NURBS几何文件(.iges/.igs/.step/.stp/.brep/.json)

**响应**

```json
{
  "id": 1,
  "name": "导入的几何",
  "message": "NURBS几何导入成功",
  "geometry_info": {
    "id": 1,
    "name": "导入的几何",
    "file_type": "iges",
    "original_filename": "terrain.iges"
  }
}
```

### 细化NURBS几何

细化指定ID的NURBS几何。

**请求**

```
PUT /api/iga/{geometry_id}/refine
```

**参数**

```json
{
  "h_refinement": true,
  "p_refinement": false,
  "directions": ["u", "v"],
  "factors": {
    "u": 2,
    "v": 2
  }
}
```

**响应**

```json
{
  "id": 1,
  "name": "细化的IGA几何1",
  "message": "NURBS几何细化成功",
  "geometry_info": {
    "id": 1,
    "name": "细化的IGA几何1",
    "refinement_applied": {
      "h_refinement": true,
      "p_refinement": false,
      "directions": ["u", "v"],
      "factors": {
        "u": 2,
        "v": 2
      }
    }
  }
}
```

## 计算分析API

### 创建分析任务

创建新的IGA分析任务。

**请求**

```
POST /api/compute/iga/analysis
```

**参数**

```json
{
  "project_id": 1,
  "geometry_id": 1,
  "analysis_type": "structural",
  "soil_model": "mohr-coulomb",
  "material_properties": {
    "DENSITY": 2000,
    "YOUNG_MODULUS": 3.0e7,
    "POISSON_RATIO": 0.3,
    "COHESION": 10000,
    "FRICTION_ANGLE": 30
  },
  "boundary_conditions": [
    {
      "type": "dirichlet",
      "variable": "DISPLACEMENT_X",
      "value": 0.0,
      "control_points": [1, 2, 3, 4, 5]
    },
    {
      "type": "dirichlet",
      "variable": "DISPLACEMENT_Y",
      "value": 0.0,
      "control_points": [1, 6, 11, 16, 21]
    }
  ],
  "load_conditions": [
    {
      "type": "point_load",
      "variable": "POINT_LOAD_Y",
      "value": -10000.0,
      "control_points": [25]
    }
  ],
  "solution_parameters": {
    "time_step": 0.1,
    "nsteps": 10,
    "max_iterations": 10,
    "convergence_criteria": 1e-6
  }
}
```

**响应**

```json
{
  "id": 1,
  "project_id": 1,
  "geometry_id": 1,
  "message": "分析任务创建成功",
  "status": "pending",
  "created_at": "2023-04-14T10:30:00Z"
}
```

### 查询分析状态

查询分析任务的状态。

**请求**

```
GET /api/compute/iga/analysis/{analysis_id}
```

**响应**

```json
{
  "id": 1,
  "project_id": 1,
  "geometry_id": 1,
  "status": "running",
  "progress": 45,
  "message": "正在执行分析...",
  "created_at": "2023-04-14T10:30:00Z",
  "started_at": "2023-04-14T10:30:05Z",
  "completed_at": null
}
```

### 获取分析结果

获取分析任务的结果。

**请求**

```
GET /api/compute/iga/analysis/{analysis_id}/results
```

**响应**

```json
{
  "id": 1,
  "analysis_id": 1,
  "results": {
    "displacement": {
      "min": [0.0, -0.00134, 0.0],
      "max": [0.000452, 0.0, 0.0],
      "control_point_values": [
        {"id": 1, "value": [0.0, 0.0, 0.0]},
        {"id": 2, "value": [0.0001, 0.0, 0.0]},
        // ... 更多控制点值
      ]
    },
    "stress": {
      "min": -1245.3,
      "max": 975.1,
      "control_point_values": [
        {"id": 1, "value": -125.3},
        {"id": 2, "value": -231.5},
        // ... 更多控制点值
      ]
    }
  },
  "completed_at": "2023-04-14T10:35:23Z"
}
```

## 结果可视化API

### 创建可视化任务

创建新的IGA结果可视化任务。

**请求**

```
POST /api/visualization/iga
```

**参数**

```json
{
  "analysis_id": 1,
  "result_type": "displacement",
  "component": "magnitude",
  "visualization_options": {
    "scale_factor": 100,
    "color_map": "jet",
    "show_control_net": true,
    "show_wireframe": false
  }
}
```

**响应**

```json
{
  "id": 1,
  "analysis_id": 1,
  "message": "可视化任务创建成功",
  "view_url": "/api/visualization/iga/1/view",
  "export_url": "/api/visualization/iga/1/export"
}
```

### 获取可视化数据

获取可视化数据以在前端渲染。

**请求**

```
GET /api/visualization/iga/{visual_id}/data
```

**响应**

```json
{
  "id": 1,
  "analysis_id": 1,
  "nurbs_data": {
    "control_points": [...],
    "weights": [...],
    "knot_vectors": {...},
    "degrees": {...}
  },
  "result_data": {
    "type": "displacement",
    "component": "magnitude",
    "values": [...],
    "min": 0.0,
    "max": 0.00134
  },
  "visualization_options": {
    "scale_factor": 100,
    "color_map": "jet",
    "show_control_net": true,
    "show_wireframe": false
  }
}
```

### 导出可视化结果

导出可视化结果为特定格式文件。

**请求**

```
GET /api/visualization/iga/{visual_id}/export?format=vtk
```

**响应**

二进制文件流（文件下载）

## 数据结构

### NURBS几何数据

```json
{
  "dimension": 2,        // 2D或3D
  "degree": {            // NURBS阶次
    "u": 3,
    "v": 3,
    "w": null           // 仅3D时使用
  },
  "control_points": [    // 控制点坐标 [x,y,z]
    [0,0,0],
    [1,0,0],
    // ...更多控制点
  ],
  "weights": [           // 权重（可选，默认全为1）
    1.0,
    1.0,
    // ...更多权重
  ],
  "knot_vectors": {      // 节点矢量
    "u": [0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0],
    "v": [0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0],
    "w": null           // 仅3D时使用
  }
}
```

### 材料属性数据

```json
{
  "DENSITY": 2000.0,                  // 密度 (kg/m³)
  "YOUNG_MODULUS": 3.0e7,             // 杨氏模量 (Pa)
  "POISSON_RATIO": 0.3,               // 泊松比
  "COHESION": 10000.0,                // 粘聚力 (Pa)
  "FRICTION_ANGLE": 30.0,             // 内摩擦角 (度)
  "DILATANCY_ANGLE": 0.0,             // 膨胀角 (度)
  "PERMEABILITY": 1e-6                // 渗透系数 (m/s)
}
```

### 边界条件数据

```json
{
  "type": "dirichlet",               // dirichlet、neumann等
  "variable": "DISPLACEMENT_X",      // Kratos变量名
  "value": 0.0,                      // 约束值
  "control_points": [1, 2, 3, 4, 5]  // 应用的控制点ID列表
}
```

### 分析结果数据

```json
{
  "id": 1,
  "analysis_id": 1,
  "result_type": "displacement",    // 位移、应力等
  "component": "magnitude",         // 分量（标量、矢量等）
  "time_step": 1.0,                 // 结果对应的时间步
  "control_point_values": [         // 控制点值
    {"id": 1, "value": [0.0, 0.0, 0.0]},
    {"id": 2, "value": [0.0001, 0.0, 0.0]},
    // ... 更多控制点值
  ],
  "min_value": [0.0, -0.00134, 0.0],  // 最小值
  "max_value": [0.000452, 0.0, 0.0]   // 最大值
}
``` 