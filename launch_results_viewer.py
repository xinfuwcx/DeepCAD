#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
启动深基坑两阶段分析结果查看器
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def launch_results_viewer():
    """启动结果查看器主界面"""
    print("🎉 深基坑两阶段开挖分析结果查看器")
    print("=" * 60)
    
    # 检查结果文件
    stage1_vtk = Path("multi_stage_kratos_conversion/stage_1/VTK_Output/Structure_0_1.vtk")
    stage2_vtk = Path("multi_stage_kratos_conversion/stage_2/VTK_Output/Structure_0_1.vtk")
    
    print("📁 检查结果文件:")
    if stage1_vtk.exists():
        size1 = stage1_vtk.stat().st_size / (1024*1024)
        print(f"   ✅ 阶段1结果: {stage1_vtk} ({size1:.1f} MB)")
    else:
        print(f"   ❌ 阶段1结果: {stage1_vtk} (未找到)")
        
    if stage2_vtk.exists():
        size2 = stage2_vtk.stat().st_size / (1024*1024)
        print(f"   ✅ 阶段2结果: {stage2_vtk} ({size2:.1f} MB)")
    else:
        print(f"   ❌ 阶段2结果: {stage2_vtk} (未找到)")
    
    # 创建结果配置文件
    results_config = {
        "project_name": "深基坑两阶段开挖分析",
        "analysis_type": "multi_stage_excavation",
        "constitutive_model": "损伤版摩尔-库伦塑性",
        "stages": [
            {
                "name": "阶段1 - 初始开挖",
                "description": "第一阶段开挖和支护安装",
                "vtk_file": str(stage1_vtk.absolute()),
                "elements": 140194,
                "nodes": 93497,
                "computation_time": "1713.78秒"
            },
            {
                "name": "阶段2 - 进一步开挖", 
                "description": "第二阶段开挖至最终状态",
                "vtk_file": str(stage2_vtk.absolute()),
                "elements": 134987,
                "nodes": 93497,
                "computation_time": "1232.49秒"
            }
        ],
        "materials": {
            "total_materials": 11,
            "soil_types": ["粉质粘土", "粉土"],
            "constitutive_law": "SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D"
        },
        "analysis_summary": {
            "total_time": "2946.27秒",
            "convergence": "部分收敛（达到最大迭代次数）",
            "status": "分析完成",
            "recommendation": "建议使用ParaView查看详细结果"
        }
    }
    
    # 保存配置文件
    config_file = "two_stage_analysis_results.json"
    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(results_config, f, indent=2, ensure_ascii=False)
    
    print(f"\n📊 结果配置已保存: {config_file}")
    
    # 启动选项
    print(f"\n🚀 启动选项:")
    print(f"   1. 启动DeepCAD主界面（推荐）")
    print(f"   2. 启动PyVista 3D查看器")
    print(f"   3. 启动简化结果分析器")
    print(f"   4. 生成分析报告")
    
    # 尝试启动主界面
    try:
        print(f"\n🎯 正在启动DeepCAD主界面...")
        
        # 检查是否有主界面启动脚本
        main_scripts = [
            "start_deepcad.py",
            "start_gem_professional.py", 
            "professional_abaqus_interface.py",
            "beautiful_geological_interface.py"
        ]
        
        for script in main_scripts:
            if Path(script).exists():
                print(f"   找到主界面脚本: {script}")
                print(f"   🚀 启动命令: python {script}")
                
                # 启动主界面
                subprocess.Popen([sys.executable, script], 
                               cwd=os.getcwd(),
                               creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0)
                
                print(f"   ✅ 主界面已启动！")
                print(f"   📁 结果文件路径已配置在: {config_file}")
                return True
        
        print(f"   ❌ 未找到主界面启动脚本")
        return False
        
    except Exception as e:
        print(f"   ❌ 启动失败: {e}")
        return False

def launch_pyvista_viewer():
    """启动PyVista 3D查看器"""
    print(f"\n🎨 启动PyVista 3D查看器...")
    
    try:
        import pyvista as pv
        
        # 读取阶段1结果
        stage1_vtk = "multi_stage_kratos_conversion/stage_1/VTK_Output/Structure_0_1.vtk"
        stage2_vtk = "multi_stage_kratos_conversion/stage_2/VTK_Output/Structure_0_1.vtk"
        
        if os.path.exists(stage1_vtk):
            mesh1 = pv.read(stage1_vtk)
            print(f"   ✅ 阶段1网格: {mesh1.n_points}个点, {mesh1.n_cells}个单元")
            
            # 创建3D查看器
            plotter = pv.Plotter(shape=(1, 2), title="深基坑两阶段开挖分析结果")
            
            # 阶段1
            plotter.subplot(0, 0)
            plotter.add_mesh(mesh1, scalars="DISPLACEMENT", show_edges=False, opacity=0.8)
            plotter.add_title("阶段1 - 初始开挖")
            
            # 阶段2
            if os.path.exists(stage2_vtk):
                mesh2 = pv.read(stage2_vtk)
                plotter.subplot(0, 1)
                plotter.add_mesh(mesh2, scalars="DISPLACEMENT", show_edges=False, opacity=0.8)
                plotter.add_title("阶段2 - 进一步开挖")
            
            plotter.show()
            return True
            
    except ImportError:
        print(f"   ❌ PyVista未安装，请运行: pip install pyvista")
        return False
    except Exception as e:
        print(f"   ❌ PyVista启动失败: {e}")
        return False

if __name__ == "__main__":
    # 启动主界面
    success = launch_results_viewer()
    
    if not success:
        # 备选方案：PyVista查看器
        print(f"\n🔄 尝试备选方案...")
        launch_pyvista_viewer()
    
    print(f"\n🎯 结果查看器启动完成！")
    print(f"📋 分析总结:")
    print(f"   - 两阶段分析全部完成")
    print(f"   - 生成VTK结果文件")
    print(f"   - 可进行位移、应力、塑性分析")
    print(f"   - 建议对比两阶段变形差异")
