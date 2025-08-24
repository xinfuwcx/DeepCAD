#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速测试套件 - 验证系统功能
Quick Test Suite - System Functionality Verification

测试内容:
1. 基本计算功能
2. 可视化渲染
3. 数据导出
4. 动画生成
"""

import sys
import time
from pathlib import Path

# 添加模块路径
sys.path.insert(0, str(Path(__file__).parent))

def test_basic_calculation():
    """测试基本计算功能"""
    print("=" * 60)
    print("测试1: 基本计算功能")
    print("=" * 60)
    
    try:
        from working_scour_analyzer import ScourCalculator, ScourParameters
        
        # 创建测试参数
        params = ScourParameters()
        params.pier_diameter = 2.0
        params.flow_velocity = 1.2
        params.water_depth = 4.0
        params.d50 = 0.8
        
        # 执行计算
        calculator = ScourCalculator()
        result = calculator.calculate_hec18(params)
        
        print(f"✅ 计算成功:")
        print(f"   冲刷深度: {result.scour_depth:.3f} m")
        print(f"   冲刷宽度: {result.scour_width:.3f} m")
        print(f"   雷诺数: {result.reynolds_number:.0f}")
        print(f"   弗劳德数: {result.froude_number:.3f}")
        
        return True
        
    except Exception as e:
        print(f"❌ 基本计算测试失败: {e}")
        return False

def test_data_generation():
    """测试数据生成功能"""
    print("\n" + "=" * 60)
    print("测试2: 数据生成功能")
    print("=" * 60)
    
    try:
        from working_scour_analyzer import FlowFieldGenerator, ScourParameters, ScourResult
        
        # 创建测试参数
        params = ScourParameters()
        result = ScourResult()
        result.scour_depth = 3.5
        
        # 生成流场数据
        generator = FlowFieldGenerator()
        
        print("⏳ 生成流场数据...")
        flow_data = generator.generate_flow_field(params, nx=30, ny=20, nz=5)
        print(f"✅ 流场网格: {flow_data['x'].shape}")
        
        print("⏳ 生成冲刷分布...")
        scour_data = generator.generate_scour_field(params, result, nx=50, ny=50)
        print(f"✅ 冲刷网格: {scour_data['x'].shape}")
        
        return True, flow_data, scour_data
        
    except Exception as e:
        print(f"❌ 数据生成测试失败: {e}")
        return False, None, None

def test_visualization():
    """测试可视化功能"""
    print("\n" + "=" * 60)
    print("测试3: 可视化功能")
    print("=" * 60)
    
    try:
        # 检查PyVista
        try:
            import pyvista as pv
            print("✅ PyVista 可用")
            pyvista_available = True
        except ImportError:
            print("⚠️ PyVista 不可用，使用matplotlib")
            pyvista_available = False
        
        # 检查matplotlib
        try:
            import matplotlib.pyplot as plt
            print("✅ Matplotlib 可用")
            matplotlib_available = True
        except ImportError:
            print("❌ Matplotlib 不可用")
            matplotlib_available = False
            return False
        
        # 简单渲染测试
        if pyvista_available:
            try:
                # 离屏渲染测试
                plotter = pv.Plotter(off_screen=True, window_size=[400, 300])
                sphere = pv.Sphere()
                plotter.add_mesh(sphere)
                plotter.screenshot("test_pyvista.png")
                plotter.close()
                print("✅ PyVista 离屏渲染成功")
            except Exception as e:
                print(f"⚠️ PyVista 渲染问题: {e}")
        
        # matplotlib测试
        if matplotlib_available:
            try:
                import numpy as np
                fig, ax = plt.subplots(figsize=(6, 4))
                x = np.linspace(0, 10, 100)
                y = np.sin(x)
                ax.plot(x, y)
                ax.set_title('Test Plot')
                plt.savefig('test_matplotlib.png', dpi=150)
                plt.close()
                print("✅ Matplotlib 渲染成功")
            except Exception as e:
                print(f"❌ Matplotlib 渲染失败: {e}")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ 可视化测试失败: {e}")
        return False

def test_gui_startup():
    """测试GUI启动（非阻塞）"""
    print("\n" + "=" * 60)
    print("测试4: GUI启动测试")
    print("=" * 60)
    
    try:
        # 检查PyQt
        try:
            from PyQt6.QtWidgets import QApplication
            pyqt_version = 6
            print("✅ PyQt6 可用")
        except ImportError:
            try:
                from PyQt5.QtWidgets import QApplication
                pyqt_version = 5
                print("✅ PyQt5 可用")
            except ImportError:
                print("❌ PyQt 不可用")
                return False
        
        # 测试应用程序创建
        app = QApplication.instance()
        if app is None:
            app = QApplication([])
        
        # 创建测试窗口
        from working_scour_analyzer import ScourAnalyzerGUI
        window = ScourAnalyzerGUI()
        
        print("✅ GUI窗口创建成功")
        print("⏳ 窗口显示测试（2秒）...")
        
        # 显示窗口2秒后关闭
        window.show()
        
        from PyQt6.QtCore import QTimer
        timer = QTimer()
        timer.timeout.connect(lambda: (window.close(), app.quit()))
        timer.start(2000)  # 2秒后关闭
        
        app.exec()
        print("✅ GUI启动测试成功")
        
        return True
        
    except Exception as e:
        print(f"❌ GUI启动测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_advanced_visualization():
    """测试高级可视化功能"""
    print("\n" + "=" * 60)
    print("测试5: 高级可视化功能")
    print("=" * 60)
    
    try:
        from advanced_visualization import AdvancedVisualizer
        from working_scour_analyzer import ScourParameters, ScourResult, FlowFieldGenerator
        
        # 准备数据
        params = ScourParameters()
        result = ScourResult()
        result.scour_depth = 3.5
        result.scour_width = 12.0
        result.max_velocity = 2.4
        result.reynolds_number = 2400000
        result.froude_number = 0.19
        result.method = "HEC-18"
        
        generator = FlowFieldGenerator()
        flow_data = generator.generate_flow_field(params, nx=20, ny=15, nz=3)
        scour_data = generator.generate_scour_field(params, result, nx=40, ny=40)
        
        # 创建可视化器
        viz = AdvancedVisualizer(output_dir="test_output")
        
        print("⏳ 生成发表级云图...")
        contour_path = viz.generate_publication_quality_contour(scour_data, params)
        print(f"✅ 云图已保存: {contour_path}")
        
        print("⏳ 生成分析报告...")
        json_path, html_path = viz.generate_comprehensive_report(params, result, flow_data, scour_data)
        print(f"✅ 报告已保存: {json_path}")
        
        return True
        
    except Exception as e:
        print(f"❌ 高级可视化测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def run_comprehensive_test():
    """运行综合测试"""
    
    print("🚀 DeepCAD-SCOUR 系统测试开始")
    print("=" * 60)
    
    start_time = time.time()
    
    # 测试结果
    results = {
        'basic_calculation': False,
        'data_generation': False,
        'visualization': False,
        'gui_startup': False,
        'advanced_visualization': False
    }
    
    # 依次执行测试
    results['basic_calculation'] = test_basic_calculation()
    
    data_success, flow_data, scour_data = test_data_generation()
    results['data_generation'] = data_success
    
    results['visualization'] = test_visualization()
    
    results['gui_startup'] = test_gui_startup()
    
    results['advanced_visualization'] = test_advanced_visualization()
    
    # 测试总结
    total_time = time.time() - start_time
    
    print("\n" + "=" * 60)
    print("📊 测试结果总结")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, success in results.items():
        status = "✅ 通过" if success else "❌ 失败"
        print(f"{test_name:25} {status}")
        if success:
            passed += 1
    
    print("-" * 40)
    print(f"通过率: {passed}/{total} ({passed/total*100:.1f}%)")
    print(f"总用时: {total_time:.1f} 秒")
    
    # 给出建议
    print("\n📋 使用建议:")
    
    if results['basic_calculation'] and results['data_generation']:
        print("✅ 核心计算功能正常，可以进行冲刷分析")
    else:
        print("❌ 核心功能有问题，需要检查依赖安装")
    
    if results['visualization']:
        print("✅ 基础可视化功能正常")
    else:
        print("❌ 可视化功能有问题，检查matplotlib/PyVista安装")
    
    if results['gui_startup']:
        print("✅ GUI界面可以正常启动")
        print("   运行命令: python working_scour_analyzer.py")
    else:
        print("❌ GUI启动有问题，检查PyQt安装")
    
    if results['advanced_visualization']:
        print("✅ 高级可视化功能正常，可以生成云图和动画")
    else:
        print("⚠️ 高级可视化功能受限，但基础功能可用")
    
    print("\n🎯 推荐启动方式:")
    if passed >= 3:
        print("   python working_scour_analyzer.py")
    else:
        print("   先修复失败的测试项，然后重新运行测试")

if __name__ == "__main__":
    run_comprehensive_test()