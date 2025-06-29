"""
@file occ_wrapper.py
@description OpenCascade geometry kernel wrapper for NURBS modeling and Three.js visualization
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

from typing import Dict, Any, List
import numpy as np

try:
    # OpenCascade imports
    from OCC.Core.gp import gp_Pnt, gp_Dir, gp_Ax2
    from OCC.Core.BRepPrimAPI import (
        BRepPrimAPI_MakeBox,
        BRepPrimAPI_MakeCylinder
    )
    from OCC.Core.BRepBuilderAPI import BRepBuilderAPI_MakeFace
    from OCC.Core.GeomAPI import GeomAPI_PointsToBSplineSurface
    from OCC.Core.TColgp import TColgp_Array2OfPnt
    
    HAS_OCC = True
except ImportError:
    HAS_OCC = False
    print("Warning: OpenCascade Core (OCC) not available")


class OCCWrapper:
    """OpenCascade geometry kernel wrapper"""
    
    def __init__(self):
        """Initialize OCC wrapper"""
        if not HAS_OCC:
            print("OCC not available, using simulation mode")
        
        self.shapes = {}  # Store created shapes
        self.shape_counter = 0  # Shape counter
    
    def create_box(self, width: float, length: float, height: float, 
                  center_x: float = 0, center_y: float = 0, center_z: float = 0) -> int:
        """Create box primitive"""
        self.shape_counter += 1
        shape_id = self.shape_counter
        
        if HAS_OCC:
            # Calculate corner point
            x_min = center_x - width/2
            y_min = center_y - length/2
            z_min = center_z - height/2
            
            # Create box
            box = BRepPrimAPI_MakeBox(gp_Pnt(x_min, y_min, z_min), width, length, height).Shape()
            
            self.shapes[shape_id] = {
                "id": shape_id,
                "type": "box",
                "shape": box,
                "params": {
                    "width": width,
                    "length": length,
                    "height": height,
                    "center": [center_x, center_y, center_z]
                }
            }
        else:
            # Simulation mode
            self.shapes[shape_id] = {
                "id": shape_id,
                "type": "box",
                "params": {
                    "width": width,
                    "length": length,
                    "height": height,
                    "center": [center_x, center_y, center_z]
                }
            }
        
        return shape_id
    
    def create_cylinder(self, radius: float, height: float, 
                       center_x: float = 0, center_y: float = 0, center_z: float = 0) -> int:
        """Create cylinder primitive"""
        self.shape_counter += 1
        shape_id = self.shape_counter
        
        if HAS_OCC:
            # Create cylinder
            cylinder = BRepPrimAPI_MakeCylinder(
                gp_Ax2(gp_Pnt(center_x, center_y, center_z - height/2), gp_Dir(0, 0, 1)), 
                radius, height
            ).Shape()
            
            self.shapes[shape_id] = {
                "id": shape_id,
                "type": "cylinder",
                "shape": cylinder,
                "params": {
                    "radius": radius,
                    "height": height,
                    "center": [center_x, center_y, center_z]
                }
            }
        else:
            # Simulation mode
            self.shapes[shape_id] = {
                "id": shape_id,
                "type": "cylinder",
                "params": {
                    "radius": radius,
                    "height": height,
                    "center": [center_x, center_y, center_z]
                }
            }
        
        return shape_id
    
    def create_nurbs_surface(self, control_points: List[List[List[float]]], 
                           u_degree: int = 3, v_degree: int = 3) -> int:
        """Create NURBS surface"""
        self.shape_counter += 1
        shape_id = self.shape_counter
        
        # Save parameters
        params = {
            "control_points": control_points,
            "u_degree": u_degree,
            "v_degree": v_degree
        }
        
        if HAS_OCC:
            try:
                # Validate control points count
                u_count = len(control_points)
                v_count = len(control_points[0]) if u_count > 0 else 0
                
                if u_count < u_degree + 1 or v_count < v_degree + 1:
                    raise ValueError(f"Need at least {u_degree+1}x{v_degree+1} control points")
                
                # Create control points array
                array = TColgp_Array2OfPnt(1, u_count, 1, v_count)
                for u in range(u_count):
                    for v in range(v_count):
                        x, y, z = control_points[u][v]
                        array.SetValue(u+1, v+1, gp_Pnt(x, y, z))
                
                # Create NURBS surface
                nurbs_surface = GeomAPI_PointsToBSplineSurface(
                    array, u_degree, v_degree, False, 1.0e-3
                ).Surface()
                
                # Convert surface to face
                face = BRepBuilderAPI_MakeFace(nurbs_surface, 1.0e-6).Face()
                
                self.shapes[shape_id] = {
                    "id": shape_id,
                    "type": "nurbs_surface",
                    "shape": face,
                    "params": params
                }
            except Exception as e:
                print(f"Failed to create NURBS surface: {e}")
                # Simulation mode
                self.shapes[shape_id] = {
                    "id": shape_id,
                    "type": "nurbs_surface",
                    "params": params
                }
        else:
            # Simulation mode
            self.shapes[shape_id] = {
                "id": shape_id,
                "type": "nurbs_surface",
                "params": params
            }
        
        return shape_id
    
    def export_to_threejs(self, shape_id: int) -> Dict[str, Any]:
        """Export shape to Three.js compatible format"""
        if shape_id not in self.shapes:
            return {}
        
        shape_info = self.shapes[shape_id]
        params = shape_info.get("params", {})
        shape_type = shape_info["type"]
        
        # Create Three.js compatible data
        if shape_type == "box":
            return self._create_box_threejs(params)
        elif shape_type == "cylinder":
            return self._create_cylinder_threejs(params)
        elif shape_type == "nurbs_surface":
            return self._create_nurbs_threejs(params)
        
        return {}
    
    def _create_box_threejs(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create Three.js box data"""
        width = params.get("width", 1)
        length = params.get("length", 1)
        height = params.get("height", 1)
        center = params.get("center", [0, 0, 0])
        
        return {
            "type": "Box",
            "width": width,
            "height": height,
            "depth": length,
            "position": center,
            "material": {
                "color": 0xcccccc,
                "transparent": True,
                "opacity": 0.8
            }
        }
    
    def _create_cylinder_threejs(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create Three.js cylinder data"""
        radius = params.get("radius", 1)
        height = params.get("height", 1)
        center = params.get("center", [0, 0, 0])
        
        return {
            "type": "Cylinder",
            "radiusTop": radius,
            "radiusBottom": radius,
            "height": height,
            "position": center,
            "material": {
                "color": 0xcccccc,
                "transparent": True,
                "opacity": 0.8
            }
        }
    
    def _create_nurbs_threejs(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create Three.js NURBS surface data"""
        control_points = params.get("control_points", [])
        u_degree = params.get("u_degree", 3)
        v_degree = params.get("v_degree", 3)
        
        # Flatten nested array
        points_flat = []
        for u_points in control_points:
            for point in u_points:
                points_flat.extend(point)
        
        u_count = len(control_points)
        v_count = len(control_points[0]) if u_count > 0 else 0
        
        return {
            "type": "NURBSSurface",
            "controlPoints": points_flat,
            "uCount": u_count,
            "vCount": v_count,
            "uDegree": u_degree,
            "vDegree": v_degree,
            "material": {
                "color": 0xcccccc,
                "transparent": True,
                "opacity": 0.8,
                "wireframe": True
            }
        }


class OCCToIGAConverter:
    """OpenCascade to IGA格式转换器"""
    
    def __init__(self, occ_wrapper: OCCWrapper):
        """初始化转换器"""
        self.occ_wrapper = occ_wrapper
        
    def convert_surface_to_iga(self, nurbs_id: int) -> Dict[str, Any]:
        """
        将NURBS曲面转换为IGA模型数据
        
        Args:
            nurbs_id: NURBS曲面的ID
            
        Returns:
            Dict: IGA模型数据
        """
        if nurbs_id not in self.occ_wrapper.shapes:
            return {}
        
        shape_info = self.occ_wrapper.shapes[nurbs_id]
        shape_type = shape_info["type"]
        
        if shape_type != "nurbs_surface" and not HAS_OCC:
            # 如果不是NURBS曲面，尝试创建一个
            return self._create_simplified_iga_data(shape_info)
        
        if not HAS_OCC:
            # 模拟模式
            return {
                "id": nurbs_id,
                "type": "iga",
                "degree_u": 3,
                "degree_v": 3,
                "knots_u": [0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0],
                "knots_v": [0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0],
                "control_points": [
                    [
                        [0.0, 0.0, 0.0, 1.0],
                        [0.0, 1.0, 0.0, 1.0],
                        [0.0, 2.0, 0.0, 1.0],
                        [0.0, 3.0, 0.0, 1.0]
                    ],
                    [
                        [1.0, 0.0, 0.0, 1.0],
                        [1.0, 1.0, 1.0, 1.0],
                        [1.0, 2.0, 1.0, 1.0],
                        [1.0, 3.0, 0.0, 1.0]
                    ],
                    [
                        [2.0, 0.0, 0.0, 1.0],
                        [2.0, 1.0, 1.0, 1.0],
                        [2.0, 2.0, 1.0, 1.0],
                        [2.0, 3.0, 0.0, 1.0]
                    ],
                    [
                        [3.0, 0.0, 0.0, 1.0],
                        [3.0, 1.0, 0.0, 1.0],
                        [3.0, 2.0, 0.0, 1.0],
                        [3.0, 3.0, 0.0, 1.0]
                    ]
                ]
            }
            
        try:
            # 从OCC形状提取NURBS数据
            from OCC.Core.GeomConvert import geomconvert_SurfaceToBSplineSurface
            from OCC.Core.BRepBuilderAPI import BRepBuilderAPI_MakeFace
            from OCC.Core.BRepAdaptor import BRepAdaptor_Surface
            from OCC.Core.GeomAbs import GeomAbs_BSplineSurface
            
            shape = shape_info["shape"]
            
            # 获取BSpline曲面
            face_adaptor = BRepAdaptor_Surface(shape)
            
            if face_adaptor.GetType() != GeomAbs_BSplineSurface:
                # 不是BSpline曲面，尝试转换
                geom_surface = face_adaptor.Surface().Surface()
                bspline_surface = geomconvert_SurfaceToBSplineSurface(geom_surface)
            else:
                bspline_surface = face_adaptor.BSpline()
            
            # 获取NURBS参数
            degree_u = bspline_surface.UDegree()
            degree_v = bspline_surface.VDegree()
            
            # 获取节点向量
            knots_u = []
            knots_v = []
            
            for i in range(1, bspline_surface.NbUKnots() + 1):
                mult = bspline_surface.UMultiplicity(i)
                knot = bspline_surface.UKnot(i)
                for _ in range(mult):
                    knots_u.append(knot)
                    
            for i in range(1, bspline_surface.NbVKnots() + 1):
                mult = bspline_surface.VMultiplicity(i)
                knot = bspline_surface.VKnot(i)
                for _ in range(mult):
                    knots_v.append(knot)
            
            # 获取控制点
            control_points = []
            weights = []
            
            for u in range(1, bspline_surface.NbUPoles() + 1):
                u_points = []
                u_weights = []
                for v in range(1, bspline_surface.NbVPoles() + 1):
                    pole = bspline_surface.Pole(u, v)
                    weight = bspline_surface.Weight(u, v)
                    
                    u_points.append([pole.X(), pole.Y(), pole.Z(), weight])
                    u_weights.append(weight)
                
                control_points.append(u_points)
                weights.append(u_weights)
            
            # IGA模型数据
            iga_data = {
                "id": nurbs_id,
                "type": "iga",
                "degree_u": degree_u,
                "degree_v": degree_v,
                "knots_u": knots_u,
                "knots_v": knots_v,
                "control_points": control_points,
                "weights": weights
            }
            
            return iga_data
            
        except Exception as e:
            print(f"转换NURBS到IGA失败: {e}")
            # 失败时使用简化模型
            return self._create_simplified_iga_data(shape_info)
    
    def export_iga_input_file(self, nurbs_id: int, file_path: str) -> bool:
        """
        导出IGA输入文件
        
        Args:
            nurbs_id: NURBS曲面的ID
            file_path: 文件路径
            
        Returns:
            bool: 成功标志
        """
        iga_data = self.convert_surface_to_iga(nurbs_id)
        
        if not iga_data:
            return False
        
        try:
            with open(file_path, 'w') as f:
                f.write("# IGA模型数据\n")
                f.write(f"NURBS_ID {nurbs_id}\n")
                f.write(f"NURBS_DEGREE_U {iga_data['degree_u']}\n")
                f.write(f"NURBS_DEGREE_V {iga_data['degree_v']}\n")
                
                f.write(f"KNOTS_U {len(iga_data['knots_u'])}\n")
                f.write(" ".join(map(str, iga_data['knots_u'])) + "\n")
                
                f.write(f"KNOTS_V {len(iga_data['knots_v'])}\n")
                f.write(" ".join(map(str, iga_data['knots_v'])) + "\n")
                
                # 计算控制点数量
                control_point_count = 0
                for u_points in iga_data['control_points']:
                    control_point_count += len(u_points)
                
                f.write(f"CONTROL_POINTS {control_point_count}\n")
                for u_points in iga_data['control_points']:
                    for point in u_points:
                        f.write(f"{point[0]} {point[1]} {point[2]} {point[3]}\n")
            
            return True
            
        except Exception as e:
            print(f"导出IGA输入文件失败: {e}")
            return False
    
    def create_nurbs_patch(self, control_points: List[List[List[float]]], 
                          u_degree: int = 3, v_degree: int = 3) -> Dict[str, Any]:
        """
        创建NURBS面片
        
        Args:
            control_points: 控制点网格
            u_degree: U方向次数
            v_degree: V方向次数
            
        Returns:
            Dict: NURBS面片数据
        """
        # 验证控制点
        if not control_points or len(control_points) < u_degree + 1:
            print("控制点数量不足")
            return {}
            
        if not control_points[0] or len(control_points[0]) < v_degree + 1:
            print("控制点数量不足")
            return {}
            
        # 创建均匀节点向量
        knots_u = self._create_uniform_knot_vector(len(control_points), u_degree)
        knots_v = self._create_uniform_knot_vector(len(control_points[0]), v_degree)
        
        # 添加权重
        control_points_with_weights = []
        for u_points in control_points:
            u_points_with_weights = []
            for point in u_points:
                # 添加权重1.0
                if len(point) == 3:
                    u_points_with_weights.append(point + [1.0])
                else:
                    u_points_with_weights.append(point)
            control_points_with_weights.append(u_points_with_weights)
                
        # 创建IGA模型
        iga_data = {
            "id": 0,  # 将在返回后设置
            "type": "iga",
            "degree_u": u_degree,
            "degree_v": v_degree,
            "knots_u": knots_u,
            "knots_v": knots_v,
            "control_points": control_points_with_weights
        }
        
        return iga_data
    
    def _create_uniform_knot_vector(self, n_control_points: int, degree: int) -> List[float]:
        """
        创建均匀节点向量
        
        Args:
            n_control_points: 控制点数量
            degree: 次数
            
        Returns:
            List[float]: 节点向量
        """
        # 创建均匀节点向量
        knots = []
        
        # 添加开始处的重复节点
        for i in range(degree + 1):
            knots.append(0.0)
        
        # 添加中间节点
        for i in range(1, n_control_points - degree):
            knots.append(float(i) / float(n_control_points - degree))
        
        # 添加结束处的重复节点
        for i in range(degree + 1):
            knots.append(1.0)
            
        return knots
    
    def _create_simplified_iga_data(self, shape_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        从形状信息创建简化的IGA数据
        
        Args:
            shape_info: 形状信息
            
        Returns:
            Dict: IGA模型数据
        """
        shape_type = shape_info["type"]
        params = shape_info.get("params", {})
        
        if shape_type == "box":
            # 创建盒子
            width = params.get("width", 1.0)
            length = params.get("length", 1.0)
            height = params.get("height", 1.0)
            center = params.get("center", [0.0, 0.0, 0.0])
            
            # 计算角点
            x_min = center[0] - width / 2
            x_max = center[0] + width / 2
            y_min = center[1] - length / 2
            y_max = center[1] + length / 2
            z_min = center[2] - height / 2
            z_max = center[2] + height / 2
            
            # 创建控制点网格
            control_points = [
                [
                    [x_min, y_min, z_min, 1.0],
                    [x_min, y_max, z_min, 1.0],
                ],
                [
                    [x_max, y_min, z_min, 1.0],
                    [x_max, y_max, z_min, 1.0],
                ],
            ]
            
            # 创建简化的IGA数据
            iga_data = {
                "id": shape_info["id"],
                "type": "iga",
                "degree_u": 1,
                "degree_v": 1,
                "knots_u": [0.0, 0.0, 1.0, 1.0],
                "knots_v": [0.0, 0.0, 1.0, 1.0],
                "control_points": control_points
            }
            
            return iga_data
            
        elif shape_type == "cylinder":
            # 创建圆柱体
            radius = params.get("radius", 1.0)
            height = params.get("height", 1.0)
            center = params.get("center", [0.0, 0.0, 0.0])
            
            # 计算控制点
            control_points = []
            u_count = 4
            v_count = 3
            
            for u in range(u_count):
                u_points = []
                angle = 2 * 3.14159 * u / (u_count - 1)
                
                for v in range(v_count):
                    z = center[2] - height / 2 + height * v / (v_count - 1)
                    x = center[0] + radius * np.cos(angle)
                    y = center[1] + radius * np.sin(angle)
                    
                    u_points.append([x, y, z, 1.0])
                
                control_points.append(u_points)
            
            # 创建简化的IGA数据
            iga_data = {
                "id": shape_info["id"],
                "type": "iga",
                "degree_u": 2,
                "degree_v": 2,
                "knots_u": [0.0, 0.0, 0.0, 1.0, 1.0, 1.0],
                "knots_v": [0.0, 0.0, 0.0, 1.0, 1.0, 1.0],
                "control_points": control_points
            }
            
            return iga_data
            
        else:
            # 创建默认的NURBS面片
            return {
                "id": shape_info["id"],
                "type": "iga",
                "degree_u": 2,
                "degree_v": 2,
                "knots_u": [0.0, 0.0, 0.0, 1.0, 1.0, 1.0],
                "knots_v": [0.0, 0.0, 0.0, 1.0, 1.0, 1.0],
                "control_points": [
                    [
                        [0.0, 0.0, 0.0, 1.0],
                        [0.0, 1.0, 0.0, 1.0],
                        [0.0, 2.0, 0.0, 1.0]
                    ],
                    [
                        [1.0, 0.0, 0.0, 1.0],
                        [1.0, 1.0, 1.0, 1.0],
                        [1.0, 2.0, 0.0, 1.0]
                    ],
                    [
                        [2.0, 0.0, 0.0, 1.0],
                        [2.0, 1.0, 0.0, 1.0],
                        [2.0, 2.0, 0.0, 1.0]
                    ]
                ]
            }
