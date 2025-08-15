#!/usr/bin/env python3
"""
Test script for AI assistant identity handling
测试AI助手身份识别功能
"""

import asyncio
import sys
import os

# 添加项目路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ai_assistant.deepcad_ai_assistant import DeepCADAIAssistant, CAEIntentClassifier
from gateway.modules.ai_assistant.routes import get_ai_response


def test_intent_classification():
    """测试意图识别功能"""
    print("🔍 测试意图识别功能...")
    
    classifier = CAEIntentClassifier()
    
    test_cases = [
        ("你好，你是claude 4.1吗？", "ai_identity"),
        ("你是什么AI？", "ai_identity"),
        ("你的身份是什么", "ai_identity"),
        ("你好", "general"),
        ("帮我生成代码", "code_generation"),
        ("网格质量怎么样", "mesh_advice")
    ]
    
    for user_input, expected_intent in test_cases:
        detected_intent = classifier.classify_intent(user_input)
        status = "✅" if detected_intent == expected_intent else "❌"
        print(f"{status} '{user_input}' -> {detected_intent} (期望: {expected_intent})")


def test_gateway_response():
    """测试网关路由响应"""
    print("\n🌐 测试网关路由响应...")
    
    test_questions = [
        "你好，你是claude 4.1吗？",
        "你是什么AI助手？",
        "你的身份是什么？",
        "are you Claude?"
    ]
    
    for question in test_questions:
        response = get_ai_response(question, [])
        print(f"\n❓ 问题: {question}")
        print(f"💬 回答: {response[:100]}...")


async def test_full_ai_assistant():
    """测试完整AI助手功能（需要Ollama服务）"""
    print("\n🤖 测试完整AI助手功能...")
    
    try:
        assistant = DeepCADAIAssistant()
        
        # 测试身份问题
        test_question = "你好，你是claude 4.1吗？"
        response = await assistant.process_query(test_question)
        
        print(f"❓ 问题: {test_question}")
        print(f"🎯 识别意图: {response.intent}")
        print(f"💬 AI回答: {response.content[:200]}...")
        print(f"📊 处理时间: {response.processing_time:.2f}s")
        print(f"🔧 建议: {response.suggestions}")
        
    except Exception as e:
        print(f"⚠️ Ollama测试跳过 (需要启动Ollama服务): {e}")


def main():
    """主测试函数"""
    print("🚀 DeepCAD AI助手身份测试")
    print("=" * 50)
    
    # 测试1：意图识别
    test_intent_classification()
    
    # 测试2：网关响应
    test_gateway_response()
    
    # 测试3：完整AI助手（异步）
    asyncio.run(test_full_ai_assistant())
    
    print("\n✅ 测试完成！")


if __name__ == "__main__":
    main()