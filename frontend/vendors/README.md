# 外部依赖目录

## chili3d集成

此目录将包含chili3d作为Git子模块。通过以下命令添加：

```bash
# 添加chili3d作为子模块
git submodule add https://github.com/xiangechen/chili3d.git chili3d

# 初始化并更新子模块
git submodule update --init --recursive
```

### 集成步骤

1. 克隆chili3d库到此目录
2. 按照chili3d文档安装依赖
3. 构建chili3d
4. 在我们的项目中引用chili3d组件

### 项目引用方式

我们将使用源代码方式集成chili3d，以便能够进行深度定制。 