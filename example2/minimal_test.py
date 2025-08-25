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
log_file = project_root / "test_output.log"

def log_print(*args, **kwargs):
    """同时输出到控制台和文件"""
    message = " ".join(str(arg) for arg in args)
    print(message, **kwargs)
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(message + '\n')

# 清空日志文件
with open(log_file, 'w', encoding='utf-8') as f:
    f.write("=== 测试开始 ===\n")

try:
    log_print("1. 测试基本导入...")
    
    # 创建QApplication（PreProcessor需要）
    from PyQt6.QtWidgets import QApplication
    app = QApplication([])
    log_print("✅ QApplication创建成功")

    from modules.preprocessor import PreProcessor
    log_print("✅ PreProcessor导入成功")

    # 直接解析FPN文件
    fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
    log_print(f"FPN文件存在: {fpn_file.exists()}")

    if fpn_file.exists():
        log_print("2. 解析FPN文件...")
        preprocessor = PreProcessor()
        try:
            log_print(f"调用load_fpn_file，force_load=True")
            fpn_data = preprocessor.load_fpn_file(str(fpn_file), force_load=True)
            log_print(f"FPN数据类型: {type(fpn_data)}")
            log_print(f"FPN数据是否为None: {fpn_data is None}")
        except Exception as e:
            log_print(f"FPN加载异常: {e}")
            import traceback
            with open(log_file, 'a', encoding='utf-8') as f:
                traceback.print_exc(file=f)
            fpn_data = None

        if fpn_data:
            log_print("✅ FPN解析成功")
            log_print(f"节点数: {len(fpn_data.get('nodes', []))}")
            log_print(f"单元数: {len(fpn_data.get('elements', []))}")
            log_print(f"材料数: {len(fpn_data.get('materials', []))}")
            
            # 测试Kratos转换
            log_print("3. 测试Kratos转换...")
            from core.kratos_interface import KratosInterface
            
            kratos_interface = KratosInterface()
            log_print("✅ KratosInterface创建成功")
            
            success = kratos_interface.setup_model(fpn_data)
            log_print(f"模型设置结果: {success}")
            
            if success:
                model_data = kratos_interface.model_data
                log_print(f"转换后节点数: {len(model_data.get('nodes', []))}")
                log_print(f"转换后单元数: {len(model_data.get('elements', []))}")
                
                # 生成文件
                log_print("4. 生成Kratos文件...")
                output_dir = project_root / "temp_kratos_minimal"
                output_dir.mkdir(exist_ok=True)
                
                # 直接调用文件生成
                mdpa_file = output_dir / "model.mdpa"
                kratos_interface._write_mdpa_file(mdpa_file)
                log_print(f"✅ MDPA文件生成: {mdpa_file.stat().st_size} bytes")
                
                materials_file = output_dir / "materials.json"
                kratos_interface._write_materials_file(materials_file)
                log_print(f"✅ 材料文件生成: {materials_file.stat().st_size} bytes")
                
                log_print("🎉 转换测试成功！")
            else:
                log_print("❌ 模型设置失败")
        else:
            log_print("❌ FPN解析失败")
    else:
        log_print("❌ FPN文件不存在")
        
except Exception as e:
    log_print(f"❌ 测试失败: {e}")
    import traceback
    with open(log_file, 'a', encoding='utf-8') as f:
        traceback.print_exc(file=f)

log_print("=== 测试完成 ===")
log_print(f"详细日志请查看: {log_file}")
