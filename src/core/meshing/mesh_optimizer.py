# 网格优化模块
# 用于优化有限元分析的网格质量

import numpy as np
import logging
from typing import Dict, List, Optional, Union, Tuple, Any

logger = logging.getLogger(__name__)

class MeshOptimizer:
    """网格优化器类"""
    
    def __init__(self):
        """初始化网格优化器"""
        logger.info('初始化网格优化器')
        self.mesh = None
        self.quality_metrics = {}
        self.optimization_history = []
    
    def load_mesh(self, mesh_data: Dict[str, Any]) -> bool:
        """
        加载网格数据
        
        Args:
            mesh_data: 包含节点和单元信息的字典
            
        Returns:
            是否成功加载
        """
        try:
            logger.info("正在加载网格数据...")
            self.mesh = mesh_data
            self.quality_metrics = {}  # 清空质量度量
            logger.info(f"成功加载网格，节点数: {len(mesh_data.get('nodes', []))}，单元数: {len(mesh_data.get('elements', []))}")
            return True
        except Exception as e:
            logger.error(f"加载网格数据出错: {str(e)}")
            return False
    
    def analyze_mesh_quality(self) -> Dict[str, Dict[str, float]]:
        """
        分析网格质量
        
        Returns:
            包含各种质量指标的字典
        """
        if not self.mesh:
            logger.error("未加载网格数据，无法分析质量")
            return {}
        
        try:
            logger.info("正在分析网格质量...")
            
            # 获取网格数据
            nodes = self.mesh.get('nodes', [])
            elements = self.mesh.get('elements', [])
            
            # 质量指标字典
            quality_metrics = {
                'aspect_ratio': {'min': float('inf'), 'max': 0, 'avg': 0, 'std': 0},
                'skewness': {'min': float('inf'), 'max': 0, 'avg': 0, 'std': 0},
                'orthogonal_quality': {'min': float('inf'), 'max': 0, 'avg': 0, 'std': 0},
                'jacobian': {'min': float('inf'), 'max': 0, 'avg': 0, 'std': 0}
            }
            
            # 各单元的质量指标
            element_metrics = {
                'aspect_ratio': [],
                'skewness': [],
                'orthogonal_quality': [],
                'jacobian': []
            }
            
            # 遍历所有单元计算质量指标
            for element in elements:
                # 获取单元节点
                element_nodes = [nodes[node_id - 1] for node_id in element['connectivity']]
                
                # 计算各种质量指标
                aspect_ratio = self._calculate_aspect_ratio(element_nodes)
                skewness = self._calculate_skewness(element_nodes)
                orthogonal_quality = self._calculate_orthogonal_quality(element_nodes)
                jacobian = self._calculate_jacobian(element_nodes)
                
                # 更新最大最小值
                quality_metrics['aspect_ratio']['min'] = min(quality_metrics['aspect_ratio']['min'], aspect_ratio)
                quality_metrics['aspect_ratio']['max'] = max(quality_metrics['aspect_ratio']['max'], aspect_ratio)
                quality_metrics['skewness']['min'] = min(quality_metrics['skewness']['min'], skewness)
                quality_metrics['skewness']['max'] = max(quality_metrics['skewness']['max'], skewness)
                quality_metrics['orthogonal_quality']['min'] = min(quality_metrics['orthogonal_quality']['min'], orthogonal_quality)
                quality_metrics['orthogonal_quality']['max'] = max(quality_metrics['orthogonal_quality']['max'], orthogonal_quality)
                quality_metrics['jacobian']['min'] = min(quality_metrics['jacobian']['min'], jacobian)
                quality_metrics['jacobian']['max'] = max(quality_metrics['jacobian']['max'], jacobian)
                
                # 添加到列表中
                element_metrics['aspect_ratio'].append(aspect_ratio)
                element_metrics['skewness'].append(skewness)
                element_metrics['orthogonal_quality'].append(orthogonal_quality)
                element_metrics['jacobian'].append(jacobian)
            
            # 计算平均值和标准差
            for metric_name in quality_metrics:
                if element_metrics[metric_name]:
                    values = np.array(element_metrics[metric_name])
                    quality_metrics[metric_name]['avg'] = float(np.mean(values))
                    quality_metrics[metric_name]['std'] = float(np.std(values))
            
            # 存储质量指标
            self.quality_metrics = quality_metrics
            
            logger.info(f"网格质量分析完成: 最小雅可比值={quality_metrics['jacobian']['min']:.4f}, 最大纵横比={quality_metrics['aspect_ratio']['max']:.4f}")
            return quality_metrics
            
        except Exception as e:
            logger.error(f"分析网格质量出错: {str(e)}")
            return {}
    
    def _calculate_aspect_ratio(self, nodes: List[List[float]]) -> float:
        """
        计算单元的纵横比
        
        Args:
            nodes: 单元节点坐标列表
            
        Returns:
            纵横比值
        """
        # 简化计算，针对四面体单元
        if len(nodes) == 4:  # 四面体单元
            # 计算各边长
            edges = []
            for i in range(4):
                for j in range(i + 1, 4):
                    edge = np.sqrt(sum((nodes[i][k] - nodes[j][k]) ** 2 for k in range(3)))
                    edges.append(edge)
            
            # 计算纵横比 (最长边/最短边)
            if min(edges) > 0:
                return max(edges) / min(edges)
            else:
                return float('inf')
                
        elif len(nodes) == 8:  # 六面体单元
            # 计算各边长
            edges = []
            # 定义六面体的12条边
            edge_indices = [
                (0, 1), (1, 2), (2, 3), (3, 0),  # 底面
                (4, 5), (5, 6), (6, 7), (7, 4),  # 顶面
                (0, 4), (1, 5), (2, 6), (3, 7)   # 连接边
            ]
            
            for i, j in edge_indices:
                edge = np.sqrt(sum((nodes[i][k] - nodes[j][k]) ** 2 for k in range(3)))
                edges.append(edge)
            
            # 计算纵横比 (最长边/最短边)
            if min(edges) > 0:
                return max(edges) / min(edges)
            else:
                return float('inf')
        else:
            # 其他类型单元，返回保守估计
            return 1.0
    
    def _calculate_skewness(self, nodes: List[List[float]]) -> float:
        """
        计算单元的倾斜度
        
        Args:
            nodes: 单元节点坐标列表
            
        Returns:
            倾斜度值 (0最佳，1最差)
        """
        # 简化版，针对三角形或四面体单元
        if len(nodes) == 4:  # 四面体
            # 计算实际体积
            v1 = np.array(nodes[1]) - np.array(nodes[0])
            v2 = np.array(nodes[2]) - np.array(nodes[0])
            v3 = np.array(nodes[3]) - np.array(nodes[0])
            volume = abs(np.dot(np.cross(v1, v2), v3)) / 6.0
            
            # 计算理想四面体体积
            # 使用边长计算等边四面体的体积
            edges = []
            for i in range(4):
                for j in range(i + 1, 4):
                    edge = np.sqrt(sum((nodes[i][k] - nodes[j][k]) ** 2 for k in range(3)))
                    edges.append(edge)
            avg_edge = np.mean(edges)
            equilateral_volume = (np.sqrt(2) / 12.0) * avg_edge ** 3
            
            # 计算倾斜度
            if equilateral_volume > 0 and volume > 0:
                return max(0, min(1, 1 - (volume / equilateral_volume)))
            else:
                return 1.0  # 最差情况
        else:
            # 其他类型单元，返回保守估计
            return 0.5
    
    def _calculate_orthogonal_quality(self, nodes: List[List[float]]) -> float:
        """
        计算单元的正交质量
        
        Args:
            nodes: 单元节点坐标列表
            
        Returns:
            正交质量值 (1最佳，0最差)
        """
        # 简化版，此处给出估计值
        # 实际实现需要计算单元面法向量与相邻单元中心连线的夹角余弦
        if len(nodes) == 4:  # 四面体
            # 计算四个面的法向量
            faces = [
                [nodes[0], nodes[1], nodes[2]],
                [nodes[0], nodes[1], nodes[3]],
                [nodes[0], nodes[2], nodes[3]],
                [nodes[1], nodes[2], nodes[3]]
            ]
            
            min_quality = 1.0
            for face in faces:
                # 计算面法向量
                v1 = np.array(face[1]) - np.array(face[0])
                v2 = np.array(face[2]) - np.array(face[0])
                normal = np.cross(v1, v2)
                
                # 计算质心
                centroid = np.mean(face, axis=0)
                
                # 计算从质心到对面顶点的向量
                for node in nodes:
                    if node not in face:
                        opposite_vector = np.array(node) - centroid
                        break
                        
                # 计算点积和模长
                dot_product = np.dot(normal, opposite_vector)
                normal_magnitude = np.linalg.norm(normal)
                vector_magnitude = np.linalg.norm(opposite_vector)
                
                # 计算正交质量
                if normal_magnitude > 0 and vector_magnitude > 0:
                    quality = abs(dot_product) / (normal_magnitude * vector_magnitude)
                    min_quality = min(min_quality, quality)
            
            return min_quality
        else:
            # 其他类型单元，返回保守估计
            return 0.8
    
    def _calculate_jacobian(self, nodes: List[List[float]]) -> float:
        """
        计算单元的雅可比值
        
        Args:
            nodes: 单元节点坐标列表
            
        Returns:
            雅可比值 (大于0表示有效单元)
        """
        # 简化版，针对四面体单元
        if len(nodes) == 4:  # 四面体
            # 计算雅可比矩阵
            v1 = np.array(nodes[1]) - np.array(nodes[0])
            v2 = np.array(nodes[2]) - np.array(nodes[0])
            v3 = np.array(nodes[3]) - np.array(nodes[0])
            
            # 计算行列式（雅可比值）
            jacobian = np.dot(np.cross(v1, v2), v3)
            return jacobian
        else:
            # 其他类型单元，返回保守估计
            return 1.0
    
    def identify_poor_quality_elements(self, threshold_dict: Dict[str, float] = None) -> Dict[str, List[int]]:
        """
        识别质量较差的单元
        
        Args:
            threshold_dict: 质量阈值字典，如{'aspect_ratio': 10.0, 'skewness': 0.95}
            
        Returns:
            不同质量问题的单元ID列表
        """
        if not self.mesh:
            logger.error("未加载网格数据，无法识别问题单元")
            return {}
        
        if not self.quality_metrics:
            logger.info("未进行质量分析，先进行分析")
            self.analyze_mesh_quality()
        
        # 默认阈值
        default_thresholds = {
            'aspect_ratio': 10.0,        # 纵横比阈值
            'skewness': 0.95,            # 倾斜度阈值
            'orthogonal_quality': 0.15,  # 正交质量阈值(小于此值为差)
            'jacobian': 0.0              # 雅可比值阈值(小于等于0为无效单元)
        }
        
        # 使用用户提供的阈值覆盖默认值
        if threshold_dict:
            for key, value in threshold_dict.items():
                if key in default_thresholds:
                    default_thresholds[key] = value
        
        try:
            logger.info("正在识别质量较差的单元...")
            
            # 获取单元数据
            elements = self.mesh.get('elements', [])
            
            # 问题单元字典
            poor_elements = {
                'aspect_ratio': [],      # 纵横比过大的单元
                'skewness': [],          # 倾斜度过高的单元
                'orthogonal_quality': [], # 正交质量过低的单元
                'jacobian': [],          # 雅可比值小于等于0的单元
                'all_poor_elements': []  # 所有问题单元
            }
            
            # 遍历所有单元检查质量
            for i, element in enumerate(elements):
                element_id = i + 1
                
                # 获取单元节点
                element_nodes = [self.mesh['nodes'][node_id - 1] for node_id in element['connectivity']]
                
                # 计算各种质量指标
                aspect_ratio = self._calculate_aspect_ratio(element_nodes)
                skewness = self._calculate_skewness(element_nodes)
                orthogonal_quality = self._calculate_orthogonal_quality(element_nodes)
                jacobian = self._calculate_jacobian(element_nodes)
                
                # 检查各指标是否超出阈值
                if aspect_ratio > default_thresholds['aspect_ratio']:
                    poor_elements['aspect_ratio'].append(element_id)
                    if element_id not in poor_elements['all_poor_elements']:
                        poor_elements['all_poor_elements'].append(element_id)
                        
                if skewness > default_thresholds['skewness']:
                    poor_elements['skewness'].append(element_id)
                    if element_id not in poor_elements['all_poor_elements']:
                        poor_elements['all_poor_elements'].append(element_id)
                
                if orthogonal_quality < default_thresholds['orthogonal_quality']:
                    poor_elements['orthogonal_quality'].append(element_id)
                    if element_id not in poor_elements['all_poor_elements']:
                        poor_elements['all_poor_elements'].append(element_id)
                
                if jacobian <= default_thresholds['jacobian']:
                    poor_elements['jacobian'].append(element_id)
                    if element_id not in poor_elements['all_poor_elements']:
                        poor_elements['all_poor_elements'].append(element_id)
            
            # 输出统计信息
            total_elements = len(elements)
            poor_count = len(poor_elements['all_poor_elements'])
            poor_percentage = (poor_count / total_elements) * 100 if total_elements > 0 else 0
            
            logger.info(f"问题单元识别完成: 共{poor_count}个问题单元，占比{poor_percentage:.2f}%")
            logger.info(f"纵横比过大: {len(poor_elements['aspect_ratio'])}个，倾斜度过高: {len(poor_elements['skewness'])}个")
            logger.info(f"正交质量过低: {len(poor_elements['orthogonal_quality'])}个，雅可比值无效: {len(poor_elements['jacobian'])}个")
            
            return poor_elements
            
        except Exception as e:
            logger.error(f"识别问题单元出错: {str(e)}")
            return {}

    def generate_quality_report(self) -> Dict[str, Any]:
        """
        生成网格质量报告
        
        Returns:
            包含网格质量报告的字典
        """
        if not self.mesh:
            logger.error("未加载网格数据，无法生成报告")
            return {}
        
        if not self.quality_metrics:
            logger.info("未进行质量分析，先进行分析")
            self.analyze_mesh_quality()
        
        try:
            logger.info("正在生成网格质量报告...")
            
            # 识别问题单元
            poor_elements = self.identify_poor_quality_elements()
            
            # 生成报告
            report = {
                'mesh_summary': {
                    'nodes_count': len(self.mesh.get('nodes', [])),
                    'elements_count': len(self.mesh.get('elements', [])),
                    'element_types': self._count_element_types()
                },
                'quality_metrics': self.quality_metrics,
                'poor_elements': {
                    'count': len(poor_elements['all_poor_elements']),
                    'percentage': (len(poor_elements['all_poor_elements']) / len(self.mesh.get('elements', []))) * 100 \
                        if self.mesh.get('elements', []) else 0,
                    'breakdown': {
                        'aspect_ratio': len(poor_elements['aspect_ratio']),
                        'skewness': len(poor_elements['skewness']),
                        'orthogonal_quality': len(poor_elements['orthogonal_quality']),
                        'jacobian': len(poor_elements['jacobian'])
                    }
                },
                'recommendations': self._generate_recommendations(poor_elements)
            }
            
            logger.info("网格质量报告生成完成")
            return report
            
        except Exception as e:
            logger.error(f"生成质量报告出错: {str(e)}")
            return {}
    
    def _count_element_types(self) -> Dict[str, int]:
        """
        统计各类型单元数量
        
        Returns:
            各类型单元数量字典
        """
        if not self.mesh:
            return {}
            
        elements = self.mesh.get('elements', [])
        type_counts = {}
        
        for element in elements:
            element_type = element.get('type', 'unknown')
            type_counts[element_type] = type_counts.get(element_type, 0) + 1
        
        return type_counts
    
    def _generate_recommendations(self, poor_elements: Dict[str, List[int]]) -> List[str]:
        """
        根据问题单元生成优化建议
        
        Args:
            poor_elements: 问题单元字典
            
        Returns:
            优化建议列表
        """
        recommendations = []
        
        # 根据问题单元数量给出建议
        total_elements = len(self.mesh.get('elements', [])) if self.mesh else 0
        poor_count = len(poor_elements.get('all_poor_elements', []))
        poor_percentage = (poor_count / total_elements) * 100 if total_elements > 0 else 0
        
        if poor_percentage > 10:
            recommendations.append("网格质量问题较多，建议重新生成网格并调整网格生成参数")
        
        if len(poor_elements.get('aspect_ratio', [])) > 0:
            recommendations.append(f"有{len(poor_elements['aspect_ratio'])}个单元纵横比过大，建议在这些区域细化网格")
        
        if len(poor_elements.get('skewness', [])) > 0:
            recommendations.append(f"有{len(poor_elements['skewness'])}个单元倾斜度过高，建议优化几何模型，减少尖角")
        
        if len(poor_elements.get('jacobian', [])) > 0:
            recommendations.append(f"有{len(poor_elements['jacobian'])}个单元雅可比值无效，这些单元可能导致计算失败，必须修复")
        
        if len(poor_elements.get('orthogonal_quality', [])) > 0:
            recommendations.append(f"有{len(poor_elements['orthogonal_quality'])}个单元正交质量过低，建议改进网格生成算法")
        
        # 如果没有严重问题，也给出积极反馈
        if poor_percentage < 5:
            recommendations.append("网格质量总体良好，可以进行计算")
        
        return recommendations

    def smooth_mesh(self, iterations: int = 3, method: str = 'laplacian') -> Dict[str, Any]:
        """
        平滑网格，改善网格质量
        
        Args:
            iterations: 平滑迭代次数
            method: 平滑方法，支持 'laplacian'(拉普拉斯平滑) 和 'taubin'(陶宾平滑)
            
        Returns:
            平滑后的网格数据
        """
        if not self.mesh:
            logger.error("未加载网格数据，无法进行平滑")
            return {}
        
        try:
            logger.info(f"开始网格平滑，方法: {method}，迭代次数: {iterations}")
            
            # 获取网格数据的副本
            smoothed_mesh = {
                'nodes': [node.copy() for node in self.mesh.get('nodes', [])],
                'elements': self.mesh.get('elements', [])
            }
            
            # 构建节点-单元关系
            node_element_map = self._build_node_element_map(smoothed_mesh)
            
            # 构建节点-节点连接关系
            node_connections = self._build_node_connections(smoothed_mesh)
            
            # 记录边界节点，边界节点不参与平滑
            boundary_nodes = self._identify_boundary_nodes(smoothed_mesh)
            
            # 执行平滑迭代
            for i in range(iterations):
                if method == 'laplacian':
                    self._laplacian_smooth(smoothed_mesh, node_connections, boundary_nodes)
                elif method == 'taubin':
                    # Taubin平滑包括正向和反向拉普拉斯平滑
                    self._laplacian_smooth(smoothed_mesh, node_connections, boundary_nodes, lambda_factor=0.5)
                    self._laplacian_smooth(smoothed_mesh, node_connections, boundary_nodes, lambda_factor=-0.53)
                else:
                    logger.warning(f"未知的平滑方法: {method}，使用默认拉普拉斯平滑")
                    self._laplacian_smooth(smoothed_mesh, node_connections, boundary_nodes)
                
                logger.info(f"完成平滑迭代 {i+1}/{iterations}")
            
            # 更新网格
            self.mesh = smoothed_mesh
            
            # 重新分析网格质量
            self.analyze_mesh_quality()
            
            logger.info("网格平滑完成")
            return smoothed_mesh
            
        except Exception as e:
            logger.error(f"网格平滑出错: {str(e)}")
            return self.mesh
    
    def _build_node_element_map(self, mesh: Dict[str, Any]) -> Dict[int, List[int]]:
        """
        构建节点到单元的映射
        
        Args:
            mesh: 网格数据
            
        Returns:
            节点到单元的映射字典，键为节点ID，值为包含该节点的单元ID列表
        """
        node_element_map = {}
        
        for i, element in enumerate(mesh.get('elements', [])):
            element_id = i + 1
            for node_id in element.get('connectivity', []):
                if node_id not in node_element_map:
                    node_element_map[node_id] = []
                node_element_map[node_id].append(element_id)
        
        return node_element_map
    
    def _build_node_connections(self, mesh: Dict[str, Any]) -> Dict[int, List[int]]:
        """
        构建节点连接关系
        
        Args:
            mesh: 网格数据
            
        Returns:
            节点连接字典，键为节点ID，值为与该节点相连的节点ID列表
        """
        node_connections = {}
        
        # 遍历所有单元
        for element in mesh.get('elements', []):
            connectivity = element.get('connectivity', [])
            
            # 对单元中的每个节点
            for i, node_id in enumerate(connectivity):
                if node_id not in node_connections:
                    node_connections[node_id] = []
                
                # 将单元中的其他节点添加为连接节点
                for j, other_node_id in enumerate(connectivity):
                    if i != j and other_node_id not in node_connections[node_id]:
                        node_connections[node_id].append(other_node_id)
        
        return node_connections
    
    def _identify_boundary_nodes(self, mesh: Dict[str, Any]) -> List[int]:
        """
        识别边界节点
        
        Args:
            mesh: 网格数据
            
        Returns:
            边界节点ID列表
        """
        # 构建面-单元关系
        face_element_map = {}
        
        # 遍历所有单元
        for i, element in enumerate(mesh.get('elements', [])):
            element_id = i + 1
            connectivity = element.get('connectivity', [])
            
            # 根据单元类型生成面
            if len(connectivity) == 4:  # 四面体
                # 四面体有4个三角形面
                faces = [
                    tuple(sorted([connectivity[0], connectivity[1], connectivity[2]])),
                    tuple(sorted([connectivity[0], connectivity[1], connectivity[3]])),
                    tuple(sorted([connectivity[0], connectivity[2], connectivity[3]])),
                    tuple(sorted([connectivity[1], connectivity[2], connectivity[3]]))
                ]
            elif len(connectivity) == 8:  # 六面体
                # 六面体有6个四边形面
                faces = [
                    tuple(sorted([connectivity[0], connectivity[1], connectivity[2], connectivity[3]])),
                    tuple(sorted([connectivity[4], connectivity[5], connectivity[6], connectivity[7]])),
                    tuple(sorted([connectivity[0], connectivity[1], connectivity[5], connectivity[4]])),
                    tuple(sorted([connectivity[1], connectivity[2], connectivity[6], connectivity[5]])),
                    tuple(sorted([connectivity[2], connectivity[3], connectivity[7], connectivity[6]])),
                    tuple(sorted([connectivity[3], connectivity[0], connectivity[4], connectivity[7]]))
                ]
            else:
                continue
            
            # 更新面-单元映射
            for face in faces:
                if face not in face_element_map:
                    face_element_map[face] = []
                face_element_map[face].append(element_id)
        
        # 边界面是只属于一个单元的面
        boundary_faces = [face for face, elements in face_element_map.items() if len(elements) == 1]
        
        # 边界节点是边界面上的节点
        boundary_nodes = set()
        for face in boundary_faces:
            for node_id in face:
                boundary_nodes.add(node_id)
        
        return list(boundary_nodes)
    
    def _laplacian_smooth(self, mesh: Dict[str, Any], node_connections: Dict[int, List[int]],
                         boundary_nodes: List[int], lambda_factor: float = 0.5) -> None:
        """
        拉普拉斯平滑
        
        Args:
            mesh: 网格数据
            node_connections: 节点连接关系
            boundary_nodes: 边界节点列表
            lambda_factor: 平滑因子，控制平滑强度
        """
        # 计算新节点位置
        new_positions = []
        
        for i, node in enumerate(mesh.get('nodes', [])):
            node_id = i + 1
            
            # 边界节点不参与平滑
            if node_id in boundary_nodes:
                new_positions.append(node.copy())
                continue
            
            # 获取相邻节点
            neighbors = node_connections.get(node_id, [])
            
            if not neighbors:
                new_positions.append(node.copy())
                continue
            
            # 计算相邻节点的平均位置
            avg_position = [0.0, 0.0, 0.0]
            for neighbor_id in neighbors:
                neighbor_node = mesh['nodes'][neighbor_id - 1]
                for j in range(3):  # x, y, z
                    avg_position[j] += neighbor_node[j]
            
            for j in range(3):
                avg_position[j] /= len(neighbors)
            
            # 应用平滑因子
            new_position = node.copy()
            for j in range(3):  # x, y, z
                new_position[j] = node[j] + lambda_factor * (avg_position[j] - node[j])
            
            new_positions.append(new_position)
        
        # 更新节点位置
        mesh['nodes'] = new_positions
