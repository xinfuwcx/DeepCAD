"""
DeepCAD AI Assistant Streamlit UI
@description 炫酷的AI助手前端界面
@author 1号首席架构师 & AI系统架构师
@version 1.0.0
"""

import streamlit as st
import asyncio
import json
import time
from datetime import datetime
from deepcad_ai_assistant import DeepCADAIAssistant, AIResponse
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd

# 页面配置
st.set_page_config(
    page_title="🤖 DeepCAD AI Assistant",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 自定义CSS样式
st.markdown("""
<style>
    .main-header {
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
        border-left: 4px solid #667eea;
    }
    
    .user-message {
        background-color: #f0f2f6;
        border-left-color: #ff6b6b;
    }
    
    .assistant-message {
        background-color: #e8f4f8;
        border-left-color: #4ecdc4;
    }
    
    .stats-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1rem;
        border-radius: 10px;
        color: white;
        text-align: center;
    }
    
    .intent-badge {
        background-color: #667eea;
        color: white;
        padding: 0.2em 0.6em;
        border-radius: 20px;
        font-size: 0.8em;
    }
</style>
""", unsafe_allow_html=True)

# 初始化AI助手
@st.cache_resource
def initialize_ai_assistant():
    """初始化AI助手（缓存资源）"""
    return DeepCADAIAssistant()

def main():
    """主界面"""
    
    # 主标题
    st.markdown("""
    <div class="main-header">
        <h1>🤖 DeepCAD AI Assistant</h1>
        <p>Your Intelligent CAE Companion - Powered by Ollama</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 初始化AI助手
    try:
        ai_assistant = initialize_ai_assistant()
    except Exception as e:
        st.error(f"❌ AI助手初始化失败: {e}")
        st.stop()
    
    # 侧边栏
    with st.sidebar:
        st.header("🛠️ 控制面板")
        
        # 模型选择
        available_models = ai_assistant.get_available_models()
        if available_models:
            selected_model = st.selectbox(
                "选择AI模型",
                available_models,
                index=0 if available_models else None
            )
            ai_assistant.set_model(selected_model)
        else:
            st.warning("⚠️ 没有检测到可用模型")
        
        st.divider()
        
        # 对话统计
        st.header("📊 对话统计")
        stats = ai_assistant.get_conversation_stats()
        
        col1, col2 = st.columns(2)
        with col1:
            st.metric("总对话数", stats.get("total_queries", 0))
        with col2:
            st.metric("当前模型", stats.get("latest_model", "未知")[:10] + "...")
        
        # 意图分布图
        if stats.get("intent_distribution"):
            intent_df = pd.DataFrame(
                list(stats["intent_distribution"].items()),
                columns=["意图", "次数"]
            )
            fig = px.pie(
                intent_df, 
                values="次数", 
                names="意图",
                title="对话意图分布"
            )
            fig.update_traces(textposition='inside', textinfo='percent+label')
            st.plotly_chart(fig, use_container_width=True)
        
        st.divider()
        
        # CAE工具快速访问
        st.header("🔧 CAE工具")
        if st.button("🏗️ Kratos脚本生成"):
            st.session_state.quick_prompt = "帮我生成一个基本的Kratos有限元求解脚本"
        
        if st.button("🕸️ 网格质量检查"):
            st.session_state.quick_prompt = "如何检查和优化有限元网格质量？"
        
        if st.button("📊 结果可视化"):
            st.session_state.quick_prompt = "帮我生成PyVista结果可视化代码"
        
        if st.button("🔍 收敛性诊断"):
            st.session_state.quick_prompt = "我的CAE计算不收敛，如何诊断问题？"
    
    # 主聊天界面
    col1, col2 = st.columns([3, 1])
    
    with col1:
        st.header("💬 AI对话")
        
        # 初始化对话历史
        if "messages" not in st.session_state:
            st.session_state.messages = [
                {
                    "role": "assistant",
                    "content": "你好！我是DeepCAD AI助手 🤖\n\n我可以帮助你：\n- 🔧 生成CAE代码\n- 📚 解答有限元理论\n- 🕸️ 网格划分建议\n- 🔍 问题诊断解决\n- 📊 数据可视化\n\n有什么CAE问题尽管问我！",
                    "intent": "greeting",
                    "timestamp": datetime.now(),
                    "confidence": 1.0,
                    "processing_time": 0.0
                }
            ]
        
        # 显示对话历史
        for i, message in enumerate(st.session_state.messages):
            with st.chat_message(message["role"]):
                st.markdown(message["content"])
                
                # 显示AI响应的元信息
                if message["role"] == "assistant" and i > 0:
                    col_a, col_b, col_c = st.columns(3)
                    with col_a:
                        st.caption(f"🎯 意图: {message.get('intent', 'unknown')}")
                    with col_b:
                        st.caption(f"⏱️ 耗时: {message.get('processing_time', 0):.2f}s")
                    with col_c:
                        confidence = message.get('confidence', 0)
                        st.caption(f"🎪 置信度: {confidence:.1%}")
        
        # 用户输入
        user_input = st.chat_input("输入你的CAE问题...")
        
        # 处理快速提示
        if "quick_prompt" in st.session_state:
            user_input = st.session_state.quick_prompt
            del st.session_state.quick_prompt
        
        # 处理用户输入
        if user_input:
            # 添加用户消息
            st.session_state.messages.append({
                "role": "user",
                "content": user_input,
                "timestamp": datetime.now()
            })
            
            # 显示用户消息
            with st.chat_message("user"):
                st.markdown(user_input)
            
            # 生成AI响应
            with st.chat_message("assistant"):
                with st.spinner("🤖 AI正在思考中..."):
                    try:
                        # 运行异步函数
                        response = asyncio.run(ai_assistant.process_query(user_input))
                        
                        # 显示响应内容
                        st.markdown(response.content)
                        
                        # 显示响应元信息
                        col_a, col_b, col_c = st.columns(3)
                        with col_a:
                            st.caption(f"🎯 意图: {response.intent}")
                        with col_b:
                            st.caption(f"⏱️ 耗时: {response.processing_time:.2f}s")
                        with col_c:
                            st.caption(f"🎪 置信度: {response.confidence:.1%}")
                        
                        # 显示建议
                        if response.suggestions:
                            st.info("💡 相关建议：\n" + "\n".join([f"• {s}" for s in response.suggestions]))
                        
                        # 添加AI响应到历史
                        st.session_state.messages.append({
                            "role": "assistant",
                            "content": response.content,
                            "intent": response.intent,
                            "timestamp": datetime.now(),
                            "confidence": response.confidence,
                            "processing_time": response.processing_time,
                            "suggestions": response.suggestions
                        })
                        
                    except Exception as e:
                        st.error(f"❌ AI响应生成失败: {e}")
                        st.session_state.messages.append({
                            "role": "assistant",
                            "content": f"抱歉，处理你的问题时出现了错误：{str(e)}",
                            "intent": "error",
                            "timestamp": datetime.now(),
                            "confidence": 0.0,
                            "processing_time": 0.0
                        })
            
            # 刷新页面以显示新消息
            st.rerun()
    
    with col2:
        st.header("🎯 CAE专业领域")
        
        # CAE专业领域指南
        with st.expander("🔧 代码生成", expanded=False):
            st.write("""
            **支持的代码类型：**
            - Kratos Python脚本
            - GMSH网格生成
            - PyVista可视化
            - NumPy数值计算
            - FEM算法实现
            """)
        
        with st.expander("📚 理论咨询", expanded=False):
            st.write("""
            **涵盖的理论领域：**
            - 有限元基础理论
            - 单元类型和形函数
            - 数值积分方法
            - 非线性分析
            - 多物理场耦合
            """)
        
        with st.expander("🕸️ 网格建议", expanded=False):
            st.write("""
            **网格相关服务：**
            - 网格划分策略
            - 质量评估方法
            - 收敛性分析
            - 自适应细化
            - 优化算法
            """)
        
        with st.expander("🔍 问题诊断", expanded=False):
            st.write("""
            **常见问题类型：**
            - 收敛性问题
            - 数值不稳定
            - 计算错误诊断
            - 性能优化
            - 参数调优
            """)
        
        # 实时系统状态
        st.header("🖥️ 系统状态")
        
        # Ollama连接状态
        if ai_assistant.ollama_engine.check_connection():
            st.success("🟢 Ollama服务正常")
        else:
            st.error("🔴 Ollama服务异常")
        
        # 当前模型信息
        current_model = ai_assistant.ollama_engine.current_model
        st.info(f"🤖 当前模型: {current_model}")
        
        # 系统资源（模拟）
        import psutil
        cpu_usage = psutil.cpu_percent()
        memory_usage = psutil.virtual_memory().percent
        
        # 创建仪表盘
        fig = go.Figure()
        
        fig.add_trace(go.Indicator(
            mode="gauge+number",
            value=cpu_usage,
            domain={'x': [0, 0.5], 'y': [0.5, 1]},
            title={'text': "CPU"},
            gauge={'axis': {'range': [None, 100]},
                   'bar': {'color': "darkblue"},
                   'steps': [{'range': [0, 50], 'color': "lightgray"},
                            {'range': [50, 100], 'color': "gray"}],
                   'threshold': {'line': {'color': "red", 'width': 4},
                               'thickness': 0.75, 'value': 90}}))
        
        fig.add_trace(go.Indicator(
            mode="gauge+number",
            value=memory_usage,
            domain={'x': [0.5, 1], 'y': [0.5, 1]},
            title={'text': "Memory"},
            gauge={'axis': {'range': [None, 100]},
                   'bar': {'color': "darkgreen"},
                   'steps': [{'range': [0, 50], 'color': "lightgray"},
                            {'range': [50, 100], 'color': "gray"}],
                   'threshold': {'line': {'color': "red", 'width': 4},
                               'thickness': 0.75, 'value': 90}}))
        
        fig.update_layout(height=300, showlegend=False)
        st.plotly_chart(fig, use_container_width=True)

# 运行应用
if __name__ == "__main__":
    main()