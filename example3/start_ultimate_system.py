#!/usr/bin/env python3
"""
Start Ultimate System - 启动终极系统
Final launcher for the complete GemPy Ultimate ABAQUS Professional System
"""

import sys
import os
import subprocess
import time
from pathlib import Path

def check_dependencies():
    """检查系统依赖"""
    print("🔍 Checking system dependencies...")
    
    dependencies = [
        ('PyQt6', 'PyQt6'),
        ('numpy', 'numpy'),
        ('pandas', 'pandas'),
        ('matplotlib', 'matplotlib'),
        ('scipy', 'scipy'),
        ('scikit-learn', 'sklearn')
    ]
    
    missing_deps = []
    
    for display_name, import_name in dependencies:
        try:
            __import__(import_name)
            print(f"   ✅ {display_name}")
        except ImportError:
            print(f"   ❌ {display_name} - Missing")
            missing_deps.append(display_name)
    
    # 检查可选依赖
    optional_deps = [
        ('PyVista', 'pyvista', '3D Visualization'),
        ('PyKrige', 'pykrige', 'Kriging Algorithm'),
        ('GemPy', 'gempy', 'Native GemPy Support')
    ]
    
    print("\n🔍 Checking optional dependencies...")
    
    for display_name, import_name, description in optional_deps:
        try:
            __import__(import_name)
            print(f"   ✅ {display_name} - {description}")
        except ImportError:
            print(f"   ⚠️  {display_name} - {description} (Optional)")
    
    if missing_deps:
        print(f"\n❌ Missing required dependencies: {', '.join(missing_deps)}")
        print("Please install them using:")
        print(f"pip install {' '.join(missing_deps).lower().replace('pyqt6', 'PyQt6')}")
        return False
    
    print("\n✅ All required dependencies available!")
    return True

def check_system_files():
    """检查系统文件"""
    print("\n🔍 Checking system files...")
    
    required_files = [
        'gempy_ultimate_abaqus.py',
        'enhanced_abaqus_effects.py',
        'abaqus_style_theme.py',
        'advanced_plugin_system.py',
        'intelligent_data_processor.py',
        'professional_3d_renderer.py',
        'advanced_geological_algorithms.py',
        'batch_processing_automation.py',
        'ultimate_integrated_launcher.py'
    ]
    
    missing_files = []
    
    for file_name in required_files:
        if os.path.exists(file_name):
            print(f"   ✅ {file_name}")
        else:
            print(f"   ❌ {file_name} - Missing")
            missing_files.append(file_name)
    
    if missing_files:
        print(f"\n❌ Missing system files: {', '.join(missing_files)}")
        return False
    
    print("\n✅ All system files available!")
    return True

def show_system_info():
    """显示系统信息"""
    print("\n" + "=" * 80)
    print("🌋 GemPy Ultimate ABAQUS Professional System")
    print("   Version 2025.2.0 Ultimate Edition")
    print("   Complete Professional Geological Modeling System")
    print("=" * 80)
    
    print("\n📊 System Components:")
    print("   🎨 Ultimate Interface       - ABAQUS CAE级专业界面")
    print("   🔌 Plugin System           - 高级插件架构系统")  
    print("   🧠 Data Processor          - 智能数据预处理")
    print("   🌋 3D Renderer             - 专业三维渲染")
    print("   🏔️  Geological Algorithms  - 高级地质建模")
    print("   🚀 Batch Processing        - 批量处理自动化")
    
    print("\n🎯 Key Features:")
    print("   • ABAQUS CAE级界面设计和用户体验")
    print("   • 14种数据质量问题自动检测修复")
    print("   • 8种高级地质建模算法集成")
    print("   • 完整的插件系统和扩展架构")
    print("   • 工作流自动化和批量处理")
    print("   • 专业三维可视化和渲染")
    
    print("\n💎 Technical Highlights:")
    print("   • ~6000行高质量Python代码")
    print("   • 模块化设计，优雅降级")
    print("   • 完整错误处理和异常管理")
    print("   • 实时性能监控和状态反馈")
    
    print("=" * 80)

def launch_system():
    """启动系统"""
    print("\n🚀 Launching GemPy Ultimate ABAQUS System...")
    
    try:
        # 首先尝试启动完整集成系统
        if os.path.exists('ultimate_integrated_launcher.py'):
            print("   📱 Starting Ultimate Integrated System...")
            subprocess.run([sys.executable, 'ultimate_integrated_launcher.py'])
            
        # 如果失败，尝试基础界面
        elif os.path.exists('launch_ultimate.py'):
            print("   📱 Starting Ultimate Interface...")
            subprocess.run([sys.executable, 'launch_ultimate.py'])
            
        # 最后尝试基础启动器
        elif os.path.exists('gempy_ultimate_abaqus.py'):
            print("   📱 Starting Basic Ultimate Interface...")
            subprocess.run([sys.executable, 'gempy_ultimate_abaqus.py'])
            
        else:
            print("   ❌ No launcher found!")
            return False
            
        return True
        
    except Exception as e:
        print(f"   ❌ Launch failed: {e}")
        return False

def show_startup_menu():
    """显示启动菜单"""
    print("\n" + "🎯" * 40)
    print("Select Launch Mode:")
    print("🎯" * 40)
    print("1. 🚀 Complete Ultimate System (Recommended)")
    print("2. 🌋 Ultimate Interface Only")
    print("3. 🔧 Individual Component Testing")
    print("4. 📊 System Diagnostics")
    print("5. 📚 View Documentation")
    print("0. ❌ Exit")
    print("🎯" * 40)
    
    while True:
        try:
            choice = input("\nEnter your choice (0-5): ").strip()
            
            if choice == '0':
                print("\n👋 Goodbye!")
                return False
                
            elif choice == '1':
                print("\n🚀 Launching Complete Ultimate System...")
                if os.path.exists('ultimate_integrated_launcher.py'):
                    subprocess.run([sys.executable, 'ultimate_integrated_launcher.py'])
                else:
                    print("❌ Ultimate integrated launcher not found!")
                return True
                
            elif choice == '2':
                print("\n🌋 Launching Ultimate Interface...")
                if os.path.exists('launch_ultimate.py'):
                    subprocess.run([sys.executable, 'launch_ultimate.py'])
                elif os.path.exists('gempy_ultimate_abaqus.py'):
                    subprocess.run([sys.executable, 'gempy_ultimate_abaqus.py'])
                else:
                    print("❌ Ultimate interface not found!")
                return True
                
            elif choice == '3':
                show_component_menu()
                return True
                
            elif choice == '4':
                run_diagnostics()
                return True
                
            elif choice == '5':
                show_documentation()
                return True
                
            else:
                print("❌ Invalid choice. Please enter 0-5.")
                
        except KeyboardInterrupt:
            print("\n\n👋 Interrupted by user. Goodbye!")
            return False

def show_component_menu():
    """显示组件测试菜单"""
    print("\n🔧 Individual Component Testing:")
    components = [
        ('advanced_plugin_system.py', '🔌 Plugin System'),
        ('intelligent_data_processor.py', '🧠 Data Processor'),
        ('professional_3d_renderer.py', '🌋 3D Renderer'),
        ('advanced_geological_algorithms.py', '🏔️ Geological Algorithms'),
        ('batch_processing_automation.py', '🚀 Batch Processing')
    ]
    
    for i, (file_name, description) in enumerate(components, 1):
        print(f"{i}. {description}")
    
    try:
        choice = input("\nEnter component number (1-5) or 0 to return: ").strip()
        
        if choice == '0':
            return
        
        choice_idx = int(choice) - 1
        if 0 <= choice_idx < len(components):
            file_name, description = components[choice_idx]
            if os.path.exists(file_name):
                print(f"\n🚀 Starting {description}...")
                subprocess.run([sys.executable, file_name])
            else:
                print(f"❌ {file_name} not found!")
        else:
            print("❌ Invalid choice.")
            
    except (ValueError, IndexError):
        print("❌ Invalid input.")

def run_diagnostics():
    """运行系统诊断"""
    print("\n🔍 Running System Diagnostics...")
    print("-" * 50)
    
    # Python版本
    print(f"Python Version: {sys.version}")
    
    # 系统信息
    import platform
    print(f"Platform: {platform.platform()}")
    print(f"Architecture: {platform.architecture()[0]}")
    
    # 内存信息
    try:
        import psutil
        memory = psutil.virtual_memory()
        print(f"Total Memory: {memory.total / (1024**3):.1f} GB")
        print(f"Available Memory: {memory.available / (1024**3):.1f} GB")
    except ImportError:
        print("Memory info: psutil not available")
    
    print("-" * 50)
    
    # 重新检查依赖
    check_dependencies()
    check_system_files()

def show_documentation():
    """显示文档"""
    print("\n📚 Available Documentation:")
    docs = [
        ('GEMPY_ULTIMATE_ABAQUS_TECHNICAL_DOCUMENTATION.md', '🔧 Technical Documentation'),
        ('USER_MANUAL_ULTIMATE_ABAQUS.md', '📖 User Manual')
    ]
    
    for file_name, description in docs:
        if os.path.exists(file_name):
            print(f"   ✅ {description}")
            try:
                if sys.platform.startswith('win'):
                    os.startfile(file_name)
                elif sys.platform.startswith('darwin'):
                    subprocess.run(['open', file_name])
                else:
                    subprocess.run(['xdg-open', file_name])
            except:
                print(f"   📄 Please manually open: {file_name}")
        else:
            print(f"   ❌ {description} - File not found")

def main():
    """主函数"""
    # 显示系统信息
    show_system_info()
    
    # 检查依赖
    if not check_dependencies():
        print("\n❌ Dependency check failed. Please install missing packages.")
        input("Press Enter to continue anyway or Ctrl+C to exit...")
    
    # 检查系统文件
    if not check_system_files():
        print("\n❌ System file check failed. Some components may not work.")
        input("Press Enter to continue anyway or Ctrl+C to exit...")
    
    # 显示启动菜单
    try:
        show_startup_menu()
    except KeyboardInterrupt:
        print("\n\n👋 Interrupted by user. Goodbye!")
    
    print("\n🎉 Thank you for using GemPy Ultimate ABAQUS Professional!")

if __name__ == "__main__":
    main()