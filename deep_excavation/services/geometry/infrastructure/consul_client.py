"""
Consul客户端
用于服务注册、发现和健康检查
"""

import logging
from typing import List, Dict, Any, Optional

try:
    import consul
except ImportError:
    consul = None

logger = logging.getLogger(__name__)


class ConsulClient:
    """Consul客户端封装"""
    
    def __init__(self, host: str = "localhost", port: int = 8500):
        self.host = host
        self.port = port
        self.consul = None
        
        if consul:
            try:
                self.consul = consul.Consul(host=host, port=port)
                logger.info(f"Consul客户端初始化成功: {host}:{port}")
            except Exception as e:
                logger.error(f"Consul客户端初始化失败: {e}")
        else:
            logger.warning("python-consul 未安装，使用模拟模式")
    
    async def register_service(
        self,
        name: str,
        service_id: str,
        address: str,
        port: int,
        health_check_url: str = None,
        tags: List[str] = None,
        meta: Dict[str, str] = None
    ) -> bool:
        """注册服务到Consul"""
        if not self.consul:
            logger.info(f"模拟注册服务: {name} ({service_id})")
            return True
        
        try:
            check = None
            if health_check_url:
                check = consul.Check.http(health_check_url, interval="10s")
            
            success = self.consul.agent.service.register(
                name=name,
                service_id=service_id,
                address=address,
                port=port,
                tags=tags or [],
                meta=meta or {},
                check=check
            )
            
            if success:
                logger.info(f"服务注册成功: {name} ({service_id})")
            else:
                logger.error(f"服务注册失败: {name} ({service_id})")
            
            return success
            
        except Exception as e:
            logger.error(f"服务注册异常: {e}")
            return False
    
    async def deregister_service(self, service_id: str) -> bool:
        """注销服务"""
        if not self.consul:
            logger.info(f"模拟注销服务: {service_id}")
            return True
        
        try:
            success = self.consul.agent.service.deregister(service_id)
            if success:
                logger.info(f"服务注销成功: {service_id}")
            else:
                logger.error(f"服务注销失败: {service_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"服务注销异常: {e}")
            return False
    
    async def discover_service(self, service_name: str) -> List[Dict[str, Any]]:
        """发现服务实例"""
        if not self.consul:
            logger.info(f"模拟发现服务: {service_name}")
            return []
        
        try:
            _, services = self.consul.health.service(
                service_name, passing=True)
            
            instances = []
            for service in services:
                instance = {
                    "id": service["Service"]["ID"],
                    "address": service["Service"]["Address"],
                    "port": service["Service"]["Port"],
                    "tags": service["Service"]["Tags"],
                    "meta": service["Service"]["Meta"]
                }
                instances.append(instance)
            
            logger.info(f"发现服务实例 {service_name}: {len(instances)} 个")
            return instances
            
        except Exception as e:
            logger.error(f"服务发现异常: {e}")
            return []
    
    async def get_service_health(self, service_id: str) -> Optional[str]:
        """获取服务健康状态"""
        if not self.consul:
            return "passing"  # 模拟健康状态
        
        try:
            _, checks = self.consul.health.checks(service_id)
            if not checks:
                return None
            
            # 返回最严重的状态
            statuses = [check["Status"] for check in checks]
            if "critical" in statuses:
                return "critical"
            elif "warning" in statuses:
                return "warning"
            else:
                return "passing"
                
        except Exception as e:
            logger.error(f"获取健康状态异常: {e}")
            return None 