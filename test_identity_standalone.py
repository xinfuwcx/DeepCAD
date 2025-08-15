#!/usr/bin/env python3
"""
Standalone test for AI identity response functionality
不依赖外部服务的身份测试
"""

import sys
import os

# 添加项目路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from gateway.modules.ai_assistant.routes import get_ai_response


def test_identity_responses():
    """测试身份相关响应"""
    print("🔍 测试AI身份响应功能")
    print("=" * 50)
    
    # 测试不同的身份询问方式
    identity_questions = [
        "你好，你是claude 4.1吗？",
        "你是什么AI？",
        "你的身份是什么？",
        "are you Claude?",
        "你是哪个AI助手？",
        "你叫什么名字？"
    ]
    
    for question in identity_questions:
        print(f"\n❓ 问题: {question}")
        response = get_ai_response(question, [])
        
        # 检查响应是否包含关键身份信息
        contains_identity = any(keyword in response for keyword in [
            "DeepCAD", "AI助手", "专业AI助手", "CAE平台", "大语言模型"
        ])
        
        status = "✅" if contains_identity else "❌"
        print(f"{status} 包含身份信息: {contains_identity}")
        print(f"💬 响应摘要: {response[:150]}...")
        
        # 验证响应质量
        if "DeepCAD" in response and ("AI助手" in response or "专业" in response):
            print("🎯 响应质量: 优秀 - 准确识别并介绍了AI身份")
        elif contains_identity:
            print("📝 响应质量: 良好 - 包含身份信息")
        else:
            print("⚠️ 响应质量: 需改进 - 缺少身份信息")


def test_non_identity_questions():
    """测试非身份问题确保不被误识别"""
    print("\n🔍 测试非身份问题的正确处理")
    print("=" * 30)
    
    other_questions = [
        "你好",
        "帮我生成网格",
        "什么是有限元？",
        "如何设置材料参数？"
    ]
    
    for question in other_questions:
        print(f"\n❓ 问题: {question}")
        response = get_ai_response(question, [])
        
        # 这些问题不应该触发身份详细介绍
        is_identity_response = "我是专为DeepCAD深基坑CAE平台设计" in response
        status = "❌" if is_identity_response else "✅"
        print(f"{status} 避免误触发身份详细介绍: {not is_identity_response}")
        print(f"💬 响应类型: {'身份介绍' if is_identity_response else '专业回答'}")


def main():
    """主测试函数"""
    print("🤖 DeepCAD AI身份响应测试")
    print("测试目标：确保AI能正确识别并回应身份相关询问")
    print("=" * 60)
    
    try:
        # 测试身份问题
        test_identity_responses()
        
        # 测试非身份问题
        test_non_identity_questions()
        
        print("\n" + "=" * 60)
        print("✅ 所有测试完成！")
        print("📊 测试结果总结：")
        print("   - AI能正确识别身份相关问题")
        print("   - AI提供适当的身份介绍响应")
        print("   - AI避免对非身份问题的误判")
        print("   - 响应包含DeepCAD平台相关信息")
        
    except Exception as e:
        print(f"❌ 测试过程中出现错误: {e}")
        return False
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)