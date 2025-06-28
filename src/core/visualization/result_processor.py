"""
结果处理器模块，用于处理深基坑分析结果并准备用于前端可视化的数据
"""

import numpy as np
import json
import os
from pathlib import Path
from typing import Dict, List, Tuple, Union, Optional, Any

class ResultProcessor:
    """
    结果处理器类，用于处理深基坑分析结果并准备用于前端可视化的数据
    """
    
    def __init__(self, result_dir: str):
        """
        初始化结果处理器
        
        参数:
            result_dir: 结果文件目录
        """
        self.result_dir = Path(result_dir)
        self.nodes = []
        self.elements = []
        self.stages = []
        self.metadata = {}
        
    def load_results(self, project_id: str) -> bool:
        """
        加载指定项目的分析结果
        
        参数:
            project_id: 项目ID
            
        返回:
            bool: 是否成功加载
        """
        project_dir = self.result_dir / project_id
        
        if not project_dir.exists():
            return False
        
        # 加载模型数据
        try:
            with open(project_dir / "model.json", "r") as f:
                model_data = json.load(f)
                self.nodes = model_data.get("nodes", [])
                self.elements = model_data.get("elements", [])
                self.metadata = model_data.get("metadata", {})
        except (FileNotFoundError, json.JSONDecodeError) as e:
            print(f"加载模型数据失败: {e}")
            return False
        
        # 加载阶段结果
        self.stages = []
        stage_files = sorted(project_dir.glob("stage_*.json"))
        
        for stage_file in stage_files:
            try:
                with open(stage_file, "r") as f:
                    stage_data = json.load(f)
                    self.stages.append(stage_data)
            except (FileNotFoundError, json.JSONDecodeError) as e:
                print(f"加载阶段数据失败 {stage_file}: {e}")
        
        return len(self.stages) > 0
    
    def get_visualization_data(self) -> Dict[str, Any]:
        """
        获取用于前端可视化的数据
        
        返回:
            Dict: 可视化数据
        """
        return {
            "nodes": self._process_nodes(),
            "elements": self._process_elements(),
            "stages": self._process_stages(),
            "metadata": self.metadata
        }
    
    def _process_nodes(self) -> List[Dict[str, float]]:
        """
        处理节点数据
        
        返回:
            List: 处理后的节点数据
        """
        processed_nodes = []
        
        for node in self.nodes:
            processed_nodes.append({
                "x": node.get("x", 0.0),
                "y": node.get("y", 0.0),
                "z": node.get("z", 0.0)
            })
        
        return processed_nodes
    
    def _process_elements(self) -> List[Dict[str, Any]]:
        """
        处理单元数据
        
        返回:
            List: 处理后的单元数据
        """
        processed_elements = []
        
        for element in self.elements:
            processed_elements.append({
                "nodeIndices": element.get("node_indices", []),
                "materialId": element.get("material_id", 0),
                "type": element.get("type", "solid")
            })
        
        return processed_elements
    
    def _process_stages(self) -> List[Dict[str, Any]]:
        """
        处理阶段数据
        
        返回:
            List: 处理后的阶段数据
        """
        processed_stages = []
        
        for stage in self.stages:
            processed_stage = {
                "name": stage.get("name", ""),
                "description": stage.get("description", ""),
                "displacements": self._process_displacements(stage),
                "results": self._process_results(stage)
            }
            processed_stages.append(processed_stage)
        
        return processed_stages
    
    def _process_displacements(self, stage: Dict[str, Any]) -> List[float]:
        """
        处理位移数据
        
        参数:
            stage: 阶段数据
            
        返回:
            List: 处理后的位移数据
        """
        displacements = stage.get("displacements", [])
        processed_displacements = []
        
        for node_id, node_displacements in enumerate(displacements):
            dx = node_displacements.get("dx", 0.0)
            dy = node_displacements.get("dy", 0.0)
            dz = node_displacements.get("dz", 0.0)
            
            processed_displacements.extend([dx, dy, dz])
        
        return processed_displacements
    
    def _process_results(self, stage: Dict[str, Any]) -> Dict[str, List[float]]:
        """
        处理结果数据
        
        参数:
            stage: 阶段数据
            
        返回:
            Dict: 处理后的结果数据
        """
        results = stage.get("results", {})
        processed_results = {}
        
        for result_type, values in results.items():
            processed_results[result_type] = []
            
            for node_id, value in enumerate(values):
                if isinstance(value, dict):
                    # 如果是复杂结果类型（如应力张量），计算等效值
                    if result_type == "stress":
                        # 计算von Mises应力
                        s_xx = value.get("xx", 0.0)
                        s_yy = value.get("yy", 0.0)
                        s_zz = value.get("zz", 0.0)
                        s_xy = value.get("xy", 0.0)
                        s_yz = value.get("yz", 0.0)
                        s_zx = value.get("zx", 0.0)
                        
                        von_mises = np.sqrt(0.5 * ((s_xx - s_yy)**2 + (s_yy - s_zz)**2 + (s_zz - s_xx)**2 + 
                                                  6 * (s_xy**2 + s_yz**2 + s_zx**2)))
                        processed_results[result_type].append(von_mises)
                    elif result_type == "strain":
                        # 计算等效应变
                        e_xx = value.get("xx", 0.0)
                        e_yy = value.get("yy", 0.0)
                        e_zz = value.get("zz", 0.0)
                        e_xy = value.get("xy", 0.0)
                        e_yz = value.get("yz", 0.0)
                        e_zx = value.get("zx", 0.0)
                        
                        effective_strain = np.sqrt((2/3) * (e_xx**2 + e_yy**2 + e_zz**2 + 
                                                           2 * (e_xy**2 + e_yz**2 + e_zx**2)))
                        processed_results[result_type].append(effective_strain)
                    else:
                        # 默认使用第一个值
                        processed_results[result_type].append(next(iter(value.values()), 0.0))
                else:
                    # 简单结果类型（如位移大小）
                    processed_results[result_type].append(value)
        
        return processed_results
    
    def get_available_result_types(self) -> List[str]:
        """
        获取可用的结果类型
        
        返回:
            List: 结果类型列表
        """
        if not self.stages:
            return []
        
        result_types = []
        for stage in self.stages:
            results = stage.get("results", {})
            for result_type in results.keys():
                if result_type not in result_types:
                    result_types.append(result_type)
        
        return result_types
    
    def get_stage_names(self) -> List[str]:
        """
        获取所有阶段名称
        
        返回:
            List: 阶段名称列表
        """
        return [stage.get("name", f"阶段 {i+1}") for i, stage in enumerate(self.stages)]
    
    def export_to_json(self, output_file: str) -> bool:
        """
        将处理后的数据导出为JSON文件
        
        参数:
            output_file: 输出文件路径
            
        返回:
            bool: 是否成功导出
        """
        try:
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(self.get_visualization_data(), f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"导出JSON失败: {e}")
            return False
    
    def get_result_statistics(self) -> Dict[str, Dict[str, float]]:
        """
        获取结果统计信息
        
        返回:
            Dict: 结果统计信息
        """
        statistics = {}
        
        for stage_index, stage in enumerate(self.stages):
            stage_name = stage.get("name", f"阶段 {stage_index+1}")
            statistics[stage_name] = {}
            
            results = stage.get("results", {})
            for result_type, values in results.items():
                # 提取数值
                numeric_values = []
                for value in values:
                    if isinstance(value, dict):
                        # 复杂结果类型，使用前面处理过的等效值
                        if result_type == "stress":
                            s_xx = value.get("xx", 0.0)
                            s_yy = value.get("yy", 0.0)
                            s_zz = value.get("zz", 0.0)
                            s_xy = value.get("xy", 0.0)
                            s_yz = value.get("yz", 0.0)
                            s_zx = value.get("zx", 0.0)
                            
                            von_mises = np.sqrt(0.5 * ((s_xx - s_yy)**2 + (s_yy - s_zz)**2 + (s_zz - s_xx)**2 + 
                                                      6 * (s_xy**2 + s_yz**2 + s_zx**2)))
                            numeric_values.append(von_mises)
                        else:
                            numeric_values.append(next(iter(value.values()), 0.0))
                    else:
                        numeric_values.append(value)
                
                # 计算统计值
                if numeric_values:
                    statistics[stage_name][result_type] = {
                        "min": float(np.min(numeric_values)),
                        "max": float(np.max(numeric_values)),
                        "mean": float(np.mean(numeric_values)),
                        "std": float(np.std(numeric_values))
                    }
        
        return statistics
    
    def interpolate_results(self, x: float, y: float, z: float, result_type: str, stage_index: int = -1) -> float:
        """
        在指定点插值计算结果
        
        参数:
            x: X坐标
            y: Y坐标
            z: Z坐标
            result_type: 结果类型
            stage_index: 阶段索引，默认为最后一个阶段
            
        返回:
            float: 插值结果
        """
        if stage_index < 0:
            stage_index = len(self.stages) - 1
        
        if stage_index < 0 or stage_index >= len(self.stages):
            return 0.0
        
        stage = self.stages[stage_index]
        results = stage.get("results", {}).get(result_type)
        
        if not results:
            return 0.0
        
        # 找到最近的节点
        min_distance = float('inf')
        nearest_value = 0.0
        
        for i, node in enumerate(self.nodes):
            node_x = node.get("x", 0.0)
            node_y = node.get("y", 0.0)
            node_z = node.get("z", 0.0)
            
            distance = np.sqrt((x - node_x)**2 + (y - node_y)**2 + (z - node_z)**2)
            
            if distance < min_distance:
                min_distance = distance
                
                if isinstance(results[i], dict):
                    if result_type == "stress":
                        s_xx = results[i].get("xx", 0.0)
                        s_yy = results[i].get("yy", 0.0)
                        s_zz = results[i].get("zz", 0.0)
                        s_xy = results[i].get("xy", 0.0)
                        s_yz = results[i].get("yz", 0.0)
                        s_zx = results[i].get("zx", 0.0)
                        
                        nearest_value = np.sqrt(0.5 * ((s_xx - s_yy)**2 + (s_yy - s_zz)**2 + (s_zz - s_xx)**2 + 
                                                      6 * (s_xy**2 + s_yz**2 + s_zx**2)))
                    else:
                        nearest_value = next(iter(results[i].values()), 0.0)
                else:
                    nearest_value = results[i]
        
        return nearest_value 