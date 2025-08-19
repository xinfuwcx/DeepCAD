"""
高级断层建模系统
Advanced Fault Modeling System

实现复杂断层网络构建、断层相互作用分析和断层演化模拟
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import pyvista as pv
from scipy.spatial import distance_matrix, ConvexHull
from scipy.optimize import minimize
from scipy.interpolate import griddata, RBFInterpolator
import json
from typing import Dict, List, Tuple, Optional, Any, Union
from dataclasses import dataclass
from enum import Enum
import warnings
warnings.filterwarnings('ignore')


class FaultType(Enum):
    """断层类型枚举"""
    NORMAL = "normal"          # 正断层
    REVERSE = "reverse"        # 逆断层
    STRIKE_SLIP = "strike_slip" # 走滑断层
    OBLIQUE = "oblique"        # 斜滑断层
    THRUST = "thrust"          # 冲断层


@dataclass
class FaultGeometry:
    """断层几何参数"""
    strike: float              # 走向 (度)
    dip: float                 # 倾角 (度)
    rake: float                # 滑动角 (度)
    length: float              # 断层长度 (m)
    width: float               # 断层宽度 (m)
    displacement: float        # 位移量 (m)


@dataclass 
class FaultKinematics:
    """断层运动学参数"""
    slip_rate: float           # 滑移速率 (mm/year)
    stress_drop: float         # 应力降 (MPa)
    friction_coefficient: float # 摩擦系数
    cohesion: float            # 粘聚力 (MPa)


class AdvancedFaultModeler:
    """高级断层建模器"""
    
    def __init__(self):
        """初始化断层建模器"""
        self.faults = {}           # 断层字典
        self.fault_network = None  # 断层网络
        self.stress_field = None   # 应力场
        self.model_bounds = None   # 模型边界
        self.mesh_resolution = 50  # 网格分辨率
        
    def add_fault(self, fault_name: str, fault_points: List[Tuple[float, float, float]],
                  fault_type: FaultType, geometry: FaultGeometry, 
                  kinematics: FaultKinematics = None):
        """
        添加断层到网络
        
        Args:
            fault_name: 断层名称
            fault_points: 断层面控制点 [(x1,y1,z1), (x2,y2,z2), ...]
            fault_type: 断层类型
            geometry: 断层几何参数
            kinematics: 断层运动学参数
        """
        fault_data = {
            'name': fault_name,
            'points': np.array(fault_points),
            'type': fault_type,
            'geometry': geometry,
            'kinematics': kinematics or FaultKinematics(0, 0, 0.6, 0),
            'surface_mesh': None,
            'displacement_field': None
        }
        
        # 生成断层面网格
        fault_data['surface_mesh'] = self._generate_fault_surface(fault_points, geometry)
        
        # 计算位移场
        fault_data['displacement_field'] = self._compute_displacement_field(fault_data)
        
        self.faults[fault_name] = fault_data
        print(f"✓ 断层已添加: {fault_name} ({fault_type.value})")
        
    def _generate_fault_surface(self, control_points: List[Tuple], 
                               geometry: FaultGeometry) -> pv.PolyData:
        """生成断层面网格"""
        points = np.array(control_points)
        
        if len(points) < 3:
            # 如果控制点少于3个，生成规则矩形断层面
            center = points.mean(axis=0) if len(points) > 0 else np.array([0, 0, 0])
            
            # 基于走向和倾角生成断层面
            strike_rad = np.radians(geometry.strike)
            dip_rad = np.radians(geometry.dip)
            
            # 断层面的四个角点
            half_length = geometry.length / 2
            half_width = geometry.width / 2
            
            # 走向方向向量
            strike_vec = np.array([np.cos(strike_rad), np.sin(strike_rad), 0])
            # 倾斜方向向量
            dip_vec = np.array([
                -np.sin(strike_rad) * np.cos(dip_rad),
                np.cos(strike_rad) * np.cos(dip_rad),
                -np.sin(dip_rad)
            ])
            
            # 生成四个角点
            corners = np.array([
                center + strike_vec * half_length + dip_vec * half_width,
                center + strike_vec * half_length - dip_vec * half_width,
                center - strike_vec * half_length - dip_vec * half_width,
                center - strike_vec * half_length + dip_vec * half_width
            ])
            
            # 创建矩形面
            faces = np.array([[4, 0, 1, 2, 3]])  # 四边形
            surface = pv.PolyData(corners, faces)
            
        else:
            # 使用控制点生成复杂断层面
            # 计算凸包作为断层面边界
            try:
                hull = ConvexHull(points)
                faces = []
                for simplex in hull.simplices:
                    faces.append([3] + simplex.tolist())  # 三角形面
                
                surface = pv.PolyData(points[hull.vertices], faces)
            except:
                # 如果凸包计算失败，使用简单的三角化
                surface = pv.PolyData(points)
                surface = surface.delaunay_2d()
        
        return surface
    
    def _compute_displacement_field(self, fault_data: Dict) -> np.ndarray:
        """计算断层位移场"""
        geometry = fault_data['geometry']
        fault_type = fault_data['type']
        
        # 根据断层类型计算位移向量
        strike_rad = np.radians(geometry.strike)
        dip_rad = np.radians(geometry.dip)
        rake_rad = np.radians(geometry.rake)
        
        # 断层坐标系
        strike_vec = np.array([np.cos(strike_rad), np.sin(strike_rad), 0])
        dip_vec = np.array([
            -np.sin(strike_rad) * np.cos(dip_rad),
            np.cos(strike_rad) * np.cos(dip_rad),
            -np.sin(dip_rad)
        ])
        normal_vec = np.cross(strike_vec, dip_vec)
        
        # 滑动向量 (基于滑动角)
        slip_vec = (np.cos(rake_rad) * strike_vec + 
                   np.sin(rake_rad) * dip_vec) * geometry.displacement
        
        return {
            'strike_vector': strike_vec,
            'dip_vector': dip_vec,
            'normal_vector': normal_vec,
            'slip_vector': slip_vec,
            'displacement_magnitude': geometry.displacement
        }
    
    def create_fault_network(self, network_config: Dict[str, List[str]]):
        """
        创建断层网络连接关系
        
        Args:
            network_config: 网络配置，如 {"fault_1": ["fault_2", "fault_3"]}
                          表示fault_1与fault_2和fault_3相交
        """
        self.fault_network = network_config
        
        # 分析断层相交关系
        intersections = self._analyze_fault_intersections()
        
        # 计算断层间的相互作用
        interactions = self._compute_fault_interactions()
        
        print(f"✓ 断层网络已创建:")
        print(f"  - 断层数量: {len(self.faults)}")
        print(f"  - 相交点: {len(intersections)}")
        print(f"  - 相互作用: {len(interactions)}")
        
        return {
            'intersections': intersections,
            'interactions': interactions
        }
    
    def _analyze_fault_intersections(self) -> List[Dict]:
        """分析断层相交关系"""
        intersections = []
        
        fault_names = list(self.faults.keys())
        
        for i, fault1_name in enumerate(fault_names):
            for j, fault2_name in enumerate(fault_names[i+1:], i+1):
                
                fault1 = self.faults[fault1_name]
                fault2 = self.faults[fault2_name]
                
                # 计算两个断层面的交线
                intersection = self._compute_fault_intersection(fault1, fault2)
                
                if intersection is not None:
                    intersections.append({
                        'fault1': fault1_name,
                        'fault2': fault2_name,
                        'intersection_line': intersection,
                        'intersection_type': self._classify_intersection_type(fault1, fault2)
                    })
        
        return intersections
    
    def _compute_fault_intersection(self, fault1: Dict, fault2: Dict) -> Optional[np.ndarray]:
        """计算两个断层面的交线"""
        try:
            surface1 = fault1['surface_mesh']
            surface2 = fault2['surface_mesh']
            
            # 简化的相交计算 - 在实际应用中需要更精确的几何算法
            points1 = surface1.points
            points2 = surface2.points
            
            # 找到最接近的点对作为近似交线
            distances = distance_matrix(points1, points2)
            min_dist_idx = np.unravel_index(distances.argmin(), distances.shape)
            
            if distances[min_dist_idx] < 50:  # 50m阈值
                intersection_point1 = points1[min_dist_idx[0]]
                intersection_point2 = points2[min_dist_idx[1]]
                return np.array([intersection_point1, intersection_point2])
            
            return None
            
        except Exception as e:
            print(f"计算断层相交失败: {e}")
            return None
    
    def _classify_intersection_type(self, fault1: Dict, fault2: Dict) -> str:
        """分类断层相交类型"""
        type1 = fault1['type']
        type2 = fault2['type']
        
        if type1 == FaultType.NORMAL and type2 == FaultType.NORMAL:
            return "horst_graben"  # 地堑地垒
        elif type1 == FaultType.STRIKE_SLIP or type2 == FaultType.STRIKE_SLIP:
            return "transtensional"  # 拉张走滑
        elif type1 == FaultType.THRUST or type2 == FaultType.THRUST:
            return "transpressional"  # 挤压冲断
        else:
            return "complex"  # 复杂相交
    
    def _compute_fault_interactions(self) -> List[Dict]:
        """计算断层间相互作用"""
        interactions = []
        
        if not self.fault_network:
            return interactions
        
        for fault1_name, connected_faults in self.fault_network.items():
            fault1 = self.faults.get(fault1_name)
            if not fault1:
                continue
                
            for fault2_name in connected_faults:
                fault2 = self.faults.get(fault2_name)
                if not fault2:
                    continue
                
                # 计算应力相互作用
                interaction = self._compute_stress_interaction(fault1, fault2)
                interactions.append({
                    'source_fault': fault1_name,
                    'target_fault': fault2_name,
                    'stress_transfer': interaction['stress_transfer'],
                    'coulomb_stress_change': interaction['coulomb_change'],
                    'interaction_strength': interaction['strength']
                })
        
        return interactions
    
    def _compute_stress_interaction(self, fault1: Dict, fault2: Dict) -> Dict:
        """计算两个断层间的应力相互作用"""
        # 简化的应力相互作用计算
        
        # 获取断层几何参数
        geom1 = fault1['geometry']
        geom2 = fault2['geometry']
        
        # 计算断层间距离
        center1 = fault1['points'].mean(axis=0)
        center2 = fault2['points'].mean(axis=0)
        distance = np.linalg.norm(center1 - center2)
        
        # 应力降 (基于Okada模型简化)
        mu = 3e10  # 剪切模量 (Pa)
        stress_drop = geom1.displacement * mu / (geom1.length * 1000)  # 简化计算
        
        # 距离衰减
        decay_factor = 1 / (1 + distance / 1000)**2  # 简化的距离衰减
        
        # 库伦应力变化
        coulomb_change = stress_drop * decay_factor * np.cos(np.radians(geom2.dip - geom1.dip))
        
        # 相互作用强度
        interaction_strength = min(1.0, abs(coulomb_change) / 1e6)  # 标准化到0-1
        
        return {
            'stress_transfer': stress_drop * decay_factor,
            'coulomb_change': coulomb_change,
            'strength': interaction_strength
        }
    
    def simulate_fault_evolution(self, time_steps: int, dt: float = 1.0) -> Dict:
        """
        模拟断层演化
        
        Args:
            time_steps: 时间步数
            dt: 时间步长 (年)
        """
        print(f"🔄 开始断层演化模拟 ({time_steps} 步, dt={dt}年)...")
        
        evolution_data = {
            'time': np.arange(0, time_steps * dt, dt),
            'displacement_history': {},
            'stress_history': {},
            'activity_history': {}
        }
        
        # 初始化各断层的演化历史
        for fault_name in self.faults.keys():
            evolution_data['displacement_history'][fault_name] = []
            evolution_data['stress_history'][fault_name] = []
            evolution_data['activity_history'][fault_name] = []
        
        # 时间循环
        for step in range(time_steps):
            current_time = step * dt
            
            # 更新每个断层的状态
            for fault_name, fault_data in self.faults.items():
                kinematics = fault_data['kinematics']
                
                # 计算累积位移
                cumulative_displacement = kinematics.slip_rate * current_time / 1000  # mm/year -> m
                
                # 简化的应力积累模型
                stress_buildup = self._compute_stress_buildup(fault_data, current_time)
                
                # 判断是否活动 (简化的摩擦准则)
                is_active = stress_buildup > (kinematics.friction_coefficient * 1e6 + 
                                            kinematics.cohesion * 1e6)
                
                # 记录历史
                evolution_data['displacement_history'][fault_name].append(cumulative_displacement)
                evolution_data['stress_history'][fault_name].append(stress_buildup / 1e6)  # 转换为MPa
                evolution_data['activity_history'][fault_name].append(int(is_active))
        
        print("✓ 断层演化模拟完成")
        return evolution_data
    
    def _compute_stress_buildup(self, fault_data: Dict, time: float) -> float:
        """计算应力积累"""
        kinematics = fault_data['kinematics']
        geometry = fault_data['geometry']
        
        # 简化的应力积累模型
        # 假设应力以恒定速率积累，在断层活动时释放
        
        base_stress_rate = 0.1e6  # 0.1 MPa/year 基础应力积累率
        slip_rate_factor = kinematics.slip_rate / 10.0  # 滑移速率影响
        
        stress_rate = base_stress_rate * (1 + slip_rate_factor)
        accumulated_stress = stress_rate * time
        
        # 考虑应力降的周期性释放 (简化)
        if kinematics.stress_drop > 0:
            cycle_time = kinematics.stress_drop / stress_rate
            if cycle_time > 0:
                cycles_completed = int(time / cycle_time)
                accumulated_stress = accumulated_stress - cycles_completed * kinematics.stress_drop
        
        return max(0, accumulated_stress)
    
    def generate_fault_visualization_data(self) -> Dict[str, pv.PolyData]:
        """生成断层可视化数据"""
        vis_data = {}
        
        for fault_name, fault_data in self.faults.items():
            surface = fault_data['surface_mesh']
            
            # 添加断层属性数据
            n_points = surface.n_points
            
            # 断层类型编码
            type_code = {
                FaultType.NORMAL: 1,
                FaultType.REVERSE: 2, 
                FaultType.STRIKE_SLIP: 3,
                FaultType.OBLIQUE: 4,
                FaultType.THRUST: 5
            }[fault_data['type']]
            
            surface['fault_type'] = np.full(n_points, type_code)
            surface['displacement'] = np.full(n_points, fault_data['geometry'].displacement)
            surface['slip_rate'] = np.full(n_points, fault_data['kinematics'].slip_rate)
            
            vis_data[fault_name] = surface
        
        return vis_data
    
    def export_fault_network(self, filepath: str):
        """导出断层网络数据"""
        try:
            export_data = {
                'faults': {},
                'network': self.fault_network,
                'model_bounds': self.model_bounds
            }
            
            # 导出断层数据
            for fault_name, fault_data in self.faults.items():
                export_data['faults'][fault_name] = {
                    'points': fault_data['points'].tolist(),
                    'type': fault_data['type'].value,
                    'geometry': {
                        'strike': fault_data['geometry'].strike,
                        'dip': fault_data['geometry'].dip,
                        'rake': fault_data['geometry'].rake,
                        'length': fault_data['geometry'].length,
                        'width': fault_data['geometry'].width,
                        'displacement': fault_data['geometry'].displacement
                    },
                    'kinematics': {
                        'slip_rate': fault_data['kinematics'].slip_rate,
                        'stress_drop': fault_data['kinematics'].stress_drop,
                        'friction_coefficient': fault_data['kinematics'].friction_coefficient,
                        'cohesion': fault_data['kinematics'].cohesion
                    }
                }
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, indent=2, ensure_ascii=False)
            
            print(f"✓ 断层网络已导出: {filepath}")
            
        except Exception as e:
            print(f"❌ 导出断层网络失败: {str(e)}")
    
    def create_fault_system_report(self) -> str:
        """生成断层系统分析报告"""
        report = []
        report.append("# 🌋 断层系统分析报告\n")
        
        # 基本统计
        report.append(f"## 📊 基本统计")
        report.append(f"- 断层总数: {len(self.faults)}")
        
        fault_types = {}
        total_displacement = 0
        total_length = 0
        
        for fault_data in self.faults.values():
            fault_type = fault_data['type'].value
            fault_types[fault_type] = fault_types.get(fault_type, 0) + 1
            total_displacement += fault_data['geometry'].displacement
            total_length += fault_data['geometry'].length
        
        report.append(f"- 总位移量: {total_displacement:.1f} m")
        report.append(f"- 总断层长度: {total_length/1000:.1f} km")
        
        # 断层类型分布
        report.append(f"\n## 🏗️ 断层类型分布")
        for fault_type, count in fault_types.items():
            percentage = count / len(self.faults) * 100
            report.append(f"- {fault_type}: {count} 个 ({percentage:.1f}%)")
        
        # 详细信息
        report.append(f"\n## 📋 详细信息")
        for fault_name, fault_data in self.faults.items():
            geom = fault_data['geometry']
            kine = fault_data['kinematics']
            
            report.append(f"\n### {fault_name}")
            report.append(f"- 类型: {fault_data['type'].value}")
            report.append(f"- 走向/倾角/滑动角: {geom.strike:.1f}°/{geom.dip:.1f}°/{geom.rake:.1f}°")
            report.append(f"- 尺寸: {geom.length/1000:.1f} km × {geom.width/1000:.1f} km")
            report.append(f"- 位移量: {geom.displacement:.1f} m")
            report.append(f"- 滑移速率: {kine.slip_rate:.2f} mm/年")
        
        return "\n".join(report)


def create_demo_fault_system():
    """创建演示断层系统"""
    print("🌋 创建高级断层系统演示...")
    
    modeler = AdvancedFaultModeler()
    
    # 添加主要正断层
    main_fault_points = [(500, 1000, 800), (1500, 1000, 600), (2500, 1000, 400)]
    main_geometry = FaultGeometry(
        strike=90,      # 东西走向
        dip=60,         # 60度倾角
        rake=-90,       # 正断层
        length=2000,    # 2km长
        width=800,      # 800m宽
        displacement=100 # 100m位移
    )
    main_kinematics = FaultKinematics(
        slip_rate=2.0,           # 2mm/年滑移速率
        stress_drop=5e6,         # 5MPa应力降
        friction_coefficient=0.6, # 摩擦系数0.6
        cohesion=1e6             # 1MPa粘聚力
    )
    
    modeler.add_fault("主断层", main_fault_points, FaultType.NORMAL, 
                     main_geometry, main_kinematics)
    
    # 添加次级走滑断层
    secondary_fault_points = [(1000, 500, 700), (1000, 1500, 700)]
    secondary_geometry = FaultGeometry(
        strike=0,       # 南北走向
        dip=90,         # 直立
        rake=0,         # 走滑断层
        length=1000,    # 1km长
        width=500,      # 500m宽
        displacement=50  # 50m位移
    )
    secondary_kinematics = FaultKinematics(
        slip_rate=1.5,
        stress_drop=3e6,
        friction_coefficient=0.65,
        cohesion=0.8e6
    )
    
    modeler.add_fault("次级断层", secondary_fault_points, FaultType.STRIKE_SLIP,
                     secondary_geometry, secondary_kinematics)
    
    # 添加冲断层
    thrust_fault_points = [(800, 800, 900), (1200, 1200, 700)]
    thrust_geometry = FaultGeometry(
        strike=45,      # 北东走向
        dip=30,         # 浅倾角
        rake=90,        # 冲断层
        length=800,     # 800m长
        width=400,      # 400m宽
        displacement=75  # 75m位移
    )
    thrust_kinematics = FaultKinematics(
        slip_rate=0.8,
        stress_drop=4e6,
        friction_coefficient=0.55,
        cohesion=1.2e6
    )
    
    modeler.add_fault("冲断层", thrust_fault_points, FaultType.THRUST,
                     thrust_geometry, thrust_kinematics)
    
    # 创建断层网络
    network_config = {
        "主断层": ["次级断层"],
        "次级断层": ["冲断层"]
    }
    
    network_analysis = modeler.create_fault_network(network_config)
    
    # 模拟断层演化
    evolution = modeler.simulate_fault_evolution(time_steps=100, dt=10)  # 1000年
    
    # 生成可视化数据
    vis_data = modeler.generate_fault_visualization_data()
    
    # 生成分析报告
    report = modeler.create_fault_system_report()
    
    # 导出数据
    modeler.export_fault_network("example3/fault_network.json")
    
    with open("example3/fault_system_report.md", 'w', encoding='utf-8') as f:
        f.write(report)
    
    print("🎉 高级断层系统演示完成！")
    print(f"  - 断层数量: {len(modeler.faults)}")
    print(f"  - 网络连接: {len(network_config)}")
    print(f"  - 相交分析: ✓")
    print(f"  - 演化模拟: ✓ (1000年)")
    print(f"  - 分析报告: ✓")
    
    return modeler, evolution, vis_data


if __name__ == "__main__":
    # 运行演示
    modeler, evolution, vis_data = create_demo_fault_system()
    
    # 简单可视化演化结果
    plt.figure(figsize=(12, 8))
    
    for i, (fault_name, displ_history) in enumerate(evolution['displacement_history'].items()):
        plt.subplot(2, 2, 1)
        plt.plot(evolution['time'], displ_history, label=fault_name)
        plt.xlabel('时间 (年)')
        plt.ylabel('累积位移 (m)')
        plt.title('断层位移演化')
        plt.legend()
        
        plt.subplot(2, 2, 2)
        plt.plot(evolution['time'], evolution['stress_history'][fault_name], label=fault_name)
        plt.xlabel('时间 (年)')
        plt.ylabel('应力 (MPa)')
        plt.title('应力积累历史')
        plt.legend()
        
        plt.subplot(2, 2, 3)
        plt.plot(evolution['time'], evolution['activity_history'][fault_name], 
                label=fault_name, alpha=0.7)
        plt.xlabel('时间 (年)')
        plt.ylabel('活动性 (0/1)')
        plt.title('断层活动历史')
        plt.legend()
    
    plt.tight_layout()
    plt.savefig('example3/fault_evolution.png', dpi=150, bbox_inches='tight')
    plt.show()
    
    print("📊 演化图表已保存到: example3/fault_evolution.png")