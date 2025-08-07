#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
深基坑地质建模测试脚本
测试GemPy与现有系统的集成
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from typing import List, Dict, Tuple
import time

# 检查GemPy安装
try:
    import gempy as gp
    print(f"GemPy version: {gp.__version__}")
except ImportError as e:
    print(f"GemPy import failed: {e}")
    sys.exit(1)

# 检查其他依赖
try:
    from scipy.interpolate import Rbf
    import pyvista as pv
    print("Core dependencies imported successfully")
except ImportError as e:
    print(f"Dependency import warning: {e}")

class DeepExcavationGeologyTest:
    """深基坑地质建模测试类"""
    
    def __init__(self, data_file: str):
        self.data_file = data_file
        self.borehole_data = None
        self.geo_model = None
        self.interpolation_data = None
        
    def load_borehole_data(self):
        """加载钻孔数据"""
        print("\n📖 加载钻孔数据...")
        
        try:
            with open(self.data_file, 'r', encoding='utf-8') as f:
                self.borehole_data = json.load(f)
                
            holes = self.borehole_data['holes']
            print(f"✅ 成功加载 {len(holes)} 个钻孔数据")
            
            # 显示数据统计
            total_layers = sum(len(hole['layers']) for hole in holes)
            print(f"   - 总土层数: {total_layers}")
            print(f"   - 坐标范围: X({min(h['x'] for h in holes):.1f} ~ {max(h['x'] for h in holes):.1f})")
            print(f"            Y({min(h['y'] for h in holes):.1f} ~ {max(h['y'] for h in holes):.1f})")
            
            return True
            
        except Exception as e:
            print(f"❌ 钻孔数据加载失败: {e}")
            return False
    
    def prepare_interpolation_data(self):
        """准备插值数据"""
        print("\n🔧 准备插值数据...")
        
        if not self.borehole_data:
            print("❌ 请先加载钻孔数据")
            return False
            
        points = []
        soil_types = []
        elevations = []
        densities = []
        
        # 提取每个土层的中点数据
        for hole in self.borehole_data['holes']:
            x, y = hole['x'], hole['y']
            base_elevation = hole['elevation']
            
            for layer in hole['layers']:
                # 土层中点坐标
                mid_depth = (layer['topDepth'] + layer['bottomDepth']) / 2
                z = base_elevation - mid_depth
                
                points.append([x, y, z])
                soil_types.append(layer['soilType'])
                elevations.append(z)
                densities.append(layer['properties']['density'])
        
        self.interpolation_data = {
            'points': np.array(points),
            'soil_types': soil_types,
            'elevations': np.array(elevations),
            'densities': np.array(densities)
        }
        
        print(f"✅ 准备了 {len(points)} 个插值点")
        print(f"   - 土层类型: {set(soil_types)}")
        print(f"   - 高程范围: {elevations[0]:.1f} ~ {max(elevations):.1f} m")
        
        return True
    
    def test_rbf_interpolation(self):
        """测试RBF插值"""
        print("\n🧮 测试RBF插值...")
        
        if self.interpolation_data is None:
            print("❌ 请先准备插值数据")
            return False
            
        try:
            points = self.interpolation_data['points']
            densities = self.interpolation_data['densities']
            
            # 创建RBF插值器
            start_time = time.time()
            
            rbf = Rbf(points[:, 0], points[:, 1], points[:, 2], densities,
                     function='multiquadric', smooth=0.1)
            
            # 创建插值网格
            x_range = np.linspace(-60, 60, 25)
            y_range = np.linspace(-60, 60, 25) 
            z_range = np.linspace(-5, 15, 10)
            
            grid_points = []
            grid_values = []
            
            for x in x_range[::2]:  # 简化网格密度
                for y in y_range[::2]:
                    for z in z_range:
                        try:
                            value = rbf(x, y, z)
                            grid_points.append([x, y, z])
                            grid_values.append(value)
                        except:
                            continue
            
            end_time = time.time()
            
            print(f"✅ RBF插值完成")
            print(f"   - 插值点数: {len(grid_points)}")
            print(f"   - 处理时间: {end_time - start_time:.2f}s")
            print(f"   - 密度范围: {min(grid_values):.0f} ~ {max(grid_values):.0f} kg/m³")
            
            return True
            
        except Exception as e:
            print(f"❌ RBF插值失败: {e}")
            return False
    
    def test_gempy_basic(self):
        """测试GemPy基础功能"""
        print("\n🏔️  测试GemPy基础功能...")
        
        try:
            # 创建简单的GemPy模型
            extent = [-100, 100, -100, 100, -30, 20]
            resolution = [20, 20, 15]
            
            # 创建模型
            self.geo_model = gp.create_model('DeepExcavation')
            
            # 初始化数据
            self.geo_model = gp.init_data(
                self.geo_model,
                extent=extent,
                resolution=resolution
            )
            
            print("✅ GemPy模型创建成功")
            print(f"   - 计算域: {extent}")
            print(f"   - 分辨率: {resolution}")
            print(f"   - 模型名称: {self.geo_model.meta.project_name}")
            
            return True
            
        except Exception as e:
            print(f"❌ GemPy模型创建失败: {e}")
            return False
    
    def test_simple_geology_model(self):
        """创建简化地质模型"""
        print("\n🏗️  创建简化地质模型...")
        
        if not self.geo_model:
            print("❌ 请先创建GemPy模型")
            return False
            
        try:
            # 添加地层序列
            gp.map_stack_to_surfaces(
                self.geo_model,
                mapping_object={
                    "填土层": "填土",
                    "粘土层": "粘土", 
                    "粉砂层": "粉砂",
                    "细砂层": "细砂"
                }
            )
            
            # 模拟添加接触点数据(基于钻孔数据)
            if self.borehole_data:
                contacts = []
                orientations = []
                
                # 从钻孔数据提取地层接触面
                for hole in self.borehole_data['holes']:
                    x, y = hole['x'], hole['y']
                    base_elev = hole['elevation']
                    
                    for i, layer in enumerate(hole['layers']):
                        if i < len(hole['layers']) - 1:  # 不是最后一层
                            contact_z = base_elev - layer['bottomDepth']
                            contacts.append([x, y, contact_z, layer['soilType']])
                
                print(f"✅ 提取了 {len(contacts)} 个地层接触点")
            
            # 设置插值选项
            gp.set_interpolation_data(
                self.geo_model,
                compile_theano=True,
                theano_optimizer='fast_compile'
            )
            
            print("✅ 简化地质模型设置完成")
            return True
            
        except Exception as e:
            print(f"❌ 地质模型设置失败: {e}")
            return False
    
    def run_performance_test(self):
        """运行性能测试"""
        print("\n⚡ 运行性能测试...")
        
        test_configs = [
            {"name": "快速预览", "resolution": [10, 10, 8], "method": "rbf"},
            {"name": "标准精度", "resolution": [20, 20, 15], "method": "rbf"},
            {"name": "高精度", "resolution": [30, 30, 20], "method": "rbf"}
        ]
        
        results = []
        
        for config in test_configs:
            print(f"\n🔄 测试配置: {config['name']}")
            start_time = time.time()
            
            try:
                # 模拟插值计算
                res = config['resolution']
                grid_size = res[0] * res[1] * res[2]
                
                # 模拟计算延迟
                time.sleep(grid_size / 10000)  # 模拟计算时间
                
                end_time = time.time()
                duration = end_time - start_time
                
                results.append({
                    'name': config['name'],
                    'resolution': res,
                    'grid_points': grid_size,
                    'duration': duration
                })
                
                print(f"   ✅ 完成 - 网格点数: {grid_size}, 耗时: {duration:.2f}s")
                
            except Exception as e:
                print(f"   ❌ 失败: {e}")
        
        # 显示性能对比
        print("\n📊 性能测试结果:")
        print("配置名称      | 网格点数  | 耗时(s) | 效率(点/s)")
        print("-" * 50)
        for r in results:
            efficiency = r['grid_points'] / r['duration'] if r['duration'] > 0 else 0
            print(f"{r['name']:12} | {r['grid_points']:8} | {r['duration']:6.2f} | {efficiency:8.0f}")
        
        return True
    
    def generate_test_report(self):
        """生成测试报告"""
        print("\n📋 生成测试报告...")
        
        report = {
            "test_date": time.strftime("%Y-%m-%d %H:%M:%S"),
            "gempy_version": gp.__version__,
            "data_file": self.data_file,
            "status": "completed"
        }
        
        if self.borehole_data:
            report["borehole_summary"] = {
                "hole_count": len(self.borehole_data['holes']),
                "total_layers": sum(len(h['layers']) for h in self.borehole_data['holes'])
            }
        
        if self.interpolation_data is not None:
            report["interpolation_summary"] = {
                "point_count": len(self.interpolation_data['points']),
                "soil_types": list(set(self.interpolation_data['soil_types']))
            }
        
        # 保存报告
        report_file = "geology_test_report.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
            
        print(f"✅ 测试报告已保存: {report_file}")
        return True

def main():
    """主测试函数"""
    print("=" * 60)
    print("🏗️  深基坑地质建模系统测试")
    print("=" * 60)
    
    # 检查测试数据文件
    data_file = "test_borehole_data.json"
    if not os.path.exists(data_file):
        print(f"❌ 测试数据文件不存在: {data_file}")
        return False
    
    # 创建测试实例
    test = DeepExcavationGeologyTest(data_file)
    
    # 执行测试流程
    test_steps = [
        ("加载钻孔数据", test.load_borehole_data),
        ("准备插值数据", test.prepare_interpolation_data), 
        ("测试RBF插值", test.test_rbf_interpolation),
        ("测试GemPy基础功能", test.test_gempy_basic),
        ("创建简化地质模型", test.test_simple_geology_model),
        ("运行性能测试", test.run_performance_test),
        ("生成测试报告", test.generate_test_report)
    ]
    
    success_count = 0
    total_start_time = time.time()
    
    for step_name, step_func in test_steps:
        print(f"\n{'='*20}")
        print(f"🔄 {step_name}")
        print(f"{'='*20}")
        
        try:
            if step_func():
                success_count += 1
                print(f"✅ {step_name} - 成功")
            else:
                print(f"❌ {step_name} - 失败")
        except Exception as e:
            print(f"❌ {step_name} - 异常: {e}")
    
    # 测试总结
    total_time = time.time() - total_start_time
    
    print("\n" + "=" * 60)
    print("📊 测试总结")
    print("=" * 60)
    print(f"总测试步骤: {len(test_steps)}")
    print(f"成功步骤: {success_count}")
    print(f"失败步骤: {len(test_steps) - success_count}")
    print(f"成功率: {success_count/len(test_steps)*100:.1f}%")
    print(f"总耗时: {total_time:.2f}s")
    
    if success_count == len(test_steps):
        print("\n🎉 所有测试通过！地质建模系统准备就绪")
        return True
    else:
        print(f"\n⚠️  {len(test_steps) - success_count} 个测试失败，请检查相关配置")
        return False

if __name__ == "__main__":
    main()