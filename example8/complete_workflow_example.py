"""
SimPEG 完整工作流程示例
展示从网格创建到反演结果的完整流程
"""

import numpy as np
import matplotlib.pyplot as plt
import sys
from pathlib import Path

# 添加模块路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir / 'modules'))
sys.path.insert(0, str(current_dir / 'methods' / 'gravity'))

from mesh_builder import MeshBuilder
from survey_designer import SurveyDesigner  
from forward_solver import ForwardSolver
from inversion_engine import InversionEngine
from gravity_module import GravityModule

def complete_gravity_workflow():
    """完整的重力数据处理工作流程"""
    
    print("=" * 60)
    print("SimPEG 重力方法完整工作流程示例")
    print("=" * 60)
    
    # 第1步：创建计算网格
    print("\n第1步：创建计算网格")
    print("-" * 30)
    
    mesh_builder = MeshBuilder()
    
    # 定义模型区域
    bounds = {
        'x': [-500, 500],
        'y': [-400, 400], 
        'z': [-300, 50]
    }
    
    # 核心区域网格大小
    core_cell_sizes = {
        'x': 25,  # 25米
        'y': 25,  # 25米
        'z': 20   # 20米
    }
    
    # 创建张量网格
    mesh = mesh_builder.create_tensor_mesh_from_bounds(
        bounds, core_cell_sizes
    )
    
    # 检查网格质量
    quality_report = mesh_builder.check_mesh_quality()
    print(f"网格质量报告: {quality_report['n_cells']} 个网格单元")
    
    # 第2步：设计观测系统
    print("\n第2步：设计观测系统")
    print("-" * 30)
    
    survey_designer = SurveyDesigner()
    
    # 创建规则重力测网
    survey_bounds = {'x': [-300, 300], 'y': [-250, 250]}
    gravity_survey_config = survey_designer.design_regular_gravity_grid(
        survey_bounds, spacing=50, elevation=5.0
    )
    
    # 第3步：设置重力模块
    print("\n第3步：设置重力模块")
    print("-" * 30)
    
    gravity_module = GravityModule()
    
    # 从观测系统配置创建SimPEG观测系统
    receiver_locations = gravity_survey_config['stations']
    survey = gravity_module.create_gravity_survey(receiver_locations)
    
    # 设置正演建模
    simulation = gravity_module.setup_forward_modeling(mesh, survey)
    
    # 第4步：创建真实模型
    print("\n第4步：创建真实模型")
    print("-" * 30)
    
    # 创建一个包含多个异常体的复杂模型
    true_model = gravity_module.create_density_model(
        'layered', 
        parameters={
            'n_layers': 3,
            'density_range': [200, 800]  # kg/m³
        }
    )
    
    # 添加一个球形高密度体
    cell_centers = mesh.cell_centers[gravity_module.active_cells]
    sphere_center = [0, 0, -100]
    sphere_radius = 80
    distances = np.sqrt(np.sum((cell_centers - sphere_center)**2, axis=1))
    sphere_mask = distances <= sphere_radius
    true_model[sphere_mask] += 1000  # 增加1000 kg/m³
    
    print(f"真实模型创建完成，密度范围: {np.min(true_model):.1f} ~ {np.max(true_model):.1f} kg/m³")
    
    # 第5步：正演计算
    print("\n第5步：正演计算")
    print("-" * 30)
    
    # 计算理论重力响应
    true_data = gravity_module.run_forward_gravity(true_model)
    
    # 添加噪声模拟观测数据
    forward_solver = ForwardSolver()
    observed_data, uncertainties = forward_solver.add_noise_to_data(
        true_data, noise_level=0.02, noise_floor=0.01
    )
    
    print(f"观测数据创建完成:")
    print(f"  数据范围: {np.min(observed_data):.3f} ~ {np.max(observed_data):.3f} mGal")
    print(f"  信噪比: {np.mean(np.abs(true_data)) / np.mean(uncertainties):.1f}")
    
    # 第6步：创建初始模型
    print("\n第6步：创建初始模型")
    print("-" * 30)
    
    # 创建均匀的初始模型
    starting_model = forward_solver.create_starting_model(
        'gravity', 'homogeneous', background_value=0.0
    )
    
    # 第7步：设置反演
    print("\n第7步：设置反演")
    print("-" * 30)
    
    inversion_engine = InversionEngine()
    
    # 设置正则化参数
    regularization_config = {
        'alpha_s': 1e-4,    # 平滑约束权重
        'alpha_x': 1.0,     # X方向权重
        'alpha_y': 1.0,     # Y方向权重
        'alpha_z': 1.0,     # Z方向权重
        'reference_model': starting_model
    }
    
    # 设置最小二乘反演
    inversion = inversion_engine.setup_least_squares_inversion(
        simulation, observed_data, uncertainties, 
        starting_model, regularization_config
    )
    
    # 第8步：运行反演
    print("\n第8步：运行反演")
    print("-" * 30)
    
    # 定义进度回调函数
    def progress_callback(iteration, objective, model, gradient):
        if iteration % 5 == 0:  # 每5次迭代打印一次
            print(f"  迭代 {iteration}: 目标函数 = {objective:.3e}")
    
    # 运行反演计算
    results = inversion_engine.run_inversion(
        'least_squares', 
        callback=progress_callback,
        save_iterations=True
    )
    
    # 第9步：分析结果
    print("\n第9步：分析结果")
    print("-" * 30)
    
    # 收敛性分析
    convergence_analysis = inversion_engine.analyze_convergence(results)
    print(f"收敛性分析:")
    print(f"  迭代次数: {convergence_analysis['total_iterations']}")
    print(f"  目标函数减少: {convergence_analysis['objective_reduction']*100:.1f}%")
    print(f"  是否收敛: {'是' if convergence_analysis['converged'] else '否'}")
    
    # 模型对比
    recovered_model = results['recovered_model']
    model_correlation = np.corrcoef(true_model, recovered_model)[0, 1]
    
    print(f"\n模型对比:")
    print(f"  真实模型范围: {np.min(true_model):.1f} ~ {np.max(true_model):.1f} kg/m³")
    print(f"  反演模型范围: {np.min(recovered_model):.1f} ~ {np.max(recovered_model):.1f} kg/m³")
    print(f"  模型相关系数: {model_correlation:.3f}")
    
    # 第10步：可视化结果
    print("\n第10步：可视化结果")
    print("-" * 30)
    
    # 绘制观测数据
    gravity_module.plot_gravity_data(
        receiver_locations, observed_data, 
        title="观测重力数据"
    )
    
    # 绘制反演结果
    inversion_engine.plot_inversion_results(results, 'gravity')
    
    # 绘制模型对比
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))
    
    # 真实模型
    gravity_module.plot_density_model(
        true_model, slice_type='horizontal', 
        title="真实密度模型"
    )
    
    # 反演模型  
    gravity_module.plot_density_model(
        recovered_model, slice_type='horizontal',
        title="反演密度模型"
    )
    
    # 第11步：保存结果
    print("\n第11步：保存结果")
    print("-" * 30)
    
    # 保存反演结果
    results_file = current_dir / "gravity_inversion_results.h5"
    inversion_engine.save_inversion_results(results, str(results_file))
    
    # 保存重力方法结果
    gravity_file = current_dir / "gravity_method_results.h5"
    gravity_module.export_results(
        str(gravity_file), 
        recovered_model,
        results['predicted_data'],
        observed_data
    )
    
    print("\n" + "=" * 60)
    print("完整工作流程执行成功！")
    print("=" * 60)
    
    return {
        'mesh': mesh,
        'survey': survey,
        'true_model': true_model,
        'observed_data': observed_data,
        'results': results,
        'gravity_module': gravity_module,
        'inversion_engine': inversion_engine
    }

def demonstrate_advanced_features():
    """演示高级功能"""
    
    print("\n" + "=" * 60)
    print("SimPEG 高级功能演示")
    print("=" * 60)
    
    # 演示不同网格类型
    print("\n1. 不同网格类型对比")
    print("-" * 30)
    
    mesh_builder = MeshBuilder()
    
    # 张量网格
    dx = np.ones(40) * 25
    dy = np.ones(30) * 25  
    dz = np.ones(20) * 20
    tensor_mesh = mesh_builder.create_tensor_mesh([dx, dy, dz])
    
    # 树形网格（自适应加密）
    refinement_points = np.array([
        [0, 0, -50],    # 中心点
        [100, 100, -100],  # 异常体位置
        [-100, -100, -80]
    ])
    tree_mesh = mesh_builder.create_tree_mesh(
        tensor_mesh, refinement_points, refinement_levels=2
    )
    
    print(f"张量网格: {tensor_mesh.n_cells} 个单元")
    print(f"树形网格: {tree_mesh.n_cells} 个单元")
    
    # 演示不同反演策略
    print("\n2. 不同反演策略对比")
    print("-" * 30)
    
    # 这里可以添加不同反演策略的对比
    print("支持的反演策略:")
    print("  - 最小二乘反演")
    print("  - 稳健反演 (L1范数)")
    print("  - 联合反演")
    print("  - 协作反演")
    
    # 演示优化功能
    print("\n3. 观测系统优化")
    print("-" * 30)
    
    survey_designer = SurveyDesigner()
    
    # 创建初始观测系统
    bounds = {'x': [-200, 200], 'y': [-200, 200]}
    initial_survey = survey_designer.design_regular_gravity_grid(
        bounds, spacing=100
    )
    
    # 优化观测系统
    optimized_survey = survey_designer.optimize_survey_geometry(
        'gravity', target_resolution=50.0, budget_constraint=200
    )
    
    print("观测系统优化完成")

def create_comprehensive_example():
    """创建综合示例"""
    
    print("\n" + "=" * 60)
    print("开始 SimPEG 综合示例")
    print("=" * 60)
    
    try:
        # 运行完整工作流程
        workflow_results = complete_gravity_workflow()
        
        # 演示高级功能
        demonstrate_advanced_features()
        
        print("\n" + "=" * 60)
        print("所有示例执行成功！")
        print("=" * 60)
        
        return workflow_results
        
    except Exception as e:
        print(f"\n执行过程中出现错误: {str(e)}")
        print("请检查依赖包是否正确安装")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    # 运行综合示例
    results = create_comprehensive_example()
    
    if results:
        print("\n示例数据已准备就绪，可以在 GUI 中进一步探索！")
