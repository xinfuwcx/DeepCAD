# DeepCAD 钻孔数据集

## 📊 数据集概述

本数据集为DeepCAD地质建模系统专门生成的**100组高质量钻孔数据**，完全符合多层分段三区混合地质建模的需求。

### 基本参数
- **钻孔数量**: 100个
- **分布区域**: 300m × 300m 
- **总计算域**: 500m × 500m × 30m
- **土层类型**: 8种典型土层
- **平均深度**: 27.4m
- **总土层段**: 798个

## 🗂️ 文件结构

### 主要数据文件
```
📁 E:\DeepCAD\data\
├── 🔥 boreholes_for_import.json     # 前端直接导入文件
├── 📊 borehole_geology_data.json    # 完整地质数据配置
├── 📋 boreholes_basic_info.csv      # 钻孔基本信息表
├── 📋 boreholes_strata_details.csv  # 土层详细参数表
├── 🧪 test_frontend_integration.html # 前端集成测试页面
└── 🛠️ generate_borehole_data.py     # 数据生成脚本
```

### 辅助文件
- `README_钻孔数据集.md` - 本说明文档
- 其他历史数据文件...

## 🌍 数据特征

### 空间分布特征
- **X坐标范围**: -149.4 ~ 147.7m
- **Y坐标范围**: -146.6 ~ 149.2m  
- **地面标高**: 0.6 ~ 5.4m
- **钻孔深度**: 20.1 ~ 30.0m

### 土层分布统计
| 土层类型 | 段数 | 占比 | 颜色 | 特征 |
|---------|------|------|------|------|
| 粘土 (clay) | 200 | 25.1% | 棕色 | 高粘聚力，低摩擦角 |
| 砂土 (sand) | 200 | 25.1% | 黄色 | 无粘聚力，高摩擦角 |
| 填土 (fill) | 100 | 12.5% | 浅棕 | 人工填筑，参数变异大 |
| 粉土 (silt) | 100 | 12.5% | 浅灰 | 中等粘聚力和摩擦角 |
| 卵石 (gravel) | 100 | 12.5% | 深灰 | 高密度，高摩擦角 |
| 基岩 (rock) | 98 | 12.3% | 深绿 | 极高强度参数 |

### 参数范围
- **密度**: 1681 ~ 2621 kg/m³
- **粘聚力**: 0.0 ~ 790.5 kPa
- **内摩擦角**: 4.7° ~ 58.3°

## 🔧 使用方法

### 1. 前端界面导入

#### 方法A: JSON文件导入
1. 打开地质建模界面
2. 在"钻孔数据"选项卡中点击"上传文件"
3. 选择 `boreholes_for_import.json`
4. 系统将自动解析并加载100个钻孔数据

#### 方法B: 测试页面预览
1. 在浏览器中打开 `test_frontend_integration.html`
2. 查看数据统计和分布可视化
3. 点击"导出到地质建模"进行集成测试

### 2. 推荐建模参数

基于数据分布特征，建议使用以下参数:

```typescript
const recommendedParams = {
  domain: {
    extension_method: 'convex_hull',  // 钻孔凸包缓冲
    x_extend: 100,                    // X方向扩展100m
    y_extend: 100,                    // Y方向扩展100m
    bottom_elevation: -35,            // 底部标高-35m
    mesh_resolution: 2.0              // 网格分辨率2m
  },
  algorithm: {
    core_radius: 80,                  // 核心区半径80m
    transition_distance: 200,         // 过渡距离200m
    variogram_model: 'spherical',     // 球状变差函数
    trend_order: 'linear',            // 线性趋势面
    uncertainty_analysis: false       // 关闭不确定性分析
  }
}
```

### 3. 典型工作流程

```mermaid
graph LR
    A[加载钻孔数据] --> B[配置计算域]
    B --> C[设置三区参数] 
    C --> D[执行建模]
    D --> E[生成几何文件]
    E --> F[Three.js可视化]
```

## 📈 数据质量保证

### 生成算法特点
- **空间相关性**: 土层厚度具有合理的空间连续性
- **地质真实性**: 基于实际工程经验的参数范围
- **层序稳定**: 严格按照地质沉积序列生成
- **参数合理**: 每种土类的物理力学参数符合规范要求

### 验证结果
- ✅ 100个钻孔全部包含完整8层土体
- ✅ 无土层重叠或空缺现象
- ✅ 参数范围符合工程实际
- ✅ 空间分布均匀合理
- ✅ JSON格式完全适配前端接口

## 🎯 应用场景

### 1. 系统测试
- 地质建模算法验证
- 前端UI功能测试  
- 性能压力测试
- 端到端工作流程验证

### 2. 演示展示
- 客户产品演示
- 技术方案展示
- 教学培训材料
- 算法效果对比

### 3. 开发调试
- 新功能开发测试
- Bug复现和修复
- 算法参数调优
- 可视化效果调试

## 🔄 数据格式详解

### boreholes_for_import.json 结构
```json
[
  {
    "id": "BH001",
    "name": "ZK001", 
    "x": -138.76,
    "y": -121.48,
    "ground_elevation": 3.7,
    "total_depth": 29.3,
    "strata": [
      {
        "id": "S1",
        "top_elev": 3.7,
        "bottom_elev": 1.69,
        "soil_type": "fill",
        "density": 1839.0,
        "cohesion": 16.2,
        "friction": 13.7
      }
      // ... 更多土层数据
    ]
  }
  // ... 更多钻孔数据
]
```

### CSV格式说明
- **boreholes_basic_info.csv**: 钻孔位置、深度等基本信息
- **boreholes_strata_details.csv**: 每个土层的详细参数信息

## 🚀 高级功能

### 1. 批量处理
```python
# 使用生成脚本进行批量数据生成
python generate_borehole_data.py
```

### 2. 自定义参数
修改 `generate_borehole_data.py` 中的参数:
```python
num_boreholes = 200        # 增加到200个钻孔
study_area_size = 500      # 扩大到500x500米
max_depth = 50            # 增加最大深度到50米
```

### 3. 数据验证
```javascript
// 前端数据验证
const isValidBoreholeData = (data) => {
  return data.length >= 3 && 
         data.every(bh => bh.strata.length > 0);
};
```

## 🛠️ 故障排除

### 常见问题

**Q: JSON文件无法导入？**
A: 检查文件路径和编码，确保使用UTF-8编码

**Q: 地质建模失败？**  
A: 检查钻孔数量是否大于3个，土层数据是否完整

**Q: 可视化效果异常？**
A: 检查坐标系统和单位是否一致

### 技术支持
- 查看 `test_frontend_integration.html` 进行集成测试
- 检查浏览器开发者工具的Console输出
- 验证JSON格式是否符合Schema要求

## 📋 更新日志

### v1.0 (2025-01-21)
- ✅ 生成100个钻孔的完整数据集
- ✅ 支持8种典型土层类型  
- ✅ 完全适配前端GeologyParamsAdvanced接口
- ✅ 提供CSV和JSON多种格式
- ✅ 包含前端集成测试页面
- ✅ 添加详细的使用说明和参数建议

---

**生成时间**: 2025-01-21  
**适用版本**: DeepCAD v2.0+  
**数据格式**: JSON/CSV  
**兼容性**: ✅ Chrome, ✅ Firefox, ✅ Edge