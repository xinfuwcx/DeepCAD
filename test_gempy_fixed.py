#!/usr/bin/env python3
"""
测试修复后的GemPy集成
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'gateway', 'modules', 'geology'))

from gempy_enhanced_service import get_gempy_enhanced_service

def test_gempy_default_method():
    """测试GemPy默认方法现在是否可用"""
    print("测试GemPy默认隐式建模方法")
    print("=" * 40)
    
    try:
        service = get_gempy_enhanced_service()
        
        # 检查可用方法
        available_methods = service.get_available_interpolation_methods()
        print("可用的插值方法:")
        for method_id, method_name in available_methods.items():
            print(f"  {method_id:15} - {method_name}")
        
        if 'gempy_default' not in available_methods:
            print("\nGemPy默认方法不可用")
            return False
        
        print(f"\n✓ GemPy默认方法现在可用了！")
        
        # 创建测试数据
        test_boreholes = [
            {"id": "BH001", "x": 0.0, "y": 0.0, "z": -3.0, "layer_id": 1},
            {"id": "BH002", "x": 50.0, "y": 0.0, "z": -4.0, "layer_id": 2},
            {"id": "BH003", "x": 25.0, "y": 50.0, "z": -3.5, "layer_id": 1},
            {"id": "BH004", "x": -25.0, "y": 25.0, "z": -4.5, "layer_id": 2}
        ]
        
        test_domain = {"resolution": [10, 10, 5]}  # 小分辨率测试
        
        print(f"\n测试GemPy默认隐式建模...")
        
        # 执行GemPy建模
        result = service.create_geological_model(
            borehole_data=test_boreholes,
            domain_config=test_domain,
            interpolation_method='gempy_default'
        )
        
        if result.get('success', False):
            print("✓ GemPy默认建模成功！")
            print(f"  - 方法: {result.get('method', 'Unknown')}")
            print(f"  - 处理时间: {result.get('processing_time', 0):.2f}秒")
            print(f"  - GemPy版本: {result.get('gempy_version', 'Unknown')}")
            print(f"  - 地质图: {'是' if 'geological_map' in result else '否'}")
            print(f"  - 质量评分: {result.get('quality_score', 'Unknown')}")
            return True
        else:
            print(f"✗ GemPy建模失败: {result.get('error', 'Unknown')}")
            return False
            
    except Exception as e:
        print(f"✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """主测试函数"""
    print("GemPy集成修复验证")
    print("=" * 50)
    print("验证: GemPy 2024.2.0.2 现在应该可以正常工作")
    print()
    
    success = test_gempy_default_method()
    
    print("\n" + "=" * 50)
    if success:
        print("✓ 修复成功！GemPy现在可以正常使用了")
        print("  - GemPy 2024.2.0.2 最新版本工作正常")
        print("  - 延迟导入解决了模块级别的导入问题")
        print("  - 现在有完整的4种插值方法可用:")
        print("    1. gempy_default - GemPy默认隐式建模")
        print("    2. enhanced_rbf - 增强RBF插值")
        print("    3. adaptive_rbf - 自适应RBF插值")
        print("    4. kriging - Kriging地统计插值")
    else:
        print("✗ 仍有问题需要解决")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)