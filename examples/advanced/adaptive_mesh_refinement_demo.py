#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
自适应网格细化演示

该示例演示了自适应网格细化功能，包括基于误差估计的细化、
目标区域细化和PINN指导的细化功能。

作者: Deep Excavation Team
版本: 1.0.0
"""

import os
import sys
import numpy as np
import matplotlib.pyplot as plt
import time
import logging
from pathlib import Path
from typing import Dict, List, Any, Tuple

# 添加项目根目录到路径
ROOT_DIR = str(Path(__file__).resolve().parent.parent.parent)
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

# 导入自适应网格细化器
from src.core.meshing.adaptive_mesh_refiner import (
    AdaptiveMeshRefiner, 
    RefinementCriterion, 
    RefinementStrategy,
    MeshQuality,
    create_mesh_refiner
)

# 设置日志
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("MeshRefinementDemo")

def setup_output_dir() -> str:
    """设置输出目录"""
    output_dir = os.path.join(ROOT_DIR, "results", "mesh_refinement_demo")
    os.makedirs(output_dir, exist_ok=True)
    return output_dir

class SimpleMesh:
    """简单网格类，用于演示"""
    
    def __init__(self, nx: int = 10, ny: int = 10, domain_size: Tuple[float, float] = (10.0, 10.0)):
        """初始化简单网格
        
        参数:
            nx: x方向节点数
            ny: y方向节点数
            domain_size: 域大小 (宽度, 高度)
        """
        self.nx = nx
        self.ny = ny
        self.width, self.height = domain_size
        
        # 生成网格
        self._generate_mesh()
    
    def _generate_mesh(self):
        """生成简单网格"""
        # 生成节点坐标
        x = np.linspace(0, self.width, self.nx)
        y = np.linspace(0, self.height, self.ny)
        
        self.nodes = []
        for j in range(self.ny):
            for i in range(self.nx):
                self.nodes.append([x[i], y[j], 0.0])
        self.nodes = np.array(self.nodes)
        
        # 生成四边形单元
        self.elements = []
        for j in range(self.ny-1):
            for i in range(self.nx-1):
                # 单元节点索引 (逆时针)
                n1 = j * self.nx + i
                n2 = j * self.nx + i + 1
                n3 = (j+1) * self.nx + i + 1
                n4 = (j+1) * self.nx + i
                self.elements.append([n1, n2, n3, n4])
        self.elements = np.array(self.elements)
        
        logger.info(f"生成了简单网格，节点数: {len(self.nodes)}, 单元数: {len(self.elements)}")
    
    def compute_displacement_field(self) -> np.ndarray:
        """计算简单位移场，用于演示
        
        返回:
            位移场数组 (n_nodes, 3)
        """
        num_nodes = len(self.nodes)
        displacements = np.zeros((num_nodes, 3))
        
        # 简单位移模型：中心下沉
        for i in range(num_nodes):
            x, y = self.nodes[i, 0], self.nodes[i, 1]
            # 中心点
            cx, cy = self.width/2, self.height/2
            r = np.sqrt((x-cx)**2 + (y-cy)**2)
            mag = 0.2 * np.exp(-0.1*r**2)
            displacements[i, 2] = -mag  # z方向位移
        
        return displacements
    
    def compute_stress_field(self) -> np.ndarray:
        """计算简单应力场，用于演示
        
        返回:
            应力场数组 (n_elements, 6)
        """
        num_elements = len(self.elements)
        # 应力分量: [sigma_xx, sigma_yy, sigma_zz, sigma_xy, sigma_yz, sigma_zx]
        stresses = np.zeros((num_elements, 6))
        
        # 简单应力模型：中心区域高应力
        for i in range(num_elements):
            # 计算单元中心
            element_nodes = self.elements[i]
            node_coords = self.nodes[element_nodes]
            center = np.mean(node_coords, axis=0)
            
            # 中心点
            cx, cy = self.width/2, self.height/2
            r = np.sqrt((center[0]-cx)**2 + (center[1]-cy)**2)
            
            # 简单应力分布
            base_stress = 100 * np.exp(-0.15*r**2)
            
            # 设置应力分量
            stresses[i, 0] = base_stress  # sigma_xx
            stresses[i, 1] = base_stress * 0.8  # sigma_yy
            stresses[i, 2] = base_stress * 0.5  # sigma_zz
            
            # 切应力（使应力场更复杂）
            theta = np.arctan2(center[1]-cy, center[0]-cx)
            stresses[i, 3] = base_stress * 0.2 * np.sin(2*theta)  # sigma_xy
        
        return stresses
    
    def get_target_region(self) -> List[int]:
        """获取目标区域单元ID列表，用于目标区域细化
        
        返回:
            目标区域单元ID列表
        """
        # 示例：选择右下角区域的单元
        target_elements = []
        for i, element in enumerate(self.elements):
            # 计算单元中心
            node_coords = self.nodes[element]
            center = np.mean(node_coords, axis=0)
            
            # 选择右下角区域
            if center[0] > 0.7 * self.width and center[1] < 0.3 * self.height:
                target_elements.append(i)
        
        return target_elements
    
    def refine_element(self, element_id: int) -> Tuple[List[int], List[List[int]]]:
        """细化单个单元，返回新增节点和单元
        
        参数:
            element_id: 单元ID
            
        返回:
            (新节点ID列表, 新单元列表)
        """
        # 获取原单元节点
        element = self.elements[element_id]
        n1, n2, n3, n4 = element
        
        # 计算单元边中点
        p12 = (self.nodes[n1] + self.nodes[n2]) / 2
        p23 = (self.nodes[n2] + self.nodes[n3]) / 2
        p34 = (self.nodes[n3] + self.nodes[n4]) / 2
        p41 = (self.nodes[n4] + self.nodes[n1]) / 2
        
        # 计算单元中心点
        center = (self.nodes[n1] + self.nodes[n2] + self.nodes[n3] + self.nodes[n4]) / 4
        
        # 添加新节点
        new_node_start = len(self.nodes)
        self.nodes = np.vstack([self.nodes, p12, p23, p34, p41, center])
        
        # 新节点ID
        m12 = new_node_start
        m23 = new_node_start + 1
        m34 = new_node_start + 2
        m41 = new_node_start + 3
        mc = new_node_start + 4
        
        # 创建四个新单元
        new_elements = [
            [n1, m12, mc, m41],
            [m12, n2, m23, mc],
            [mc, m23, n3, m34],
            [m41, mc, m34, n4]
        ]
        
        # 更新元素列表，删除原单元，添加新单元
        self.elements = np.delete(self.elements, element_id, axis=0)
        self.elements = np.vstack([self.elements, new_elements])
        
        return list(range(new_node_start, new_node_start + 5)), list(range(len(self.elements) - 4, len(self.elements)))
    
    def refine_mesh(self, elements_to_refine: List[int]) -> None:
        """细化网格
        
        参数:
            elements_to_refine: 要细化的单元ID列表
        """
        if not elements_to_refine:
            logger.warning("没有需要细化的单元")
            return
        
        logger.info(f"开始细化 {len(elements_to_refine)} 个单元...")
        
        # 记录原始网格大小
        original_nodes = len(self.nodes)
        original_elements = len(self.elements)
        
        # 由于细化过程中单元ID会变化，需要从后向前处理
        elements_to_refine.sort(reverse=True)
        
        # 细化单元
        all_new_nodes = []
        all_new_elements = []
        for element_id in elements_to_refine:
            new_nodes, new_elements = self.refine_element(element_id)
            all_new_nodes.extend(new_nodes)
            all_new_elements.extend(new_elements)
        
        logger.info(f"网格细化完成，节点数: {len(self.nodes)} (+{len(self.nodes) - original_nodes}), "
                   f"单元数: {len(self.elements)} (+{len(self.elements) - original_elements})")

class SimpleMeshRefiner:
    """简单网格细化器，演示基本细化功能"""
    
    def __init__(self, mesh: SimpleMesh):
        """初始化网格细化器
        
        参数:
            mesh: 要细化的网格
        """
        self.mesh = mesh
    
    def estimate_errors(self) -> Dict[int, float]:
        """估计单元误差
        
        返回:
            单元误差字典 {element_id: error_value}
        """
        # 计算应力场
        stresses = self.mesh.compute_stress_field()
        
        # 基于应力梯度计算误差估计
        errors = {}
        
        # 为简单起见，使用应力幅值作为误差指标
        for i, element in enumerate(self.mesh.elements):
            # 使用von Mises应力作为误差指标
            sigma_x = stresses[i, 0]
            sigma_y = stresses[i, 1]
            sigma_z = stresses[i, 2]
            tau_xy = stresses[i, 3]
            
            # 简化的von Mises应力计算
            von_mises = np.sqrt(
                sigma_x**2 + sigma_y**2 + sigma_z**2 - 
                sigma_x*sigma_y - sigma_y*sigma_z - sigma_z*sigma_x + 
                3*tau_xy**2
            )
            
            errors[i] = von_mises
        
        return errors
    
    def select_elements_for_refinement(self, element_errors: Dict[int, float], 
                                      strategy: str = "adaptive", 
                                      error_threshold: float = None) -> List[int]:
        """选择需要细化的单元
        
        参数:
            element_errors: 单元误差字典
            strategy: 细化策略 ('adaptive', 'target', 'uniform')
            error_threshold: 误差阈值，如果为None，则使用百分比选择
            
        返回:
            要细化的单元ID列表
        """
        if strategy == "uniform":
            # 均匀细化：选择所有单元
            return list(range(len(self.mesh.elements)))
        
        elif strategy == "target":
            # 目标区域细化：直接返回目标区域
            return self.mesh.get_target_region()
        
        elif strategy == "adaptive":
            # 自适应细化：基于误差选择
            elements_to_refine = []
            
            if error_threshold is None:
                # 如果没有指定阈值，使用误差排序后的前20%
                sorted_errors = sorted(element_errors.items(), key=lambda x: x[1], reverse=True)
                num_to_refine = max(1, int(0.2 * len(sorted_errors)))
                elements_to_refine = [element_id for element_id, _ in sorted_errors[:num_to_refine]]
            else:
                # 使用指定的误差阈值
                max_error = max(element_errors.values())
                relative_threshold = error_threshold * max_error
                
                for element_id, error in element_errors.items():
                    if error >= relative_threshold:
                        elements_to_refine.append(element_id)
            
            return elements_to_refine
        
        else:
            raise ValueError(f"不支持的细化策略: {strategy}")
    
    def refine_mesh(self, strategy: str = "adaptive", error_threshold: float = None) -> None:
        """执行网格细化
        
        参数:
            strategy: 细化策略 ('adaptive', 'target', 'uniform')
            error_threshold: 误差阈值，如果为None，则使用百分比选择
        """
        logger.info(f"使用 {strategy} 策略进行网格细化...")
        
        # 估计误差
        element_errors = self.estimate_errors()
        
        # 选择要细化的单元
        elements_to_refine = self.select_elements_for_refinement(
            element_errors, strategy, error_threshold)
        
        # 执行细化
        self.mesh.refine_mesh(elements_to_refine)
        
        logger.info(f"{strategy} 细化完成")
        
        return elements_to_refine, element_errors

def plot_mesh(mesh: SimpleMesh, title: str, output_file: str = None, 
              element_colors: Dict[int, float] = None):
    """绘制网格
    
    参数:
        mesh: 网格对象
        title: 图表标题
        output_file: 输出文件路径，None表示不保存
        element_colors: 单元颜色值字典 {element_id: color_value}
    """
    plt.figure(figsize=(10, 8))
    
    if element_colors:
        # 如果提供了单元颜色，绘制彩色网格
        # 创建三角形集合以便使用颜色映射
        from matplotlib.collections import PolyCollection
        
        verts = []
        colors = []
        for i, element in enumerate(mesh.elements):
            # 获取单元顶点坐标
            vertices = mesh.nodes[element][:, :2]  # 只取x,y坐标
            verts.append(vertices)
            
            # 获取颜色值
            if i in element_colors:
                colors.append(element_colors[i])
            else:
                colors.append(0)
        
        # 创建多边形集合
        coll = PolyCollection(verts, array=np.array(colors), cmap='viridis', 
                             edgecolors='k', linewidth=0.5)
        plt.gca().add_collection(coll)
        plt.colorbar(coll, label='误差值')
    else:
        # 简单绘制网格线
        for element in mesh.elements:
            vertices = mesh.nodes[element][:, :2]  # 只取x,y坐标
            # 添加首个节点，闭合多边形
            vertices = np.vstack([vertices, vertices[0]])
            plt.plot(vertices[:, 0], vertices[:, 1], 'k-', linewidth=0.5)
    
    # 绘制节点
    plt.scatter(mesh.nodes[:, 0], mesh.nodes[:, 1], c='b', s=5, alpha=0.5)
    
    plt.title(title)
    plt.xlabel('X')
    plt.ylabel('Y')
    plt.axis('equal')
    plt.xlim(0, mesh.width)
    plt.ylim(0, mesh.height)
    plt.grid(True, linestyle='--', alpha=0.3)
    
    if output_file:
        plt.savefig(output_file, dpi=300)
        logger.info(f"网格图已保存到: {output_file}")
    else:
        plt.show()
    
    plt.close()

def plot_displacement_field(mesh: SimpleMesh, displacements: np.ndarray, 
                          title: str, output_file: str = None):
    """绘制位移场
    
    参数:
        mesh: 网格对象
        displacements: 位移场数组 (n_nodes, 3)
        title: 图表标题
        output_file: 输出文件路径，None表示不保存
    """
    plt.figure(figsize=(10, 8))
    
    # 获取z方向位移，用于颜色映射
    z_disp = displacements[:, 2]
    
    # 绘制网格
    for element in mesh.elements:
        vertices = mesh.nodes[element][:, :2]  # 只取x,y坐标
        vertices = np.vstack([vertices, vertices[0]])  # 闭合多边形
        plt.plot(vertices[:, 0], vertices[:, 1], 'k-', linewidth=0.5, alpha=0.3)
    
    # 绘制带颜色的节点，表示位移
    sc = plt.scatter(mesh.nodes[:, 0], mesh.nodes[:, 1], c=z_disp, 
                   cmap='coolwarm', s=20, vmin=np.min(z_disp), vmax=np.max(z_disp))
    plt.colorbar(sc, label='Z方向位移')
    
    plt.title(title)
    plt.xlabel('X')
    plt.ylabel('Y')
    plt.axis('equal')
    plt.xlim(0, mesh.width)
    plt.ylim(0, mesh.height)
    plt.grid(True, linestyle='--', alpha=0.3)
    
    if output_file:
        plt.savefig(output_file, dpi=300)
        logger.info(f"位移场图已保存到: {output_file}")
    else:
        plt.show()
    
    plt.close()

def run_adaptive_refinement_demo(initial_mesh: SimpleMesh, output_dir: str) -> None:
    """运行自适应细化演示
    
    参数:
        initial_mesh: 初始网格
        output_dir: 输出目录
    """
    logger.info("开始自适应细化演示...")
    
    # 创建网格细化器
    refiner = SimpleMeshRefiner(initial_mesh)
    
    # 绘制初始网格
    plot_mesh(initial_mesh, "初始网格", os.path.join(output_dir, "adaptive_initial_mesh.png"))
    
    # 估计初始误差
    initial_errors = refiner.estimate_errors()
    
    # 绘制初始误差分布
    element_colors = {i: error for i, error in initial_errors.items()}
    plot_mesh(initial_mesh, "初始误差分布", os.path.join(output_dir, "adaptive_initial_errors.png"), 
             element_colors=element_colors)
    
    # 执行自适应细化
    elements_to_refine, _ = refiner.refine_mesh(strategy="adaptive", error_threshold=0.7)
    
    # 绘制细化后的网格
    plot_mesh(initial_mesh, "自适应细化后的网格", os.path.join(output_dir, "adaptive_refined_mesh.png"))
    
    # 计算并绘制细化后的位移场
    refined_displacements = initial_mesh.compute_displacement_field()
    plot_displacement_field(initial_mesh, refined_displacements, 
                          "自适应细化后的位移场", 
                          os.path.join(output_dir, "adaptive_refined_displacement.png"))
    
    logger.info("自适应细化演示完成")

def run_targeted_refinement_demo(initial_mesh: SimpleMesh, output_dir: str) -> None:
    """运行目标区域细化演示
    
    参数:
        initial_mesh: 初始网格
        output_dir: 输出目录
    """
    logger.info("开始目标区域细化演示...")
    
    # 创建网格细化器
    refiner = SimpleMeshRefiner(initial_mesh)
    
    # 绘制初始网格
    plot_mesh(initial_mesh, "初始网格", os.path.join(output_dir, "targeted_initial_mesh.png"))
    
    # 获取目标区域
    target_region = initial_mesh.get_target_region()
    
    # 高亮显示目标区域
    element_colors = {i: 1.0 if i in target_region else 0.0 for i in range(len(initial_mesh.elements))}
    plot_mesh(initial_mesh, "目标细化区域", os.path.join(output_dir, "targeted_region.png"), 
             element_colors=element_colors)
    
    # 执行目标区域细化
    refiner.refine_mesh(strategy="target")
    
    # 绘制细化后的网格
    plot_mesh(initial_mesh, "目标区域细化后的网格", os.path.join(output_dir, "targeted_refined_mesh.png"))
    
    logger.info("目标区域细化演示完成")

def main():
    """主函数"""
    start_time = time.time()
    logger.info("开始自适应网格细化演示...")
    
    # 设置输出目录
    output_dir = setup_output_dir()
    logger.info(f"输出目录: {output_dir}")
    
    # 创建用于自适应细化的初始网格
    adaptive_mesh = SimpleMesh(nx=15, ny=15, domain_size=(10.0, 10.0))
    
    # 运行自适应细化演示
    run_adaptive_refinement_demo(adaptive_mesh, output_dir)
    
    # 创建用于目标区域细化的初始网格
    targeted_mesh = SimpleMesh(nx=15, ny=15, domain_size=(10.0, 10.0))
    
    # 运行目标区域细化演示
    run_targeted_refinement_demo(targeted_mesh, output_dir)
    
    elapsed_time = time.time() - start_time
    logger.info(f"自适应网格细化演示完成，总耗时: {elapsed_time:.2f}秒")

if __name__ == "__main__":
    main() 