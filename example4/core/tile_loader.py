#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
3D Tiles瓦片集加载器
支持3D Tiles标准格式的解析和加载
"""

import json
import struct
import gzip
import base64
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from urllib.parse import urljoin
from dataclasses import dataclass

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    print("警告: NumPy不可用，部分功能受限")

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    print("警告: requests不可用，HTTP瓦片源不支持")


@dataclass
class TileBounds:
    """瓦片边界框"""
    min_x: float
    min_y: float
    min_z: float
    max_x: float
    max_y: float
    max_z: float
    
    @property
    def center(self) -> Tuple[float, float, float]:
        return (
            (self.min_x + self.max_x) / 2,
            (self.min_y + self.max_y) / 2,
            (self.min_z + self.max_z) / 2
        )
    
    @property
    def size(self) -> Tuple[float, float, float]:
        return (
            self.max_x - self.min_x,
            self.max_y - self.min_y,
            self.max_z - self.min_z
        )


@dataclass
class TileGeometry:
    """瓦片几何数据"""
    vertices: np.ndarray if NUMPY_AVAILABLE else List
    indices: np.ndarray if NUMPY_AVAILABLE else List
    normals: Optional[np.ndarray] = None
    uvs: Optional[np.ndarray] = None
    colors: Optional[np.ndarray] = None
    
    @property
    def vertex_count(self) -> int:
        if NUMPY_AVAILABLE and isinstance(self.vertices, np.ndarray):
            return len(self.vertices)
        return len(self.vertices) if self.vertices else 0
    
    @property
    def triangle_count(self) -> int:
        if NUMPY_AVAILABLE and isinstance(self.indices, np.ndarray):
            return len(self.indices) // 3
        return len(self.indices) // 3 if self.indices else 0


@dataclass
class TileContent:
    """瓦片内容"""
    format: str  # b3dm, pnts, i3dm, cmpt
    geometry: Optional[TileGeometry] = None
    properties: Optional[Dict] = None
    texture_data: Optional[bytes] = None
    
    @property
    def memory_usage(self) -> float:
        """估计内存使用量(MB)"""
        size = 0
        if self.geometry:
            if NUMPY_AVAILABLE:
                if isinstance(self.geometry.vertices, np.ndarray):
                    size += self.geometry.vertices.nbytes
                if isinstance(self.geometry.indices, np.ndarray):
                    size += self.geometry.indices.nbytes
                if self.geometry.normals is not None:
                    size += self.geometry.normals.nbytes
            else:
                # 粗略估计
                size += len(self.geometry.vertices) * 12 if self.geometry.vertices else 0
                size += len(self.geometry.indices) * 4 if self.geometry.indices else 0
        
        if self.texture_data:
            size += len(self.texture_data)
            
        return size / (1024 * 1024)  # 转换为MB


class TileNode:
    """瓦片节点"""
    
    def __init__(self, tile_data: Dict):
        self.data = tile_data
        self.children: List['TileNode'] = []
        self.content: Optional[TileContent] = None
        self.bounds: Optional[TileBounds] = None
        self.loaded = False
        
        # 解析边界框
        if 'boundingVolume' in tile_data:
            self._parse_bounding_volume(tile_data['boundingVolume'])
            
        # 解析子瓦片
        if 'children' in tile_data:
            for child_data in tile_data['children']:
                self.children.append(TileNode(child_data))
    
    def _parse_bounding_volume(self, bv_data: Dict):
        """解析边界体积"""
        if 'box' in bv_data:
            # 有向边界框
            box = bv_data['box']
            center = box[:3]
            half_axes = np.array(box[3:]).reshape(3, 3) if NUMPY_AVAILABLE else box[3:]
            
            # 计算AABB
            if NUMPY_AVAILABLE:
                extents = np.linalg.norm(half_axes, axis=1)
                self.bounds = TileBounds(
                    center[0] - extents[0], center[1] - extents[1], center[2] - extents[2],
                    center[0] + extents[0], center[1] + extents[1], center[2] + extents[2]
                )
            else:
                # 简化计算
                extent = max(abs(x) for x in box[3:])
                self.bounds = TileBounds(
                    center[0] - extent, center[1] - extent, center[2] - extent,
                    center[0] + extent, center[1] + extent, center[2] + extent
                )
                
        elif 'sphere' in bv_data:
            # 边界球
            sphere = bv_data['sphere']
            center = sphere[:3]
            radius = sphere[3]
            self.bounds = TileBounds(
                center[0] - radius, center[1] - radius, center[2] - radius,
                center[0] + radius, center[1] + radius, center[2] + radius
            )
    
    @property
    def has_content(self) -> bool:
        """是否有内容"""
        return 'content' in self.data
    
    @property
    def content_uri(self) -> Optional[str]:
        """内容URI"""
        return self.data.get('content', {}).get('uri')
    
    @property
    def geometric_error(self) -> float:
        """几何误差"""
        return self.data.get('geometricError', 0.0)
    
    def is_visible(self, camera_pos: Tuple[float, float, float], 
                  camera_dir: Tuple[float, float, float], 
                  screen_size_threshold: float = 1.0) -> bool:
        """检查瓦片是否可见"""
        if not self.bounds:
            return True
            
        # 简单的距离检查
        if NUMPY_AVAILABLE:
            distance = np.linalg.norm(np.array(camera_pos) - np.array(self.bounds.center))
        else:
            dx = camera_pos[0] - self.bounds.center[0]
            dy = camera_pos[1] - self.bounds.center[1]
            dz = camera_pos[2] - self.bounds.center[2]
            distance = (dx*dx + dy*dy + dz*dz) ** 0.5
            
        # 基于几何误差的LOD判断
        screen_size = self.geometric_error / distance if distance > 0 else float('inf')
        return screen_size > screen_size_threshold


class TilesetLoader:
    """3D Tiles瓦片集加载器"""
    
    def __init__(self):
        self.root_node: Optional[TileNode] = None
        self.base_url: str = ""
        self.metadata: Dict = {}
        self.loaded_tiles: Dict[str, TileContent] = {}
        
    def load_tileset(self, tileset_path: str) -> 'Tileset':
        """加载瓦片集"""
        tileset_path = Path(tileset_path)
        
        if tileset_path.is_file():
            # 加载本地文件
            with open(tileset_path, 'r', encoding='utf-8') as f:
                tileset_data = json.load(f)
            self.base_url = str(tileset_path.parent)
        elif tileset_path.as_posix().startswith(('http://', 'https://')):
            # 加载远程文件
            if not REQUESTS_AVAILABLE:
                raise ImportError("需要requests库来加载远程瓦片集")
            
            response = requests.get(str(tileset_path))
            response.raise_for_status()
            tileset_data = response.json()
            self.base_url = str(tileset_path).rsplit('/', 1)[0]
        else:
            raise FileNotFoundError(f"找不到瓦片集文件: {tileset_path}")
        
        # 解析瓦片集
        self.metadata = {
            'asset': tileset_data.get('asset', {}),
            'geometricError': tileset_data.get('geometricError', 0.0),
            'properties': tileset_data.get('properties', {})
        }
        
        # 创建根节点
        self.root_node = TileNode(tileset_data['root'])
        
        # 返回瓦片集对象
        return Tileset(self.root_node, self.metadata, self)
    
    def load_tile_content(self, tile_node: TileNode) -> Optional[TileContent]:
        """加载瓦片内容"""
        if not tile_node.has_content:
            return None
            
        content_uri = tile_node.content_uri
        if not content_uri:
            return None
            
        # 检查缓存
        if content_uri in self.loaded_tiles:
            return self.loaded_tiles[content_uri]
        
        try:
            # 构建完整URL
            if content_uri.startswith(('http://', 'https://')):
                full_url = content_uri
            else:
                full_url = str(Path(self.base_url) / content_uri)
            
            # 加载内容
            if full_url.startswith(('http://', 'https://')):
                if not REQUESTS_AVAILABLE:
                    raise ImportError("需要requests库来加载远程内容")
                response = requests.get(full_url)
                response.raise_for_status()
                content_data = response.content
            else:
                with open(full_url, 'rb') as f:
                    content_data = f.read()
            
            # 解析内容
            content = self._parse_tile_content(content_data, content_uri)
            
            # 缓存内容
            self.loaded_tiles[content_uri] = content
            tile_node.content = content
            tile_node.loaded = True
            
            return content
            
        except Exception as e:
            print(f"加载瓦片内容失败 {content_uri}: {e}")
            return None
    
    def _parse_tile_content(self, data: bytes, uri: str) -> TileContent:
        """解析瓦片内容"""
        # 检查文件头确定格式
        if len(data) < 4:
            raise ValueError("瓦片数据太短")
        
        magic = data[:4]
        
        if magic == b'b3dm':
            return self._parse_b3dm(data)
        elif magic == b'pnts':
            return self._parse_pnts(data)
        elif magic == b'i3dm':
            return self._parse_i3dm(data)
        elif magic == b'cmpt':
            return self._parse_cmpt(data)
        else:
            # 尝试作为glTF解析
            return self._parse_gltf(data, uri)
    
    def _parse_b3dm(self, data: bytes) -> TileContent:
        """解析B3DM格式(批处理3D模型)"""
        # B3DM文件格式:
        # Header (28 bytes) + Feature Table + Batch Table + glTF
        
        if len(data) < 28:
            raise ValueError("B3DM文件头不完整")
        
        # 读取文件头
        magic, version, byte_length, feature_table_json_length, \
        feature_table_binary_length, batch_table_json_length, \
        batch_table_binary_length = struct.unpack('<4sIIIIII', data[:28])
        
        offset = 28
        
        # 跳过Feature Table和Batch Table
        offset += feature_table_json_length + feature_table_binary_length
        offset += batch_table_json_length + batch_table_binary_length
        
        # 解析嵌入的glTF
        gltf_data = data[offset:]
        geometry = self._parse_gltf_geometry(gltf_data)
        
        return TileContent(format='b3dm', geometry=geometry)
    
    def _parse_pnts(self, data: bytes) -> TileContent:
        """解析PNTS格式(点云)"""
        # 简化的PNTS解析
        # 实际实现需要解析Feature Table中的位置数据
        
        if len(data) < 28:
            raise ValueError("PNTS文件头不完整")
            
        # 创建简单的点云几何
        if NUMPY_AVAILABLE:
            # 生成示例点云数据
            point_count = min(1000, (len(data) - 28) // 12)  # 假设每个点12字节
            vertices = np.random.rand(point_count, 3).astype(np.float32) * 100
            geometry = TileGeometry(vertices=vertices, indices=None)
        else:
            # 生成简单的点数据
            vertices = [[i, i, i] for i in range(10)]
            geometry = TileGeometry(vertices=vertices, indices=None)
        
        return TileContent(format='pnts', geometry=geometry)
    
    def _parse_i3dm(self, data: bytes) -> TileContent:
        """解析I3DM格式(实例化3D模型)"""
        # I3DM解析待实现
        return TileContent(format='i3dm')
    
    def _parse_cmpt(self, data: bytes) -> TileContent:
        """解析CMPT格式(复合瓦片)"""
        # CMPT解析待实现
        return TileContent(format='cmpt')
    
    def _parse_gltf(self, data: bytes, uri: str) -> TileContent:
        """解析glTF格式"""
        try:
            # 检查是否为GLB(二进制glTF)
            if data[:4] == b'glTF':
                return self._parse_glb(data)
            else:
                # JSON glTF
                gltf_json = json.loads(data.decode('utf-8'))
                geometry = self._extract_gltf_geometry(gltf_json)
                return TileContent(format='gltf', geometry=geometry)
        except Exception as e:
            print(f"glTF解析失败: {e}")
            # 返回空内容
            return TileContent(format='gltf')
    
    def _parse_glb(self, data: bytes) -> TileContent:
        """解析GLB格式"""
        # GLB解析实现
        # 这里简化处理，实际需要完整的GLB解析器
        return TileContent(format='glb')
    
    def _parse_gltf_geometry(self, gltf_data: bytes) -> Optional[TileGeometry]:
        """从glTF数据提取几何信息"""
        # 简化的几何提取
        # 实际实现需要完整的glTF解析器
        
        if NUMPY_AVAILABLE:
            # 生成示例几何数据
            vertices = np.array([
                [-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0]  # 简单四边形
            ], dtype=np.float32)
            indices = np.array([0, 1, 2, 0, 2, 3], dtype=np.uint32)
            return TileGeometry(vertices=vertices, indices=indices)
        else:
            vertices = [[-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0]]
            indices = [0, 1, 2, 0, 2, 3]
            return TileGeometry(vertices=vertices, indices=indices)
    
    def _extract_gltf_geometry(self, gltf_json: Dict) -> Optional[TileGeometry]:
        """从glTF JSON提取几何信息"""
        # 实际实现需要解析buffers, bufferViews, accessors等
        # 这里返回示例数据
        
        if NUMPY_AVAILABLE:
            vertices = np.array([[0, 0, 0], [1, 0, 0], [0.5, 1, 0]], dtype=np.float32)
            indices = np.array([0, 1, 2], dtype=np.uint32)
            return TileGeometry(vertices=vertices, indices=indices)
        else:
            vertices = [[0, 0, 0], [1, 0, 0], [0.5, 1, 0]]
            indices = [0, 1, 2]
            return TileGeometry(vertices=vertices, indices=indices)


class Tileset:
    """3D瓦片集"""
    
    def __init__(self, root_node: TileNode, metadata: Dict, loader: TilesetLoader):
        self.root_node = root_node
        self.metadata = metadata
        self.loader = loader
        self._tile_count = None
        self._memory_usage = None
    
    @property
    def tile_count(self) -> int:
        """瓦片总数"""
        if self._tile_count is None:
            self._tile_count = self._count_tiles(self.root_node)
        return self._tile_count
    
    def _count_tiles(self, node: TileNode) -> int:
        """递归计算瓦片数量"""
        count = 1
        for child in node.children:
            count += self._count_tiles(child)
        return count
    
    @property
    def memory_usage(self) -> float:
        """内存使用量(MB)"""
        if self._memory_usage is None:
            self._memory_usage = sum(
                content.memory_usage 
                for content in self.loader.loaded_tiles.values()
            )
        return self._memory_usage
    
    @property
    def bounds(self) -> Optional[TileBounds]:
        """瓦片集边界"""
        return self.root_node.bounds
    
    def get_visible_tiles(self, camera_pos: Tuple[float, float, float],
                         camera_dir: Tuple[float, float, float],
                         lod_threshold: float = 1.0) -> List[TileNode]:
        """获取可见瓦片列表"""
        visible_tiles = []
        self._collect_visible_tiles(
            self.root_node, camera_pos, camera_dir, 
            lod_threshold, visible_tiles
        )
        return visible_tiles
    
    def _collect_visible_tiles(self, node: TileNode, 
                              camera_pos: Tuple[float, float, float],
                              camera_dir: Tuple[float, float, float],
                              lod_threshold: float,
                              result: List[TileNode]):
        """递归收集可见瓦片"""
        if not node.is_visible(camera_pos, camera_dir, lod_threshold):
            return
        
        # 如果有内容且满足LOD要求，添加到结果
        if node.has_content:
            result.append(node)
        
        # 检查子节点
        for child in node.children:
            self._collect_visible_tiles(
                child, camera_pos, camera_dir, lod_threshold, result
            )
    
    def load_visible_content(self, visible_tiles: List[TileNode]):
        """加载可见瓦片的内容"""
        for tile in visible_tiles:
            if not tile.loaded and tile.has_content:
                self.loader.load_tile_content(tile)


# 导出的主要类
__all__ = [
    'TilesetLoader', 'Tileset', 'TileNode', 'TileContent', 
    'TileGeometry', 'TileBounds'
]