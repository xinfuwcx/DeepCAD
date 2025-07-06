import gempy as gp
import pandas as pd
import numpy as np
from io import StringIO
import uuid
import os
import tempfile
from typing import Dict, Any, List, Tuple
import logging

logger = logging.getLogger(__name__)


def create_terrain_model_from_csv(csv_data: str) -> Dict[str, Any]:
    """
    基于探测数据生成三维地形模型
    
    核心特点：
    1. 上表面根据探测数据起伏变化
    2. 其他5个面（前后左右底面）保持平整
    3. 生成规则的六面体地质体
    4. 为Gmsh OCC功能提供精确的几何数据
    
    Args:
        csv_data: 包含钻孔/探测数据的CSV字符串
        
    Returns:
        包含地形几何体信息的字典，供Gmsh OCC处理
    """
    logger.info("开始基于探测数据的三维地形建模...")
    
    # 1. 解析探测数据
    df_points = pd.read_csv(StringIO(csv_data))
    
    # 检查必需的列
    required_columns = ['X', 'Y', 'Z', 'surface']
    if not all(col in df_points.columns for col in required_columns):
        raise ValueError(f"探测数据必须包含以下列: {required_columns}")
    
    # 标准化列名
    df_points = df_points.rename(columns={
        'x': 'X', 'y': 'Y', 'z': 'Z', 'surface': 'surface'
    })
    
    logger.info(f"解析探测数据：{len(df_points)} 个数据点")
    
    # 2. 计算地形边界（确保规则的六面体）
    x_min, x_max = df_points['X'].min(), df_points['X'].max()
    y_min, y_max = df_points['Y'].min(), df_points['Y'].max()
    z_min, z_max = df_points['Z'].min(), df_points['Z'].max()
    
    # 添加边界缓冲区
    buffer_xy = max(x_max - x_min, y_max - y_min) * 0.1  # 10%缓冲区
    buffer_z = (z_max - z_min) * 0.2  # 20%深度缓冲区
    
    terrain_extent = {
        'x_min': x_min - buffer_xy,
        'x_max': x_max + buffer_xy,
        'y_min': y_min - buffer_xy,
        'y_max': y_max + buffer_xy,
        'z_min': z_min - buffer_z,  # 底面固定
        'z_max': z_max + buffer_z   # 为地表起伏预留空间
    }
    
    logger.info(f"地形范围: X[{terrain_extent['x_min']:.1f}, {terrain_extent['x_max']:.1f}], "
               f"Y[{terrain_extent['y_min']:.1f}, {terrain_extent['y_max']:.1f}], "
               f"Z[{terrain_extent['z_min']:.1f}, {terrain_extent['z_max']:.1f}]")
    
    # 3. 生成地层表面（重点：上表面起伏）
    surface_names = df_points['surface'].unique().tolist()
    surface_z_avg = df_points.groupby('surface')['Z'].mean().sort_values(
        ascending=False)
    surface_names = surface_z_avg.index.tolist()
    
    logger.info(f"识别到地层: {surface_names}")
    
    # 4. 创建GemPy地质模型（专门用于地形建模）
    geo_model = gp.create_geomodel(
        project_name='TerrainModel',
        extent=[
            terrain_extent['x_min'], terrain_extent['x_max'],
            terrain_extent['y_min'], terrain_extent['y_max'],
            terrain_extent['z_min'], terrain_extent['z_max']
        ],
        resolution=[60, 60, 30],  # 提高XY分辨率，适中Z分辨率
        importer_helper=gp.data.ImporterHelper(
            surface_points_df=df_points[['X', 'Y', 'Z', 'surface']],
            orientations_df=pd.DataFrame(
                columns=['X', 'Y', 'Z', 'G_x', 'G_y', 'G_z', 'surface'])
        )
    )
    
    # 5. 设置地层层序
    gp.map_stack_to_surfaces(
        gempy_model=geo_model,
        mapping_object={"TerrainStack": tuple(surface_names)}
    )
    
    logger.info("开始GemPy地形建模计算...")
    
    # 6. 计算地质模型
    gp.compute_model(geo_model)
    
    logger.info("GemPy地形建模完成")
    
    # 7. 提取地形几何数据（专门为Gmsh OCC设计）
    terrain_data = {
        "terrain_extent": terrain_extent,
        "surface_names": surface_names,
        "top_surface": {},      # 起伏的上表面
        "flat_surfaces": {},    # 平整的5个面
        "volumes": {},          # 地层体积
        "gempy_model": geo_model,
        "interpolation_grid": None
    }
    
    # 8. 提取起伏的上表面（最重要的部分）
    top_surface_name = surface_names[0]  # 最上层
    try:
        top_surface_mesh = gp.get_surface_mesh(geo_model, top_surface_name)
        if top_surface_mesh is not None and len(top_surface_mesh.points) > 0:
            terrain_data["top_surface"] = {
                "name": top_surface_name,
                "points": top_surface_mesh.points,
                "triangles": top_surface_mesh.cells_dict.get('triangle', []),
                "is_undulating": True,
                "material_id": 1
            }
            logger.info(f"提取起伏上表面 '{top_surface_name}': "
                       f"{len(top_surface_mesh.points)} 个点")
    except Exception as e:
        logger.error(f"无法提取上表面: {e}")
        # 回退到平面上表面
        terrain_data["top_surface"] = _create_flat_top_surface(terrain_extent)
    
    # 9. 创建平整的5个面（前后左右底面）
    terrain_data["flat_surfaces"] = _create_flat_boundary_surfaces(terrain_extent)
    
    # 10. 生成地层体积信息
    terrain_data["volumes"] = _create_terrain_volumes(
        surface_names, terrain_extent)
    
    # 11. 创建插值网格（用于Gmsh OCC）
    terrain_data["interpolation_grid"] = _create_interpolation_grid(
        geo_model, terrain_extent)
    
    logger.info(f"地形建模完成，生成起伏上表面和{len(terrain_data['flat_surfaces'])}个平整面")
    
    return terrain_data


def _create_flat_top_surface(extent: Dict[str, float]) -> Dict[str, Any]:
    """创建平面上表面（回退方案）"""
    corners = np.array([
        [extent['x_min'], extent['y_min'], extent['z_max']],
        [extent['x_max'], extent['y_min'], extent['z_max']],
        [extent['x_max'], extent['y_max'], extent['z_max']],
        [extent['x_min'], extent['y_max'], extent['z_max']]
    ])
    
    triangles = np.array([[0, 1, 2], [0, 2, 3]])
    
    return {
        "name": "flat_top_surface",
        "points": corners,
        "triangles": triangles,
        "is_undulating": False,
        "material_id": 1
    }


def _create_flat_boundary_surfaces(extent: Dict[str, float]) -> Dict[str, Any]:
    """创建平整的边界面（前后左右底面）"""
    surfaces = {}
    
    # 底面（Z = z_min）
    surfaces["bottom"] = {
        "points": np.array([
            [extent['x_min'], extent['y_min'], extent['z_min']],
            [extent['x_max'], extent['y_min'], extent['z_min']],
            [extent['x_max'], extent['y_max'], extent['z_min']],
            [extent['x_min'], extent['y_max'], extent['z_min']]
        ]),
        "triangles": np.array([[0, 1, 2], [0, 2, 3]]),
        "normal": [0, 0, -1]
    }
    
    # 前面（Y = y_min）
    surfaces["front"] = {
        "points": np.array([
            [extent['x_min'], extent['y_min'], extent['z_min']],
            [extent['x_max'], extent['y_min'], extent['z_min']],
            [extent['x_max'], extent['y_min'], extent['z_max']],
            [extent['x_min'], extent['y_min'], extent['z_max']]
        ]),
        "triangles": np.array([[0, 1, 2], [0, 2, 3]]),
        "normal": [0, -1, 0]
    }
    
    # 后面（Y = y_max）
    surfaces["back"] = {
        "points": np.array([
            [extent['x_min'], extent['y_max'], extent['z_min']],
            [extent['x_max'], extent['y_max'], extent['z_min']],
            [extent['x_max'], extent['y_max'], extent['z_max']],
            [extent['x_min'], extent['y_max'], extent['z_max']]
        ]),
        "triangles": np.array([[0, 1, 2], [0, 2, 3]]),
        "normal": [0, 1, 0]
    }
    
    # 左面（X = x_min）
    surfaces["left"] = {
        "points": np.array([
            [extent['x_min'], extent['y_min'], extent['z_min']],
            [extent['x_min'], extent['y_max'], extent['z_min']],
            [extent['x_min'], extent['y_max'], extent['z_max']],
            [extent['x_min'], extent['y_min'], extent['z_max']]
        ]),
        "triangles": np.array([[0, 1, 2], [0, 2, 3]]),
        "normal": [-1, 0, 0]
    }
    
    # 右面（X = x_max）
    surfaces["right"] = {
        "points": np.array([
            [extent['x_max'], extent['y_min'], extent['z_min']],
            [extent['x_max'], extent['y_max'], extent['z_min']],
            [extent['x_max'], extent['y_max'], extent['z_max']],
            [extent['x_max'], extent['y_min'], extent['z_max']]
        ]),
        "triangles": np.array([[0, 1, 2], [0, 2, 3]]),
        "normal": [1, 0, 0]
    }
    
    return surfaces


def _create_terrain_volumes(surface_names: List[str], 
                           extent: Dict[str, float]) -> Dict[str, Any]:
    """创建地层体积信息"""
    volumes = {}
    
    for i, surface_name in enumerate(surface_names):
        volumes[surface_name] = {
            "material_id": i + 1,
            "top_surface": surface_name,
            "bottom_surface": (surface_names[i + 1] 
                             if i + 1 < len(surface_names) else "bedrock"),
            "properties": {
                "density": 1800.0 + i * 200,
                "young_modulus": 1e7 + i * 1e7,
                "poisson_ratio": 0.3,
                "hydraulic_conductivity": 1e-6 / (i + 1),
                "cohesion": 20000 + i * 10000,  # 粘聚力
                "friction_angle": 25 + i * 5    # 内摩擦角
            },
            "extent": extent
        }
    
    return volumes


def _create_interpolation_grid(geo_model, extent: Dict[str, float]) -> Dict[str, Any]:
    """创建插值网格，用于Gmsh OCC精确建模"""
    try:
        # 获取GemPy的插值结果
        interpolation = gp.compute_model(geo_model)
        
        # 创建规则网格
        nx, ny, nz = 50, 50, 20
        x = np.linspace(extent['x_min'], extent['x_max'], nx)
        y = np.linspace(extent['y_min'], extent['y_max'], ny)
        z = np.linspace(extent['z_min'], extent['z_max'], nz)
        
        X, Y, Z = np.meshgrid(x, y, z, indexing='ij')
        
        return {
            "grid_points": np.column_stack([X.ravel(), Y.ravel(), Z.ravel()]),
            "grid_shape": (nx, ny, nz),
            "extent": extent,
            "interpolation_result": interpolation
        }
    except Exception as e:
        logger.warning(f"无法创建插值网格: {e}")
        return None


def export_terrain_for_gmsh_occ(terrain_data: Dict[str, Any], 
                               output_dir: str = None) -> str:
    """
    将地形数据导出为Gmsh OCC可读格式
    专门针对：上表面起伏 + 5个平面的几何体
    
    Args:
        terrain_data: 地形几何数据
        output_dir: 输出目录
        
    Returns:
        导出的.geo文件路径
    """
    if output_dir is None:
        output_dir = tempfile.gettempdir()
    
    filename = f"terrain_model_{uuid.uuid4().hex[:8]}.geo"
    filepath = os.path.join(output_dir, filename)
    
    with open(filepath, 'w') as f:
        f.write("// 基于探测数据的三维地形模型 - Gmsh OCC格式\n")
        f.write("// 特点：上表面起伏，其他5个面平整\n\n")
        
        f.write("SetFactory(\"OpenCASCADE\");\n\n")
        
        extent = terrain_data["terrain_extent"]
        
        # 写入边界框信息
        f.write("// 地形边界\n")
        f.write(f"x_min = {extent['x_min']};\n")
        f.write(f"x_max = {extent['x_max']};\n")
        f.write(f"y_min = {extent['y_min']};\n")
        f.write(f"y_max = {extent['y_max']};\n")
        f.write(f"z_min = {extent['z_min']};\n")
        f.write(f"z_max = {extent['z_max']};\n\n")
        
        # 创建基础长方体
        f.write("// 创建基础长方体\n")
                 f.write("Box(1) = {{x_min, y_min, z_min, ")
         f.write(f"{extent['x_max'] - extent['x_min']}, ")
         f.write(f"{extent['y_max'] - extent['y_min']}, ")
         f.write(f"{extent['z_max'] - extent['z_min']}}};\n\n")
        
        # 处理起伏上表面
        if terrain_data["top_surface"]["is_undulating"]:
            f.write("// 起伏上表面处理\n")
            f.write("// 注意：这里需要根据实际的表面点云数据\n")
            f.write("// 使用OpenCASCADE的曲面拟合功能\n\n")
            
            # 写入表面点
            points = terrain_data["top_surface"]["points"]
            f.write(f"// 上表面数据点 ({len(points)} 个点)\n")
            for i, point in enumerate(points[:20]):  # 限制点数
                f.write(f"Point({i+100}) = {{{point[0]}, {point[1]}, "
                       f"{point[2]}, 1.0}};\n")
        
        # 写入材料属性
        f.write("\n// 材料属性\n")
        for volume_name, volume_data in terrain_data["volumes"].items():
            f.write(f"// {volume_name}: Material ID {volume_data['material_id']}\n")
            props = volume_data["properties"]
            f.write(f"//   密度: {props['density']}, ")
            f.write(f"弹性模量: {props['young_modulus']}\n")
            f.write(f"//   粘聚力: {props['cohesion']}, ")
            f.write(f"内摩擦角: {props['friction_angle']}°\n")
    
    logger.info(f"地形几何体已导出到: {filepath}")
    return filepath


# 保持向后兼容的别名
create_geological_model_from_csv = create_terrain_model_from_csv 