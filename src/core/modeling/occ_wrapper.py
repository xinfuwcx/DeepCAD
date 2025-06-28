"""
@file occ_wrapper.py
@description OpenCascade geometry kernel wrapper for NURBS modeling and Three.js visualization
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

from typing import Dict, Any, List

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
    """OpenCascade to IGA converter for transforming NURBS geometry to IGA analysis model"""
    
    def __init__(self, occ_wrapper: OCCWrapper):
        """Initialize converter"""
        self.occ = occ_wrapper
    
    def convert_surface_to_iga(self, nurbs_id: int) -> Dict[str, Any]:
        """Convert NURBS surface to IGA analysis model"""
        if nurbs_id not in self.occ.shapes or self.occ.shapes[nurbs_id]["type"] != "nurbs_surface":
            raise ValueError("Invalid NURBS surface ID")
        
        shape_info = self.occ.shapes[nurbs_id]
        params = shape_info["params"]
        
        # Extract NURBS data
        control_points = params.get("control_points", [])
        u_degree = params.get("u_degree", 3)
        v_degree = params.get("v_degree", 3)
        
        # Create uniform knot vectors
        u_count = len(control_points)
        v_count = len(control_points[0]) if u_count > 0 else 0
        
        knots_u = self._create_uniform_knot_vector(u_count, u_degree)
        knots_v = self._create_uniform_knot_vector(v_count, v_degree)
        
        # Flatten control points and add weights
        control_points_with_weights = []
        for u_row in control_points:
            for point in u_row:
                control_points_with_weights.append([*point, 1.0])  # Add weight 1.0
        
        return {
            "degree_u": u_degree,
            "degree_v": v_degree,
            "knots_u": knots_u,
            "knots_v": knots_v,
            "control_points": control_points_with_weights
        }
    
    def export_iga_input_file(self, nurbs_id: int, file_path: str) -> bool:
        """Export IGA analysis input file"""
        try:
            iga_data = self.convert_surface_to_iga(nurbs_id)
            
            # Export to text file
            with open(file_path, 'w') as f:
                f.write("# IGA Input File\n")
                f.write("# Generated by OCC-IGA Converter\n\n")
                
                f.write(f"NURBS_DEGREE_U {iga_data['degree_u']}\n")
                f.write(f"NURBS_DEGREE_V {iga_data['degree_v']}\n\n")
                
                f.write(f"KNOTS_U {len(iga_data['knots_u'])}\n")
                f.write(" ".join(map(str, iga_data['knots_u'])) + "\n\n")
                
                f.write(f"KNOTS_V {len(iga_data['knots_v'])}\n")
                f.write(" ".join(map(str, iga_data['knots_v'])) + "\n\n")
                
                f.write(f"CONTROL_POINTS {len(iga_data['control_points'])}\n")
                for cp in iga_data['control_points']:
                    x, y, z, w = cp
                    f.write(f"{x} {y} {z} {w}\n")
            
            return True
        except Exception as e:
            print(f"Error exporting IGA input file: {e}")
            return False
    
    def create_nurbs_patch(self, control_points: List[List[List[float]]], 
                          u_degree: int = 3, v_degree: int = 3) -> Dict[str, Any]:
        """Create a NURBS patch for IGA"""
        # Create uniform knot vectors
        u_count = len(control_points)
        v_count = len(control_points[0]) if u_count > 0 else 0
        
        knots_u = self._create_uniform_knot_vector(u_count, u_degree)
        knots_v = self._create_uniform_knot_vector(v_count, v_degree)
        
        return {
            "degree_u": u_degree,
            "degree_v": v_degree,
            "knots_u": knots_u,
            "knots_v": knots_v,
            "control_points": control_points
        }
    
    def _create_uniform_knot_vector(self, n_control_points: int, degree: int) -> List[float]:
        """Create a uniform knot vector"""
        n_knots = n_control_points + degree + 1
        knots = []
        
        # Start with repeated knots
        for i in range(degree + 1):
            knots.append(0.0)
        
        # Middle knots
        n_middle = n_knots - 2 * (degree + 1)
        if n_middle > 0:
            step = 1.0 / (n_middle + 1)
            for i in range(1, n_middle + 1):
                knots.append(i * step)
        
        # End with repeated knots
        for i in range(degree + 1):
            knots.append(1.0)
        
        return knots
