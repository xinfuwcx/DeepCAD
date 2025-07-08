import uvicorn
import os
import sys
import logging
from deep_excavation.backend.database import initialize_database

# 配置日志
logging.basicConfig(level=logging.INFO)

if __name__ == "__main__":
    # 确保在项目根目录下运行
    abspath = os.path.abspath(__file__)
    dname = os.path.dirname(abspath)
    os.chdir(dname)
    
    # 确保当前目录在Python路径中，以便能够导入deep_excavation模块
    if dname not in sys.path:
        sys.path.insert(0, dname)

    # 在启动Uvicorn之前，同步初始化数据库
    logging.info("服务启动前，开始执行数据库初始化...")
    try:
        initialize_database()
        logging.info("数据库初始化成功。")
    except Exception as e:
        logging.error(f"数据库初始化过程中发生错误: {e}", exc_info=True)
        logging.warning("应用将尝试继续启动，但某些功能可能不可用。")
        
    # 启动Uvicorn服务
    try:
        uvicorn.run(
            "deep_excavation.backend.app:app", 
            host="0.0.0.0", 
            port=8000, 
            reload=True
        )
    except Exception as e:
        logging.critical(f"应用启动失败: {e}", exc_info=True) 