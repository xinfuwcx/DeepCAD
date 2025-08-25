#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
from pathlib import Path

# 设置环境变量
os.environ['QT_OPENGL'] = 'software'

# 添加路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# 强制输出到文件
log_file = project_root / "mesh_test_output.log"

def log_print(*args, **kwargs):
    """同时输出到控制台和文件"""
    message = " ".join(str(arg) for arg in args)
    print(message, **kwargs)
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(message + '\n')

# 清空日志文件
with open(log_file, 'w', encoding='utf-8') as f:
    f.write("=== 网格创建测试开始 ===\n")

try:
    log_print("1. 创建QApplication...")
    from PyQt6.QtWidgets import QApplication
    app = QApplication([])
    log_print("✅ QApplication创建成功")
    
    log_print("2. 导入PreProcessor...")
    from modules.preprocessor import PreProcessor
    log_print("✅ PreProcessor导入成功")
    
    log_print("3. 创建PreProcessor实例...")
    preprocessor = PreProcessor()
    log_print("✅ PreProcessor实例创建成功")
    
    log_print("4. 检查FPN文件...")
    fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
    log_print(f"FPN文件存在: {fpn_file.exists()}")
    
    if fpn_file.exists():
        log_print("5. 直接调用FPN解析器...")
        try:
            # 直接使用OptimizedFPNParser
            sys.path.append(str(project_root / "core"))
            from optimized_fpn_parser import OptimizedFPNParser
            parser = OptimizedFPNParser()
            fpn_data = parser.parse_file_streaming(str(fpn_file))
            
            if fpn_data:
                log_print("✅ FPN解析成功")
                log_print(f"节点数: {len(fpn_data.get('nodes', []))}")
                log_print(f"单元数: {len(fpn_data.get('elements', []))}")
                log_print(f"板单元数: {len(fpn_data.get('plate_elements', []))}")
                
                log_print("6. 测试网格创建...")
                try:
                    preprocessor.create_mesh_from_fpn(fpn_data)
                    
                    if hasattr(preprocessor, 'mesh') and preprocessor.mesh:
                        mesh = preprocessor.mesh
                        log_print(f"✅ 网格创建成功: {mesh.n_points} 节点, {mesh.n_cells} 单元")
                        
                        log_print("7. 测试Kratos转换...")
                        sys.path.append(str(project_root / "core"))
                        from kratos_interface import KratosInterface
                        kratos_interface = KratosInterface()
                        
                        success = kratos_interface.setup_model(fpn_data)
                        if success:
                            log_print("✅ Kratos模型设置成功")
                            model_data = kratos_interface.model_data
                            log_print(f"Kratos节点数: {len(model_data.get('nodes', []))}")
                            log_print(f"Kratos单元数: {len(model_data.get('elements', []))}")
                            
                            log_print("8. 生成Kratos文件...")
                            output_dir = project_root / "temp_kratos_final"
                            output_dir.mkdir(exist_ok=True)
                            
                            # 生成文件
                            mdpa_file = output_dir / "model.mdpa"
                            kratos_interface._write_mdpa_file(mdpa_file)
                            log_print(f"✅ MDPA文件: {mdpa_file.stat().st_size} bytes")
                            
                            materials_file = output_dir / "materials.json"
                            kratos_interface._write_materials_file(materials_file)
                            log_print(f"✅ 材料文件: {materials_file.stat().st_size} bytes")
                            
                            params_file = output_dir / "ProjectParameters.json"
                            kratos_interface._write_project_parameters(params_file, "model", "materials.json")
                            log_print(f"✅ 参数文件: {params_file.stat().st_size} bytes")
                            
                            log_print("🎉 完整的FPN到Kratos转换成功！")
                        else:
                            log_print("❌ Kratos模型设置失败")
                    else:
                        log_print("❌ 网格创建失败")
                        
                except Exception as e:
                    log_print(f"❌ 网格创建异常: {e}")
                    import traceback
                    with open(log_file, 'a', encoding='utf-8') as f:
                        traceback.print_exc(file=f)
            else:
                log_print("❌ FPN解析返回None")
                
        except Exception as e:
            log_print(f"❌ FPN解析异常: {e}")
            import traceback
            with open(log_file, 'a', encoding='utf-8') as f:
                traceback.print_exc(file=f)
    else:
        log_print("❌ FPN文件不存在")
        
except Exception as e:
    log_print(f"❌ 测试失败: {e}")
    import traceback
    with open(log_file, 'a', encoding='utf-8') as f:
        traceback.print_exc(file=f)

log_print("=== 测试完成 ===")
log_print(f"详细日志请查看: {log_file}")
