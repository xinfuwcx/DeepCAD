#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
直接测试GSTools Kriging功能
"""
import numpy as np
import gstools as gs
import pandas as pd
import matplotlib.pyplot as plt
from typing import List, Dict, Tuple

def test_kriging_basic():
    """测试基础Kriging功能"""
    print("[TEST] 测试GSTools基础Kriging功能...")
    
    # 1. 生成模拟钻孔数据
    np.random.seed(42)
    n_points = 20
    
    # 模拟钻孔坐标
    x_coords = np.random.uniform(-100, 100, n_points)
    y_coords = np.random.uniform(-100, 100, n_points)
    
    # 模拟地面标高 (加入空间相关性)
    true_field = lambda x, y: -4.0 + 0.01*x + 0.005*y + 0.5*np.sin(x/50) + 0.3*np.cos(y/40)
    z_values = true_field(x_coords, y_coords) + np.random.normal(0, 0.2, n_points)
    
    print(f"[OK] 生成 {n_points} 个模拟钻孔数据")
    print(f"   X范围: [{x_coords.min():.1f}, {x_coords.max():.1f}]")
    print(f"   Y范围: [{y_coords.min():.1f}, {y_coords.max():.1f}]") 
    print(f"   Z范围: [{z_values.min():.1f}, {z_values.max():.1f}]")
    
    # 2. 创建变差函数模型
    print("\n[STEP] 创建变差函数模型...")
    try:
        # 使用指数模型
        model = gs.Exponential(dim=2, var=1.0, len_scale=30.0, nugget=0.1)
        print(f"[OK] 创建指数变差函数模型")
        print(f"   方差: {model.var}")
        print(f"   变程: {model.len_scale}")
        print(f"   块金效应: {model.nugget}")
        
    except Exception as e:
        print(f"[ERROR] 变差函数模型创建失败: {e}")
        return False
    
    # 3. 执行普通Kriging
    print("\n[STEP] 执行普通Kriging插值...")
    try:
        # 创建Kriging对象
        krig = gs.krige.Ordinary(
            model=model,
            cond_pos=(x_coords, y_coords),
            cond_val=z_values
        )
        print("[OK] 创建普通Kriging对象成功")
        
        # 定义插值网格
        grid_resolution = 5.0
        x_min, x_max = x_coords.min() - 20, x_coords.max() + 20
        y_min, y_max = y_coords.min() - 20, y_coords.max() + 20
        
        x_grid = np.arange(x_min, x_max, grid_resolution)
        y_grid = np.arange(y_min, y_max, grid_resolution)
        grid_x, grid_y = np.meshgrid(x_grid, y_grid)
        
        print(f"   网格大小: {len(x_grid)} x {len(y_grid)} = {len(x_grid)*len(y_grid)} 点")
        
        # 执行插值
        interpolated, error_var = krig.structured([x_grid, y_grid])
        print("[OK] Kriging插值完成")
        print(f"   插值结果形状: {interpolated.shape}")
        print(f"   插值值范围: [{interpolated.min():.2f}, {interpolated.max():.2f}]")
        print(f"   误差方差范围: [{error_var.min():.3f}, {error_var.max():.3f}]")
        
    except Exception as e:
        print(f"[ERROR] Kriging插值失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # 4. 计算插值精度
    print("\n[STEP] 计算插值精度...")
    try:
        # 在原始点位置计算插值值
        krig_at_points, _ = krig.unstructured([x_coords, y_coords])
        
        # 计算RMSE
        rmse = np.sqrt(np.mean((krig_at_points - z_values)**2))
        mae = np.mean(np.abs(krig_at_points - z_values))
        
        print(f"[OK] 插值精度评估:")
        print(f"   RMSE: {rmse:.3f}")
        print(f"   MAE: {mae:.3f}")
        print(f"   相关系数: {np.corrcoef(krig_at_points, z_values)[0,1]:.3f}")
        
    except Exception as e:
        print(f"[ERROR] 精度计算失败: {e}")
        return False
    
    return True

def test_real_borehole_data():
    """测试真实钻孔数据"""
    print("\n🏗️ 测试真实钻孔数据...")
    
    try:
        # 尝试加载CSV数据
        df = pd.read_csv('data/boreholes_with_undulation_fixed.csv')
        print(f"✅ 加载真实数据: {len(df)} 条记录")
        
        # 提取前20个不同钻孔的数据
        unique_boreholes = df['钻孔编号'].unique()[:20]
        
        coords = []
        values = []
        
        for bh_id in unique_boreholes:
            bh_data = df[df['钻孔编号'] == bh_id].iloc[0]
            x = float(bh_data['X坐标'])
            y = float(bh_data['Y坐标'])
            z = float(bh_data['地面标高'] - bh_data['钻孔深度'])
            
            coords.append([x, y])
            values.append(z)
        
        coords = np.array(coords)
        values = np.array(values)
        
        print(f"   处理钻孔数: {len(coords)}")
        print(f"   坐标范围: X[{coords[:,0].min():.1f}, {coords[:,0].max():.1f}], Y[{coords[:,1].min():.1f}, {coords[:,1].max():.1f}]")
        print(f"   标高范围: [{values.min():.1f}, {values.max():.1f}]")
        
        # 自动拟合变差函数
        print("\n📊 自动拟合变差函数...")
        model = gs.Exponential(dim=2)
        model.fit_variogram(*coords.T, values)
        
        print(f"✅ 变差函数拟合完成:")
        print(f"   方差: {model.var:.3f}")
        print(f"   变程: {model.len_scale:.1f}")
        print(f"   块金效应: {model.nugget:.3f}")
        
        # 执行Kriging
        krig = gs.krige.Ordinary(
            model=model,
            cond_pos=coords.T,
            cond_val=values
        )
        
        # 在较小网格上测试
        x_min, x_max = coords[:,0].min(), coords[:,0].max()
        y_min, y_max = coords[:,1].min(), coords[:,1].max()
        
        x_test = np.linspace(x_min, x_max, 10)
        y_test = np.linspace(y_min, y_max, 10)
        grid_x, grid_y = np.meshgrid(x_test, y_test)
        
        interpolated, error_var = krig.structured([x_test, y_test])
        
        print(f"✅ 真实数据Kriging插值成功")
        print(f"   插值网格: {interpolated.shape}")
        print(f"   插值范围: [{interpolated.min():.2f}, {interpolated.max():.2f}]")
        
        return True
        
    except FileNotFoundError:
        print("⚠️ 未找到真实数据文件，跳过真实数据测试")
        return True
    except Exception as e:
        print(f"❌ 真实数据测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """主测试函数"""
    print("=" * 60)
    print("GSTools Kriging功能测试")
    print("=" * 60)
    
    success_count = 0
    total_count = 2
    
    # 测试基础功能
    if test_kriging_basic():
        success_count += 1
        print("\n✅ 基础Kriging测试通过")
    else:
        print("\n❌ 基础Kriging测试失败")
    
    # 测试真实数据
    if test_real_borehole_data():
        success_count += 1
        print("\n✅ 真实数据测试通过")
    else:
        print("\n❌ 真实数据测试失败")
    
    print("\n" + "=" * 60)
    print(f"测试总结: {success_count}/{total_count} 通过")
    
    if success_count == total_count:
        print("🎉 所有Kriging功能测试通过！")
        return True
    else:
        print("⚠️ 部分测试失败，需要检查配置")
        return False

if __name__ == "__main__":
    main()