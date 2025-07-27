"""
测试地质力学求解器功能
"""
import sys
import os
sys.path.append('E:/DeepCAD/core/kratos_source/kratos/bin/Release')
os.environ['PATH'] = 'E:/DeepCAD/core/kratos_source/kratos/bin/Release/libs;' + os.environ.get('PATH', '')

def test_kratos_geomechanics():
    """测试Kratos地质力学功能"""
    print("Testing Kratos GeoMechanics functionality...")
    
    try:
        # 导入Kratos核心
        import KratosMultiphysics as KMP
        print("✓ KratosMultiphysics imported successfully")
        
        # 测试基础功能
        model = KMP.Model()
        model_part = model.CreateModelPart("TestDomain")
        print("✓ Basic Kratos functionality works")
        
        # 尝试导入地质力学应用
        try:
            import KratosMultiphysics.GeoMechanicsApplication as GeoApp
            print("✓ GeoMechanicsApplication imported successfully")
            
            # 测试创建地质力学求解器的参数
            solver_params = {
                "solver_type": "U_Pw",
                "model_part_name": "PorousDomain",
                "domain_size": 3,
                "analysis_type": "linear",
                "time_stepping": {
                    "time_step": 0.1
                },
                "convergence_criteria": "displacement_criterion",
                "displacement_relative_tolerance": 1.0e-4,
                "displacement_absolute_tolerance": 1.0e-9,
                "max_iterations": 15,
                "linear_solver_settings": {
                    "solver_type": "LinearSolversApplication.sparse_lu"
                }
            }
            
            print("✓ GeoMechanics solver parameters defined")
            
            # 测试材料定义
            material_properties = {
                "DENSITY": 2000.0,
                "YOUNG_MODULUS": 30e6,
                "POISSON_RATIO": 0.3,
                "PERMEABILITY_XX": 1e-10,
                "PERMEABILITY_YY": 1e-10, 
                "PERMEABILITY_ZZ": 1e-10,
                "POROSITY": 0.3,
                "BULK_MODULUS_FLUID": 2e9
            }
            
            print("✓ Geotechnical material properties defined")
            print("✓ GeoMechanics functionality is ready for implementation")
            
            return True
            
        except ImportError as e:
            print(f"✗ GeoMechanicsApplication not available: {e}")
            print("  This is expected if GeoMechanics modules weren't compiled")
            return False
            
    except ImportError as e:
        print(f"✗ Failed to import KratosMultiphysics: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False

def create_simple_geomechanics_analysis():
    """创建简单的地质力学分析示例"""
    print("\nCreating simple geomechanics analysis setup...")
    
    try:
        import KratosMultiphysics as KMP
        import json
        
        # 创建分析参数模板
        analysis_params = {
            "problem_data": {
                "problem_name": "excavation_analysis",
                "start_time": 0.0,
                "end_time": 1.0,
                "echo_level": 1
            },
            "solver_settings": {
                "solver_type": "U_Pw",
                "model_part_name": "PorousDomain", 
                "domain_size": 3,
                "analysis_type": "non_linear",
                "time_stepping": {
                    "time_step": 0.1,
                    "reduction_factor": 0.5,
                    "increase_factor": 2.0
                },
                "convergence_criteria": "And_criterion",
                "displacement_relative_tolerance": 1.0e-4,
                "displacement_absolute_tolerance": 1.0e-9,
                "residual_relative_tolerance": 1.0e-4,
                "residual_absolute_tolerance": 1.0e-9,
                "water_pressure_relative_tolerance": 1.0e-4,
                "water_pressure_absolute_tolerance": 1.0e-9,
                "max_iterations": 15,
                "linear_solver_settings": {
                    "solver_type": "amgcl",
                    "tolerance": 1.0e-6,
                    "max_iteration": 200,
                    "scaling": False
                }
            },
            "processes": {
                "constraints_process_list": [
                    {
                        "python_module": "apply_vector_constraint_table_process",
                        "kratos_module": "KratosMultiphysics.GeoMechanicsApplication", 
                        "process_name": "ApplyVectorConstraintTableProcess",
                        "Parameters": {
                            "model_part_name": "PorousDomain.SoilBody",
                            "variable_name": "DISPLACEMENT",
                            "constrained": [True, True, True],
                            "value": [0.0, 0.0, 0.0],
                            "table": [0, 0, 0]
                        }
                    }
                ],
                "loads_process_list": [
                    {
                        "python_module": "apply_vector_constraint_table_process",
                        "kratos_module": "KratosMultiphysics.GeoMechanicsApplication",
                        "process_name": "ApplyVectorConstraintTableProcess", 
                        "Parameters": {
                            "model_part_name": "PorousDomain.SurfaceLoad",
                            "variable_name": "SURFACE_LOAD",
                            "constrained": [False, False, True],
                            "value": [0.0, 0.0, -20000.0]
                        }
                    }
                ]
            },
            "output_processes": {
                "vtk_output": [
                    {
                        "python_module": "vtk_output_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "VtkOutputProcess",
                        "Parameters": {
                            "model_part_name": "PorousDomain",
                            "output_control_type": "step",
                            "output_interval": 1,
                            "file_format": "binary",
                            "output_precision": 7,
                            "output_sub_model_parts": False,
                            "folder_name": "vtk_output",
                            "save_output_files_in_folder": True,
                            "nodal_solution_step_data_variables": [
                                "DISPLACEMENT",
                                "WATER_PRESSURE"
                            ],
                            "gauss_point_variables_extrapolated_to_nodes": [
                                "CAUCHY_STRESS_TENSOR"
                            ]
                        }
                    }
                ]
            }
        }
        
        # 保存参数文件
        with open('E:/DeepCAD/geomechanics_parameters.json', 'w') as f:
            json.dump(analysis_params, f, indent=4)
        
        print("✓ Analysis parameters template created")
        print("✓ Saved to: E:/DeepCAD/geomechanics_parameters.json")
        
        return True
        
    except Exception as e:
        print(f"✗ Failed to create analysis setup: {e}")
        return False

if __name__ == "__main__":
    success = test_kratos_geomechanics()
    if success:
        create_simple_geomechanics_analysis()
    
    print(f"\nTest completed. Success: {success}")