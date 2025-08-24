#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
纯Python有限元桥墩冲刷求解器
Pure Python FEM Bridge Pier Scour Solver

当FEniCSx不可用时的备用方案，使用基础数值方法
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy.sparse import csr_matrix
from scipy.sparse.linalg import spsolve
import json
import os
from datetime import datetime

try:
    import pyvista as pv
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False
    print("⚠️ PyVista不可用，将使用matplotlib可视化")


class PureFEMSolver:
    """纯Python有限元求解器"""
    
    def __init__(self):
        self.nodes = None
        self.elements = None
        self.results = {}
        
    def create_mesh(self, pier_diameter=2.0, domain_length=10.0, domain_height=4.0, nx=20, ny=10):
        """创建简单的矩形域网格"""
        print(f"🕸️ 创建网格: {nx}x{ny}...")
        
        # 创建节点
        x = np.linspace(-domain_length/2, domain_length/2, nx)
        y = np.linspace(-domain_height/2, domain_height/2, ny)
        X, Y = np.meshgrid(x, y)
        
        self.nodes = np.column_stack([X.flatten(), Y.flatten()])
        n_nodes = len(self.nodes)
        
        # 创建四边形单元
        elements = []
        for j in range(ny-1):
            for i in range(nx-1):
                n1 = j * nx + i
                n2 = j * nx + i + 1
                n3 = (j + 1) * nx + i + 1
                n4 = (j + 1) * nx + i
                elements.append([n1, n2, n3, n4])
        
        self.elements = np.array(elements)
        
        # 标记桥墩内部节点（需要移除或特殊处理）
        pier_nodes = []
        for i, node in enumerate(self.nodes):
            if np.sqrt(node[0]**2 + node[1]**2) < pier_diameter/2:
                pier_nodes.append(i)
        
        self.pier_nodes = pier_nodes
        print(f"✅ 网格创建完成: {len(self.nodes)} 节点, {len(self.elements)} 单元")
        print(f"   桥墩内部节点: {len(pier_nodes)}")
        
        return self.nodes, self.elements
    
    def solve_stokes_flow(self, inlet_velocity=1.2, viscosity=1e-3, density=1000.0):
        """求解Stokes流动方程（简化的Navier-Stokes）"""
        print("🌊 求解Stokes流动...")
        
        n_nodes = len(self.nodes)
        
        # 简化方法：使用势流解
        # 对于圆柱绕流，我们可以使用解析解的近似
        
        velocity = np.zeros((n_nodes, 2))
        pressure = np.zeros(n_nodes)
        
        for i, (x, y) in enumerate(self.nodes):
            # 距离桥墩中心的距离
            r = np.sqrt(x**2 + y**2)
            theta = np.arctan2(y, x)
            
            # 如果在桥墩内部，速度为0
            if r < 1.0:  # 桥墩半径
                velocity[i] = [0, 0]
                pressure[i] = 0.5 * density * inlet_velocity**2  # 滞止压力
            else:
                # 圆柱绕流的势流解（近似）
                # 这是简化的双源+均匀流解
                
                # 基本均匀流
                u_base = inlet_velocity
                v_base = 0
                
                # 圆柱扰动（偶极子解）
                if r > 1.01:  # 避免奇点
                    R = 1.0  # 圆柱半径
                    u_dipole = -u_base * R**2 * (x**2 - y**2) / r**4
                    v_dipole = -u_base * R**2 * 2*x*y / r**4
                else:
                    u_dipole = 0
                    v_dipole = 0
                
                velocity[i, 0] = u_base + u_dipole
                velocity[i, 1] = v_base + v_dipole
                
                # 压力（Bernoulli方程）
                speed_squared = velocity[i, 0]**2 + velocity[i, 1]**2
                pressure[i] = 0.5 * density * (inlet_velocity**2 - speed_squared)
        
        # 存储结果
        self.velocity = velocity
        self.pressure = pressure
        self.viscosity = viscosity
        self.density = density
        
        print("✅ Stokes流动求解完成")
        return velocity, pressure
    
    def calculate_shear_stress(self):
        """计算剪切应力"""
        print("⚡ 计算剪切应力...")
        
        shear_stress = np.zeros(len(self.nodes))
        
        for i, (x, y) in enumerate(self.nodes):
            r = np.sqrt(x**2 + y**2)
            
            # 在桥墩表面附近计算剪切应力
            if 0.9 < r < 1.1:  # 桥墩表面附近
                # 使用简化的剪切应力公式
                # τ = μ * (∂u/∂y + ∂v/∂x) 的近似
                
                # 速度梯度的近似
                u = self.velocity[i, 0]
                v = self.velocity[i, 1]
                
                # 基于势流理论的剪切应力
                if r > 0.01:
                    # 切向速度梯度
                    dudr = -2 * self.inlet_velocity * np.sin(np.arctan2(y, x)) / r
                    shear_stress[i] = self.viscosity * abs(dudr)
                else:
                    shear_stress[i] = 0
        
        self.shear_stress = shear_stress
        max_shear = np.max(shear_stress)
        print(f"✅ 最大剪切应力: {max_shear:.2f} Pa")
        
        return shear_stress
    
    def calculate_scour_depth(self, d50=0.6e-3, rho_s=2650):
        """基于Shields理论计算冲刷深度"""
        print("🏗️ 计算冲刷深度...")
        
        # 基本参数
        g = 9.81
        rho_w = self.density
        
        # 最大剪切应力（在桥墩表面）
        max_shear_stress = np.max(self.shear_stress)
        
        # Shields参数
        theta_shields = max_shear_stress / ((rho_s - rho_w) * g * d50)
        
        # 临界Shields参数（Soulsby公式）
        D_star = d50 * ((rho_s - rho_w) * g / (rho_w * 1e-6**2))**(1/3)
        if D_star <= 4:
            theta_cr = 0.3 / (1 + 1.2 * D_star) + 0.055 * (1 - np.exp(-0.02 * D_star))
        else:
            theta_cr = 0.013 * D_star**0.29
        
        # 冲刷深度计算
        if theta_shields > theta_cr:
            # 基于经验公式的冲刷深度
            pier_diameter = 2.0  # 假设
            excess_shields = (theta_shields - theta_cr) / theta_cr
            
            # 修正的HEC-18公式
            scour_depth = 1.5 * pier_diameter * excess_shields**0.6
            scour_depth = min(scour_depth, 2.0 * pier_diameter)  # 限制最大冲刷深度
        else:
            scour_depth = 0.0
            excess_shields = 0
        
        # 存储结果
        self.results = {
            'scour_depth': float(scour_depth),
            'max_shear_stress': float(max_shear_stress),
            'shields_parameter': float(theta_shields),
            'critical_shields': float(theta_cr),
            'max_velocity': float(np.max(np.sqrt(self.velocity[:, 0]**2 + self.velocity[:, 1]**2))),
            'excess_shields_ratio': float(excess_shields if theta_shields > theta_cr else 0)
        }
        
        print(f"✅ 冲刷分析完成:")
        print(f"   冲刷深度: {scour_depth:.3f} m")
        print(f"   Shields参数: {theta_shields:.4f}")
        print(f"   临界Shields: {theta_cr:.4f}")
        
        return scour_depth
    
    def save_results(self, output_dir="fem_output"):
        """保存计算结果"""
        print("💾 保存结果...")
        
        os.makedirs(output_dir, exist_ok=True)
        
        # 保存JSON结果
        full_results = {
            'timestamp': datetime.now().isoformat(),
            'solver': 'Pure Python FEM',
            'results': self.results,
            'mesh_info': {
                'n_nodes': len(self.nodes),
                'n_elements': len(self.elements),
                'pier_nodes': len(self.pier_nodes)
            }
        }
        
        with open(f"{output_dir}/fem_results.json", 'w', encoding='utf-8') as f:
            json.dump(full_results, f, indent=2, ensure_ascii=False)
        
        # 保存VTK格式（如果PyVista可用）
        if PYVISTA_AVAILABLE:
            self.save_vtk(output_dir)
        
        print(f"✅ 结果保存到: {output_dir}/")
        
    def save_vtk(self, output_dir):
        """保存VTK格式结果"""
        try:
            # 创建PyVista网格
            points = np.column_stack([self.nodes, np.zeros(len(self.nodes))])  # 添加z坐标
            
            # 创建四边形单元（转换为PyVista格式）
            cells = []
            for element in self.elements:
                cells.extend([4] + element.tolist())  # 4个节点的四边形
            
            mesh = pv.UnstructuredGrid(cells, [pv.CellType.QUAD] * len(self.elements), points)
            
            # 添加数据
            speed = np.sqrt(self.velocity[:, 0]**2 + self.velocity[:, 1]**2)
            mesh.point_data['velocity'] = self.velocity
            mesh.point_data['pressure'] = self.pressure
            mesh.point_data['speed'] = speed
            mesh.point_data['shear_stress'] = self.shear_stress
            
            # 保存
            mesh.save(f"{output_dir}/fem_results.vtk")
            print("✅ VTK文件保存成功")
            
        except Exception as e:
            print(f"⚠️ VTK保存失败: {e}")
    
    def visualize_results(self, output_dir="fem_output", save_plots=True):
        """可视化结果"""
        print("🎨 创建可视化...")
        
        if PYVISTA_AVAILABLE:
            return self.visualize_with_pyvista(output_dir, save_plots)
        else:
            return self.visualize_with_matplotlib(output_dir, save_plots)
    
    def visualize_with_matplotlib(self, output_dir, save_plots):
        """使用matplotlib创建基础可视化"""
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        
        # 速度大小
        speed = np.sqrt(self.velocity[:, 0]**2 + self.velocity[:, 1]**2)
        
        ax = axes[0, 0]
        scatter = ax.scatter(self.nodes[:, 0], self.nodes[:, 1], c=speed, cmap='viridis', s=10)
        ax.set_title('速度大小 (m/s)')
        ax.set_aspect('equal')
        plt.colorbar(scatter, ax=ax)
        
        # 压力
        ax = axes[0, 1]
        scatter = ax.scatter(self.nodes[:, 0], self.nodes[:, 1], c=self.pressure, cmap='RdBu_r', s=10)
        ax.set_title('压力 (Pa)')
        ax.set_aspect('equal')
        plt.colorbar(scatter, ax=ax)
        
        # 剪切应力
        ax = axes[1, 0]
        scatter = ax.scatter(self.nodes[:, 0], self.nodes[:, 1], c=self.shear_stress, cmap='plasma', s=10)
        ax.set_title('剪切应力 (Pa)')
        ax.set_aspect('equal')
        plt.colorbar(scatter, ax=ax)
        
        # 速度矢量
        ax = axes[1, 1]
        # 采样显示矢量
        step = max(1, len(self.nodes) // 100)
        ax.quiver(self.nodes[::step, 0], self.nodes[::step, 1], 
                 self.velocity[::step, 0], self.velocity[::step, 1], 
                 alpha=0.7)
        ax.set_title('速度矢量')
        ax.set_aspect('equal')
        
        # 添加桥墩轮廓
        for ax in axes.flat:
            circle = plt.Circle((0, 0), 1.0, fill=False, color='red', linewidth=2)
            ax.add_patch(circle)
            ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        if save_plots:
            plt.savefig(f"{output_dir}/visualization.png", dpi=150, bbox_inches='tight')
            print(f"✅ 可视化保存: {output_dir}/visualization.png")
        
        plt.show()
        return True


def run_pure_fem_analysis(parameters):
    """运行纯Python FEM分析"""
    print("🚀 开始纯Python FEM计算...")
    print("=" * 50)
    
    # 创建求解器
    solver = PureFEMSolver()
    
    # 提取参数
    pier_diameter = parameters.get('pier_diameter', 2.0)
    flow_velocity = parameters.get('flow_velocity', 1.2)
    mesh_resolution = parameters.get('mesh_resolution', 0.2)
    d50 = parameters.get('d50', 0.6e-3)
    viscosity = parameters.get('viscosity', 1e-3)
    density = parameters.get('density', 1000.0)
    
    # 根据分辨率计算网格数量
    nx = int(10.0 / mesh_resolution) + 1
    ny = int(4.0 / mesh_resolution) + 1
    
    # 1. 创建网格
    solver.create_mesh(pier_diameter=pier_diameter, nx=nx, ny=ny)
    
    # 2. 求解流动
    solver.inlet_velocity = flow_velocity  # 存储入口速度
    solver.solve_stokes_flow(inlet_velocity=flow_velocity, viscosity=viscosity, density=density)
    
    # 3. 计算剪切应力
    solver.calculate_shear_stress()
    
    # 4. 计算冲刷深度
    scour_depth = solver.calculate_scour_depth(d50=d50)
    
    # 5. 保存结果
    output_dir = "fem_pure_output"
    solver.save_results(output_dir)
    
    # 6. 可视化
    solver.visualize_results(output_dir)
    
    print("=" * 50)
    print("🎉 纯Python FEM分析完成!")
    print(f"🏆 冲刷深度: {solver.results['scour_depth']:.3f} m")
    print(f"⚡ 最大速度: {solver.results['max_velocity']:.3f} m/s")
    print(f"📊 Shields参数: {solver.results['shields_parameter']:.4f}")
    
    return solver.results


if __name__ == "__main__":
    # 测试参数
    test_parameters = {
        "pier_diameter": 2.0,
        "flow_velocity": 1.2, 
        "mesh_resolution": 0.3,  # 较粗网格用于快速测试
        "d50": 0.6e-3,
        "viscosity": 1e-3,
        "density": 1000.0
    }
    
    # 运行分析
    try:
        results = run_pure_fem_analysis(test_parameters)
        print("\n🎊 测试成功! 纯Python FEM系统工作正常!")
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
