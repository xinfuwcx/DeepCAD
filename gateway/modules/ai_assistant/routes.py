from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


router = APIRouter()


class Message(BaseModel):
    text: str
    sender: str
    timestamp: Optional[str] = None


class ConversationRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class ConversationResponse(BaseModel):
    message: str
    conversation_id: str


conversations = {}


def get_or_create_conversation(conversation_id: str = None) -> (str, List[dict]):
    if not conversation_id or conversation_id not in conversations:
        conversation_id = f"conv_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        conversations[conversation_id] = []
    return conversation_id, conversations[conversation_id]


def get_ai_response(user_message: str, history: List[dict]) -> str:
    """
    Enhanced AI response system for DeepCAD workflow.
    This uses rule-based logic for various engineering scenarios.
    """
    lower_message = user_message.lower()
    
    # AI身份和能力询问
    if any(word in lower_message for word in ["你是", "are you", "claude", "ai身份", "什么ai", "哪个ai", "助手身份"]):
        return ("你好！我是DeepCAD专业AI助手，基于先进的大语言模型技术构建。\n\n"
                "🤖 关于我的身份：\n"
                "• 我是专为DeepCAD深基坑CAE平台设计的专业AI助手\n"
                "• 我拥有深厚的土木工程、有限元分析和CAE软件专业知识\n"
                "• 我整合了多种先进AI技术，包括自然语言处理和工程计算能力\n"
                "• 我可以使用多种大语言模型后端（如LLaMA、Qwen等）提供服务\n\n"
                "💡 我的专业能力：\n"
                "🏗️ 几何建模 - 创建基坑、隧道等工程结构\n"
                "🕸️ 网格生成 - 优化网格质量和密度\n"
                "🧮 FEM分析 - 地质力学、固体力学、渗流分析\n"
                "🧠 物理AI - IoT数据驱动的智能优化\n"
                "📊 后处理 - 云图、矢量、动画可视化\n"
                "💻 代码生成 - Kratos、GMSH、PyVista等专业代码\n\n"
                "虽然我使用了先进的AI技术，但我是专门为DeepCAD平台定制的专业助手。您想了解我的哪项具体能力？")
    
    # 问候和帮助
    if any(word in lower_message for word in ["你好", "hello", "hi", "帮助", "help"]) and not any(word in lower_message for word in ["你是", "are you", "claude", "ai身份"]):
        return ("你好！我是DeepCAD AI助手。我可以帮助您：\n\n"
                "🏗️ 几何建模 - 创建基坑、隧道等工程结构\n"
                "🕸️ 网格生成 - 优化网格质量和密度\n"
                "🧮 FEM分析 - 地质力学、固体力学、渗流分析\n"
                "🧠 物理AI - IoT数据驱动的智能优化\n"
                "📊 后处理 - 云图、矢量、动画可视化\n\n"
                "您想从哪个步骤开始？")
    
    # 基坑模型创建
    if any(word in lower_message for word in ["基坑", "excavation", "创建", "create"]) and "模型" in lower_message:
        return ("我来帮您创建基坑模型！请提供以下参数：\n\n"
                "📐 尺寸信息：\n"
                "• 长度 (m)\n"
                "• 宽度 (m) \n"
                "• 深度 (m)\n\n"
                "🏗️ 支护结构：\n"
                "• 地下连续墙厚度\n"
                "• 内支撑系统类型\n"
                "• 锚杆布置方案\n\n"
                "例如：\"创建一个长60m、宽40m、深20m的基坑，地连墙厚1.2m\"")
    
    # 网格生成
    if any(word in lower_message for word in ["网格", "mesh", "生成", "generate"]):
        return ("网格生成建议：\n\n"
                "🔧 参数设置：\n"
                "• 全局网格尺寸: 建议0.5-2.0m\n"
                "• 算法选择: Delaunay(快速) 或 MMG(高质量)\n"
                "• 最小质量: 0.3以上\n\n"
                "⚡ 优化策略：\n"
                "• 关键区域(基坑边坡)使用细网格\n"
                "• 远场区域可适当放大网格\n"
                "• 启用自适应细化提高精度\n\n"
                "需要我帮您设置具体参数吗？")
    
    # FEM分析
    if any(word in lower_message for word in ["fem", "分析", "analysis", "计算", "compute"]):
        return ("FEM分析指导：\n\n"
                "🎯 分析类型选择：\n"
                "• 地质力学分析 - 土体变形和稳定性\n"
                "• 固体力学分析 - 支护结构受力\n"
                "• 渗流分析 - 地下水影响\n\n"
                "⚙️ 关键参数：\n"
                "• 材料参数(弹性模量、泊松比、内摩擦角)\n"
                "• 边界条件(固定约束、荷载)\n"
                "• 施工工序(分步开挖)\n\n"
                "🚀 开始分析前请确保：\n"
                "• 几何模型完整\n"
                "• 网格质量良好\n"
                "• 材料参数合理")
    
    # 物理AI优化
    if any(word in lower_message for word in ["ai", "AI", "人工智能", "优化", "optimization", "物理"]):
        return ("物理AI优化功能：\n\n"
                "🤖 AI驱动优化：\n"
                "• 基于IoT传感器数据的实时监测\n"
                "• PDE约束的物理一致性优化\n"
                "• 多目标优化(位移、应力、成本)\n\n"
                "📊 数据源集成：\n"
                "• 位移传感器: 实时变形监测\n"
                "• 应变计: 结构受力状态\n"
                "• 孔隙水压力: 渗流场变化\n\n"
                "🎯 优化目标：\n"
                "• 最小化基坑变形\n"
                "• 优化支护方案\n"
                "• 预测施工风险\n\n"
                "需要设置哪种优化目标？")
    
    # 后处理
    if any(word in lower_message for word in ["后处理", "可视化", "云图", "矢量", "动画", "切片"]):
        return ("后处理可视化选项：\n\n"
                "🌈 云图显示：\n"
                "• 位移云图 - 查看变形分布\n"
                "• 应力云图 - 分析受力状态\n"
                "• 应变云图 - 检查材料状态\n\n"
                "🏹 矢量场：\n"
                "• 位移矢量 - 变形方向和大小\n"
                "• 渗流矢量 - 地下水流向\n\n"
                "🎬 动画效果：\n"
                "• 施工过程动画\n"
                "• 时程分析结果\n\n"
                "✂️ 切片分析：\n"
                "• XY平面切片 - 平面分布\n"
                "• XZ/YZ剖面 - 深度变化\n\n"
                "您想查看哪种类型的结果？")
    
    # 操作指南
    if any(word in lower_message for word in ["流程", "指南", "步骤", "workflow", "如何"]):
        return ("DeepCAD完整分析流程：\n\n"
                "1️⃣ 几何建模\n"
                "• 创建基坑轮廓\n"
                "• 定义地质分层\n"
                "• 布置支护结构\n\n"
                "2️⃣ 网格划分\n"
                "• 设置网格参数\n"
                "• 生成高质量网格\n"
                "• 检查网格质量\n\n"
                "3️⃣ 材料定义\n"
                "• 土层参数设置\n"
                "• 结构材料属性\n"
                "• 接触面参数\n\n"
                "4️⃣ 分析计算\n"
                "• 选择分析类型\n"
                "• 设置边界条件\n"
                "• 执行FEM或AI分析\n\n"
                "5️⃣ 结果分析\n"
                "• 查看云图和矢量\n"
                "• 提取关键数据\n"
                "• 生成分析报告\n\n"
                "您当前在哪个步骤？需要详细指导吗？")
    
    # 错误和问题解决
    if any(word in lower_message for word in ["错误", "error", "问题", "失败", "failed"]):
        return ("常见问题解决：\n\n"
                "❌ 网格生成失败：\n"
                "• 检查几何是否有重叠\n"
                "• 调大全局网格尺寸\n"
                "• 简化复杂几何特征\n\n"
                "❌ 计算不收敛：\n"
                "• 检查材料参数合理性\n"
                "• 增加最大迭代次数\n"
                "• 放松收敛容差\n\n"
                "❌ 结果异常：\n"
                "• 验证边界条件设置\n"
                "• 检查荷载施加方式\n"
                "• 确认单位制一致性\n\n"
                "请描述具体错误信息，我来帮您诊断！")
    
    # 默认回复 - 更智能的响应
    return (f"我理解您提到了：\"{user_message}\"\n\n"
            "💡 我可以协助您：\n"
            "• 解答DeepCAD操作问题\n"
            "• 提供工程分析建议\n"
            "• 优化计算参数设置\n"
            "• 解释分析结果含义\n\n"
            "请告诉我您遇到的具体问题，或者输入以下关键词获取帮助：\n"
            "\"基坑模型\" \"网格生成\" \"FEM分析\" \"AI优化\" \"后处理\" \"操作流程\"")


@router.post("/ai/chat", response_model=ConversationResponse)
async def chat_with_assistant(request: ConversationRequest):
    """
    Handles a chat message from the user and returns the AI assistant's response.
    """
    conversation_id, history = get_or_create_conversation(request.conversation_id)
    
    user_msg = Message(text=request.message, sender='user', timestamp=datetime.now().isoformat())
    history.append(user_msg.dict())
    
    # Get response from our placeholder AI
    response_text = get_ai_response(request.message, history)
    
    assistant_msg = Message(text=response_text, sender='assistant', timestamp=datetime.now().isoformat())
    history.append(assistant_msg.dict())
    
    return ConversationResponse(
        message=response_text,
        conversation_id=conversation_id
    )


@router.get("/ai/conversations/{conversation_id}", response_model=List[Message])
async def get_conversation_history(conversation_id: str):
    """
    Retrieves the full history of a specific conversation.
    """
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return [Message(**msg) for msg in conversations[conversation_id]] 