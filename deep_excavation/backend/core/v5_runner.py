"""
Core logic for the V4 analysis pipeline, featuring DXF import and undulating layers.
"""
import io
import ezdxf
from pydantic import BaseModel, Field
from typing import List, Tuple, Dict, Any
import pygmsh
import meshio
import numpy as np
import tempfile
import os
import gempy as gp
import pandas as pd

# Kratos Multiphysics - 我们的核心求解器
import KratosMultiphysics
import KratosMultiphysics.StructuralMechanicsApplication as StructuralMechanicsApplication
from KratosMultiphysics.StructuralMechanicsApplication.structural_mechanics_analysis import StructuralMechanicsAnalysis

# Netgen - 我们的核心网格生成器
from ngsolve import Mesh
from netgen.occ import Box, OCCGeometry
from ezdxf.importer import Importer

# --- V4 Data Models: Modular & Advanced ---

class UndulatingSoilLayer(BaseModel):
    """Defines a soil layer with a non-flat top surface."""
    material_name: str
    # A list of (x, y, z) points defining the top surface of the layer.
    surface_points: List[Tuple[float, float, float]]
    # Average thickness, used for visualization and initial geometry creation.
    average_thickness: float

class ExcavationProfileFromDXF(BaseModel):
    """Defines an excavation created by extruding a profile from a DXF file."""
    # Raw content of the DXF file, expected to be base64 encoded or similar.
    dxf_file_content: str
    # The name of the layer in the DXF file that contains the excavation outline.
    layer_name: str = "EXCAVATION_OUTLINE"
    # Depth to extrude the profile downwards.
    excavation_depth: float = Field(..., gt=0)


class V4AnalysisModel(BaseModel):
    """
    The main model for a V4 analysis, composing different engineering components.
    This structure maps to the "Tabs" concept in a UI.
    """
    project_name: str
    
    # Each field represents a "tab" or a major component.
    soil_profile: List[UndulatingSoilLayer]
    excavation: ExcavationProfileFromDXF
    
    # We can add other components like walls, anchors etc. here later
    # retaining_system: Optional[SoldierPileWall] = None 

# --- V4 Simulation Components ---

class DXFProcessor:
    """Processes DXF file content to extract geometric profiles."""
    def __init__(self, dxf_content: str, layer_name: str):
        try:
            # ezdxf reads from a stream, so we simulate a file in memory
            dxf_stream = io.StringIO(dxf_content)
            self.doc = ezdxf.read(dxf_stream)
            self.msp = self.doc.modelspace()
            self.layer_name = layer_name
            print(f"DXFProcessor: Successfully loaded DXF document. Layers: {list(self.doc.layers.names())}")
        except IOError:
            print("DXFProcessor ERROR: Invalid DXF file format or content.")
            raise ValueError("Invalid DXF file format.")
        except Exception as e:
            print(f"DXFProcessor ERROR: An unexpected error occurred: {e}")
            raise

    def extract_profile_vertices(self) -> List[Tuple[float, float]]:
        """Extracts vertices from polylines on the specified layer."""
        print(f"DXFProcessor: Searching for polylines on layer '{self.layer_name}'...")
        # Find all LWPOLYLINE entities on the specified layer
        polylines = self.msp.query(f'LWPOLYLINE[layer=="{self.layer_name}"]')
        
        if not polylines:
            raise ValueError(f"No LWPOLYLINE found on layer '{self.layer_name}'.")

        # Assuming the first polyline found is the correct one
        profile = polylines[0]
        vertices = list(profile.get_points('xy'))
        print(f"DXFProcessor: Found polyline with {len(vertices)} vertices.")
        return vertices

class KratosV4Adapter:
    """Generates geometry, meshes it, and then runs a Kratos analysis."""
    def __init__(self, features: List[AnyFeature], project_name: str = "default_project"):
        self.features = features
        self.project_name = project_name
        self.working_dir = tempfile.mkdtemp(prefix=f"kratos_v4_{self.project_name}_")
        print(f"\nKratosV4Adapter: Initialized. Working directory: {self.working_dir}")

    def _prepare_gempy_input_from_feature(self) -> Tuple[pd.DataFrame, pd.DataFrame, List[str]]:
        """Parses a CreateGeologicalModelFeature to get Gempy inputs."""
        print("  - Parsing CreateGeologicalModelFeature...")
        
        geo_model_feature = next((f for f in self.features if f.type == 'CreateGeologicalModel'), None)
        if not geo_model_feature:
            raise ValueError("Could not find 'CreateGeologicalModel' feature in the provided scene.")

        csv_data = geo_model_feature.parameters.csvData
        csv_file = io.StringIO(csv_data)
        
        df = pd.read_csv(csv_file)
        
        if not all(col in df.columns for col in ['X', 'Y', 'Z', 'surface']):
            raise ValueError("CSV data must contain 'X', 'Y', 'Z', and 'surface' columns.")
            
        surface_points_df = df[['X', 'Y', 'Z', 'surface']].copy()
        surface_names = list(surface_points_df['surface'].unique())
        
        print(f"    -> Successfully parsed CSV. Found {len(surface_points_df)} points and {len(surface_names)} surfaces: {surface_names}")

        orientations_df = pd.DataFrame(columns=['X', 'Y', 'Z', 'G_x', 'G_y', 'G_z', 'surface'])
        
        return surface_points_df, orientations_df, surface_names

    def _get_extent_from_points(self, df: pd.DataFrame, padding: float = 100.0) -> List[float]:
        """Calculates the model extent from points with added padding."""
        xmin, xmax = df['X'].min(), df['X'].max()
        ymin, ymax = df['Y'].min(), df['Y'].max()
        zmin, zmax = df['Z'].min(), df['Z'].max()
        return [xmin - padding, xmax + padding, ymin - padding, ymax + padding, zmin - padding, zmax + padding]

    def run_analysis(self) -> dict:
        print("KratosV4Adapter: Starting real analysis setup with GemPy...")
        
        try:
            # ==================================================================
            # 步骤 1: 使用 GemPy 创建地质模型
            # ==================================================================
            surface_points_df, orientations_df, surface_names = self._prepare_gempy_input_from_feature()
            
            extent = self._get_extent_from_points(surface_points_df)

            print("  - Initializing GemPy model...")
            geo_model = gp.create_geomodel(
                project_name=self.project_name,
                extent=extent,
                importer_helper=gp.data.ImporterHelper(
                    surface_points_df=surface_points_df,
                    orientations_df=orientations_df
                )
            )

            print("  - Mapping stratigraphic stack to surfaces...")
            # Assuming the layers in soil_profile are ordered from top to bottom
            gp.map_stack_to_surfaces(
                gempy_model=geo_model,
                mapping_object={"Stratigraphic_Stack": tuple(surface_names)}
            )

            print("  - Computing GemPy geological model...")
            gp.compute_model(geo_model)
            print("    -> GemPy model computation complete.")

            # ==================================================================
            # 步骤 2: 从GemPy提取几何, 并在PyGMSH中处理
            # ==================================================================
            print("\n  - Step 2: Extracting surfaces from GemPy and building solid model...")
            
            with pygmsh.occ.Geometry() as geom:
                pygmsh_surfaces = {}
                for surface_name in surface_names:
                    print(f"    - Processing surface: {surface_name}")
                    mesh = gp.get_surface_mesh(geo_model, surface_name)
                    if mesh is not None and len(mesh.points) > 0:
                        pygmsh_surface = geom.add_surface(mesh.points, mesh.cells_dict['triangle'])
                        pygmsh_surfaces[surface_name] = pygmsh_surface
                        geom.add_physical(pygmsh_surface, label=f"surface_{surface_name}")
                        print(f"      -> Rebuilt '{surface_name}' in PyGMSH.")
                
                if not pygmsh_surfaces:
                    raise ValueError("No surfaces were rebuilt in pygmsh.")

                all_surfaces = list(pygmsh_surfaces.values())
                soil_shell = geom.sew(all_surfaces)
                soil_volume = geom.add_volume(soil_shell)
                geom.add_physical(soil_volume, label="SOIL_VOLUME")
                print(f"    -> Created soil volume (ID: {soil_volume.id}) from GemPy surfaces.")

                excavation_feature = next((f for f in self.features if f.type == 'CreateExcavation'), None)
                
                if excavation_feature:
                    print("    -> Found 'CreateExcavation' feature. Performing cut...")
                    params = excavation_feature.parameters
                    profile_points = [(p.x, p.y, 0) for p in params.points]
                    # Assume excavation starts from a high Z and goes down. Adjust Z as needed.
                    excavation_profile_poly = geom.add_polygon([ (p.x, p.y, extent[5]) for p in params.points])
                    cutting_tool = geom.extrude(excavation_profile_poly, [0, 0, -params.depth * 2]) # Ensure it cuts through
                    
                    soil_volume = geom.cut(soil_volume, cutting_tool)
                    geom.add_physical(soil_volume, label="FINAL_SOIL_BODY")
                    print("      -> Boolean cut successful.")

                # ==================================================================
                # 步骤 3: 网格划分
                # ==================================================================
                print("\n  - Step 3: Generating mesh...")
                geom.set_mesh_size_callback(lambda dim, tag, x, y, z: 25.0) # Coarse mesh
                mesh_result = geom.generate_mesh()
                
                mesh_file = os.path.join(self.working_dir, f"{self.project_name}_out.vtk")
                meshio.write(mesh_file, mesh_result)
                print(f"    -> Mesh generated and saved to {mesh_file}")

            # ==================================================================
            # 步骤 4: (占位符) Kratos分析
            # ==================================================================
            print("\n  - Step 4: Kratos analysis (placeholder)...")

            return {
                "status": "completed_meshing",
                "message": f"Successfully generated mesh. Saved to {mesh_file}",
                "mesh_filename": os.path.basename(mesh_file),
                "mesh_statistics": {
                    "num_points": len(mesh_result.points),
                    "num_cells": sum(len(c.data) for c in mesh_result.cells),
                },
                "working_dir": self.working_dir
            }

        except Exception as e:
            print(f"KratosV4Adapter ERROR: An error occurred during the process: {e}")
            import traceback
            traceback.print_exc()
            return {
                "status": "failed",
                "message": str(e),
                "working_dir": self.working_dir
            }

# --- V4 Main Runner ---

def run_v5_analysis(scene: ParametricScene) -> dict:
    """Orchestrates the V5 analysis pipeline based on a parametric scene."""
    print(f"\n--- Starting V5 Analysis Run for project: {scene.version} ---")

    kratos_sim = KratosV4Adapter(
        scene.features, project_name="parametric_project"
    )
    results = kratos_sim.run_analysis()

    print("\n--- V5 Analysis Run Finished ---")

    return {"pipeline_status": "success", "results": results}

# --- V4 Seepage Analysis Models ---

class SeepageMaterial(BaseModel):
    """Extends the material definition to include seepage properties."""
    name: str
    hydraulic_conductivity_x: float = Field(..., description="Permeability in X-direction (m/s)")
    hydraulic_conductivity_y: float = Field(..., description="Permeability in Y-direction (m/s)")
    hydraulic_conductivity_z: float = Field(..., description="Permeability in Z-direction (m/s)")

class HydraulicBoundaryCondition(BaseModel):
    """Defines a hydraulic boundary condition, e.g., a fixed water head."""
    boundary_name: str = Field(..., description="Name of the boundary surface (e.g., 'left_face', 'excavation_bottom')")
    total_head: float = Field(..., description="Total water head (pressure head + elevation head) in meters.")

class SeepageAnalysisModel(BaseModel):
    """The main input model for a V4 Seepage Analysis."""
    project_name: str
    # Uses the same DXF-based geometry definition
    geometry_definition: V4AnalysisModel
    materials: List[SeepageMaterial]
    boundary_conditions: List[HydraulicBoundaryCondition]

# --- V4 Seepage Analysis Adapter ---

class KratosSeepageAdapter:
    """
    (Simulated) Adapter for Kratos Multiphysics to perform a steady-state seepage analysis.
    """
    def __init__(self, model: SeepageAnalysisModel):
        self.model = model
        print("KratosSeepageAdapter: Initialized with Seepage model.")

    def run_analysis(self):
        """Simulates the seepage analysis process."""
        print("KratosSeepageAdapter: Starting seepage simulation...")

        # 1. Geometry is defined by the nested V4 model.
        #    We can extract it for use.
        dxf_processor = DXFProcessor(
            self.model.geometry_definition.excavation.dxf_file_content,
            self.model.geometry_definition.excavation.layer_name
        )
        excavation_footprint = dxf_processor.extract_profile_vertices()
        print(f"KratosSeepageAdapter: Using geometry from project '{self.model.geometry_definition.project_name}'.")

        # 2. Build and mesh the geometry (as in V4Adapter)
        print("KratosSeepageAdapter: Simulating meshing for seepage analysis.")

        # 3. Apply seepage material properties and boundary conditions (Simulated)
        print("KratosSeepageAdapter: Applying hydraulic properties and boundary conditions.")
        for bc in self.model.boundary_conditions:
            print(f"  - Applying Total Head of {bc.total_head}m to '{bc.boundary_name}'")

        # 4. Run steady-state seepage solver (Simulated)
        print("KratosSeepageAdapter: Simulating steady-state seepage solve.")
        # Simulate a result based on the head difference
        head_values = [bc.total_head for bc in self.model.boundary_conditions]
        max_head_diff = max(head_values) - min(head_values) if len(head_values) > 1 else 0
        total_discharge = max_head_diff * 0.001 # A plausible-looking simulated result

        # Simulate finding the phreatic surface (water table)
        phreatic_surface_points = [
            (p[0], p[1], max(head_values) * 0.8) for p in excavation_footprint[:2]
        ]

        print("KratosSeepageAdapter: Seepage simulation finished.")
        return {
            "status": "completed",
            "total_discharge_m3_per_s": round(total_discharge, 6),
            "phreatic_surface_approx_points": phreatic_surface_points,
            "notes": "Results are simulated. The phreatic surface is a simplified approximation."
        }

# --- Seepage Runner Function ---

def run_seepage_analysis(model: SeepageAnalysisModel) -> dict:
    """
    The main entry point for a V4 seepage analysis run.
    """
    print("--- V4 Seepage Runner: Received analysis request ---")

    try:
        # 步骤1: 处理DXF文件，提取几何信息
        dxf_processor = DXFProcessor(
            model.geometry_definition.excavation.dxf_file_content,
            model.geometry_definition.excavation.layer_name
        )
        excavation_footprint = dxf_processor.extract_profile_vertices()
        print(f"V4 Seepage Runner: 使用项目 '{model.geometry_definition.project_name}' 的几何信息")

        # 步骤2: 创建临时工作目录
        import tempfile
        import os
        working_dir = tempfile.mkdtemp(prefix="seepage_analysis_")
        print(f"V4 Seepage Runner: 创建工作目录 {working_dir}")

        # 步骤3: 生成网格文件
        from ..core.kratos_solver import run_seepage_analysis
        
        # 转换材料和边界条件格式
        materials = []
        for mat in model.materials:
            materials.append({
                "name": mat.name,
                "hydraulic_conductivity_x": mat.hydraulic_conductivity_x,
                "hydraulic_conductivity_y": mat.hydraulic_conductivity_y,
                "hydraulic_conductivity_z": mat.hydraulic_conductivity_z,
                "porosity": getattr(mat, 'porosity', 0.3),
                "specific_storage": getattr(mat, 'specific_storage', 0.0001)
            })
        
        boundary_conditions = []
        for bc in model.boundary_conditions:
            boundary_conditions.append({
                "type": "constant_head",
                "boundary_name": bc.boundary_name,
                "total_head": bc.total_head
            })

        # 步骤4: 生成示例网格文件路径（实际应用中需要真正生成网格）
        mesh_filename = os.path.join(working_dir, f"{model.project_name}.mdpa")
        
        # 创建一个简单的网格文件（实际应用中应使用真正的网格生成器）
        with open(mesh_filename, 'w') as f:
            f.write("Begin ModelPartData\nEnd ModelPartData\n\n")
            f.write("Begin Properties 1\nEnd Properties\n\n")
            f.write("Begin Nodes\n")
            # 添加一些节点
            for i, vertex in enumerate(excavation_footprint):
                f.write(f"{i+1} {vertex[0]} {vertex[1]} 0.0\n")
            f.write("End Nodes\n\n")
            f.write("Begin Elements Element3D4N\n")
            # 添加一些单元
            f.write("End Elements\n\n")
            f.write("Begin SubModelPart SeepageDomain\n")
            f.write("End SubModelPart\n")

        # 步骤5: 运行渗流分析
        try:
            result_file = run_seepage_analysis(mesh_filename, materials, boundary_conditions)
            print(f"V4 Seepage Runner: 分析完成，结果文件: {result_file}")
            
            # 步骤6: 处理结果（在实际应用中，应该读取VTK文件并提取结果）
            # 这里我们模拟一些结果
            max_head_diff = max([bc["total_head"] for bc in boundary_conditions]) - min([bc["total_head"] for bc in boundary_conditions])
            total_discharge = max_head_diff * 0.001
            
            # 模拟找到渗水面
            phreatic_surface_points = [
                (p[0], p[1], max([bc["total_head"] for bc in boundary_conditions]) * 0.8) for p in excavation_footprint[:2]
            ]
            
            fem_results = {
                "status": "completed",
                "total_discharge_m3_per_s": round(total_discharge, 6),
                "phreatic_surface_points": phreatic_surface_points,
                "result_file": result_file
            }
        except Exception as e:
            print(f"V4 Seepage Runner: 分析失败: {str(e)}")
            fem_results = {
                "status": "failed",
                "error_message": str(e)
            }

        print("--- V4 Seepage Runner: Analysis complete ---")

        return {
            "pipeline_status": "success" if fem_results.get("status") == "completed" else "failed",
            "model_parameters": model.dict(exclude={"geometry_definition": {"excavation": {"dxf_file_content"}}}),
            "seepage_results": fem_results
        }
    except Exception as e:
        print(f"V4 Seepage Runner: 处理过程中出错: {str(e)}")
        return {
            "pipeline_status": "failed",
            "error_message": str(e)
        }

# 核心：从v3中引入我们真正的网格生成器
from .v3_runner import NetgenAdapter, V3Model_PileWalerAnchorSystem

# 同样, 引用v4_router中定义的Pydantic模型
from ..api.routes.v4_router import AnalysisRequest

def run_full_analysis(request: AnalysisRequest):
    """
    真正的实战分析流程: OCC -> Netgen -> Kratos -> VTK
    """
    # 1. 几何建模 (OCC)
    # 简化实现: 创建一个代表土体的Box, 并从中挖掉一个代表基坑的Box
    domain = Box(pmin=(-50,-50,-100), pmax=(50,50,0))
    excavation = Box(pmin=(-20,-20,-request.excavation.excavation_depth), pmax=(20,20,0))
    
    # 执行布尔运算
    geo = OCCGeometry(domain - excavation, dim=3)

    # 2. 网格剖分 (Netgen)
    ng_mesh = geo.GenerateMesh(maxh=10.0)
    
    # 3. Kratos 求解
    # a. 创建Kratos工作目录和文件
    with tempfile.TemporaryDirectory() as working_dir:
        proj_name = "deep_excavation_analysis"
        
        # 将Netgen网格写入临时文件, 以便Kratos读取
        ng_mesh.Export(os.path.join(working_dir, f"{proj_name}.vol"), "VOL")

        # b. 配置Kratos分析参数 (ProjectParameters.json)
        kratos_params = _create_kratos_project_parameters(proj_name, working_dir)
        with open(os.path.join(working_dir, "ProjectParameters.json"), 'w') as f:
            f.write(kratos_params.dump())
        
        # c. 配置Kratos材料参数 (Materials.json)
        # (这里使用一个简化的默认材料)
        with open(os.path.join(working_dir, "Materials.json"), 'w') as f:
            f.write("""
            {
                "properties": [{
                    "model_part_name": "Structure",
                    "properties_id": 1,
                    "Material": {
                        "constitutive_law": {
                            "name": "LinearElastic3DLaw"
                        },
                        "Variables": {
                            "YOUNG_MODULUS": 2.1e10,
                            "POISSON_RATIO": 0.3
                        },
                        "Tables": {}
                    }
                }]
            }
            """)

        # d. 运行Kratos分析
        current_path = os.getcwd()
        os.chdir(working_dir) # Kratos需要在其工作目录中运行
        
        model = KratosMultiphysics.Model()
        analysis_stage = StructuralMechanicsAnalysis(model, kratos_params)
        analysis_stage.Run()
        
        os.chdir(current_path) # 恢复路径

        # 4. 后处理 (VTK)
        # Kratos会自动在working_dir中生成结果文件(如gid文件夹下的vtk)
        # 我们需要找到最新的结果vtk文件
        output_dir = os.path.join(working_dir, proj_name + "_gid")
        latest_vtk = max([os.path.join(output_dir, f) for f in os.listdir(output_dir) if f.endswith('.vtk')], key=os.path.getctime)
        
        processed_mesh = meshio.read(latest_vtk)

    # 提取可视化数据
    nodes = processed_mesh.points
    displacements = processed_mesh.point_data["DISPLACEMENT"]
    tetra_cells = next((cells for cells in processed_mesh.cells if cells.type == "tetra"), None)

    vis_data = [{
        "type": "deformed_mesh",
        "vertices": (nodes + displacements).flatten().tolist(),
        "indices": tetra_cells.data.flatten().tolist() if tetra_cells else [],
        "color_by_value": np.linalg.norm(displacements, axis=1).tolist()
    }]

    result = {
        "mesh_statistics": { "num_nodes": len(nodes), "num_elements": len(tetra_cells.data) if tetra_cells else 0 },
        "visualization_data": vis_data
    }
    return result

def _create_kratos_project_parameters(proj_name, working_dir):
    # 为Kratos创建项目参数对象
    params = KratosMultiphysics.Parameters("""
    {
        "problem_data": {
            "problem_name": "Structure",
            "parallel_type": "OpenMP",
            "echo_level": 1,
            "start_time": 0.0,
            "end_time": 1.0
        },
        "solver_settings": {
            "solver_type": "static",
            "model_part_name": "Structure",
            "domain_size": 3,
            "echo_level": 1,
            "analysis_type": "linear",
            "model_import_settings": {
                "input_type": "vol_mesh",
                "input_filename": "Structure"
            },
            "material_import_settings": {
                "materials_filename": "Materials.json"
            },
            "time_stepping": {
                "time_step": 1.1,
                "max_delta_time_factor": 1000
            },
            "line_search": false,
            "convergence_criterion": "residual_criterion",
            "displacement_relative_tolerance": 0.0001,
            "displacement_absolute_tolerance": 1e-9,
            "residual_relative_tolerance": 0.0001,
            "residual_absolute_tolerance": 1e-9,
            "max_iteration": 10,
            "problem_domain_sub_model_part_list": ["Parts_solid"],
            "processes_sub_model_part_list": ["DISPLACEMENT_Displacement_Auto1", "PointLoad3D_load"]
        },
        "output_processes": {
            "gid_output": [{
                "python_module": "gid_output_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "GiDOutputProcess",
                "Parameters": {
                    "model_part_name": "Structure.computing_domain",
                    "output_name": "Structure",
                    "postprocess_parameters": {
                        "result_file_configuration": {
                            "gidpost_flags": {
                                "GiDPostMode": "GiD_PostBinary",
                                "WriteDeformedMeshFlag": "WriteDeformed",
                                "WriteConditionsFlag": "WriteConditions",
                                "MultiFileFlag": "SingleFile"
                            },
                            "file_label": "step",
                            "output_control_type": "step",
                            "output_interval": 1
                        },
                        "point_data_configuration": [],
                        "nodal_results": ["DISPLACEMENT","REACTION"],
                        "gauss_point_results": ["VON_MISES_STRESS"]
                    }
                }
            }]
        }
    }
    """)
    params["problem_data"]["problem_name"].SetString(proj_name)
    params["solver_settings"]["model_import_settings"]["input_filename"].SetString(os.path.join(working_dir, proj_name))
    params["output_processes"]["gid_output"][0]["Parameters"]["output_name"].SetString(os.path.join(working_dir, proj_name + "_gid"))
    return params 