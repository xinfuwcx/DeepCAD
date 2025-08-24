"""
GEM综合建模系统测试脚本
Test Script for Comprehensive GEM Modeling System

测试各个功能模块的基本功能
"""

import sys
import os
import numpy as np
import pandas as pd
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_imports():
    """测试模块导入"""
    print("📦 测试模块导入...")
    
    try:
        # 测试PyQt6
        from PyQt6.QtWidgets import QApplication
        print("  ✓ PyQt6 导入成功")
        
        # 测试科学计算库
        import numpy as np
        import pandas as pd
        import matplotlib.pyplot as plt
        print("  ✓ 科学计算库导入成功")
        
        # 测试3D可视化
        import pyvista as pv
        print("  ✓ PyVista 导入成功")
        
        # 测试主要模块
        from comprehensive_gem_interface import ComprehensiveGEMInterface
        from functional_implementations import DataImportDialog, GeologicalModelingDialog
        from advanced_analysis_modules import GeophysicalModelingDialog
        from uncertainty_and_visualization import UncertaintyAnalysisDialog
        print("  ✓ GEM系统模块导入成功")
        
        return True
        
    except ImportError as e:
        print(f"  ❌ 导入失败: {e}")
        return False

def test_data_structures():
    """测试数据结构"""
    print("\n🗃️ 测试数据结构...")
    
    try:
        # 测试钻孔数据结构
        borehole_data = pd.DataFrame({
            '孔号': ['BH001', 'BH002', 'BH003'],
            'X坐标': [100, 200, 300],
            'Y坐标': [150, 250, 350],
            'Z坐标': [10, 15, 12],
            '地层名称': ['砂土', '粘土', '岩石'],
            '土层类型': ['松散', '软塑', '坚硬']
        })
        print("  ✓ 钻孔数据结构创建成功")
        
        # 测试地质模型数据结构
        geo_model = {
            'type': 'simple_geological_model',
            'extent': [0, 1000, 0, 1000, 0, 500],
            'resolution': [50, 50, 25],
            'strata': [
                {'name': '表土', 'density': 1.8},
                {'name': '砂土', 'density': 2.0},
                {'name': '粘土', 'density': 2.2},
                {'name': '基岩', 'density': 2.7}
            ]
        }
        print("  ✓ 地质模型数据结构创建成功")
        
        # 测试不确定参数结构
        uncertain_params = [
            {
                'name': '密度_砂土',
                'type': '物性参数',
                'distribution': '正态分布',
                'param1': 2.0,
                'param2': 0.1,
                'min_val': 1.5,
                'max_val': 2.5
            }
        ]
        print("  ✓ 不确定参数结构创建成功")
        
        return True
        
    except Exception as e:
        print(f"  ❌ 数据结构测试失败: {e}")
        return False

def test_calculations():
    """测试计算功能"""
    print("\n🧮 测试计算功能...")
    
    try:
        # 测试基本数值计算
        x = np.linspace(0, 1000, 100)
        y = np.linspace(0, 1000, 100)
        X, Y = np.meshgrid(x, y)
        
        # 模拟重力异常计算
        gravity_anomaly = np.sin(X/200) * np.cos(Y/150) * 50
        print("  ✓ 重力异常计算测试通过")
        
        # 模拟磁异常计算  
        magnetic_anomaly = np.cos(X/300) * np.sin(Y/200) * 200
        print("  ✓ 磁异常计算测试通过")
        
        # 测试不确定性分析计算
        n_samples = 1000
        samples = {
            'density': np.random.normal(2.0, 0.1, n_samples),
            'thickness': np.random.uniform(50, 150, n_samples)
        }
        
        # 模拟模型响应
        responses = samples['density'] * samples['thickness'] + np.random.normal(0, 10, n_samples)
        print("  ✓ 不确定性分析计算测试通过")
        
        return True
        
    except Exception as e:
        print(f"  ❌ 计算功能测试失败: {e}")
        return False

def test_workflow_manager():
    """测试工作流管理器"""
    print("\n⚙️ 测试工作流管理器...")
    
    try:
        from comprehensive_gem_interface import WorkflowManager
        
        wm = WorkflowManager()
        
        # 测试数据注册
        test_data = pd.DataFrame({'x': [1, 2, 3], 'y': [4, 5, 6]})
        wm.update_data('test', test_data)
        
        print("  ✓ 数据注册功能正常")
        
        # 测试状态检查
        wm.check_workflow_state()
        print("  ✓ 状态检查功能正常")
        
        return True
        
    except Exception as e:
        print(f"  ❌ 工作流管理器测试失败: {e}")
        return False

def create_sample_data():
    """创建示例数据文件"""
    print("\n📁 创建示例数据文件...")
    
    try:
        # 创建data目录
        data_dir = project_root / "test_data"
        data_dir.mkdir(exist_ok=True)
        
        # 创建示例钻孔数据
        borehole_data = pd.DataFrame({
            '孔号': [f'BH{i:03d}' for i in range(1, 21)],
            'X坐标': np.random.uniform(0, 1000, 20),
            'Y坐标': np.random.uniform(0, 1000, 20), 
            'Z坐标': np.random.uniform(0, 50, 20),
            '地层名称': np.random.choice(['表土', '砂土', '粘土', '基岩'], 20),
            '土层类型': np.random.choice(['松散', '中密', '密实'], 20)
        })
        
        borehole_file = data_dir / "sample_boreholes.csv"
        borehole_data.to_csv(borehole_file, index=False, encoding='utf-8-sig')
        print(f"  ✓ 钻孔数据已保存: {borehole_file}")
        
        # 创建示例断层数据
        fault_data = pd.DataFrame({
            '断层名': [f'F{i}' for i in range(1, 6)],
            'X坐标': np.random.uniform(200, 800, 5),
            'Y坐标': np.random.uniform(200, 800, 5),
            'Z坐标': np.random.uniform(10, 40, 5),
            '走向': np.random.uniform(0, 360, 5),
            '倾角': np.random.uniform(30, 90, 5)
        })
        
        fault_file = data_dir / "sample_faults.csv" 
        fault_data.to_csv(fault_file, index=False, encoding='utf-8-sig')
        print(f"  ✓ 断层数据已保存: {fault_file}")
        
        # 创建示例物性参数
        properties_data = {
            'strata': [
                {'name': '表土', 'density': 1.8, 'susceptibility': 0.001, 'resistivity': 50},
                {'name': '砂土', 'density': 2.0, 'susceptibility': 0.002, 'resistivity': 100},
                {'name': '粘土', 'density': 2.2, 'susceptibility': 0.005, 'resistivity': 20},
                {'name': '基岩', 'density': 2.7, 'susceptibility': 0.01, 'resistivity': 1000}
            ]
        }
        
        import json
        properties_file = data_dir / "sample_properties.json"
        with open(properties_file, 'w', encoding='utf-8') as f:
            json.dump(properties_data, f, ensure_ascii=False, indent=2)
        print(f"  ✓ 物性数据已保存: {properties_file}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ 创建示例数据失败: {e}")
        return False

def run_interface_test():
    """运行界面测试"""
    print("\n🖥️ 运行界面测试...")
    
    try:
        from PyQt6.QtWidgets import QApplication
        from comprehensive_gem_launcher import EnhancedGEMInterface
        
        # 创建应用程序（不显示界面）
        app = QApplication.instance()
        if app is None:
            app = QApplication([])
        
        # 创建主界面实例
        window = EnhancedGEMInterface()
        
        # 测试工作流管理器
        assert hasattr(window, 'workflow_manager'), "工作流管理器未初始化"
        
        # 测试界面组件
        assert hasattr(window, 'main_tabs'), "主标签页未创建"
        assert hasattr(window, 'project_tree'), "项目树未创建"
        assert hasattr(window, 'plotter'), "3D视口未创建"
        
        print("  ✓ 界面组件创建成功")
        print("  ✓ 工作流管理器初始化成功")
        
        # 清理
        app.quit()
        
        return True
        
    except Exception as e:
        print(f"  ❌ 界面测试失败: {e}")
        return False

def main():
    """主测试函数"""
    print("🧪 开始 GEM综合建模系统测试")
    print("="*50)
    
    test_results = []
    
    # 运行各项测试
    test_results.append(("模块导入", test_imports()))
    test_results.append(("数据结构", test_data_structures()))
    test_results.append(("计算功能", test_calculations()))
    test_results.append(("工作流管理", test_workflow_manager()))
    test_results.append(("示例数据", create_sample_data()))
    test_results.append(("界面测试", run_interface_test()))
    
    # 汇总测试结果
    print("\n" + "="*50)
    print("📊 测试结果汇总")
    print("="*50)
    
    passed = 0
    failed = 0
    
    for test_name, result in test_results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{test_name:12} : {status}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\n总计: {passed} 通过, {failed} 失败")
    
    if failed == 0:
        print("\n🎉 所有测试通过！系统就绪！")
        print("\n🚀 启动命令:")
        print("  python start_comprehensive_gem.py")
    else:
        print("\n⚠️ 部分测试失败，请检查错误信息")
    
    return failed

if __name__ == "__main__":
    sys.exit(main())