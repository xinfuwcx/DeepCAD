"""
MSH几何生成器 - example1项目专用
生成土体、基坑、隧道的二次四面体网格
"""
import os
import gmsh
import numpy as np
from typing import Dict, List, Tuple

class MSHGeometryGenerator:
    """MSH文件生成器，用于example1桌面界面"""
    
    def __init__(self, output_dir: str = "H:/DeepCAD/data"):
        """
        初始化MSH生成器
        
        Args:
            output_dir: MSH文件输出目录
        """
        self.output_dir = output_dir
        self.ensure_output_dir()
        
    def ensure_output_dir(self):
        """确保输出目录存在"""
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
    
    def generate_soil_domain(self) -> str:
        """
        生成土体域MSH文件 (100×100×50m, 7层)
        使用二次四面体网格
        
        Returns:
            生成的MSH文件路径
        """
        print("正在生成土体域网格...")
        
        # 初始化GMSH
        gmsh.initialize()
        gmsh.clear()
        gmsh.model.add("soil_domain")
        
        # 设置网格参数
        gmsh.option.setNumber("Mesh.ElementOrder", 2)  # 二次精度
        gmsh.option.setNumber("Mesh.HighOrderOptimize", 1)
        gmsh.option.setNumber("Mesh.CharacteristicLengthMin", 3.0)
        gmsh.option.setNumber("Mesh.CharacteristicLengthMax", 8.0)
        
        # 土体几何参数
        width, length, height = 100.0, 100.0, 50.0
        layer_height = height / 7  # 每层高度 ≈ 7.14m
        
        # 创建底面点
        x_coords = [-50, 50, 50, -50]
        y_coords = [-50, -50, 50, 50]
        
        # 存储所有层的体积ID
        layer_volumes = []
        
        for layer in range(7):
            z_bottom = layer * layer_height
            z_top = (layer + 1) * layer_height
            
            # 创建底面点
            bottom_points = []
            for i in range(4):
                point_id = gmsh.model.geo.addPoint(x_coords[i], y_coords[i], z_bottom)
                bottom_points.append(point_id)
            
            # 创建顶面点
            top_points = []
            for i in range(4):
                point_id = gmsh.model.geo.addPoint(x_coords[i], y_coords[i], z_top)
                top_points.append(point_id)
            
            # 创建底面线
            bottom_lines = []
            for i in range(4):
                line_id = gmsh.model.geo.addLine(bottom_points[i], bottom_points[(i+1)%4])
                bottom_lines.append(line_id)
            
            # 创建顶面线
            top_lines = []
            for i in range(4):
                line_id = gmsh.model.geo.addLine(top_points[i], top_points[(i+1)%4])
                top_lines.append(line_id)
            
            # 创建竖直线
            vertical_lines = []
            for i in range(4):
                line_id = gmsh.model.geo.addLine(bottom_points[i], top_points[i])
                vertical_lines.append(line_id)
            
            # 创建底面和顶面
            bottom_curve_loop = gmsh.model.geo.addCurveLoop(bottom_lines)
            top_curve_loop = gmsh.model.geo.addCurveLoop(top_lines)
            bottom_surface = gmsh.model.geo.addPlaneSurface([bottom_curve_loop])
            top_surface = gmsh.model.geo.addPlaneSurface([top_curve_loop])
            
            # 创建侧面
            side_surfaces = []
            for i in range(4):
                curve_loop = gmsh.model.geo.addCurveLoop([
                    bottom_lines[i], vertical_lines[(i+1)%4], 
                    -top_lines[i], -vertical_lines[i]
                ])
                surface = gmsh.model.geo.addPlaneSurface([curve_loop])
                side_surfaces.append(surface)
            
            # 创建体积
            all_surfaces = [bottom_surface, top_surface] + side_surfaces
            surface_loop = gmsh.model.geo.addSurfaceLoop(all_surfaces)
            volume = gmsh.model.geo.addVolume([surface_loop])
            layer_volumes.append(volume)
            
            # 添加物理组
            gmsh.model.addPhysicalGroup(3, [volume], layer + 1)
            gmsh.model.setPhysicalName(3, layer + 1, f"Layer_{layer + 1}")
        
        # 添加边界物理组
        # 底面
        gmsh.model.addPhysicalGroup(2, [1], 101)  # 第一层的底面
        gmsh.model.setPhysicalName(2, 101, "BottomBoundary")
        
        # 顶面
        top_surface_id = 7 * 6 + 2  # 最后一层的顶面
        gmsh.model.addPhysicalGroup(2, [top_surface_id], 102)
        gmsh.model.setPhysicalName(2, 102, "TopBoundary")
        
        # 侧面（收集所有层的侧面）
        all_side_surfaces = []
        for layer in range(7):
            base_id = layer * 6 + 3  # 每层6个面，侧面从第3个开始
            all_side_surfaces.extend([base_id, base_id+1, base_id+2, base_id+3])
        
        gmsh.model.addPhysicalGroup(2, all_side_surfaces, 103)
        gmsh.model.setPhysicalName(2, 103, "SideBoundary")
        
        # 同步并生成网格
        gmsh.model.geo.synchronize()
        gmsh.model.mesh.generate(3)
        
        # 保存文件
        output_path = os.path.join(self.output_dir, "soil_domain.msh")
        gmsh.write(output_path)
        gmsh.finalize()
        
        print(f"土体域网格已生成: {output_path}")
        return output_path
    
    def generate_excavation_pit(self) -> str:
        """
        生成基坑MSH文件 (25×25×12m)
        垂直开挖，二次四面体网格
        
        Returns:
            生成的MSH文件路径
        """
        print("正在生成基坑网格...")
        
        gmsh.initialize()
        gmsh.clear()
        gmsh.model.add("excavation_pit")
        
        # 设置网格参数（基坑需要更细的网格）
        gmsh.option.setNumber("Mesh.ElementOrder", 2)
        gmsh.option.setNumber("Mesh.HighOrderOptimize", 1)
        gmsh.option.setNumber("Mesh.CharacteristicLengthMin", 1.5)
        gmsh.option.setNumber("Mesh.CharacteristicLengthMax", 3.0)
        
        # 基坑几何参数
        width, length, depth = 25.0, 25.0, 12.0
        
        # 基坑顶面在z=50（土体顶面），底面在z=38
        z_top = 50.0
        z_bottom = z_top - depth
        
        # 创建基坑角点坐标
        x_coords = [-12.5, 12.5, 12.5, -12.5]
        y_coords = [-12.5, -12.5, 12.5, 12.5]
        
        # 创建顶面点
        top_points = []
        for i in range(4):
            point_id = gmsh.model.geo.addPoint(x_coords[i], y_coords[i], z_top)
            top_points.append(point_id)
        
        # 创建底面点
        bottom_points = []
        for i in range(4):
            point_id = gmsh.model.geo.addPoint(x_coords[i], y_coords[i], z_bottom)
            bottom_points.append(point_id)
        
        # 创建顶面线
        top_lines = []
        for i in range(4):
            line_id = gmsh.model.geo.addLine(top_points[i], top_points[(i+1)%4])
            top_lines.append(line_id)
        
        # 创建底面线
        bottom_lines = []
        for i in range(4):
            line_id = gmsh.model.geo.addLine(bottom_points[i], bottom_points[(i+1)%4])
            bottom_lines.append(line_id)
        
        # 创建竖直线
        vertical_lines = []
        for i in range(4):
            line_id = gmsh.model.geo.addLine(top_points[i], bottom_points[i])
            vertical_lines.append(line_id)
        
        # 创建面
        top_curve_loop = gmsh.model.geo.addCurveLoop(top_lines)
        bottom_curve_loop = gmsh.model.geo.addCurveLoop(bottom_lines)
        top_surface = gmsh.model.geo.addPlaneSurface([top_curve_loop])
        bottom_surface = gmsh.model.geo.addPlaneSurface([bottom_curve_loop])
        
        # 创建侧面
        side_surfaces = []
        for i in range(4):
            curve_loop = gmsh.model.geo.addCurveLoop([
                top_lines[i], vertical_lines[(i+1)%4], 
                -bottom_lines[i], -vertical_lines[i]
            ])
            surface = gmsh.model.geo.addPlaneSurface([curve_loop])
            side_surfaces.append(surface)
        
        # 创建体积
        all_surfaces = [top_surface, bottom_surface] + side_surfaces
        surface_loop = gmsh.model.geo.addSurfaceLoop(all_surfaces)
        volume = gmsh.model.geo.addVolume([surface_loop])
        
        # 添加物理组
        gmsh.model.addPhysicalGroup(3, [volume], 1)
        gmsh.model.setPhysicalName(3, 1, "ExcavationZone")
        
        gmsh.model.addPhysicalGroup(2, [top_surface], 101)
        gmsh.model.setPhysicalName(2, 101, "ExcavationTop")
        
        gmsh.model.addPhysicalGroup(2, [bottom_surface], 102)
        gmsh.model.setPhysicalName(2, 102, "ExcavationBottom")
        
        gmsh.model.addPhysicalGroup(2, side_surfaces, 103)
        gmsh.model.setPhysicalName(2, 103, "ExcavationWalls")
        
        # 同步并生成网格
        gmsh.model.geo.synchronize()
        gmsh.model.mesh.generate(3)
        
        # 保存文件
        output_path = os.path.join(self.output_dir, "excavation_pit.msh")
        gmsh.write(output_path)
        gmsh.finalize()
        
        print(f"基坑网格已生成: {output_path}")
        return output_path
    
    def generate_tunnel(self) -> str:
        """
        生成隧道MSH文件 (50×5×3.5m)
        位于z=30m高度，二次四面体网格
        
        Returns:
            生成的MSH文件路径
        """
        print("正在生成隧道网格...")
        
        gmsh.initialize()
        gmsh.clear()
        gmsh.model.add("tunnel")
        
        # 设置网格参数
        gmsh.option.setNumber("Mesh.ElementOrder", 2)
        gmsh.option.setNumber("Mesh.HighOrderOptimize", 1)
        gmsh.option.setNumber("Mesh.CharacteristicLengthMin", 1.0)
        gmsh.option.setNumber("Mesh.CharacteristicLengthMax", 2.5)
        
        # 隧道几何参数
        length, width, height = 50.0, 5.0, 3.5
        z_center = 30.0  # 隧道中心高度
        z_bottom = z_center - height/2
        z_top = z_center + height/2
        
        # 隧道沿X方向延伸，Y方向居中
        x_coords = [-25.0, 25.0, 25.0, -25.0]
        y_coords = [-2.5, -2.5, 2.5, 2.5]
        
        # 创建底面点
        bottom_points = []
        for i in range(4):
            point_id = gmsh.model.geo.addPoint(x_coords[i], y_coords[i], z_bottom)
            bottom_points.append(point_id)
        
        # 创建顶面点
        top_points = []
        for i in range(4):
            point_id = gmsh.model.geo.addPoint(x_coords[i], y_coords[i], z_top)
            top_points.append(point_id)
        
        # 创建底面线
        bottom_lines = []
        for i in range(4):
            line_id = gmsh.model.geo.addLine(bottom_points[i], bottom_points[(i+1)%4])
            bottom_lines.append(line_id)
        
        # 创建顶面线
        top_lines = []
        for i in range(4):
            line_id = gmsh.model.geo.addLine(top_points[i], top_points[(i+1)%4])
            top_lines.append(line_id)
        
        # 创建竖直线
        vertical_lines = []
        for i in range(4):
            line_id = gmsh.model.geo.addLine(bottom_points[i], top_points[i])
            vertical_lines.append(line_id)
        
        # 创建面
        bottom_curve_loop = gmsh.model.geo.addCurveLoop(bottom_lines)
        top_curve_loop = gmsh.model.geo.addCurveLoop(top_lines)
        bottom_surface = gmsh.model.geo.addPlaneSurface([bottom_curve_loop])
        top_surface = gmsh.model.geo.addPlaneSurface([top_curve_loop])
        
        # 创建侧面
        side_surfaces = []
        for i in range(4):
            curve_loop = gmsh.model.geo.addCurveLoop([
                bottom_lines[i], vertical_lines[(i+1)%4], 
                -top_lines[i], -vertical_lines[i]
            ])
            surface = gmsh.model.geo.addPlaneSurface([curve_loop])
            side_surfaces.append(surface)
        
        # 创建体积
        all_surfaces = [bottom_surface, top_surface] + side_surfaces
        surface_loop = gmsh.model.geo.addSurfaceLoop(all_surfaces)
        volume = gmsh.model.geo.addVolume([surface_loop])
        
        # 添加物理组
        gmsh.model.addPhysicalGroup(3, [volume], 1)
        gmsh.model.setPhysicalName(3, 1, "TunnelZone")
        
        gmsh.model.addPhysicalGroup(2, [bottom_surface], 101)
        gmsh.model.setPhysicalName(2, 101, "TunnelBottom")
        
        gmsh.model.addPhysicalGroup(2, [top_surface], 102)
        gmsh.model.setPhysicalName(2, 102, "TunnelTop")
        
        # 隧道端面
        gmsh.model.addPhysicalGroup(2, [side_surfaces[0]], 103)
        gmsh.model.setPhysicalName(2, 103, "TunnelPortal1")
        
        gmsh.model.addPhysicalGroup(2, [side_surfaces[2]], 104)
        gmsh.model.setPhysicalName(2, 104, "TunnelPortal2")
        
        # 隧道侧壁
        gmsh.model.addPhysicalGroup(2, [side_surfaces[1], side_surfaces[3]], 105)
        gmsh.model.setPhysicalName(2, 105, "TunnelWalls")
        
        # 同步并生成网格
        gmsh.model.geo.synchronize()
        gmsh.model.mesh.generate(3)
        
        # 保存文件
        output_path = os.path.join(self.output_dir, "tunnel.msh")
        gmsh.write(output_path)
        gmsh.finalize()
        
        print(f"隧道网格已生成: {output_path}")
        return output_path
    
    def generate_all_meshes(self) -> Dict[str, str]:
        """
        生成所有3个MSH文件
        
        Returns:
            包含所有MSH文件路径的字典
        """
        print("开始生成example1所需的所有MSH文件...")
        
        mesh_files = {}
        
        try:
            mesh_files['soil_domain'] = self.generate_soil_domain()
            mesh_files['excavation_pit'] = self.generate_excavation_pit()
            mesh_files['tunnel'] = self.generate_tunnel()
            
            print("\n=== MSH文件生成完成 ===")
            for name, path in mesh_files.items():
                print(f"{name}: {path}")
            
            return mesh_files
            
        except Exception as e:
            print(f"MSH文件生成过程中出现错误: {e}")
            raise

def main():
    """测试MSH生成器"""
    generator = MSHGeometryGenerator()
    mesh_files = generator.generate_all_meshes()
    
    print("\nMSH文件生成测试完成!")

if __name__ == "__main__":
    main()