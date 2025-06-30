"""
@file data_converter.py
@description 几何数据转换与传输优化模块
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import numpy as np
import json
import os
import time
import zlib
import base64
from typing import Dict, List, Any, Optional, Union, Tuple
import multiprocessing
from concurrent.futures import ThreadPoolExecutor

# 尝试导入OCC相关库
try:
    from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh
    from OCC.Core.TopoDS import TopoDS_Shape
    from OCC.Core.TopExp import TopExp_Explorer
    from OCC.Core.TopAbs import TopAbs_FACE
    from OCC.Core.BRep import BRep_Tool
    from OCC.Core.TopLoc import TopLoc_Location
    from OCC.Extend.DataExchange import write_stl_file
    HAS_OCC = True
except ImportError:
    HAS_OCC = False
    print("警告: OpenCascade Core (OCC) 未安装或无法导入")

class DataConverter:
    """
    几何数据转换与传输优化类
    用于在OCC和Three.js之间高效转换和传输数据
    """
    
    def __init__(self, use_compression: bool = True, compression_level: int = 6, use_cache: bool = True):
        """
        初始化数据转换器
        
        Args:
            use_compression: 是否使用压缩
            compression_level: 压缩级别(1-9)，越高压缩率越大但速度越慢
            use_cache: 是否使用缓存
        """
        self.use_compression = use_compression
        self.compression_level = min(max(compression_level, 1), 9)  # 限制在1-9之间
        self.cache = {}  # 缓存已转换的数据
    
    def occ_to_threejs(self, occ_data: Dict[str, Any], 
                      optimize: bool = True,
                      detail_level: str = "medium") -> Dict[str, Any]:
        """
        将OCC数据格式转换为Three.js格式
        
        Args:
            occ_data: 来自OCC的几何数据
            optimize: 是否进行优化
            detail_level: 细节级别，可选"low", "medium", "high"
            
        Returns:
            转换后的Three.js格式数据
        """
        # 生成缓存键
        cache_key = self._generate_cache_key(occ_data, detail_level)
        
        # 检查缓存
        if cache_key in self.cache:
            return self.cache[cache_key]
            
        # 转换数据
        threejs_data = self._convert_data(occ_data, detail_level)
        
        # 优化数据
        if optimize:
            threejs_data = self._optimize_data(threejs_data)
            
        # 缓存结果
        self.cache[cache_key] = threejs_data
        
        return threejs_data
    
    def _generate_cache_key(self, data: Dict[str, Any], detail_level: str) -> str:
        """生成缓存键"""
        try:
            # 简化数据以生成一致的哈希
            simplified = {
                "type": data.get("type", "unknown"),
                "id": data.get("id", 0),
                "detail": detail_level
            }
            
            # 对于不同类型的几何体，添加特定参数
            if data.get("type") == "box":
                params = data.get("params", {})
                simplified["dims"] = (
                    params.get("width", 0),
                    params.get("length", 0),
                    params.get("height", 0)
                )
            elif data.get("type") == "cylinder":
                params = data.get("params", {})
                simplified["dims"] = (
                    params.get("radius", 0),
                    params.get("height", 0)
                )
            elif data.get("type") == "nurbs_surface":
                # 对于NURBS曲面，我们使用控制点数量和度
                params = data.get("params", {})
                control_points = params.get("control_points", [])
                simplified["cp_count"] = (len(control_points), 
                                         len(control_points[0]) if control_points else 0)
                simplified["degree"] = (params.get("u_degree", 3), params.get("v_degree", 3))
            
            # 使用JSON字符串表示，然后哈希
            json_str = json.dumps(simplified, sort_keys=True)
            return f"cache_{hash(json_str)}"
        except Exception as e:
            print(f"缓存键生成错误: {e}")
            # 回退到时间戳 + 随机数
            return f"cache_{time.time()}_{np.random.randint(0, 1000000)}"
    
    def _convert_data(self, occ_data: Dict[str, Any], detail_level: str) -> Dict[str, Any]:
        """
        根据OCC数据类型进行具体转换
        
        Args:
            occ_data: OCC数据
            detail_level: 细节级别
            
        Returns:
            转换后的Three.js数据
        """
        data_type = occ_data.get("type", "unknown")
        
        if data_type == "box":
            return self._convert_box(occ_data)
        elif data_type == "cylinder":
            return self._convert_cylinder(occ_data)
        elif data_type == "sphere":
            return self._convert_sphere(occ_data)
        elif data_type == "cone":
            return self._convert_cone(occ_data)
        elif data_type == "nurbs_surface":
            return self._convert_nurbs_surface(occ_data, detail_level)
        elif data_type in ["boolean_cut", "boolean_union"]:
            return self._convert_boolean_result(occ_data)
        else:
            print(f"未知几何类型: {data_type}")
            return {"error": f"不支持的几何类型: {data_type}"}
    
    def _convert_box(self, occ_data: Dict[str, Any]) -> Dict[str, Any]:
        """转换盒体几何体"""
        params = occ_data.get("params", {})
        width = params.get("width", 1)
        length = params.get("length", 1)
        height = params.get("height", 1)
        center = params.get("center", [0, 0, 0])
        
        return {
            "uuid": self._generate_uuid(),
            "type": "BoxGeometry",
            "width": width,
            "height": height,
            "depth": length,
            "position": center,
            "material": {
                "uuid": self._generate_uuid(),
                "type": "MeshPhongMaterial",
                "color": 0xcccccc,
                "transparent": True,
                "opacity": 0.8,
                "side": 2  # DoubleSide
            }
        }
    
    def _convert_cylinder(self, occ_data: Dict[str, Any]) -> Dict[str, Any]:
        """转换圆柱体几何体"""
        params = occ_data.get("params", {})
        radius = params.get("radius", 1)
        height = params.get("height", 1)
        center = params.get("center", [0, 0, 0])
        direction = params.get("direction", [0, 0, 1])
        
        # 计算旋转矩阵，使圆柱体方向与给定方向一致
        # 默认Three.js中圆柱体是沿Y轴的
        quaternion = self._calculate_cylinder_rotation(direction)
        
        return {
            "uuid": self._generate_uuid(),
            "type": "CylinderGeometry",
            "radiusTop": radius,
            "radiusBottom": radius,
            "height": height,
            "radialSegments": 32,
            "position": center,
            "quaternion": quaternion,
            "material": {
                "uuid": self._generate_uuid(),
                "type": "MeshPhongMaterial",
                "color": 0xcccccc,
                "transparent": True,
                "opacity": 0.8,
                "side": 2  # DoubleSide
            }
        }
    
    def _convert_sphere(self, occ_data: Dict[str, Any]) -> Dict[str, Any]:
        """转换球体几何体"""
        params = occ_data.get("params", {})
        radius = params.get("radius", 1)
        center = params.get("center", [0, 0, 0])
        
        return {
            "uuid": self._generate_uuid(),
            "type": "SphereGeometry",
            "radius": radius,
            "widthSegments": 32,
            "heightSegments": 32,
            "position": center,
            "material": {
                "uuid": self._generate_uuid(),
                "type": "MeshPhongMaterial",
                "color": 0xcccccc,
                "transparent": True,
                "opacity": 0.8,
                "side": 2  # DoubleSide
            }
        }
    
    def _convert_cone(self, occ_data: Dict[str, Any]) -> Dict[str, Any]:
        """转换圆锥体几何体"""
        params = occ_data.get("params", {})
        radius1 = params.get("radius1", 1)
        radius2 = params.get("radius2", 0)
        height = params.get("height", 1)
        center = params.get("center", [0, 0, 0])
        direction = params.get("direction", [0, 0, 1])
        
        # 计算旋转矩阵，使圆锥体方向与给定方向一致
        quaternion = self._calculate_cylinder_rotation(direction)
        
        return {
            "uuid": self._generate_uuid(),
            "type": "CylinderGeometry", # Three.js使用CylinderGeometry实现圆锥
            "radiusTop": radius2,
            "radiusBottom": radius1,
            "height": height,
            "radialSegments": 32,
            "position": center,
            "quaternion": quaternion,
            "material": {
                "uuid": self._generate_uuid(),
                "type": "MeshPhongMaterial",
                "color": 0xcccccc,
                "transparent": True,
                "opacity": 0.8,
                "side": 2  # DoubleSide
            }
        }
    
    def _convert_nurbs_surface(self, occ_data: Dict[str, Any], detail_level: str) -> Dict[str, Any]:
        """
        转换NURBS曲面几何体
        
        Args:
            occ_data: OCC NURBS数据
            detail_level: 细节级别
            
        Returns:
            转换后的Three.js格式数据
        """
        params = occ_data.get("params", {})
        control_points = params.get("control_points", [])
        u_degree = params.get("u_degree", 3)
        v_degree = params.get("v_degree", 3)
        
        # 根据细节级别设置细分级别
        if detail_level == "low":
            segments = 16
        elif detail_level == "high":
            segments = 64
        else:  # medium
            segments = 32
            
        # 扁平化控制点数组
        points_flat = []
        for u_points in control_points:
            for point in u_points:
                points_flat.extend(point)
        
        u_count = len(control_points)
        v_count = len(control_points[0]) if u_count > 0 else 0
        
        return {
            "uuid": self._generate_uuid(),
            "type": "NURBSSurface",
            "points": points_flat,
            "u_count": u_count,
            "v_count": v_count,
            "u_degree": u_degree,
            "v_degree": v_degree,
            "u_segments": segments,
            "v_segments": segments,
            "material": {
                "uuid": self._generate_uuid(),
                "type": "MeshPhongMaterial",
                "color": 0xcccccc,
                "transparent": True,
                "opacity": 0.8,
                "side": 2  # DoubleSide
            }
        }
    
    def _convert_boolean_result(self, occ_data: Dict[str, Any]) -> Dict[str, Any]:
        """转换布尔操作结果"""
        # 布尔操作目前直接使用STL网格表示
        # 在实际实现中，这里会从OCC中提取布尔操作结果的三角化网格
        return {
            "uuid": self._generate_uuid(),
            "type": "BooleanOperation",
            "operation": occ_data.get("type", "boolean_operation"),
            "shape1": occ_data.get("params", {}).get("shape1_id"),
            "shape2": occ_data.get("params", {}).get("shape2_id"),
            "material": {
                "uuid": self._generate_uuid(),
                "type": "MeshPhongMaterial",
                "color": 0xcccccc,
                "transparent": True,
                "opacity": 0.8,
                "side": 2  # DoubleSide
            }
        }
    
    def _optimize_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        优化数据以提高传输效率
        
        Args:
            data: 要优化的数据
            
        Returns:
            优化后的数据
        """
        # 优化方法1: 移除不必要的属性
        optimized = self._remove_unnecessary_props(data)
        
        # 优化方法2: 数据压缩
        if self.use_compression and ("points" in optimized or "vertices" in optimized):
            optimized = self._compress_numerical_arrays(optimized)
            
        return optimized
    
    def _remove_unnecessary_props(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """移除不必要的属性"""
        # 复制数据避免修改原始数据
        result = data.copy()
        
        # 需要保留的属性列表
        essential_props = {
            "uuid", "type", "width", "height", "depth", "radius", 
            "radiusTop", "radiusBottom", "position", "quaternion", 
            "points", "u_count", "v_count", "u_degree", "v_degree",
            "u_segments", "v_segments", "material", "color", 
            "transparent", "opacity", "side", "vertices", "faces",
            "normals", "uvs"
        }
        
        # 移除非必要属性
        for key in list(result.keys()):
            if key not in essential_props:
                result.pop(key, None)
                
        # 递归处理嵌套字典
        for key, value in result.items():
            if isinstance(value, dict):
                result[key] = self._remove_unnecessary_props(value)
                
        return result
    
    def _compress_numerical_arrays(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """压缩数值数组数据"""
        result = data.copy()
        
        # 需要压缩的数组字段
        array_fields = ["points", "vertices", "normals", "uvs"]
        
        for field in array_fields:
            if field in result and isinstance(result[field], (list, tuple)) and len(result[field]) > 100:
                # 转换为NumPy数组以进行更高效的处理
                arr = np.array(result[field], dtype=np.float32)
                
                # 将数组转换为字节
                arr_bytes = arr.tobytes()
                
                # 压缩字节
                compressed = zlib.compress(arr_bytes, self.compression_level)
                
                # 转换为Base64字符串
                b64_str = base64.b64encode(compressed).decode('ascii')
                
                # 替换原始数据
                result[field] = {
                    "compressed": True,
                    "original_type": "float32",
                    "shape": list(arr.shape),
                    "data": b64_str
                }
                
        return result
    
    def decompress_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        解压缩数据(JS端对应实现)
        
        Args:
            data: 压缩的数据
            
        Returns:
            解压缩后的数据
        """
        result = data.copy()
        
        # 递归处理所有字段
        for key, value in result.items():
            if isinstance(value, dict):
                if "compressed" in value and value["compressed"]:
                    # 解压缩数组数据
                    compressed_data = base64.b64decode(value["data"])
                    decompressed = zlib.decompress(compressed_data)
                    
                    # 将字节转换回数组
                    if value["original_type"] == "float32":
                        arr = np.frombuffer(decompressed, dtype=np.float32)
                        if "shape" in value:
                            arr = arr.reshape(value["shape"])
                        result[key] = arr.tolist()
                else:
                    # 递归处理嵌套字典
                    result[key] = self.decompress_data(value)
                    
        return result
    
    def _calculate_cylinder_rotation(self, direction: List[float]) -> List[float]:
        """
        计算圆柱体的四元数旋转
        使圆柱体方向与给定方向一致
        
        Args:
            direction: 目标方向向量
            
        Returns:
            旋转四元数 [x, y, z, w]
        """
        # 标准化方向向量
        direction_len = sum(d*d for d in direction) ** 0.5
        if direction_len < 1e-6:
            return [0, 0, 0, 1]  # 单位四元数
            
        dx, dy, dz = [d/direction_len for d in direction]
        
        # Three.js中圆柱体默认沿Y轴方向
        # 我们需要计算从Y轴到目标方向的旋转
        default_dir = [0, 1, 0]
        
        # 计算旋转轴(叉积)
        axis_x = default_dir[1] * dz - default_dir[2] * dy
        axis_y = default_dir[2] * dx - default_dir[0] * dz
        axis_z = default_dir[0] * dy - default_dir[1] * dx
        
        # 标准化旋转轴
        axis_len = (axis_x**2 + axis_y**2 + axis_z**2) ** 0.5
        
        # 如果旋转轴接近于零，则方向与默认方向平行或反平行
        if axis_len < 1e-6:
            # 检查是否反平行
            if default_dir[1] * dy < 0:  # Y分量相反
                return [1, 0, 0, 0]  # 绕X轴旋转180度
            else:
                return [0, 0, 0, 1]  # 无需旋转
        
        # 标准化旋转轴
        axis_x /= axis_len
        axis_y /= axis_len
        axis_z /= axis_len
        
        # 计算旋转角度(点积)
        angle = np.arccos(np.clip(default_dir[0]*dx + default_dir[1]*dy + default_dir[2]*dz, -1.0, 1.0))
        
        # 计算四元数
        half_angle = angle / 2
        s = np.sin(half_angle)
        
        qx = axis_x * s
        qy = axis_y * s
        qz = axis_z * s
        qw = np.cos(half_angle)
        
        return [qx, qy, qz, qw]
    
    def _generate_uuid(self) -> str:
        """生成唯一ID"""
        import uuid
        return str(uuid.uuid4())
    
    def create_three_scene(self, shapes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        创建完整的Three.js场景数据
        
        Args:
            shapes: 形状列表
            
        Returns:
            完整的Three.js场景数据
        """
        # 创建材质和几何体数组
        geometries = []
        materials = []
        objects = []
        
        # 处理每个形状
        for shape in shapes:
            # 提取材质
            if "material" in shape:
                materials.append(shape["material"])
                material_uuid = shape["material"]["uuid"]
                del shape["material"]
            else:
                material_uuid = None
            
            # 复制几何体数据(移除位置等属性)
            geometry = {k: v for k, v in shape.items() if k not in ["position", "quaternion", "scale"]}
            geometries.append(geometry)
            
            # 创建网格对象
            mesh = {
                "uuid": self._generate_uuid(),
                "type": "Mesh",
                "geometry": shape["uuid"],
                "material": material_uuid,
                "position": shape.get("position", [0, 0, 0]),
                "quaternion": shape.get("quaternion", [0, 0, 0, 1]),
                "scale": shape.get("scale", [1, 1, 1])
            }
            
            objects.append(mesh)
        
        # 创建场景
        scene = {
            "metadata": {
                "version": 4.5,
                "type": "Object",
                "generator": "DataConverter"
            },
            "geometries": geometries,
            "materials": materials,
            "object": {
                "uuid": "scene",
                "type": "Scene",
                "children": objects
            }
        }
        
        return scene
    
    def export_scene_json(self, scene: Dict[str, Any], filepath: str) -> bool:
        """
        导出场景为JSON文件
        
        Args:
            scene: 场景数据
            filepath: 输出文件路径
            
        Returns:
            是否成功导出
        """
        try:
            with open(filepath, 'w') as f:
                json.dump(scene, f)
            return True
        except Exception as e:
            print(f"导出场景失败: {e}")
            return False
    
    def generate_js_loader(self, output_path: str) -> bool:
        """
        生成JavaScript解压缩加载器
        
        Args:
            output_path: 输出文件路径
            
        Returns:
            是否成功生成
        """
        js_code = """
        /**
         * 深基坑CAE数据加载器
         * 用于加载和解压缩从Python后端传来的数据
         */
        class DeepExcavationLoader {
            /**
             * 构造函数
             */
            constructor() {
                this.cache = {};
            }
            
            /**
             * 加载场景数据
             * @param {string|object} data - JSON数据或URL
             * @param {function} onLoad - 加载完成回调
             * @param {function} onProgress - 加载进度回调
             * @param {function} onError - 错误回调
             */
            load(data, onLoad, onProgress, onError) {
                let processData = (jsonData) => {
                    try {
                        // 解压缩数据
                        const decompressedData = this.decompressData(jsonData);
                        
                        // 创建Three.js对象
                        const result = this.createThreeObjects(decompressedData);
                        
                        // 调用完成回调
                        if (onLoad) onLoad(result);
                    } catch (error) {
                        console.error("处理数据时出错:", error);
                        if (onError) onError(error);
                    }
                };
                
                // 检查数据类型
                if (typeof data === 'string') {
                    // URL - 加载JSON文件
                    fetch(data)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`HTTP错误 ${response.status}`);
                            }
                            return response.json();
                        })
                        .then(jsonData => {
                            processData(jsonData);
                        })
                        .catch(error => {
                            console.error("加载数据时出错:", error);
                            if (onError) onError(error);
                        });
                } else if (typeof data === 'object') {
                    // 直接处理JSON对象
                    processData(data);
                } else {
                    const error = new Error("不支持的数据类型");
                    console.error(error);
                    if (onError) onError(error);
                }
            }
            
            /**
             * 解压缩数据
             * @param {object} data - 压缩的数据
             * @returns {object} 解压缩的数据
             */
            decompressData(data) {
                // 复制数据以避免修改原始数据
                const result = JSON.parse(JSON.stringify(data));
                
                // 递归处理所有字段
                const processObject = (obj) => {
                    for (const key in obj) {
                        if (obj[key] && typeof obj[key] === 'object') {
                            if (obj[key].compressed === true) {
                                // 解压缩数组数据
                                obj[key] = this.decompressArray(obj[key]);
                            } else {
                                // 递归处理嵌套对象
                                processObject(obj[key]);
                            }
                        }
                    }
                    return obj;
                };
                
                return processObject(result);
            }
            
            /**
             * 解压缩数组数据
             * @param {object} compressedData - 压缩的数组数据
             * @returns {Array} 解压缩的数组
             */
            decompressArray(compressedData) {
                try {
                    // 解码Base64
                    const binaryString = atob(compressedData.data);
                    
                    // 创建Uint8Array
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    
                    // 使用pako解压缩
                    const decompressedBytes = pako.inflate(bytes);
                    
                    // 转换为浮点数组
                    let result;
                    if (compressedData.original_type === 'float32') {
                        result = new Float32Array(decompressedBytes.buffer);
                    } else {
                        throw new Error(`不支持的数据类型: ${compressedData.original_type}`);
                    }
                    
                    // 将TypedArray转换为标准数组
                    const array = Array.from(result);
                    
                    // 如果有形状信息，重塑数组
                    if (compressedData.shape && compressedData.shape.length > 1) {
                        return this.reshapeArray(array, compressedData.shape);
                    }
                    
                    return array;
                } catch (error) {
                    console.error("解压缩数组时出错:", error);
                    return [];
                }
            }
            
            /**
             * 重塑一维数组为多维数组
             * @param {Array} array - 一维数组
             * @param {Array} shape - 形状数组
             * @returns {Array} 多维数组
             */
            reshapeArray(array, shape) {
                if (shape.length === 1) {
                    return array;
                }
                
                const result = [];
                const size = shape[1];
                
                for (let i = 0; i < array.length; i += size) {
                    result.push(array.slice(i, i + size));
                }
                
                return result;
            }
            
            /**
             * 创建Three.js对象
             * @param {object} data - 解压缩的数据
             * @returns {object} Three.js对象
             */
            createThreeObjects(data) {
                // 这里实现具体的Three.js对象创建逻辑
                // 这部分通常会由Three.js的ObjectLoader处理
                return data;
            }
        }
        
        // 导出
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = DeepExcavationLoader;
        } else {
            window.DeepExcavationLoader = DeepExcavationLoader;
        }
        """
        
        try:
            with open(output_path, 'w') as f:
                f.write(js_code)
            return True
        except Exception as e:
            print(f"生成JavaScript加载器失败: {e}")
            return False

# 用法示例
if __name__ == "__main__":
    # 创建转换器
    converter = DataConverter(use_compression=True, compression_level=6)
    
    # 示例OCC数据
    occ_box = {
        "id": 1,
        "type": "box",
        "params": {
            "width": 10,
            "length": 20,
            "height": 30,
            "center": [0, 0, 0]
        }
    }
    
    # 转换为Three.js格式
    threejs_data = converter.occ_to_threejs(occ_box)
    
    # 创建完整场景
    scene = converter.create_three_scene([threejs_data])
    
    # 导出为JSON
    converter.export_scene_json(scene, "test_scene.json")
    
    # 生成JavaScript加载器
    converter.generate_js_loader("deep_excavation_loader.js")
    
    print("示例执行完成") 