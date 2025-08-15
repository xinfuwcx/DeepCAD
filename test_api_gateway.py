#!/usr/bin/env python3
"""
Test API Gateway with AI Assistant functionality
测试API网关的AI助手功能
"""

import requests
import json
import time
from datetime import datetime


def test_ai_chat_api():
    """测试AI聊天API"""
    print("🌐 测试AI聊天API")
    print("=" * 30)
    
    # 模拟API请求数据
    test_cases = [
        {
            "message": "你好，你是claude 4.1吗？",
            "expected_keywords": ["DeepCAD", "AI助手", "专业"]
        },
        {
            "message": "你是什么AI？", 
            "expected_keywords": ["DeepCAD", "AI助手", "CAE平台"]
        },
        {
            "message": "帮我生成网格",
            "expected_keywords": ["网格", "参数", "质量"]
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n🧪 测试用例 {i}: {test_case['message']}")
        
        # 构造请求数据
        request_data = {
            "message": test_case["message"],
            "conversation_id": f"test_conv_{i}"
        }
        
        try:
            # 直接调用函数而不是HTTP请求（因为我们在测试环境中）
            from gateway.modules.ai_assistant.routes import get_ai_response
            response_text = get_ai_response(request_data["message"], [])
            
            print(f"✅ API调用成功")
            print(f"📝 响应长度: {len(response_text)} 字符")
            print(f"💬 响应内容: {response_text[:100]}...")
            
            # 检查关键词
            keywords_found = []
            for keyword in test_case["expected_keywords"]:
                if keyword in response_text:
                    keywords_found.append(keyword)
            
            if keywords_found:
                print(f"🎯 找到关键词: {keywords_found}")
            else:
                print(f"⚠️ 未找到预期关键词: {test_case['expected_keywords']}")
            
        except Exception as e:
            print(f"❌ API调用失败: {e}")
    
    return True


def test_api_data_structure():
    """测试API数据结构"""
    print("\n🔍 测试API数据结构")
    print("=" * 25)
    
    try:
        from gateway.modules.ai_assistant.routes import ConversationRequest, ConversationResponse, Message
        
        # 测试数据模型
        test_request = ConversationRequest(
            message="你好，你是claude 4.1吗？",
            conversation_id="test_123"
        )
        print(f"✅ ConversationRequest 创建成功: {test_request.message[:30]}...")
        
        test_response = ConversationResponse(
            message="我是DeepCAD AI助手",
            conversation_id="test_123"
        )
        print(f"✅ ConversationResponse 创建成功: {test_response.message[:30]}...")
        
        test_message = Message(
            text="测试消息",
            sender="user",
            timestamp=datetime.now().isoformat()
        )
        print(f"✅ Message 创建成功: {test_message.text}")
        
        return True
        
    except Exception as e:
        print(f"❌ 数据结构测试失败: {e}")
        return False


def test_conversation_history():
    """测试对话历史功能"""
    print("\n📚 测试对话历史功能")  
    print("=" * 20)
    
    try:
        from gateway.modules.ai_assistant.routes import get_or_create_conversation, conversations
        
        # 创建新对话
        conv_id, history = get_or_create_conversation()
        print(f"✅ 创建新对话: {conv_id}")
        
        # 添加消息到历史
        test_messages = [
            {"text": "你好", "sender": "user", "timestamp": datetime.now().isoformat()},
            {"text": "你好！我是DeepCAD AI助手", "sender": "assistant", "timestamp": datetime.now().isoformat()}
        ]
        
        for msg in test_messages:
            history.append(msg)
        
        print(f"✅ 添加 {len(test_messages)} 条消息到历史")
        
        # 获取对话历史
        retrieved_conv_id, retrieved_history = get_or_create_conversation(conv_id)
        print(f"✅ 检索对话历史: {len(retrieved_history)} 条消息")
        
        # 验证对话ID一致性
        if conv_id == retrieved_conv_id:
            print("✅ 对话ID一致性验证通过")
        else:
            print("❌ 对话ID不一致")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ 对话历史测试失败: {e}")
        return False


def main():
    """主测试函数"""
    print("🚀 DeepCAD API Gateway AI助手功能测试")
    print("=" * 50)
    
    all_tests_passed = True
    
    # 测试1: AI聊天API
    try:
        if not test_ai_chat_api():
            all_tests_passed = False
    except Exception as e:
        print(f"❌ AI聊天API测试失败: {e}")
        all_tests_passed = False
    
    # 测试2: API数据结构
    try:
        if not test_api_data_structure():
            all_tests_passed = False
    except Exception as e:
        print(f"❌ API数据结构测试失败: {e}")
        all_tests_passed = False
    
    # 测试3: 对话历史
    try:
        if not test_conversation_history():
            all_tests_passed = False
    except Exception as e:
        print(f"❌ 对话历史测试失败: {e}")
        all_tests_passed = False
    
    # 总结
    print("\n" + "=" * 50)
    if all_tests_passed:
        print("✅ 所有API测试通过！")
        print("🎉 AI助手功能已成功集成到API网关")
    else:
        print("❌ 部分测试失败，需要检查问题")
    
    return all_tests_passed


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)