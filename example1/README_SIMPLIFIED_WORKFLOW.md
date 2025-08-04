# Example1 简化工作流程方案

## 核心流程设计

### 1. 输入阶段
- **MSH网格文件**: 土体域、基坑、隧道的GMSH网格
- **材料配置**: JSON格式的材料参数和分析设置
- **边界条件**: 位移约束、荷载、地下水位等

### 2. 计算阶段  
- **Kratos求解器**: 基于MSH网格进行有限元分析
- **分阶段计算**: 模拟开挖过程的多个施工阶段
- **耦合分析**: 渗流-应力耦合（如果需要）

### 3. 输出阶段
- **VTK结果文件**: 位移、应力、应变等场变量
- **JSON结果摘要**: 关键指标和数值结果
- **可视化图片**: 自动生成结果图表

## 标准文件结构

```
example1/
├── input/                    # 输入文件
│   ├── geometry/
│   │   ├── soil_domain.msh      # 土体网格
│   │   ├── excavation_pit.msh   # 基坑网格  
│   │   └── tunnel.msh           # 隧道网格
│   ├── materials/
│   │   ├── soil_materials.json  # 土体材料参数
│   │   └── structure_materials.json # 结构材料参数
│   └── analysis/
│       ├── boundary_conditions.json # 边界条件
│       ├── loads.json              # 荷载定义
│       └── construction_stages.json # 施工阶段
├── scripts/                  # 主要脚本
│   ├── run_analysis.py          # 主分析脚本
│   ├── msh_processor.py         # MSH文件处理
│   ├── kratos_runner.py         # Kratos求解器
│   └── post_processor.py        # 后处理模块
├── output/                   # 输出结果
│   ├── vtk/                     # VTK结果文件
│   ├── json/                    # JSON结果摘要
│   ├── images/                  # 可视化图片
│   └── reports/                 # 分析报告
└── tests/                    # 测试用例
    ├── test_case_1/             # 简单矩形基坑
    ├── test_case_2/             # 复杂形状基坑
    └── test_case_3/             # 带隧道干扰
```

## 核心接口设计

### 1. MSH处理接口
```python
class MSHProcessor:
    def load_msh_file(self, msh_file: str) -> MeshData
    def assign_materials(self, mesh: MeshData, materials: dict) -> MeshData
    def apply_boundary_conditions(self, mesh: MeshData, bc: dict) -> MeshData
```

### 2. 计算接口
```python
class KratosRunner:
    def setup_analysis(self, mesh: MeshData, config: dict) -> AnalysisModel
    def run_stages(self, model: AnalysisModel, stages: list) -> Results
    def export_results(self, results: Results, output_dir: str) -> dict
```

### 3. 后处理接口  
```python
class PostProcessor:
    def generate_vtk(self, results: Results) -> list[str]
    def calculate_summary(self, results: Results) -> dict
    def create_visualization(self, results: Results) -> list[str]
```

## 标准输出格式

### JSON结果摘要
```json
{
  "project_info": {
    "name": "Example1_DeepExcavation",
    "analysis_type": "soil_structure_interaction",
    "stages": 4,
    "total_time": 120.5
  },
  "results": {
    "max_displacement": {
      "value": 25.8,
      "unit": "mm",
      "location": [12.5, 8.3, -6.0]
    },
    "max_stress": {
      "value": 850.2,
      "unit": "kPa", 
      "location": [15.0, 10.0, -8.5]
    },
    "stability_factor": 1.65,
    "convergence": true
  },
  "files": {
    "vtk_files": ["stage_1.vtk", "stage_2.vtk", "stage_3.vtk", "stage_4.vtk"],
    "images": ["displacement.png", "stress.png", "settlement.png"],
    "report": "analysis_report.pdf"
  }
}
```

### VTK文件内容
- **节点位移**: DISPLACEMENT_X, DISPLACEMENT_Y, DISPLACEMENT_Z
- **单元应力**: STRESS_XX, STRESS_YY, STRESS_ZZ, STRESS_XY, STRESS_XZ, STRESS_YZ  
- **等效应力**: VON_MISES_STRESS
- **塑性应变**: PLASTIC_STRAIN
- **孔隙水压**: PORE_PRESSURE (如果有渗流分析)

## 测试用例规范

### 测试用例1: 简单矩形基坑
- **几何**: 20m×30m×10m深基坑
- **土层**: 2层土（粘土+砂土）
- **支护**: 地连墙+1道支撑
- **预期结果**: 最大变形<30mm，稳定系数>1.3

### 测试用例2: 复杂形状基坑
- **几何**: L形基坑，带地下室
- **土层**: 5层复杂地层
- **支护**: 多道支撑系统
- **预期结果**: 验证复杂几何的计算能力

### 测试用例3: 基坑-隧道相互作用
- **几何**: 基坑+既有隧道
- **分析**: 开挖对隧道的影响
- **预期结果**: 隧道变形评估

## 性能指标
- **计算时间**: <10分钟（中等规模网格）
- **内存使用**: <4GB
- **结果精度**: 与商业软件差异<5%
- **稳定性**: 连续运行不崩溃

## 使用示例
```bash
# 运行完整分析
cd example1
python scripts/run_analysis.py --config tests/test_case_1/config.json

# 仅运行某个阶段
python scripts/run_analysis.py --stage 2 --config tests/test_case_1/config.json

# 生成可视化
python scripts/post_processor.py --results output/results.json --visualize
```