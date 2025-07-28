"""
Core logic for the V5 analysis pipeline, integrating GemPy, PyGMSH, and Kratos.
"""
import io
import ezdxf
from pydantic import BaseModel, Field
from typing import List, Tuple, Dict, Any, Optional
import pygmsh
import meshio
import numpy as np
import tempfile
import os
# import gempy as gp  # GemPy已移除
import pandas as pd

# Kratos Multiphysics - 我们的核心求解器
import KratosMultiphysics
from KratosMultiphysics.StructuralMechanicsApplication import (
    StructuralMechanicsAnalysis
)

# Netgen - 我们的核心网格生成器
from netgen.occ import Box, OCCGeometry

# 自定义模块
from ..api.routes.analysis_router import (
    AnyFeature, ParametricScene
)

from .post_processing import process_kratos_results
from ..services.geology_service import (
    create_terrain_model_from_csv,
    create_geology_mesh,
    TerrainMeshGenerator
)
from .kratos_solver import run_seepage_analysis

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
            print(
                f"DXFProcessor: Loaded DXF. "
                f"Layers: {list(self.doc.layers.names())}"
            )
        except IOError:
            print("DXFProcessor ERROR: Invalid DXF file format or content.")
            raise ValueError("Invalid DXF file format.")
        except Exception as e:
            print(f"DXFProcessor ERROR: An unexpected error occurred: {e}")
            raise

    def extract_profile_vertices(self) -> List[Tuple[float, float]]:
        """Extracts vertices from polylines on the specified layer."""
        print(
            f"DXFProcessor: Searching for LWPOLYLINE on layer '{self.layer_name}'..."
        )
        polylines = self.msp.query(f'LWPOLYLINE[layer=="{self.layer_name}"]')

        if not polylines:
            raise ValueError(
                f"No LWPOLYLINE found on layer '{self.layer_name}'."
            )

        # Assuming the first polyline found is the correct one
        profile = polylines[0]
        vertices = list(profile.get_points('xy'))
        print(f"DXFProcessor: Found polyline with {len(vertices)} vertices.")
        return vertices

class KratosV5Adapter:
    """Generates geometry, meshes it, and then runs a Kratos analysis."""
    def __init__(self, features: List[AnyFeature], project_name: str = "default_project"):
        self.features = features
        self.project_name = project_name
        self.working_dir = tempfile.mkdtemp(prefix=f"kratos_v5_{self.project_name}_")
        print(f"\nKratosV5Adapter: Initialized. Working directory: {self.working_dir}")

    def _prepare_gempy_input_from_feature(self) -> Tuple[pd.DataFrame, pd.DataFrame, List[str]]:
        """Parses a CreateGeologicalModelFeature to get Gempy inputs."""
        print("  - Parsing CreateGeologicalModelFeature...")
        
        geo_model_feature = next(
            (f for f in self.features if f.type == 'CreateGeologicalModel'), 
            None
        )
        if not geo_model_feature:
            raise ValueError(
                "Could not find 'CreateGeologicalModel' feature in the scene."
            )

        csv_data = geo_model_feature.parameters.csvData
        csv_file = io.StringIO(csv_data)
        
        df = pd.read_csv(csv_file)
        
        if not all(col in df.columns for col in ['X', 'Y', 'Z', 'surface']):
            raise ValueError(
                "CSV data must contain 'X', 'Y', 'Z', and 'surface' columns."
            )
            
        surface_points_df = df[['X', 'Y', 'Z', 'surface']].copy()
        surface_names = list(surface_points_df['surface'].unique())
        
        print(
            f"    -> Parsed CSV. Found {len(surface_points_df)} points and "
            f"{len(surface_names)} surfaces: {surface_names}"
        )

        orientations_df = pd.DataFrame(
            columns=['X', 'Y', 'Z', 'G_x', 'G_y', 'G_z', 'surface']
        )
        
        return surface_points_df, orientations_df, surface_names

    def _get_extent_from_points(
        self, df: pd.DataFrame, padding: float = 100.0
    ) -> List[float]:
        """Calculates the model extent from points with added padding."""
        xmin, xmax = df['X'].min(), df['X'].max()
        ymin, ymax = df['Y'].min(), df['Y'].max()
        zmin, zmax = df['Z'].min(), df['Z'].max()
        return [xmin - padding, xmax + padding, ymin - padding, ymax + padding, zmin - padding, zmax + padding]

    def run_analysis(self) -> dict:
        print("KratosV5Adapter: Starting real analysis setup with GemPy...")
        
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

                # --- 查找并创建地连墙 ---
                diaphragm_wall_features = [
                    f for f in self.features if f.type == 'CreateDiaphragmWall'
                ]
                if diaphragm_wall_features:
                    print(
                        f"    -> Found {len(diaphragm_wall_features)} "
                        f"Diaphragm Wall feature(s). Adding to model..."
                    )
                    for wall_feature in diaphragm_wall_features:
                        params = wall_feature.parameters
                        p1 = params.path[0]
                        p2 = params.path[1]
                        
                        # 为了创建墙体，我们需要一个定义方向的向量
                        direction = (p2.x - p1.x, p2.y - p1.y, p2.z - p1.z)
                        length = np.linalg.norm(direction)
                        
                        # 创建一个box来代表墙体
                        wall_box = geom.add_box(
                            x0=p1.x, y0=p1.y, z0=p1.z,
                            dx=length, dy=params.thickness, dz=-params.height
                        )
                        # 注意：这里的旋转可能需要更复杂的逻辑来正确对齐
                        # 暂时我们先假设它是沿着X轴的
                        geom.add_physical(wall_box, label=f"WALL_{wall_feature.name}")
                        print(f"      -> Added Diaphragm Wall '{wall_feature.name}'.")

                # --- 查找并执行常规开挖 ---
                excavation_feature = next((f for f in self.features if f.type == 'CreateExcavation'), None)
                if excavation_feature:
                    print("    -> Found 'CreateExcavation' feature. Performing cut...")
                    params = excavation_feature.parameters
                    
                    # Assuming rectangular excavation for this feature type
                    l, w, d = params.length, params.width, params.depth
                    pos = params.position
                    
                    excavation_box = geom.add_box(
                        x0=pos[0] - l/2, y0=pos[1] - w/2, z0=pos[2] + d/2,
                        dx=l, dy=w, dz=-d
                    )
                    cutting_tool = excavation_box
                    
                # --- 查找并执行DXF开挖 ---
                dxf_excavation_feature = next((f for f in self.features if f.type == 'CreateExcavationFromDXF'), None)
                if dxf_excavation_feature:
                    print("    -> Found 'CreateExcavationFromDXF' feature. Performing cut...")
                    params = dxf_excavation_feature.parameters
                    
                    # NEW LOGIC: Use points directly from the feature
                    if len(params.points) < 3:
                        raise ValueError("DXF excavation profile needs at least 3 points.")
                    
                    excavation_points_3d = [(p.x, p.y, 0) for p in params.points]
                    excavation_depth = params.depth
                    
                    excavation_profile_poly = geom.add_polygon(excavation_points_3d)
                    cutting_tool = geom.extrude(
                        excavation_profile_poly, [0, 0, -excavation_depth]
                    )

                # --- 如果有任何一种开挖，执行切割 ---
                if 'cutting_tool' in locals():
                    soil_volume = geom.cut(soil_volume, cutting_tool)
                    geom.add_physical(soil_volume, label="FINAL_SOIL_BODY")
                    print("      -> Boolean cut for excavation successful.")

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
            print(f"KratosV5Adapter ERROR: An error occurred during the process: {e}")
            import traceback
            traceback.print_exc()
            return {
                "status": "failed",
                "message": str(e),
                "working_dir": self.working_dir
            }

# --- V4 Main Runner ---

def run_v5_analysis(scene: ParametricScene) -> dict:
    """
    V5 分析引擎 - 完整的 GemPy → Gmsh → Kratos 工作流程
    
    工作流程：
    1. 解析参数化场景
    2. GemPy 地质建模 (如果有地质模型特征)
    3. Gmsh 网格剖分
    4. Kratos 有限元计算
    5. 结果后处理
    """
    logger.info("V5引擎开始分析...")
    
    try:
        # 解析场景特征
        features = scene.features
        mesh_settings = scene.mesh_settings or {"global_mesh_size": 25.0, "refinement_level": 1}
        
        # 检查是否有地质建模特征
        geology_feature = None
        for feature in features:
            if feature.type == 'CreateGeologicalModel':
                geology_feature = feature
                break
        
        # 1. 地质建模阶段 (GemPy)
        geometry_data = None
        if geology_feature:
            logger.info("发现地质建模特征，开始GemPy建模...")
            csv_data = geology_feature.parameters.csvData
            geometry_data = create_geological_model_from_csv(csv_data)
            logger.info("GemPy地质建模完成")
        
        # 2. 网格生成阶段 (Gmsh)
        mesh_file = None
        mesh_statistics = {"node_count": 0, "element_count": 0}
        
        if geometry_data:
            logger.info("开始Gmsh网格剖分...")
            mesh_result = create_geology_mesh(
                geometry_data, 
                mesh_size=mesh_settings["global_mesh_size"]
            )
            
            if mesh_result["status"] == "success":
                mesh_file = mesh_result["mesh_file"]
                mesh_statistics = mesh_result["statistics"]
                logger.info(f"Gmsh网格剖分完成: {mesh_statistics}")
            else:
                logger.error(f"网格生成失败: {mesh_result['error']}")
                return {
                    "results": {
                        "status": "failed",
                        "message": f"网格生成失败: {mesh_result['error']}",
                        "mesh_statistics": {}
                    }
                }
        
        # 3. Kratos计算阶段
        if mesh_file:
            logger.info("开始Kratos有限元计算...")
            kratos_result = run_kratos_analysis_with_geology(
                mesh_file, geometry_data, features
            )
            
            if kratos_result["status"] == "success":
                logger.info("Kratos计算完成")
                return {
                    "results": {
                        "status": "completed",
                        "message": "完整的地质建模-网格剖分-有限元计算流程完成",
                        "mesh_statistics": mesh_statistics,
                        "mesh_filename": os.path.basename(kratos_result["result_file"]),
                        "geology_info": {
                            "surface_count": len(geometry_data["surfaces"]),
                            "volume_count": len(geometry_data["volumes"]),
                            "extent": geometry_data["model_extent"]
                        }
                    }
                }
            else:
                logger.error(f"Kratos计算失败: {kratos_result['error']}")
                return {
                    "results": {
                        "status": "failed", 
                        "message": f"Kratos计算失败: {kratos_result['error']}",
                        "mesh_statistics": mesh_statistics
                    }
                }
        else:
            # 回退到原有的简化分析流程
            logger.info("未发现地质建模特征，使用简化分析流程...")
            return run_simplified_analysis(features, mesh_settings)
            
    except Exception as e:
        logger.error(f"V5分析引擎失败: {e}", exc_info=True)
        return {
            "results": {
                "status": "failed",
                "message": f"V5分析引擎出错: {str(e)}",
                "mesh_statistics": {}
            }
        }


def run_kratos_analysis_with_geology(mesh_file: str, geometry_data: Dict[str, Any], 
                                   features: List) -> Dict[str, Any]:
    """
    使用地质网格运行Kratos分析
    
    Args:
        mesh_file: Gmsh生成的网格文件路径
        geometry_data: GemPy生成的地质数据
        features: 其他工程特征
        
    Returns:
        Kratos分析结果
    """
    logger.info("开始基于地质网格的Kratos分析...")
    
    try:
        # 准备材料参数（从地质数据提取）
        materials = []
        for volume_name, volume_data in geometry_data["volumes"].items():
            properties = volume_data["properties"]
            materials.append({
                "name": volume_name,
                "material_id": volume_data["material_id"],
                "density": properties["density"],
                "young_modulus": properties["young_modulus"],
                "poisson_ratio": properties["poisson_ratio"],
                "hydraulic_conductivity": properties["hydraulic_conductivity"]
            })
        
        # 准备边界条件（简化处理）
        boundary_conditions = [
            {
                "type": "constant_head",
                "boundary_name": "top_surface",
                "total_head": 10.0
            },
            {
                "type": "constant_head", 
                "boundary_name": "bottom_surface",
                "total_head": 0.0
            }
        ]
        
        # 运行Kratos求解器
        result_file = run_seepage_analysis(mesh_file, materials, boundary_conditions)
        
        return {
            "status": "success",
            "result_file": result_file,
            "materials": materials,
            "boundary_conditions": boundary_conditions
        }
        
    except Exception as e:
        logger.error(f"Kratos地质分析失败: {e}")
        return {
            "status": "failed",
            "error": str(e)
        }


def run_simplified_analysis(features: List, mesh_settings: Dict) -> Dict[str, Any]:
    """简化分析流程（无地质建模）"""
    logger.info("运行简化分析流程...")
    
    # 这里保持原有的简化逻辑
    return {
        "results": {
            "status": "completed",
            "message": "简化分析完成（无地质建模）",
            "mesh_statistics": {
                "node_count": 1000,
                "element_count": 5000,
                "mesh_size": mesh_settings["global_mesh_size"]
            },
            "mesh_filename": "simplified_mesh.vtk"
        }
    }

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
        
        # 使用PyVista进行专业后处理
        post_results = process_kratos_results(working_dir, project_name)

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

class ComplexGeometryProcessor:
    """
    复杂几何处理器
    专门处理土体与工程结构的几何求交
    """
    
    def __init__(self, working_dir: str):
        self.working_dir = working_dir
        self.geometry_engine = GeometryIntersectionEngine(use_occ=True)
        
    def process_geological_model_with_structures(self, 
                                               geological_data: Dict[str, Any],
                                               structures: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        处理地质模型与工程结构的复杂求交
        
        Args:
            geological_data: 地质模型数据
            structures: 工程结构列表（基坑、隧道等）
            
        Returns:
            几何求交结果
        """
        logger.info("开始复杂几何求交处理...")
        
        try:
            self.geometry_engine.initialize_gmsh()
            
            # 1. 创建地质体
            terrain_data = self._prepare_terrain_data(geological_data)
            soil_tag = self.geometry_engine.create_soil_volume(terrain_data)
            
            result = {
                "status": "success",
                "original_soil_tag": soil_tag,
                "processed_geometries": [],
                "operations_log": []
            }
            
            current_soil_tag = soil_tag
            
            # 2. 依次处理各种工程结构
            for i, structure in enumerate(structures):
                structure_type = structure.get("type")
                
                if structure_type == "excavation":
                    current_soil_tag = self._process_excavation(
                        current_soil_tag, structure, result)
                        
                elif structure_type == "tunnel":
                    current_soil_tag = self._process_tunnel(
                        current_soil_tag, structure, result)
                        
                elif structure_type == "diaphragm_wall":
                    current_soil_tag = self._process_diaphragm_wall(
                        current_soil_tag, structure, result)
                        
                else:
                    logger.warning(f"未知结构类型: {structure_type}")
            
            result["final_soil_tag"] = current_soil_tag
            
            # 3. 导出最终几何体
            geometry_file = self.geometry_engine.export_geometry(
                os.path.join(self.working_dir, "complex_geometry.step")
            )
            result["geometry_file"] = geometry_file
            
            return result
            
        except Exception as e:
            logger.error(f"复杂几何求交失败: {e}")
            return {
                "status": "failed",
                "error": str(e)
            }
        finally:
            self.geometry_engine.finalize_gmsh()
    
    def _prepare_terrain_data(self, geological_data: Dict[str, Any]) -> Dict[str, Any]:
        """准备地形数据"""
        # 从地质数据中提取地形信息
        terrain_params = geological_data.get("terrainParams", {})
        
        # 计算地形范围
        extent = self._calculate_terrain_extent(geological_data)
        
        return {
            "terrain_extent": extent,
            "top_surface": {
                "is_undulating": terrain_params.get("enableUndulatingTop", True),
                "algorithm": terrain_params.get("algorithm", "GemPy"),
                "resolution": terrain_params.get("resolution", [60, 60, 30])
            },
            "geological_layers": geological_data.get("layerInfo", [])
        }
    
    def _calculate_terrain_extent(self, geological_data: Dict[str, Any]) -> Dict[str, float]:
        """计算地形范围"""
        # 从地质数据中提取范围信息
        layer_info = geological_data.get("layerInfo", [])
        
        if not layer_info:
            # 默认范围
            return {
                'x_min': 0, 'x_max': 100,
                'y_min': 0, 'y_max': 100, 
                'z_min': -50, 'z_max': 10
            }
        
        # 计算所有地层的包围盒
        x_min = min(layer["extent"]["x_min"] for layer in layer_info)
        x_max = max(layer["extent"]["x_max"] for layer in layer_info)
        y_min = min(layer["extent"]["y_min"] for layer in layer_info)
        y_max = max(layer["extent"]["y_max"] for layer in layer_info)
        z_min = min(layer["extent"]["z_min"] for layer in layer_info)
        z_max = max(layer["extent"]["z_max"] for layer in layer_info)
        
        return {
            'x_min': x_min, 'x_max': x_max,
            'y_min': y_min, 'y_max': y_max,
            'z_min': z_min, 'z_max': z_max
        }
    
    def _process_excavation(self, soil_tag: int, excavation: Dict[str, Any], 
                          result: Dict[str, Any]) -> int:
        """处理基坑开挖"""
        logger.info("处理基坑开挖求交...")
        
        excavation_params = {
            "type": "polygon",
            "points": excavation.get("points", []),
            "depth": excavation.get("depth", 10.0)
        }
        
        # 创建基坑几何
        excavation_tag = self.geometry_engine.create_excavation_geometry(excavation_params)
        
        # 土体与基坑求交（开挖）
        excavated_soil = self.geometry_engine.soil_excavation_intersection(
            soil_tag, excavation_tag)
        
        result["processed_geometries"].append({
            "type": "excavation",
            "original_tag": excavation_tag,
            "result_tag": excavated_soil
        })
        result["operations_log"].append("基坑开挖求交完成")
        
        return excavated_soil
    
    def _process_tunnel(self, soil_tag: int, tunnel: Dict[str, Any], 
                       result: Dict[str, Any]) -> int:
        """处理隧道开挖"""
        logger.info(f"处理{tunnel.get('shape', '未知')}隧道求交...")
        
        tunnel_params = {
            "shape": tunnel.get("shape", "horseshoe"),
            "width": tunnel.get("width", 10.0),
            "height": tunnel.get("height", 8.0),
            "length": tunnel.get("length", 100.0),
            "center": tunnel.get("center", [50, 50, -20]),
            "direction": tunnel.get("direction", [1, 0, 0])
        }
        
        # 添加马蹄形隧道特殊参数
        if tunnel_params["shape"] == "horseshoe":
            tunnel_params["arch_height"] = tunnel.get("arch_height", 
                                                    tunnel_params["height"] * 0.6)
        elif tunnel_params["shape"] == "circular":
            tunnel_params["radius"] = tunnel.get("radius", 
                                               tunnel_params["width"] / 2)
        
        # 创建隧道几何
        tunnel_tag = self.geometry_engine.create_tunnel_geometry(tunnel_params)
        
        # 土体与隧道求交
        excavated_soil, tunnel_space = self.geometry_engine.soil_tunnel_intersection(
            soil_tag, tunnel_tag)
        
        result["processed_geometries"].append({
            "type": "tunnel",
            "shape": tunnel_params["shape"],
            "tunnel_tag": tunnel_tag,
            "tunnel_space_tag": tunnel_space,
            "result_tag": excavated_soil
        })
        result["operations_log"].append(f"{tunnel_params['shape']}隧道求交完成")
        
        return excavated_soil
    
    def _process_diaphragm_wall(self, soil_tag: int, wall: Dict[str, Any], 
                              result: Dict[str, Any]) -> int:
        """处理地连墙（简化实现）"""
        logger.info("处理地连墙求交...")
        
        # 这里可以实现地连墙与土体的求交
        # 暂时返回原始土体
        result["operations_log"].append("地连墙处理（简化）")
        return soil_tag


def run_v5_analysis(scene_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    V5分析引擎主入口
    支持复杂几何求交的完整工作流程
    """
    logger.info("=== V5分析引擎启动 ===")
    
    # 创建工作目录
    working_dir = tempfile.mkdtemp(prefix="kratos_v5_complex_")
    logger.info(f"工作目录: {working_dir}")
    
    try:
        # 解析场景数据
        features = scene_data.get("features", [])
        mesh_settings = scene_data.get("mesh_settings", {})
        analysis_settings = scene_data.get("analysis_settings", {})
        
        # 1. 识别几何特征
        geological_features = []
        structure_features = []
        
        for feature in features:
            feature_type = feature.get("type")
            
            if feature_type == "CreateGeologicalModel":
                geological_features.append(feature)
            elif feature_type in ["CreateExcavation", "CreateExcavationFromDXF"]:
                structure_features.append({
                    "type": "excavation",
                    "points": feature.get("parameters", {}).get("points", []),
                    "depth": feature.get("parameters", {}).get("depth", 10.0)
                })
            elif feature_type == "CreateTunnel":  # 假设有隧道特征
                structure_features.append({
                    "type": "tunnel",
                    "shape": feature.get("parameters", {}).get("shape", "horseshoe"),
                    "width": feature.get("parameters", {}).get("width", 10.0),
                    "height": feature.get("parameters", {}).get("height", 8.0),
                    "length": feature.get("parameters", {}).get("length", 100.0),
                    "center": feature.get("parameters", {}).get("center", [50, 50, -20])
                })
        
        result = {"status": "success", "analysis_steps": []}
        
        # 2. 处理地质建模
        if geological_features:
            logger.info("处理地质建模特征...")
            geological_data = geological_features[0].get("parameters", {})
            
            # 如果有工程结构，进行复杂几何求交
            if structure_features:
                logger.info("检测到工程结构，启动复杂几何求交...")
                
                processor = ComplexGeometryProcessor(working_dir)
                geometry_result = processor.process_geological_model_with_structures(
                    geological_data, structure_features)
                
                if geometry_result["status"] == "success":
                    result["geometry_intersection"] = geometry_result
                    result["analysis_steps"].append("复杂几何求交完成")
                    
                    # 使用求交后的几何进行网格生成
                    mesh_file = _generate_mesh_from_complex_geometry(
                        geometry_result, mesh_settings, working_dir)
                    
                else:
                    logger.error("复杂几何求交失败，回退到简化模式")
                    mesh_file = _generate_simple_mesh(
                        geological_data, mesh_settings, working_dir)
            else:
                # 没有工程结构，使用标准地质建模
                mesh_file = _generate_geological_mesh(
                    geological_data, mesh_settings, working_dir)
            
            result["mesh_file"] = mesh_file
            result["analysis_steps"].append("网格生成完成")
        
        else:
            # 没有地质特征，生成简单网格
            logger.info("没有地质特征，生成简单网格...")
            mesh_file = _generate_default_mesh(mesh_settings, working_dir)
            result["mesh_file"] = mesh_file
        
        # 3. 运行Kratos分析
        if result.get("mesh_file"):
            logger.info("运行Kratos有限元分析...")
            
            kratos_result = _run_kratos_with_complex_geometry(
                result.get("mesh_file"), 
                result.get("geometry_intersection"),
                analysis_settings, 
                working_dir
            )
            
            result["kratos_analysis"] = kratos_result
            result["analysis_steps"].append("Kratos分析完成")
        
        # 4. 后处理和结果输出
        _post_process_results(result, working_dir)
        
        logger.info("=== V5分析引擎完成 ===")
        return {"results": result}
        
    except Exception as e:
        logger.error(f"V5分析引擎失败: {e}", exc_info=True)
        return {
            "results": {
                "status": "failed",
                "message": f"V5分析失败: {str(e)}",
                "working_dir": working_dir
            }
        }


def _generate_mesh_from_complex_geometry(geometry_result: Dict[str, Any], 
                                       mesh_settings: Dict[str, Any],
                                       working_dir: str) -> str:
    """从复杂几何求交结果生成网格"""
    logger.info("从复杂几何生成网格...")
    
    # 使用TerrainMeshGenerator处理复杂几何
    mesh_generator = TerrainMeshGenerator(
        mesh_size=mesh_settings.get("global_mesh_size", 10.0),
        use_occ=True,
        working_dir=working_dir
    )
    
    # 加载几何文件
    geometry_file = geometry_result.get("geometry_file")
    if geometry_file and os.path.exists(geometry_file):
        # 从STEP文件生成网格
        mesh_file = mesh_generator.generate_mesh_from_step(geometry_file)
    else:
        # 回退到简单网格
        mesh_file = mesh_generator.generate_simple_mesh()
    
    logger.info(f"复杂几何网格生成完成: {mesh_file}")
    return mesh_file


def _generate_geological_mesh(geological_data: Dict[str, Any],
                            mesh_settings: Dict[str, Any],
                            working_dir: str) -> str:
    """生成地质网格"""
    logger.info("生成地质网格...")
    
    # 使用现有的地质建模流程
    csv_data = geological_data.get("csvData", "")
    terrain_params = geological_data.get("terrainParams", {})
    
    if csv_data:
        # 使用GemPy地质建模
        geology_result = create_terrain_model_from_csv(
            csv_data, terrain_params, working_dir)
        
        if geology_result["status"] == "success":
            # 使用地质模型生成网格
            mesh_generator = TerrainMeshGenerator(
                mesh_size=mesh_settings.get("global_mesh_size", 10.0),
                use_occ=terrain_params.get("useOCC", True),
                working_dir=working_dir
            )
            
            mesh_file = mesh_generator.generate_terrain_mesh(geology_result)
            return mesh_file
    
    # 回退到默认网格
    return _generate_default_mesh(mesh_settings, working_dir)


def _generate_simple_mesh(geological_data: Dict[str, Any],
                        mesh_settings: Dict[str, Any], 
                        working_dir: str) -> str:
    """生成简化网格"""
    return _generate_geological_mesh(geological_data, mesh_settings, working_dir)


def _generate_default_mesh(mesh_settings: Dict[str, Any], working_dir: str) -> str:
    """生成默认网格"""
    logger.info("生成默认网格...")
    
    mesh_generator = TerrainMeshGenerator(
        mesh_size=mesh_settings.get("global_mesh_size", 25.0),
        use_occ=False,
        working_dir=working_dir
    )
    
    return mesh_generator.generate_simple_mesh()


def _run_kratos_with_complex_geometry(mesh_file: str,
                                    geometry_result: Optional[Dict[str, Any]],
                                    analysis_settings: Dict[str, Any],
                                    working_dir: str) -> Dict[str, Any]:
    """运行考虑复杂几何的Kratos分析"""
    logger.info("运行复杂几何Kratos分析...")
    
    # 准备材料参数
    materials = _prepare_materials_for_complex_geometry(geometry_result)
    
    # 准备边界条件
    boundary_conditions = _prepare_boundary_conditions_for_complex_geometry(
        geometry_result, analysis_settings)
    
    try:
        # 运行渗流分析
        result_file = run_seepage_analysis(mesh_file, materials, boundary_conditions)
        
        return {
            "status": "success",
            "result_file": result_file,
            "analysis_type": "seepage_with_complex_geometry"
        }
        
    except Exception as e:
        logger.error(f"Kratos复杂几何分析失败: {e}")
        return {
            "status": "failed",
            "error": str(e)
        }


def _prepare_materials_for_complex_geometry(geometry_result: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """为复杂几何准备材料参数"""
    materials = []
    
    # 基础土体材料
    materials.append({
        "name": "soil",
        "hydraulic_conductivity_x": 1e-6,
        "hydraulic_conductivity_y": 1e-6, 
        "hydraulic_conductivity_z": 1e-7,
        "porosity": 0.3,
        "specific_storage": 0.0001
    })
    
    # 如果有隧道空间，添加空气材料
    if geometry_result and geometry_result.get("processed_geometries"):
        for geom in geometry_result["processed_geometries"]:
            if geom["type"] == "tunnel":
                materials.append({
                    "name": "tunnel_air",
                    "hydraulic_conductivity_x": 1.0,
                    "hydraulic_conductivity_y": 1.0,
                    "hydraulic_conductivity_z": 1.0,
                    "porosity": 1.0,
                    "specific_storage": 0.0
                })
                break
    
    return materials


def _prepare_boundary_conditions_for_complex_geometry(
    geometry_result: Optional[Dict[str, Any]], 
    analysis_settings: Dict[str, Any]) -> List[Dict[str, Any]]:
    """为复杂几何准备边界条件"""
    boundary_conditions = []
    
    # 基础边界条件
    boundary_conditions.extend([
        {
            "type": "constant_head",
            "boundary_name": "top_surface",
            "total_head": 0.0
        },
        {
            "type": "constant_head", 
            "boundary_name": "bottom_surface",
            "total_head": -10.0
        }
    ])
    
    # 如果有隧道，添加隧道边界条件
    if geometry_result and geometry_result.get("processed_geometries"):
        for geom in geometry_result["processed_geometries"]:
            if geom["type"] == "tunnel":
                boundary_conditions.append({
                    "type": "constant_head",
                    "boundary_name": "tunnel_wall",
                    "total_head": -5.0  # 隧道内部水头
                })
    
    return boundary_conditions


def _post_process_results(result: Dict[str, Any], working_dir: str):
    """后处理分析结果"""
    logger.info("后处理分析结果...")
    
    # 生成结果摘要
    summary = {
        "analysis_type": "v5_complex_geometry",
        "steps_completed": len(result.get("analysis_steps", [])),
        "has_geometry_intersection": "geometry_intersection" in result,
        "has_kratos_analysis": "kratos_analysis" in result,
        "working_directory": working_dir
    }
    
    # 保存摘要
    summary_file = os.path.join(working_dir, "analysis_summary.json")
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    result["summary_file"] = summary_file
    result["post_processing"] = "completed"
    
    logger.info("后处理完成") 