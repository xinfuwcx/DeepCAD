#!/usr/bin/env python3
"""
测试Kratos导入
"""

import sys
import os

# 添加当前目录到Python路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

def test_kratos_import():
    """测试Kratos导入"""
    print("🔄 测试Kratos导入...")
    
    try:
        from core.kratos_interface import KratosInterface
        print("✅ KratosInterface导入成功")
        
        # 尝试创建实例
        kratos = KratosInterface()
        print("✅ KratosInterface实例创建成功")
        
        # 检查是否有必要的方法
        if hasattr(kratos, 'run_analysis'):
            print("✅ run_analysis方法存在")
        else:
            print("❌ run_analysis方法不存在")
            
        if hasattr(kratos, 'set_model_data'):
            print("✅ set_model_data方法存在")
        else:
            print("❌ set_model_data方法不存在")
            
        return True
        
    except ImportError as e:
        print(f"❌ KratosInterface导入失败: {e}")
        return False
    except Exception as e:
        print(f"❌ KratosInterface创建失败: {e}")
        return False

if __name__ == "__main__":
    success = test_kratos_import()
    if success:
        print("\n🎉 Kratos集成测试通过！")
    else:
        print("\n💥 Kratos集成测试失败！")
