"""
开挖DXF处理模块
专门用于从2D DXF文件中提取开挖轮廓和相关信息
"""

import os
import logging
import numpy as np
from typing import List, Tuple, Dict, Optional, Any
from pathlib import Path
import uuid

try:
    import ezdxf
    from ezdxf.math import Vec3
    EZDXF_AVAILABLE = True
except ImportError:
    EZDXF_AVAILABLE = False
    logging.warning("ezdxf not available, excavation DXF processing will be disabled")

from pydantic import BaseModel


class ExcavationContour(BaseModel):
    """开挖轮廓数据结构"""
    id: str
    name: str
    points: List[Tuple[float, float]]  # 2D点列表
    is_closed: bool
    area: float
    centroid: Tuple[float, float]
    layer_name: str
    elevation_hint: Optional[float] = None  # 从文字标注或图层信息获取的高程提示


class ExcavationDXFResult(BaseModel):
    """开挖DXF处理结果"""
    success: bool
    message: str
    contours: List[ExcavationContour]
    total_contours: int
    recommended_contour: Optional[str] = None  # 推荐使用的轮廓ID
    warnings: List[str] = []
    processing_time: float


class ExcavationDXFProcessor:
    """开挖DXF处理器"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # 开挖相关的图层名称关键字
        self.excavation_layer_keywords = [
            '开挖', '基坑', '挖方', 'excavation', 'pit', 'excavate',
            '基础', 'foundation', '轮廓', 'contour', 'boundary'
        ]
        
        # 高程相关的文字关键字
        self.elevation_keywords = [
            '标高', '高程', 'elev', 'elevation', 'level', 'rl'
        ]
    
    def extract_excavation_contours(self, dxf_path: str) -> ExcavationDXFResult:
        """
        从DXF文件中提取开挖轮廓
        
        Args:
            dxf_path: DXF文件路径
            
        Returns:
            ExcavationDXFResult: 处理结果
        """
        start_time = time.time()
        
        if not EZDXF_AVAILABLE:
            return ExcavationDXFResult(
                success=False,
                message="ezdxf库不可用，无法处理DXF文件",
                contours=[],
                total_contours=0,
                processing_time=0
            )
        
        try:
            # 加载DXF文档
            doc = ezdxf.readfile(dxf_path)
            msp = doc.modelspace()
            
            contours = []
            warnings = []
            
            # 1. 提取LWPOLYLINE和POLYLINE
            polylines = list(msp.query('LWPOLYLINE POLYLINE'))
            self.logger.info(f"找到{len(polylines)}个多边形实体")
            
            for i, entity in enumerate(polylines):
                try:
                    contour = self._extract_contour_from_polyline(entity, f"contour_{i}")
                    if contour and len(contour.points) >= 3:  # 至少3个点才能构成有效轮廓
                        contours.append(contour)
                except Exception as e:
                    warnings.append(f"跳过多边形{i}: {str(e)}")
            
            # 2. 提取LINE组合形成的封闭轮廓
            lines = list(msp.query('LINE'))
            if lines:
                closed_contours = self._extract_contours_from_lines(lines)
                contours.extend(closed_contours)
            
            # 3. 分析和推荐最佳轮廓
            recommended_contour = self._recommend_best_contour(contours)
            
            processing_time = time.time() - start_time
            
            return ExcavationDXFResult(
                success=True,
                message=f"成功提取{len(contours)}个开挖轮廓",
                contours=contours,
                total_contours=len(contours),
                recommended_contour=recommended_contour,
                warnings=warnings,
                processing_time=processing_time
            )
            
        except FileNotFoundError:
            return ExcavationDXFResult(
                success=False,
                message=f"DXF文件不存在: {dxf_path}",
                contours=[],
                total_contours=0,
                processing_time=time.time() - start_time
            )
        except Exception as e:
            self.logger.error(f"DXF处理失败: {str(e)}")
            return ExcavationDXFResult(
                success=False,
                message=f"DXF处理失败: {str(e)}",
                contours=[],
                total_contours=0,
                processing_time=time.time() - start_time
            )
    
    def _extract_contour_from_polyline(self, entity, base_name: str) -> Optional[ExcavationContour]:
        """从多边形实体提取轮廓"""
        try:
            # 获取图层名称
            layer_name = entity.dxf.layer if hasattr(entity.dxf, 'layer') else "0"
            
            # 提取2D点
            if entity.dxftype() == 'LWPOLYLINE':
                points = [(p[0], p[1]) for p in entity.get_points(format='xy')]
            else:  # POLYLINE
                points = [(p[0], p[1]) for p in entity.points()]
            
            if len(points) < 3:
                return None
            
            # 检查是否封闭
            is_closed = entity.is_closed if hasattr(entity, 'is_closed') else False
            
            # 如果未封闭但首尾点接近，则认为是封闭的
            if not is_closed:
                first_point = np.array(points[0])
                last_point = np.array(points[-1])
                if np.linalg.norm(first_point - last_point) < 1e-6:
                    is_closed = True
                    points = points[:-1]  # 移除重复的最后一个点
            
            # 计算面积和质心
            area = self._calculate_polygon_area(points)
            centroid = self._calculate_polygon_centroid(points)
            
            # 尝试从图层名获取高程提示
            elevation_hint = self._extract_elevation_from_layer_name(layer_name)
            
            contour_id = f"{base_name}_{uuid.uuid4().hex[:8]}"
            contour_name = self._generate_contour_name(layer_name, area)
            
            return ExcavationContour(
                id=contour_id,
                name=contour_name,
                points=points,
                is_closed=is_closed,
                area=abs(area),
                centroid=centroid,
                layer_name=layer_name,
                elevation_hint=elevation_hint
            )
            
        except Exception as e:
            self.logger.warning(f"提取轮廓失败: {str(e)}")
            return None
    
    def _extract_contours_from_lines(self, lines) -> List[ExcavationContour]:
        """从LINE实体组合中提取封闭轮廓"""
        contours = []
        
        # TODO: 实现LINE连接算法，找出封闭的轮廓
        # 这是一个复杂的算法，需要:
        # 1. 构建点连接图
        # 2. 找到所有封闭环
        # 3. 筛选出合理的开挖轮廓
        
        self.logger.info("LINE组合轮廓提取功能待实现")
        return contours
    
    def _calculate_polygon_area(self, points: List[Tuple[float, float]]) -> float:
        """计算多边形面积（使用鞋带公式）"""
        if len(points) < 3:
            return 0.0
        
        x = [p[0] for p in points]
        y = [p[1] for p in points]
        
        # 鞋带公式
        area = 0.0
        n = len(points)
        for i in range(n):
            j = (i + 1) % n
            area += x[i] * y[j] - x[j] * y[i]
        
        return area / 2.0
    
    def _calculate_polygon_centroid(self, points: List[Tuple[float, float]]) -> Tuple[float, float]:
        """计算多边形质心"""
        if len(points) < 3:
            return (0.0, 0.0)
        
        x = [p[0] for p in points]
        y = [p[1] for p in points]
        
        area = self._calculate_polygon_area(points)
        if abs(area) < 1e-12:
            # 如果面积为0，返回平均坐标
            return (sum(x) / len(x), sum(y) / len(y))
        
        cx = 0.0
        cy = 0.0
        n = len(points)
        
        for i in range(n):
            j = (i + 1) % n
            cross = x[i] * y[j] - x[j] * y[i]
            cx += (x[i] + x[j]) * cross
            cy += (y[i] + y[j]) * cross
        
        cx /= (6.0 * area)
        cy /= (6.0 * area)
        
        return (cx, cy)
    
    def _extract_elevation_from_layer_name(self, layer_name: str) -> Optional[float]:
        """从图层名中提取高程信息"""
        import re
        
        # 匹配数字模式，如 "开挖-2.5" 或 "excavation_elev_123.45"
        patterns = [
            r'(?:elev|elevation|标高|高程)[-_]?(\d+\.?\d*)',
            r'[-_](\d+\.?\d*)(?:m|米)?$',
            r'(\d+\.?\d*)(?:标高|elev)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, layer_name.lower())
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    continue
        
        return None
    
    def _generate_contour_name(self, layer_name: str, area: float) -> str:
        """生成轮廓名称"""
        # 检查是否为开挖相关图层
        is_excavation_layer = any(keyword in layer_name.lower() 
                                 for keyword in self.excavation_layer_keywords)
        
        if is_excavation_layer:
            base_name = "开挖轮廓"
        else:
            base_name = f"轮廓({layer_name})"
        
        return f"{base_name}-{area:.1f}㎡"
    
    def _recommend_best_contour(self, contours: List[ExcavationContour]) -> Optional[str]:
        """推荐最佳的开挖轮廓"""
        if not contours:
            return None
        
        # 评分规则:
        # 1. 封闭轮廓加分
        # 2. 开挖相关图层加分
        # 3. 面积适中的加分（不要太小也不要太大）
        # 4. 有高程提示的加分
        
        best_score = -1
        best_contour_id = None
        
        for contour in contours:
            score = 0
            
            # 封闭轮廓加分
            if contour.is_closed:
                score += 10
            
            # 开挖相关图层加分
            if any(keyword in contour.layer_name.lower() 
                   for keyword in self.excavation_layer_keywords):
                score += 15
            
            # 面积评分（假设合理范围为100-10000平方米）
            if 100 <= contour.area <= 10000:
                score += 10
            elif 10 <= contour.area <= 50000:
                score += 5
            
            # 有高程提示加分
            if contour.elevation_hint is not None:
                score += 5
            
            if score > best_score:
                best_score = score
                best_contour_id = contour.id
        
        return best_contour_id
    
    def validate_contour_for_excavation(self, contour: ExcavationContour) -> Dict[str, Any]:
        """验证轮廓是否适合用于开挖设计"""
        validation = {
            'is_valid': True,
            'issues': [],
            'warnings': [],
            'recommendations': []
        }
        
        # 检查是否封闭
        if not contour.is_closed:
            validation['issues'].append("轮廓未封闭")
            validation['is_valid'] = False
        
        # 检查最小面积
        if contour.area < 1.0:
            validation['issues'].append("轮廓面积过小（<1㎡）")
            validation['is_valid'] = False
        
        # 检查最大面积（防止误选整张图纸边界）
        if contour.area > 100000:
            validation['warnings'].append("轮廓面积很大（>100,000㎡），请确认是否正确")
        
        # 检查点数量
        if len(contour.points) < 3:
            validation['issues'].append("轮廓点数量不足")
            validation['is_valid'] = False
        elif len(contour.points) > 1000:
            validation['warnings'].append("轮廓点数量过多，可能影响性能")
            validation['recommendations'].append("考虑简化轮廓")
        
        return validation


# 导入时间模块
import time