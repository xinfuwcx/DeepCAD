"""
@file optimized_mesh_converter.py
@description 优化的网格转换器，用于高效转换OCC几何体为Three.js可用的高性能网格
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import numpy as np
import time
import json
import zlib
import base64
from typing import Dict, List, Any, Optional, Union, Tuple
import multiprocessing
from concurrent.futures import ThreadPoolExecutor

# 尝试导入OCC库
try:
    from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh
    from OCC.Core.TopoDS import TopoDS_Shape
    from OCC.Core.TopExp import TopExp_Explorer
    from OCC.Core.TopAbs import TopAbs_FACE
    from OCC.Core.BRep import BRep_Tool
    from OCC.Core.BRepAdaptor import BRepAdaptor_Surface
    from OCC.Core.TopLoc import TopLoc_Location
    from OCC.Core.Poly import Poly_Triangulation
    from OCC.Core.gp import gp_Pnt
    from OCC.Core.StlAPI import StlAPI_Writer
    from OCC.Core.BRepTools import breptools_Write
    from OCC.Core.Graphic3d import Graphic3d_Vec3d
    
    HAS_OCC = True
except ImportError:
    HAS_OCC = False
    print("Warning: OpenCascade Core (OCC) not available")

class OptimizedMeshConverter:
    """优化的网格转换器，用于高效转换OCC几何体为Three.js可用的高性能网格"""
    
    def __init__(self, 
                use_compression: bool = True, 
                compression_level: int = 6,
                use_multithreading: bool = True,
                max_workers: Optional[int] = None,
                mesh_quality: float = 1.0):
        """
        初始化转换器
        
        Args:
            use_compression: 是否使用压缩
            compression_level: 压缩级别(1-9)
            use_multithreading: 是否使用多线程处理
            max_workers: 最大工作线程数，None表示使用CPU核心数
            mesh_quality: 网格质量系数(0.1-10.0)，越大质量越高但处理越慢
        """
        self.use_compression = use_compression
        self.compression_level = min(max(compression_level, 1), 9)
        self.use_multithreading = use_multithreading
        self.max_workers = max_workers if max_workers else min(32, multiprocessing.cpu_count() + 4)
        self.mesh_quality = min(max(mesh_quality, 0.1), 10.0)
        self.cache = {}  # 缓存已转换的数据
        
    def shape_to_threejs(self, 
                        shape: Any, 
                        shape_id: str,
                        detail_level: str = "medium",
                        generate_normals: bool = True,
                        generate_uvs: bool = True) -> Dict[str, Any]:
        """
        将OCC形状转换为Three.js格式的网格数据
        
        Args:
            shape: OCC形状对象
            shape_id: 形状ID
            detail_level: 细节级别，可选"low", "medium", "high"
            generate_normals: 是否生成法线
            generate_uvs: 是否生成UV坐标
            
        Returns:
            包含顶点、索引、法线和UV的Three.js格式网格数据
        """
        if not HAS_OCC:
            return self._generate_fallback_mesh(shape_id)
        
        # 检查缓存
        cache_key = f"{shape_id}_{detail_level}_{generate_normals}_{generate_uvs}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # 设置网格细节级别
        linear_deflection = 0.1  # 默认值
        if detail_level == "low":
            linear_deflection = 0.2
        elif detail_level == "medium":
            linear_deflection = 0.1
        elif detail_level == "high":
            linear_deflection = 0.05
            
        # 调整网格质量
        linear_deflection /= self.mesh_quality
        angular_deflection = 0.5  # 弧度
        
        try:
            # 进行网格剖分
            mesh = BRepMesh_IncrementalMesh(shape, linear_deflection, False, angular_deflection)
            mesh.Perform()
            
            # 收集所有的三角形面
            vertices = []
            indices = []
            normals = []
            uvs = []
            
            # 如果启用多线程，则使用并行处理
            if self.use_multithreading:
                result = self._process_shape_parallel(shape, generate_normals, generate_uvs)
                vertices = result["vertices"]
                indices = result["indices"]
                normals = result["normals"] if generate_normals else []
                uvs = result["uvs"] if generate_uvs else []
            else:
                result = self._process_shape_sequential(shape, generate_normals, generate_uvs)
                vertices = result["vertices"]
                indices = result["indices"]
                normals = result["normals"] if generate_normals else []
                uvs = result["uvs"] if generate_uvs else []
            
            # 创建结果
            result = {
                "type": "BufferGeometry",
                "uuid": shape_id,
                "vertices": vertices,
                "indices": indices
            }
            
            if generate_normals and normals:
                result["normals"] = normals
                
            if generate_uvs and uvs:
                result["uvs"] = uvs
                
            # 压缩数据
            if self.use_compression:
                result = self._compress_mesh_data(result)
                
            # 缓存结果
            self.cache[cache_key] = result
            
            return result
        except Exception as e:
            print(f"Error converting shape to mesh: {e}")
            return self._generate_fallback_mesh(shape_id)
            
    def _process_shape_sequential(self, 
                                shape: Any, 
                                generate_normals: bool,
                                generate_uvs: bool) -> Dict[str, List[float]]:
        """顺序处理形状的所有面"""
        vertices = []
        indices = []
        normals = []
        uvs = []
        vertex_count = 0
        
        # 遍历所有面
        explorer = TopExp_Explorer(shape, TopAbs_FACE)
        while explorer.More():
            face = explorer.Current()
            
            # 处理单个面
            face_result = self._process_face(face, generate_normals, generate_uvs)
            
            # 合并数据，调整索引
            if face_result["vertices"]:
                vertices.extend(face_result["vertices"])
                
                # 调整索引
                face_indices = face_result["indices"]
                for idx in face_indices:
                    indices.append(idx + vertex_count)
                
                vertex_count += len(face_result["vertices"]) // 3
                
                if generate_normals:
                    normals.extend(face_result["normals"])
                    
                if generate_uvs:
                    uvs.extend(face_result["uvs"])
            
            explorer.Next()
            
        return {
            "vertices": vertices,
            "indices": indices,
            "normals": normals,
            "uvs": uvs
        }
        
    def _process_shape_parallel(self, 
                              shape: Any, 
                              generate_normals: bool,
                              generate_uvs: bool) -> Dict[str, List[float]]:
        """并行处理形状的所有面"""
        # 收集所有面
        faces = []
        explorer = TopExp_Explorer(shape, TopAbs_FACE)
        while explorer.More():
            faces.append(explorer.Current())
            explorer.Next()
            
        # 使用线程池并行处理
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            face_results = list(executor.map(
                lambda face: self._process_face(face, generate_normals, generate_uvs),
                faces
            ))
        
        # 合并结果
        vertices = []
        indices = []
        normals = []
        uvs = []
        vertex_count = 0
        
        for face_result in face_results:
            if face_result["vertices"]:
                vertices.extend(face_result["vertices"])
                
                # 调整索引
                face_indices = face_result["indices"]
                for idx in face_indices:
                    indices.append(idx + vertex_count)
                
                vertex_count += len(face_result["vertices"]) // 3
                
                if generate_normals:
                    normals.extend(face_result["normals"])
                    
                if generate_uvs:
                    uvs.extend(face_result["uvs"])
        
        return {
            "vertices": vertices,
            "indices": indices,
            "normals": normals,
            "uvs": uvs
        }
    
    def _process_face(self, 
                     face: Any, 
                     generate_normals: bool,
                     generate_uvs: bool) -> Dict[str, List[float]]:
        """处理单个面，提取三角形数据"""
        vertices = []
        indices = []
        normals = []
        uvs = []
        
        try:
            location = TopLoc_Location()
            
            # 获取面的三角剖分
            triangulation = BRep_Tool.Triangulation(face, location)
            
            if triangulation is None:
                return {"vertices": [], "indices": [], "normals": [], "uvs": []}
                
            # 获取变换矩阵
            transform = location.Transformation()
            
            # 提取顶点
            for i in range(1, triangulation.NbNodes() + 1):
                pnt = triangulation.Node(i)
                
                # 应用变换
                pnt_transformed = pnt.Transformed(transform)
                
                vertices.extend([pnt_transformed.X(), pnt_transformed.Y(), pnt_transformed.Z()])
                
                # 生成基本UV坐标(参数化)
                if generate_uvs:
                    if triangulation.HasUVNodes():
                        uv = triangulation.UVNode(i)
                        uvs.extend([uv.X(), uv.Y()])
                    else:
                        # 简单的平面投影UV
                        uvs.extend([pnt_transformed.X() / 10.0, pnt_transformed.Z() / 10.0])
            
            # 提取三角形索引
            orientation = face.Orientation()
            for i in range(1, triangulation.NbTriangles() + 1):
                triangle = triangulation.Triangle(i)
                
                # 获取三角形的三个顶点索引
                n1, n2, n3 = triangle.Get()
                
                # 考虑面的方向
                if orientation:
                    indices.extend([n1 - 1, n2 - 1, n3 - 1])
                else:
                    indices.extend([n1 - 1, n3 - 1, n2 - 1])
            
            # 生成法线
            if generate_normals:
                # 如果三角剖分包含法线，直接使用
                if triangulation.HasNormals():
                    for i in range(1, triangulation.NbNodes() + 1):
                        normal = Graphic3d_Vec3d()
                        triangulation.Normal(i, normal)
                        normals.extend([normal.x(), normal.y(), normal.z()])
                else:
                    # 计算面的法线
                    face_surface = BRepAdaptor_Surface(face)
                    
                    # 简化：使用每个三角形的法线作为顶点法线
                    # 这里可以进一步优化计算更精确的顶点法线
                    self._calculate_vertex_normals(vertices, indices, normals)
            
            return {
                "vertices": vertices,
                "indices": indices,
                "normals": normals,
                "uvs": uvs
            }
        except Exception as e:
            print(f"Error processing face: {e}")
            return {"vertices": [], "indices": [], "normals": [], "uvs": []}
    
    def _calculate_vertex_normals(self, 
                                vertices: List[float], 
                                indices: List[int],
                                normals: List[float]):
        """计算顶点法线"""
        # 初始化法线数组
        normal_sums = [np.array([0.0, 0.0, 0.0]) for _ in range(len(vertices) // 3)]
        normal_counts = [0 for _ in range(len(vertices) // 3)]
        
        # 计算每个三角形的法线，并累加到顶点
        for i in range(0, len(indices), 3):
            if i + 2 >= len(indices):
                break
                
            idx1, idx2, idx3 = indices[i], indices[i+1], indices[i+2]
            
            # 获取三角形的三个顶点
            v1 = np.array([vertices[idx1*3], vertices[idx1*3+1], vertices[idx1*3+2]])
            v2 = np.array([vertices[idx2*3], vertices[idx2*3+1], vertices[idx2*3+2]])
            v3 = np.array([vertices[idx3*3], vertices[idx3*3+1], vertices[idx3*3+2]])
            
            # 计算三角形的法线
            edge1 = v2 - v1
            edge2 = v3 - v1
            normal = np.cross(edge1, edge2)
            
            # 归一化
            length = np.linalg.norm(normal)
            if length > 0:
                normal = normal / length
            
            # 累加到顶点
            normal_sums[idx1] += normal
            normal_sums[idx2] += normal
            normal_sums[idx3] += normal
            
            normal_counts[idx1] += 1
            normal_counts[idx2] += 1
            normal_counts[idx3] += 1
        
        # 计算平均法线并添加到结果
        for i, (normal_sum, count) in enumerate(zip(normal_sums, normal_counts)):
            if count > 0:
                avg_normal = normal_sum / count
                length = np.linalg.norm(avg_normal)
                if length > 0:
                    avg_normal = avg_normal / length
                normals.extend([avg_normal[0], avg_normal[1], avg_normal[2]])
            else:
                normals.extend([0.0, 1.0, 0.0])  # 默认向上的法线
    
    def _compress_mesh_data(self, mesh_data: Dict[str, Any]) -> Dict[str, Any]:
        """压缩网格数据"""
        result = mesh_data.copy()
        
        # 待压缩的数组字段
        array_fields = ["vertices", "indices", "normals", "uvs"]
        
        for field in array_fields:
            if field in result and isinstance(result[field], list) and len(result[field]) > 100:
                # 转换为NumPy数组
                if field == "indices":
                    # 索引通常是整数
                    arr = np.array(result[field], dtype=np.uint32)
                else:
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
                    "original_type": "uint32" if field == "indices" else "float32",
                    "length": len(result[field]),
                    "data": b64_str
                }
        
        return result
    
    def _generate_fallback_mesh(self, shape_id: str) -> Dict[str, Any]:
        """生成备用网格(用于OCC不可用时)"""
        # 创建一个简单的立方体
        vertices = [
            -1, -1, -1,  1, -1, -1,  1, 1, -1,  -1, 1, -1,
            -1, -1, 1,   1, -1, 1,   1, 1, 1,   -1, 1, 1
        ]
        
        indices = [
            0, 1, 2, 0, 2, 3,  # 前面
            4, 5, 6, 4, 6, 7,  # 后面
            0, 4, 7, 0, 7, 3,  # 左面
            1, 5, 6, 1, 6, 2,  # 右面
            0, 1, 5, 0, 5, 4,  # 底面
            3, 2, 6, 3, 6, 7   # 顶面
        ]
        
        normals = [
            0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
            0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,
            -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,
            1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,
            0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
            0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0
        ]
        
        uvs = [
            0, 0,  1, 0,  1, 1,  0, 1,
            0, 0,  1, 0,  1, 1,  0, 1
        ]
        
        result = {
            "type": "BufferGeometry",
            "uuid": shape_id,
            "vertices": vertices,
            "indices": indices,
            "normals": normals,
            "uvs": uvs
        }
        
        # 压缩数据
        if self.use_compression:
            result = self._compress_mesh_data(result)
            
        return result
    
    def generate_js_decompressor(self, output_path: str) -> bool:
        """
        生成JavaScript解压缩脚本
        
        Args:
            output_path: 输出文件路径
            
        Returns:
            是否成功生成
        """
        js_code = """
        /**
         * 深基坑CAE系统 - 优化网格加载器
         * 用于加载和解压缩从Python后端传来的网格数据
         */
        class OptimizedMeshLoader {
            /**
             * 构造函数
             */
            constructor() {
                this.cache = {};
            }
            
            /**
             * 解压缩网格数据
             * @param {Object} compressedData - 压缩的网格数据
             * @returns {Object} 解压缩的Three.js几何体
             */
            decompressMesh(compressedData) {
                // 缓存检查
                const cacheKey = compressedData.uuid;
                if (this.cache[cacheKey]) {
                    return this.cache[cacheKey];
                }
                
                try {
                    // 创建BufferGeometry
                    const geometry = new THREE.BufferGeometry();
                    
                    // 解压缩顶点
                    if (compressedData.vertices) {
                        const vertices = this._decompressArray(compressedData.vertices, 'float32');
                        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
                    }
                    
                    // 解压缩索引
                    if (compressedData.indices) {
                        const indices = this._decompressArray(compressedData.indices, 'uint32');
                        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
                    }
                    
                    // 解压缩法线
                    if (compressedData.normals) {
                        const normals = this._decompressArray(compressedData.normals, 'float32');
                        geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
                    }
                    
                    // 解压缩UV
                    if (compressedData.uvs) {
                        const uvs = this._decompressArray(compressedData.uvs, 'float32');
                        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
                    }
                    
                    // 计算边界框
                    geometry.computeBoundingSphere();
                    geometry.computeBoundingBox();
                    
                    // 缓存几何体
                    this.cache[cacheKey] = geometry;
                    
                    return geometry;
                } catch (error) {
                    console.error("解压缩网格数据出错:", error);
                    
                    // 返回默认几何体
                    const fallbackGeometry = new THREE.BoxGeometry(1, 1, 1);
                    return fallbackGeometry;
                }
            }
            
            /**
             * 解压缩数组数据
             * @param {Object|Array} arrayData - 压缩的数组数据或原始数组
             * @param {string} defaultType - 默认数据类型
             * @returns {TypedArray} 解压缩的类型化数组
             */
            _decompressArray(arrayData, defaultType = 'float32') {
                // 已经是数组则直接转换
                if (Array.isArray(arrayData)) {
                    if (defaultType === 'float32') {
                        return new Float32Array(arrayData);
                    } else if (defaultType === 'uint32') {
                        return new Uint32Array(arrayData);
                    }
                    return new Float32Array(arrayData);
                }
                
                // 检查是否是压缩对象
                if (arrayData.compressed) {
                    try {
                        // 解码Base64
                        const binaryString = atob(arrayData.data);
                        
                        // 创建Uint8Array
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        
                        // 使用pako解压缩
                        const decompressedBytes = pako.inflate(bytes);
                        
                        // 转换为适当的类型化数组
                        if (arrayData.original_type === 'float32') {
                            return new Float32Array(decompressedBytes.buffer);
                        } else if (arrayData.original_type === 'uint32') {
                            return new Uint32Array(decompressedBytes.buffer);
                        } else {
                            console.warn(`未知数据类型: ${arrayData.original_type}，使用默认类型`);
                            return defaultType === 'float32' ? 
                                new Float32Array(decompressedBytes.buffer) : 
                                new Uint32Array(decompressedBytes.buffer);
                        }
                    } catch (error) {
                        console.error("解压缩数组出错:", error);
                        return defaultType === 'float32' ? new Float32Array() : new Uint32Array();
                    }
                }
                
                // 未压缩直接返回
                return arrayData;
            }
            
            /**
             * 加载网格数据
             * @param {string|Object} source - JSON数据或URL
             * @param {Function} onLoad - 加载完成回调
             * @param {Function} onProgress - 加载进度回调
             * @param {Function} onError - 错误回调
             */
            load(source, onLoad, onProgress, onError) {
                const processData = (data) => {
                    try {
                        const geometry = this.decompressMesh(data);
                        if (onLoad) onLoad(geometry);
                    } catch (error) {
                        console.error("处理网格数据出错:", error);
                        if (onError) onError(error);
                    }
                };
                
                // 检查数据类型
                if (typeof source === 'string') {
                    // URL - 加载JSON文件
                    fetch(source)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`HTTP错误: ${response.status}`);
                            }
                            return response.json();
                        })
                        .then(data => {
                            processData(data);
                        })
                        .catch(error => {
                            console.error("加载数据出错:", error);
                            if (onError) onError(error);
                        });
                } else if (typeof source === 'object') {
                    // 直接处理对象
                    processData(source);
                } else {
                    const error = new Error("不支持的数据类型");
                    console.error(error);
                    if (onError) onError(error);
                }
            }
            
            /**
             * 清除缓存
             */
            clearCache() {
                this.cache = {};
            }
        }
        
        // 导出
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = OptimizedMeshLoader;
        } else {
            window.OptimizedMeshLoader = OptimizedMeshLoader;
        }
        """
        
        try:
            with open(output_path, 'w') as f:
                f.write(js_code)
            return True
        except Exception as e:
            print(f"生成JavaScript解压缩脚本失败: {e}")
            return False

# 示例用法
if __name__ == "__main__":
    # 创建转换器
    converter = OptimizedMeshConverter(
        use_compression=True,
        compression_level=6,
        use_multithreading=True,
        mesh_quality=1.0
    )
    
    # 测试生成JavaScript解压缩脚本
    converter.generate_js_decompressor("optimized_mesh_loader.js")
    
    # 如果OCC可用，还可以进行测试转换
    if HAS_OCC:
        from OCC.Core.BRepPrimAPI import BRepPrimAPI_MakeBox
        from OCC.Core.gp import gp_Pnt
        
        # 创建一个测试盒体
        box = BRepPrimAPI_MakeBox(gp_Pnt(-1, -1, -1), 2, 2, 2).Shape()
        
        # 转换为Three.js格式
        mesh_data = converter.shape_to_threejs(box, "test_box")
        
        # 输出结果
        with open("test_mesh.json", "w") as f:
            json.dump(mesh_data, f)
        
        print("测试完成，结果保存为test_mesh.json")
    else:
        print("OCC不可用，无法进行转换测试") 