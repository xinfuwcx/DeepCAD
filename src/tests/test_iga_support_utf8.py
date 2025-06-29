#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@file test_iga_support.py
@description 测试IGA支护结构建模器
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import unittest
import numpy as np
import json
import logging

# 添加项目根目录到路径
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from src.core.modeling.iga_support_modeler import IgaSupportModeler

class TestIgaSupportModeler(unittest.TestCase):
    """测试IGA支护结构建模器"""
    
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
