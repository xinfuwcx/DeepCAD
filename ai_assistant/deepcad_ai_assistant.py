"""
DeepCAD AI Assistant - 基于Ollama的本地CAE智能助手
@description 个人电脑友好的AI助手，专为CAE工程师设计
@author 1号首席架构师 & AI系统架构师
@version 1.0.0
@since 2024-07-25
"""

import requests
import json
import asyncio
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
import sys
import os

# 添加项目路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@dataclass
class AIResponse:
    """AI响应数据类"""
    content: str
    confidence: float
    processing_time: float
    model_used: str
    intent: str
    suggestions: List[str] = None

class OllamaEngine:
    """Ollama本地大模型引擎"""
    
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.available_models = []
        self.current_model = "llama3:latest"
        self.check_connection()
    
    def check_connection(self) -> bool:
        """检查Ollama连接状态"""
        try:
            response = requests.get(f"{self.base_url}/api/tags")
            if response.status_code == 200:
                models = response.json().get('models', [])
                self.available_models = [model['name'] for model in models]
                print(f"✅ Ollama连接成功，可用模型: {self.available_models}")
                return True
        except Exception as e:
            print(f"❌ Ollama连接失败: {e}")
            return False
        return False
    
    async def generate_response(self, prompt: str, model: str = None) -> AIResponse:
        """生成AI响应"""
        start_time = datetime.now()
        model = model or self.current_model
        
        try:
            # 确保模型正在运行
            await self.ensure_model_loaded(model)
            
            # 构建请求数据
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "top_k": 40,
                    "repeat_penalty": 1.1
                }
            }
            
            # 发送请求
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                processing_time = (datetime.now() - start_time).total_seconds()
                
                return AIResponse(
                    content=result.get('response', ''),
                    confidence=0.8,  # Ollama不直接提供置信度
                    processing_time=processing_time,
                    model_used=model,
                    intent="general",
                    suggestions=[]
                )
            else:
                raise Exception(f"请求失败: {response.status_code}")
                
        except Exception as e:
            print(f"❌ AI响应生成失败: {e}")
            return AIResponse(
                content=f"抱歉，AI响应生成失败: {str(e)}",
                confidence=0.0,
                processing_time=0.0,
                model_used=model,
                intent="error"
            )
    
    async def ensure_model_loaded(self, model: str):
        """确保模型已加载"""
        try:
            # 检查模型是否运行中
            response = requests.get(f"{self.base_url}/api/ps")
            if response.status_code == 200:
                running_models = response.json().get('models', [])
                model_names = [m.get('name', '') for m in running_models]
                
                if model not in model_names:
                    print(f"🔄 正在加载模型 {model}...")
                    # 发送一个简单请求来加载模型
                    requests.post(
                        f"{self.base_url}/api/generate",
                        json={"model": model, "prompt": "Hello", "stream": False},
                        timeout=30
                    )
        except Exception as e:
            print(f"⚠️ 模型加载检查失败: {e}")

class CAEIntentClassifier:
    """CAE意图识别器"""
    
    CAE_INTENTS = {
        "ai_identity": {
            "keywords": ["你是", "are you", "claude", "ai身份", "什么ai", "哪个ai", "助手身份", "你的身份", "你叫什么", "版本", "4.1"],
            "description": "AI身份和能力询问"
        },
        "code_generation": {
            "keywords": ["生成代码", "写代码", "代码", "脚本", "python", "kratos", "gmsh"],
            "description": "CAE代码生成需求"
        },
        "fem_theory": {
            "keywords": ["有限元", "fem", "理论", "公式", "数学", "推导", "单元"],
            "description": "有限元理论咨询"
        },
        "mesh_advice": {
            "keywords": ["网格", "mesh", "单元", "节点", "质量", "划分"],
            "description": "网格相关建议"
        },
        "solver_config": {
            "keywords": ["求解器", "solver", "参数", "配置", "收敛", "迭代"],
            "description": "求解器配置建议"
        },
        "material_model": {
            "keywords": ["材料", "material", "本构", "模型", "弹性", "塑性"],
            "description": "材料模型相关"
        },
        "post_processing": {
            "keywords": ["后处理", "可视化", "结果", "应力", "位移", "pyvista"],
            "description": "后处理和可视化"
        },
        "optimization": {
            "keywords": ["优化", "optimization", "参数", "设计", "最优"],
            "description": "优化设计问题"
        },
        "troubleshooting": {
            "keywords": ["错误", "问题", "调试", "bug", "失败", "异常"],
            "description": "问题诊断和解决"
        }
    }
    
    def classify_intent(self, user_input: str) -> str:
        """分类用户意图"""
        user_input_lower = user_input.lower()
        
        intent_scores = {}
        for intent, info in self.CAE_INTENTS.items():
            score = 0
            for keyword in info["keywords"]:
                if keyword in user_input_lower:
                    score += 1
            intent_scores[intent] = score
        
        # 返回得分最高的意图
        if max(intent_scores.values()) > 0:
            return max(intent_scores, key=intent_scores.get)
        else:
            return "general"

class CAEPromptEngineer:
    """CAE专业提示词工程师"""
    
    SYSTEM_PROMPTS = {
        "ai_identity": """你是DeepCAD深基坑CAE平台的专业AI助手。当用户询问你的身份、版本或能力时，请明确说明：

1. 你是专为DeepCAD平台设计的CAE专业AI助手
2. 你拥有深厚的土木工程、有限元分析和CAE软件专业知识
3. 你整合了先进的大语言模型技术，能够理解和生成专业的工程内容
4. 你可以使用多种AI模型后端（如LLaMA、Qwen等）提供服务
5. 你的专业领域包括：几何建模、网格生成、FEM分析、物理AI优化、后处理可视化、代码生成等

请友好、准确地介绍自己的身份和能力，避免混淆或误导。如果用户询问特定的AI模型版本（如Claude 4.1），请说明你是基于多种技术构建的DeepCAD专业助手。""",

        "code_generation": """你是一个专业的CAE代码生成专家，特别擅长：
1. Kratos Multiphysics Python脚本编写
2. GMSH网格生成代码
3. PyVista数据可视化
4. NumPy/SciPy数值计算
5. FEM算法实现

请提供完整、可运行的代码，并包含详细注释。代码要符合最佳实践。""",

        "fem_theory": """你是一个有限元方法的理论专家，精通：
1. 有限元理论基础
2. 单元类型和形函数
3. 数值积分和求解方法
4. 非线性问题处理
5. 多物理场耦合

请用清晰的数学表达式和物理解释来回答问题。""",

        "mesh_advice": """你是一个网格生成和质量控制专家，擅长：
1. 网格划分策略
2. 单元质量评估
3. 网格收敛性分析
4. 自适应网格细化
5. 网格优化算法

请提供实用的网格建议和质量控制方法。""",

        "solver_config": """你是一个CAE求解器配置专家，精通：
1. 线性/非线性求解器选择
2. 收敛性控制参数
3. 预处理器配置
4. 并行计算设置
5. 性能优化策略

请提供具体的参数建议和配置方法。""",

        "general": """你是一个全面的CAE工程助手，能够：
1. 回答各种CAE相关问题
2. 提供技术建议和最佳实践
3. 协助解决工程计算问题
4. 推荐相关工具和方法
5. 解释复杂的技术概念

请友好、专业地回答用户问题。"""
    }
    
    def engineer_prompt(self, user_input: str, intent: str) -> str:
        """构建专业提示词"""
        system_prompt = self.SYSTEM_PROMPTS.get(intent, self.SYSTEM_PROMPTS["general"])
        
        # 添加当前时间和上下文
        context = f"""当前时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
工作环境: DeepCAD深基坑CAE系统
可用工具: Kratos 10.3, PyVista, GMSH, Three.js
系统架构: 32GB内存, WebGPU加速

"""
        
        final_prompt = f"""{system_prompt}

{context}

用户问题: {user_input}

请提供专业、详细的回答："""
        
        return final_prompt

class DeepCADAIAssistant:
    """DeepCAD AI助手主类"""
    
    def __init__(self):
        self.ollama_engine = OllamaEngine()
        self.intent_classifier = CAEIntentClassifier()
        self.prompt_engineer = CAEPromptEngineer()
        self.conversation_history = []
        
        print("🤖 DeepCAD AI Assistant 初始化完成")
    
    async def process_query(self, user_input: str, model: str = None) -> AIResponse:
        """处理用户查询"""
        try:
            # 1. 意图识别
            intent = self.intent_classifier.classify_intent(user_input)
            print(f"🎯 识别意图: {intent}")
            
            # 2. 提示词工程
            engineered_prompt = self.prompt_engineer.engineer_prompt(user_input, intent)
            
            # 3. 生成AI响应
            response = await self.ollama_engine.generate_response(
                engineered_prompt, 
                model or self.ollama_engine.current_model
            )
            response.intent = intent
            
            # 4. 添加建议
            response.suggestions = self._generate_suggestions(intent, user_input)
            
            # 5. 记录对话历史
            self.conversation_history.append({
                "timestamp": datetime.now(),
                "user_input": user_input,
                "intent": intent,
                "response": response.content,
                "model": response.model_used
            })
            
            return response
            
        except Exception as e:
            print(f"❌ 查询处理失败: {e}")
            return AIResponse(
                content=f"处理查询时发生错误: {str(e)}",
                confidence=0.0,
                processing_time=0.0,
                model_used="error",
                intent="error"
            )
    
    def _generate_suggestions(self, intent: str, user_input: str) -> List[str]:
        """生成相关建议"""
        suggestions_map = {
            "ai_identity": [
                "想了解我的具体技术能力吗？",
                "需要我演示某个专业功能吗？",
                "想看我如何帮助CAE工程师吗？"
            ],
            "code_generation": [
                "需要看完整的Kratos示例代码吗？",
                "要我解释代码的工作原理吗？",
                "需要添加错误处理代码吗？"
            ],
            "fem_theory": [
                "需要更详细的数学推导吗？",
                "想看相关的代码实现吗？",
                "要我推荐相关文献吗？"
            ],
            "mesh_advice": [
                "需要网格质量检查代码吗？",
                "想了解网格收敛性分析方法吗？",
                "要我生成GMSH脚本吗？"
            ],
            "troubleshooting": [
                "需要查看日志分析方法吗？",
                "要我提供调试步骤吗？",
                "想了解常见错误解决方案吗？"
            ]
        }
        
        return suggestions_map.get(intent, [
            "还有其他问题吗？",
            "需要更详细的解释吗？",
            "要看相关的代码示例吗？"
        ])
    
    def get_available_models(self) -> List[str]:
        """获取可用模型列表"""
        return self.ollama_engine.available_models
    
    def set_model(self, model: str) -> bool:
        """设置当前使用的模型"""
        if model in self.ollama_engine.available_models:
            self.ollama_engine.current_model = model
            return True
        return False
    
    def get_conversation_stats(self) -> Dict[str, Any]:
        """获取对话统计信息"""
        if not self.conversation_history:
            return {"total_queries": 0}
        
        intent_counts = {}
        for conv in self.conversation_history:
            intent = conv.get("intent", "unknown")
            intent_counts[intent] = intent_counts.get(intent, 0) + 1
        
        return {
            "total_queries": len(self.conversation_history),
            "intent_distribution": intent_counts,
            "latest_model": self.conversation_history[-1].get("model", "unknown"),
            "session_start": self.conversation_history[0]["timestamp"] if self.conversation_history else None
        }

# 测试函数
async def test_ai_assistant():
    """测试AI助手功能"""
    assistant = DeepCADAIAssistant()
    
    test_queries = [
        "帮我生成一个Kratos的基本有限元求解脚本",
        "什么是有限元方法的形函数？",
        "如何评估网格质量？",
        "我的计算不收敛，可能是什么原因？"
    ]
    
    for query in test_queries:
        print(f"\n🔍 测试查询: {query}")
        response = await assistant.process_query(query)
        print(f"💬 AI回答: {response.content[:200]}...")
        print(f"📊 意图: {response.intent}, 耗时: {response.processing_time:.2f}s")

if __name__ == "__main__":
    # 运行测试
    asyncio.run(test_ai_assistant())