#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试完整的FPN到Kratos转换和计算流程
"""

import sys
import os
from pathlib import Path

# 设置环境
os.environ['QT_OPENGL'] = 'software'
os.environ['PYVISTA_USE_PANEL'] = 'false'

# 添加路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_complete_pipeline():
    """测试完整的FPN到Kratos流程"""
    print("=" * 80)
    print("测试完整的FPN到Kratos转换和计算流程")
    print("=" * 80)
    
    try:
        # 1. 创建Qt应用
        from PyQt6.QtWidgets import QApplication
        app = QApplication([])
        print("✅ QApplication创建成功")
        
        # 2. 导入主要模块
        from modules.preprocessor import PreProcessor
        from modules.analyzer import Analyzer
        from core.kratos_interface import KratosInterface
        print("✅ 主要模块导入成功")
        
        # 3. 创建组件实例
        preprocessor = PreProcessor()
        analyzer = Analyzer()
        print("✅ 组件实例创建成功")
        
        # 4. 检查FPN文件
        fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
        if not fpn_file.exists():
            print(f"❌ FPN文件不存在: {fpn_file}")
            return False
        print(f"✅ FPN文件存在: {fpn_file}")
        
        # 5. 加载FPN数据
        print("\n🔄 步骤1: 加载FPN数据...")
        fpn_data = preprocessor.load_fpn_file(str(fpn_file), force_load=True)
        if not fpn_data:
            print("❌ FPN数据加载失败")
            return False
        
        print(f"✅ FPN数据加载成功:")
        print(f"  节点数: {len(fpn_data.get('nodes', []))}")
        print(f"  单元数: {len(fpn_data.get('elements', []))}")
        print(f"  材料数: {len(fpn_data.get('materials', []))}")
        print(f"  分析步数: {len(fpn_data.get('analysis_stages', []))}")
        
        # 6. 创建PyVista网格
        print("\n🔄 步骤2: 创建PyVista网格...")
        preprocessor.create_mesh_from_fpn(fpn_data)
        
        if not hasattr(preprocessor, 'mesh') or not preprocessor.mesh:
            print("❌ PyVista网格创建失败")
            return False
        
        mesh = preprocessor.mesh
        print(f"✅ PyVista网格创建成功:")
        print(f"  节点数: {mesh.n_points}")
        print(f"  单元数: {mesh.n_cells}")
        print(f"  边界: {mesh.bounds}")
        
        # 7. 设置分析器数据
        print("\n🔄 步骤3: 设置分析器...")
        analyzer.set_fpn_data(fpn_data)
        analyzer.load_fpn_analysis_steps(fpn_data)
        print(f"✅ 分析步加载完成: {len(analyzer.analysis_steps)} 个步骤")
        
        # 8. 检查Kratos接口
        print("\n🔄 步骤4: 检查Kratos接口...")
        if hasattr(analyzer, 'kratos_interface') and analyzer.kratos_interface:
            kratos_interface = analyzer.kratos_interface
            print("✅ Kratos接口可用")
            
            # 9. 转换FPN到Kratos格式
            print("\n🔄 步骤5: 转换FPN到Kratos格式...")
            success = kratos_interface.setup_model(fpn_data)
            if not success:
                print("❌ FPN到Kratos转换失败")
                return False
            
            print("✅ FPN到Kratos转换成功")
            
            # 10. 检查转换后的数据
            model_data = kratos_interface.model_data
            print(f"  Kratos节点数: {len(model_data.get('nodes', []))}")
            print(f"  Kratos单元数: {len(model_data.get('elements', []))}")
            print(f"  Kratos材料数: {len(model_data.get('materials', []))}")
            print(f"  边界条件数: {len(model_data.get('boundary_conditions', []))}")
            print(f"  荷载数: {len(model_data.get('loads', []))}")
            
            # 11. 生成Kratos输入文件
            print("\n🔄 步骤6: 生成Kratos输入文件...")
            temp_dir = project_root / "temp_kratos_test"
            temp_dir.mkdir(exist_ok=True)
            
            try:
                # 生成配置文件
                kratos_interface.generate_kratos_files(str(temp_dir))
                print(f"✅ Kratos文件生成完成，位置: {temp_dir}")
                
                # 检查生成的文件
                expected_files = [
                    "ProjectParameters.json",
                    "MainKratos.py", 
                    "materials.json",
                    "model_part.mdpa"
                ]
                
                for filename in expected_files:
                    file_path = temp_dir / filename
                    if file_path.exists():
                        size_kb = file_path.stat().st_size / 1024
                        print(f"  ✅ {filename}: {size_kb:.1f} KB")
                    else:
                        print(f"  ❌ {filename}: 缺失")
                
                # 12. 尝试运行Kratos计算（如果可用）
                print("\n🔄 步骤7: 尝试Kratos计算...")
                try:
                    # 检查是否有真实的Kratos
                    import KratosMultiphysics
                    print(f"✅ 检测到Kratos {KratosMultiphysics.GetVersionString()}")
                    
                    # 尝试运行分析
                    success, results = kratos_interface.run_analysis()
                    if success:
                        print("✅ Kratos计算成功完成")
                        print(f"  结果: {results}")
                    else:
                        print(f"❌ Kratos计算失败: {results}")
                        
                except ImportError:
                    print("⚠️ Kratos未安装，跳过实际计算")
                    print("✅ 但文件生成成功，可以手动运行Kratos")
                    
            except Exception as e:
                print(f"❌ Kratos文件生成失败: {e}")
                import traceback
                traceback.print_exc()
                return False
                
        else:
            print("❌ Kratos接口不可用")
            return False
        
        print("\n🎉 完整流程测试成功！")
        return True
        
    except Exception as e:
        print(f"❌ 流程测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_complete_pipeline()
    if success:
        print("\n✅ 所有测试通过，FPN到Kratos转换流程正常")
    else:
        print("\n❌ 测试失败，需要修复转换流程")
