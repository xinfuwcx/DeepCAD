"""
数据库连接模块
"""
import os
import logging
from passlib.context import CryptContext
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# 导入所有模型，确保Base.metadata中包含了所有表
from .models.base import Base
from .models.user import User
from .models.project import Project

# 配置数据库连接
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./deepcad.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 使用INFO级别记录数据库操作
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def initialize_database():
    """
    初始化数据库：创建表并填充初始数据。
    这个函数应该在应用服务器启动之前同步调用。
    """
    logger.info("正在创建所有数据库表...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("数据库表创建完成。")
    except Exception as e:
        logger.error(f"创建数据库表失败: {e}")
        raise

    db = SessionLocal()
    try:
        # 检查数据库是否为空
        if db.query(User).count() == 0:
            logger.info("数据库为空，正在创建初始管理员用户...")
            # 创建一个初始用户
            hashed_password = get_password_hash("adminpassword")
            db_user = User(
                username="admin",
                email="admin@example.com",
                full_name="Admin User",
                hashed_password=hashed_password,
                is_active=True,
                is_admin=True,
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            logger.info("初始用户创建成功。")
        else:
            logger.info("数据库已存在用户，跳过创建初始用户。")
    except Exception as e:
        logger.error(f"在数据库初始化过程中发生错误: {e}")
        db.rollback()
    finally:
        db.close()

def get_password_hash(password: str):
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.hash(password)

# 依赖项
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 