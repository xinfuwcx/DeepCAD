"""
启动DeepCAD后端服务
"""

import uvicorn
import logging
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logger.info("正在启动DeepCAD后端服务...")
    logger.info("服务地址: http://localhost:8086")
    logger.info("API文档: http://localhost:8086/docs")
    logger.info("支护结构API测试: http://localhost:8086/api/geometry/support-structure-types")
    
    try:
        uvicorn.run(
            "gateway.main:app", 
            host="0.0.0.0", 
            port=8087, 
            reload=False,  # 关闭自动重载避免导入问题
            log_level="info"
        )
    except KeyboardInterrupt:
        logger.info("服务已停止")
    except Exception as e:
        logger.error(f"服务启动失败: {e}")
        sys.exit(1)