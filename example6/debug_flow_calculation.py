#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
调试流场计算问题的测试脚本
"""

import sys
import os

# 添加路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_complete_flow():
    """测试完整的流场分析流程"""
    print("=== 调试流场分析流程 ===")
    
    try:
        # 1. 测试参数创建
        from core.empirical_solver import create_test_parameters
        params = create_test_parameters()
        print(f"✓ 参数创建成功")
        print(f"  桥墩直径: {params.pier_diameter} m")
        print(f"  流速: {params.flow_velocity} m/s") 
        print(f"  水深: {params.water_depth} m")
        
        # 2. 测试求解器
        from core.empirical_solver import EmpiricalScourSolver
        solver = EmpiricalScourSolver()
        print(f"✓ 求解器创建成功")
        
        # 3. 测试计算
        raw_result = solver.solve(params)
        print(f"✓ 计算完成")
        print(f"  原始结果类型: {type(raw_result)}")
        print(f"  原始结果内容: {raw_result}")
        
        # 4. 测试结果处理逻辑（模拟界面中的处理）
        if isinstance(raw_result, dict):
            print("📊 处理多方法结果...")
            main_method = 'HEC-18'
            if main_method in raw_result:
                result = raw_result[main_method]
                print(f"  选择方法: {main_method}")
            else:
                result = list(raw_result.values())[0]
                print(f"  使用第一个可用方法")
            
            print(f"  选中结果: {result}")
            print(f"  选中结果类型: {type(result)}")
            
            # 确保result是正确的格式
            if not isinstance(result, dict):
                result = {'scour_depth': result, 'success': True}
                print("  转换为字典格式")
            
            # 添加流体参数
            if 'reynolds_number' not in result:
                V = params.flow_velocity
                D = params.pier_diameter
                H = params.water_depth
                nu = 1e-6
                g = 9.81
                
                result['reynolds_number'] = V * D / nu
                result['froude_number'] = V / (g * H)**0.5
                print("  添加流体参数:")
                print(f"    雷诺数: {result['reynolds_number']:.0f}")
                print(f"    弗劳德数: {result['froude_number']:.3f}")
            
            result['success'] = True
            
            # 5. 测试参数更新逻辑
            print("🔄 测试参数更新逻辑...")
            
            # 模拟 update_flow_parameters 的核心逻辑
            class MockWidget:
                def __init__(self):
                    self.reynolds_display_text = "--"
                    self.froude_display_text = "--"
                    self.max_velocity_display_text = "--"
                    self.turbulence_display_text = "--"
                
                def update_display(self, result):
                    try:
                        # 处理不同格式的结果（字典或对象）
                        if isinstance(result, dict):
                            class ResultObj:
                                def __init__(self, data):
                                    for key, value in data.items():
                                        setattr(self, key, value)
                                    if not hasattr(self, 'success'):
                                        self.success = True
                                    if not hasattr(self, 'reynolds_number'):
                                        self.reynolds_number = data.get('Re', 5e5)
                                    if not hasattr(self, 'froude_number'):
                                        self.froude_number = data.get('Fr', 0.3)
                            
                            result = ResultObj(result)
                        
                        # 检查结果是否成功
                        success = getattr(result, 'success', True)
                        if not success:
                            print("    结果显示失败，success=False")
                            return
                        
                        # 获取数值
                        reynolds = getattr(result, 'reynolds_number', 5e5)
                        froude = getattr(result, 'froude_number', 0.3)
                        
                        # 更新显示
                        self.reynolds_display_text = f"{reynolds:.0f}"
                        self.froude_display_text = f"{froude:.3f}"
                        
                        max_velocity = froude * (9.81 * 4.0)**0.5
                        self.max_velocity_display_text = f"{max_velocity:.2f} m/s"
                        
                        turbulence_intensity = min(0.15, 0.05 + 1e-5 * reynolds**0.5)
                        self.turbulence_display_text = f"{turbulence_intensity:.3f}"
                        
                        print("    ✓ 参数更新成功:")
                        print(f"      雷诺数: {self.reynolds_display_text}")
                        print(f"      弗劳德数: {self.froude_display_text}")
                        print(f"      最大流速: {self.max_velocity_display_text}")
                        print(f"      湍流强度: {self.turbulence_display_text}")
                        
                        return True
                        
                    except Exception as e:
                        print(f"    ❌ 参数更新失败: {e}")
                        import traceback
                        traceback.print_exc()
                        return False
            
            # 测试更新
            mock_widget = MockWidget()
            success = mock_widget.update_display(result)
            
            if success:
                print("🎉 完整流程测试成功！")
                print("💡 问题应该在界面的实际调用中")
            else:
                print("❌ 流程测试失败")
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_complete_flow()