"""
Agent冷启动系统实现
解决Agent初期缺乏数据和知识的问题
"""

import json
import asyncio
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class LearningPhase(Enum):
    """学习阶段枚举"""
    RULE_BASED = "rule_based"
    TEMPLATE_BASED = "template_based"
    CASE_BASED = "case_based"
    ML_BASED = "ml_based"

@dataclass
class ExpertRule:
    """专家规则数据结构"""
    name: str
    condition: callable
    action: callable
    confidence: float
    domain: str
    priority: int = 1

@dataclass
class EngineeringCase:
    """工程案例数据结构"""
    name: str
    parameters: Dict[str, Any]
    solution: Dict[str, Any]
    lessons_learned: List[str]
    success_rate: float
    domain: str

class ExpertKnowledgeBase:
    """专家知识库"""
    
    def __init__(self):
        self.standards = {}
        self.cases = []
        self.rules = []
        self.best_practices = {}
        
    async def initialize_knowledge_base(self):
        """初始化知识库"""
        await self._load_engineering_standards()
        await self._load_typical_cases()
        await self._load_expert_rules()
        await self._load_best_practices()
        
    async def _load_engineering_standards(self):
        """加载工程标准"""
        self.standards = {
            'JGJ120-2012': {
                'name': '建筑基坑支护技术规程',
                'rules': {
                    'safety_factor': {
                        'stability': 1.35,
                        'bearing_capacity': 2.0,
                        'uplift': 1.1
                    },
                    'deformation_limits': {
                        'horizontal': 'H/1000',
                        'vertical': '30mm'
                    },
                    'support_requirements': {
                        'deep_excavation': {
                            'min_depth': 5.0,
                            'support_type': 'continuous_wall_or_pile'
                        }
                    }
                }
            },
            'GB50007-2011': {
                'name': '建筑地基基础设计规范',
                'rules': {
                    'bearing_capacity': {
                        'clay': 'c*Nc + q*Nq + 0.5*gamma*B*Ngamma',
                        'sand': 'q*Nq + 0.5*gamma*B*Ngamma'
                    },
                    'settlement_limits': {
                        'absolute': 200,  # mm
                        'differential': 'L/300'
                    }
                }
            }
        }
        
    async def _load_typical_cases(self):
        """加载典型案例"""
        self.cases = [
            EngineeringCase(
                name="上海软土深基坑",
                parameters={
                    'depth': 18.0,
                    'width': 25.0,
                    'soil_type': 'soft_clay',
                    'groundwater_level': 2.0,
                    'cohesion': 15.0,
                    'friction_angle': 12.0,
                    'unit_weight': 18.0
                },
                solution={
                    'support_type': 'diaphragm_wall',
                    'wall_thickness': 0.8,
                    'wall_depth': 25.0,
                    'anchor_levels': [3.0, 6.0, 9.0, 12.0],
                    'dewatering': True
                },
                lessons_learned=[
                    "软土地区必须严格控制变形",
                    "地下连续墙厚度不宜小于0.8m",
                    "多层锚杆支撑效果好",
                    "降水措施必不可少"
                ],
                success_rate=0.95,
                domain="deep_excavation"
            ),
            EngineeringCase(
                name="北京砂土中深基坑",
                parameters={
                    'depth': 12.0,
                    'width': 20.0,
                    'soil_type': 'sand',
                    'groundwater_level': 8.0,
                    'cohesion': 5.0,
                    'friction_angle': 30.0,
                    'unit_weight': 19.0
                },
                solution={
                    'support_type': 'soil_nailing',
                    'nail_length': 15.0,
                    'nail_spacing': 1.5,
                    'slope_angle': 70.0,
                    'shotcrete_thickness': 0.1
                },
                lessons_learned=[
                    "砂土地区可采用土钉支护",
                    "注意地下水控制",
                    "开挖坡度要合理",
                    "土钉长度要足够"
                ],
                success_rate=0.90,
                domain="medium_excavation"
            ),
            EngineeringCase(
                name="广州花岗岩残积土基坑",
                parameters={
                    'depth': 8.0,
                    'width': 15.0,
                    'soil_type': 'residual_soil',
                    'groundwater_level': 10.0,
                    'cohesion': 25.0,
                    'friction_angle': 20.0,
                    'unit_weight': 19.5
                },
                solution={
                    'support_type': 'cantilever_pile',
                    'pile_diameter': 0.8,
                    'pile_spacing': 1.2,
                    'pile_length': 12.0,
                    'crown_beam': True
                },
                lessons_learned=[
                    "花岗岩残积土强度较高",
                    "可采用悬臂桩支护",
                    "注意桩间土稳定",
                    "冠梁连接很重要"
                ],
                success_rate=0.92,
                domain="medium_excavation"
            )
        ]
        
    async def _load_expert_rules(self):
        """加载专家规则"""
        self.rules = [
            ExpertRule(
                name="深基坑支护选择",
                condition=lambda params: params.get('depth', 0) > 15,
                action=lambda params: {
                    'recommendation': 'diaphragm_wall',
                    'reason': '深度超过15m，建议采用地下连续墙',
                    'confidence': 0.9,
                    'alternatives': ['pile_wall', 'composite_soil_nailing']
                },
                confidence=0.9,
                domain="support_selection",
                priority=1
            ),
            ExpertRule(
                name="软土变形控制",
                condition=lambda params: params.get('soil_type') == 'soft_clay',
                action=lambda params: {
                    'recommendation': 'strict_deformation_control',
                    'reason': '软土地区需要严格控制变形',
                    'confidence': 0.95,
                    'measures': ['预应力锚杆', '内支撑', '信息化施工']
                },
                confidence=0.95,
                domain="deformation_control",
                priority=1
            ),
            ExpertRule(
                name="地下水控制",
                condition=lambda params: params.get('groundwater_level', 999) < params.get('depth', 0),
                action=lambda params: {
                    'recommendation': 'dewatering_required',
                    'reason': '地下水位高于开挖面，需要降水',
                    'confidence': 0.85,
                    'methods': ['井点降水', '深井降水', '截水帷幕']
                },
                confidence=0.85,
                domain="groundwater_control",
                priority=1
            ),
            ExpertRule(
                name="砂土坡度控制",
                condition=lambda params: params.get('soil_type') == 'sand' and params.get('depth', 0) < 10,
                action=lambda params: {
                    'recommendation': 'slope_protection',
                    'reason': '砂土浅基坑可采用放坡开挖',
                    'confidence': 0.8,
                    'slope_ratio': '1:1.5'
                },
                confidence=0.8,
                domain="slope_design",
                priority=2
            )
        ]
        
    async def _load_best_practices(self):
        """加载最佳实践"""
        self.best_practices = {
            'mesh_generation': {
                'deep_excavation': {
                    'element_size': 'depth/20',
                    'refinement_zones': ['excavation_corners', 'support_connections'],
                    'element_type': 'tetrahedron'
                },
                'medium_excavation': {
                    'element_size': 'depth/15',
                    'refinement_zones': ['excavation_boundary'],
                    'element_type': 'tetrahedron'
                }
            },
            'analysis_settings': {
                'stability_analysis': {
                    'method': 'limit_equilibrium',
                    'safety_factor': 1.35,
                    'convergence_tolerance': 1e-6
                },
                'deformation_analysis': {
                    'method': 'finite_element',
                    'constitutive_model': 'mohr_coulomb',
                    'convergence_tolerance': 1e-4
                }
            }
        }

class RuleBasedDecisionEngine:
    """基于规则的决策引擎"""
    
    def __init__(self, knowledge_base: ExpertKnowledgeBase):
        self.knowledge_base = knowledge_base
        self.rule_weights = {}
        
    async def make_decision(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """基于规则做决策"""
        applicable_rules = await self._find_applicable_rules(parameters)
        
        if not applicable_rules:
            return await self._default_decision(parameters)
        
        # 按优先级和置信度排序
        sorted_rules = sorted(
            applicable_rules,
            key=lambda x: (x.priority, x.confidence),
            reverse=True
        )
        
        # 执行最高优先级规则
        primary_rule = sorted_rules[0]
        decision = primary_rule.action(parameters)
        
        # 收集所有建议
        all_recommendations = []
        for rule in sorted_rules:
            recommendation = rule.action(parameters)
            recommendation['rule_name'] = rule.name
            all_recommendations.append(recommendation)
        
        return {
            'primary_decision': decision,
            'all_recommendations': all_recommendations,
            'confidence': primary_rule.confidence,
            'reasoning': self._generate_reasoning(sorted_rules, parameters)
        }
    
    async def _find_applicable_rules(self, parameters: Dict[str, Any]) -> List[ExpertRule]:
        """找到适用的规则"""
        applicable_rules = []
        
        for rule in self.knowledge_base.rules:
            try:
                if rule.condition(parameters):
                    applicable_rules.append(rule)
            except Exception as e:
                logger.warning(f"规则 {rule.name} 执行失败: {e}")
                continue
        
        return applicable_rules
    
    async def _default_decision(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """默认决策"""
        depth = parameters.get('depth', 0)
        
        if depth > 15:
            return {
                'recommendation': 'deep_excavation_analysis',
                'reason': '深基坑需要详细分析',
                'confidence': 0.6
            }
        elif depth > 5:
            return {
                'recommendation': 'medium_excavation_analysis',
                'reason': '中等深度基坑标准分析',
                'confidence': 0.7
            }
        else:
            return {
                'recommendation': 'shallow_excavation_analysis',
                'reason': '浅基坑简化分析',
                'confidence': 0.8
            }
    
    def _generate_reasoning(self, rules: List[ExpertRule], parameters: Dict[str, Any]) -> List[str]:
        """生成推理过程"""
        reasoning = []
        
        for rule in rules:
            try:
                result = rule.action(parameters)
                reasoning.append(f"{rule.name}: {result.get('reason', '无具体原因')}")
            except Exception as e:
                reasoning.append(f"{rule.name}: 规则执行失败")
        
        return reasoning

class CaseBasedReasoningEngine:
    """基于案例的推理引擎"""
    
    def __init__(self, knowledge_base: ExpertKnowledgeBase):
        self.knowledge_base = knowledge_base
        self.similarity_threshold = 0.7
        
    async def find_similar_cases(self, parameters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """找到相似案例"""
        similar_cases = []
        
        for case in self.knowledge_base.cases:
            similarity = await self._calculate_similarity(parameters, case.parameters)
            
            if similarity >= self.similarity_threshold:
                similar_cases.append({
                    'case': case,
                    'similarity': similarity,
                    'adapted_solution': await self._adapt_solution(case.solution, parameters)
                })
        
        # 按相似度排序
        similar_cases.sort(key=lambda x: x['similarity'], reverse=True)
        
        return similar_cases
    
    async def _calculate_similarity(self, params1: Dict[str, Any], params2: Dict[str, Any]) -> float:
        """计算参数相似度"""
        # 关键参数权重
        weights = {
            'depth': 0.3,
            'width': 0.2,
            'soil_type': 0.2,
            'groundwater_level': 0.15,
            'cohesion': 0.1,
            'friction_angle': 0.05
        }
        
        total_similarity = 0.0
        total_weight = 0.0
        
        for param, weight in weights.items():
            if param in params1 and param in params2:
                if param == 'soil_type':
                    # 分类参数
                    similarity = 1.0 if params1[param] == params2[param] else 0.0
                else:
                    # 数值参数
                    val1 = float(params1[param])
                    val2 = float(params2[param])
                    max_val = max(val1, val2)
                    if max_val > 0:
                        similarity = 1.0 - abs(val1 - val2) / max_val
                    else:
                        similarity = 1.0
                
                total_similarity += similarity * weight
                total_weight += weight
        
        return total_similarity / total_weight if total_weight > 0 else 0.0
    
    async def _adapt_solution(self, original_solution: Dict[str, Any], new_parameters: Dict[str, Any]) -> Dict[str, Any]:
        """适应性调整解决方案"""
        adapted_solution = original_solution.copy()
        
        # 根据深度调整
        if 'depth' in new_parameters:
            depth_ratio = new_parameters['depth'] / 15.0  # 假设原案例深度为15m
            
            if 'wall_thickness' in adapted_solution:
                adapted_solution['wall_thickness'] *= min(depth_ratio, 1.5)
            
            if 'wall_depth' in adapted_solution:
                adapted_solution['wall_depth'] = new_parameters['depth'] * 1.2
        
        return adapted_solution

class BootstrapAgent:
    """冷启动Agent"""
    
    def __init__(self):
        self.knowledge_base = ExpertKnowledgeBase()
        self.rule_engine = None
        self.case_engine = None
        self.current_phase = LearningPhase.RULE_BASED
        self.learning_history = []
        
    async def initialize(self):
        """初始化Agent"""
        await self.knowledge_base.initialize_knowledge_base()
        self.rule_engine = RuleBasedDecisionEngine(self.knowledge_base)
        self.case_engine = CaseBasedReasoningEngine(self.knowledge_base)
        
        logger.info("Bootstrap Agent 初始化完成")
    
    async def make_decision(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """根据当前学习阶段做决策"""
        if self.current_phase == LearningPhase.RULE_BASED:
            return await self._rule_based_decision(parameters)
        elif self.current_phase == LearningPhase.CASE_BASED:
            return await self._case_based_decision(parameters)
        else:
            # 默认使用规则引擎
            return await self._rule_based_decision(parameters)
    
    async def _rule_based_decision(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """基于规则的决策"""
        decision = await self.rule_engine.make_decision(parameters)
        
        # 记录决策历史
        self.learning_history.append({
            'parameters': parameters,
            'decision': decision,
            'phase': self.current_phase,
            'timestamp': asyncio.get_event_loop().time()
        })
        
        return decision
    
    async def _case_based_decision(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """基于案例的决策"""
        similar_cases = await self.case_engine.find_similar_cases(parameters)
        
        if similar_cases:
            best_case = similar_cases[0]
            decision = {
                'recommendation': best_case['adapted_solution'],
                'confidence': best_case['similarity'],
                'reasoning': f"基于相似案例: {best_case['case'].name}",
                'similar_cases': similar_cases[:3]  # 返回前3个最相似案例
            }
        else:
            # 回退到规则引擎
            decision = await self.rule_engine.make_decision(parameters)
            decision['fallback_reason'] = '未找到相似案例，使用规则引擎'
        
        self.learning_history.append({
            'parameters': parameters,
            'decision': decision,
            'phase': self.current_phase,
            'timestamp': asyncio.get_event_loop().time()
        })
        
        return decision
    
    async def learn_from_feedback(self, feedback: Dict[str, Any]):
        """从反馈中学习"""
        # 记录反馈
        self.learning_history.append({
            'type': 'feedback',
            'feedback': feedback,
            'timestamp': asyncio.get_event_loop().time()
        })
        
        # 检查是否需要演进学习阶段
        await self._check_phase_evolution()
    
    async def _check_phase_evolution(self):
        """检查学习阶段演进"""
        data_count = len([h for h in self.learning_history if h.get('type') != 'feedback'])
        
        if data_count > 50 and self.current_phase == LearningPhase.RULE_BASED:
            self.current_phase = LearningPhase.CASE_BASED
            logger.info("学习阶段演进: RULE_BASED -> CASE_BASED")
        elif data_count > 200 and self.current_phase == LearningPhase.CASE_BASED:
            self.current_phase = LearningPhase.ML_BASED
            logger.info("学习阶段演进: CASE_BASED -> ML_BASED")
    
    def get_learning_statistics(self) -> Dict[str, Any]:
        """获取学习统计"""
        return {
            'current_phase': self.current_phase.value,
            'total_decisions': len([h for h in self.learning_history if h.get('type') != 'feedback']),
            'total_feedback': len([h for h in self.learning_history if h.get('type') == 'feedback']),
            'knowledge_base_size': {
                'rules': len(self.knowledge_base.rules),
                'cases': len(self.knowledge_base.cases),
                'standards': len(self.knowledge_base.standards)
            }
        }

# 使用示例
async def main():
    """测试示例"""
    agent = BootstrapAgent()
    await agent.initialize()
    
    # 测试参数
    test_parameters = {
        'depth': 18.0,
        'width': 25.0,
        'soil_type': 'soft_clay',
        'groundwater_level': 2.0,
        'cohesion': 15.0,
        'friction_angle': 12.0
    }
    
    # 做决策
    decision = await agent.make_decision(test_parameters)
    print(f"决策结果: {decision}")
    
    # 获取学习统计
    stats = agent.get_learning_statistics()
    print(f"学习统计: {stats}")

if __name__ == "__main__":
    asyncio.run(main()) 