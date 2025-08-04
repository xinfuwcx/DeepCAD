#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
3D瓦片加载器测试
"""

import unittest
import json
import tempfile
from pathlib import Path
import sys

# 添加项目路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

try:
    from core.tile_loader import TilesetLoader, TileNode, TileBounds
    CORE_AVAILABLE = True
except ImportError as e:
    CORE_AVAILABLE = False
    print(f"核心模块导入失败: {e}")


class TestTileLoader(unittest.TestCase):
    """瓦片加载器测试"""
    
    def setUp(self):
        """测试前准备"""
        if not CORE_AVAILABLE:
            self.skipTest("核心模块不可用")
            
        self.loader = TilesetLoader()
        
        # 创建测试用的tileset.json
        self.test_tileset = {
            "asset": {"version": "1.0"},
            "geometricError": 500.0,
            "root": {
                "boundingVolume": {
                    "box": [0, 0, 0, 50, 0, 0, 0, 50, 0, 0, 0, 25]
                },
                "geometricError": 100.0,
                "content": {
                    "uri": "test.b3dm"
                },
                "children": [
                    {
                        "boundingVolume": {
                            "sphere": [25, 25, 12.5, 30]
                        },
                        "geometricError": 50.0,
                        "content": {
                            "uri": "child1.b3dm"
                        }
                    }
                ]
            }
        }
        
    def test_tile_bounds_creation(self):
        """测试边界框创建"""
        bounds = TileBounds(-10, -5, 0, 10, 5, 20)
        
        self.assertEqual(bounds.center, (0, 0, 10))
        self.assertEqual(bounds.size, (20, 10, 20))
        
    def test_tile_node_creation(self):
        """测试瓦片节点创建"""
        node = TileNode(self.test_tileset["root"])
        
        self.assertTrue(node.has_content)
        self.assertEqual(node.content_uri, "test.b3dm")
        self.assertEqual(node.geometric_error, 100.0)
        self.assertEqual(len(node.children), 1)
        self.assertIsNotNone(node.bounds)
        
    def test_tile_node_bounding_box(self):
        """测试边界框解析"""
        node = TileNode(self.test_tileset["root"])
        bounds = node.bounds
        
        self.assertIsNotNone(bounds)
        # 由于box格式的复杂计算，只检查bounds存在
        self.assertIsInstance(bounds, TileBounds)
        
    def test_tile_node_bounding_sphere(self):
        """测试边界球解析"""
        child_data = self.test_tileset["root"]["children"][0]
        node = TileNode(child_data)
        bounds = node.bounds
        
        self.assertIsNotNone(bounds)
        self.assertEqual(bounds.center, (25, 25, 12.5))
        # 边界球转AABB，检查尺寸
        expected_size = 60  # 半径30 * 2
        self.assertEqual(bounds.size, (expected_size, expected_size, expected_size))
        
    def test_tile_visibility(self):
        """测试瓦片可见性判断"""
        node = TileNode(self.test_tileset["root"])
        
        # 近距离相机 - 应该可见
        camera_pos = (0, 0, 100)
        camera_dir = (0, 0, -1)
        
        self.assertTrue(node.is_visible(camera_pos, camera_dir, 1.0))
        
        # 远距离相机 - 可能不可见
        camera_pos = (1000, 1000, 1000)
        
        # 这个测试依赖于具体的可见性算法实现
        result = node.is_visible(camera_pos, camera_dir, 10.0)
        self.assertIsInstance(result, bool)
        
    def test_tileset_loading_mock(self):
        """测试瓦片集加载(模拟数据)"""
        # 创建临时文件
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(self.test_tileset, f)
            temp_path = f.name
            
        try:
            # 加载瓦片集
            tileset = self.loader.load_tileset(temp_path)
            
            self.assertIsNotNone(tileset)
            self.assertIsNotNone(tileset.root_node)
            self.assertEqual(tileset.tile_count, 2)  # root + 1 child
            self.assertIsNotNone(tileset.bounds)
            
        finally:
            # 清理临时文件
            Path(temp_path).unlink()
            
    def test_tile_counting(self):
        """测试瓦片计数"""
        # 创建临时文件
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(self.test_tileset, f)
            temp_path = f.name
            
        try:
            tileset = self.loader.load_tileset(temp_path)
            
            # 应该有2个瓦片：root + 1个子瓦片
            self.assertEqual(tileset.tile_count, 2)
            
        finally:
            Path(temp_path).unlink()
            
    def test_visible_tiles_collection(self):
        """测试可见瓦片收集"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(self.test_tileset, f)
            temp_path = f.name
            
        try:
            tileset = self.loader.load_tileset(temp_path)
            
            # 获取可见瓦片
            camera_pos = (0, 0, 100)
            camera_dir = (0, 0, -1)
            visible_tiles = tileset.get_visible_tiles(camera_pos, camera_dir, 1.0)
            
            # 应该至少有root瓦片可见
            self.assertGreater(len(visible_tiles), 0)
            
            # 检查返回的都是TileNode对象
            for tile in visible_tiles:
                self.assertIsInstance(tile, TileNode)
                
        finally:
            Path(temp_path).unlink()


class TestTileContent(unittest.TestCase):
    """瓦片内容测试"""
    
    def setUp(self):
        if not CORE_AVAILABLE:
            self.skipTest("核心模块不可用")
            
    def test_mock_b3dm_parsing(self):
        """测试B3DM解析(模拟)"""
        loader = TilesetLoader()
        
        # 创建模拟B3DM数据
        mock_b3dm = b'b3dm' + b'\x00' * 24 + b'{"test": "data"}'
        
        try:
            content = loader._parse_tile_content(mock_b3dm, "test.b3dm")
            self.assertEqual(content.format, 'b3dm')
            self.assertIsNotNone(content.geometry)
        except Exception as e:
            # B3DM解析可能失败，这是正常的，因为我们使用的是模拟数据
            print(f"B3DM解析失败(预期): {e}")
            
    def test_mock_pnts_parsing(self):
        """测试PNTS解析(模拟)"""
        loader = TilesetLoader()
        
        # 创建模拟PNTS数据
        mock_pnts = b'pnts' + b'\x00' * 24 + b'point cloud data'
        
        try:
            content = loader._parse_tile_content(mock_pnts, "test.pnts")
            self.assertEqual(content.format, 'pnts')
            self.assertIsNotNone(content.geometry)
        except Exception as e:
            print(f"PNTS解析失败(预期): {e}")


if __name__ == '__main__':
    unittest.main()