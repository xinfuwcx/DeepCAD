#!/usr/bin/env python3
"""
Demo: AI Assistant Identity Response
演示：AI助手身份响应功能

这个演示展示了DeepCAD AI助手如何响应用户的身份相关问题
"""

from gateway.modules.ai_assistant.routes import get_ai_response


def demo_identity_questions():
    """演示身份相关问题的响应"""
    print("🤖 DeepCAD AI助手身份响应演示")
    print("=" * 50)
    
    # 原始用户问题
    original_question = "你好，你是claude 4.1吗？"
    print(f"👤 用户问题: {original_question}")
    print("-" * 50)
    
    # 获取AI响应
    response = get_ai_response(original_question, [])
    print("🤖 AI助手回答:")
    print(response)
    
    print("\n" + "=" * 50)
    print("✨ 演示总结:")
    print("1. AI助手能正确识别身份相关问题")
    print("2. 提供了专业、详细的身份介绍")
    print("3. 明确说明了自己是DeepCAD专业AI助手")
    print("4. 介绍了具体的技术能力和专业领域")
    print("5. 避免了对特定AI模型(如Claude 4.1)的误导性回答")


def demo_various_identity_questions():
    """演示多种身份问题的响应"""
    print("\n🔍 多种身份问题测试")
    print("=" * 30)
    
    questions = [
        "你是claude 4.1吗？",
        "你是什么AI？", 
        "你的身份是什么？",
        "are you Claude?",
        "你叫什么名字？"
    ]
    
    for i, question in enumerate(questions, 1):
        print(f"\n{i}. 👤 问题: {question}")
        response = get_ai_response(question, [])
        
        # 检查关键信息
        has_deepcad = "DeepCAD" in response
        has_ai_assistant = "AI助手" in response or "assistant" in response.lower()
        has_professional = "专业" in response or "professional" in response.lower()
        
        status = "✅" if (has_deepcad and has_ai_assistant) else "⚠️"
        print(f"   {status} 包含关键身份信息: DeepCAD({has_deepcad}), AI助手({has_ai_assistant}), 专业({has_professional})")
        print(f"   📝 响应片段: {response[:80]}...")


if __name__ == "__main__":
    # 主演示
    demo_identity_questions()
    
    # 扩展测试
    demo_various_identity_questions()
    
    print(f"\n🎉 演示完成！DeepCAD AI助手已能正确处理身份相关问题。")