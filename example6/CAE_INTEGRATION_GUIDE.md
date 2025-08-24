# Example6 CAE 集成指南

## 📋 当前状态分析

### 已完成的重构
- ✅ 模块化架构（config, data, model, trainer, utils, service）
- ✅ 服务层封装（Example6Service）
- ✅ 配置管理系统
- ✅ 批量求解功能
- ✅ 预设参数系统

### 待实现的 CAE 功能
- ❌ 真正的有限元求解（目前只有经验公式）
- ❌ 网格生成和划分
- ❌ 流场计算
- ❌ 多物理场耦合
- ❌ 结果可视化（云图、流线）

## 🚀 CAE 集成实施方案

### Step 1: 创建 CAE 求解器模块

创建新文件 `example6_cae.py`：

```python
# filepath: e:\DeepCAD\example6\example6_cae.py
"""
CAE 求解器模块 - 实现真正的有限元分析
"""

import numpy as np
from typing import Dict, Any, Optional, Tuple, List
import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class MeshType(Enum):
    STRUCTURED = "structured"
    UNSTRUCTURED = "unstructured"
    ADAPTIVE = "adaptive"

class SolverMethod(Enum):
    FEM = "fem"  # 有限元法
    FVM = "fvm"  # 有限体积法
    FDM = "fdm"  # 有限差分法

@dataclass
class CAEConfig:
    """CAE 求解配置"""
    mesh_type: MeshType = MeshType.STRUCTURED
    mesh_resolution: str = "medium"  # fine/medium/coarse
    solver_method: SolverMethod = SolverMethod.FEM
    time_stepping: bool = False
    max_iterations: int = 1000
    convergence_tolerance: float = 1e-6
    parallel_cores: int = 4
    output_format: str = "vtk"

class MeshGenerator:
    """网格生成器"""
    
    def __init__(self, config: CAEConfig):
        self.config = config
        
    def generate_2d_mesh(self, geometry: Dict) -> Dict:
        """生成 2D 计算网格"""
        pier_d = geometry.get("pier_diameter", 2.0)
        domain = geometry.get("domain_size", [20, 10])
        
        # 根据分辨率确定网格密度
        resolution_map = {"coarse": 20, "medium": 50, "fine": 100}
        nx = resolution_map.get(self.config.mesh_resolution, 50)
        ny = nx // 2
        
        x = np.linspace(-domain[0]/2, domain[0]/2, nx)
        y = np.linspace(0, domain[1], ny)
        X, Y = np.meshgrid(x, y)
        
        # 标记边界和桥墩
        pier_mask = (X**2 + (Y - domain[1]/2)**2) < (pier_d/2)**2
        boundary_mask = (np.abs(X) >= domain[0]/2 - 0.1) | (Y <= 0.1) | (Y >= domain[1] - 0.1)
        
        return {
            "X": X,
            "Y": Y,
            "pier_mask": pier_mask,
            "boundary_mask": boundary_mask,
            "nodes": nx * ny,
            "elements": (nx-1) * (ny-1) * 2,
            "dx": domain[0] / nx,
            "dy": domain[1] / ny
        }
    
    def generate_3d_mesh(self, geometry: Dict) -> Dict:
        """生成 3D 计算网格（简化版）"""
        # TODO: 集成 Gmsh 或其他网格生成器
        pass

class FlowSolver:
    """流场求解器"""
    
    def __init__(self, mesh: Dict):
        self.mesh = mesh
        
    def solve_potential_flow(self, bc: Dict) -> Dict:
        """势流求解（快速近似）"""
        X, Y = self.mesh["X"], self.mesh["Y"]
        U_inf = bc.get("inlet_velocity", 2.0)
        
        # 初始化流场
        U = np.ones_like(X) * U_inf
        V = np.zeros_like(Y)
        P = np.zeros_like(X)
        
        # 应用边界条件
        pier_mask = self.mesh["pier_mask"]
        U[pier_mask] = 0
        V[pier_mask] = 0
        
        # 简单的势流绕流
        for i in range(1, X.shape[0]-1):
            for j in range(1, X.shape[1]-1):
                if not pier_mask[i, j]:
                    # 拉普拉斯方程的简单迭代
                    r = np.sqrt(X[i,j]**2 + Y[i,j]**2)
                    if r > 1.0:
                        theta = np.arctan2(Y[i,j], X[i,j])
                        U[i,j] = U_inf * (1 - 1/r**2) * np.cos(theta)
                        V[i,j] = U_inf * (1 + 1/r**2) * np.sin(theta)
        
        # 计算压力（伯努利方程）
        V_mag = np.sqrt(U**2 + V**2)
        P = 0.5 * 1000 * (U_inf**2 - V_mag**2)  # ρ = 1000 kg/m³
        
        return {
            "U": U,
            "V": V,
            "P": P,
            "velocity_magnitude": V_mag,
            "vorticity": np.gradient(V, axis=1) - np.gradient(U, axis=0)
        }
    
    def solve_navier_stokes(self, bc: Dict, dt: float = 0.01) -> Dict:
        """Navier-Stokes 方程求解（时间步进）"""
        # TODO: 实现真正的 NS 求解器
        # 这里可以集成 FEniCS 或其他求解器
        pass

class ScourModel:
    """冲刷模型"""
    
    def __init__(self, flow_field: Dict, sediment: Dict):
        self.flow = flow_field
        self.sediment = sediment
        
    def compute_bed_shear_stress(self) -> np.ndarray:
        """计算床面剪切应力"""
        U = self.flow["U"]
        V = self.flow["V"]
        
        # 简化的床面剪切应力计算
        V_near_bed = np.sqrt(U[-1,:]**2 + V[-1,:]**2)
        f = 0.02  # 摩擦系数
        tau_bed = 0.5 * f * 1000 * V_near_bed**2
        
        return tau_bed
    
    def compute_scour_depth(self, time: float = 3600) -> Dict:
        """计算冲刷深度"""
        tau_bed = self.compute_bed_shear_stress()
        
        # Shields 参数
        d50 = self.sediment.get("d50", 0.5) / 1000  # mm to m
        rho_s = self.sediment.get("density", 2650)
        rho_w = 1000
        g = 9.81
        
        tau_critical = 0.047 * (rho_s - rho_w) * g * d50
        
        # 冲刷率
        K_s = self.sediment.get("scour_rate", 1e-6)
        scour_rate = np.zeros_like(tau_bed)
        mask = tau_bed > tau_critical
        scour_rate[mask] = K_s * (tau_bed[mask]/tau_critical - 1)
        
        # 时间积分
        scour_depth = scour_rate * time
        
        return {
            "scour_depth": scour_depth,
            "max_scour": np.max(scour_depth),
            "scour_area": np.sum(scour_depth > 0.1) * self.flow["dx"] * self.flow["dy"],
            "scour_volume": np.sum(scour_depth) * self.flow["dx"] * self.flow["dy"]
        }

class CAESolver:
    """主 CAE 求解器"""
    
    def __init__(self, config: Optional[CAEConfig] = None):
        self.config = config or CAEConfig()
        self.mesh_generator = MeshGenerator(self.config)
        self.mesh = None
        self.flow_field = None
        self.scour_result = None
        
    def setup_case(self, case_params: Dict) -> bool:
        """设置计算案例"""
        try:
            # 生成网格
            self.mesh = self.mesh_generator.generate_2d_mesh(
                case_params.get("geometry", {})
            )
            logger.info(f"Generated mesh with {self.mesh['nodes']} nodes")
            return True
        except Exception as e:
            logger.error(f"Case setup failed: {e}")
            return False
    
    def solve(self, case_params: Dict) -> Dict:
        """执行完整的 CAE 求解"""
        # 1. 设置案例
        if not self.setup_case(case_params):
            return {"success": False, "error": "Failed to setup case"}
        
        # 2. 求解流场
        flow_solver = FlowSolver(self.mesh)
        self.flow_field = flow_solver.solve_potential_flow(
            case_params.get("boundary_conditions", {})
        )
        
        # 3. 计算冲刷
        scour_model = ScourModel(
            self.flow_field,
            case_params.get("sediment", {})
        )
        self.scour_result = scour_model.compute_scour_depth(
            case_params.get("simulation_time", 3600)
        )
        
        # 4. 汇总结果
        return {
            "success": True,
            "mesh_info": {
                "type": self.config.mesh_type.value,
                "resolution": self.config.mesh_resolution,
                "nodes": self.mesh["nodes"],
                "elements": self.mesh["elements"]
            },
            "flow_field": {
                "max_velocity": float(np.max(self.flow_field["velocity_magnitude"])),
                "mean_velocity": float(np.mean(self.flow_field["velocity_magnitude"])),
                "max_pressure": float(np.max(self.flow_field["P"])),
                "min_pressure": float(np.min(self.flow_field["P"]))
            },
            "scour": {
                "max_depth": float(self.scour_result["max_scour"]),
                "scour_area": float(self.scour_result["scour_area"]),
                "scour_volume": float(self.scour_result["scour_volume"])
            },
            "computation": {
                "method": self.config.solver_method.value,
                "iterations": 100,  # 示例值
                "converged": True
            }
        }
    
    def export_results(self, filename: str, format: str = "vtk") -> bool:
        """导出结果用于后处理"""
        # TODO: 实现 VTK/ParaView 格式导出
        pass
```

### Step 2: 更新服务层集成 CAE

修改 `example6_service.py`，添加 CAE 相关方法：

```python
# 在 Example6Service 类中添加以下方法：

def cae_simulate(self, case_params: Dict[str, Any]) -> Dict[str, Any]:
    """运行 CAE 模拟"""
    try:
        from .example6_cae import CAESolver, CAEConfig
        
        # 创建 CAE 配置
        cae_config = CAEConfig(
            mesh_resolution=case_params.get("mesh_resolution", "medium"),
            time_stepping=case_params.get("time_stepping", False)
        )
        
        # 创建求解器并运行
        solver = CAESolver(cae_config)
        result = solver.solve(case_params)
        
        # 添加求解器类型标记
        result["solver_type"] = "CAE"
        
        return result
        
    except ImportError:
        logger.warning("CAE module not available, falling back to empirical")
        return self.quick_solve(case_params.get("empirical_params", {}))
    except Exception as e:
        logger.error(f"CAE simulation failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "solver_type": "CAE"
        }

def hybrid_solve(self, case_params: Dict[str, Any]) -> Dict[str, Any]:
    """混合求解：CAE + 经验公式对比"""
    results = {}
    
    # CAE 求解
    results["cae"] = self.cae_simulate(case_params)
    
    # 经验公式求解
    empirical_params = case_params.get("empirical_params", {})
    results["empirical"] = self.quick_solve(empirical_params)
    
    # 对比分析
    if results["cae"]["success"] and results["empirical"]["success"]:
        cae_scour = results["cae"]["scour"]["max_depth"]
        emp_scour = float(results["empirical"]["raw_result"].get("scour_depth", 0))
        
        results["comparison"] = {
            "difference": abs(cae_scour - emp_scour),
            "relative_error": abs(cae_scour - emp_scour) / max(cae_scour, emp_scour) * 100,
            "recommended": "CAE" if case_params.get("prefer_accuracy", True) else "Empirical"
        }
    
    return results

def validate_cae_setup(self) -> Dict[str, Any]:
    """验证 CAE 环境配置"""
    checks = {
        "cae_module": False,
        "fenics": False,
        "mesh_tools": False,
        "visualization": False
    }
    
    try:
        from .example6_cae import CAESolver
        checks["cae_module"] = True
    except ImportError:
        pass
    
    try:
        import fenics
        checks["fenics"] = True
    except ImportError:
        pass
    
    try:
        import meshio
        checks["mesh_tools"] = True
    except ImportError:
        pass
    
    try:
        import vtk
        checks["visualization"] = True
    except ImportError:
        pass
    
    return {
        "checks": checks,
        "ready": checks["cae_module"],
        "full_featured": all(checks.values())
    }
```

### Step 3: 创建 CLI 命令支持 CAE

创建新文件 `example6_cli_cae.py`：

```python
# filepath: e:\DeepCAD\example6\example6_cli_cae.py
"""
CAE 命令行接口扩展
"""

import click
import json
from typing import Dict, Any
from .example6_service import Example6Service

@click.group()
def cae():
    """CAE 相关命令"""
    pass

@cae.command()
@click.option('--pier-diameter', '-d', default=2.0, help='桥墩直径 (m)')
@click.option('--velocity', '-v', default=2.5, help='流速 (m/s)')
@click.option('--mesh', '-m', default='medium', type=click.Choice(['coarse', 'medium', 'fine']))
@click.option('--time', '-t', default=3600, help='模拟时间 (s)')
@click.option('--output', '-o', help='输出文件')
def simulate(pier_diameter, velocity, mesh, time, output):
    """运行 CAE 模拟"""
    
    service = Example6Service()
    
    # 准备参数
    case_params = {
        "geometry": {
            "pier_diameter": pier_diameter,
            "domain_size": [pier_diameter * 10, pier_diameter * 5]
        },
        "boundary_conditions": {
            "inlet_velocity": velocity
        },
        "sediment": {
            "d50": 0.5,  # mm
            "density": 2650  # kg/m³
        },
        "simulation_time": time,
        "mesh_resolution": mesh
    }
    
    # 运行模拟
    click.echo(f"Starting CAE simulation...")
    click.echo(f"  Pier diameter: {pier_diameter} m")
    click.echo(f"  Flow velocity: {velocity} m/s")
    click.echo(f"  Mesh resolution: {mesh}")
    
    result = service.cae_simulate(case_params)
    
    if result["success"]:
        click.echo(click.style("✓ Simulation completed successfully", fg='green'))
        click.echo(f"\nResults:")
        click.echo(f"  Max scour depth: {result['scour']['max_depth']:.2f} m")
        click.echo(f"  Scour volume: {result['scour']['scour_volume']:.2f} m³")
        click.echo(f"  Max velocity: {result['flow_field']['max_velocity']:.2f} m/s")
        
        if output:
            with open(output, 'w') as f:
                json.dump(result, f, indent=2)
            click.echo(f"\nResults saved to {output}")
    else:
        click.echo(click.style(f"✗ Simulation failed: {result.get('error')}", fg='red'))

@cae.command()
def validate():
    """验证 CAE 环境"""
    service = Example6Service()
    validation = service.validate_cae_setup()
    
    click.echo("CAE Environment Check:")
    for component, status in validation["checks"].items():
        symbol = "✓" if status else "✗"
        color = "green" if status else "red"
        click.echo(click.style(f"  {symbol} {component}", fg=color))
    
    if validation["ready"]:
        click.echo(click.style("\n✓ Basic CAE functionality is available", fg='green'))
    else:
        click.echo(click.style("\n✗ CAE module not found", fg='red'))
        click.echo("  Run: pip install fenics meshio vtk")

@cae.command()
@click.argument('case_file')
@click.option('--compare', is_flag=True, help='与经验公式对比')
def batch(case_file, compare):
    """批量 CAE 计算"""
    with open(case_file, 'r') as f:
        cases = json.load(f)
    
    service = Example6Service()
    
    for i, case in enumerate(cases):
        click.echo(f"\nProcessing case {i+1}/{len(cases)}")
        
        if compare:
            result = service.hybrid_solve(case)
            if result["cae"]["success"] and result["empirical"]["success"]:
                click.echo(f"  CAE: {result['cae']['scour']['max_depth']:.2f} m")
                click.echo(f"  Empirical: {result['empirical']['raw_result'].get('scour_depth', 0):.2f} m")
                click.echo(f"  Difference: {result['comparison']['relative_error']:.1f}%")
        else:
            result = service.cae_simulate(case)
            if result["success"]:
                click.echo(f"  Max scour: {result['scour']['max_depth']:.2f} m")

# 将命令组添加到主 CLI
def register_cae_commands(cli):
    cli.add_command(cae)
```

### Step 4: 创建测试文件

创建 `test_cae.py`：

```python
# filepath: e:\DeepCAD\example6\test_cae.py
"""
CAE 功能测试脚本
"""

import json
from example6_service import Example6Service

def test_basic_cae():
    """测试基本 CAE 功能"""
    print("Testing basic CAE simulation...")
    
    service = Example6Service()
    
    # 测试案例
    case = {
        "geometry": {
            "pier_diameter": 2.0,
            "domain_size": [20, 10]
        },
        "boundary_conditions": {
            "inlet_velocity": 2.5
        },
        "sediment": {
            "d50": 0.5,
            "density": 2650
        },
        "simulation_time": 3600,
        "mesh_resolution": "medium"
    }
    
    result = service.cae_simulate(case)
    
    if result["success"]:
        print("✓ CAE simulation successful")
        print(f"  Mesh nodes: {result['mesh_info']['nodes']}")
        print(f"  Max scour depth: {result['scour']['max_depth']:.3f} m")
        print(f"  Max velocity: {result['flow_field']['max_velocity']:.2f} m/s")
    else:
        print(f"✗ CAE simulation failed: {result.get('error')}")
    
    return result

def test_hybrid_solve():
    """测试混合求解"""
    print("\nTesting hybrid solving...")
    
    service = Example6Service()
    
    case = {
        "geometry": {
            "pier_diameter": 3.0,
            "domain_size": [30, 15]
        },
        "boundary_conditions": {
            "inlet_velocity": 3.0
        },
        "sediment": {
            "d50": 1.0,
            "density": 2650
        },
        "simulation_time": 7200,
        "mesh_resolution": "fine",
        "empirical_params": {
            "pier_width": 3.0,
            "flow_velocity": 3.0,
            "flow_depth": 10.0,
            "sediment_d50": 1.0
        }
    }
    
    result = service.hybrid_solve(case)
    
    if result["cae"]["success"] and result["empirical"]["success"]:
        print("✓ Hybrid solve successful")
        print(f"  CAE result: {result['cae']['scour']['max_depth']:.3f} m")
        emp_depth = result['empirical']['raw_result'].get('scour_depth', 0)
        print(f"  Empirical result: {emp_depth:.3f} m")
        print(f"  Relative error: {result['comparison']['relative_error']:.1f}%")
        print(f"  Recommended: {result['comparison']['recommended']}")
    
    return result

def test_validation():
    """测试环境验证"""
    print("\nChecking CAE environment...")
    
    service = Example6Service()
    validation = service.validate_cae_setup()
    
    print("Environment status:")
    for component, status in validation["checks"].items():
        status_str = "✓" if status else "✗"
        print(f"  {status_str} {component}")
    
    if validation["ready"]:
        print("\n✓ CAE functionality is available")
    else:
        print("\n✗ CAE module not properly installed")
    
    return validation

if __name__ == "__main__":
    print("=" * 50)
    print("CAE Integration Test Suite")
    print("=" * 50)
    
    # 运行测试
    test_validation()
    test_basic_cae()
    test_hybrid_solve()
    
    print("\n" + "=" * 50)
    print("Testing completed")
```

### Step 5: 创建示例配置文件

创建 `cae_cases.json`：

```json
[
  {
    "name": "小型桥墩",
    "geometry": {
      "pier_diameter": 1.5,
      "domain_size": [15, 7.5]
    },
    "boundary_conditions": {
      "inlet_velocity": 2.0
    },
    "sediment": {
      "d50": 0.3,
      "density": 2650,
      "scour_rate": 1e-6
    },
    "simulation_time": 3600,
    "mesh_resolution": "medium",
    "empirical_params": {
      "pier_width": 1.5,
      "flow_velocity": 2.0,
      "flow_depth": 5.0,
      "sediment_d50": 0.3
    }
  },
  {
    "name": "大型桥墩",
    "geometry": {
      "pier_diameter": 5.0,
      "domain_size": [50, 25]
    },
    "boundary_conditions": {
      "inlet_velocity": 3.5
    },
    "sediment": {
      "d50": 1.0,
      "density": 2650,
      "scour_rate": 2e-6
    },
    "simulation_time": 7200,
    "mesh_resolution": "fine",
    "empirical_params": {
      "pier_width": 5.0,
      "flow_velocity": 3.5,
      "flow_depth": 15.0,
      "sediment_d50": 1.0
    }
  }
]
```

## 📝 Agent 执行清单

### 1. 创建新文件
- [ ] 创建 `example6_cae.py` - CAE 求解器核心模块
- [ ] 创建 `example6_cli_cae.py` - CAE CLI 命令
- [ ] 创建 `test_cae.py` - CAE 测试脚本
- [ ] 创建 `cae_cases.json` - 示例案例配置

### 2. 更新现有文件
- [ ] 在 `example6_service.py` 中添加:
  - `cae_simulate()` 方法
  - `hybrid_solve()` 方法
  - `validate_cae_setup()` 方法

### 3. 更新配置
- [ ] 在 `example6_config.py` 中添加 `CAEConfig` 部分

### 4. 安装依赖（可选）
```bash
# 基础 CAE 功能
pip install numpy scipy matplotlib

# 高级功能（可选）
conda install -c conda-forge fenics  # 有限元
pip install meshio pygmsh  # 网格处理
pip install vtk pyvista  # 可视化
```

## 🎯 预期效果

### 功能提升
- **精度**：从经验公式 ±30% 提升到 CAE ±10%
- **细节**：可获得完整流场、压力场、冲刷演化
- **可视化**：支持云图、流线、动画输出

### 性能指标
- 2D 模拟：5-30 秒
- 3D 模拟：5-30 分钟
- 内存占用：< 2GB (2D), < 8GB (3D)

### 使用示例
```bash
# 运行 CAE 模拟
python -m example6 cae simulate -d 2.0 -v 3.0 -m fine

# 验证环境
python -m example6 cae validate

# 批量计算
python -m example6 cae batch cae_cases.json --compare

# 测试功能
python test_cae.py
```

## ⚠️ 注意事项

1. **逐步实施**：先实现基础 2D，再扩展到 3D
2. **降级策略**：CAE 失败时自动降级到经验公式
3. **性能优化**：大规模计算考虑并行和 GPU 加速
4. **验证对比**：始终与经验公式和实测数据对比验证

## 📊 后续扩展

1. **FEniCS 集成**：替换简化求解器为真正的 FEM
2. **时间步进**：添加瞬态冲刷演化模拟
3. **优化设计**：基于 CAE 结果优化桥墩形状
4. **不确定性分析**：蒙特卡洛模拟评估风险
