"""
Consul客户端模块，用于服务注册和发现
"""
import os
import socket
import logging
import consul
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class ConsulClient:
    """Consul客户端，用于服务注册和发现"""
    
    def __init__(self, 
                 consul_host: str = "consul", 
                 consul_port: int = 8500,
                 service_name: Optional[str] = None,
                 service_port: Optional[int] = None):
        """
        初始化Consul客户端
        
        Args:
            consul_host: Consul服务器主机名
            consul_port: Consul服务器端口
            service_name: 服务名称，如果为None则从环境变量获取
            service_port: 服务端口，如果为None则从环境变量获取
        """
        self.consul_host = consul_host
        self.consul_port = consul_port
        self.service_name = service_name or os.environ.get("SERVICE_NAME", "mesh_service")
        self.service_port = service_port or int(os.environ.get("SERVICE_PORT", "8002"))
        self.service_id = f"{self.service_name}-{socket.gethostname()}"
        
        # 初始化Consul客户端
        self.consul = consul.Consul(host=consul_host, port=consul_port)
        logger.info(f"初始化Consul客户端: {consul_host}:{consul_port}")
    
    def register_service(self, tags: list = None, check_interval: str = "10s") -> bool:
        """
        注册服务到Consul
        
        Args:
            tags: 服务标签
            check_interval: 健康检查间隔
            
        Returns:
            注册是否成功
        """
        if tags is None:
            tags = ["mesh", "api"]
            
        # 定义健康检查
        check = {
            "http": f"http://{socket.gethostname()}:{self.service_port}/health",
            "interval": check_interval
        }
        
        try:
            # 注册服务
            result = self.consul.agent.service.register(
                name=self.service_name,
                service_id=self.service_id,
                address=socket.gethostname(),
                port=self.service_port,
                tags=tags,
                check=check
            )
            
            logger.info(f"服务注册结果: {result}, 服务ID: {self.service_id}")
            return True
        except Exception as e:
            logger.error(f"服务注册失败: {e}")
            return False
    
    def deregister_service(self) -> bool:
        """
        从Consul注销服务
        
        Returns:
            注销是否成功
        """
        try:
            self.consul.agent.service.deregister(self.service_id)
            logger.info(f"服务注销成功: {self.service_id}")
            return True
        except Exception as e:
            logger.error(f"服务注销失败: {e}")
            return False
    
    def discover_service(self, service_name: str) -> Optional[Dict[str, Any]]:
        """
        发现服务
        
        Args:
            service_name: 要发现的服务名称
            
        Returns:
            服务信息，如果未找到则返回None
        """
        try:
            # 获取服务实例
            _, services = self.consul.health.service(service_name, passing=True)
            
            if not services:
                logger.warning(f"未找到服务: {service_name}")
                return None
            
            # 选择第一个健康的服务实例
            service = services[0]["Service"]
            
            return {
                "id": service["ID"],
                "name": service["Service"],
                "address": service["Address"],
                "port": service["Port"],
                "tags": service.get("Tags", [])
            }
        except Exception as e:
            logger.error(f"服务发现失败: {e}")
            return None 