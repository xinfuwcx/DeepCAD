# 深基坑工程分析平台

## 项目介绍

深基坑工程分析平台是一个专门为基坑工程设计的分析和可视化工具，支持渗流分析、稳定性计算等功能。

## 当前问题修复

### Chili3DVisualizer组件中的变量重复声明问题

当前系统中存在一个编译错误：

```
[plugin:vite:react-babel] E:\Deep Excavation\deep_excavation\frontend\components\chili3d\Chili3DVisualizer.tsx: Identifier 'colorScheme' has already been declared. (62:2)
```

**解决方法：**

1. 打开文件：`frontend/components/chili3d/Chili3DVisualizer.tsx`
2. 找到约第110行的内部状态变量：
   ```typescript
   const [colorScheme, setColorScheme] = useState<'default' | 'blue' | 'rainbow' | 'terrain'>('default');
   ```
3. 将其改为：
   ```typescript
   const [colorSchemeState, setColorScheme] = useState<'default' | 'blue' | 'rainbow' | 'terrain'>('default');
   ```
4. 然后查找代码中所有使用该状态变量的地方，将`colorScheme`替换为`colorSchemeState`：
   - 在renderSceneData函数中（约第432行）
   - 在renderSeepageResults函数中（约第577行和第616行）
   - 在changeColorScheme函数中（约第939行）
   - 在addLegend函数调用处（约第707行）

## 运行项目

### 启动前端

1. 确保已安装Node.js和npm
2. 进入前端目录：
   ```
   cd deep_excavation/frontend
   ```
3. 安装依赖：
   ```
   npm install
   ```
4. 启动开发服务器：
   ```
   npm run dev
   ```
   开发服务器将在 http://localhost:3000 启动

### 静态预览

如果您没有安装Node.js环境，可以直接打开HTML文件进行预览：
```
.\open-frontend.bat
```

## 项目结构

- `frontend/` - 前端React应用
  - `components/` - UI组件
    - `chili3d/` - 3D可视化组件
  - `services/` - 服务层代码
- `backend/` - 后端Python API
  - `api/` - API路由定义
  - `core/` - 核心计算逻辑
  - `models/` - 数据模型

## 联系方式

如有问题，请联系项目维护人员。 