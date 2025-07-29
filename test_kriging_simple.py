#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化的GSTools Kriging测试
"""
import numpy as np
import gstools as gs

def test_kriging():
    print("测试GSTools Kriging功能...")
    
    # 1. 生成模拟数据
    np.random.seed(42)
    n_points = 15
    
    x = np.random.uniform(-50, 50, n_points)
    y = np.random.uniform(-50, 50, n_points) 
    z = -4.0 + 0.01*x + 0.005*y + np.random.normal(0, 0.3, n_points)
    
    print(f"生成 {n_points} 个测试点")
    print(f"X范围: [{x.min():.1f}, {x.max():.1f}]")
    print(f"Y范围: [{y.min():.1f}, {y.max():.1f}]")
    print(f"Z范围: [{z.min():.1f}, {z.max():.1f}]")
    
    # 2. 创建变差函数模型
    print("\n创建变差函数模型...")
    try:
        model = gs.Exponential(dim=2, var=1.0, len_scale=20.0, nugget=0.1)
        print("变差函数模型创建成功")
        print(f"方差: {model.var}, 变程: {model.len_scale}, 块金: {model.nugget}")
    except Exception as e:
        print(f"模型创建失败: {e}")
        return False
    
    # 3. 普通Kriging
    print("\n执行普通Kriging...")
    try:
        krig = gs.krige.Ordinary(
            model=model,
            cond_pos=(x, y),
            cond_val=z
        )
        print("Kriging对象创建成功")
        
        # 小网格测试
        x_test = np.linspace(-60, 60, 8)
        y_test = np.linspace(-60, 60, 8)
        
        interpolated, error_var = krig.structured([x_test, y_test])
        
        print("Kriging插值完成")
        print(f"插值网格: {interpolated.shape}")
        print(f"插值范围: [{interpolated.min():.2f}, {interpolated.max():.2f}]")
        print(f"误差方差范围: [{error_var.min():.3f}, {error_var.max():.3f}]")
        
    except Exception as e:
        print(f"Kriging失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # 4. 精度验证
    print("\n验证插值精度...")
    try:
        # 在原始点验证
        krig_at_orig, _ = krig.unstructured([x, y])
        rmse = np.sqrt(np.mean((krig_at_orig - z)**2))
        correlation = np.corrcoef(krig_at_orig, z)[0,1]
        
        print(f"RMSE: {rmse:.3f}")
        print(f"相关系数: {correlation:.3f}")
        
        if rmse < 1.0 and correlation > 0.8:
            print("精度验证通过")
            return True
        else:
            print("精度验证未通过")
            return False
            
    except Exception as e:
        print(f"精度验证失败: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("GSTools Kriging 简化测试")
    print("=" * 50)
    
    if test_kriging():
        print("\n[SUCCESS] Kriging测试通过!")
    else:
        print("\n[FAILED] Kriging测试失败!")