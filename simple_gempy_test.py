#!/usr/bin/env python3
"""
简化的 GemPy 测试 - 避免复杂操作
"""

def quick_test():
    results = {
        'gempy_available': False,
        'version': None,
        'basic_function': False,
        'error': None
    }
    
    try:
        # 测试导入
        import gempy as gp
        results['gempy_available'] = True
        results['version'] = gp.__version__
        
        # 测试基本创建（最简单的操作）
        model = gp.create_model('test_model')
        results['basic_function'] = True
        
        print(f"✅ GemPy {results['version']} 工作正常")
        return True
        
    except ImportError as e:
        results['error'] = f"导入失败: {str(e)}"
        print(f"❌ GemPy 未安装: {results['error']}")
        return False
        
    except Exception as e:
        results['error'] = f"功能测试失败: {str(e)}"
        print(f"⚠️ GemPy 导入成功但功能异常: {results['error']}")
        return False

if __name__ == "__main__":
    print("🔍 快速测试 GemPy...")
    success = quick_test()
    
    if not success:
        print("\n💡 解决方案:")
        print("1. 激活虚拟环境: .\\test_venv\\Scripts\\activate")
        print("2. 安装 GemPy: pip install gempy==3.2.0")
        print("3. 重新测试")
    else:
        print("\n🎉 GemPy 准备就绪，可以开始地质重建！")