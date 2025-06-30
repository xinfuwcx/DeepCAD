# 渗流-结构耦合分析

本文档介绍深基坑系统中的渗流-结构耦合分析功能，包括理论背景、使用方法和示例。

## 概述

渗流-结构耦合分析是一种多物理场分析方法，同时考虑了土体中的水流运动和力学变形的相互作用。在深基坑工程中，这种耦合效应对于准确预测变形、稳定性和长期性能至关重要。

## 理论背景

渗流-结构耦合分析基于以下基本原理：

1. **Biot固结理论**: 描述多孔介质中流体流动与固体变形之间的相互作用
2. **达西定律**: 描述多孔介质中流体的运动
3. **有效应力原理**: 土体中的总应力由有效应力和孔隙水压力组成

耦合的关键机制包括：
- 孔隙水压力导致的有效应力变化影响土体变形
- 土体变形导致的孔隙率变化影响渗透性能和水流场
- 时间效应：压实过程中水压力的消散

## 系统功能

本系统支持以下渗流-结构耦合分析功能：

### 求解策略

1. **一体化求解(Monolithic)**: 同时求解结构和渗流方程组，精度高但计算成本大
2. **分离式求解(Staggered)**: 交替求解结构和渗流方程组，平衡计算效率和精度
3. **单向耦合(One-way)**: 渗流分析结果影响结构分析，但结构变形不影响渗流场

### 分析类型

1. **瞬态分析**: 研究随时间变化的耦合效应
2. **准静态分析**: 在特定时间步长下假设达到局部平衡
3. **稳态分析**: 研究最终平衡状态

### 材料模型

支持以下材料模型与耦合分析：
- 线性弹性模型
- Mohr-Coulomb模型
- 修正剑桥模型
- 其他高级土体本构模型

## 实现进展

系统已完成了渗流-结构耦合分析的基本框架实现，目前的开发进度约为70%。

### 已完成部分

✅ 一体化和分离式耦合策略的核心算法
✅ 孔隙水压力计算模块
✅ 接口网格处理和数据传递
✅ 基本收敛准则和控制机制
✅ 主要API接口设计和实现
✅ 示例案例实现

### 进行中部分

🔄 优化一体化求解器性能
🔄 完善接口网格映射算法
🔄 扩展收敛准则类型
🔄 实现自适应时间步长

## 使用方法

### 前端界面操作

1. 打开FEM分析页面
2. 选择"耦合分析"选项卡
3. 设置基本参数：
   - 耦合方案(一体化/分离式/单向)
   - 时间步长和总计算时间
   - 收敛容差和最大迭代次数
   - 流体模型类型
4. 设置材料属性：
   - 土体参数(弹性模量、泊松比、密度、渗透系数、孔隙率)
   - 结构参数(围护结构的材料属性)
5. 上传模型文件
6. 点击"开始分析"按钮
7. 分析完成后，可查看结果摘要和下载详细结果

### API接口

系统提供以下API接口用于渗流-结构耦合分析：

```
POST /api/compute/seepage-coupling
```
启动渗流-结构耦合分析任务

请求体示例：
```json
{
  "project_id": 123,
  "coupling_type": "staggered",
  "coupling_scheme": "biot",
  "time_step": 1.0,
  "total_time": 100.0,
  "max_iterations": 20,
  "convergence_tolerance": 1e-4,
  "fluid_model": "darcy",
  "material_params": {
    "soil_layers": [
      {
        "id": 1,
        "elastic_modulus": 20000,
        "poisson_ratio": 0.3,
        "permeability": 1e-8,
        "porosity": 0.4
      }
    ],
    "structures": [
      {
        "id": 2,
        "elastic_modulus": 2e7,
        "thickness": 0.5
      }
    ]
  },
  "boundary_conditions": {
    "flow": [
      {
        "type": "pressure",
        "location": "top",
        "value": 0
      }
    ],
    "structure": [
      {
        "type": "fixed",
        "location": "bottom"
      }
    ]
  }
}
```

```
GET /api/compute/seepage-coupling/{task_id}/status
```
获取分析任务状态

响应示例：
```json
{
  "task_id": "abc123",
  "status": "running",
  "progress": 45,
  "current_time": 35.0,
  "convergence_info": {
    "iteration": 3,
    "error": 2.3e-3
  }
}
```

```
GET /api/compute/seepage-coupling/{task_id}/results
```
获取分析结果

响应示例：
```json
{
  "task_id": "abc123",
  "status": "completed",
  "result_files": {
    "displacement": "/results/task_abc123/displacement.vtk",
    "pressure": "/results/task_abc123/pressure.vtk",
    "summary": "/results/task_abc123/summary.json"
  }
}
```

### 核心类API参考

系统提供了`FlowStructureCoupling`类用于渗流-结构耦合分析：

```python
class FlowStructureCoupling:
    """渗流-结构耦合分析类"""
    
    def __init__(
        self,
        project_id: int,
        work_dir: str,
        coupling_type: Union[str, CouplingType] = CouplingType.STAGGERED,
        coupling_scheme: Union[str, CouplingScheme] = CouplingScheme.BIOT,
        config: Dict[str, Any] = None
    ):
        """初始化渗流-结构耦合分析"""
        pass
        
    def set_flow_model(self, model, wrapper_fn: Optional[Callable] = None):
        """设置流体模型"""
        pass
        
    def set_structure_model(self, model, wrapper_fn: Optional[Callable] = None):
        """设置结构模型"""
        pass
        
    def initialize(self) -> bool:
        """初始化耦合分析"""
        pass
        
    def solve_step(self, time_step: Optional[float] = None) -> bool:
        """求解一个时间步"""
        pass
        
    def solve_complete(self) -> bool:
        """求解完整分析过程"""
        pass
        
    def save_results(self, file_name: str) -> str:
        """保存分析结果"""
        pass
        
    def load_results(self, file_name: str) -> bool:
        """加载已有分析结果"""
        pass
```

## 示例

可以运行示例脚本进行渗流-结构耦合分析演示：

```bash
python examples/advanced/seepage_structure_coupling.py
```

该示例会创建一个简单的深基坑模型并进行耦合分析，生成位移和水压力的时间历程曲线。

### 示例代码

```python
import os
import numpy as np
import matplotlib.pyplot as plt
from src.core.simulation.flow_structure_coupling import FlowStructureCoupling, CouplingType, CouplingScheme

# 创建工作目录
work_dir = os.path.join("examples", "case_results", "seepage_coupling")
os.makedirs(work_dir, exist_ok=True)

# 初始化耦合分析模型
coupling_config = {
    "max_iterations": 15,
    "convergence_tolerance": 1e-4,
    "time_step": 2.0,
    "total_time": 50.0
}

coupling_analysis = FlowStructureCoupling(
    project_id=101,
    work_dir=work_dir,
    coupling_type=CouplingType.STAGGERED,
    coupling_scheme=CouplingScheme.BIOT,
    config=coupling_config
)

# 创建和设置流体模型
# ...

# 创建和设置结构模型
# ...

# 初始化分析
if coupling_analysis.initialize():
    print("初始化完成，开始分析...")
    
    # 运行完整分析
    if coupling_analysis.solve_complete():
        print("分析完成")
        
        # 保存结果
        result_file = coupling_analysis.save_results("final_results")
        print(f"结果已保存至: {result_file}")
        
        # 绘制结果
        # ...
    else:
        print("分析失败")
else:
    print("初始化失败")
```

## 典型应用场景

1. **深基坑降水影响分析**: 评估基坑降水对周边建筑物的影响
2. **水坝和堤防分析**: 研究渗流对水工建筑物稳定性的影响
3. **地下水位变化影响**: 预测地下水位变化导致的地面沉降
4. **隧道工程**: 评估地下水流动对隧道围岩变形的影响
5. **土坝和边坡渗流稳定性**: 分析降雨入渗对边坡稳定性的影响

## 物理AI系统集成

渗流-结构耦合分析已与物理AI系统实现初步集成，支持以下功能：

1. **参数反演**: 利用监测数据反演土体渗透系数和变形参数
2. **边界条件识别**: 识别实际水头和力边界条件
3. **状态预测**: 预测未来时间点的孔压分布和变形场

物理AI集成示例：

```python
from src.ai.physics_ai import CoupledPINN
from src.core.simulation.flow_structure_coupling import FlowStructureCoupling

# 创建耦合PINN模型和FEM耦合模型
# ...

# 设置数据接口
# ...

# 运行混合分析
# ...
```

## 下一步开发计划

1. **性能优化**: 改进一体化求解器性能，支持大规模问题
2. **高级网格处理**: 完善非匹配网格的插值传递算法
3. **自动化工作流**: 开发完整的渗流-结构耦合分析工作流
4. **与物理AI深度集成**: 增强与物理AI系统的集成能力
5. **不饱和土分析**: 扩展支持不饱和土的渗流-结构耦合分析

## 注意事项

1. 渗流-结构耦合分析通常比单独的结构或渗流分析计算成本高
2. 对于大规模模型，建议先使用较粗糙的网格进行初步分析
3. 时间步长选择对分析结果和计算稳定性有重要影响
4. 边界条件设置对耦合分析至关重要，特别是水力边界条件
5. 使用一体化求解时，收敛性通常更好但计算成本更高；分离式求解计算效率更高，但可能需要更小的时间步长

## 参考文献

1. Lewis, R. W., & Schrefler, B. A. (1998). The finite element method in the static and dynamic deformation and consolidation of porous media. John Wiley.
2. Zienkiewicz, O. C., Chan, A. H. C., Pastor, M., Schrefler, B. A., & Shiomi, T. (1999). Computational geomechanics. Wiley.
3. Wang, H. F. (2000). Theory of linear poroelasticity with applications to geomechanics and hydrogeology. Princeton University Press.
4. Borja, R. I. (2004). Cam-Clay plasticity. Part V: A mathematical framework for three-phase deformation and strain localization analyses of partially saturated porous media. Computer methods in applied mechanics and engineering, 193(48-51), 5301-5338.
5. White, J. A., & Borja, R. I. (2008). Stabilized low-order finite elements for coupled solid-deformation/fluid-diffusion and their application to fault zone transients. Computer Methods in Applied Mechanics and Engineering, 197(49-50), 4353-4366. 