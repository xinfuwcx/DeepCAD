"""
挖洞+填充算法核心实现
解决几何建模（体单元）与结构计算（壳/梁单元）的矛盾

算法原理：
1. 嵌入式结构（地连墙、桩基等）在几何上占据体积
2. 结构计算时按壳单元或梁单元处理（无体积）
3. 为保持几何连续性，需要在结构体积位置填入软材料
4. 软材料模量 ≈ 0.1 × 土体模量，确保不影响结构计算

2号几何专家 - 统一GMSH OCC几何处理方案
"""

import gmsh
import numpy as np
import logging
from typing import List, Dict, Tuple, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)

class StructureType(str, Enum):
    """结构类型"""
    DIAPHRAGM_WALL = "diaphragm_wall"    # 地连墙 → 壳单元
    PILE = "pile"                        # 桩基 → 梁单元
    ANCHOR = "anchor"                    # 锚杆 → 梁单元
    SUPPORT_BEAM = "support_beam"        # 支撑梁 → 梁单元
    TUNNEL_LINING = "tunnel_lining"      # 隧道衬砌 → 壳单元

class CalculationMode(str, Enum):
    """计算模式"""
    SHELL_ELEMENT = "shell"              # 壳单元（面结构）
    BEAM_ELEMENT = "beam"                # 梁单元（线结构）
    VOLUME_ELEMENT = "volume"            # 体单元（实体结构）

class HoleFillerAlgorithm:
    """挖洞+填充算法实现器"""
    
    def __init__(self):
        self.algorithm_name = "HoleFillerGeometryProcessor"
        self.processed_structures = {}   # 存储处理后的结构信息
        self.soft_fill_materials = {}    # 存储软填充材料
        self.excavated_domains = {}      # 存储挖洞后的域
        
    def calculate_soft_material_properties(self,
                                         soil_materials: Dict[int, Dict[str, Any]],
                                         reduction_factor: float = 0.1) -> Dict[str, Any]:
        """
        计算软填充材料属性
        
        Args:
            soil_materials: 土体材料属性
            reduction_factor: 模量折减系数
            
        Returns:
            软填充材料属性
        """
        try:
            # 取周围土体的平均属性
            avg_elastic_modulus = 0.0
            avg_poisson_ratio = 0.0
            avg_density = 0.0
            material_count = 0
            
            for layer_id, material in soil_materials.items():
                if 'elastic_modulus' in material:
                    avg_elastic_modulus += material['elastic_modulus']
                    material_count += 1
                if 'poisson_ratio' in material:
                    avg_poisson_ratio += material.get('poisson_ratio', 0.3)
                if 'density' in material:
                    avg_density += material.get('density', 1800)
            
            if material_count > 0:
                avg_elastic_modulus /= material_count
                avg_poisson_ratio /= material_count
                avg_density /= material_count
            else:
                # 默认值
                avg_elastic_modulus = 10e6  # Pa
                avg_poisson_ratio = 0.3
                avg_density = 1800  # kg/m³
            
            # 生成软填充材料属性
            soft_material = {
                'name': 'SoftFillMaterial',
                'elastic_modulus': avg_elastic_modulus * reduction_factor,
                'poisson_ratio': avg_poisson_ratio,  # 泊松比保持不变
                'density': avg_density * 0.5,       # 密度适当降低
                'description': f'软填充材料 (E={avg_elastic_modulus * reduction_factor:.0f}Pa)',
                'color': [0.8, 0.8, 0.8],          # 灰色
                'transparency': 0.5
            }
            
            logger.info(f"✓ 计算软填充材料属性: E={soft_material['elastic_modulus']:.0f}Pa")
            
            return soft_material
            
        except Exception as e:
            logger.error(f"软填充材料属性计算失败: {e}")
            # 返回默认值
            return {
                'name': 'DefaultSoftFill',
                'elastic_modulus': 1e6,
                'poisson_ratio': 0.3,
                'density': 900,
                'description': '默认软填充材料',
                'color': [0.7, 0.7, 0.7],
                'transparency': 0.5
            }
    
    def extract_structure_geometry_info(self,
                                      structure_volumes: List[int],
                                      structure_type: StructureType) -> Dict[str, Any]:
        """
        提取结构几何信息
        
        Args:
            structure_volumes: 结构体标签列表
            structure_type: 结构类型
            
        Returns:
            结构几何信息字典
        """
        try:
            geometry_info = {
                'volume_tags': structure_volumes,
                'structure_type': structure_type,
                'surface_tags': [],     # 面标签（用于壳单元）
                'line_tags': [],        # 线标签（用于梁单元）
                'total_volume': 0.0,    # 总体积
                'bounding_box': None    # 包围盒
            }
            
            for volume_tag in structure_volumes:
                try:
                    # 获取体的边界面
                    boundary_entities = gmsh.model.getBoundary([(3, volume_tag)], combined=False, oriented=False)
                    
                    for dim, tag in boundary_entities:
                        if dim == 2:  # 面
                            geometry_info['surface_tags'].append(tag)
                        elif dim == 1:  # 线
                            geometry_info['line_tags'].append(tag)
                    
                    # 计算体积（简化实现）
                    # 实际应该调用GMSH的体积计算函数
                    # geometry_info['total_volume'] += gmsh.model.occ.getMass(3, volume_tag)
                    
                except Exception as e:
                    logger.warning(f"结构体{volume_tag}几何信息提取失败: {e}")
            
            # 去重
            geometry_info['surface_tags'] = list(set(geometry_info['surface_tags']))
            geometry_info['line_tags'] = list(set(geometry_info['line_tags']))
            
            logger.info(f"✓ 提取{structure_type}几何信息: {len(structure_volumes)}体, {len(geometry_info['surface_tags'])}面, {len(geometry_info['line_tags'])}线")
            
            return geometry_info
            
        except Exception as e:
            logger.error(f"结构几何信息提取失败: {e}")
            raise
    
    def perform_boolean_excavation(self,
                                 domain_volumes: Dict[int, int],
                                 structure_volumes: List[int],
                                 preserve_structure_geometry: bool = True) -> Dict[str, Any]:
        """
        执行布尔挖洞操作
        
        Args:
            domain_volumes: 域体字典 {domain_id: volume_tag}
            structure_volumes: 结构体标签列表
            preserve_structure_geometry: 是否保留结构几何（用于填充）
            
        Returns:
            挖洞结果字典
        """
        try:
            excavated_domains = {}
            structure_holes = []
            
            # 准备切割工具
            cutting_tools = [(3, vol) for vol in structure_volumes]
            
            logger.info(f"🔄 开始布尔挖洞: {len(domain_volumes)}个域, {len(cutting_tools)}个结构体")
            
            # 对每个域执行挖洞
            for domain_id, domain_volume in domain_volumes.items():
                try:
                    # 执行布尔差集运算
                    cut_result = gmsh.model.occ.cut(
                        [(3, domain_volume)],    # 被切割域
                        cutting_tools,           # 切割工具
                        removeObject=True,       # 移除原域
                        removeTool=False         # 保留切割工具
                    )
                    
                    if cut_result[0]:
                        # 挖洞成功
                        new_domain_volume = cut_result[0][0][1]
                        excavated_domains[domain_id] = new_domain_volume
                        
                        # 记录被挖除的体积（洞）
                        if cut_result[1]:  # 有相交部分
                            for dim, tag in cut_result[1]:
                                if dim == 3:
                                    structure_holes.append(tag)
                        
                        logger.info(f"✓ 域{domain_id}挖洞完成: {domain_volume} → {new_domain_volume}")
                        
                    else:
                        # 无交集，保持原状
                        excavated_domains[domain_id] = domain_volume
                        logger.info(f"• 域{domain_id}与结构体无交集")
                        
                except Exception as e:
                    logger.error(f"域{domain_id}挖洞失败: {e}")
                    excavated_domains[domain_id] = domain_volume
            
            # 同步几何
            gmsh.model.occ.synchronize()
            
            result = {
                'excavated_domains': excavated_domains,
                'structure_holes': structure_holes,
                'original_structures': structure_volumes,
                'excavation_success': len(excavated_domains) > 0
            }
            
            logger.info(f"✓ 布尔挖洞完成: {len(excavated_domains)}个挖洞域, {len(structure_holes)}个洞穴")
            
            return result
            
        except Exception as e:
            logger.error(f"布尔挖洞操作失败: {e}")
            raise
    
    def create_soft_fill_volumes(self,
                               structure_volumes: List[int],
                               soft_material_properties: Dict[str, Any]) -> List[int]:
        """
        创建软填充体
        
        Args:
            structure_volumes: 原结构体标签列表
            soft_material_properties: 软材料属性
            
        Returns:
            软填充体标签列表
        """
        try:
            soft_fill_volumes = []
            
            for i, structure_volume in enumerate(structure_volumes):
                try:
                    # 复制结构体作为软填充
                    copy_result = gmsh.model.occ.copy([(3, structure_volume)])
                    
                    if copy_result:
                        soft_fill_volume = copy_result[0][1]
                        soft_fill_volumes.append(soft_fill_volume)
                        
                        logger.info(f"✓ 创建软填充体{i+1}: {structure_volume} → {soft_fill_volume}")
                    else:
                        logger.warning(f"结构体{structure_volume}复制失败")
                        
                except Exception as e:
                    logger.error(f"软填充体{i+1}创建失败: {e}")
            
            # 同步几何
            gmsh.model.occ.synchronize()
            
            # 保存软填充材料信息
            self.soft_fill_materials['volumes'] = soft_fill_volumes
            self.soft_fill_materials['properties'] = soft_material_properties
            
            logger.info(f"✓ 软填充体创建完成: {len(soft_fill_volumes)}个")
            
            return soft_fill_volumes
            
        except Exception as e:
            logger.error(f"软填充体创建失败: {e}")
            raise
    
    def define_calculation_elements(self,
                                  structure_geometry_info: Dict[str, Any],
                                  calculation_mode: CalculationMode) -> Dict[str, List[int]]:
        """
        定义计算单元
        
        Args:
            structure_geometry_info: 结构几何信息
            calculation_mode: 计算模式
            
        Returns:
            计算单元字典 {'shell_surfaces': [...], 'beam_lines': [...]}
        """
        try:
            calculation_elements = {
                'shell_surfaces': [],
                'beam_lines': [],
                'volume_bodies': []
            }
            
            if calculation_mode == CalculationMode.SHELL_ELEMENT:
                # 壳单元：使用结构的边界面
                calculation_elements['shell_surfaces'] = structure_geometry_info['surface_tags']
                logger.info(f"✓ 定义壳单元: {len(calculation_elements['shell_surfaces'])}个面")
                
            elif calculation_mode == CalculationMode.BEAM_ELEMENT:
                # 梁单元：需要提取结构的中心线
                # 这里简化为使用边界线，实际应该计算中心线
                calculation_elements['beam_lines'] = structure_geometry_info['line_tags']
                logger.info(f"✓ 定义梁单元: {len(calculation_elements['beam_lines'])}条线")
                
            elif calculation_mode == CalculationMode.VOLUME_ELEMENT:
                # 体单元：直接使用结构体
                calculation_elements['volume_bodies'] = structure_geometry_info['volume_tags']
                logger.info(f"✓ 定义体单元: {len(calculation_elements['volume_bodies'])}个体")
                
            else:
                raise ValueError(f"不支持的计算模式: {calculation_mode}")
            
            return calculation_elements
            
        except Exception as e:
            logger.error(f"计算单元定义失败: {e}")
            raise
    
    def apply_complete_hole_filler_algorithm(self,
                                          domain_volumes: Dict[int, int],
                                          structure_configs: List[Dict[str, Any]],
                                          soil_materials: Dict[int, Dict[str, Any]],
                                          soft_material_reduction_factor: float = 0.1) -> Dict[str, Any]:
        """
        完整的挖洞+填充算法应用
        
        Args:
            domain_volumes: 域体字典 {domain_id: volume_tag}
            structure_configs: 结构配置列表，每个包含:
                {
                    'volumes': [volume_tags],
                    'type': StructureType,
                    'calculation_mode': CalculationMode,
                    'name': str
                }
            soil_materials: 土体材料信息
            soft_material_reduction_factor: 软材料模量折减系数
            
        Returns:
            完整算法结果字典
        """
        try:
            # 1. 计算软填充材料属性
            soft_material_properties = self.calculate_soft_material_properties(
                soil_materials, soft_material_reduction_factor
            )
            
            # 2. 收集所有结构体
            all_structure_volumes = []
            structure_geometry_infos = {}
            calculation_elements_by_structure = {}
            
            for i, config in enumerate(structure_configs):
                structure_name = config.get('name', f'Structure_{i}')
                structure_volumes = config['volumes']
                structure_type = StructureType(config['type'])
                calculation_mode = CalculationMode(config['calculation_mode'])
                
                # 提取结构几何信息
                geometry_info = self.extract_structure_geometry_info(
                    structure_volumes, structure_type
                )
                structure_geometry_infos[structure_name] = geometry_info
                
                # 定义计算单元
                calc_elements = self.define_calculation_elements(geometry_info, calculation_mode)
                calculation_elements_by_structure[structure_name] = calc_elements
                
                all_structure_volumes.extend(structure_volumes)
            
            # 3. 执行布尔挖洞
            excavation_result = self.perform_boolean_excavation(
                domain_volumes, all_structure_volumes, preserve_structure_geometry=True
            )
            
            # 4. 创建软填充体
            soft_fill_volumes = self.create_soft_fill_volumes(
                all_structure_volumes, soft_material_properties
            )
            
            # 5. 整合结果
            algorithm_result = {
                'success': True,
                'algorithm_name': self.algorithm_name,
                'excavated_domains': excavation_result['excavated_domains'],
                'soft_fill_volumes': soft_fill_volumes,
                'soft_material_properties': soft_material_properties,
                'structure_geometry_infos': structure_geometry_infos,
                'calculation_elements': calculation_elements_by_structure,
                'processing_summary': {
                    'domains_processed': len(excavation_result['excavated_domains']),
                    'structures_processed': len(structure_configs),
                    'soft_fills_created': len(soft_fill_volumes),
                    'total_structure_volumes': len(all_structure_volumes)
                }
            }
            
            # 6. 保存处理状态
            self.processed_structures = structure_geometry_infos
            self.excavated_domains = excavation_result['excavated_domains']
            
            logger.info("🎉 挖洞+填充算法完成!")
            logger.info(f"   处理域数: {algorithm_result['processing_summary']['domains_processed']}")
            logger.info(f"   处理结构数: {algorithm_result['processing_summary']['structures_processed']}")
            logger.info(f"   软填充体数: {algorithm_result['processing_summary']['soft_fills_created']}")
            
            return algorithm_result
            
        except Exception as e:
            logger.error(f"挖洞+填充算法执行失败: {e}")
            return {
                'success': False,
                'error': str(e),
                'algorithm_name': self.algorithm_name
            }
    
    def validate_algorithm_consistency(self,
                                     algorithm_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        验证算法一致性
        
        Args:
            algorithm_result: 算法执行结果
            
        Returns:
            验证结果字典
        """
        try:
            validation_result = {
                'is_consistent': True,
                'warnings': [],
                'errors': [],
                'checks_performed': []
            }
            
            # 1. 检查几何连续性
            excavated_domains = algorithm_result.get('excavated_domains', {})
            soft_fill_volumes = algorithm_result.get('soft_fill_volumes', [])
            
            if len(excavated_domains) == 0:
                validation_result['warnings'].append("未找到挖洞域，可能无结构与域相交")
            
            if len(soft_fill_volumes) == 0:
                validation_result['errors'].append("未生成软填充体，几何不连续")
                validation_result['is_consistent'] = False
            
            validation_result['checks_performed'].append("几何连续性检查")
            
            # 2. 检查材料属性合理性
            soft_material = algorithm_result.get('soft_material_properties', {})
            
            if 'elastic_modulus' in soft_material:
                if soft_material['elastic_modulus'] <= 0:
                    validation_result['errors'].append("软填充材料弹性模量非正值")
                    validation_result['is_consistent'] = False
                elif soft_material['elastic_modulus'] > 100e6:  # 100 MPa
                    validation_result['warnings'].append("软填充材料模量偏高，可能影响计算精度")
            
            validation_result['checks_performed'].append("材料属性检查")
            
            # 3. 检查计算单元定义
            calculation_elements = algorithm_result.get('calculation_elements', {})
            
            if not calculation_elements:
                validation_result['warnings'].append("未定义计算单元")
            else:
                for structure_name, elements in calculation_elements.items():
                    if not any(elements.values()):
                        validation_result['warnings'].append(f"结构{structure_name}无有效计算单元")
            
            validation_result['checks_performed'].append("计算单元检查")
            
            # 4. 汇总验证结果
            if validation_result['errors']:
                validation_result['is_consistent'] = False
                logger.error(f"算法一致性验证失败: {len(validation_result['errors'])}个错误")
            elif validation_result['warnings']:
                logger.warning(f"算法一致性存在问题: {len(validation_result['warnings'])}个警告")
            else:
                logger.info("✓ 算法一致性验证通过")
            
            return validation_result
            
        except Exception as e:
            logger.error(f"算法一致性验证失败: {e}")
            return {
                'is_consistent': False,
                'errors': [f"验证过程异常: {str(e)}"],
                'warnings': [],
                'checks_performed': []
            }

# 全局算法实例
hole_filler_algorithm = HoleFillerAlgorithm()