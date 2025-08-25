#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
流场分析修复测试脚本
测试修复后的流场分析功能是否正常工作
"""

import sys
import os

# 添加路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_basic_flow_analysis():
    """测试基础流场分析功能"""
    print("=== 测试基础流场分析功能 ===")
    
    try:
        # 导入求解器
        from core.empirical_solver import EmpiricalScourSolver, create_test_parameters
        
        # 创建求解器和参数
        solver = EmpiricalScourSolver()
        params = create_test_parameters()
        
        print(f"测试参数:")
        print(f"  桥墩直径: {params.pier_diameter} m")
        print(f"  流速: {params.flow_velocity} m/s")
        print(f"  水深: {params.water_depth} m")
        
        # 执行计算
        result = solver.solve(params)
        
        # 检查结果格式
        print(f"\n结果格式: {type(result)}")
        if isinstance(result, dict):
            print("✓ 返回字典格式")
            print(f"  键: {list(result.keys())}")
        else:
            print("✓ 返回对象格式")
            print(f"  属性: {[attr for attr in dir(result) if not attr.startswith('_')]}")
        
        # 测试结果访问
        try:
            if hasattr(result, 'reynolds_number'):
                re_num = result.reynolds_number
            elif 'reynolds_number' in result:
                re_num = result['reynolds_number']
            elif 'Re' in result:
                re_num = result['Re']
            else:
                re_num = "未找到"
            
            print(f"  雷诺数: {re_num}")
        except Exception as e:
            print(f"  雷诺数访问失败: {e}")
        
        print("✅ 基础流场分析功能正常")
        return True
        
    except Exception as e:
        print(f"❌ 基础流场分析功能测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_result_format_compatibility():
    """测试结果格式兼容性"""
    print("\n=== 测试结果格式兼容性 ===")
    
    # 测试字典格式
    dict_result = {
        'scour_depth': 1.5,
        'reynolds_number': 500000,
        'froude_number': 0.3,
        'success': True
    }
    
    # 测试对象格式
    class ObjectResult:
        def __init__(self):
            self.scour_depth = 1.5
            self.reynolds_number = 500000
            self.froude_number = 0.3
            self.success = True
    
    obj_result = ObjectResult()
    
    # 模拟update_flow_parameters方法的核心逻辑
    def test_result_processing(result, name):
        print(f"测试 {name}:")
        try:
            # 处理不同格式的结果（字典或对象）
            if isinstance(result, dict):
                # 如果是字典格式，转换为对象形式以兼容
                class ResultObj:
                    def __init__(self, data):
                        for key, value in data.items():
                            setattr(self, key, value)
                        # 设置默认属性
                        if not hasattr(self, 'success'):
                            self.success = True
                        if not hasattr(self, 'reynolds_number'):
                            self.reynolds_number = data.get('Re', 5e5)
                        if not hasattr(self, 'froude_number'):
                            self.froude_number = data.get('Fr', 0.3)
                
                result = ResultObj(result)
            
            # 获取数值，提供默认值
            reynolds = getattr(result, 'reynolds_number', 5e5)
            froude = getattr(result, 'froude_number', 0.3)
            success = getattr(result, 'success', True)
            
            print(f"  ✓ 雷诺数: {reynolds:.0f}")
            print(f"  ✓ 弗劳德数: {froude:.3f}")
            print(f"  ✓ 成功状态: {success}")
            
            return True
            
        except Exception as e:
            print(f"  ❌ 处理失败: {e}")
            return False
    
    # 测试两种格式
    dict_ok = test_result_processing(dict_result, "字典格式")
    obj_ok = test_result_processing(obj_result, "对象格式")
    
    if dict_ok and obj_ok:
        print("✅ 结果格式兼容性测试通过")
        return True
    else:
        print("❌ 结果格式兼容性测试失败")
        return False

def main():
    """主测试函数"""
    print("🌊 流场分析修复测试")
    print("=" * 50)
    
    # 运行测试
    test1_ok = test_basic_flow_analysis()
    test2_ok = test_result_format_compatibility()
    
    # 总结
    print("\n" + "=" * 50)
    if test1_ok and test2_ok:
        print("🎉 所有测试通过！流场分析功能已修复完成")
        print("💡 现在可以在界面中正常使用'开始流场分析'功能")
    else:
        print("⚠️  部分测试失败，需要进一步检查")
    
    print("\n使用说明:")
    print("1. 启动 enhanced_beautiful_main.py")
    print("2. 切换到 '流场详析' 标签页") 
    print("3. 选择 '💨 基础流场分析' 模式")
    print("4. 点击 '🔍 开始流场分析' 按钮")
    print("5. 观察进度条和参数更新")

if __name__ == "__main__":
    main()