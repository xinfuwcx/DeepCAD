"""
DeepCAD AI Assistant 测试脚本
"""

import requests
import json
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime

class SimpleOllamaEngine:
    """简化的Ollama引擎"""
    
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
                print(f"Ollama连接成功，可用模型: {self.available_models}")
                return True
        except Exception as e:
            print(f"Ollama连接失败: {e}")
            return False
        return False
    
    async def generate_response(self, prompt: str) -> str:
        """生成AI响应"""
        try:
            payload = {
                "model": self.current_model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                }
            }
            
            print(f"正在调用模型 {self.current_model}...")
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('response', '')
            else:
                return f"请求失败: {response.status_code}"
                
        except Exception as e:
            return f"AI响应生成失败: {str(e)}"

class CAEIntentClassifier:
    """CAE意图识别器"""
    
    CAE_INTENTS = {
        "code_generation": ["代码", "生成", "脚本", "python", "kratos"],
        "fem_theory": ["有限元", "fem", "理论", "公式", "数学"],
        "mesh_advice": ["网格", "mesh", "单元", "节点", "质量"],
        "solver_config": ["求解器", "solver", "参数", "配置", "收敛"],
        "general": ["你好", "帮助", "什么", "怎么", "介绍"]
    }
    
    def classify_intent(self, user_input: str) -> str:
        """分类用户意图"""
        user_input_lower = user_input.lower()
        
        for intent, keywords in self.CAE_INTENTS.items():
            for keyword in keywords:
                if keyword in user_input_lower:
                    return intent
        
        return "general"

class SimpleCAEAssistant:
    """简化的CAE助手"""
    
    def __init__(self):
        self.ollama_engine = SimpleOllamaEngine()
        self.intent_classifier = CAEIntentClassifier()
        print("DeepCAD AI Assistant 初始化完成")
    
    def create_cae_prompt(self, user_input: str, intent: str) -> str:
        """创建CAE专业提示词"""
        
        system_prompts = {
            "code_generation": """你是一个专业的CAE代码生成专家。请帮助用户生成完整、可运行的代码，特别是：
- Kratos Multiphysics Python脚本
- GMSH网格生成代码  
- PyVista数据可视化
- FEM算法实现

请提供代码并包含详细注释。""",
            
            "fem_theory": """你是一个有限元方法的理论专家。请用清晰的解释和数学表达式来回答问题，涵盖：
- 有限元理论基础
- 单元类型和形函数
- 数值积分和求解方法
- 非线性问题处理""",
            
            "mesh_advice": """你是一个网格生成专家。请提供关于网格的专业建议：
- 网格划分策略
- 单元质量评估
- 网格收敛性分析
- 网格优化方法""",
            
            "general": """你是一个友好的CAE工程助手，能够回答各种CAE相关问题并提供专业建议。"""
        }
        
        system_prompt = system_prompts.get(intent, system_prompts["general"])
        
        return f"""{system_prompt}

当前环境: DeepCAD深基坑CAE系统
可用工具: Kratos 10.3, PyVista, GMSH, Three.js

用户问题: {user_input}

请提供专业、详细的回答："""
    
    async def process_query(self, user_input: str) -> Dict:
        """处理用户查询"""
        start_time = datetime.now()
        
        # 意图识别
        intent = self.intent_classifier.classify_intent(user_input)
        print(f"识别意图: {intent}")
        
        # 创建专业提示词
        prompt = self.create_cae_prompt(user_input, intent)
        
        # 生成AI响应
        response_content = await self.ollama_engine.generate_response(prompt)
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return {
            "content": response_content,
            "intent": intent,
            "processing_time": processing_time,
            "model": self.ollama_engine.current_model
        }

async def test_cae_assistant():
    """测试CAE助手"""
    assistant = SimpleCAEAssistant()
    
    test_queries = [
        "你好，你能帮我做什么？",
        "帮我生成一个Kratos的基本有限元求解脚本",
        "什么是有限元方法的形函数？",
        "如何评估网格质量？"
    ]
    
    for query in test_queries:
        print(f"\n{'='*50}")
        print(f"用户问题: {query}")
        print(f"{'='*50}")
        
        response = await assistant.process_query(query)
        
        print(f"意图: {response['intent']}")
        print(f"模型: {response['model']}")
        print(f"处理时间: {response['processing_time']:.2f}s")
        print(f"\nAI回答:\n{response['content']}")
        print(f"\n{'='*50}")

if __name__ == "__main__":
    asyncio.run(test_cae_assistant())