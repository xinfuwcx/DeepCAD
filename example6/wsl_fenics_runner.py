#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WSL中的FEniCS求解器入口
专门在WSL环境中运行真正的有限元计算
"""

import sys
import json
import numpy as np
import tempfile
import time
from pathlib import Path

try:
    import dolfin as df
    import meshio
    FENICS_AVAILABLE = True
    print("FEniCS在WSL中成功导入")
except ImportError as e:
    FENICS_AVAILABLE = False
    print(f"FEniCS导入失败: {e}")
    sys.exit(1)

def solve_navier_stokes_scour(mesh_file, case_params):
    """在WSL中使用FEniCS求解Navier-Stokes方程和冲刷"""
    
    print(f"开始FEniCS计算: {mesh_file}")
    start_time = time.time()
    
    try:
        # 转换mesh格式给FEniCS
        if mesh_file.endswith('.msh'):
            # 使用meshio转换gmsh文件
            mesh_data = meshio.read(mesh_file)
            
            # 创建临时xml文件
            xml_file = mesh_file.replace('.msh', '.xml')
            meshio.write(xml_file, mesh_data)
            mesh = df.Mesh(xml_file)
        else:
            mesh = df.Mesh(mesh_file)
        
        print(f"网格加载成功: {mesh.num_vertices()} 顶点, {mesh.num_cells()} 单元")
        
        # 定义函数空间 (P2-P1 Taylor-Hood元素)
        V = df.VectorFunctionSpace(mesh, 'P', 2)  # 速度
        Q = df.FunctionSpace(mesh, 'P', 1)        # 压力
        W = df.MixedFunctionSpace([V, Q])
        
        # 定义边界条件
        pier_diameter = case_params.get('geometry', {}).get('pier_diameter', 2.0)
        inlet_velocity = case_params.get('boundary_conditions', {}).get('inlet_velocity', 1.2)
        
        # 入口边界 (left)
        def boundary_inlet(x, on_boundary):
            return on_boundary and x[0] < -pier_diameter * 8
        
        # 出口边界 (right) 
        def boundary_outlet(x, on_boundary):
            return on_boundary and x[0] > pier_diameter * 8
        
        # 墙面边界 (pier + walls)
        def boundary_walls(x, on_boundary):
            pier_dist = (x[0]**2 + x[1]**2)**0.5
            return on_boundary and (pier_dist < pier_diameter/2 + 0.1 or 
                                  abs(x[1]) > pier_diameter * 8)
        
        # 边界条件定义
        inlet_profile = df.Expression(('U0', '0'), U0=inlet_velocity, degree=2)
        bc_inlet = df.DirichletBC(W.sub(0), inlet_profile, boundary_inlet)
        bc_walls = df.DirichletBC(W.sub(0), df.Constant((0, 0)), boundary_walls)
        bc_outlet = df.DirichletBC(W.sub(1), df.Constant(0), boundary_outlet)
        
        bcs = [bc_inlet, bc_walls, bc_outlet]
        
        # 定义试验函数和解函数
        (u, p) = df.TrialFunctions(W)
        (v, q) = df.TestFunctions(W)
        w = df.Function(W)
        
        # 物理参数
        rho = 1000.0  # 水密度
        mu = 1e-3     # 动力粘度
        
        # Navier-Stokes变分形式
        F = (rho * df.dot(df.dot(df.grad(u), u), v) * df.dx +  # 对流项
             mu * df.inner(df.grad(u), df.grad(v)) * df.dx +    # 粘性项
             - p * df.div(v) * df.dx +                          # 压力项
             q * df.div(u) * df.dx)                             # 连续性方程
        
        # 线性化并求解
        a = df.lhs(F)
        L = df.rhs(F)
        
        print("开始求解Navier-Stokes方程...")
        df.solve(a == L, w, bcs)
        
        u_sol, p_sol = w.split()
        
        print("Navier-Stokes求解完成")
        
        # 计算冲刷深度 (使用Shields准则)
        # 计算桥墩表面的剪切应力
        max_velocity = 0
        max_shear_stress = 0
        
        # 采样速度场
        for x in np.linspace(-pier_diameter*10, pier_diameter*10, 100):
            for y in np.linspace(-pier_diameter*5, pier_diameter*5, 50):
                try:
                    point = df.Point(x, y)
                    if mesh.bounding_box_tree().compute_first_entity_collision(point) < mesh.num_cells():
                        vel = u_sol(point)
                        vel_mag = (vel[0]**2 + vel[1]**2)**0.5
                        max_velocity = max(max_velocity, vel_mag)
                        
                        # 简化的剪切应力计算
                        if (x**2 + y**2)**0.5 < pier_diameter/2 + 1.0:  # 桥墩附近
                            shear = mu * vel_mag / 0.1  # 简化计算
                            max_shear_stress = max(max_shear_stress, shear)
                except:
                    continue
        
        # Shields准则计算冲刷深度
        d50 = case_params.get('sediment', {}).get('d50', 0.6) / 1000  # 转换为米
        rho_s = 2650.0  # 沉积物密度
        g = 9.81
        
        # Shields参数
        tau_star = max_shear_stress / ((rho_s - rho) * g * d50)
        
        # 临界Shields参数 (Soulsby公式)
        D_star = d50 * ((rho_s - rho) * g / (mu/rho)**2)**(1/3)
        if D_star <= 4:
            tau_star_cr = 0.24 / D_star
        elif D_star <= 10:
            tau_star_cr = 0.14 * D_star**(-0.64)
        else:
            tau_star_cr = 0.04 * D_star**(-0.1)
        
        # 冲刷深度计算
        if tau_star > tau_star_cr:
            # HEC-18公式的修正版本
            K1 = 1.0  # 桥墩形状系数
            K2 = 1.0  # 攻角系数
            K3 = 1.1  # 河床条件系数
            
            water_depth = case_params.get('water_depth', 4.0)
            Fr = inlet_velocity / (g * water_depth)**0.5  # 佛洛德数
            
            scour_depth = 2.0 * K1 * K2 * K3 * pier_diameter * Fr**0.43
            scour_depth = min(scour_depth, 2.4 * pier_diameter)  # 物理限制
        else:
            scour_depth = 0.0
        
        computation_time = time.time() - start_time
        
        # 保存结果到VTK文件
        output_file = mesh_file.replace('.msh', '_result.vtk').replace('.xml', '_result.vtk')
        
        # 创建结果网格
        mesh_vtk = df.Mesh(mesh)
        V_vtk = df.VectorFunctionSpace(mesh_vtk, 'P', 1)
        Q_vtk = df.FunctionSpace(mesh_vtk, 'P', 1)
        
        # 插值解到输出网格
        u_out = df.project(u_sol, V_vtk)
        p_out = df.project(p_sol, Q_vtk)
        
        # 添加冲刷深度场
        scour_field = df.Function(Q_vtk)
        scour_values = scour_field.vector()[:]
        coordinates = mesh_vtk.coordinates()
        
        for i, coord in enumerate(coordinates):
            x, y = coord[0], coord[1]
            dist = (x**2 + y**2)**0.5
            if dist < pier_diameter * 3:
                scour_values[i] = scour_depth * np.exp(-dist**2 / (2 * pier_diameter**2))
            else:
                scour_values[i] = 0.0
        
        scour_field.vector()[:] = scour_values
        
        # 保存到VTK
        file_u = df.File(output_file.replace('.vtk', '_velocity.pvd'))
        file_p = df.File(output_file.replace('.vtk', '_pressure.pvd'))
        file_s = df.File(output_file.replace('.vtk', '_scour.pvd'))
        
        file_u << u_out
        file_p << p_out
        file_s << scour_field
        
        # 返回结果
        result = {
            "success": True,
            "method": "FEniCS-真实有限元",
            "scour_depth": float(scour_depth),
            "max_velocity": float(max_velocity),
            "max_shear_stress": float(max_shear_stress),
            "computation_time": float(computation_time),
            "reynolds_number": float(inlet_velocity * pier_diameter / (mu/rho)),
            "froude_number": float(inlet_velocity / (g * case_params.get('water_depth', 4.0))**0.5),
            "shields_parameter": float(tau_star),
            "critical_shields": float(tau_star_cr),
            "mesh_stats": {
                "vertices": mesh.num_vertices(),
                "cells": mesh.num_cells()
            },
            "output_files": {
                "velocity": output_file.replace('.vtk', '_velocity.pvd'),
                "pressure": output_file.replace('.vtk', '_pressure.pvd'),
                "scour": output_file.replace('.vtk', '_scour.pvd')
            }
        }
        
        print(f"FEniCS计算完成: 冲刷深度={scour_depth:.3f}m, 计算时间={computation_time:.2f}s")
        return result
        
    except Exception as e:
        print(f"FEniCS计算失败: {e}")
        return {
            "success": False,
            "error": str(e),
            "method": "FEniCS-失败"
        }

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='WSL FEniCS Runner')
    parser.add_argument('mesh_file', nargs='?', help='Mesh file path')
    parser.add_argument('params_json', nargs='?', help='Parameters JSON string')
    parser.add_argument('--params', help='Parameters file path')
    
    args = parser.parse_args()
    
    try:
        # 从参数文件或命令行获取参数
        if args.params:
            with open(args.params, 'r', encoding='utf-8') as f:
                case_params = json.load(f)
            mesh_file = case_params.get('mesh_file', 'default_mesh.msh')
        elif args.mesh_file and args.params_json:
            mesh_file = args.mesh_file
            case_params = json.loads(args.params_json)
        else:
            # 默认参数
            mesh_file = 'default_mesh.msh'
            case_params = {
                "pier_diameter": 2.0,
                "flow_velocity": 1.5,
                "water_depth": 4.0,
                "d50": 0.5,
                "water_density": 1000.0,
                "sediment_density": 2650.0,
                "gravity": 9.81
            }
        
        print(f"FEniCS WSL求解器启动... 网格: {mesh_file}")
        result = solve_navier_stokes_scour(mesh_file, case_params)
        print("RESULT_JSON_START")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        print("RESULT_JSON_END")
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "method": "WSL-FEniCS-异常",
            "computation_time": 0.0
        }
        print("RESULT_JSON_START")
        print(json.dumps(error_result, ensure_ascii=False, indent=2))
        print("RESULT_JSON_END")
