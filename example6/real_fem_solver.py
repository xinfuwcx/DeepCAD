#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
真正的有限元求解器 - Real Finite Element Solver
不依赖FEniCS的基础有限元实现，用于流体力学和冲刷计算
"""

import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla
from typing import Dict, Any, Tuple, Optional
import time
import logging

logger = logging.getLogger(__name__)

class SimpleFEMSolver:
    """简单的有限元求解器，实现基础的流体力学计算"""
    
    def __init__(self):
        self.mesh = None
        self.nodes = None
        self.elements = None
        self.boundary_nodes = None
        
    def create_rectangular_mesh(self, domain_size: Tuple[float, float], 
                              nx: int, ny: int, pier_center: Tuple[float, float] = (0.0, 0.0),
                              pier_radius: float = 1.0) -> bool:
        """创建矩形域的结构化网格，包含圆形桥墩"""
        try:
            Lx, Ly = domain_size
            
            # 创建网格节点
            x = np.linspace(-Lx/2, Lx/2, nx)
            y = np.linspace(0, Ly, ny)
            X, Y = np.meshgrid(x, y)
            
            # 展平为节点坐标
            nodes = np.column_stack([X.flatten(), Y.flatten()])
            
            # 移除桥墩内部的节点
            cx, cy = pier_center
            distances = np.sqrt((nodes[:, 0] - cx)**2 + (nodes[:, 1] - cy)**2)
            valid_nodes = distances > pier_radius * 0.8  # 稍微放宽以保持网格质量
            
            # 重新编号有效节点
            node_map = {}
            new_nodes = []
            new_idx = 0
            for i, valid in enumerate(valid_nodes):
                if valid:
                    node_map[i] = new_idx
                    new_nodes.append(nodes[i])
                    new_idx += 1
            
            self.nodes = np.array(new_nodes)
            
            # 创建三角形单元（每个矩形分为两个三角形）
            elements = []
            for j in range(ny - 1):
                for i in range(nx - 1):
                    # 获取矩形的四个角点索引
                    idx_base = j * nx + i
                    corners = [
                        idx_base,           # 左下
                        idx_base + 1,       # 右下
                        idx_base + nx,      # 左上
                        idx_base + nx + 1   # 右上
                    ]
                    
                    # 检查所有角点是否有效
                    if all(idx in node_map for idx in corners):
                        new_corners = [node_map[idx] for idx in corners]
                        # 分成两个三角形
                        elements.append([new_corners[0], new_corners[1], new_corners[2]])  # 下三角
                        elements.append([new_corners[1], new_corners[3], new_corners[2]])  # 上三角
            
            self.elements = np.array(elements)
            
            # 识别边界节点
            self._identify_boundary_nodes(domain_size, pier_center, pier_radius)
            
            logger.info(f"网格创建成功: {len(self.nodes)} 节点, {len(self.elements)} 单元")
            return True
            
        except Exception as e:
            logger.error(f"网格创建失败: {e}")
            return False
    
    def _identify_boundary_nodes(self, domain_size: Tuple[float, float], 
                                pier_center: Tuple[float, float], pier_radius: float):
        """识别边界节点"""
        Lx, Ly = domain_size
        cx, cy = pier_center
        
        self.boundary_nodes = {
            'inlet': [],      # 入流边界
            'outlet': [],     # 出流边界
            'walls': [],      # 壁面边界
            'pier': []        # 桥墩边界
        }
        
        tolerance = 1e-6
        
        for i, node in enumerate(self.nodes):
            x, y = node
            
            # 入流边界（左侧）
            if abs(x + Lx/2) < tolerance:
                self.boundary_nodes['inlet'].append(i)
            # 出流边界（右侧）
            elif abs(x - Lx/2) < tolerance:
                self.boundary_nodes['outlet'].append(i)
            # 上下壁面
            elif abs(y) < tolerance or abs(y - Ly) < tolerance:
                self.boundary_nodes['walls'].append(i)
            # 桥墩边界（靠近桥墩的点）
            elif abs(np.sqrt((x - cx)**2 + (y - cy)**2) - pier_radius) < pier_radius * 0.2:
                self.boundary_nodes['pier'].append(i)
    
    def solve_steady_flow(self, inlet_velocity: float, kinematic_viscosity: float = 1e-6) -> Dict[str, Any]:
        """求解稳态流动（简化Navier-Stokes方程）"""
        start_time = time.time()
        
        if self.nodes is None or self.elements is None:
            return {"success": False, "error": "网格未创建"}
        
        n_nodes = len(self.nodes)
        logger.info(f"开始求解稳态流动，节点数: {n_nodes}")
        
        try:
            # 构建刚度矩阵和载荷向量（简化的流动方程）
            K, F = self._assemble_flow_system(inlet_velocity, kinematic_viscosity)
            
            # 应用边界条件
            K_bc, F_bc = self._apply_boundary_conditions(K, F, inlet_velocity)
            
            # 求解线性系统
            logger.info("求解线性方程组...")
            solution = spla.spsolve(K_bc, F_bc)
            
            # 解析结果
            velocity_x = solution[:n_nodes]
            velocity_y = solution[n_nodes:2*n_nodes] if len(solution) >= 2*n_nodes else np.zeros(n_nodes)
            pressure = solution[2*n_nodes:] if len(solution) >= 3*n_nodes else np.zeros(n_nodes)
            
            # 计算一些关键指标
            velocity_magnitude = np.sqrt(velocity_x**2 + velocity_y**2)
            max_velocity = np.max(velocity_magnitude)
            
            # 估算壁面剪切应力
            max_shear_stress = self._estimate_wall_shear_stress(velocity_x, velocity_y, kinematic_viscosity)
            
            # 计算冲刷深度（基于剪切应力）
            scour_depth = self._calculate_scour_from_shear(max_shear_stress)
            
            computation_time = time.time() - start_time
            
            return {
                "success": True,
                "velocity_x": velocity_x,
                "velocity_y": velocity_y,
                "velocity_magnitude": velocity_magnitude,
                "pressure": pressure,
                "max_velocity": max_velocity,
                "max_shear_stress": max_shear_stress,
                "scour_depth": scour_depth,
                "computation_time": computation_time,
                "n_nodes": n_nodes,
                "n_elements": len(self.elements),
                "method": "SimpleFEM"
            }
            
        except Exception as e:
            logger.error(f"FEM求解失败: {e}")
            return {"success": False, "error": str(e)}
    
    def _assemble_flow_system(self, inlet_velocity: float, nu: float) -> Tuple[sp.csr_matrix, np.ndarray]:
        """组装流动方程的系统矩阵"""
        n_nodes = len(self.nodes)
        n_dof = 2 * n_nodes  # x和y方向速度
        
        # 初始化全局矩阵和向量
        row_idx = []
        col_idx = []
        data = []
        F = np.zeros(n_dof)
        
        # 遍历每个单元
        for elem in self.elements:
            # 获取单元节点坐标
            elem_coords = self.nodes[elem]
            
            # 计算单元刚度矩阵（简化）
            Ke, Fe = self._element_stiffness_flow(elem_coords, nu)
            
            # 组装到全局矩阵
            for i, ni in enumerate(elem):
                for j, nj in enumerate(elem):
                    # x方向自由度
                    row_idx.append(ni)
                    col_idx.append(nj)
                    data.append(Ke[i, j])
                    
                    # y方向自由度
                    row_idx.append(ni + n_nodes)
                    col_idx.append(nj + n_nodes)
                    data.append(Ke[i, j])
                
                # 组装载荷向量
                F[ni] += Fe[i]
                F[ni + n_nodes] += Fe[i]
        
        K = sp.csr_matrix((data, (row_idx, col_idx)), shape=(n_dof, n_dof))
        
        return K, F
    
    def _element_stiffness_flow(self, coords: np.ndarray, nu: float) -> Tuple[np.ndarray, np.ndarray]:
        """计算单元刚度矩阵（三角形单元）"""
        # 简化的扩散项刚度矩阵
        x1, y1 = coords[0]
        x2, y2 = coords[1]
        x3, y3 = coords[2]
        
        # 计算面积
        area = 0.5 * abs((x2-x1)*(y3-y1) - (x3-x1)*(y2-y1))
        
        if area < 1e-12:
            return np.zeros((3, 3)), np.zeros(3)
        
        # 形函数导数
        b1 = y2 - y3
        b2 = y3 - y1
        b3 = y1 - y2
        c1 = x3 - x2
        c2 = x1 - x3
        c3 = x2 - x1
        
        # 梯度矩阵
        B = np.array([[b1, b2, b3], [c1, c2, c3]]) / (2 * area)
        
        # 刚度矩阵（扩散项）
        Ke = nu * area * np.dot(B.T, B)
        
        # 对角线加上质量项（稳定性）
        mass_diag = area / 3.0
        for i in range(3):
            Ke[i, i] += mass_diag
        
        # 载荷向量（零载荷，边界条件另外处理）
        Fe = np.zeros(3)
        
        return Ke, Fe
    
    def _apply_boundary_conditions(self, K: sp.csr_matrix, F: np.ndarray, 
                                 inlet_velocity: float) -> Tuple[sp.csr_matrix, np.ndarray]:
        """应用边界条件"""
        K_bc = K.copy()
        F_bc = F.copy()
        n_nodes = len(self.nodes)
        
        # 入流边界条件（x方向速度=inlet_velocity, y方向速度=0）
        for node in self.boundary_nodes['inlet']:
            # x方向速度
            K_bc[node, :] = 0
            K_bc[node, node] = 1
            F_bc[node] = inlet_velocity
            
            # y方向速度
            K_bc[node + n_nodes, :] = 0
            K_bc[node + n_nodes, node + n_nodes] = 1
            F_bc[node + n_nodes] = 0
        
        # 壁面边界条件（无滑移：u=v=0）
        for node in self.boundary_nodes['walls'] + self.boundary_nodes['pier']:
            # x方向速度
            K_bc[node, :] = 0
            K_bc[node, node] = 1
            F_bc[node] = 0
            
            # y方向速度
            K_bc[node + n_nodes, :] = 0
            K_bc[node + n_nodes, node + n_nodes] = 1
            F_bc[node + n_nodes] = 0
        
        # 出流边界条件（自然边界条件，无需特殊处理）
        
        return K_bc, F_bc
    
    def _estimate_wall_shear_stress(self, u: np.ndarray, v: np.ndarray, nu: float) -> float:
        """估算壁面剪切应力 - 改进的计算方法"""
        if not self.boundary_nodes['pier']:
            return 0.0
        
        max_shear = 0.0
        rho = 1000.0  # 水密度
        
        # 在桥墩边界附近计算速度梯度
        for node_idx in self.boundary_nodes['pier']:
            # 寻找相邻节点
            neighbors = []
            for elem in self.elements:
                if node_idx in elem:
                    neighbors.extend([n for n in elem if n != node_idx])
            
            if len(neighbors) >= 2:
                # 计算速度梯度
                neighbors = list(set(neighbors))
                node_pos = self.nodes[node_idx]
                
                # 找到距离最近的邻居节点
                min_dist = float('inf')
                closest_neighbor = None
                for neighbor in neighbors:
                    neighbor_pos = self.nodes[neighbor]
                    dist = np.linalg.norm(neighbor_pos - node_pos)
                    if dist < min_dist and dist > 1e-10:
                        min_dist = dist
                        closest_neighbor = neighbor
                
                if closest_neighbor is not None:
                    neighbor_pos = self.nodes[closest_neighbor]
                    
                    # 计算从壁面指向流体的方向向量
                    wall_to_fluid = neighbor_pos - node_pos
                    wall_to_fluid_normalized = wall_to_fluid / np.linalg.norm(wall_to_fluid)
                    
                    # 速度差
                    du = u[closest_neighbor] - u[node_idx]  # 壁面速度为0
                    dv = v[closest_neighbor] - v[node_idx]
                    
                    # 法向速度梯度 (du/dn)
                    velocity_gradient_normal = (du * wall_to_fluid_normalized[0] + 
                                             dv * wall_to_fluid_normalized[1]) / min_dist
                    
                    # 切向速度梯度 (更重要的是切向梯度)
                    tangent_vector = np.array([-wall_to_fluid_normalized[1], wall_to_fluid_normalized[0]])
                    velocity_gradient_tangent = abs(du * tangent_vector[0] + 
                                                  dv * tangent_vector[1]) / min_dist
                    
                    # 壁面剪切应力 τ = μ * ∂u/∂n
                    shear_stress = rho * nu * max(velocity_gradient_normal, velocity_gradient_tangent)
                    
                    # 考虑速度大小对剪切应力的贡献
                    velocity_magnitude = np.sqrt(u[closest_neighbor]**2 + v[closest_neighbor]**2)
                    if velocity_magnitude > 0:
                        # 基于log-law的壁面剪切应力估算
                        y_plus = min_dist * velocity_magnitude / nu
                        if y_plus > 1:  # 避免log(0)
                            cf = 2.0 / (np.log10(y_plus) + 5.2)**2  # 经验摩擦系数
                            shear_stress_log_law = 0.5 * rho * cf * velocity_magnitude**2
                            shear_stress = max(shear_stress, shear_stress_log_law)
                    
                    max_shear = max(max_shear, shear_stress)
        
        logger.info(f"计算得到最大壁面剪切应力: {max_shear:.2f} Pa")
        return max_shear
    
    def _calculate_scour_from_shear(self, max_shear_stress: float) -> float:
        """基于剪切应力计算冲刷深度 - 使用Shields准则"""
        if max_shear_stress <= 0:
            return 0.0
        
        # 沉积物参数 (假设典型值，实际应从输入获取)
        d50 = 0.5e-3  # 0.5mm转换为米
        rho_s = 2650  # 沉积物密度
        rho = 1000    # 水密度
        g = 9.81      # 重力加速度
        
        # 计算Shields参数
        shields_parameter = max_shear_stress / ((rho_s - rho) * g * d50)
        
        # 临界Shields参数 (对于中等沙粒)
        shields_critical = 0.05
        
        logger.info(f"冲刷分析: τ={max_shear_stress:.2f} Pa, Shields={shields_parameter:.4f}, 临界值={shields_critical:.4f}")
        
        if shields_parameter > shields_critical:
            # 超过临界剪切应力，发生冲刷
            excess_shields = shields_parameter - shields_critical
            
            # 冲刷深度公式 (基于实验和理论)
            # 考虑剪切应力超额的影响
            scour_depth = 2.0 * d50 * 1000 * np.power(excess_shields / shields_critical, 0.6)
            
            # 对于桥墩冲刷，通常与桥墩直径相关
            # 假设桥墩直径为2m (应该从参数获取)
            pier_diameter = 2.0
            scour_depth = max(scour_depth, 0.5 * pier_diameter * np.sqrt(excess_shields))
            
            # 限制最大冲刷深度
            max_allowable_scour = 3.0 * pier_diameter  # 3倍桥墩直径
            scour_depth = min(scour_depth, max_allowable_scour)
            
            logger.info(f"计算冲刷深度: {scour_depth:.2f} m ({scour_depth/pier_diameter:.2f}D)")
            return scour_depth
        
        logger.info("剪切应力未超过临界值，无冲刷发生")
        return 0.0
    
    def export_to_vtk(self, solution: Dict[str, Any], filename: str) -> bool:
        """导出结果到VTK格式"""
        if not solution.get("success") or self.nodes is None:
            return False
        
        try:
            # 简单的VTK格式输出
            with open(filename, 'w') as f:
                f.write("# vtk DataFile Version 3.0\n")
                f.write("FEM Flow Solution\n")
                f.write("ASCII\n")
                f.write("DATASET UNSTRUCTURED_GRID\n")
                
                # 节点
                f.write(f"POINTS {len(self.nodes)} float\n")
                for node in self.nodes:
                    f.write(f"{node[0]} {node[1]} 0.0\n")
                
                # 单元
                f.write(f"CELLS {len(self.elements)} {len(self.elements) * 4}\n")
                for elem in self.elements:
                    f.write(f"3 {elem[0]} {elem[1]} {elem[2]}\n")
                
                f.write(f"CELL_TYPES {len(self.elements)}\n")
                for _ in self.elements:
                    f.write("5\n")  # 三角形单元类型
                
                # 数据
                f.write(f"POINT_DATA {len(self.nodes)}\n")
                
                # 速度矢量
                f.write("VECTORS velocity float\n")
                for i in range(len(self.nodes)):
                    u = solution["velocity_x"][i]
                    v = solution["velocity_y"][i]
                    f.write(f"{u} {v} 0.0\n")
                
                # 速度大小
                f.write("SCALARS velocity_magnitude float 1\n")
                f.write("LOOKUP_TABLE default\n")
                for vm in solution["velocity_magnitude"]:
                    f.write(f"{vm}\n")
                
                # 压力
                if "pressure" in solution:
                    f.write("SCALARS pressure float 1\n")
                    f.write("LOOKUP_TABLE default\n")
                    for p in solution["pressure"]:
                        f.write(f"{p}\n")
            
            return True
            
        except Exception as e:
            logger.error(f"VTK导出失败: {e}")
            return False
