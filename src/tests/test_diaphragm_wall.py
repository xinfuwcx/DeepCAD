#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@file test_diaphragm_wall.py
@description 测试地连墙创建功能
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import unittest
import numpy as np
import logging

# 添加项目根目录到路径
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from src.core.modeling.iga_support_modeler import IgaSupportModeler

class TestDiaphragmWall(unittest.TestCase):
    """测试地连墙创建功能"""
    
    def setUp(self):
        """测试前的设置"""
        self.modeler = IgaSupportModeler()
        
    def test_create_diaphragm_wall(self):
        """测试创建地连墙"""
        # 创建地连墙
        start_point = [0.0, 0.0, 0.0]
        end_point = [10.0, 0.0, 0.0]
        height = 15.0
        thickness = 0.8
        
        # 手动创建地连墙
        try:
            # 计算方向向量
            direction = np.array(end_point) - np.array(start_point)
            length = np.linalg.norm(direction)
            direction = direction / length if length > 0 else np.array([1.0, 0.0, 0.0])
            
            # 计算垂直于方向的向量(厚度方向)
            if abs(direction[0]) < 0.001 and abs(direction[2]) < 0.001:
                # 如果方向是垂直的
                normal = np.array([1.0, 0.0, 0.0])
            else:
                # 否则使用叉积计算垂直向量
                up = np.array([0.0, 1.0, 0.0])
                normal = np.cross(direction, up)
                normal = normal / np.linalg.norm(normal)
            
            # 计算厚度方向的偏移
            half_thickness = thickness / 2.0
            offset = normal * half_thickness
            
            # 设置参数
            degree_u = 2
            degree_v = 1
            control_points_u = 5
            control_points_v = 2
            
            # 创建控制点网格
            ctrlpts = []
            for j in range(control_points_v):
                for i in range(control_points_u):
                    # 计算u方向位置参数(沿墙长度)
                    u = i / (control_points_u - 1)
                    
                    # 计算v方向位置参数(厚度方向)
                    v = j / (control_points_v - 1)
                    v = v * 2 - 1  # 映射到[-1, 1]
                    
                    # 计算基础点(沿墙长度)
                    base_point = np.array(start_point) + direction * u * length
                    
                    # 添加厚度方向的偏移
                    point = base_point + offset * v
                    
                    # 添加控制点 [x, y, z, 1.0] (最后一个是权重)
                    ctrlpts.append([point[0], point[1], point[2], 1.0])
            
            # 导入所需库
            from geomdl import NURBS
            from geomdl import utilities
            
            # 创建NURBS表面 - 正确的顺序
            surface = NURBS.Surface()
            
            # 1. 设置阶数
            surface.degree_u = degree_u
            surface.degree_v = degree_v
            
            # 2. 计算节点向量
            surface.knotvector_u = utilities.generate_knot_vector(surface.degree_u, control_points_u)
            surface.knotvector_v = utilities.generate_knot_vector(surface.degree_v, control_points_v)
            
            # 3. 设置控制点
            surface.set_ctrlpts(ctrlpts, control_points_u, control_points_v)
            
            # 4. 设置权重
            surface.weights = [pt[3] for pt in ctrlpts]
            
            # 5. 生成表面
            surface.delta = 0.01
            surface.evaluate()
            
            # 测试成功
            self.assertTrue(True, "手动创建地连墙成功")
            
        except Exception as e:
            self.fail(f"手动创建地连墙失败: {str(e)}")
        
        # 使用模型创建地连墙
        wall_id = self.modeler.create_diaphragm_wall(
            start_point=start_point,
            end_point=end_point,
            height=height,
            thickness=thickness
        )
        
        # 验证是否成功创建
        self.assertTrue(wall_id, "地连墙创建失败")
        self.assertIn(wall_id, self.modeler.support_structures, "地连墙未添加到支护结构字典中")
        
if __name__ == "__main__":
    unittest.main()
