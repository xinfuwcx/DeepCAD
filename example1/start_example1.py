"""
启动example1桌面界面的脚本
用于快速启动MSH数据处理测试界面
"""
import os
import sys

def start_example1():
    """启动example1界面"""
    print("="*60)
    print("    启动 Example1 - MSH数据处理测试界面")
    print("="*60)
    print()
    print("功能包括:")
    print("- 生成土体、基坑、隧道的MSH网格文件")
    print("- 配置高强度分层土体材料参数")
    print("- 运行Kratos岩土工程分析")
    print("- 生成PyVista兼容的VTK结果文件")
    print("- 完整的分步开挖分析流程")
    print()
    print("正在启动界面...")
    print()
    
    try:
        # 导入并运行example1界面
        from example1_desktop_interface import Example1DesktopInterface
        
        app = Example1DesktopInterface()
        app.run()
        
    except ImportError as e:
        print(f"导入错误: {e}")
        print("请确保所有必要的模块都在当前目录中")
        print("需要的文件:")
        print("- example1_desktop_interface.py")
        print("- msh_geometry_generator.py") 
        print("- msh_materials_manager.py")
        print("- msh_kratos_solver.py")
        
    except Exception as e:
        print(f"启动example1时出错: {e}")
        
    print()
    print("Example1界面已关闭")

if __name__ == "__main__":
    start_example1()