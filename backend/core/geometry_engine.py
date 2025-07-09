"""
统一几何引擎接口
支持多种几何内核：Gmsh、Gmsh(OCC)、PythonOCC
"""
from abc import ABC, abstractmethod
from typing import List, Tuple, Any
import numpy as np
from enum import Enum

# Suzaku cache integration
from .intelligent_cache import compute_geometry_hash


class GeometryEngine(Enum):
    """支持的几何引擎类型"""
    GMSH = "gmsh"
    GMSH_OCC = "gmsh_occ"
    PYGMSH = "pygmsh"
    PYTHONOCC = "pythonocc"


class GeometryKernel(ABC):
    """几何内核抽象基类"""

    @abstractmethod
    def create_box(self, center: Tuple[float, float, float],
                   dimensions: Tuple[float, float, float]) -> Any:
        """创建长方体"""
        pass

    @abstractmethod
    def create_surface_from_points(self, points: np.ndarray,
                                   triangles: np.ndarray) -> Any:
        """从点云和三角形创建表面"""
        pass

    @abstractmethod
    def boolean_cut(self, target: Any, tool: Any) -> Any:
        """布尔切割操作"""
        pass

    @abstractmethod
    def generate_mesh(self, geometry: Any, mesh_size: float = 1.0) -> Any:
        """生成网格"""
        pass


class GmshKernel(GeometryKernel):
    """原生 Gmsh 几何内核"""

    def __init__(self):
        try:
            import gmsh
            self.gmsh = gmsh
            self.gmsh.initialize()
            self.model = self.gmsh.model
            print("GmshKernel: 初始化成功")
        except ImportError:
            raise ImportError("Gmsh 未安装。请运行: pip install gmsh")

    def create_box(self, center: Tuple[float, float, float],
                   dimensions: Tuple[float, float, float]) -> int:
        """使用 Gmsh OCC 创建长方体"""
        x, y, z = center
        dx, dy, dz = dimensions
        box_tag = self.model.occ.addBox(
            x - dx / 2, y - dy / 2, z - dz / 2, dx, dy, dz)
        return box_tag

    def create_surface_from_points(self, points: np.ndarray,
                                   triangles: np.ndarray) -> int:
        """从点云创建表面"""
        # 添加点
        point_tags = []
        for point in points:
            tag = self.model.occ.addPoint(point[0], point[1], point[2])
            point_tags.append(tag)

        # 创建三角形表面
        # 注意：这是简化实现，实际需要更复杂的逻辑
        surface_tag = self.model.occ.addSurfaceLoop([])  # 需要完善
        return surface_tag

    def boolean_cut(self, target: int, tool: int) -> int:
        """布尔切割"""
        result = self.model.occ.cut([(3, target)], [(3, tool)])
        return result[0][0][1] if result[0] else target

    def generate_mesh(self, geometry: Any, mesh_size: float = 1.0) -> Any:
        """生成网格"""
        self.model.occ.synchronize()
        self.gmsh.option.setNumber("Mesh.MeshSizeMax", mesh_size)
        self.model.mesh.generate(3)

        # 1. 提取节点和三角面，用于计算几何哈希
        try:
            node_tags, node_coords, _ = self.model.mesh.getNodes()
            vertices = [
                (
                    node_coords[i],
                    node_coords[i + 1],
                    node_coords[i + 2],
                )
                for i in range(0, len(node_coords), 3)
            ]

            # 使用元素类型2（三角形）作为表面示例
            tri_tags, tri_nodes = self.model.mesh.getElementsByType(2)
            faces: List[Tuple[int, int, int]] = [
                (
                    tri_nodes[i],
                    tri_nodes[i + 1],
                    tri_nodes[i + 2],
                )
                for i in range(0, len(tri_nodes), 3)
            ]

            g_hash = compute_geometry_hash(vertices, faces)
            setattr(self.model.mesh, "geometry_hash", g_hash)
        except Exception:
            pass  # 忽略哈希错误，不影响原流程

        return self.model.mesh


class PyGmshKernel(GeometryKernel):
    """PyGmsh 几何内核（当前使用的）"""

    def __init__(self):
        try:
            import pygmsh
            self.pygmsh = pygmsh
            self.geometry = None
            print("PyGmshKernel: 初始化成功")
        except ImportError:
            raise ImportError("PyGmsh 未安装。请运行: pip install pygmsh")

    def create_box(self, center: Tuple[float, float, float],
                   dimensions: Tuple[float, float, float]) -> Any:
        """使用 PyGmsh 创建长方体"""
        if not self.geometry:
            raise ValueError("需要先创建 geometry context")

        x, y, z = center
        dx, dy, dz = dimensions
        return self.geometry.add_box(
            x0=x-dx/2, y0=y-dy/2, z0=z-dz/2,
            dx=dx, dy=dy, dz=dz
        )

    def create_surface_from_points(self, points: np.ndarray,
                                   triangles: np.ndarray) -> Any:
        """从点云创建表面"""
        if not self.geometry:
            raise ValueError("需要先创建 geometry context")

        return self.geometry.add_surface(points, triangles)

    def boolean_cut(self, target: Any, tool: Any) -> Any:
        """布尔切割"""
        if not self.geometry:
            raise ValueError("需要先创建 geometry context")

        return self.geometry.cut(target, tool)

    def generate_mesh(self, geometry: Any, mesh_size: float = 1.0) -> Any:
        """生成网格"""
        if not self.geometry:
            raise ValueError("需要先创建 geometry context")

        self.geometry.set_mesh_size_callback(
            lambda dim, tag, x, y, z: mesh_size)
        mesh = self.geometry.generate_mesh()

        # 计算几何哈希
        try:
            vertices = [tuple(p) for p in mesh.points.tolist()]
            # 仅取第一种单元(通常 surface/volume)，简化处理
            faces: List[Tuple[int, int, int]] = []
            if mesh.cells:
                cell_block = mesh.cells[0]
                if cell_block.data.shape[1] == 3:  # triangles
                    faces = [tuple(f) for f in cell_block.data.tolist()]
            g_hash = compute_geometry_hash(vertices, faces)
            setattr(mesh, "geometry_hash", g_hash)
        except Exception:
            pass

        return mesh


class GeometryEngineFactory:
    """几何引擎工厂类"""

    @staticmethod
    def create_kernel(engine_type: GeometryEngine) -> GeometryKernel:
        """创建指定类型的几何内核"""
        if engine_type == GeometryEngine.GMSH:
            return GmshKernel()
        elif engine_type == GeometryEngine.PYGMSH:
            return PyGmshKernel()
        else:
            raise ValueError(f"不支持的几何引擎类型: {engine_type}")

    @staticmethod
    def get_available_engines() -> List[GeometryEngine]:
        """获取当前环境中可用的几何引擎"""
        available = []

        # 检查 Gmsh
        try:
            import gmsh
            available.append(GeometryEngine.GMSH)
            gmsh.is_initialized()  # just to use the import
        except ImportError:
            pass

        # 检查 PyGmsh
        try:
            import pygmsh
            available.append(GeometryEngine.PYGMSH)
            pygmsh.__version__  # just to use the import
        except ImportError:
            pass

        return available


# 使用示例
if __name__ == "__main__":
    # 获取可用引擎
    available_engines = GeometryEngineFactory.get_available_engines()
    print(f"可用的几何引擎: {available_engines}")

    # 创建几何内核
    if GeometryEngine.GMSH in available_engines:
        kernel = GeometryEngineFactory.create_kernel(GeometryEngine.GMSH)
        print("使用原生 Gmsh 引擎")
    elif GeometryEngine.PYGMSH in available_engines:
        kernel = GeometryEngineFactory.create_kernel(GeometryEngine.PYGMSH)
        print("使用 PyGmsh 引擎")
    else:
        print("没有可用的几何引擎") 