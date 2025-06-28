"""
Three.js渲染器的Python包装器，用于在核心技术栈中集成Three.js可视化功能
"""

import os
import json
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Optional, Union, Tuple

class ThreeRenderer:
    """
    Three.js渲染器的Python包装器，用于在核心技术栈中集成Three.js可视化功能
    """
    
    def __init__(self, output_dir: str = "data/visualization"):
        """
        初始化Three.js渲染器包装器
        
        参数:
            output_dir: 输出目录
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.scene_data = {
            "metadata": {
                "version": 4.5,
                "type": "Object",
                "generator": "DeepExcavation ThreeRenderer"
            },
            "geometries": [],
            "materials": [],
            "object": {
                "uuid": "scene",
                "type": "Scene",
                "children": []
            }
        }
        self.material_cache = {}
        self.geometry_cache = {}
        self.next_id = 0
    
    def _generate_uuid(self) -> str:
        """
        生成唯一ID
        
        返回:
            str: 唯一ID
        """
        uuid = f"obj_{self.next_id}"
        self.next_id += 1
        return uuid
    
    def create_material(self, 
                       name: str, 
                       color: int = 0xcccccc, 
                       transparent: bool = False, 
                       opacity: float = 1.0,
                       wireframe: bool = False) -> str:
        """
        创建材质
        
        参数:
            name: 材质名称
            color: 材质颜色
            transparent: 是否透明
            opacity: 不透明度
            wireframe: 是否显示线框
            
        返回:
            str: 材质ID
        """
        # 检查缓存
        cache_key = f"{name}_{color}_{transparent}_{opacity}_{wireframe}"
        if cache_key in self.material_cache:
            return self.material_cache[cache_key]
        
        # 创建材质
        uuid = self._generate_uuid()
        material = {
            "uuid": uuid,
            "type": "MeshPhongMaterial",
            "name": name,
            "color": color,
            "emissive": 0,
            "specular": 0x111111,
            "shininess": 30,
            "transparent": transparent,
            "opacity": opacity,
            "wireframe": wireframe,
            "side": 2  # DoubleSide
        }
        
        self.scene_data["materials"].append(material)
        self.material_cache[cache_key] = uuid
        
        return uuid
    
    def create_box_geometry(self, 
                           width: float, 
                           height: float, 
                           depth: float) -> str:
        """
        创建立方体几何体
        
        参数:
            width: 宽度
            height: 高度
            depth: 深度
            
        返回:
            str: 几何体ID
        """
        # 检查缓存
        cache_key = f"box_{width}_{height}_{depth}"
        if cache_key in self.geometry_cache:
            return self.geometry_cache[cache_key]
        
        # 创建几何体
        uuid = self._generate_uuid()
        geometry = {
            "uuid": uuid,
            "type": "BoxGeometry",
            "width": width,
            "height": height,
            "depth": depth
        }
        
        self.scene_data["geometries"].append(geometry)
        self.geometry_cache[cache_key] = uuid
        
        return uuid
    
    def create_cylinder_geometry(self, 
                                radius_top: float, 
                                radius_bottom: float, 
                                height: float, 
                                radial_segments: int = 32) -> str:
        """
        创建圆柱体几何体
        
        参数:
            radius_top: 顶部半径
            radius_bottom: 底部半径
            height: 高度
            radial_segments: 径向分段
            
        返回:
            str: 几何体ID
        """
        # 检查缓存
        cache_key = f"cylinder_{radius_top}_{radius_bottom}_{height}_{radial_segments}"
        if cache_key in self.geometry_cache:
            return self.geometry_cache[cache_key]
        
        # 创建几何体
        uuid = self._generate_uuid()
        geometry = {
            "uuid": uuid,
            "type": "CylinderGeometry",
            "radiusTop": radius_top,
            "radiusBottom": radius_bottom,
            "height": height,
            "radialSegments": radial_segments
        }
        
        self.scene_data["geometries"].append(geometry)
        self.geometry_cache[cache_key] = uuid
        
        return uuid
    
    def create_plane_geometry(self, 
                             width: float, 
                             height: float) -> str:
        """
        创建平面几何体
        
        参数:
            width: 宽度
            height: 高度
            
        返回:
            str: 几何体ID
        """
        # 检查缓存
        cache_key = f"plane_{width}_{height}"
        if cache_key in self.geometry_cache:
            return self.geometry_cache[cache_key]
        
        # 创建几何体
        uuid = self._generate_uuid()
        geometry = {
            "uuid": uuid,
            "type": "PlaneGeometry",
            "width": width,
            "height": height
        }
        
        self.scene_data["geometries"].append(geometry)
        self.geometry_cache[cache_key] = uuid
        
        return uuid
    
    def create_mesh(self, 
                   geometry_id: str, 
                   material_id: str, 
                   name: str,
                   position: Tuple[float, float, float] = (0, 0, 0),
                   rotation: Tuple[float, float, float] = (0, 0, 0),
                   scale: Tuple[float, float, float] = (1, 1, 1)) -> str:
        """
        创建网格对象
        
        参数:
            geometry_id: 几何体ID
            material_id: 材质ID
            name: 名称
            position: 位置
            rotation: 旋转
            scale: 缩放
            
        返回:
            str: 网格对象ID
        """
        uuid = self._generate_uuid()
        mesh = {
            "uuid": uuid,
            "type": "Mesh",
            "name": name,
            "geometry": geometry_id,
            "material": material_id,
            "position": list(position),
            "rotation": list(rotation),
            "scale": list(scale),
            "visible": True,
            "castShadow": True,
            "receiveShadow": True
        }
        
        self.scene_data["object"]["children"].append(mesh)
        
        return uuid
    
    def create_soil_layer(self, 
                         depth: float, 
                         thickness: float, 
                         width: float = 1000, 
                         length: float = 1000, 
                         color: int = 0xd9c8b4, 
                         name: str = "Soil Layer") -> str:
        """
        创建土层
        
        参数:
            depth: 深度
            thickness: 厚度
            width: 宽度
            length: 长度
            color: 颜色
            name: 名称
            
        返回:
            str: 土层对象ID
        """
        # 创建几何体和材质
        geometry_id = self.create_box_geometry(width, thickness, length)
        material_id = self.create_material(name, color, True, 0.8)
        
        # 创建网格
        position = (0, -depth - thickness/2, 0)
        return self.create_mesh(geometry_id, material_id, name, position)
    
    def create_excavation_pit(self, 
                             width: float, 
                             depth: float, 
                             length: float, 
                             top_y: float = 0) -> str:
        """
        创建基坑
        
        参数:
            width: 宽度
            depth: 深度
            length: 长度
            top_y: 顶部Y坐标
            
        返回:
            str: 基坑对象ID
        """
        # 创建几何体和材质
        geometry_id = self.create_box_geometry(width, depth, length)
        material_id = self.create_material("Excavation Pit", 0xf8f8f8, True, 0.3)
        
        # 创建网格
        position = (0, top_y - depth/2, 0)
        return self.create_mesh(geometry_id, material_id, "Excavation Pit", position)
    
    def create_retaining_pile(self, 
                             x: float, 
                             z: float, 
                             height: float = 250, 
                             radius: float = 5, 
                             top_y: float = 0) -> str:
        """
        创建围护桩
        
        参数:
            x: X坐标
            z: Z坐标
            height: 高度
            radius: 半径
            top_y: 顶部Y坐标
            
        返回:
            str: 围护桩对象ID
        """
        # 创建几何体和材质
        geometry_id = self.create_cylinder_geometry(radius, radius, height)
        material_id = self.create_material("Retaining Pile", 0x777777)
        
        # 创建网格
        position = (x, top_y - height/2, z)
        return self.create_mesh(geometry_id, material_id, "Retaining Pile", position)
    
    def create_strut(self, 
                    start: Tuple[float, float, float], 
                    end: Tuple[float, float, float], 
                    radius: float = 3) -> str:
        """
        创建支撑
        
        参数:
            start: 起点
            end: 终点
            radius: 半径
            
        返回:
            str: 支撑对象ID
        """
        # 计算支撑长度和位置
        dx = end[0] - start[0]
        dy = end[1] - start[1]
        dz = end[2] - start[2]
        length = np.sqrt(dx**2 + dy**2 + dz**2)
        
        # 创建几何体和材质
        geometry_id = self.create_cylinder_geometry(radius, radius, length)
        material_id = self.create_material("Strut", 0x555555)
        
        # 计算中点位置
        position = ((start[0] + end[0])/2, (start[1] + end[1])/2, (start[2] + end[2])/2)
        
        # 计算旋转角度
        # 这是一个简化的方法，实际中可能需要更复杂的计算
        rotation_x = np.arctan2(dz, dy)
        rotation_y = 0
        rotation_z = np.arctan2(dx, np.sqrt(dy**2 + dz**2))
        
        # 创建网格
        return self.create_mesh(geometry_id, material_id, "Strut", position, (rotation_x, rotation_y, rotation_z))
    
    def create_water_level(self, 
                          depth: float, 
                          width: float = 1000, 
                          length: float = 1000) -> str:
        """
        创建水位面
        
        参数:
            depth: 深度
            width: 宽度
            length: 长度
            
        返回:
            str: 水位面对象ID
        """
        # 创建几何体和材质
        geometry_id = self.create_plane_geometry(width, length)
        material_id = self.create_material("Water Level", 0x0088ff, True, 0.5)
        
        # 创建网格
        position = (0, -depth, 0)
        rotation = (-np.pi/2, 0, 0)  # 平面默认是竖直的，需要旋转为水平
        return self.create_mesh(geometry_id, material_id, "Water Level", position, rotation)
    
    def add_light(self, 
                 light_type: str = "DirectionalLight", 
                 color: int = 0xffffff, 
                 intensity: float = 1.0,
                 position: Tuple[float, float, float] = (100, 100, 100)) -> str:
        """
        添加光源
        
        参数:
            light_type: 光源类型
            color: 颜色
            intensity: 强度
            position: 位置
            
        返回:
            str: 光源对象ID
        """
        uuid = self._generate_uuid()
        light = {
            "uuid": uuid,
            "type": light_type,
            "name": light_type,
            "color": color,
            "intensity": intensity,
            "position": list(position),
            "castShadow": True
        }
        
        if light_type == "DirectionalLight":
            light["shadow"] = {
                "mapSize": [2048, 2048],
                "camera": {
                    "left": -500,
                    "right": 500,
                    "top": 500,
                    "bottom": -500,
                    "near": 0.5,
                    "far": 1000
                }
            }
        
        self.scene_data["object"]["children"].append(light)
        
        return uuid
    
    def create_excavation_model(self, 
                               excavation_width: float = 300, 
                               excavation_length: float = 300, 
                               excavation_depth: float = 150,
                               soil_layers: List[Dict[str, Any]] = None,
                               water_level: Optional[float] = None) -> None:
        """
        创建完整的基坑模型
        
        参数:
            excavation_width: 基坑宽度
            excavation_length: 基坑长度
            excavation_depth: 基坑深度
            soil_layers: 土层列表，每个土层包含depth, thickness, color, name
            water_level: 水位深度
        """
        # 默认土层
        if soil_layers is None:
            soil_layers = [
                {"depth": 0, "thickness": 50, "color": 0xd9c8b4, "name": "填土层"},
                {"depth": 50, "thickness": 50, "color": 0xc2a887, "name": "粉质粘土"},
                {"depth": 100, "thickness": 50, "color": 0xa88c6d, "name": "砂层"},
                {"depth": 150, "thickness": 50, "color": 0x8d7558, "name": "粘土"},
                {"depth": 200, "thickness": 50, "color": 0x6e5a42, "name": "基岩"}
            ]
        
        # 添加环境光
        self.add_light("AmbientLight", 0xffffff, 0.5, (0, 0, 0))
        
        # 添加平行光
        self.add_light("DirectionalLight", 0xffffff, 0.8, (100, 100, 100))
        
        # 添加土层
        for layer in soil_layers:
            self.create_soil_layer(
                depth=layer["depth"],
                thickness=layer["thickness"],
                width=1000,
                length=1000,
                color=layer["color"],
                name=layer["name"]
            )
        
        # 添加基坑
        self.create_excavation_pit(excavation_width, excavation_depth, excavation_length)
        
        # 添加围护桩
        pile_radius = 5
        pile_height = 250
        pile_count = 20
        
        for i in range(pile_count):
            angle = (i / pile_count) * np.pi * 2
            x = np.cos(angle) * (excavation_width / 2 + pile_radius)
            z = np.sin(angle) * (excavation_length / 2 + pile_radius)
            self.create_retaining_pile(x, z, pile_height, pile_radius)
        
        # 添加水平支撑
        strut_radius = 3
        for z in [-excavation_length/4, excavation_length/4]:
            start = (-excavation_width/2, -30, z)
            end = (excavation_width/2, -30, z)
            self.create_strut(start, end, strut_radius)
        
        for x in [-excavation_width/4, excavation_width/4]:
            start = (x, -30, -excavation_length/2)
            end = (x, -30, excavation_length/2)
            self.create_strut(start, end, strut_radius)
        
        # 添加水位面
        if water_level is not None:
            self.create_water_level(water_level)
    
    def export_scene(self, filename: str = "scene.json") -> str:
        """
        导出场景到JSON文件
        
        参数:
            filename: 文件名
            
        返回:
            str: 文件路径
        """
        output_path = self.output_dir / filename
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(self.scene_data, f, ensure_ascii=False, indent=2)
        
        return str(output_path)
    
    def clear_scene(self) -> None:
        """
        清空场景
        """
        self.scene_data["geometries"] = []
        self.scene_data["materials"] = []
        self.scene_data["object"]["children"] = []
        self.material_cache = {}
        self.geometry_cache = {}
        self.next_id = 0