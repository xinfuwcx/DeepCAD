#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
复杂地质测试用例生成器
生成包含12层土、100个钻孔、断层系统的专业地质数据
建模范围: 1000m x 1000m x 200m
"""

import numpy as np
import pandas as pd
from pathlib import Path
import json
import matplotlib.pyplot as plt
from typing import List, Dict, Tuple
import warnings
warnings.filterwarnings('ignore')

class ComplexGeologyGenerator:
    """复杂地质数据生成器"""
    
    def __init__(self):
        # 建模范围
        self.extent = {
            'x_min': 0, 'x_max': 1000,
            'y_min': 0, 'y_max': 1000, 
            'z_min': -200, 'z_max': 0
        }
        
        # 地层定义 (从新到老，从上到下)
        self.formations = {
            1: {'name': '填土', 'thickness': (2, 8), 'color': '#8B4513', 'density': 1.65},
            2: {'name': '粘土', 'thickness': (8, 15), 'color': '#D2691E', 'density': 1.85},
            3: {'name': '粉质粘土', 'thickness': (5, 12), 'color': '#CD853F', 'density': 1.75},
            4: {'name': '细砂', 'thickness': (10, 20), 'color': '#F4A460', 'density': 1.95},
            5: {'name': '中砂', 'thickness': (8, 18), 'color': '#DEB887', 'density': 2.05},
            6: {'name': '粗砂', 'thickness': (6, 15), 'color': '#D2B48C', 'density': 2.10},
            7: {'name': '砾砂', 'thickness': (10, 25), 'color': '#BC8F8F', 'density': 2.15},
            8: {'name': '卵石层', 'thickness': (15, 30), 'color': '#A0522D', 'density': 2.25},
            9: {'name': '强风化岩', 'thickness': (20, 40), 'color': '#8B7355', 'density': 2.40},
            10: {'name': '中风化岩', 'thickness': (25, 50), 'color': '#696969', 'density': 2.50},
            11: {'name': '微风化岩', 'thickness': (30, 60), 'color': '#2F4F4F', 'density': 2.65},
            12: {'name': '基岩', 'thickness': (50, 100), 'color': '#1C1C1C', 'density': 2.75}
        }
        
        # 断层系统定义
        self.fault_systems = [
            {
                'name': 'F1_主断层',
                'type': '正断层',
                'strike': 45,  # 走向角度
                'dip': 75,     # 倾角
                'displacement': 15,  # 断距(m)
                'x_start': 200, 'x_end': 800,
                'y_start': 150, 'y_end': 900,
                'z_top': -20, 'z_bottom': -180,
                'influence_radius': 100  # 影响范围
            },
            {
                'name': 'F2_次断层',
                'type': '逆断层', 
                'strike': 120,
                'dip': 60,
                'displacement': 8,
                'x_start': 100, 'x_end': 600,
                'y_start': 300, 'y_end': 700,
                'z_top': -40, 'z_bottom': -160,
                'influence_radius': 60
            },
            {
                'name': 'F3_小断层',
                'type': '平移断层',
                'strike': 0,
                'dip': 85,
                'displacement': 5,
                'x_start': 600, 'x_end': 950,
                'y_start': 200, 'y_end': 600,
                'z_top': -10, 'z_bottom': -120,
                'influence_radius': 40
            }
        ]
        
        # 地形起伏
        self.topography_variation = 15  # 地表起伏15m
        
    def generate_base_elevation(self, x: float, y: float) -> float:
        """生成基础地形高程"""
        # 使用多个正弦波叠加模拟自然地形
        base_elev = (
            -5 * np.sin(x * 2 * np.pi / 800) * np.cos(y * 2 * np.pi / 600) +
            -3 * np.sin(x * 2 * np.pi / 400) +
            -2 * np.cos(y * 2 * np.pi / 300) +
            np.random.normal(0, 2)  # 随机起伏
        )
        # 限制在合理范围内
        return max(-15, min(0, base_elev))
    
    def calculate_fault_influence(self, x: float, y: float, z: float, fault: Dict) -> float:
        """计算断层对地层的影响"""
        # 计算点到断层面的距离
        fault_x = fault['x_start'] + (fault['x_end'] - fault['x_start']) * \
                 ((y - fault['y_start']) / (fault['y_end'] - fault['y_start'])) \
                 if fault['y_end'] != fault['y_start'] else fault['x_start']
        
        # 距离断层的水平距离
        horizontal_dist = abs(x - fault_x)
        
        # 垂直距离影响
        vertical_factor = 1.0
        if z < fault['z_top'] and z > fault['z_bottom']:
            vertical_factor = 1.0
        else:
            vertical_factor = 0.5
        
        # 计算断层位移影响
        if horizontal_dist < fault['influence_radius']:
            influence_ratio = 1 - (horizontal_dist / fault['influence_radius'])
            displacement = fault['displacement'] * influence_ratio * vertical_factor
            
            # 根据断层类型调整位移方向
            if fault['type'] == '正断层':
                if x < fault_x:
                    return -displacement  # 下盘下降
                else:
                    return 0  # 上盘相对稳定
            elif fault['type'] == '逆断层':
                if x < fault_x:
                    return displacement  # 下盘上升
                else:
                    return 0
            else:  # 平移断层
                return displacement * 0.3 * np.sin(y * np.pi / 200)
        
        return 0
    
    def generate_formation_boundary(self, x: float, y: float, formation_id: int) -> float:
        """生成地层界面深度"""
        # 计算累积厚度到该地层顶部
        cumulative_thickness = 0
        for i in range(1, formation_id):
            thickness_range = self.formations[i]['thickness']
            avg_thickness = (thickness_range[0] + thickness_range[1]) / 2
            
            # 添加空间变化
            spatial_variation = 0.3 * avg_thickness * np.sin(x * 2 * np.pi / 500) * np.cos(y * 2 * np.pi / 400)
            local_thickness = avg_thickness + spatial_variation
            
            cumulative_thickness += local_thickness
        
        # 获取地表高程
        surface_elevation = self.generate_base_elevation(x, y)
        formation_top = surface_elevation - cumulative_thickness
        
        # 应用断层影响
        for fault in self.fault_systems:
            fault_offset = self.calculate_fault_influence(x, y, formation_top, fault)
            formation_top += fault_offset
        
        return formation_top
    
    def generate_borehole_locations(self, num_boreholes: int = 100) -> List[Tuple[float, float]]:
        """生成钻孔位置"""
        locations = []
        
        # 网格式布局 (70%)
        grid_size = int(np.sqrt(num_boreholes * 0.7))
        x_spacing = (self.extent['x_max'] - self.extent['x_min']) / (grid_size + 1)
        y_spacing = (self.extent['y_max'] - self.extent['y_min']) / (grid_size + 1)
        
        for i in range(grid_size):
            for j in range(grid_size):
                x = self.extent['x_min'] + (i + 1) * x_spacing + np.random.normal(0, x_spacing * 0.1)
                y = self.extent['y_min'] + (j + 1) * y_spacing + np.random.normal(0, y_spacing * 0.1)
                
                # 确保在范围内
                x = max(self.extent['x_min'] + 20, min(self.extent['x_max'] - 20, x))
                y = max(self.extent['y_min'] + 20, min(self.extent['y_max'] - 20, y))
                
                locations.append((x, y))
        
        # 随机布局 (30%) - 重点区域加密
        remaining = num_boreholes - len(locations)
        
        # 断层附近加密采样
        for fault in self.fault_systems:
            fault_samples = int(remaining * 0.4 / len(self.fault_systems))
            for _ in range(fault_samples):
                # 在断层线附近生成点
                t = np.random.random()
                x = fault['x_start'] + t * (fault['x_end'] - fault['x_start'])
                y = fault['y_start'] + t * (fault['y_end'] - fault['y_start'])
                
                # 添加随机偏移
                x += np.random.normal(0, 50)
                y += np.random.normal(0, 50)
                
                x = max(self.extent['x_min'], min(self.extent['x_max'], x))
                y = max(self.extent['y_min'], min(self.extent['y_max'], y))
                
                locations.append((x, y))
        
        # 完全随机点
        remaining = num_boreholes - len(locations)
        for _ in range(remaining):
            x = np.random.uniform(self.extent['x_min'] + 10, self.extent['x_max'] - 10)
            y = np.random.uniform(self.extent['y_min'] + 10, self.extent['y_max'] - 10)
            locations.append((x, y))
        
        return locations[:num_boreholes]
    
    def generate_borehole_data(self, locations: List[Tuple[float, float]]) -> pd.DataFrame:
        """生成钻孔数据"""
        borehole_data = []
        
        for idx, (x, y) in enumerate(locations):
            borehole_id = f'ZK{idx+1:03d}'
            
            # 生成该位置的地层序列
            current_depth = self.generate_base_elevation(x, y)
            
            for formation_id in range(1, 13):  # 12层
                formation_top = self.generate_formation_boundary(x, y, formation_id)
                
                # 该地层厚度
                thickness_range = self.formations[formation_id]['thickness']
                local_thickness = np.random.uniform(thickness_range[0], thickness_range[1])
                
                # 添加空间变化
                spatial_factor = 1 + 0.2 * np.sin(x * 2 * np.pi / 300) * np.cos(y * 2 * np.pi / 400)
                local_thickness *= spatial_factor
                
                formation_bottom = formation_top - local_thickness
                
                # 应用断层影响到底界
                for fault in self.fault_systems:
                    fault_offset = self.calculate_fault_influence(x, y, formation_bottom, fault)
                    formation_bottom += fault_offset * 0.8  # 底界受影响较小
                
                # 记录地层信息
                borehole_data.append({
                    'borehole_id': borehole_id,
                    'x': round(x, 2),
                    'y': round(y, 2),
                    'z_top': round(formation_top, 2),
                    'z_bottom': round(formation_bottom, 2),
                    'formation_id': formation_id,
                    'formation_name': self.formations[formation_id]['name'],
                    'thickness': round(formation_top - formation_bottom, 2),
                    'color': self.formations[formation_id]['color'],
                    'density': self.formations[formation_id]['density']
                })
                
                # 检查是否到达建模底部
                if formation_bottom <= self.extent['z_min']:
                    break
        
        return pd.DataFrame(borehole_data)
    
    def generate_surface_points(self, borehole_data: pd.DataFrame) -> pd.DataFrame:
        """从钻孔数据提取地层点"""
        surface_points = []
        
        for formation_id in range(1, 13):
            formation_data = borehole_data[borehole_data['formation_id'] == formation_id]
            
            # 每个地层选择代表性点
            sample_size = min(len(formation_data), 25)  # 每层最多25个点
            if len(formation_data) > sample_size:
                sampled_data = formation_data.sample(n=sample_size, random_state=42)
            else:
                sampled_data = formation_data
            
            for _, row in sampled_data.iterrows():
                # 地层顶面点
                surface_points.append({
                    'X': row['x'],
                    'Y': row['y'], 
                    'Z': row['z_top'],
                    'surface': row['formation_name'],
                    'formation_id': row['formation_id'],
                    'borehole_id': row['borehole_id']
                })
                
                # 地层底面点 (除了最后一层)
                if formation_id < 12:
                    surface_points.append({
                        'X': row['x'],
                        'Y': row['y'],
                        'Z': row['z_bottom'], 
                        'surface': row['formation_name'] + '_bottom',
                        'formation_id': row['formation_id'],
                        'borehole_id': row['borehole_id']
                    })
        
        return pd.DataFrame(surface_points)
    
    def generate_orientations(self) -> pd.DataFrame:
        """生成方向数据"""
        orientations = []
        
        # 每个地层生成一些方向数据
        for formation_id in range(1, 8):  # 前7层有明显的方向性
            formation = self.formations[formation_id]
            
            # 每层生成3-5个方向点
            num_orientations = np.random.randint(3, 6)
            
            for i in range(num_orientations):
                # 随机位置
                x = np.random.uniform(self.extent['x_min'] + 100, self.extent['x_max'] - 100)
                y = np.random.uniform(self.extent['y_min'] + 100, self.extent['y_max'] - 100)
                
                # 该地层的平均深度
                z = self.generate_formation_boundary(x, y, formation_id)
                z -= np.random.uniform(0, formation['thickness'][1] * 0.5)
                
                # 基础产状 (走向、倾向、倾角)
                base_azimuth = 45 + formation_id * 15  # 不同地层不同基础走向
                base_dip = 10 + formation_id * 2       # 倾角随深度增加
                
                # 添加局部变化
                azimuth = base_azimuth + np.random.normal(0, 15)
                dip = base_dip + np.random.normal(0, 5)
                
                # 断层附近产状变化更大
                for fault in self.fault_systems:
                    fault_x = fault['x_start'] + (fault['x_end'] - fault['x_start']) * 0.5
                    fault_y = fault['y_start'] + (fault['y_end'] - fault['y_start']) * 0.5
                    distance = np.sqrt((x - fault_x)**2 + (y - fault_y)**2)
                    
                    if distance < fault['influence_radius']:
                        # 断层附近产状紊乱
                        disturbance = (1 - distance / fault['influence_radius']) * 30
                        azimuth += np.random.normal(0, disturbance)
                        dip += np.random.normal(0, disturbance * 0.5)
                
                # 限制范围
                azimuth = azimuth % 360
                dip = max(0, min(90, dip))
                
                orientations.append({
                    'X': round(x, 2),
                    'Y': round(y, 2),
                    'Z': round(z, 2),
                    'surface': formation['name'],
                    'formation_id': formation_id,
                    'azimuth': round(azimuth, 1),
                    'dip': round(dip, 1),
                    'polarity': 1
                })
        
        return pd.DataFrame(orientations)
    
    def generate_fault_data(self) -> pd.DataFrame:
        """生成断层数据"""
        fault_data = []
        
        for fault in self.fault_systems:
            # 断层线上的点
            num_points = 8
            for i in range(num_points):
                t = i / (num_points - 1)
                x = fault['x_start'] + t * (fault['x_end'] - fault['x_start'])
                y = fault['y_start'] + t * (fault['y_end'] - fault['y_start'])
                z = fault['z_top'] + t * (fault['z_bottom'] - fault['z_top'])
                
                fault_data.append({
                    'X': round(x, 2),
                    'Y': round(y, 2),
                    'Z': round(z, 2),
                    'fault_name': fault['name'],
                    'fault_type': fault['type'],
                    'strike': fault['strike'],
                    'dip': fault['dip'],
                    'displacement': fault['displacement']
                })
        
        return pd.DataFrame(fault_data)
    
    def generate_project_metadata(self) -> Dict:
        """生成项目元数据"""
        return {
            'project_name': 'Complex_Geology_Test_Case',
            'description': '复杂地质测试用例 - 12层土 + 100钻孔 + 断层系统',
            'extent': self.extent,
            'coordinate_system': 'Local',
            'formations': self.formations,
            'fault_systems': self.fault_systems,
            'statistics': {
                'num_formations': 12,
                'num_boreholes': 100,
                'num_faults': len(self.fault_systems),
                'modeling_volume': (self.extent['x_max'] - self.extent['x_min']) * \
                                 (self.extent['y_max'] - self.extent['y_min']) * \
                                 (self.extent['z_max'] - self.extent['z_min']),
                'total_depth': self.extent['z_max'] - self.extent['z_min']
            },
            'generated_time': pd.Timestamp.now().isoformat(),
            'generator_version': '1.0'
        }
    
    def save_data(self, output_dir: str = None):
        """保存生成的数据"""
        if output_dir is None:
            output_dir = Path(__file__).parent
        else:
            output_dir = Path(output_dir)
        
        output_dir.mkdir(exist_ok=True)
        
        print(">> 生成复杂地质测试数据...")
        
        # 1. 生成钻孔位置
        print(">> 生成钻孔位置...")
        locations = self.generate_borehole_locations(100)
        
        # 2. 生成钻孔数据
        print(">> 生成钻孔地层数据...")
        borehole_data = self.generate_borehole_data(locations)
        
        # 3. 生成地层点
        print(">> 提取地层点数据...")
        surface_points = self.generate_surface_points(borehole_data)
        
        # 4. 生成方向数据
        print(">> 生成地层方向数据...")
        orientations = self.generate_orientations()
        
        # 5. 生成断层数据
        print(">> 生成断层数据...")
        fault_data = self.generate_fault_data()
        
        # 6. 生成项目元数据
        metadata = self.generate_project_metadata()
        
        # 保存文件
        print(">> 保存数据文件...")
        
        # CSV格式
        borehole_data.to_csv(output_dir / 'complex_borehole_data.csv', index=False, encoding='utf-8-sig')
        surface_points.to_csv(output_dir / 'complex_surface_points.csv', index=False, encoding='utf-8-sig')
        orientations.to_csv(output_dir / 'complex_orientations.csv', index=False, encoding='utf-8-sig')
        fault_data.to_csv(output_dir / 'complex_fault_data.csv', index=False, encoding='utf-8-sig')
        
        # JSON格式
        with open(output_dir / 'complex_project_metadata.json', 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        
        # 创建简化版的GemPy输入数据
        self.create_gempy_input_files(output_dir, surface_points, orientations)
        
        # 生成可视化图表
        self.create_visualization_plots(output_dir, borehole_data, fault_data, locations)
        
        print(">> 数据生成完成!")
        print(f">> 输出目录: {output_dir}")
        print(f">> 统计信息:")
        print(f"   - 钻孔数量: {len(borehole_data['borehole_id'].unique())}")
        print(f"   - 地层记录: {len(borehole_data)}")
        print(f"   - 地层点: {len(surface_points)}")
        print(f"   - 方向数据: {len(orientations)}")
        print(f"   - 断层数据: {len(fault_data)}")
        
        return {
            'borehole_data': borehole_data,
            'surface_points': surface_points, 
            'orientations': orientations,
            'fault_data': fault_data,
            'metadata': metadata
        }
    
    def create_gempy_input_files(self, output_dir: Path, surface_points: pd.DataFrame, orientations: pd.DataFrame):
        """创建GemPy兼容的输入文件"""
        # GemPy地层点格式
        gempy_points = surface_points[['X', 'Y', 'Z', 'surface']].copy()
        gempy_points.to_csv(output_dir / 'gempy_surface_points.csv', index=False)
        
        # GemPy方向数据格式
        gempy_orientations = orientations[['X', 'Y', 'Z', 'surface', 'azimuth', 'dip', 'polarity']].copy()
        gempy_orientations.to_csv(output_dir / 'gempy_orientations.csv', index=False)
        
        print(">> 已生成GemPy兼容格式文件")
    
    def create_visualization_plots(self, output_dir: Path, borehole_data: pd.DataFrame, 
                                 fault_data: pd.DataFrame, locations: List[Tuple[float, float]]):
        """创建可视化图表"""
        try:
            fig, axes = plt.subplots(2, 2, figsize=(15, 12))
            fig.suptitle('复杂地质测试用例 - 数据概览', fontsize=16, fontweight='bold')
            
            # 1. 钻孔位置分布
            ax1 = axes[0, 0]
            x_coords, y_coords = zip(*locations)
            ax1.scatter(x_coords, y_coords, c='blue', alpha=0.6, s=30)
            
            # 添加断层线
            for fault in self.fault_systems:
                ax1.plot([fault['x_start'], fault['x_end']], 
                        [fault['y_start'], fault['y_end']], 
                        'r-', linewidth=3, alpha=0.7, label=fault['name'])
            
            ax1.set_xlabel('X坐标 (m)')
            ax1.set_ylabel('Y坐标 (m)')
            ax1.set_title('钻孔位置分布 + 断层系统')
            ax1.grid(True, alpha=0.3)
            ax1.legend()
            ax1.set_aspect('equal')
            
            # 2. 地层厚度统计
            ax2 = axes[0, 1]
            formation_thickness = borehole_data.groupby('formation_name')['thickness'].mean().sort_values(ascending=False)
            formation_thickness.plot(kind='bar', ax=ax2, color='skyblue')
            ax2.set_title('各地层平均厚度')
            ax2.set_ylabel('厚度 (m)')
            ax2.tick_params(axis='x', rotation=45)
            
            # 3. 地层分布深度
            ax3 = axes[1, 0]
            for formation_id in range(1, 8):  # 显示前7层
                formation_data = borehole_data[borehole_data['formation_id'] == formation_id]
                if not formation_data.empty:
                    ax3.scatter(formation_data['x'], formation_data['z_top'], 
                              label=formation_data['formation_name'].iloc[0],
                              alpha=0.6, s=20)
            
            ax3.set_xlabel('X坐标 (m)')
            ax3.set_ylabel('标高 (m)')
            ax3.set_title('地层分布剖面 (Y=500m)')
            ax3.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
            ax3.grid(True, alpha=0.3)
            
            # 4. 断层影响分析
            ax4 = axes[1, 1]
            fault_influence_data = []
            for x in range(0, 1001, 100):
                for fault in self.fault_systems:
                    influence = abs(self.calculate_fault_influence(x, 500, -100, fault))
                    fault_influence_data.append({'x': x, 'influence': influence, 'fault': fault['name']})
            
            fault_df = pd.DataFrame(fault_influence_data)
            for fault_name in fault_df['fault'].unique():
                fault_subset = fault_df[fault_df['fault'] == fault_name]
                ax4.plot(fault_subset['x'], fault_subset['influence'], 
                        marker='o', label=fault_name, linewidth=2)
            
            ax4.set_xlabel('X坐标 (m)')
            ax4.set_ylabel('断层影响 (m)')
            ax4.set_title('断层影响强度分布')
            ax4.legend()
            ax4.grid(True, alpha=0.3)
            
            plt.tight_layout()
            plt.savefig(output_dir / 'complex_geology_overview.png', dpi=300, bbox_inches='tight')
            plt.close()
            
            print(">> 已生成数据可视化图表")
            
        except Exception as e:
            print(f">> 生成可视化图表失败: {e}")


def main():
    """主函数"""
    print("复杂地质测试用例生成器")
    print("=" * 50)
    print("设计参数:")
    print("   - 建模范围: 1000m × 1000m × 200m")
    print("   - 地层数量: 12层 (填土到基岩)")
    print("   - 钻孔数量: 100个")
    print("   - 断层系统: 3条断层 (主断层 + 次断层 + 小断层)")
    print("   - 数据类型: 钻孔、地层点、方向、断层")
    print("=" * 50)
    
    # 创建生成器
    generator = ComplexGeologyGenerator()
    
    # 生成数据
    data = generator.save_data()
    
    print("\n>> 生成完成! 数据文件包括:")
    print("   [OK] complex_borehole_data.csv - 钻孔地层数据")
    print("   [OK] complex_surface_points.csv - 地层点数据")
    print("   [OK] complex_orientations.csv - 方向数据")
    print("   [OK] complex_fault_data.csv - 断层数据")
    print("   [OK] complex_project_metadata.json - 项目元数据")
    print("   [OK] gempy_*.csv - GemPy兼容格式")
    print("   [OK] complex_geology_overview.png - 数据可视化")
    
    print("\n>> 使用方法:")
    print("   1. 启动 GEM Professional System")
    print("   2. 导入 complex_surface_points.csv")
    print("   3. 导入 complex_orientations.csv")
    print("   4. 设置建模范围: X[0,1000] Y[0,1000] Z[-200,0]")
    print("   5. 开始隐式建模")
    
    print("\n>> 数据特点:")
    print("   - 真实的地质层序 (沉积序列)")
    print("   - 复杂的断层系统影响")
    print("   - 空间变化的地层厚度")
    print("   - 符合工程地质规律")
    
    return data


if __name__ == "__main__":
    data = main()