#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FEM完整运行脚本 - 一键启动FEM计算和可视化
Complete FEM Runner - One-click FEM calculation and visualization

功能：
1. 检查环境状态
2. 运行FEniCSx计算
3. 生成高质量可视化
4. 创建动画
5. 生成完整报告
"""

import sys
import time
from pathlib import Path
import json

# 添加模块路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def check_environment():
    """检查运行环境"""
    print("🔍 检查运行环境...")
    
    status = {
        'python': True,
        'wsl': False,
        'fenicsx': False,
        'pyvista': False
    }
    
    # 检查Python基础模块
    try:
        import numpy
        import matplotlib
        print("✅ Python基础模块可用")
    except ImportError as e:
        print(f"❌ Python基础模块缺失: {e}")
        status['python'] = False
    
    # 检查WSL
    try:
        import subprocess
        result = subprocess.run(["wsl", "--version"], capture_output=True, timeout=10)
        if result.returncode == 0:
            print("✅ WSL可用")
            status['wsl'] = True
        else:
            print("❌ WSL不可用")
    except:
        print("❌ WSL检查失败")
    
    # 检查FEniCSx
    if status['wsl']:
        try:
            result = subprocess.run([
                "wsl", "-e", "bash", "-c",
                "source ~/activate_fenicsx.sh 2>/dev/null && python3 -c 'import dolfinx; print(dolfinx.__version__)'"
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0 and result.stdout.strip():
                print(f"✅ FEniCSx可用，版本: {result.stdout.strip()}")
                status['fenicsx'] = True
            else:
                print("❌ FEniCSx不可用")
        except:
            print("❌ FEniCSx检查失败")
    
    # 检查PyVista
    try:
        import pyvista as pv
        print("✅ PyVista可用，支持高级可视化")
        status['pyvista'] = True
    except ImportError:
        print("⚠️ PyVista不可用，将使用基础可视化")
    
    return status

def run_fem_calculation(parameters):
    """运行FEM计算"""
    
    if not Path("fem_interface.py").exists():
        raise FileNotFoundError("FEM接口文件不存在")
    
    try:
        from fem_interface import FEMInterface
        
        print("🚀 初始化FEM接口...")
        fem = FEMInterface()
        
        if not fem.fenicsx_available:
            raise RuntimeError("FEniCSx环境不可用，请先运行安装脚本")
        
        print("⚡ 开始FEM计算...")
        start_time = time.time()
        
        results = fem.run_fem_calculation(parameters, "fem_complete_output")
        
        calc_time = time.time() - start_time
        
        print(f"✅ FEM计算完成! 耗时: {calc_time:.1f} 秒")
        print(f"🏆 主要结果:")
        print(f"   冲刷深度: {results['scour_depth']:.3f} m")
        print(f"   最大速度: {results['max_velocity']:.3f} m/s")
        print(f"   最大剪切应力: {results['max_shear_stress']:.2f} Pa")
        print(f"   Shields参数: {results['shields_parameter']:.4f}")
        
        return fem, results
        
    except Exception as e:
        print(f"❌ FEM计算失败: {e}")
        raise

def create_visualizations(fem_interface):
    """创建可视化内容"""
    
    print("🎨 创建可视化内容...")
    
    vtk_file = "fem_complete_output/fem_results.pvd"
    
    if not Path(vtk_file).exists():
        print(f"❌ VTK文件不存在: {vtk_file}")
        return False
    
    try:
        # 生成高质量截图
        print("📸 生成高质量截图...")
        mesh = fem_interface.visualize_vtk_results(
            vtk_file, 
            "fem_visualization_complete.png"
        )
        
        if mesh is None:
            print("⚠️ 截图生成失败，但继续其他步骤")
        else:
            print("✅ 高质量截图已保存: fem_visualization_complete.png")
        
        # 创建旋转动画
        print("🎬 创建流场动画...")
        animation_path = fem_interface.create_animation(
            vtk_file,
            "fem_flow_animation.gif",
            n_frames=24  # 较少帧数，快速生成
        )
        
        if animation_path:
            print(f"✅ 动画已保存: {animation_path}")
        else:
            print("⚠️ 动画创建失败")
        
        return True
        
    except Exception as e:
        print(f"❌ 可视化创建失败: {e}")
        return False

def generate_report(parameters, results, calc_time):
    """生成完整报告"""
    
    print("📋 生成分析报告...")
    
    try:
        timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
        
        # 创建完整报告
        report = {
            'metadata': {
                'timestamp': timestamp,
                'software': 'FEniCSx 2025 Bridge Scour Analyzer',
                'version': '1.0',
                'calculation_time_seconds': calc_time
            },
            'input_parameters': parameters,
            'results': results,
            'analysis': {
                'pier_reynolds_number': results['max_velocity'] * parameters['pier_diameter'] / 1e-6,
                'froude_number': parameters['flow_velocity'] / (9.81 * 4.0)**0.5,  # 假设水深4m
                'relative_scour_depth': results['scour_depth'] / parameters['pier_diameter'],
                'scour_classification': classify_scour_severity(results['scour_depth'], parameters['pier_diameter'])
            },
            'file_outputs': {
                'vtk_results': 'fem_complete_output/fem_results.pvd',
                'visualization': 'fem_visualization_complete.png',
                'animation': 'fem_flow_animation.gif',
                'json_report': 'fem_complete_report.json'
            }
        }
        
        # 保存JSON报告
        with open('fem_complete_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        # 生成简洁的文本报告
        text_report = f"""
FEniCSx 2025 桥墩冲刷分析报告
{'='*50}
分析时间: {timestamp}
计算耗时: {calc_time:.1f} 秒

输入参数:
  桥墩直径: {parameters['pier_diameter']:.1f} m
  流速: {parameters['flow_velocity']:.1f} m/s
  网格分辨率: {parameters['mesh_resolution']:.2f} m
  沉积物粒径: {parameters['d50']*1000:.2f} mm

计算结果:
  冲刷深度: {results['scour_depth']:.3f} m
  最大流速: {results['max_velocity']:.3f} m/s
  最大剪切应力: {results['max_shear_stress']:.2f} Pa
  Shields参数: {results['shields_parameter']:.4f}
  临界Shields: {results['critical_shields']:.4f}

工程分析:
  相对冲刷深度: {report['analysis']['relative_scour_depth']:.2f}
  雷诺数: {report['analysis']['pier_reynolds_number']:.0f}
  弗劳德数: {report['analysis']['froude_number']:.3f}
  冲刷严重程度: {report['analysis']['scour_classification']}

输出文件:
  ✅ VTK结果: {report['file_outputs']['vtk_results']}
  ✅ 可视化图: {report['file_outputs']['visualization']}
  ✅ 流场动画: {report['file_outputs']['animation']}
  ✅ 完整报告: {report['file_outputs']['json_report']}

{'='*50}
"""
        
        with open('fem_complete_report.txt', 'w', encoding='utf-8') as f:
            f.write(text_report)
        
        print("✅ 报告生成完成:")
        print("   📄 JSON报告: fem_complete_report.json")
        print("   📝 文本报告: fem_complete_report.txt")
        
        # 打印关键结果
        print("\n🎯 关键结果总结:")
        print(text_report)
        
        return report
        
    except Exception as e:
        print(f"❌ 报告生成失败: {e}")
        return None

def classify_scour_severity(scour_depth, pier_diameter):
    """分类冲刷严重程度"""
    relative_depth = scour_depth / pier_diameter
    
    if relative_depth < 0.5:
        return "轻微"
    elif relative_depth < 1.0:
        return "中等"
    elif relative_depth < 1.5:
        return "严重"
    else:
        return "极严重"

def main():
    """主函数"""
    
    print("🌊 FEniCS 2025 桥墩冲刷完整分析系统")
    print("="*60)
    
    total_start = time.time()
    
    # 1. 环境检查
    print("\n🔧 步骤1: 环境检查")
    status = check_environment()
    
    if not status['wsl']:
        print("❌ WSL不可用，无法运行FEniCS计算")
        return False
    
    if not status['fenicsx']:
        print("❌ FEniCSx不可用，请运行安装脚本:")
        print("   wsl bash setup_fenicsx.sh")
        return False
    
    # 2. 设置计算参数
    print("\n⚙️ 步骤2: 设置计算参数")
    
    # 可以从命令行参数或配置文件读取
    parameters = {
        "pier_diameter": 2.0,        # 桥墩直径 (m)
        "flow_velocity": 1.2,        # 流速 (m/s) 
        "mesh_resolution": 0.2,      # 网格分辨率 (m) - 适中精度
        "d50": 0.6e-3,              # 沉积物粒径 (m)
        "viscosity": 1e-3,          # 动力粘度 (Pa·s)
        "density": 1000.0           # 水密度 (kg/m³)
    }
    
    print(f"📋 计算参数:")
    for key, value in parameters.items():
        print(f"   {key}: {value}")
    
    # 3. FEM计算
    print("\n🧮 步骤3: FEM计算")
    
    try:
        fem_interface, results = run_fem_calculation(parameters)
        calc_time = time.time() - total_start
        
    except Exception as e:
        print(f"❌ FEM计算阶段失败: {e}")
        return False
    
    # 4. 可视化
    print("\n🎨 步骤4: 生成可视化")
    
    viz_success = create_visualizations(fem_interface)
    
    # 5. 报告生成
    print("\n📊 步骤5: 生成报告")
    
    report = generate_report(parameters, results, calc_time)
    
    # 6. 总结
    total_time = time.time() - total_start
    
    print("\n" + "="*60)
    print("🎉 FEniCS 2025 桥墩冲刷分析完成!")
    print("="*60)
    print(f"⏱️ 总耗时: {total_time:.1f} 秒")
    print(f"🏆 冲刷深度: {results['scour_depth']:.3f} m")
    print(f"📊 相对深度: {results['scour_depth']/parameters['pier_diameter']:.2f}")
    print(f"🎯 分析等级: {classify_scour_severity(results['scour_depth'], parameters['pier_diameter'])}")
    
    print(f"\n📁 输出文件位置: {Path.cwd()}")
    print("   🔸 VTK结果: fem_complete_output/fem_results.pvd (用ParaView打开)")
    print("   🔸 可视化: fem_visualization_complete.png")
    print("   🔸 动画: fem_flow_animation.gif") 
    print("   🔸 报告: fem_complete_report.txt")
    
    print(f"\n💡 建议:")
    if results['scour_depth'] > parameters['pier_diameter']:
        print("   ⚠️ 冲刷深度较大，建议采取防护措施")
    else:
        print("   ✅ 冲刷深度在可接受范围内")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        if success:
            print("\n🎊 所有任务完成! FEM分析系统正常工作!")
            sys.exit(0)
        else:
            print("\n❌ 分析过程中出现问题")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n⚠️ 用户中断程序")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 程序异常: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)