#!/usr/bin/env python3
"""
2号几何专家后端服务启动脚本
快速启动解决0号测试问题
"""

import uvicorn
import sys
from pathlib import Path
import logging

# 添加项目路径
project_root = Path(__file__).parent
sys.path.append(str(project_root))
sys.path.append(str(project_root / "gateway"))

def main():
    print("🚀 2号几何专家后端服务启动中...")
    print("解决0号架构师测试中的404问题")
    
    try:
        # 启动服务，使用不同端口避免冲突
        uvicorn.run(
            "gateway.main:app",
            host="0.0.0.0", 
            port=8084,  # 使用8084端口
            reload=True,
            log_level="info"
        )
    except Exception as e:
        print(f"❌ 服务启动失败: {e}")
        print("尝试使用备用端口8088...")
        try:
            uvicorn.run(
                "gateway.main:app",
                host="0.0.0.0", 
                port=8088,
                reload=True,
                log_level="info"
            )
        except Exception as e2:
            print(f"❌ 备用端口也失败: {e2}")
            return False
    
    return True

if __name__ == "__main__":
    main()