"""
后处理数据生成器
生成真实的CAE分析结果数据用于可视化测试
"""

import numpy as np
import logging
from typing import Dict, List, Tuple, Optional, Any
from pathlib import Path
import json
import time
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class PostProcessingField:
    """后处理字段数据结构"""
    name: str
    display_name: str
    unit: str
    field_type: str  # "scalar", "vector", "tensor"
    component_names: Optional[List[str]] = None
    data_range: Optional[Tuple[float, float]] = None
    colormap: str = "viridis"
    description: str = ""


@dataclass
class PostProcessingResults:
    """后处理结果数据结构"""
    analysis_type: str
    timestamp: float
    mesh_info: Dict[str, Any]
    fields: Dict[str, PostProcessingField]
    node_data: Dict[str, np.ndarray]
    element_data: Dict[str, np.ndarray]
    time_steps: Optional[List[float]] = None
    load_cases: Optional[List[str]] = None


class PostProcessingGenerator:
    """
    后处理数据生成器
    
    功能:
    - 生成真实的工程分析结果
    - 支持结构、热力学、流体分析
    - 时间历程和多工况数据
    - 标准CAE字段（应力、位移、温度等）
    """
    
    def __init__(self):
        self.analysis_types = {
            "structural": "结构分析",
            "thermal": "传热分析", 
            "fluid": "流体分析",
            "geomechanics": "岩土力学分析",
            "coupled": "多物理场耦合分析"
        }
        
        # 标准后处理字段定义
        self.standard_fields = {
            # 结构分析字段
            "displacement": PostProcessingField(
                name="displacement",
                display_name="位移",
                unit="mm",
                field_type="vector",
                component_names=["Ux", "Uy", "Uz"],
                colormap="plasma",
                description="节点位移矢量"
            ),
            "von_mises_stress": PostProcessingField(
                name="von_mises_stress",
                display_name="Von Mises应力",
                unit="MPa",
                field_type="scalar",
                colormap="jet",
                description="Von Mises等效应力"
            ),
            "principal_stress": PostProcessingField(
                name="principal_stress",
                display_name="主应力",
                unit="MPa", 
                field_type="vector",
                component_names=["σ1", "σ2", "σ3"],
                colormap="coolwarm",
                description="主应力分量"
            ),
            "strain_energy": PostProcessingField(
                name="strain_energy",
                display_name="应变能密度",
                unit="J/m³",
                field_type="scalar",
                colormap="viridis",
                description="弹性应变能密度"
            ),
            
            # 热分析字段
            "temperature": PostProcessingField(
                name="temperature",
                display_name="温度",
                unit="°C",
                field_type="scalar",
                colormap="hot",
                description="节点温度"
            ),
            "heat_flux": PostProcessingField(
                name="heat_flux",
                display_name="热流密度",
                unit="W/m²",
                field_type="vector",
                component_names=["qx", "qy", "qz"],
                colormap="coolwarm",
                description="热流密度矢量"
            ),
            
            # 岩土分析字段
            "pore_pressure": PostProcessingField(
                name="pore_pressure",
                display_name="孔隙水压力",
                unit="kPa",
                field_type="scalar",
                colormap="blues",
                description="土体孔隙水压力"
            ),
            "safety_factor": PostProcessingField(
                name="safety_factor",
                display_name="安全系数",
                unit="-",
                field_type="scalar",
                colormap="RdYlGn",
                description="局部安全系数"
            ),
            "settlement": PostProcessingField(
                name="settlement",
                display_name="沉降",
                unit="mm",
                field_type="scalar",
                colormap="plasma",
                description="竖向沉降"
            )
        }
    
    def generate_structural_analysis(self, 
                                   n_nodes: int,
                                   n_elements: int,
                                   mesh_bounds: List[float],
                                   time_steps: Optional[List[float]] = None,
                                   load_cases: Optional[List[str]] = None) -> PostProcessingResults:
        """生成结构分析结果"""
        
        logger.info(f"🔧 生成结构分析数据: {n_nodes} 节点, {n_elements} 单元")
        
        # 网格坐标 (简化为随机分布在边界内)
        x_coords = np.random.uniform(mesh_bounds[0], mesh_bounds[1], n_nodes)
        y_coords = np.random.uniform(mesh_bounds[2], mesh_bounds[3], n_nodes)
        z_coords = np.random.uniform(mesh_bounds[4], mesh_bounds[5], n_nodes)
        
        # 生成位移场 (基于约束条件的真实分布)
        displacement_x = self._generate_displacement_field(x_coords, y_coords, z_coords, "x")
        displacement_y = self._generate_displacement_field(x_coords, y_coords, z_coords, "y") 
        displacement_z = self._generate_displacement_field(x_coords, y_coords, z_coords, "z")
        displacement_magnitude = np.sqrt(displacement_x**2 + displacement_y**2 + displacement_z**2)
        
        # 生成应力场 (基于位移梯度)
        von_mises = self._generate_stress_field(x_coords, y_coords, z_coords, displacement_magnitude)
        
        # 主应力分量
        stress_ratio = np.random.uniform(0.3, 1.0, n_nodes)
        principal_1 = von_mises
        principal_2 = von_mises * stress_ratio
        principal_3 = von_mises * stress_ratio * 0.5
        
        # 应变能密度
        strain_energy = 0.5 * von_mises * displacement_magnitude * 1e-6  # 简化公式
        
        # 组装节点数据
        node_data = {
            "displacement": np.column_stack([displacement_x, displacement_y, displacement_z]),
            "displacement_magnitude": displacement_magnitude,
            "von_mises_stress": von_mises,
            "principal_stress": np.column_stack([principal_1, principal_2, principal_3]),
            "strain_energy": strain_energy
        }
        
        # 生成单元数据 (从节点数据插值)
        element_data = {}
        for field_name, field_data in node_data.items():
            if len(field_data.shape) == 1:
                # 标量场：取随机节点的平均值
                element_values = []
                for _ in range(n_elements):
                    random_nodes = np.random.choice(n_nodes, 4, replace=True)  # 假设四面体单元
                    element_values.append(np.mean(field_data[random_nodes]))
                element_data[field_name] = np.array(element_values)
            else:
                # 矢量场：同样处理
                element_vectors = []
                for _ in range(n_elements):
                    random_nodes = np.random.choice(n_nodes, 4, replace=True)
                    element_vectors.append(np.mean(field_data[random_nodes], axis=0))
                element_data[field_name] = np.array(element_vectors)
        
        # 更新字段数据范围
        fields = {}
        for field_name in ["displacement", "von_mises_stress", "principal_stress", "strain_energy"]:
            if field_name in self.standard_fields:
                field = self.standard_fields[field_name]
                field_copy = PostProcessingField(**asdict(field))
                
                if field_name == "displacement":
                    field_copy.data_range = (0, float(np.max(displacement_magnitude)))
                else:
                    data = node_data.get(field_name, np.array([0]))
                    if len(data.shape) == 1:
                        field_copy.data_range = (float(np.min(data)), float(np.max(data)))
                    else:
                        field_copy.data_range = (float(np.min(data)), float(np.max(data)))
                
                fields[field_name] = field_copy
        
        return PostProcessingResults(
            analysis_type="structural",
            timestamp=time.time(),
            mesh_info={
                "n_nodes": n_nodes,
                "n_elements": n_elements,
                "bounds": mesh_bounds
            },
            fields=fields,
            node_data=node_data,
            element_data=element_data,
            time_steps=time_steps,
            load_cases=load_cases
        )
    
    def generate_thermal_analysis(self,
                                n_nodes: int,
                                n_elements: int, 
                                mesh_bounds: List[float],
                                ambient_temp: float = 20.0,
                                heat_source_temp: float = 100.0) -> PostProcessingResults:
        """生成传热分析结果"""
        
        logger.info(f"🔥 生成传热分析数据: {n_nodes} 节点")
        
        # 网格坐标
        x_coords = np.random.uniform(mesh_bounds[0], mesh_bounds[1], n_nodes)
        y_coords = np.random.uniform(mesh_bounds[2], mesh_bounds[3], n_nodes)
        z_coords = np.random.uniform(mesh_bounds[4], mesh_bounds[5], n_nodes)
        
        # 生成温度场 (基于热源和边界条件)
        temperature = self._generate_temperature_field(
            x_coords, y_coords, z_coords, 
            ambient_temp, heat_source_temp, mesh_bounds
        )
        
        # 生成热流密度 (基于温度梯度)
        heat_flux_x, heat_flux_y, heat_flux_z = self._generate_heat_flux_field(
            x_coords, y_coords, z_coords, temperature
        )
        
        # 组装数据
        node_data = {
            "temperature": temperature,
            "heat_flux": np.column_stack([heat_flux_x, heat_flux_y, heat_flux_z]),
            "heat_flux_magnitude": np.sqrt(heat_flux_x**2 + heat_flux_y**2 + heat_flux_z**2)
        }
        
        # 生成单元数据
        element_data = {}
        for field_name, field_data in node_data.items():
            if len(field_data.shape) == 1:
                element_values = []
                for _ in range(n_elements):
                    random_nodes = np.random.choice(n_nodes, 4, replace=True)
                    element_values.append(np.mean(field_data[random_nodes]))
                element_data[field_name] = np.array(element_values)
        
        # 设置字段信息
        fields = {
            "temperature": self._update_field_range(
                self.standard_fields["temperature"], temperature
            ),
            "heat_flux": self._update_field_range(
                self.standard_fields["heat_flux"], node_data["heat_flux"]
            )
        }
        
        return PostProcessingResults(
            analysis_type="thermal",
            timestamp=time.time(),
            mesh_info={
                "n_nodes": n_nodes,
                "n_elements": n_elements,
                "bounds": mesh_bounds
            },
            fields=fields,
            node_data=node_data,
            element_data=element_data
        )
    
    def generate_geomechanics_analysis(self,
                                     n_nodes: int,
                                     n_elements: int,
                                     mesh_bounds: List[float],
                                     excavation_depth: float = 10.0) -> PostProcessingResults:
        """生成岩土力学分析结果"""
        
        logger.info(f"🏗️ 生成岩土分析数据: {n_nodes} 节点, 开挖深度 {excavation_depth}m")
        
        # 网格坐标
        x_coords = np.random.uniform(mesh_bounds[0], mesh_bounds[1], n_nodes)
        y_coords = np.random.uniform(mesh_bounds[2], mesh_bounds[3], n_nodes)
        z_coords = np.random.uniform(mesh_bounds[4], mesh_bounds[5], n_nodes)
        
        # 生成沉降场 (基于深度和距离开挖中心的距离)
        settlement = self._generate_settlement_field(x_coords, y_coords, z_coords, excavation_depth)
        
        # 生成孔隙水压力 (基于深度和渗流)
        pore_pressure = self._generate_pore_pressure_field(z_coords, mesh_bounds[4])
        
        # 生成安全系数 (基于应力状态)
        safety_factor = self._generate_safety_factor_field(
            x_coords, y_coords, z_coords, settlement, excavation_depth
        )
        
        # 生成变形 (基于沉降)
        displacement_x = settlement * np.random.uniform(-0.3, 0.3, n_nodes)
        displacement_y = settlement * np.random.uniform(-0.3, 0.3, n_nodes)
        displacement_z = -settlement  # 向下沉降
        
        # 组装数据
        node_data = {
            "settlement": settlement,
            "pore_pressure": pore_pressure,
            "safety_factor": safety_factor,
            "displacement": np.column_stack([displacement_x, displacement_y, displacement_z])
        }
        
        # 生成单元数据
        element_data = {}
        for field_name, field_data in node_data.items():
            if len(field_data.shape) == 1:
                element_values = []
                for _ in range(n_elements):
                    random_nodes = np.random.choice(n_nodes, 4, replace=True)
                    element_values.append(np.mean(field_data[random_nodes]))
                element_data[field_name] = np.array(element_values)
        
        # 设置字段信息
        fields = {
            "settlement": self._update_field_range(
                self.standard_fields["settlement"], settlement
            ),
            "pore_pressure": self._update_field_range(
                self.standard_fields["pore_pressure"], pore_pressure  
            ),
            "safety_factor": self._update_field_range(
                self.standard_fields["safety_factor"], safety_factor
            ),
            "displacement": self._update_field_range(
                self.standard_fields["displacement"], node_data["displacement"]
            )
        }
        
        return PostProcessingResults(
            analysis_type="geomechanics",
            timestamp=time.time(),
            mesh_info={
                "n_nodes": n_nodes,
                "n_elements": n_elements,
                "bounds": mesh_bounds,
                "excavation_depth": excavation_depth
            },
            fields=fields,
            node_data=node_data,
            element_data=element_data
        )
    
    def _generate_displacement_field(self, x: np.ndarray, y: np.ndarray, z: np.ndarray, 
                                   direction: str) -> np.ndarray:
        """生成位移场（基于真实的边界条件）"""
        
        # 简化的位移场：基于支撑条件和荷载
        if direction == "z":
            # 竖向位移：顶部自由，底部约束
            z_normalized = (z - np.min(z)) / (np.max(z) - np.min(z))
            base_displacement = -z_normalized * np.random.uniform(5, 20)  # mm
            
            # 添加局部变化
            local_variation = np.sin(x * 0.1) * np.cos(y * 0.1) * 2
            return base_displacement + local_variation
        else:
            # 水平位移：基于开挖影响
            center_x, center_y = np.mean(x), np.mean(y)
            distance_to_center = np.sqrt((x - center_x)**2 + (y - center_y)**2)
            max_distance = np.max(distance_to_center)
            
            # 径向位移模式
            displacement_magnitude = np.exp(-distance_to_center / max_distance * 3) * np.random.uniform(2, 10)
            
            if direction == "x":
                return displacement_magnitude * (x - center_x) / distance_to_center
            else:  # y direction
                return displacement_magnitude * (y - center_y) / distance_to_center
    
    def _generate_stress_field(self, x: np.ndarray, y: np.ndarray, z: np.ndarray,
                             displacement: np.ndarray) -> np.ndarray:
        """生成应力场（基于位移梯度和材料属性）"""
        
        # 基于深度的初始应力
        z_normalized = (z - np.min(z)) / (np.max(z) - np.min(z))
        initial_stress = z_normalized * 500  # kPa，基于土体自重
        
        # 基于位移的附加应力
        displacement_normalized = displacement / np.max(displacement)
        additional_stress = displacement_normalized * 200  # MPa
        
        # 应力集中系数
        stress_concentration = 1 + np.random.uniform(0, 2) * np.exp(-z_normalized)
        
        total_stress = (initial_stress + additional_stress) * stress_concentration
        
        # 添加随机变化模拟材料不均匀性
        noise = np.random.normal(0, total_stress * 0.1)
        
        return np.abs(total_stress + noise)  # 确保应力为正值
    
    def _generate_temperature_field(self, x: np.ndarray, y: np.ndarray, z: np.ndarray,
                                  ambient: float, source_temp: float, bounds: List[float]) -> np.ndarray:
        """生成温度场（基于热源和传导）"""
        
        # 热源位置（假设在中心底部）
        source_x = (bounds[0] + bounds[1]) / 2
        source_y = (bounds[2] + bounds[3]) / 2  
        source_z = bounds[4]  # 底部
        
        # 到热源的距离
        distance_to_source = np.sqrt(
            (x - source_x)**2 + (y - source_y)**2 + (z - source_z)**2
        )
        max_distance = np.max(distance_to_source)
        
        # 指数衰减温度分布
        temperature = ambient + (source_temp - ambient) * np.exp(-distance_to_source / max_distance * 2)
        
        # 添加边界冷却效应
        boundary_distance = np.minimum.reduce([
            x - bounds[0], bounds[1] - x,  # X边界
            y - bounds[2], bounds[3] - y,  # Y边界
            z - bounds[4], bounds[5] - z   # Z边界
        ])
        
        boundary_cooling = np.exp(-boundary_distance / 2) * 10
        temperature -= boundary_cooling
        
        return np.maximum(temperature, ambient)  # 不低于环境温度
    
    def _generate_heat_flux_field(self, x: np.ndarray, y: np.ndarray, z: np.ndarray,
                                temperature: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """生成热流密度场（基于温度梯度）"""
        
        # 简化的梯度计算
        thermal_conductivity = 50  # W/(m·K)
        
        # 数值梯度近似
        n = len(x)
        grad_x = np.zeros(n)
        grad_y = np.zeros(n)
        grad_z = np.zeros(n)
        
        for i in range(n):
            # 寻找临近点计算梯度
            distances = np.sqrt((x - x[i])**2 + (y - y[i])**2 + (z - z[i])**2)
            nearest_indices = np.argsort(distances)[1:4]  # 排除自身，取最近3个点
            
            if len(nearest_indices) >= 2:
                dx = np.mean(x[nearest_indices] - x[i])
                dy = np.mean(y[nearest_indices] - y[i])
                dz = np.mean(z[nearest_indices] - z[i])
                dt = np.mean(temperature[nearest_indices] - temperature[i])
                
                if dx != 0:
                    grad_x[i] = dt / dx
                if dy != 0:
                    grad_y[i] = dt / dy
                if dz != 0:
                    grad_z[i] = dt / dz
        
        # 热流密度 = -k * ∇T
        heat_flux_x = -thermal_conductivity * grad_x
        heat_flux_y = -thermal_conductivity * grad_y
        heat_flux_z = -thermal_conductivity * grad_z
        
        return heat_flux_x, heat_flux_y, heat_flux_z
    
    def _generate_settlement_field(self, x: np.ndarray, y: np.ndarray, z: np.ndarray,
                                 excavation_depth: float) -> np.ndarray:
        """生成沉降场（基于开挖影响）"""
        
        # 开挖中心
        center_x, center_y = np.mean(x), np.mean(y)
        
        # 到开挖中心的水平距离
        horizontal_distance = np.sqrt((x - center_x)**2 + (y - center_y)**2)
        influence_radius = excavation_depth * 2  # 影响半径为开挖深度的2倍
        
        # 基于深度的沉降衰减
        depth_factor = np.exp(-(z - np.min(z)) / excavation_depth)
        
        # 基于水平距离的沉降衰减
        distance_factor = np.exp(-horizontal_distance / influence_radius)
        
        # 最大沉降量
        max_settlement = excavation_depth * 0.1  # 开挖深度的10%
        
        settlement = max_settlement * depth_factor * distance_factor
        
        # 添加随机变化模拟土层不均匀性
        noise = np.random.normal(0, settlement * 0.2)
        
        return np.abs(settlement + noise)
    
    def _generate_pore_pressure_field(self, z: np.ndarray, z_min: float) -> np.ndarray:
        """生成孔隙水压力场（基于静水压力和渗流）"""
        
        # 地下水位（假设在地表下2m）
        water_table_depth = 2.0
        water_table_z = np.max(z) - water_table_depth
        
        # 水的容重
        gamma_w = 9.81  # kN/m³
        
        # 静水压力
        depth_below_water_table = np.maximum(0, water_table_z - z)
        hydrostatic_pressure = gamma_w * depth_below_water_table
        
        # 添加渗流效应（简化）
        seepage_effect = np.random.uniform(0.8, 1.2, len(z))
        
        pore_pressure = hydrostatic_pressure * seepage_effect
        
        return np.maximum(pore_pressure, 0)  # 孔压不能为负
    
    def _generate_safety_factor_field(self, x: np.ndarray, y: np.ndarray, z: np.ndarray,
                                    settlement: np.ndarray, excavation_depth: float) -> np.ndarray:
        """生成安全系数场"""
        
        # 基准安全系数
        base_safety_factor = 2.5
        
        # 基于沉降的安全系数降低
        settlement_normalized = settlement / np.max(settlement)
        settlement_reduction = settlement_normalized * 1.0
        
        # 基于深度的安全系数变化
        z_normalized = (z - np.min(z)) / (np.max(z) - np.min(z))
        depth_effect = 0.5 * z_normalized  # 深度越大安全系数越高
        
        # 基于距离开挖的位置
        center_x, center_y = np.mean(x), np.mean(y)
        distance_to_excavation = np.sqrt((x - center_x)**2 + (y - center_y)**2)
        distance_normalized = distance_to_excavation / np.max(distance_to_excavation)
        distance_effect = 0.3 * distance_normalized  # 距离开挖越远安全系数越高
        
        safety_factor = base_safety_factor - settlement_reduction + depth_effect + distance_effect
        
        # 添加随机变化
        noise = np.random.normal(0, 0.1, len(x))
        safety_factor += noise
        
        return np.maximum(safety_factor, 1.0)  # 安全系数不低于1.0
    
    def _update_field_range(self, field: PostProcessingField, data: np.ndarray) -> PostProcessingField:
        """更新字段的数据范围"""
        field_copy = PostProcessingField(**asdict(field))
        
        if len(data.shape) == 1:
            field_copy.data_range = (float(np.min(data)), float(np.max(data)))
        else:
            field_copy.data_range = (float(np.min(data)), float(np.max(data)))
        
        return field_copy


# 全局实例
_postprocessing_generator = None

def get_postprocessing_generator() -> PostProcessingGenerator:
    """获取后处理数据生成器单例"""
    global _postprocessing_generator
    if _postprocessing_generator is None:
        _postprocessing_generator = PostProcessingGenerator()
    return _postprocessing_generator