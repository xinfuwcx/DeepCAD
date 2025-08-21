#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
完整工作流程测试 - 测试从FPN加载到分析完成的全流程
"""

import sys
import time
import logging
from pathlib import Path
from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import QTimer, QEventLoop

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_full_workflow():
    """测试完整工作流程"""
    print("=== 测试完整工作流程 ===")
    
    # 创建QApplication
    app = QApplication(sys.argv)
    
    try:
        # 导入主窗口
        from gui.main_window import MainWindow
        
        # 创建主窗口
        print("🔄 创建主窗口...")
        main_window = MainWindow()
        
        # 设置日志级别，减少噪音
        logging.getLogger('example2.core.optimized_fpn_parser').setLevel(logging.WARNING)
        
        # 测试FPN文件路径
        fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
        print(f"📁 FPN文件: {fpn_file}")
        print(f"📁 文件存在: {fpn_file.exists()}")
        
        if not fpn_file.exists():
            print("❌ FPN文件不存在")
            return False
            
        # 步骤1: 加载FPN文件
        print("\n🔄 步骤1: 加载FPN文件...")
        try:
            # 使用force_load=True绕过保护模式
            main_window.preprocessor.load_fpn_file(str(fpn_file), force_load=True)
            print("✅ FPN文件加载成功")
            
            # 检查解析结果
            if hasattr(main_window.preprocessor, 'fpn_data') and main_window.preprocessor.fpn_data:
                data = main_window.preprocessor.fpn_data
                print(f"   节点数: {len(data.get('nodes', []))}")
                print(f"   单元数: {len(data.get('elements', []))}")
                print(f"   分析步数: {len(data.get('analysis_stages', []))}")
                
                # 打印分析步信息
                stages = data.get('analysis_stages', [])
                for i, stage in enumerate(stages):
                    print(f"   分析步{i+1}: {stage.get('name', 'Unknown')} (ID: {stage.get('id')})")
            else:
                print("❌ FPN数据解析失败")
                return False
                
        except Exception as e:
            print(f"❌ FPN文件加载失败: {e}")
            return False
        
        # 步骤2: 设置分析器
        print("\n🔄 步骤2: 设置分析器...")
        try:
            # 设置FPN数据到分析器
            main_window.analyzer.set_fpn_data(main_window.preprocessor.fpn_data)
            main_window.analyzer.load_fpn_analysis_steps(main_window.preprocessor.fpn_data)
            
            print(f"✅ 分析器设置完成，分析步数: {len(main_window.analyzer.analysis_steps)}")
            
            # 打印分析步信息
            for i, step in enumerate(main_window.analyzer.analysis_steps):
                print(f"   步骤{i+1}: {step.name} ({step.step_type})")
                
        except Exception as e:
            print(f"❌ 分析器设置失败: {e}")
            return False
        
        # 步骤3: 检查Kratos集成
        print("\n🔄 步骤3: 检查Kratos集成...")
        try:
            from core.kratos_interface import KratosInterface, KRATOS_AVAILABLE
            
            if not KRATOS_AVAILABLE:
                print("❌ Kratos不可用，无法进行真实分析")
                return False
                
            # 创建Kratos接口
            kratos_interface = KratosInterface()
            main_window.analyzer.set_kratos_interface(kratos_interface)
            print("✅ Kratos接口设置成功")
            
        except Exception as e:
            print(f"❌ Kratos接口设置失败: {e}")
            return False
        
        # 步骤4: 启动分析（模拟）
        print("\n🔄 步骤4: 启动分析...")
        try:
            # 连接信号
            analysis_completed = False
            analysis_success = False
            analysis_message = ""
            
            def on_analysis_finished(success, message):
                nonlocal analysis_completed, analysis_success, analysis_message
                analysis_completed = True
                analysis_success = success
                analysis_message = message
                print(f"📊 分析完成: 成功={success}, 消息={message}")
            
            def on_progress_updated(progress, message):
                print(f"📈 进度: {progress}% - {message}")
            
            def on_step_completed(step_index, results):
                print(f"✅ 步骤{step_index+1}完成: {results}")
            
            # 连接信号
            main_window.analyzer.analysis_finished.connect(on_analysis_finished)
            main_window.analyzer.progress_updated.connect(on_progress_updated)
            main_window.analyzer.step_completed.connect(on_step_completed)
            
            # 启动分析
            main_window.analyzer.start_analysis()
            print("✅ 分析已启动")
            
            # 等待分析完成（最多等待5分钟）
            print("⏳ 等待分析完成...")
            timeout = 300  # 5分钟超时
            start_time = time.time()
            
            while not analysis_completed and (time.time() - start_time) < timeout:
                app.processEvents()  # 处理Qt事件
                time.sleep(0.1)
            
            if analysis_completed:
                if analysis_success:
                    print("🎉 分析成功完成!")
                    return True
                else:
                    print(f"❌ 分析失败: {analysis_message}")
                    return False
            else:
                print("⏰ 分析超时")
                return False
                
        except Exception as e:
            print(f"❌ 分析启动失败: {e}")
            return False
        
    except Exception as e:
        print(f"❌ 测试过程异常: {e}")
        return False
    
    finally:
        # 清理
        try:
            app.quit()
        except:
            pass

if __name__ == "__main__":
    success = test_full_workflow()
    if success:
        print("\n🎉 完整工作流程测试成功!")
        sys.exit(0)
    else:
        print("\n❌ 完整工作流程测试失败!")
        sys.exit(1)
