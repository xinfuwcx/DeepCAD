#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
优化FPN解析器单元测试
"""

import unittest
import tempfile
import sys
from pathlib import Path
from unittest.mock import Mock, patch

# 添加项目路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from core.optimized_fpn_parser import OptimizedFPNParser, ParseProgress


class TestParseProgress(unittest.TestCase):
    """解析进度测试"""
    
    def test_progress_creation(self):
        """测试进度对象创建"""
        progress = ParseProgress()
        
        self.assertEqual(progress.total_lines, 0)
        self.assertEqual(progress.processed_lines, 0)
        self.assertEqual(progress.nodes_count, 0)
        self.assertEqual(progress.elements_count, 0)
        self.assertEqual(progress.current_section, "")
    
    def test_progress_percent_calculation(self):
        """测试进度百分比计算"""
        progress = ParseProgress()
        
        # 总行数为0时
        self.assertEqual(progress.progress_percent, 0.0)
        
        # 正常情况
        progress.total_lines = 100
        progress.processed_lines = 50
        self.assertEqual(progress.progress_percent, 50.0)
        
        # 完成情况
        progress.processed_lines = 100
        self.assertEqual(progress.progress_percent, 100.0)


class TestOptimizedFPNParser(unittest.TestCase):
    """优化FPN解析器测试"""
    
    def setUp(self):
        """测试设置"""
        self.parser = OptimizedFPNParser()
        self.progress_calls = []
        
        def progress_callback(progress):
            self.progress_calls.append(progress)
        
        self.parser_with_callback = OptimizedFPNParser(progress_callback)
    
    def test_parser_initialization(self):
        """测试解析器初始化"""
        self.assertIsNotNone(self.parser)
        self.assertIsNone(self.parser.coordinate_offset)
        self.assertIsNone(self.parser.encoding_used)
        self.assertEqual(len(self.parser.encodings), 4)
    
    def test_detect_file_encoding(self):
        """测试文件编码检测"""
        # 创建测试文件
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', delete=False) as f:
            f.write("测试内容\n")
            f.write("NODE, 1, 0.0, 0.0, 0.0\n")
            test_file = f.name
        
        try:
            encoding = self.parser.detect_file_encoding(test_file)
            self.assertIn(encoding, ['utf-8', 'gbk', 'latin1', 'cp1252'])
        finally:
            Path(test_file).unlink()
    
    def test_count_file_lines(self):
        """测试文件行数统计"""
        # 创建测试文件
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', delete=False) as f:
            f.write("line1\n")
            f.write("line2\n")
            f.write("line3\n")
            test_file = f.name
        
        try:
            line_count = self.parser.count_file_lines(test_file, 'utf-8')
            self.assertEqual(line_count, 3)
        finally:
            Path(test_file).unlink()
    
    def test_parse_node_line(self):
        """测试节点行解析"""
        # 设置坐标偏移
        self.parser.coordinate_offset = (0.0, 0.0, 0.0)
        
        # 测试有效节点行
        node_line = "NODE   , 1, 100.0, 200.0, -50.0, 1, , ,"
        node_data = self.parser.parse_node_line(node_line)
        
        self.assertIsNotNone(node_data)
        self.assertEqual(node_data['id'], 1)
        self.assertEqual(node_data['x'], 100.0)
        self.assertEqual(node_data['y'], 200.0)
        self.assertEqual(node_data['z'], -50.0)
        
        # 测试无效节点行
        invalid_line = "INVALID LINE"
        node_data = self.parser.parse_node_line(invalid_line)
        self.assertIsNone(node_data)
    
    def test_parse_element_line(self):
        """测试单元行解析"""
        # 测试四面体单元
        tetra_line = "TETRA, 1, 1, 1, 2, 3, 4"
        element_data = self.parser.parse_element_line(tetra_line)
        
        self.assertIsNotNone(element_data)
        self.assertEqual(element_data['id'], 1)
        self.assertEqual(element_data['type'], 'tetra')
        self.assertEqual(element_data['material_id'], 1)
        self.assertEqual(element_data['nodes'], [1, 2, 3, 4])
        
        # 测试六面体单元
        hexa_line = "HEXA, 2, 2, 1, 2, 3, 4, 5, 6, 7, 8"
        element_data = self.parser.parse_element_line(hexa_line)
        
        self.assertIsNotNone(element_data)
        self.assertEqual(element_data['type'], 'hexa')
        self.assertEqual(len(element_data['nodes']), 8)
        
        # 测试无效单元行
        invalid_line = "INVALID LINE"
        element_data = self.parser.parse_element_line(invalid_line)
        self.assertIsNone(element_data)
    
    def test_calculate_coordinate_offset(self):
        """测试坐标偏移计算"""
        # 创建包含大坐标值的测试文件
        test_content = """$$ Test FPN file
NODE   , 1, 499524648.536277, 316896209.069576, -60000.065764406, 1, , , 
NODE   , 2, 499542929.9912, 316441370.116915, -60129.455104188, 1, , , 
NODE   , 3, 499525000.0, 316896500.0, -60050.0, 1, , , 
"""
        
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', delete=False) as f:
            f.write(test_content)
            test_file = f.name
        
        try:
            offset = self.parser.calculate_coordinate_offset(test_file, 'utf-8')
            
            # 偏移应该是最小坐标值
            self.assertAlmostEqual(offset[0], 499524648.536277, places=5)
            self.assertAlmostEqual(offset[1], 316441370.116915, places=5)
            self.assertAlmostEqual(offset[2], -60129.455104188, places=5)
            
        finally:
            Path(test_file).unlink()
    
    def test_parse_file_streaming(self):
        """测试流式文件解析"""
        # 创建完整的测试FPN文件
        test_content = """$$ Test FPN file
$$ Version information.
VER, 2.0.0

$$      Node
NODE   , 1, 0.0, 0.0, 0.0, 1, , , 
NODE   , 2, 1.0, 0.0, 0.0, 1, , , 
NODE   , 3, 0.0, 1.0, 0.0, 1, , , 
NODE   , 4, 0.0, 0.0, 1.0, 1, , , 

$$      Element
TETRA, 1, 1, 1, 2, 3, 4
"""
        
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', delete=False) as f:
            f.write(test_content)
            test_file = f.name
        
        try:
            result = self.parser.parse_file_streaming(test_file)
            
            # 检查解析结果
            self.assertIn('nodes', result)
            self.assertIn('elements', result)
            self.assertIn('metadata', result)
            
            # 检查节点数据
            nodes = result['nodes']
            self.assertEqual(len(nodes), 4)
            self.assertEqual(nodes[0]['id'], 1)
            
            # 检查单元数据
            elements = result['elements']
            self.assertEqual(len(elements), 1)
            self.assertEqual(elements[0]['type'], 'tetra')
            
            # 检查元数据
            metadata = result['metadata']
            self.assertIn('encoding', metadata)
            self.assertIn('coordinate_offset', metadata)
            
        finally:
            Path(test_file).unlink()
    
    def test_progress_callback(self):
        """测试进度回调"""
        # 创建测试文件
        test_content = """$$ Test file
NODE   , 1, 0.0, 0.0, 0.0, 1, , , 
NODE   , 2, 1.0, 0.0, 0.0, 1, , , 
TETRA, 1, 1, 1, 2, 3, 4
"""
        
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', delete=False) as f:
            f.write(test_content)
            test_file = f.name
        
        try:
            # 使用带回调的解析器
            result = self.parser_with_callback.parse_file_streaming(test_file)
            
            # 检查是否调用了进度回调
            # 注意：由于文件很小，可能不会触发所有回调
            self.assertIsNotNone(result)
            
        finally:
            Path(test_file).unlink()
    
    def test_error_handling(self):
        """测试错误处理"""
        # 测试不存在的文件
        with self.assertRaises(Exception):
            self.parser.parse_file_streaming("nonexistent_file.fpn")
        
        # 测试空文件
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', delete=False) as f:
            test_file = f.name
        
        try:
            result = self.parser.parse_file_streaming(test_file)
            
            # 空文件应该返回空结果
            self.assertEqual(len(result['nodes']), 0)
            self.assertEqual(len(result['elements']), 0)
            
        finally:
            Path(test_file).unlink()


class TestProgressCallback(unittest.TestCase):
    """进度回调测试"""
    
    def test_create_progress_callback(self):
        """测试创建进度回调函数"""
        from core.optimized_fpn_parser import create_progress_callback
        
        callback = create_progress_callback()
        self.assertIsNotNone(callback)
        
        # 测试回调函数
        progress = ParseProgress()
        progress.total_lines = 100
        progress.processed_lines = 50
        progress.nodes_count = 25
        progress.elements_count = 10
        progress.current_section = "nodes"
        
        # 这应该不会抛出异常
        callback(progress)


class TestIntegration(unittest.TestCase):
    """集成测试"""
    
    def test_real_fpn_file_parsing(self):
        """测试真实FPN文件解析（如果存在）"""
        # 查找真实的FPN文件
        fpn_file = project_root / "data" / "基坑fpn.fpn"
        
        if fpn_file.exists():
            parser = OptimizedFPNParser()
            
            try:
                result = parser.parse_file_streaming(str(fpn_file))
                
                # 检查解析结果
                self.assertGreater(len(result['nodes']), 0)
                self.assertGreater(len(result['elements']), 0)
                
                print(f"真实FPN文件解析成功:")
                print(f"  节点数: {len(result['nodes'])}")
                print(f"  单元数: {len(result['elements'])}")
                print(f"  编码: {result['metadata']['encoding']}")
                
            except Exception as e:
                self.fail(f"真实FPN文件解析失败: {e}")
        else:
            self.skipTest("真实FPN文件不存在，跳过集成测试")


if __name__ == "__main__":
    # 运行测试
    unittest.main(verbosity=2)
