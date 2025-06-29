# 深基坑分析系统 API 文档

## API 概述

深基坑分析系统提供了一套完整的RESTful API，用于前后端通信和第三方系统集成。API遵循REST设计原则，使用JSON作为数据交换格式，支持标准的HTTP方法（GET, POST, PUT, DELETE）。

## 基础信息

- **基础URL**: `/api/v1`
- **认证方式**: Bearer Token
- **响应格式**: JSON
- **错误处理**: 标准HTTP状态码 + 详细错误信息

## 认证与授权

### 获取令牌

```
POST /auth/token
```

**请求参数**:

```json
{
  "username": "string",
  "password": "string"
}
```

**响应**:

```json
{
  "access_token": "string",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 刷新令牌

```
POST /auth/refresh
```

**请求头**:

```
Authorization: Bearer {access_token}
```

**响应**:

```json
{
  "access_token": "string",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## 项目管理

### 获取项目列表

```
GET /projects
```

**查询参数**:

- `page`: 页码，默认1
- `limit`: 每页数量，默认10
- `status`: 项目状态筛选
- `search`: 搜索关键词

**响应**:

```json
{
  "items": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "createdAt": "string",
      "updatedAt": "string",
      "owner": "string",
      "status": "active",
      "thumbnail": "string"
    }
  ],
  "total": 0,
  "page": 1,
  "pageSize": 10,
  "totalPages": 0
}
```

### 创建新项目

```
POST /projects
```

**请求体**:

```json
{
  "name": "string",
  "description": "string",
  "metadata": {
    "location": "string",
    "client": "string",
    "projectNumber": "string",
    "tags": ["string"]
  }
}
```

**响应**:

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "owner": "string",
  "status": "active"
}
```

### 获取项目详情

```
GET /projects/{project_id}
```

**路径参数**:

- `project_id`: 项目ID

**响应**:

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "owner": "string",
  "collaborators": ["string"],
  "status": "active",
  "metadata": {
    "location": "string",
    "client": "string",
    "projectNumber": "string",
    "tags": ["string"]
  }
}
```

### 更新项目

```
PUT /projects/{project_id}
```

**路径参数**:

- `project_id`: 项目ID

**请求体**:

```json
{
  "name": "string",
  "description": "string",
  "status": "active",
  "metadata": {
    "location": "string",
    "client": "string",
    "projectNumber": "string",
    "tags": ["string"]
  }
}
```

**响应**:

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "updatedAt": "string",
  "status": "active"
}
```

### 删除项目

```
DELETE /projects/{project_id}
```

**路径参数**:

- `project_id`: 项目ID

**响应**:

```json
{
  "success": true,
  "message": "项目已删除"
}
```

## 几何建模

### 获取模型列表

```
GET /projects/{project_id}/models
```

**路径参数**:

- `project_id`: 项目ID

**响应**:

```json
{
  "items": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "total": 0
}
```

### 创建模型

```
POST /projects/{project_id}/models
```

**路径参数**:

- `project_id`: 项目ID

**请求体**:

```json
{
  "name": "string",
  "description": "string",
  "geometryData": {
    "width": 100,
    "length": 100,
    "depth": 20,
    "shape": "rectangular"
  },
  "soilLayers": [
    {
      "name": "填土层",
      "depth": 5,
      "color": "#E8C17D",
      "properties": {
        "cohesion": 10,
        "frictionAngle": 30,
        "unitWeight": 18
      }
    }
  ],
  "supportStructures": {
    "diaphragmWall": {
      "thickness": 1,
      "depth": 30,
      "material": "混凝土"
    }
  },
  "waterLevel": 5
}
```

**响应**:

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### 获取模型详情

```
GET /projects/{project_id}/models/{model_id}
```

**路径参数**:

- `project_id`: 项目ID
- `model_id`: 模型ID

**响应**:

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "geometryData": {
    "width": 100,
    "length": 100,
    "depth": 20,
    "shape": "rectangular"
  },
  "soilLayers": [
    {
      "name": "填土层",
      "depth": 5,
      "color": "#E8C17D",
      "properties": {
        "cohesion": 10,
        "frictionAngle": 30,
        "unitWeight": 18
      }
    }
  ],
  "supportStructures": {
    "diaphragmWall": {
      "thickness": 1,
      "depth": 30,
      "material": "混凝土"
    }
  },
  "waterLevel": 5,
  "createdAt": "string",
  "updatedAt": "string"
}
```

### 更新模型

```
PUT /projects/{project_id}/models/{model_id}
```

**路径参数**:

- `project_id`: 项目ID
- `model_id`: 模型ID

**请求体**:

```json
{
  "name": "string",
  "description": "string",
  "geometryData": {
    "width": 100,
    "length": 100,
    "depth": 20,
    "shape": "rectangular"
  },
  "soilLayers": [
    {
      "name": "填土层",
      "depth": 5,
      "color": "#E8C17D",
      "properties": {
        "cohesion": 10,
        "frictionAngle": 30,
        "unitWeight": 18
      }
    }
  ],
  "supportStructures": {
    "diaphragmWall": {
      "thickness": 1,
      "depth": 30,
      "material": "混凝土"
    }
  },
  "waterLevel": 5
}
```

**响应**:

```json
{
  "id": "string",
  "name": "string",
  "updatedAt": "string"
}
```

### 删除模型

```
DELETE /projects/{project_id}/models/{model_id}
```

**路径参数**:

- `project_id`: 项目ID
- `model_id`: 模型ID

**响应**:

```json
{
  "success": true,
  "message": "模型已删除"
}
```

## 分析设置

### 创建分析配置

```
POST /projects/{project_id}/models/{model_id}/analyses
```

**路径参数**:

- `project_id`: 项目ID
- `model_id`: 模型ID

**请求体**:

```json
{
  "name": "string",
  "description": "string",
  "type": "static",
  "constructionStages": [
    {
      "name": "初始阶段",
      "description": "原始地形",
      "sequence": 1,
      "actions": []
    },
    {
      "name": "开挖第一层",
      "description": "挖至-5m",
      "sequence": 2,
      "actions": [
        {
          "type": "excavate",
          "depth": 5
        }
      ]
    }
  ],
  "analysisParameters": {
    "solverType": "direct",
    "maxIterations": 100,
    "tolerance": 1e-5,
    "timeSteps": 10
  },
  "igaParameters": {
    "nurbs": {
      "degree": [3, 3, 2],
      "controlPoints": 100
    }
  }
}
```

**响应**:

```json
{
  "id": "string",
  "name": "string",
  "createdAt": "string"
}
```

### 获取分析配置

```
GET /projects/{project_id}/models/{model_id}/analyses/{analysis_id}
```

**路径参数**:

- `project_id`: 项目ID
- `model_id`: 模型ID
- `analysis_id`: 分析ID

**响应**:

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "type": "static",
  "constructionStages": [
    {
      "name": "初始阶段",
      "description": "原始地形",
      "sequence": 1,
      "actions": []
    },
    {
      "name": "开挖第一层",
      "description": "挖至-5m",
      "sequence": 2,
      "actions": [
        {
          "type": "excavate",
          "depth": 5
        }
      ]
    }
  ],
  "analysisParameters": {
    "solverType": "direct",
    "maxIterations": 100,
    "tolerance": 1e-5,
    "timeSteps": 10
  },
  "igaParameters": {
    "nurbs": {
      "degree": [3, 3, 2],
      "controlPoints": 100
    }
  },
  "createdAt": "string",
  "updatedAt": "string"
}
```

## 计算控制

### 启动分析

```
POST /projects/{project_id}/models/{model_id}/analyses/{analysis_id}/compute
```

**路径参数**:

- `project_id`: 项目ID
- `model_id`: 模型ID
- `analysis_id`: 分析ID

**响应**:

```json
{
  "jobId": "string",
  "status": "queued",
  "message": "分析任务已提交"
}
```

### 获取计算状态

```
GET /projects/{project_id}/models/{model_id}/analyses/{analysis_id}/status
```

**路径参数**:

- `project_id`: 项目ID
- `model_id`: 模型ID
- `analysis_id`: 分析ID

**响应**:

```json
{
  "jobId": "string",
  "status": "running",
  "progress": 45,
  "currentStage": "求解方程组",
  "startTime": "string",
  "estimatedCompletion": "string",
  "message": "正在计算中"
}
```

### 取消计算

```
POST /projects/{project_id}/models/{model_id}/analyses/{analysis_id}/cancel
```

**路径参数**:

- `project_id`: 项目ID
- `model_id`: 模型ID
- `analysis_id`: 分析ID

**响应**:

```json
{
  "success": true,
  "message": "计算已取消"
}
```

## 结果查询

### 获取结果列表

```
GET /projects/{project_id}/models/{model_id}/analyses/{analysis_id}/results
```

**路径参数**:

- `project_id`: 项目ID
- `model_id`: 模型ID
- `analysis_id`: 分析ID

**响应**:

```json
{
  "items": [
    {
      "id": "string",
      "type": "displacement",
      "stage": 2,
      "createdAt": "string",
      "maxValue": 25.8,
      "minValue": 0
    },
    {
      "id": "string",
      "type": "stress",
      "stage": 2,
      "createdAt": "string",
      "maxValue": 350.5,
      "minValue": 0
    }
  ],
  "total": 2
}
```

### 获取结果详情

```
GET /projects/{project_id}/models/{model_id}/analyses/{analysis_id}/results/{result_id}
```

**路径参数**:

- `project_id`: 项目ID
- `model_id`: 模型ID
- `analysis_id`: 分析ID
- `result_id`: 结果ID

**响应**:

```json
{
  "id": "string",
  "type": "displacement",
  "stage": 2,
  "data": {
    "nodes": [...],
    "values": [...],
    "metadata": {
      "unit": "mm",
      "component": "total"
    }
  },
  "createdAt": "string",
  "maxValue": 25.8,
  "minValue": 0
}
```

### 获取结果可视化数据

```
GET /projects/{project_id}/models/{model_id}/analyses/{analysis_id}/results/{result_id}/visualization
```

**路径参数**:

- `project_id`: 项目ID
- `model_id`: 模型ID
- `analysis_id`: 分析ID
- `result_id`: 结果ID

**查询参数**:

- `format`: 格式，可选值为 `json`, `vtk`, `gltf`
- `component`: 分量，可选值为 `x`, `y`, `z`, `total`

**响应**:

根据请求的格式返回相应的数据。

## 报告生成

### 创建报告

```
POST /projects/{project_id}/reports
```

**路径参数**:

- `project_id`: 项目ID

**请求体**:

```json
{
  "name": "string",
  "description": "string",
  "modelId": "string",
  "analysisId": "string",
  "resultIds": ["string"],
  "template": "standard",
  "sections": ["summary", "model", "analysis", "results", "conclusion"],
  "format": "pdf"
}
```

**响应**:

```json
{
  "id": "string",
  "name": "string",
  "status": "generating",
  "createdAt": "string"
}
```

### 获取报告状态

```
GET /projects/{project_id}/reports/{report_id}/status
```

**路径参数**:

- `project_id`: 项目ID
- `report_id`: 报告ID

**响应**:

```json
{
  "id": "string",
  "status": "completed",
  "progress": 100,
  "downloadUrl": "string",
  "createdAt": "string",
  "completedAt": "string"
}
```

## 文件管理

### 上传文件

```
POST /projects/{project_id}/files
```

**路径参数**:

- `project_id`: 项目ID

**请求体**:

使用 `multipart/form-data` 格式上传文件。

**响应**:

```json
{
  "id": "string",
  "filename": "string",
  "size": 0,
  "mimeType": "string",
  "url": "string",
  "createdAt": "string"
}
```

### 获取文件列表

```
GET /projects/{project_id}/files
```

**路径参数**:

- `project_id`: 项目ID

**响应**:

```json
{
  "items": [
    {
      "id": "string",
      "filename": "string",
      "size": 0,
      "mimeType": "string",
      "url": "string",
      "createdAt": "string"
    }
  ],
  "total": 0
}
```

## 用户管理

### 获取当前用户信息

```
GET /users/me
```

**响应**:

```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "name": "string",
  "role": "engineer",
  "company": "string",
  "position": "string",
  "lastLogin": "string",
  "preferences": {
    "theme": "light",
    "notifications": true,
    "language": "zh-CN"
  }
}
```

### 更新用户信息

```
PUT /users/me
```

**请求体**:

```json
{
  "name": "string",
  "company": "string",
  "position": "string",
  "preferences": {
    "theme": "dark",
    "notifications": true,
    "language": "zh-CN"
  }
}
```

**响应**:

```json
{
  "id": "string",
  "name": "string",
  "updatedAt": "string"
}
```

## 错误码

| 状态码 | 错误码 | 描述 |
|--------|--------|------|
| 400 | INVALID_REQUEST | 请求参数无效 |
| 401 | UNAUTHORIZED | 未授权访问 |
| 403 | FORBIDDEN | 权限不足 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 资源冲突 |
| 422 | VALIDATION_ERROR | 数据验证错误 |
| 500 | SERVER_ERROR | 服务器内部错误 |
| 503 | SERVICE_UNAVAILABLE | 服务不可用 |

## WebSocket API

系统还提供WebSocket API，用于实时获取计算进度和结果更新。

### 计算进度订阅

```
ws://domain/ws/compute/{job_id}
```

**消息格式**:

```json
{
  "type": "progress",
  "data": {
    "progress": 45,
    "stage": "求解方程组",
    "message": "正在计算中",
    "timestamp": "string"
  }
}
```

### 结果更新订阅

```
ws://domain/ws/results/{model_id}
```

**消息格式**:

```json
{
  "type": "result_update",
  "data": {
    "analysisId": "string",
    "resultId": "string",
    "resultType": "displacement",
    "stage": 2,
    "timestamp": "string"
  }
}
```

## API 版本控制

API使用URL路径中的版本号进行版本控制。当前版本为v1，未来版本将使用v2、v3等路径。

## 速率限制

为保护服务器资源，API实施了速率限制：

- 认证接口: 10次/分钟
- 普通接口: 60次/分钟
- 计算接口: 10次/小时

超过限制将返回429状态码。

## 最佳实践

1. 使用适当的HTTP方法（GET查询，POST创建，PUT更新，DELETE删除）
2. 合理使用查询参数筛选和分页
3. 处理所有可能的错误状态
4. 缓存不经常变化的数据
5. 使用WebSocket获取实时更新，而不是轮询
