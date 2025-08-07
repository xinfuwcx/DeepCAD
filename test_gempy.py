#!/usr/bin/env python3
"""
测试 GemPy 是否正确安装和可用
"""

def test_gempy_installation():
    print("🔍 测试 GemPy 安装状态...")
    
    try:
        import gempy as gp
        print(f"✅ GemPy 导入成功！版本: {gp.__version__}")
        return True
    except ImportError as e:
        print(f"❌ GemPy 导入失败: {e}")
        return False
    except Exception as e:
        print(f"❌ GemPy 导入时出现其他错误: {e}")
        return False

def test_gempy_basic_functionality():
    print("\n🧪 测试 GemPy 基本功能...")
    
    try:
        import gempy as gp
        import numpy as np
        
        # 创建一个简单的地质模型
        geo_model = gp.create_model('test_model')
        print("✅ 成功创建地质模型")
        
        # 测试基本数据结构
        extent = [0, 1000, 0, 1000, 0, 1000]
        resolution = [10, 10, 10]
        
        gp.init_data(geo_model, extent, resolution)
        print("✅ 成功初始化地质数据")
        
        return True
        
    except Exception as e:
        print(f"❌ GemPy 基本功能测试失败: {e}")
        return False

def test_dependencies():
    print("\n📦 检查 GemPy 相关依赖...")
    
    dependencies = [
        ('numpy', 'np'),
        ('pandas', 'pd'), 
        ('matplotlib', 'plt'),
        ('scipy', 'scipy'),
    ]
    
    all_ok = True
    for dep_name, import_as in dependencies:
        try:
            if import_as == 'plt':
                import matplotlib.pyplot as plt
                version = plt.matplotlib.__version__
            else:
                module = __import__(dep_name)
                version = getattr(module, '__version__', 'unknown')
            print(f"✅ {dep_name}: {version}")
        except ImportError:
            print(f"❌ {dep_name}: 未安装")
            all_ok = False
    
    return all_ok

if __name__ == "__main__":
    print("=" * 50)
    print("🚀 DeepCAD GemPy 安装测试")
    print("=" * 50)
    
    # 测试安装
    install_ok = test_gempy_installation()
    
    if install_ok:
        # 测试功能
        func_ok = test_gempy_basic_functionality()
        
        # 测试依赖
        deps_ok = test_dependencies()
        
        print("\n" + "=" * 50)
        if install_ok and func_ok and deps_ok:
            print("🎉 所有测试通过！GemPy 可以正常使用")
        else:
            print("⚠️ 部分测试失败，请检查安装")
    else:
        print("\n" + "=" * 50)
        print("❌ GemPy 未正确安装，请运行:")
        print("   pip install gempy>=2025.1.0")
    
    print("=" * 50)