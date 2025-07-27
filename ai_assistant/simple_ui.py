"""
DeepCAD AI Assistant - 简化版UI
基于Ollama的本地CAE智能助手
"""

import streamlit as st
import requests
import json
import asyncio
import time
from datetime import datetime

# 页面配置
st.set_page_config(
    page_title="🤖 DeepCAD AI Assistant",
    page_icon="🤖",
    layout="wide"
)

# 自定义CSS
st.markdown("""
<style>
    .main-title {
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        padding: 1rem;
        border-radius: 10px;
        color: white;
        text-align: center;
        margin-bottom: 2rem;
    }
    
    .chat-message {
        padding: 1rem;
        border-radius: 10px;
        margin: 1rem 0;
    }
    
    .user-message {
        background-color: #f0f2f6;
        border-left: 4px solid #ff6b6b;
    }
    
    .assistant-message {
        background-color: #e8f4f8;
        border-left: 4px solid #4ecdc4;
    }
</style>
""", unsafe_allow_html=True)

class SimpleOllamaClient:
    """简化的Ollama客户端"""
    
    def __init__(self, base_url="http://localhost:11434"):
        self.base_url = base_url
        self.available_models = []
        self.check_connection()
    
    def check_connection(self):
        """检查连接"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get('models', [])
                self.available_models = [model['name'] for model in models]
                return True
        except:
            pass
        return False
    
    def generate_response(self, prompt, model="llama3:latest"):
        """生成响应"""
        try:
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                }
            }
            
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
            return f"生成响应失败: {str(e)}"

def classify_cae_intent(user_input):
    """简单的CAE意图分类"""
    intents = {
        "code_generation": ["代码", "生成", "脚本", "python", "kratos", "gmsh", "pyvista"],
        "fem_theory": ["有限元", "fem", "理论", "公式", "数学", "推导"],
        "mesh_advice": ["网格", "mesh", "单元", "节点", "质量", "划分"],
        "solver_config": ["求解器", "solver", "参数", "配置", "收敛"],
        "optimization": ["优化", "optimization", "参数", "设计"],
        "troubleshooting": ["错误", "问题", "调试", "失败", "异常"],
        "visualization": ["可视化", "visualization", "显示", "图形", "结果"]
    }
    
    user_lower = user_input.lower()
    for intent, keywords in intents.items():
        if any(keyword in user_lower for keyword in keywords):
            return intent
    return "general"

def create_cae_prompt(user_input, intent):
    """创建CAE专业提示词"""
    system_prompts = {
        "code_generation": """你是一个专业的CAE代码生成专家。请帮助用户生成完整、可运行的代码，特别擅长：
- Kratos Multiphysics Python脚本编写
- GMSH网格生成代码
- PyVista数据可视化代码
- NumPy/SciPy数值计算代码

请提供代码并包含详细注释。""",

        "fem_theory": """你是一个有限元方法的理论专家。请用清晰的解释来回答问题：
- 有限元理论基础
- 单元类型和形函数
- 数值积分和求解方法
- 非线性问题处理

请用通俗易懂的语言解释复杂概念。""",

        "mesh_advice": """你是一个网格生成专家。请提供专业的网格建议：
- 网格划分策略
- 单元质量评估
- 网格收敛性分析
- 网格优化方法

请给出实用的建议和最佳实践。""",

        "solver_config": """你是一个CAE求解器专家。请提供求解器配置建议：
- 线性/非线性求解器选择
- 收敛性控制参数
- 预处理器配置
- 性能优化策略

请提供具体的参数建议和配置方法。""",

        "optimization": """你是一个工程优化专家。请提供优化设计建议：
- 优化算法选择
- 设计变量定义
- 约束条件设置
- 多目标优化策略

请给出系统性的优化方法。""",

        "troubleshooting": """你是一个CAE问题诊断专家。请帮助分析和解决问题：
- 收敛性问题诊断
- 错误信息解读
- 调试方法指导
- 解决方案推荐

请提供系统性的问题解决思路。""",

        "visualization": """你是一个科学可视化专家。请提供可视化建议：
- PyVista可视化技术
- 结果后处理方法
- 图表设计原则
- 交互式可视化

请提供实用的可视化代码和技巧。""",

        "general": """你是一个友好的CAE工程助手，能够回答各种CAE相关问题并提供专业建议。请用专业但易懂的语言回答。"""
    }
    
    system_prompt = system_prompts.get(intent, system_prompts["general"])
    
    return f"""{system_prompt}

当前环境: DeepCAD深基坑CAE系统
可用工具: Kratos 10.3, PyVista, GMSH, Three.js, WebGPU优化

用户问题: {user_input}

请提供专业、详细的回答："""

def main():
    """主界面"""
    
    # 标题
    st.markdown("""
    <div class="main-title">
        <h1>🤖 DeepCAD AI Assistant</h1>
        <p>Your Intelligent CAE Companion - Powered by Ollama</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 初始化Ollama客户端
    if 'ollama_client' not in st.session_state:
        st.session_state.ollama_client = SimpleOllamaClient()
    
    # 侧边栏
    with st.sidebar:
        st.header("🛠️ 控制面板")
        
        # 连接状态
        client = st.session_state.ollama_client
        if client.check_connection():
            st.success("🟢 Ollama连接正常")
            
            # 模型选择
            if client.available_models:
                selected_model = st.selectbox(
                    "选择AI模型",
                    client.available_models,
                    index=0
                )
            else:
                st.warning("⚠️ 没有检测到可用模型")
                selected_model = "llama3:latest"
        else:
            st.error("🔴 Ollama连接失败")
            st.info("请确保Ollama服务正在运行")
            selected_model = "llama3:latest"
        
        st.divider()
        
        # CAE快速工具
        st.header("🔧 CAE快速工具")
        
        quick_prompts = {
            "🏗️ Kratos脚本": "帮我生成一个基本的Kratos有限元求解脚本",
            "🕸️ 网格质量": "如何检查和优化有限元网格质量？",
            "📊 结果可视化": "帮我生成PyVista结果可视化代码",
            "🔍 收敛诊断": "我的CAE计算不收敛，如何诊断问题？",
            "⚙️ 求解器配置": "如何配置Kratos求解器参数？",
            "🎯 参数优化": "如何进行CAE参数优化设计？"
        }
        
        for button_text, prompt in quick_prompts.items():
            if st.button(button_text):
                st.session_state.quick_prompt = prompt
        
        st.divider()
        
        # 会话统计
        st.header("📊 会话信息")
        if 'messages' in st.session_state:
            message_count = len([m for m in st.session_state.messages if m['role'] == 'user'])
            st.metric("对话轮数", message_count)
        
        st.info(f"当前模型: {selected_model}")
    
    # 主聊天区域
    st.header("💬 AI对话")
    
    # 初始化消息历史
    if "messages" not in st.session_state:
        st.session_state.messages = [
            {
                "role": "assistant",
                "content": """你好！我是DeepCAD AI助手 🤖

我可以帮助你：
- 🔧 生成CAE代码 (Kratos, GMSH, PyVista)
- 📚 解答有限元理论问题
- 🕸️ 提供网格划分建议
- 🔍 诊断计算问题
- 📊 创建数据可视化
- ⚙️ 优化求解器配置

有什么CAE问题尽管问我！""",
                "intent": "greeting",
                "timestamp": datetime.now()
            }
        ]
    
    # 显示消息历史
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
            
            # 显示AI响应的元信息
            if message["role"] == "assistant" and "intent" in message:
                col1, col2 = st.columns(2)
                with col1:
                    st.caption(f"🎯 意图: {message.get('intent', 'unknown')}")
                with col2:
                    if "processing_time" in message:
                        st.caption(f"⏱️ 耗时: {message['processing_time']:.1f}s")
    
    # 处理快速提示
    user_input = None
    if 'quick_prompt' in st.session_state:
        user_input = st.session_state.quick_prompt
        del st.session_state.quick_prompt
    
    # 用户输入
    if not user_input:
        user_input = st.chat_input("输入你的CAE问题...")
    
    if user_input:
        # 显示用户消息
        with st.chat_message("user"):
            st.markdown(user_input)
        
        # 添加用户消息到历史
        st.session_state.messages.append({
            "role": "user",
            "content": user_input,
            "timestamp": datetime.now()
        })
        
        # 生成AI响应
        with st.chat_message("assistant"):
            with st.spinner("🤖 AI正在思考中..."):
                start_time = time.time()
                
                # 分类意图
                intent = classify_cae_intent(user_input)
                
                # 创建专业提示词
                prompt = create_cae_prompt(user_input, intent)
                
                # 生成响应
                response = client.generate_response(prompt, selected_model)
                
                processing_time = time.time() - start_time
                
                # 显示响应
                st.markdown(response)
                
                # 显示元信息
                col1, col2 = st.columns(2)
                with col1:
                    st.caption(f"🎯 意图: {intent}")
                with col2:
                    st.caption(f"⏱️ 耗时: {processing_time:.1f}s")
                
                # 添加AI响应到历史
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": response,
                    "intent": intent,
                    "processing_time": processing_time,
                    "timestamp": datetime.now()
                })
        
        # 自动刷新以显示新消息
        st.rerun()
    
    # 页面底部信息
    st.divider()
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.info("🔗 基于Ollama本地部署")
    with col2:
        st.info("🎯 专为CAE工程师设计") 
    with col3:
        st.info("🚀 集成DeepCAD优化系统")

if __name__ == "__main__":
    main()