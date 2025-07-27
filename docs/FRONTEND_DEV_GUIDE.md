# DeepCAD 前端开发规范 - 给2号和3号
## 制定人: 1号架构师 | 时间: 2025-01-23

---

## 🎯 **@2号几何专家 @3号计算专家 开发规范**

### 📋 **环境配置**
```bash
# 开发环境
cd E:\DeepCAD\frontend
npm run dev
# 访问: http://localhost:5183
```

### 🎨 **UI颜色标准 (必须使用)**
```typescript
const Colors = {
  primary: '#00d9ff',           // 主色 - 按钮、强调
  background: '#0a0a0a',        // 主背景
  cardBackground: '#16213e',    // 卡片背景
  textPrimary: '#ffffff',       // 主要文字
  textSecondary: '#ffffff80',   // 次要文字
  success: '#52c41a',           // 成功色
  warning: '#faad14',           // 警告色
  error: '#ff4d4f',            // 错误色
  border: '#00d9ff20',          // 边框色
};
```

### 🧩 **组件标准模板**
```typescript
import React, { useState, useCallback } from 'react';
import { Card, Button, message } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

interface ComponentProps {
  /** 组件标题 */
  title?: string;
  /** 数据变化回调 */
  onDataChange?: (data: any) => void;
  /** 错误处理 */
  onError?: (error: string) => void;
}

/**
 * 组件说明
 * @author 2号几何专家 (或 3号计算专家)
 */
const ComponentName: React.FC<ComponentProps> = ({
  title = '默认标题',
  onDataChange,
  onError
}) => {
  const [loading, setLoading] = useState(false);

  const handleProcess = useCallback(async () => {
    try {
      setLoading(true);
      // 业务逻辑
      const result = await processData();
      onDataChange?.(result);
      message.success('处理成功');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      onError?.(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [onDataChange, onError]);

  return (
    <Card
      title={
        <span style={{ color: '#00d9ff' }}>
          <SettingOutlined style={{ marginRight: '8px' }} />
          {title}
        </span>
      }
      style={{
        background: '#16213e',
        border: '1px solid #00d9ff30'
      }}
      extra={
        <Button
          type="primary"
          loading={loading}
          onClick={handleProcess}
          size="small"
        >
          执行
        </Button>
      }
    >
      {/* 组件内容 */}
    </Card>
  );
};

export default ComponentName;
```

## 📐 **2号几何专家 - 开发任务**
```typescript
// 需要开发的组件
src/components/geology/
├── RBFInterpolationPanel.tsx     // RBF插值设置
├── GeologyDataImporter.tsx       // 地质数据导入
├── SoilLayerEditor.tsx          // 土层编辑器
├── InterpolationPreview.tsx     // 插值预览

src/components/geometry/
├── ExcavationDesigner.tsx       // 基坑设计器
├── SupportStructureEditor.tsx   // 支护结构编辑
├── RetainingWallDesigner.tsx    // 挡土墙设计
```

## 🔬 **3号计算专家 - 开发任务**  
```typescript
// 需要开发的组件
src/components/meshing/
├── MeshGenerationPanel.tsx      // 网格生成面板
├── MeshQualityAnalyzer.tsx     // 网格质量分析
├── MeshParameterEditor.tsx     // 网格参数编辑

src/components/computation/
├── AnalysisTypeSelector.tsx    // 分析类型选择
├── SolverConfigPanel.tsx       // 求解器配置
├── ConvergenceMonitor.tsx      // 收敛监控

src/components/visualization/
├── FieldVariableSelector.tsx   // 场变量选择
├── ColorMapController.tsx      // 颜色映射控制
├── AnimationController.tsx     // 动画控制
```

## 🔧 **API调用标准**
```typescript
// API调用示例
import { apiClient } from '../../api/client';

// 2号 - 几何建模API
const callGeologyAPI = async (params: any) => {
  const response = await apiClient.post('/api/geometry/geology/interpolate', params);
  return response.data;
};

// 3号 - 计算分析API  
const callComputationAPI = async (params: any) => {
  const response = await apiClient.post('/api/computation/setup', params);
  return response.data;
};
```

## 📱 **集成方式**
```typescript
// 在 MainWorkspaceView.tsx 中集成组件
case 'geometry':
  return <YourGeometryComponent />; // 2号的组件
  
case 'meshing':
  return <YourMeshingComponent />; // 3号的组件
```

## 🚀 **开发流程**
1. 按照模板创建组件
2. 实现业务逻辑
3. 遵循颜色和样式标准
4. 测试组件功能
5. 通知1号架构师集成

## 📞 **遇到问题联系1号架构师**
- 组件集成问题
- API接口问题  
- 样式规范问题
- 架构设计问题