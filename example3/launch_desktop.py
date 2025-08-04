"""
启动桌面版三维土体重建程序
"""
import sys
import os

def main():
    """启动桌面应用程序"""
    print("启动三维土体重建系统...")
    print("正在加载桌面界面...")
    print("-" * 50)
    
    try:
        # 导入并启动现代化GUI
        from modern_gui import main as run_modern_gui
        
        print("使用现代化PyQt6界面...")
        
        print("界面加载完成！")
        print("功能说明:")
        print("   - 土体域设置: 可输入X/Y/Z方向的范围和网格分辨率")
        print("   - 钻孔数据: 支持生成示例数据或导入CSV文件")
        print("   - RBF参数: 可调整核函数、epsilon等插值参数")
        print("   - 三维重建: 基于RBF插值进行土体三维重建")
        print("   - 3D可视化: 多种渲染模式(体积、等值面、切片等)")
        print("-" * 50)
        
        # 运行现代化GUI
        run_modern_gui()
        
    except ImportError as e:
        print(f"模块导入失败: {e}")
        print("请确保已安装所有依赖包:")
        print("   pip install -r requirements.txt")
    except Exception as e:
        print(f"程序启动失败: {e}")
    
    print("感谢使用三维土体重建系统!")

if __name__ == "__main__":
    main()