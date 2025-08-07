# GemPy 安装和配置指南

## 🚀 快速安装

### 1. 激活虚拟环境
```bash
# Windows
.\test_venv\Scripts\activate

# Linux/Mac
source test_venv/bin/activate
```

### 2. 安装 GemPy
```bash
pip install gempy==3.2.0
```

### 3. 验证安装
```bash
python simple_gempy_test.py
```

## 🔧 依赖要求

GemPy 需要以下核心依赖：
- numpy >= 1.19.0
- pandas >= 1.1.0
- matplotlib >= 3.3.0
- scipy >= 1.5.0
- scikit-learn >= 0.23.0

这些依赖已在 `requirements.txt` 中配置。

## 📋 功能特性

### ✅ 已实现功能
- 🔹 **钻孔数据导入**: 支持 CSV、JSON、Excel 格式
- 🔹 **多种插值算法**: 克里金、RBF、IDW、样条插值
- 🔹 **实时质量评估**: 自动评估模型质量和网格就绪性
- 🔹 **3D 可视化**: 集成 ABAQUS 风格的专业 3D 视口
- 🔹 **进度监控**: 实时显示处理进度和统计信息
- 🔹 **智能建议**: 基于质量分析的优化建议

### 🔄 处理流程
1. **数据预处理** - 钻孔数据清洗和验证
2. **地层识别** - 自动识别地质界面
3. **插值计算** - 使用选定算法进行空间插值
4. **表面重建** - 生成地质表面和体积
5. **质量评估** - 评估模型质量和精度
6. **模型优化** - 根据质量报告优化模型

## 🎯 使用方法

### 在前端界面中使用
1. 进入工作区 → 地质重建
2. 上传钻孔数据文件
3. 配置插值参数
4. 点击"开始重建"
5. 查看结果和质量报告

### 编程接口
```typescript
import EnhancedGeologyReconstructionPanel from './components/geology/EnhancedGeologyReconstructionPanel';

<EnhancedGeologyReconstructionPanel 
  onModelGenerated={(result) => {
    console.log('模型生成完成:', result);
  }}
  onStatusChange={(status) => {
    console.log('状态变更:', status);
  }}
  onQualityReport={(report) => {
    console.log('质量报告:', report);
  }}
/>
```

## 🐛 常见问题

### Q: 导入 GemPy 失败
**A:** 确保虚拟环境已激活，然后重新安装：
```bash
pip uninstall gempy
pip install gempy==3.2.0
```

### Q: 内存不足错误
**A:** 降低网格分辨率或增加系统内存：
```python
# 降低分辨率
gridResolution = [30, 30, 30]  # 默认是 [50, 50, 50]
```

### Q: 插值结果不理想
**A:** 尝试不同的插值方法或调整参数：
- 数据稀疏: 使用 RBF 或 IDW
- 数据密集: 使用克里金
- 快速预览: 使用 IDW

## 📊 性能优化

### 推荐配置
- **小型项目** (< 100 钻孔): 网格分辨率 [30, 30, 30]
- **中型项目** (100-500 钻孔): 网格分辨率 [50, 50, 50]  
- **大型项目** (> 500 钻孔): 网格分辨率 [80, 80, 80]

### 内存管理
- 质量阈值设置为 0.8 以上
- 启用渐进式处理
- 定期清理临时文件

## 🔗 相关文件

- `frontend/src/components/geology/EnhancedGeologyReconstructionPanel.tsx` - 主面板组件
- `frontend/src/components/geology/GeologyReconstructionPanel.css` - 样式文件
- `simple_gempy_test.py` - 安装测试脚本
- `requirements.txt` - 依赖配置

## 📞 技术支持

如遇到问题，请检查：
1. Python 环境和版本
2. 依赖包版本兼容性
3. 数据格式是否正确
4. 系统内存是否充足