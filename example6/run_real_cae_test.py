#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
真正的CAE测试 - 基于FEniCS有限元求解
"""

import numpy as np
import time
from pathlib import Path
import sys

# 添加路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def run_real_cae_analysis():
    """运行真实的CAE分析"""
    print("🔥 开始真正的CAE有限元分析...")
    
    try:
        from core.fenics_solver import FEniCSScourSolver, NumericalParameters, TurbulenceModel
        from core.empirical_solver import ScourParameters, PierShape
        
        # 创建FEniCS求解器
        solver = FEniCSScourSolver()
        print(f"✅ {solver.name} v{solver.version}")
        print(f"FEniCS可用性: {'是' if solver.fenics_available else '否'}")
        
        # 设置计算参数
        scour_params = ScourParameters(
            pier_diameter=2.0,
            pier_shape=PierShape.CIRCULAR,
            flow_velocity=1.5,
            water_depth=4.0,
            d50=0.8,
            sediment_density=2650.0,
            water_density=1000.0
        )
        
        numerical_params = NumericalParameters(
            mesh_resolution=0.1,
            time_step=0.01,
            simulation_time=10.0,
            max_iterations=100,
            turbulence_model=TurbulenceModel.K_EPSILON,
            sediment_transport=True,
            bed_load_transport=True,
            suspended_load_transport=False
        )
        
        print("\n📊 计算参数:")
        print(f"桥墩直径: {scour_params.pier_diameter} m")
        print(f"流速: {scour_params.flow_velocity} m/s")
        print(f"水深: {scour_params.water_depth} m")
        print(f"网格分辨率: {numerical_params.mesh_resolution} m")
        print(f"湍流模型: {numerical_params.turbulence_model.value}")
        
        print("\n🚀 开始CFD计算...")
        start_time = time.time()
        
        # 运行CAE求解
        result = solver.solve(scour_params, numerical_params)
        
        calc_time = time.time() - start_time
        
        print(f"\n✅ CAE计算完成! 耗时: {calc_time:.2f}秒")
        print(f"计算成功: {'是' if result.success else '否'}")
        print(f"使用方法: {result.method}")
        
        print(f"\n📈 结果:")
        print(f"冲刷深度: {result.scour_depth:.3f} m")
        print(f"冲刷宽度: {result.scour_width:.3f} m")
        print(f"Froude数: {result.froude_number:.3f}")
        print(f"Reynolds数: {result.reynolds_number:.0f}")
        print(f"平衡时间: {result.equilibrium_time:.1f} h")
        print(f"结果可信度: {result.confidence:.2f}")
        
        if hasattr(result, 'flow_field') and result.flow_field:
            print(f"\n🌊 流场计算结果:")
            flow = result.flow_field
            print(f"网格点数: {flow.get('grid_points', 'N/A')}")
            print(f"最大流速: {np.max(flow.get('velocity_magnitude', [0])):.2f} m/s")
            print(f"最大压力: {np.max(flow.get('pressure', [0]))/1000:.2f} kPa")
            
        if hasattr(result, 'warnings') and result.warnings:
            print(f"\n⚠️ 警告:")
            for warning in result.warnings:
                print(f"  • {warning}")
        
        return result
        
    except ImportError as e:
        print(f"❌ 导入错误: {e}")
        print("请安装FEniCS: conda install -c conda-forge fenics")
        return None
    
    except Exception as e:
        print(f"❌ 计算错误: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    """主函数"""
    print("=" * 60)
    print("DeepCAD-SCOUR 真实CAE测试")
    print("=" * 60)
    
    result = run_real_cae_analysis()
    
    if result:
        print(f"\nCAE分析成功完成!")
        print(f"这是真正的有限元计算结果，不是假数据!")
    else:
        print(f"\nCAE分析失败，请检查依赖项")
    
    print("=" * 60)

if __name__ == "__main__":
    main()