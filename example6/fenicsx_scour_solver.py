#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FEniCSx 2025桥墩冲刷FEM求解器
FEniCSx 2025 Bridge Pier Scour FEM Solver

功能：
1. 使用FEniCSx 2025求解Navier-Stokes方程
2. 计算桥墩周围流场
3. 基于剪切应力计算冲刷深度
4. 生成高质量VTK结果文件
5. 支持并行计算
"""

import numpy as np
import json
import time
from pathlib import Path
from mpi4py import MPI

try:
    import dolfinx
    import dolfinx.mesh
    import dolfinx.fem
    import dolfinx.io
    import dolfinx.nls.petsc
    import dolfinx.log
    import ufl
    from petsc4py import PETSc
    import gmsh
    FENICSX_AVAILABLE = True
    print("✅ FEniCSx 2025 导入成功")
except ImportError as e:
    FENICSX_AVAILABLE = False
    print(f"❌ FEniCSx 2025 导入失败: {e}")

class FEniCSxScourSolver:
    """FEniCSx桥墩冲刷求解器"""
    
    def __init__(self):
        self.comm = MPI.COMM_WORLD
        self.rank = self.comm.Get_rank()
        self.size = self.comm.Get_size()
        
    def create_pier_mesh(self, pier_diameter=2.0, domain_length=20.0, domain_width=10.0, 
                        mesh_resolution=0.1):
        """创建包含桥墩的2D网格"""
        
        if self.rank == 0:
            print(f"🔧 创建网格: 桥墩直径={pier_diameter}m, 网格分辨率={mesh_resolution}m")
        
        # 初始化gmsh
        gmsh.initialize()
        gmsh.clear()
        
        if self.rank == 0:
            # 在主进程中创建几何
            pier_radius = pier_diameter / 2
            
            # 创建矩形域
            gmsh.model.occ.addRectangle(
                -domain_length/4, -domain_width/2, 0,
                domain_length, domain_width
            )
            
            # 创建圆形桥墩
            pier_circle = gmsh.model.occ.addCircle(0, 0, 0, pier_radius)
            pier_loop = gmsh.model.occ.addCurveLoop([pier_circle])
            pier_surface = gmsh.model.occ.addPlaneSurface([pier_loop])
            
            # 从域中减去桥墩
            domain_rectangle = 1  # 矩形域的tag
            fluid_domain = gmsh.model.occ.cut([(2, domain_rectangle)], [(2, pier_surface)])
            
            # 同步几何
            gmsh.model.occ.synchronize()
            
            # 设置物理组
            all_surfaces = gmsh.model.getEntities(2)
            fluid_tag = gmsh.model.addPhysicalGroup(2, [all_surfaces[0][1]], name="fluid")
            
            # 边界设置
            all_curves = gmsh.model.getEntities(1)
            
            # 分类边界
            inlet_curves = []
            outlet_curves = []
            wall_curves = []
            pier_curves = []
            
            for curve in all_curves:
                curve_id = curve[1]
                # 获取曲线的边界框
                bbox = gmsh.model.getBoundingBox(1, curve_id)
                xmin, ymin, zmin, xmax, ymax, zmax = bbox
                
                # 判断边界类型
                if abs(xmin + domain_length/4) < 1e-6:  # 入口
                    inlet_curves.append(curve_id)
                elif abs(xmax - 3*domain_length/4) < 1e-6:  # 出口
                    outlet_curves.append(curve_id)
                elif (xmin**2 + ymin**2)**0.5 < pier_radius * 1.1:  # 桥墩
                    pier_curves.append(curve_id)
                else:  # 墙面
                    wall_curves.append(curve_id)
            
            # 添加物理组
            if inlet_curves:
                gmsh.model.addPhysicalGroup(1, inlet_curves, name="inlet")
            if outlet_curves:
                gmsh.model.addPhysicalGroup(1, outlet_curves, name="outlet")
            if wall_curves:
                gmsh.model.addPhysicalGroup(1, wall_curves, name="walls")
            if pier_curves:
                gmsh.model.addPhysicalGroup(1, pier_curves, name="pier")
            
            # 网格大小设置
            gmsh.model.mesh.setSize(gmsh.model.getEntities(0), mesh_resolution)
            
            # 桥墩附近细化
            pier_points = []
            for point in gmsh.model.getEntities(0):
                coord = gmsh.model.getValue(0, point[1], [])
                if (coord[0]**2 + coord[1]**2)**0.5 < pier_radius * 2:
                    gmsh.model.mesh.setSize([point], mesh_resolution / 3)
            
            # 生成网格
            gmsh.model.mesh.generate(2)
            
            # 优化网格质量
            gmsh.model.mesh.optimize("Netgen")
        
        # 创建DOLFINx网格
        domain, cell_tags, facet_tags = dolfinx.io.gmshio.model_to_mesh(
            gmsh.model, self.comm, rank=0, gdim=2
        )
        
        gmsh.finalize()
        
        if self.rank == 0:
            print(f"✅ 网格创建完成: {domain.topology.index_map(2).size_global} 个单元")
        
        return domain, cell_tags, facet_tags
    
    def solve_navier_stokes(self, domain, facet_tags, inlet_velocity=1.2, 
                           viscosity=1e-3, density=1000.0):
        """求解Navier-Stokes方程"""
        
        if self.rank == 0:
            print("🌊 开始求解Navier-Stokes方程...")
            print(f"   入口速度: {inlet_velocity} m/s")
            print(f"   粘度: {viscosity} Pa⋅s")
            print(f"   密度: {density} kg/m³")
        
        # Taylor-Hood元素 (P2速度, P1压力)
        P2 = ufl.VectorElement("Lagrange", domain.ufl_cell(), 2)
        P1 = ufl.FiniteElement("Lagrange", domain.ufl_cell(), 1)
        TH = ufl.MixedElement([P2, P1])
        
        W = dolfinx.fem.FunctionSpace(domain, TH)
        
        if self.rank == 0:
            print(f"✅ 函数空间创建: {W.dofmap.index_map.size_global} 个总自由度")
        
        # 定义试验函数和测试函数
        (u, p) = ufl.TrialFunctions(W)
        (v, q) = ufl.TestFunctions(W)
        
        # 解函数
        w = dolfinx.fem.Function(W)
        u_sol, p_sol = ufl.split(w)
        
        # 边界条件
        bcs = []
        
        # 入口边界条件 (抛物线速度分布)
        def inlet_profile(x):
            # 抛物线入口分布
            y_center = 0.0
            domain_height = 10.0  # 根据实际域高度调整
            y_rel = (x[1] - y_center) / (domain_height/2)
            u_max = inlet_velocity * 1.5  # 最大速度
            u_x = u_max * (1 - y_rel**2)
            return np.stack([u_x, np.zeros_like(x[0])])
        
        # 查找边界
        inlet_marker = 2  # 根据gmsh物理组标记调整
        outlet_marker = 3
        wall_marker = 4
        pier_marker = 5
        
        # 入口
        inlet_dofs = dolfinx.fem.locate_dofs_topological(
            W.sub(0), domain.topology.dim-1, 
            facet_tags.find(inlet_marker)
        )
        
        if len(inlet_dofs) > 0:
            u_inlet = dolfinx.fem.Function(W.sub(0).collapse()[0])
            u_inlet.interpolate(inlet_profile)
            bc_inlet = dolfinx.fem.dirichletbc(u_inlet, inlet_dofs, W.sub(0))
            bcs.append(bc_inlet)
        
        # 墙面和桥墩 (无滑移)
        noslip_value = dolfinx.fem.Constant(domain, (0.0, 0.0))
        
        for marker in [wall_marker, pier_marker]:
            try:
                noslip_dofs = dolfinx.fem.locate_dofs_topological(
                    W.sub(0), domain.topology.dim-1,
                    facet_tags.find(marker)
                )
                if len(noslip_dofs) > 0:
                    bc_noslip = dolfinx.fem.dirichletbc(
                        noslip_value, noslip_dofs, W.sub(0)
                    )
                    bcs.append(bc_noslip)
            except:
                pass
        
        # 出口 (零压力)
        try:
            outlet_dofs = dolfinx.fem.locate_dofs_topological(
                W.sub(1), domain.topology.dim-1,
                facet_tags.find(outlet_marker)
            )
            if len(outlet_dofs) > 0:
                bc_outlet = dolfinx.fem.dirichletbc(
                    dolfinx.fem.Constant(domain, 0.0), outlet_dofs, W.sub(1)
                )
                bcs.append(bc_outlet)
        except:
            pass
        
        if self.rank == 0:
            print(f"✅ 边界条件设置完成: {len(bcs)} 个边界条件")
        
        # 变分形式 (稳态Navier-Stokes)
        # 对流项的线性化 (Picard迭代)
        u_n = dolfinx.fem.Function(W.sub(0).collapse()[0])  # 前一次迭代的速度
        
        # 初始猜测 (均匀流)
        def initial_guess(x):
            return np.stack([np.full_like(x[0], inlet_velocity), np.zeros_like(x[0])])
        
        u_n.interpolate(initial_guess)
        
        # 稳态NS变分形式
        F = (
            # 粘性项
            viscosity * ufl.inner(ufl.grad(u_sol), ufl.grad(v)) * ufl.dx +
            # 对流项 (线性化)
            density * ufl.dot(ufl.dot(u_n, ufl.nabla_grad(u_sol)), v) * ufl.dx +
            # 压力项
            - p_sol * ufl.div(v) * ufl.dx +
            # 连续性方程
            ufl.div(u_sol) * q * ufl.dx
        )
        
        # Picard迭代求解
        max_iterations = 20
        tolerance = 1e-6
        
        for iteration in range(max_iterations):
            if self.rank == 0:
                print(f"🔄 Picard迭代 {iteration+1}/{max_iterations}")
            
            # 组装系统
            problem = dolfinx.fem.petsc.LinearProblem(
                ufl.lhs(F), ufl.rhs(F), bcs=bcs,
                petsc_options={
                    "ksp_type": "gmres",
                    "pc_type": "lu",
                    "ksp_rtol": 1e-8,
                    "ksp_atol": 1e-10
                }
            )
            
            # 求解
            w_new = problem.solve()
            
            # 提取速度分量
            u_new = w_new.sub(0).collapse()
            
            # 检查收敛性
            diff = u_new.x.array - u_n.x.array
            residual = np.linalg.norm(diff)
            
            if self.rank == 0:
                print(f"   残差: {residual:.2e}")
            
            if residual < tolerance:
                if self.rank == 0:
                    print(f"✅ Picard迭代收敛于第 {iteration+1} 次")
                break
            
            # 更新速度
            u_n.x.array[:] = u_new.x.array[:]
            
            # 更新解
            w.x.array[:] = w_new.x.array[:]
        
        else:
            if self.rank == 0:
                print("⚠️ 达到最大迭代次数，可能未完全收敛")
        
        if self.rank == 0:
            print("✅ Navier-Stokes方程求解完成")
        
        return w, u_sol, p_sol
    
    def calculate_scour_depth(self, domain, u_sol, p_sol, pier_diameter=2.0, 
                            d50=0.6e-3, sediment_density=2650.0, 
                            water_density=1000.0, viscosity=1e-3):
        """基于剪切应力计算冲刷深度"""
        
        if self.rank == 0:
            print("⚒️ 计算冲刷深度...")
        
        # 计算剪切应力
        mu = viscosity
        
        # 在桥墩表面采样
        pier_radius = pier_diameter / 2
        n_samples = 100
        
        theta = np.linspace(0, 2*np.pi, n_samples)
        pier_x = pier_radius * np.cos(theta)
        pier_y = pier_radius * np.sin(theta)
        
        max_shear_stress = 0.0
        max_velocity = 0.0
        
        # 计算桥墩表面的剪切应力
        for i in range(n_samples):
            try:
                point = np.array([pier_x[i], pier_y[i], 0.0])
                
                # 计算速度梯度
                velocity = u_sol(point)
                vel_magnitude = np.sqrt(velocity[0]**2 + velocity[1]**2)
                max_velocity = max(max_velocity, vel_magnitude)
                
                # 简化剪切应力计算 (壁面剪切)
                # 实际应该计算du/dn，这里用简化公式
                wall_distance = 0.01  # 假设壁面附近距离
                shear_rate = vel_magnitude / wall_distance
                shear_stress = mu * shear_rate
                
                max_shear_stress = max(max_shear_stress, shear_stress)
                
            except:
                continue
        
        # MPI归约找到全局最大值
        max_shear_stress = self.comm.allreduce(max_shear_stress, op=MPI.MAX)
        max_velocity = self.comm.allreduce(max_velocity, op=MPI.MAX)
        
        # Shields分析
        g = 9.81
        rho_s = sediment_density
        rho_w = water_density
        
        # Shields参数
        theta_shields = max_shear_stress / ((rho_s - rho_w) * g * d50)
        
        # 临界Shields参数 (Soulsby-Whitehouse公式)
        D_star = d50 * ((rho_s/rho_w - 1) * g / (viscosity/rho_w)**2)**(1/3)
        
        if D_star <= 4:
            theta_cr = 0.30 / (1 + 1.2 * D_star) + 0.055 * (1 - np.exp(-0.020 * D_star))
        elif D_star <= 10:
            theta_cr = 0.14 * D_star**(-0.64)
        elif D_star <= 20:
            theta_cr = 0.04 * D_star**(-0.10)
        elif D_star <= 150:
            theta_cr = 0.013 * D_star**(0.29)
        else:
            theta_cr = 0.055
        
        # 计算冲刷深度
        if theta_shields > theta_cr:
            # 修正的HEC-18公式
            excess_shields = (theta_shields - theta_cr) / theta_cr
            scour_depth = 1.5 * pier_diameter * excess_shields**0.6
            scour_depth = min(scour_depth, 2.0 * pier_diameter)  # 物理限制
        else:
            scour_depth = 0.0
        
        if self.rank == 0:
            print(f"✅ 冲刷分析完成:")
            print(f"   最大剪切应力: {max_shear_stress:.3f} Pa")
            print(f"   最大速度: {max_velocity:.3f} m/s") 
            print(f"   Shields参数: {theta_shields:.4f}")
            print(f"   临界Shields: {theta_cr:.4f}")
            print(f"   冲刷深度: {scour_depth:.3f} m")
        
        return {
            'scour_depth': scour_depth,
            'max_shear_stress': max_shear_stress,
            'max_velocity': max_velocity,
            'shields_parameter': theta_shields,
            'critical_shields': theta_cr,
            'excess_shields': max(0, theta_shields - theta_cr) / theta_cr if theta_cr > 0 else 0
        }
    
    def save_results(self, domain, u_sol, p_sol, scour_results, output_file="scour_results"):
        """保存VTK结果文件"""
        
        if self.rank == 0:
            print(f"💾 保存结果到 {output_file}.pvd")
        
        # 创建速度和压力的函数空间
        V_out = dolfinx.fem.VectorFunctionSpace(domain, ("CG", 1))
        Q_out = dolfinx.fem.FunctionSpace(domain, ("CG", 1))
        
        # 投影解到输出函数空间
        u_out = dolfinx.fem.Function(V_out, name="velocity")
        p_out = dolfinx.fem.Function(Q_out, name="pressure")
        
        u_out.interpolate(u_sol)
        p_out.interpolate(p_sol)
        
        # 计算速度大小
        speed_expr = ufl.sqrt(ufl.dot(u_sol, u_sol))
        speed_out = dolfinx.fem.Function(Q_out, name="speed")
        speed_out.interpolate(dolfinx.fem.Expression(speed_expr, Q_out.element.interpolation_points()))
        
        # 保存到VTK
        with dolfinx.io.VTKFile(self.comm, f"{output_file}.pvd", "w") as vtk:
            vtk.write_function([u_out, p_out, speed_out], 0.0)
        
        # 保存结果JSON
        if self.rank == 0:
            result_data = {
                'success': True,
                'method': 'FEniCSx-2025',
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
                'scour_results': scour_results,
                'mesh_info': {
                    'num_cells': domain.topology.index_map(2).size_global,
                    'num_vertices': domain.topology.index_map(0).size_global
                }
            }
            
            with open(f"{output_file}.json", 'w') as f:
                json.dump(result_data, f, indent=2)
            
            print(f"✅ 结果保存完成:")
            print(f"   VTK文件: {output_file}.pvd")
            print(f"   数据文件: {output_file}.json")
    
    def solve_complete_problem(self, pier_diameter=2.0, inlet_velocity=1.2, 
                             mesh_resolution=0.1, output_file="fenicsx_scour_results"):
        """完整求解问题"""
        
        start_time = time.time()
        
        if self.rank == 0:
            print("🚀 开始FEniCSx桥墩冲刷FEM计算")
            print("=" * 60)
        
        try:
            # 1. 创建网格
            domain, cell_tags, facet_tags = self.create_pier_mesh(
                pier_diameter, mesh_resolution=mesh_resolution
            )
            
            # 2. 求解流场
            w, u_sol, p_sol = self.solve_navier_stokes(
                domain, facet_tags, inlet_velocity
            )
            
            # 3. 计算冲刷
            scour_results = self.calculate_scour_depth(
                domain, u_sol, p_sol, pier_diameter
            )
            
            # 4. 保存结果
            self.save_results(domain, u_sol, p_sol, scour_results, output_file)
            
            computation_time = time.time() - start_time
            
            if self.rank == 0:
                print("=" * 60)
                print("🎉 FEniCSx计算完成!")
                print(f"⏱️ 总计算时间: {computation_time:.2f} 秒")
                print(f"🏆 冲刷深度: {scour_results['scour_depth']:.3f} m")
            
            return True, scour_results
            
        except Exception as e:
            if self.rank == 0:
                print(f"❌ 计算失败: {e}")
                import traceback
                traceback.print_exc()
            return False, None

def main():
    """主函数 - 用于直接运行测试"""
    
    if not FENICSX_AVAILABLE:
        print("❌ FEniCSx 2025未安装，无法运行")
        return
    
    # 创建求解器
    solver = FEniCSxScourSolver()
    
    # 运行计算
    success, results = solver.solve_complete_problem(
        pier_diameter=2.0,
        inlet_velocity=1.2,
        mesh_resolution=0.2,
        output_file="test_fenicsx_scour"
    )
    
    if success and solver.rank == 0:
        print("\n✅ 测试成功! 可以查看生成的VTK文件:")
        print("   ParaView: test_fenicsx_scour.pvd")

if __name__ == "__main__":
    main()