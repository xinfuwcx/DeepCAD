#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
运行完整的Kratos有限元分析：两阶段-全锚杆-摩尔库伦.fpn
"""

import sys
import os
import time
import json
from pathlib import Path

# 设置环境
os.environ['QT_OPENGL'] = 'software'
os.environ['OMP_NUM_THREADS'] = '8'  # 设置OpenMP线程数

# 添加路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

# 强制输出到文件
log_file = project_root / "kratos_analysis.log"

def log_print(*args, **kwargs):
    """同时输出到控制台和文件"""
    message = " ".join(str(arg) for arg in args)
    print(message, **kwargs)
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(f"[{time.strftime('%H:%M:%S')}] {message}\n")

def run_kratos_analysis():
    """运行完整的Kratos分析"""
    
    # 清空日志文件
    with open(log_file, 'w', encoding='utf-8') as f:
        f.write("=== Kratos有限元分析开始 ===\n")
    
    log_print("🚀 开始Kratos有限元分析：两阶段-全锚杆-摩尔库伦")
    log_print("=" * 80)
    
    try:
        # 1. 创建QApplication
        log_print("1. 初始化环境...")
        from PyQt6.QtWidgets import QApplication
        app = QApplication([])
        
        # 2. 加载FPN数据
        log_print("2. 加载FPN数据...")
        from optimized_fpn_parser import OptimizedFPNParser
        parser = OptimizedFPNParser()
        
        fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
        if not fpn_file.exists():
            log_print(f"❌ FPN文件不存在: {fpn_file}")
            return False
            
        fpn_data = parser.parse_file_streaming(str(fpn_file))
        if not fpn_data:
            log_print("❌ FPN数据加载失败")
            return False
            
        log_print(f"✅ FPN数据加载成功:")
        log_print(f"  节点数: {len(fpn_data.get('nodes', []))}")
        log_print(f"  体单元数: {len(fpn_data.get('elements', []))}")
        log_print(f"  板单元数: {len(fpn_data.get('plate_elements', []))}")
        log_print(f"  线单元数: {len(fpn_data.get('line_elements', []))}")
        
        # 3. 创建Kratos接口
        log_print("3. 初始化Kratos接口...")
        from kratos_interface import KratosInterface
        kratos_interface = KratosInterface()
        
        # 4. 转换FPN到Kratos格式
        log_print("4. 转换FPN到Kratos格式...")
        success = kratos_interface.setup_model(fpn_data)
        if not success:
            log_print("❌ FPN到Kratos转换失败")
            return False
            
        model_data = kratos_interface.model_data
        log_print(f"✅ 转换成功:")
        log_print(f"  Kratos节点数: {len(model_data.get('nodes', []))}")
        log_print(f"  Kratos单元数: {len(model_data.get('elements', []))}")
        log_print(f"  材料数: {len(model_data.get('materials', []))}")
        log_print(f"  边界条件数: {len(model_data.get('boundary_conditions', []))}")
        
        # 5. 创建分析目录
        analysis_dir = project_root / "kratos_analysis_run"
        analysis_dir.mkdir(exist_ok=True)
        log_print(f"5. 创建分析目录: {analysis_dir}")
        
        # 6. 生成Kratos输入文件
        log_print("6. 生成Kratos输入文件...")
        
        # MDPA文件
        mdpa_file = analysis_dir / "model.mdpa"
        kratos_interface._write_mdpa_file(mdpa_file)
        log_print(f"  ✅ MDPA文件: {mdpa_file.stat().st_size / 1024 / 1024:.1f} MB")
        
        # 材料文件
        materials_file = analysis_dir / "materials.json"
        kratos_interface._write_materials_file(materials_file)
        log_print(f"  ✅ 材料文件: {materials_file.stat().st_size / 1024:.1f} KB")
        
        # 项目参数文件
        params_file = analysis_dir / "ProjectParameters.json"
        kratos_interface._write_project_parameters(params_file, "model", "materials.json")
        log_print(f"  ✅ 参数文件: {params_file.stat().st_size / 1024:.1f} KB")
        
        # 7. 创建主执行脚本
        log_print("7. 创建Kratos主执行脚本...")
        main_script = analysis_dir / "MainKratos.py"
        
        main_script_content = '''#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Kratos主执行脚本 - 两阶段全锚杆摩尔库伦分析
"""

import KratosMultiphysics
import KratosMultiphysics.StructuralMechanicsApplication as StructuralMechanicsApplication
import json
import time

def CreateSolver(model, project_parameters):
    """创建求解器"""
    solver_type = project_parameters["solver_settings"]["solver_type"].GetString()
    
    if solver_type == "Static":
        import KratosMultiphysics.StructuralMechanicsApplication.structural_mechanics_static_solver as solver_module
    else:
        raise Exception(f"Unknown solver type: {solver_type}")
    
    return solver_module.CreateSolver(model, project_parameters["solver_settings"])

def main():
    """主函数"""
    print("🚀 开始Kratos结构力学分析")
    print("=" * 60)
    
    start_time = time.time()
    
    try:
        # 读取项目参数
        with open("ProjectParameters.json", 'r') as f:
            project_parameters = KratosMultiphysics.Parameters(f.read())
        
        # 创建模型
        model = KratosMultiphysics.Model()
        
        # 创建求解器
        solver = CreateSolver(model, project_parameters)
        
        # 初始化求解器
        print("📋 初始化求解器...")
        solver.AddVariables()
        solver.AddDofs()
        solver.ImportModelPart()
        solver.PrepareModelPart()
        solver.AddMaterials()
        solver.Initialize()
        
        # 获取模型部件
        main_model_part = model["Structure"]
        print(f"✅ 模型加载完成:")
        print(f"  节点数: {main_model_part.NumberOfNodes()}")
        print(f"  单元数: {main_model_part.NumberOfElements()}")
        print(f"  条件数: {main_model_part.NumberOfConditions()}")
        
        # 执行分析
        print("🔄 开始求解...")
        solver.Solve()
        
        # 输出结果
        print("📊 分析完成，输出结果...")
        
        # 计算最大位移
        max_displacement = 0.0
        max_disp_node = 0
        
        for node in main_model_part.Nodes:
            disp = node.GetSolutionStepValue(KratosMultiphysics.DISPLACEMENT)
            disp_magnitude = (disp[0]**2 + disp[1]**2 + disp[2]**2)**0.5
            if disp_magnitude > max_displacement:
                max_displacement = disp_magnitude
                max_disp_node = node.Id
        
        print(f"✅ 求解成功:")
        print(f"  最大位移: {max_displacement:.6f} m (节点 {max_disp_node})")
        print(f"  计算时间: {time.time() - start_time:.2f} 秒")
        
        # 保存结果摘要
        results = {
            "analysis_type": "Static Structural",
            "nodes": main_model_part.NumberOfNodes(),
            "elements": main_model_part.NumberOfElements(),
            "max_displacement": max_displacement,
            "max_displacement_node": max_disp_node,
            "computation_time": time.time() - start_time,
            "status": "SUCCESS"
        }
        
        with open("analysis_results.json", 'w') as f:
            json.dump(results, f, indent=2)
        
        print("💾 结果已保存到 analysis_results.json")
        
    except Exception as e:
        print(f"❌ 分析失败: {e}")
        import traceback
        traceback.print_exc()
        
        # 保存错误信息
        error_results = {
            "status": "FAILED",
            "error": str(e),
            "computation_time": time.time() - start_time
        }
        
        with open("analysis_results.json", 'w') as f:
            json.dump(error_results, f, indent=2)
        
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    if success:
        print("🎉 Kratos分析成功完成！")
    else:
        print("💥 Kratos分析失败！")
'''
        
        with open(main_script, 'w', encoding='utf-8') as f:
            f.write(main_script_content)
        
        log_print(f"  ✅ 主脚本: {main_script}")
        
        # 8. 检查Kratos可用性
        log_print("8. 检查Kratos可用性...")
        try:
            import KratosMultiphysics
            # 尝试获取版本信息
            try:
                kratos_version = KratosMultiphysics.GetVersionString()
            except AttributeError:
                # 如果GetVersionString不存在，尝试其他方法
                try:
                    kratos_version = f"{KratosMultiphysics.KRATOS_VERSION}"
                except:
                    kratos_version = "unknown"
            log_print(f"✅ Kratos版本: {kratos_version}")
            
            # 9. 运行Kratos分析
            log_print("9. 🚀 开始运行Kratos分析...")
            log_print("   这可能需要几分钟时间，请耐心等待...")
            
            # 切换到分析目录
            original_cwd = os.getcwd()
            os.chdir(analysis_dir)
            
            try:
                # 执行分析
                with open('MainKratos.py', 'r', encoding='utf-8') as f:
                    exec(f.read())
                
                # 检查结果
                results_file = analysis_dir / "analysis_results.json"
                if results_file.exists():
                    with open(results_file, 'r') as f:
                        results = json.load(f)
                    
                    if results.get('status') == 'SUCCESS':
                        log_print("🎉 Kratos分析成功完成！")
                        log_print(f"  最大位移: {results.get('max_displacement', 0):.6f} m")
                        log_print(f"  计算时间: {results.get('computation_time', 0):.2f} 秒")
                        log_print(f"  节点数: {results.get('nodes', 0)}")
                        log_print(f"  单元数: {results.get('elements', 0)}")
                        return True
                    else:
                        log_print(f"❌ Kratos分析失败: {results.get('error', 'Unknown error')}")
                        return False
                else:
                    log_print("❌ 未找到分析结果文件")
                    return False
                    
            finally:
                os.chdir(original_cwd)
                
        except ImportError:
            log_print("⚠️ Kratos未安装，无法运行实际分析")
            log_print("✅ 但所有输入文件已成功生成，可以手动运行Kratos")
            return True
            
    except Exception as e:
        log_print(f"❌ 分析过程失败: {e}")
        import traceback
        with open(log_file, 'a', encoding='utf-8') as f:
            traceback.print_exc(file=f)
        return False

if __name__ == "__main__":
    success = run_kratos_analysis()
    
    if success:
        print(f"\n✅ 分析完成！详细日志: {log_file}")
        print(f"📁 分析文件位置: {project_root / 'kratos_analysis_run'}")
    else:
        print(f"\n❌ 分析失败！详细日志: {log_file}")
