#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@file gmsh_wrapper.py
@description Gmsh网格生成工具包装器
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import numpy as np
import logging
import json
import tempfile
from pathlib import Path
import subprocess

# 尝试导入Gmsh
try:
    import gmsh
    GMSH_AVAILABLE = True
except ImportError:
    GMSH_AVAILABLE = False
    logging.warning("Gmsh导入失败，将使用命令行模式")

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("GmshWrapper")

class GmshWrapper:
    """Gmsh网格生成工具包装器类"""
    
    def __init__(self, gmsh_path=None):
        """初始化Gmsh包装器
        
        Args:
            gmsh_path (str, optional): Gmsh执行文件路径，None则自动查找
        """
        self.gmsh_path = gmsh_path or self._find_gmsh_path()
        self.use_api = GMSH_AVAILABLE
        
        if self.use_api:
            # 初始化Gmsh API
            gmsh.initialize()
            logger.info("Gmsh API初始化成功")
        else:
            # 检查Gmsh是否可用
            if not self._check_gmsh_available():
                logger.error("Gmsh不可用，请检查安装")
                raise RuntimeError("Gmsh不可用")
            
            logger.info("将使用Gmsh命令行模式")
        
        logger.info(f"Gmsh包装器初始化成功，路径: {self.gmsh_path}")
    
    def __del__(self):
        """析构函数，清理资源"""
        if self.use_api and 'gmsh' in sys.modules:
            try:
                gmsh.finalize()
                logger.info("Gmsh API已终止")
            except:
                pass
    
    def _find_gmsh_path(self):
        """查找Gmsh执行文件路径
        
        Returns:
            str: Gmsh执行文件路径
        """
        # 尝试从环境变量获取
        if 'GMSH_PATH' in os.environ:
            return os.environ['GMSH_PATH']
        
        # 尝试从常见位置查找
        common_paths = [
            "./bin/gmsh",
            "./gmsh",
            "C:/Program Files/Gmsh/gmsh.exe",
            "/usr/local/bin/gmsh",
            "/opt/gmsh/bin/gmsh"
        ]
        
        for path in common_paths:
            if os.path.exists(path) and os.access(path, os.X_OK):
                return path
        
        # 如果找不到，使用默认名称，依赖PATH环境变量
        return "gmsh"
    
    def _check_gmsh_available(self):
        """检查Gmsh是否可用
        
        Returns:
            bool: Gmsh是否可用
        """
        try:
            # 尝试运行Gmsh版本命令
            result = subprocess.run([self.gmsh_path, "--version"], 
                                    capture_output=True, text=True, timeout=5)
            return result.returncode == 0
        except Exception as e:
            logger.warning(f"检查Gmsh可用性时出错: {str(e)}")
            return False
    
    def create_box_excavation(self, geo_file, width, length, depth, 
                            excavation_width, excavation_length, excavation_depth,
                            wall_thickness=1.0, wall_depth=None):
        """创建矩形基坑几何模型
        
        Args:
            geo_file (str): 几何文件路径
            width (float): 计算域宽度
            length (float): 计算域长度
            depth (float): 计算域深度
            excavation_width (float): 基坑宽度
            excavation_length (float): 基坑长度
            excavation_depth (float): 基坑深度
            wall_thickness (float, optional): 地下连续墙厚度
            wall_depth (float, optional): 地下连续墙深度，None则使用基坑深度的1.5倍
            
        Returns:
            str: 几何文件路径
        """
        # 确保目录存在
        os.makedirs(os.path.dirname(os.path.abspath(geo_file)), exist_ok=True)
        
        # 设置默认墙深
        if wall_depth is None:
            wall_depth = excavation_depth * 1.5
        
        # 使用脚本创建几何
        return self._create_box_excavation_script(geo_file, width, length, depth, 
                                                excavation_width, excavation_length, excavation_depth,
                                                wall_thickness, wall_depth)
    
    def _create_box_excavation_api(self, geo_file, width, length, depth, 
                                 excavation_width, excavation_length, excavation_depth,
                                 wall_thickness, wall_depth):
        """使用Gmsh API创建矩形基坑几何模型
        
        Args:
            geo_file (str): 几何文件路径
            width (float): 计算域宽度
            length (float): 计算域长度
            depth (float): 计算域深度
            excavation_width (float): 基坑宽度
            excavation_length (float): 基坑长度
            excavation_depth (float): 基坑深度
            wall_thickness (float): 地下连续墙厚度
            wall_depth (float): 地下连续墙深度
            
        Returns:
            str: 几何文件路径
        """
        # 重置Gmsh
        gmsh.clear()
        gmsh.model.add("excavation")
        
        # 创建土体域(长方体)
        soil_box = gmsh.model.occ.addBox(-width/2, -length/2, -depth, width, length, depth)
        
        # 创建基坑(长方体)
        exc_box = gmsh.model.occ.addBox(
            -excavation_width/2, -excavation_length/2, -excavation_depth,
            excavation_width, excavation_length, excavation_depth
        )
        
        # 创建地下连续墙(四个侧面)
        # 前墙
        front_wall = gmsh.model.occ.addBox(
            -excavation_width/2 - wall_thickness, -excavation_length/2 - wall_thickness, -wall_depth,
            excavation_width + 2*wall_thickness, wall_thickness, wall_depth
        )
        
        # 后墙
        back_wall = gmsh.model.occ.addBox(
            -excavation_width/2 - wall_thickness, excavation_length/2, -wall_depth,
            excavation_width + 2*wall_thickness, wall_thickness, wall_depth
        )
        
        # 左墙
        left_wall = gmsh.model.occ.addBox(
            -excavation_width/2 - wall_thickness, -excavation_length/2, -wall_depth,
            wall_thickness, excavation_length, wall_depth
        )
        
        # 右墙
        right_wall = gmsh.model.occ.addBox(
            excavation_width/2, -excavation_length/2, -wall_depth,
            wall_thickness, excavation_length, wall_depth
        )
        
        # 合并墙体
        wall_tags = [front_wall, back_wall, left_wall, right_wall]
        wall_dimtags = [(3, tag) for tag in wall_tags]
        
        # 布尔运算
        # 从土体中减去基坑
        soil_with_excavation = gmsh.model.occ.cut([(3, soil_box)], [(3, exc_box)])
        
        # 同步几何
        gmsh.model.occ.synchronize()
        
        # 添加物理组
        # 土体
        soil_volumes = [tag for dim, tag in soil_with_excavation[0] if dim == 3]
        gmsh.model.addPhysicalGroup(3, soil_volumes, tag=1, name="soil")
        
        # 墙体
        gmsh.model.addPhysicalGroup(3, wall_tags, tag=10, name="wall")
        
        # 边界面
        # 获取边界
        boundary = gmsh.model.getBoundary([(3, soil_volumes[0])], oriented=False)
        boundary_tags = [tag for dim, tag in boundary]
        
        # 获取边界面的中心点和法向量，用于识别不同边界
        bottom_faces = []
        left_faces = []
        right_faces = []
        front_faces = []
        back_faces = []
        top_faces = []
        
        for face_tag in boundary_tags:
            # 获取面的中心点
            com = gmsh.model.occ.getCenterOfMass(2, face_tag)
            x, y, z = com
            
            # 根据位置判断边界类型
            if abs(z + depth) < 1e-6:  # 底面
                bottom_faces.append(face_tag)
            elif abs(x + width/2) < 1e-6:  # 左面
                left_faces.append(face_tag)
            elif abs(x - width/2) < 1e-6:  # 右面
                right_faces.append(face_tag)
            elif abs(y + length/2) < 1e-6:  # 前面
                front_faces.append(face_tag)
            elif abs(y - length/2) < 1e-6:  # 后面
                back_faces.append(face_tag)
            elif abs(z) < 1e-6:  # 顶面
                top_faces.append(face_tag)
        
        # 添加物理组
        if bottom_faces:
            gmsh.model.addPhysicalGroup(2, bottom_faces, tag=20, name="bottom")
        if left_faces:
            gmsh.model.addPhysicalGroup(2, left_faces, tag=21, name="left")
        if right_faces:
            gmsh.model.addPhysicalGroup(2, right_faces, tag=22, name="right")
        if front_faces:
            gmsh.model.addPhysicalGroup(2, front_faces, tag=23, name="front")
        if back_faces:
            gmsh.model.addPhysicalGroup(2, back_faces, tag=24, name="back")
        if top_faces:
            gmsh.model.addPhysicalGroup(2, top_faces, tag=25, name="top")
        
        # 确保文件扩展名为.geo_unrolled或.geo
        if not (geo_file.lower().endswith('.geo_unrolled') or geo_file.lower().endswith('.geo')):
            geo_file = os.path.splitext(geo_file)[0] + '.geo'
        
        # 保存几何文件
        gmsh.write(geo_file)
        
        logger.info(f"使用Gmsh API创建几何模型: {geo_file}")
        return geo_file
    
    def _create_box_excavation_script(self, geo_file, width, length, depth, 
                                     excavation_width, excavation_length, excavation_depth,
                                     wall_thickness, wall_depth):
        """使用Gmsh脚本创建矩形基坑几何模型
        
        Args:
            geo_file (str): 几何文件路径
            width (float): 计算域宽度
            length (float): 计算域长度
            depth (float): 计算域深度
            excavation_width (float): 基坑宽度
            excavation_length (float): 基坑长度
            excavation_depth (float): 基坑深度
            wall_thickness (float): 地下连续墙厚度
            wall_depth (float): 地下连续墙深度
            
        Returns:
            str: 几何文件路径
        """
        # 创建Gmsh脚本
        script = f"""
// 深基坑几何模型
SetFactory("OpenCASCADE");

// 参数
width = {width};
length = {length};
depth = {depth};
excavation_width = {excavation_width};
excavation_length = {excavation_length};
excavation_depth = {excavation_depth};
wall_thickness = {wall_thickness};
wall_depth = {wall_depth};

// 创建土体域(长方体)
soil_box = newv;
Box(soil_box) = {{-width/2, -length/2, -depth, width, length, depth}};

// 创建基坑(长方体)
exc_box = newv;
Box(exc_box) = {{-excavation_width/2, -excavation_length/2, -excavation_depth, 
                excavation_width, excavation_length, excavation_depth}};

// 创建地下连续墙(四个侧面)
// 前墙
front_wall = newv;
Box(front_wall) = {{-excavation_width/2 - wall_thickness, -excavation_length/2 - wall_thickness, -wall_depth,
                   excavation_width + 2*wall_thickness, wall_thickness, wall_depth}};

// 后墙
back_wall = newv;
Box(back_wall) = {{-excavation_width/2 - wall_thickness, excavation_length/2, -wall_depth,
                  excavation_width + 2*wall_thickness, wall_thickness, wall_depth}};

// 左墙
left_wall = newv;
Box(left_wall) = {{-excavation_width/2 - wall_thickness, -excavation_length/2, -wall_depth,
                  wall_thickness, excavation_length, wall_depth}};

// 右墙
right_wall = newv;
Box(right_wall) = {{excavation_width/2, -excavation_length/2, -wall_depth,
                   wall_thickness, excavation_length, wall_depth}};

// 布尔运算
// 从土体中减去基坑
soil_with_excavation = BooleanDifference{{Volume{{soil_box}}; Delete;}}{{Volume{{exc_box}}; Delete;}};

// 添加物理组
// 土体
Physical Volume("soil", 1) = {{soil_with_excavation}};

// 墙体
Physical Volume("wall", 10) = {{front_wall, back_wall, left_wall, right_wall}};

// 边界面
bottom_faces = {{}};
left_faces = {{}};
right_faces = {{}};
front_faces = {{}};
back_faces = {{}};
top_faces = {{}};

// 获取边界面
boundary_faces = Boundary{{Volume{{soil_with_excavation}};}};

// 根据位置判断边界类型
For i In {{0:#boundary_faces[]}}
    face_tag = boundary_faces[i];
    center[] = CenterOfMass Surface{{face_tag}};
    x = center[0];
    y = center[1];
    z = center[2];
    
    If(Abs(z + depth) < 1e-6)
        bottom_faces[] += {{face_tag}}; // 底面
    EndIf
    If(Abs(x + width/2) < 1e-6)
        left_faces[] += {{face_tag}}; // 左面
    EndIf
    If(Abs(x - width/2) < 1e-6)
        right_faces[] += {{face_tag}}; // 右面
    EndIf
    If(Abs(y + length/2) < 1e-6)
        front_faces[] += {{face_tag}}; // 前面
    EndIf
    If(Abs(y - length/2) < 1e-6)
        back_faces[] += {{face_tag}}; // 后面
    EndIf
    If(Abs(z) < 1e-6)
        top_faces[] += {{face_tag}}; // 顶面
    EndIf
EndFor

// 添加物理组
If(#bottom_faces[])
    Physical Surface("bottom", 20) = {{bottom_faces[]}};
EndIf
If(#left_faces[])
    Physical Surface("left", 21) = {{left_faces[]}};
EndIf
If(#right_faces[])
    Physical Surface("right", 22) = {{right_faces[]}};
EndIf
If(#front_faces[])
    Physical Surface("front", 23) = {{front_faces[]}};
EndIf
If(#back_faces[])
    Physical Surface("back", 24) = {{back_faces[]}};
EndIf
If(#top_faces[])
    Physical Surface("top", 25) = {{top_faces[]}};
EndIf
"""
        
        # 写入脚本文件
        with open(geo_file, 'w') as f:
            f.write(script)
        
        logger.info(f"使用Gmsh脚本创建几何模型: {geo_file}")
        return geo_file
    
    def add_soil_layers(self, geo_file, soil_layers):
        """向几何模型添加土层分界面
        
        Args:
            geo_file (str): 几何文件路径
            soil_layers (list): 土层列表，每个元素为字典，包含depth和name
            
        Returns:
            str: 更新后的几何文件路径
        """
        if not os.path.exists(geo_file):
            raise FileNotFoundError(f"几何文件不存在: {geo_file}")
        
        # 读取原始几何文件
        with open(geo_file, 'r') as f:
            geo_content = f.read()
        
        # 添加土层分界面
        layer_script = "\n// 添加土层分界面\n"
        
        for i, layer in enumerate(soil_layers):
            depth = layer["depth"]
            name = layer.get("name", f"soil_layer_{i+1}")
            
            layer_script += f"""
// 土层 {name} (深度 {depth}m)
soil_layer_{i+1}_tag = {100+i+1};
Physical Volume("{name}", soil_layer_{i+1}_tag) = {{soil_with_excavation}};
"""
        
        # 更新几何文件
        with open(geo_file, 'w') as f:
            f.write(geo_content + layer_script)
        
        logger.info(f"向几何模型添加了 {len(soil_layers)} 个土层分界面")
        return geo_file
    
    def generate_mesh(self, geo_file, mesh_file, max_element_size=5.0, min_element_size=0.5,
                    size_factor=0.1, excavation_refinement=1.0, wall_refinement=0.5,
                    format="msh"):
        """生成有限元网格
        
        Args:
            geo_file (str): 几何文件路径
            mesh_file (str): 网格文件路径
            max_element_size (float): 最大单元尺寸
            min_element_size (float): 最小单元尺寸
            size_factor (float): 尺寸因子
            excavation_refinement (float): 开挖区域细化因子
            wall_refinement (float): 地下连续墙细化因子
            format (str): 输出格式
            
        Returns:
            str: 网格文件路径
        """
        if not os.path.exists(geo_file):
            raise FileNotFoundError(f"几何文件不存在: {geo_file}")
        
        # 确保目录存在
        os.makedirs(os.path.dirname(os.path.abspath(mesh_file)), exist_ok=True)
        
        # 使用命令行生成网格
        return self._generate_mesh_cmd(geo_file, mesh_file, max_element_size, min_element_size,
                                     size_factor, excavation_refinement, wall_refinement, format)
    
    def _generate_mesh_cmd(self, geo_file, mesh_file, max_element_size, min_element_size,
                         size_factor, excavation_refinement, wall_refinement, format):
        """使用Gmsh命令行生成有限元网格
        
        Args:
            geo_file (str): 几何文件路径
            mesh_file (str): 网格文件路径
            max_element_size (float): 最大单元尺寸
            min_element_size (float): 最小单元尺寸
            size_factor (float): 尺寸因子
            excavation_refinement (float): 开挖区域细化因子
            wall_refinement (float): 地下连续墙细化因子
            format (str): 输出格式
            
        Returns:
            str: 网格文件路径
        """
        # 构建命令行参数
        cmd = [
            self.gmsh_path,
            geo_file,
            "-3",  # 生成3D网格
            f"-clmax", f"{max_element_size}",
            f"-clmin", f"{min_element_size}",
            f"-clscale", f"{size_factor}",
            "-format", format,
            "-o", mesh_file
        ]
        
        # 执行命令
        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                logger.error(f"Gmsh命令执行失败: {result.stderr}")
                raise RuntimeError(f"Gmsh命令执行失败: {result.stderr}")
            
            logger.info(f"使用Gmsh命令行生成网格: {mesh_file}")
            return mesh_file
        except Exception as e:
            logger.error(f"生成网格时出错: {str(e)}")
            raise
    
    def get_mesh_statistics(self, mesh_file):
        """获取网格统计信息
        
        Args:
            mesh_file (str): 网格文件路径
            
        Returns:
            dict: 网格统计信息
        """
        if not os.path.exists(mesh_file):
            raise FileNotFoundError(f"网格文件不存在: {mesh_file}")
        
        if self.use_api:
            # 使用Gmsh API获取统计信息
            gmsh.open(mesh_file)
            
            # 获取节点数和单元数
            nodes = gmsh.model.mesh.getNodes()
            elements = gmsh.model.mesh.getElements()
            
            # 获取物理组
            physical_groups = {}
            for dim, tag in gmsh.model.getPhysicalGroups():
                name = gmsh.model.getPhysicalName(dim, tag)
                entities = gmsh.model.getEntitiesForPhysicalGroup(dim, tag)
                
                # 计算单元数
                element_count = 0
                for entity in entities:
                    elem_types, elem_tags, elem_node_tags = gmsh.model.mesh.getElements(dim, entity)
                    for i, elem_type in enumerate(elem_types):
                        element_count += len(elem_tags[i])
                
                physical_groups[name] = {
                    "dimension": dim,
                    "tag": tag,
                    "element_count": element_count
                }
            
            stats = {
                "nodes": len(nodes[0]),
                "elements": sum(len(tags) for tags in elements[1]),
                "physical_groups": physical_groups
            }
        else:
            # 使用Gmsh命令行获取统计信息
            cmd = [self.gmsh_path, "-info", mesh_file]
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            # 解析输出
            output = result.stdout
            
            # 简单解析节点数和单元数
            nodes = 0
            elements = 0
            physical_groups = {}
            
            for line in output.split("\n"):
                if "nodes" in line.lower():
                    try:
                        nodes = int(line.split()[0])
                    except:
                        pass
                elif "elements" in line.lower():
                    try:
                        elements = int(line.split()[0])
                    except:
                        pass
                elif "physical" in line.lower() and "group" in line.lower():
                    # 尝试解析物理组信息
                    parts = line.split("'")
                    if len(parts) >= 3:
                        name = parts[1]
                        physical_groups[name] = {
                            "element_count": 0  # 无法从命令行输出获取详细信息
                        }
            
            stats = {
                "nodes": nodes,
                "elements": elements,
                "physical_groups": physical_groups
            }
        
        return stats 