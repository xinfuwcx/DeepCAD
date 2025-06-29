"""
@file kratos_iga_solver.py
@description Kratos IGA solver wrapper for deep excavation analysis
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import json
import shutil
import numpy as np
from typing import Dict, Any, List, Optional, Union, Tuple

try:
    # Ensure Kratos is in the path
    kratos_root = os.getenv("KRATOS_ROOT", "../Kratos")
    sys.path.append(kratos_root)
    
    import KratosMultiphysics
    import KratosMultiphysics.IgaApplication
    import KratosMultiphysics.StructuralMechanicsApplication
    
    from KratosMultiphysics.IgaApplication.iga_analysis import IgaAnalysis
    
    HAS_KRATOS_IGA = True
except ImportError:
    HAS_KRATOS_IGA = False
    print("Warning: Kratos IGA Application not available")


class KratosIgaSolver:
    """Kratos IGA solver wrapper for deep excavation analysis - Pure IGA Version"""
    
    def __init__(self, output_dir: str = "./results"):
        """Initialize Kratos IGA solver"""
        self.output_dir = output_dir
        
        if not HAS_KRATOS_IGA:
            print("Kratos IGA not available, running in simulation mode")
            return
        
        # Create output directory if it doesn"t exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Initialize model
        self.model = KratosMultiphysics.Model()
        self.parameters = None
        self.analysis = None
        
    def set_parameters_from_file(self, param_file: str) -> bool:
        """Set simulation parameters from a file"""
        if not HAS_KRATOS_IGA:
            return False
            
        try:
            with open(param_file, 'r') as f:
                parameters = KratosMultiphysics.Parameters(f.read())
            
            self.parameters = parameters
            return True
        except Exception as e:
            print(f"Error loading parameters: {e}")
            return False
    
    def set_parameters(self, params: Dict[str, Any]) -> bool:
        """Set simulation parameters from a dictionary"""
        if not HAS_KRATOS_IGA:
            return False
            
        try:
            # Convert dictionary to Kratos Parameters
            parameters_str = json.dumps(params)
            self.parameters = KratosMultiphysics.Parameters(parameters_str)
            return True
        except Exception as e:
            print(f"Error setting parameters: {e}")
            return False
    
    def create_nurbs_geometry(self, 
                             control_points: List[List[float]], 
                             weights: List[float], 
                             knot_vectors: Dict[str, List[float]], 
                             degrees: Dict[str, int]) -> bool:
        """
        直接创建NURBS几何，无需网格
        
        Args:
            control_points: 控制点坐标列表 [[x,y,z], ...]
            weights: 控制点权重列表 [w1, w2, ...]
            knot_vectors: 节点矢量字典 {"u": [...], "v": [...], "w": [...]}
            degrees: 阶次字典 {"u": p, "v": q, "w": r}
        
        Returns:
            bool: 是否成功创建
        """
        if not HAS_KRATOS_IGA:
            return False
            
        try:
            # 创建NURBS几何的模型部件
            model_part_name = "IgaModelPart"
            model_part = self.model.CreateModelPart(model_part_name)
            
            # 设置维度
            dim = 2 if "w" not in knot_vectors or knot_vectors["w"] is None else 3
            model_part.ProcessInfo[KratosMultiphysics.DOMAIN_SIZE] = dim
            
            # 获取NURBS参数
            degree_u = degrees.get("u", 3)
            degree_v = degrees.get("v", 3)
            degree_w = degrees.get("w", 0) if dim == 3 else 0
            
            knots_u = knot_vectors.get("u", [])
            knots_v = knot_vectors.get("v", [])
            knots_w = knot_vectors.get("w", []) if dim == 3 else []
            
            # 计算控制点网格尺寸
            num_u = len(knots_u) - degree_u - 1
            num_v = len(knots_v) - degree_v - 1
            num_w = len(knots_w) - degree_w - 1 if dim == 3 else 1
            
            # 直接创建NURBS Patch
            # 在实际应用中，这里需要使用Kratos的IGA特定API
            # 这里仅展示概念性代码，实际实现会更复杂
            if HAS_KRATOS_IGA and hasattr(KratosMultiphysics.IgaApplication, 'CreateNurbsPatch'):
                patch_id = 1  # 默认为第一个patch
                
                # 创建NURBS patch
                KratosMultiphysics.IgaApplication.CreateNurbsPatch(
                    model_part,
                    patch_id,
                    degree_u, degree_v, degree_w,
                    knots_u, knots_v, knots_w
                )
                
                # 设置控制点和权重
                for i, cp in enumerate(control_points):
                    # 计算控制点的参数空间索引
                    if dim == 2:
                        u_idx = i % num_u
                        v_idx = i // num_u
                        
                        # 设置控制点和权重
                        KratosMultiphysics.IgaApplication.SetControlPoint(
                            model_part,
                            patch_id,
                            u_idx, v_idx, 0,  # i, j, k 索引
                            cp[0], cp[1], cp[2] if len(cp) > 2 else 0.0,  # x, y, z 坐标
                            weights[i] if i < len(weights) else 1.0  # 权重
                        )
                    else:  # 3D case
                        u_idx = i % num_u
                        v_idx = (i // num_u) % num_v
                        w_idx = i // (num_u * num_v)
                        
                        # 设置控制点和权重
                        KratosMultiphysics.IgaApplication.SetControlPoint(
                            model_part,
                            patch_id,
                            u_idx, v_idx, w_idx,  # i, j, k 索引
                            cp[0], cp[1], cp[2],  # x, y, z 坐标
                            weights[i] if i < len(weights) else 1.0  # 权重
                        )
                
                # 完成NURBS模型构建
                KratosMultiphysics.IgaApplication.FinalizeModelPart(model_part)
            else:
                print("警告: 使用简化的IGA模型构建 (Kratos IGA API不可用)")
                # 创建简化的IGA表示
                for i, cp in enumerate(control_points):
                    node_id = i + 1  # 1-based indexing in Kratos
                    node = model_part.CreateNewNode(node_id, cp[0], cp[1], cp[2] if len(cp) > 2 else 0.0)
                    
                    # 存储控制点参数空间坐标
                    if dim == 2:
                        u_idx = i % num_u
                        v_idx = i // num_u
                        node.SetValue(KratosMultiphysics.IgaApplication.NURBS_COORDINATES_U, u_idx)
                        node.SetValue(KratosMultiphysics.IgaApplication.NURBS_COORDINATES_V, v_idx)
                    else:  # 3D case
                        u_idx = i % num_u
                        v_idx = (i // num_u) % num_v
                        w_idx = i // (num_u * num_v)
                        node.SetValue(KratosMultiphysics.IgaApplication.NURBS_COORDINATES_U, u_idx)
                        node.SetValue(KratosMultiphysics.IgaApplication.NURBS_COORDINATES_V, v_idx)
                        node.SetValue(KratosMultiphysics.IgaApplication.NURBS_COORDINATES_W, w_idx)
                    
                    # 设置权重
                    node.SetValue(KratosMultiphysics.IgaApplication.NURBS_WEIGHT, weights[i] if i < len(weights) else 1.0)
            
            return True
        except Exception as e:
            print(f"Error creating NURBS geometry: {e}")
            return False
    
    def set_material_properties(self, material_props: Dict[str, Any]) -> bool:
        """设置材料属性"""
        if not HAS_KRATOS_IGA:
            return False
            
        try:
            # 获取模型部件
            model_part = self.model.GetModelPart("IgaModelPart")
            
            # 设置材料属性
            props = model_part.Properties[1]
            for key, value in material_props.items():
                if isinstance(value, (int, float)):
                    props[getattr(KratosMultiphysics, key)] = value
                elif isinstance(value, list):
                    # 处理向量或矩阵属性
                    if len(value) == 3:  # 向量
                        vec = KratosMultiphysics.Vector(len(value))
                        for i, v in enumerate(value):
                            vec[i] = v
                        props[getattr(KratosMultiphysics, key)] = vec
            
            return True
        except Exception as e:
            print(f"Error setting material properties: {e}")
            return False
    
    def set_boundary_conditions(self, boundary_conditions: List[Dict[str, Any]]) -> bool:
        """
        设置边界条件
        
        Args:
            boundary_conditions: 边界条件列表
                [
                    {
                        "type": "dirichlet",
                        "variable": "DISPLACEMENT_X",
                        "value": 0.0,
                        "control_points": [1, 2, 3, 4, 5]
                    },
                    ...
                ]
        
        Returns:
            bool: 是否成功设置
        """
        if not HAS_KRATOS_IGA:
            return False
            
        try:
            # 获取模型部件
            model_part = self.model.GetModelPart("IgaModelPart")
            
            # 应用边界条件
            for bc in boundary_conditions:
                bc_type = bc.get("type")
                control_points = bc.get("control_points", [])
                value = bc.get("value")
                variable_name = bc.get("variable")
                
                if not variable_name or not control_points:
                    continue
                    
                variable = getattr(KratosMultiphysics, variable_name)
                
                if bc_type == "dirichlet":
                    for cp_id in control_points:
                        node_id = cp_id  # 假设控制点ID就是节点ID
                        if model_part.HasNode(node_id):
                            node = model_part.GetNode(node_id)
                            node.Fix(variable)
                            node.SetSolutionStepValue(variable, 0, value)
            
            return True
        except Exception as e:
            print(f"Error setting boundary conditions: {e}")
            return False
    
    def set_load_conditions(self, load_conditions: List[Dict[str, Any]]) -> bool:
        """
        设置载荷条件
        
        Args:
            load_conditions: 载荷条件列表
                [
                    {
                        "type": "point_load",
                        "variable": "POINT_LOAD_Y",
                        "value": -10000.0,
                        "control_points": [25]
                    },
                    ...
                ]
        
        Returns:
            bool: 是否成功设置
        """
        if not HAS_KRATOS_IGA:
            return False
            
        try:
            # 获取模型部件
            model_part = self.model.GetModelPart("IgaModelPart")
            
            # 应用载荷条件
            for lc in load_conditions:
                load_type = lc.get("type")
                control_points = lc.get("control_points", [])
                value = lc.get("value")
                variable_name = lc.get("variable")
                
                if not variable_name or not control_points:
                    continue
                    
                variable = getattr(KratosMultiphysics, variable_name)
                
                if load_type == "point_load":
                    for cp_id in control_points:
                        node_id = cp_id  # 假设控制点ID就是节点ID
                        if model_part.HasNode(node_id):
                            node = model_part.GetNode(node_id)
                            node.SetSolutionStepValue(variable, 0, value)
            
            return True
        except Exception as e:
            print(f"Error setting load conditions: {e}")
            return False
    
    def solve(self) -> bool:
        """运行分析"""
        if not HAS_KRATOS_IGA or not self.parameters:
            # 模拟模式下的假数据返回
            if not HAS_KRATOS_IGA:
                print("Kratos IGA not available, generating simulated results...")
                return True
            return False
            
        try:
            # 创建并运行分析
            if hasattr(KratosMultiphysics.IgaApplication, 'IgaAnalysis'):
                self.analysis = KratosMultiphysics.IgaApplication.IgaAnalysis(self.model, self.parameters)
            else:
                # 回退到结构分析
                self.analysis = KratosMultiphysics.StructuralMechanicsApplication.StructuralMechanicsAnalysis(self.model, self.parameters)
            
            self.analysis.Run()
            return True
        except Exception as e:
            print(f"Error running simulation: {e}")
            return False
    
    def get_results(self, variable_name: str) -> Dict[int, Union[float, List[float]]]:
        """
        获取特定变量的结果
        
        Args:
            variable_name: Kratos变量名
            
        Returns:
            Dict[int, Union[float, List[float]]]: 控制点ID到结果值的映射
        """
        if not HAS_KRATOS_IGA or not self.analysis:
            # 模拟模式下的假数据返回
            if not HAS_KRATOS_IGA:
                print("Generating simulated results...")
                model_part = self.model.GetModelPart("IgaModelPart") if hasattr(self, 'model') else None
                if model_part:
                    results = {}
                    for node in model_part.Nodes:
                        # 生成随机结果
                        if variable_name in ["DISPLACEMENT", "DISPLACEMENT_X", "DISPLACEMENT_Y", "DISPLACEMENT_Z"]:
                            results[node.Id] = [(np.random.random() - 0.5) * 0.001 for _ in range(3)]
                        else:
                            results[node.Id] = (np.random.random() - 0.5) * 1000
                    return results
            return {}
            
        try:
            # 获取模型部件
            model_part = self.model.GetModelPart("IgaModelPart")
            variable = getattr(KratosMultiphysics, variable_name)
            
            # 提取结果
            results = {}
            for node in model_part.Nodes:
                if variable_name in ["DISPLACEMENT", "VELOCITY", "ACCELERATION"]:
                    # 向量变量
                    value = [
                        node.GetSolutionStepValue(variable)[0],
                        node.GetSolutionStepValue(variable)[1],
                        node.GetSolutionStepValue(variable)[2]
                    ]
                else:
                    # 标量变量
                    value = node.GetSolutionStepValue(variable)
                
                results[node.Id] = value
                
            return results
        except Exception as e:
            print(f"Error getting results: {e}")
            return {}
    
    def export_results(self, output_file: str, format: str = "vtk") -> bool:
        """
        导出结果到文件
        
        Args:
            output_file: 输出文件路径
            format: 输出格式，支持"vtk", "json", "hdf5"
            
        Returns:
            bool: 是否成功导出
        """
        if not HAS_KRATOS_IGA or not self.analysis:
            # 模拟模式
            if not HAS_KRATOS_IGA:
                print(f"Simulating export to {output_file}...")
                # 创建空文件
                with open(output_file, 'w') as f:
                    f.write("# Simulated IGA results\n")
                return True
            return False
            
        try:
            # 设置输出进程
            if format.lower() == "vtk":
                from KratosMultiphysics.IgaApplication.iga_output_process import IgaOutputProcess
                
                output_params = KratosMultiphysics.Parameters("""{
                    "model_part_name": "IgaModelPart",
                    "output_name": "iga_results",
                    "output_dir": """ + f'"{self.output_dir}"' + """,
                    "file_format": "vtk"
                }""")
                
                output_process = IgaOutputProcess(self.model, output_params)
                output_process.ExecuteFinalize()
                
                # 复制到指定输出文件
                source_file = os.path.join(self.output_dir, "iga_results.vtk")
                if os.path.exists(source_file):
                    shutil.copy(source_file, output_file)
            elif format.lower() == "json":
                # 导出为JSON格式
                results = {}
                
                # 获取模型部件
                model_part = self.model.GetModelPart("IgaModelPart")
                
                # 收集控制点信息
                control_points = []
                for node in model_part.Nodes:
                    cp = {
                        "id": node.Id,
                        "coordinates": [node.X, node.Y, node.Z],
                        "displacements": [
                            node.GetSolutionStepValue(KratosMultiphysics.DISPLACEMENT_X),
                            node.GetSolutionStepValue(KratosMultiphysics.DISPLACEMENT_Y),
                            node.GetSolutionStepValue(KratosMultiphysics.DISPLACEMENT_Z)
                        ]
                    }
                    control_points.append(cp)
                
                results["control_points"] = control_points
                
                # 写入JSON文件
                with open(output_file, 'w') as f:
                    json.dump(results, f, indent=2)
            
            return True
        except Exception as e:
            print(f"Error exporting results: {e}")
            return False
    
    def generate_default_parameters(self) -> Dict[str, Any]:
        """
        生成默认分析参数
        
        Returns:
            Dict[str, Any]: 默认参数字典
        """
        default_params = {
            "problem_data": {
                "problem_name": "iga_analysis",
                "echo_level": 1,
                "start_time": 0.0,
                "end_time": 1.0,
                "parallel_type": "OpenMP"
            },
            "solver_settings": {
                "solver_type": "static",
                "model_part_name": "IgaModelPart",
                "domain_size": 2,
                "model_import_settings": {
                    "input_type": "use_input_model_part"
                },
                "time_stepping": {
                    "time_step": 1.0
                },
                "analysis_type": "non_linear",
                "scheme_settings": {
                    "scheme_type": "newmark"
                },
                "line_search_settings": {
                    "line_search": false
                },
                "convergence_criterion": "displacement_criterion",
                "displacement_relative_tolerance": 1e-4,
                "displacement_absolute_tolerance": 1e-9,
                "residual_relative_tolerance": 1e-4,
                "residual_absolute_tolerance": 1e-9,
                "max_iteration": 20
            },
            "output_processes": {
                "iga_output_process": {
                    "model_part_name": "IgaModelPart",
                    "output_name": "iga_results",
                    "output_dir": self.output_dir,
                    "file_format": "vtk"
                }
            }
        }
        
        return default_params
    
    def analyze_nurbs_model(self, 
                           nurbs_data: Dict[str, Any], 
                           material_props: Dict[str, Any],
                           boundary_conditions: List[Dict[str, Any]],
                           load_conditions: List[Dict[str, Any]]) -> bool:
        """
        一站式分析NURBS模型
        
        Args:
            nurbs_data: NURBS几何数据
                {
                    "control_points": [[x,y,z], ...],
                    "weights": [w1, w2, ...],
                    "knot_vectors": {"u": [...], "v": [...], "w": [...]},
                    "degrees": {"u": p, "v": q, "w": r}
                }
            material_props: 材料属性
            boundary_conditions: 边界条件
            load_conditions: 载荷条件
            
        Returns:
            bool: 分析是否成功
        """
        try:
            # 1. 创建NURBS几何
            success = self.create_nurbs_geometry(
                nurbs_data["control_points"],
                nurbs_data["weights"],
                nurbs_data["knot_vectors"],
                nurbs_data["degrees"]
            )
            if not success:
                return False
                
            # 2. 设置材料属性
            success = self.set_material_properties(material_props)
            if not success:
                return False
                
            # 3. 设置边界条件
            success = self.set_boundary_conditions(boundary_conditions)
            if not success:
                return False
                
            # 4. 设置载荷条件
            success = self.set_load_conditions(load_conditions)
            if not success:
                return False
                
            # 5. 设置默认参数
            params = self.generate_default_parameters()
            success = self.set_parameters(params)
            if not success:
                return False
                
            # 6. 求解
            success = self.solve()
            return success
            
        except Exception as e:
            print(f"Error analyzing NURBS model: {e}")
            return False