import numpy as np
from scipy.interpolate import Rbf
from typing import List, Dict, Tuple
import os
import uuid

# 懒加载 PyVista，避免在模块导入阶段因缺失而崩溃
PV_AVAILABLE = False
try:
    import pyvista as pv  # type: ignore
    PV_AVAILABLE = True
except Exception:
    PV_AVAILABLE = False

class SoilLayerGenerator:
    """
    Handles the generation of a 3D soil layer model from borehole data.
    Implements 'RBF + Trend Surface Extrapolation + Hard Cutoff' strategy.
    """

    def __init__(
        self,
        boreholes: List[Dict[str, float]],
        domain_expansion: Tuple[float, float] = (50.0, 50.0),
        bottom_elevation: float = -30.0,
        transition_distance: float = 50.0
    ):
        if not boreholes:
            raise ValueError("Borehole data cannot be empty.")
        self.boreholes = np.array([[p['x'], p['y'], p['z']] for p in boreholes])
        self.domain_expansion = domain_expansion
        self.bottom_elevation = bottom_elevation
        self.transition_distance = transition_distance
        
        self.points_xy = self.boreholes[:, :2]
        self.values_z = self.boreholes[:, 2]

        self._rbf_interpolator = None
        self._trend_surface_coeffs = None

    def _train(self):
        """Trains the RBF interpolator and fits the trend surface."""
        self._rbf_interpolator = Rbf(self.points_xy[:, 0], self.points_xy[:, 1], self.values_z, function='multiquadric', smooth=0.1)
        A = np.c_[self.points_xy, np.ones(len(self.boreholes))]
        self._trend_surface_coeffs, _, _, _ = np.linalg.lstsq(A, self.values_z, rcond=None)

    def _predict_trend_surface(self, points_xy: np.ndarray) -> np.ndarray:
        A = np.c_[points_xy, np.ones(len(points_xy))]
        return A @ self._trend_surface_coeffs

    def _calculate_blended_elevation(self, grid_points_xy: np.ndarray) -> np.ndarray:
        z_rbf = self._rbf_interpolator(grid_points_xy[:, 0], grid_points_xy[:, 1])
        z_trend = self._predict_trend_surface(grid_points_xy)

        from scipy.spatial import cKDTree
        tree = cKDTree(self.points_xy)
        distances, _ = tree.query(grid_points_xy, k=1)
        
        t = np.clip(distances / self.transition_distance, 0.0, 1.0)
        rbf_weight = 1.0 - t

        z_blended = (z_rbf * rbf_weight) + (z_trend * (1 - rbf_weight))
        return np.maximum(z_blended, self.bottom_elevation)

    def generate_and_export_gltf(self, grid_resolution: float = 2.0, output_dir: str = "output") -> str:
        """
        Generates the surface mesh and exports it directly to a glTF file.
        Returns the path to the generated file.
        """
        # 延迟导入 PyVista，避免服务启动时因未安装而失败
        try:
            import pyvista as pv  # type: ignore
        except Exception as e:
            raise RuntimeError(f"PyVista 未安装或不可用，无法导出 glTF: {e}")
        self._train()
        
        min_coords = self.points_xy.min(axis=0) - self.domain_expansion
        max_coords = self.points_xy.max(axis=0) + self.domain_expansion

        x_coords = np.arange(min_coords[0], max_coords[0], grid_resolution)
        y_coords = np.arange(min_coords[1], max_coords[1], grid_resolution)
        
        grid_x, grid_y = np.meshgrid(x_coords, y_coords)
        grid_points_flat = np.vstack([grid_x.ravel(), grid_y.ravel()]).T

        z_grid_flat = self._calculate_blended_elevation(grid_points_flat)
        z_grid = z_grid_flat.reshape(grid_x.shape)

        mesh = pv.StructuredGrid(grid_x, grid_y, z_grid)
        mesh['elevation'] = z_grid.ravel(order='F')
        
        os.makedirs(output_dir, exist_ok=True)
        filename = f"soil_domain_{uuid.uuid4().hex}.gltf"
        output_path = os.path.join(output_dir, filename)
        
        plotter = pv.Plotter(off_screen=True)
        plotter.add_mesh(mesh, cmap='terrain')
        plotter.export_gltf(output_path)
        
        return output_path 