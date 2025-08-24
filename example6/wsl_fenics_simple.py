#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化的WSL FEniCS求解器 - 兼容版本
"""

import sys
import json
import time
import numpy as np
import dolfin as df
import mshr

def solve_navier_stokes_2d(case_params: dict) -> dict:
    """
    Solves the steady-state incompressible Navier-Stokes equations around a 2D cylinder.
    """
    start_time = time.time()
    
    try:
        # 1. Get parameters
        pier_diameter = case_params.get('pier_diameter', 2.0)
        flow_velocity = case_params.get('flow_velocity', 1.5)
        water_depth = case_params.get('water_depth', 4.0)
        kinematic_viscosity = 1e-6  # Water viscosity

        # 2. Create Mesh
        channel_length = 40.0
        channel_width = 20.0
        pier_radius = pier_diameter / 2.0
        
        # Define the domain: a rectangle with a circular hole
        domain = mshr.Rectangle(df.Point(-channel_length / 2, -channel_width / 2),
                                df.Point(channel_length / 2, channel_width / 2))
        pier = mshr.Circle(df.Point(0, 0), pier_radius)
        domain.set_subdomain(1, pier) # Mark pier for exclusion
        
        # Generate mesh
        mesh = mshr.generate_mesh(domain, 40) # Mesh resolution
        print(f"Generated mesh with pier: {mesh.num_vertices()} vertices, {mesh.num_cells()} cells")

        # 3. Define Function Spaces (Taylor-Hood elements)
        V_element = df.VectorElement("CG", mesh.ufl_cell(), 2)
        Q_element = df.FiniteElement("CG", mesh.ufl_cell(), 1)
        W = df.FunctionSpace(mesh, df.MixedElement([V_element, Q_element]))

        # 4. Define Boundary Conditions
        # Inlet velocity profile
        inlet_velocity = df.Expression(('v_in', '0.0'), v_in=flow_velocity, degree=2)

        # Define boundaries
        def inlet_boundary(x, on_boundary):
            return on_boundary and df.near(x[0], -channel_length / 2)

        def outlet_boundary(x, on_boundary):
            return on_boundary and df.near(x[0], channel_length / 2)

        def wall_boundary(x, on_boundary):
            return on_boundary and (df.near(x[1], -channel_width / 2) or df.near(x[1], channel_width / 2))

        def pier_boundary(x, on_boundary):
            return on_boundary and (x[0]**2 + x[1]**2 < (pier_radius + 0.1)**2)

        # Apply BCs
        bc_inlet = df.DirichletBC(W.sub(0), inlet_velocity, inlet_boundary)
        bc_walls = df.DirichletBC(W.sub(0), df.Constant((0, 0)), wall_boundary)
        bc_pier = df.DirichletBC(W.sub(0), df.Constant((0, 0)), pier_boundary)
        bcs = [bc_inlet, bc_walls, bc_pier]

        # 5. Define Variational Problem (Navier-Stokes)
        (u, p) = df.TrialFunctions(W)
        (v, q) = df.TestFunctions(W)
        w_sol = df.Function(W)
        
        # Split solution to get velocity for convective term
        u_k = df.split(w_sol)[0]

        F = (df.dot(df.dot(u_k, df.grad(u)), v) * df.dx +
             kinematic_viscosity * df.inner(df.grad(u), df.grad(v)) * df.dx -
             p * df.div(v) * df.dx +
             q * df.div(u) * df.dx)
        
        # 6. Solve the system
        print("Solving non-linear Navier-Stokes system...")
        # Use a direct solver (LU) for robustness on smaller problems
        df.solve(F == 0, w_sol, bcs, solver_parameters={"newton_solver": {"solver": "lu"}})

        # 7. Post-processing
        (u_sol, p_sol) = w_sol.split(True)

        # Correctly calculate max velocity
        V_mag = df.FunctionSpace(mesh, 'P', 1)
        u_magnitude = df.project(df.sqrt(df.dot(u_sol, u_sol)), V_mag)
        max_velocity_calc = np.max(u_magnitude.vector().get_local())
        
        # Based on Shields criterion, calculate scour depth
        d50 = case_params.get('d50', 0.5e-3)
        g = case_params.get('gravity', 9.81)
        rho_s = case_params.get('sediment_density', 2650)
        rho_w = case_params.get('water_density', 1000)
        
        # Use a representative velocity near the pier for scour calculation
        # Let's take the velocity at a point just downstream of the pier
        try:
            downstream_point = df.Point(pier_radius + 0.1, 0)
            vel_at_point = u_sol(downstream_point)
            scour_velocity = np.sqrt(vel_at_point[0]**2 + vel_at_point[1]**2)
        except Exception:
            scour_velocity = max_velocity_calc # Fallback

        tau_b = 0.5 * rho_w * scour_velocity**2
        shields_number = tau_b / ((rho_s - rho_w) * g * d50)
        
        if shields_number > 0.047:
            scour_depth = 1.5 * pier_diameter * (shields_number / 0.047)**0.4
        else:
            scour_depth = 0.0
        
        scour_depth = min(scour_depth, 2.5 * pier_diameter)
        
        computation_time = time.time() - start_time
        
        result = {
            "success": True,
            "method": "WSL FEniCS Navier-Stokes",
            "scour_depth": float(scour_depth),
            "max_velocity": float(max_velocity_calc),
            "shields_number": float(shields_number),
            "computation_time": computation_time,
            "mesh_info": {
                "vertices": mesh.num_vertices(),
                "cells": mesh.num_cells(),
                "solver": "FEniCS Newton (LU)"
            },
            "physics": {
                "reynolds_number": flow_velocity * pier_diameter / kinematic_viscosity,
                "froude_number": flow_velocity / np.sqrt(g * water_depth)
            }
        }
        
        print(f"Navier-Stokes calculation successful: Scour Depth={scour_depth:.3f}m, Max Velocity={max_velocity_calc:.3f}m/s")
        return result
        
    except Exception as e:
        print(f"FEniCS calculation failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "method": "FEniCS-NavierStokes-Failed"
        }

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='WSL FEniCS Navier-Stokes Runner')
    parser.add_argument('--params', help='Parameters file path')
    
    args = parser.parse_args()
    
    try:
        if args.params:
            with open(args.params, 'r', encoding='utf-8') as f:
                case_params = json.load(f)
        else:
            # Default parameters for testing
            case_params = {
                "pier_diameter": 2.0, "flow_velocity": 1.5, "water_depth": 4.0,
                "d50": 0.5e-3, "water_density": 1000.0, "sediment_density": 2650.0,
                "gravity": 9.81
            }
        
        print("Navier-Stokes FEniCS solver starting...")
        result = solve_navier_stokes_2d(case_params)
        print("RESULT_JSON_START")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        print("RESULT_JSON_END")
        
    except Exception as e:
        error_result = {
            "success": False, "error": str(e), "method": "WSL-FEniCS-Wrapper-Exception"
        }
        print("RESULT_JSON_START")
        print(json.dumps(error_result, ensure_ascii=False, indent=2))
        print("RESULT_JSON_END")
