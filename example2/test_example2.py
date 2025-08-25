#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Example2 快速测试脚本
验证核心功能模块的完整性
"""

import sys
import time
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_imports():
    """测试模块导入"""
    print("🔍 测试模块导入...")
    
    tests = [
        ("PyQt6.QtWidgets", "GUI框架"),
        ("numpy", "数值计算"),
        ("pyvista", "3D可视化"),
        ("gui.main_window", "主窗口"),
        ("modules.preprocessor", "前处理模块"),
        ("modules.analyzer", "分析模块"),
        ("modules.postprocessor", "后处理模块"),
        ("core.kratos_interface", "Kratos接口"),
    ]
    
    results = []
    for module, description in tests:
        try:
            __import__(module)
            print(f"✅ {module} - {description}")
            results.append(True)
        except Exception as e:
            print(f"❌ {module} - {description}: {e}")
            results.append(False)
    
    success_rate = sum(results) / len(results) * 100
    print(f"\n📊 导入成功率: {success_rate:.1f}% ({sum(results)}/{len(results)})")
    return all(results)

def test_gui_creation():
    """测试GUI创建"""
    print("\n🔍 测试GUI创建...")
    
    try:
        from PyQt6.QtWidgets import QApplication
        from gui.main_window import MainWindow
        
        # 创建应用程序
        app = QApplication([])
        
        # 创建主窗口
        start_time = time.time()
        main_window = MainWindow()
        creation_time = time.time() - start_time
        
        print(f"✅ 主窗口创建成功 (耗时: {creation_time:.2f}秒)")
        
        # 检查关键组件
        components = [
            ("preprocessor", "前处理器"),
            ("analyzer", "分析器"),
            ("postprocessor", "后处理器"),
            ("workflow_tabs", "工作流标签"),
        ]
        
        for attr, name in components:
            if hasattr(main_window, attr):
                print(f"✅ {name}组件存在")
            else:
                print(f"❌ {name}组件缺失")
        
        # 清理
        main_window.close()
        app.quit()
        
        return True
        
    except Exception as e:
        print(f"❌ GUI创建失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_core_functions():
    """测试核心功能"""
    print("\n🔍 测试核心功能...")
    
    try:
        from modules.preprocessor import PreProcessor
        from modules.analyzer import Analyzer
        from modules.postprocessor import PostProcessor
        
        # 测试前处理器
        print("测试前处理器...")
        preprocessor = PreProcessor()
        if hasattr(preprocessor, 'create_viewer_widget'):
            print("✅ 前处理器3D视图功能")
        
        # 测试分析器
        print("测试分析器...")
        analyzer = Analyzer()
        if hasattr(analyzer, 'load_fpn_analysis_steps'):
            print("✅ 分析器FPN加载功能")
        
        # 测试后处理器
        print("测试后处理器...")
        postprocessor = PostProcessor()
        if hasattr(postprocessor, 'load_results'):
            print("✅ 后处理器结果加载功能")
        
        return True
        
    except Exception as e:
        print(f"❌ 核心功能测试失败: {e}")
        return False

def test_file_structure():
    """测试文件结构完整性"""
    print("\n🔍 测试文件结构...")
    
    required_files = [
        "gui/main_window.py",
        "modules/preprocessor.py", 
        "modules/analyzer.py",
        "modules/postprocessor.py",
        "core/kratos_interface.py",
        "requirements.txt",
    ]
    
    missing_files = []
    for file_path in required_files:
        full_path = project_root / file_path
        if full_path.exists():
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} (缺失)")
            missing_files.append(file_path)
    
    if missing_files:
        print(f"\n❌ 缺失文件: {len(missing_files)}个")
        return False
    else:
        print("\n✅ 文件结构完整")
        return True

def generate_test_report():
    """生成测试报告"""
    print("\n" + "="*60)
    print("📋 Example2 功能测试报告")
    print("="*60)
    
    tests = [
        ("模块导入", test_imports),
        ("文件结构", test_file_structure),
        ("核心功能", test_core_functions),
        ("GUI创建", test_gui_creation),
    ]
    
    results = {}
    total_time = time.time()
    
    for test_name, test_func in tests:
        print(f"\n🧪 执行测试: {test_name}")
        start_time = time.time()
        result = test_func()
        test_time = time.time() - start_time
        results[test_name] = (result, test_time)
        print(f"⏱️ 耗时: {test_time:.2f}秒")
    
    total_time = time.time() - total_time
    
    # 汇总结果
    print("\n" + "="*60)
    print("📊 测试结果汇总")
    print("="*60)
    
    passed = 0
    for test_name, (result, test_time) in results.items():
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{test_name:15} {status:10} ({test_time:.2f}秒)")
        if result:
            passed += 1
    
    success_rate = passed / len(tests) * 100
    print(f"\n📈 总体通过率: {success_rate:.1f}% ({passed}/{len(tests)})")
    print(f"⏱️ 总计耗时: {total_time:.2f}秒")
    
    if success_rate >= 75:
        print("\n🎉 Example2基本功能正常，可以启动使用！")
        return True
    else:
        print("\n⚠️ Example2存在重要问题，建议修复后再使用")
        return False

def main():
    """主函数"""
    print("🔧 Example2 快速功能测试")
    print("💡 验证核心模块完整性\n")
    
    try:
        success = generate_test_report()
        
        print("\n" + "="*60)
        if success:
            print("🚀 测试完成！可以运行 python start_example2.py 启动程序")
        else:
            print("🔧 需要修复问题后再启动程序")
        print("="*60)
        
        return 0 if success else 1
        
    except KeyboardInterrupt:
        print("\n👋 测试被用户中断")
        return 0
    except Exception as e:
        print(f"\n❌ 测试过程出错: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = main()
    input("\n按Enter键退出...")
    sys.exit(exit_code)
