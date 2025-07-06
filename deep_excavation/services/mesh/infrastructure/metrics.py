"""
指标收集模块，用于监控服务性能
"""
import time
import logging
from prometheus_client import Counter, Histogram, Gauge

logger = logging.getLogger(__name__)

# 定义指标
MESH_REQUESTS_TOTAL = Counter(
    'mesh_requests_total', 
    '网格生成请求总数',
    ['method', 'endpoint', 'status']
)

MESH_REQUEST_DURATION = Histogram(
    'mesh_request_duration_seconds', 
    '网格生成请求处理时间',
    ['method', 'endpoint'],
    buckets=(0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0, 120.0, float('inf'))
)

MESH_GENERATION_DURATION = Histogram(
    'mesh_generation_duration_seconds', 
    '网格生成时间',
    ['mesh_type', 'algorithm'],
    buckets=(0.5, 1.0, 5.0, 10.0, 30.0, 60.0, 120.0, 300.0, 600.0, float('inf'))
)

MESH_SIZE = Gauge(
    'mesh_size', 
    '生成的网格大小',
    ['mesh_type']
)

MESH_QUALITY = Gauge(
    'mesh_quality', 
    '网格质量指标',
    ['mesh_type', 'metric_name']
)

ACTIVE_MESH_GENERATIONS = Gauge(
    'active_mesh_generations', 
    '当前活跃的网格生成任务数'
)


class MetricsMiddleware:
    """FastAPI中间件，用于收集请求指标"""
    
    async def __call__(self, request, call_next):
        """
        处理请求并收集指标
        
        Args:
            request: FastAPI请求对象
            call_next: 下一个中间件或路由处理函数
            
        Returns:
            响应对象
        """
        method = request.method
        path = request.url.path
        
        start_time = time.time()
        
        try:
            response = await call_next(request)
            status = response.status_code
            
            # 记录请求计数和处理时间
            MESH_REQUESTS_TOTAL.labels(method=method, endpoint=path, status=status).inc()
            MESH_REQUEST_DURATION.labels(method=method, endpoint=path).observe(
                time.time() - start_time
            )
            
            return response
        except Exception as e:
            # 记录错误请求
            MESH_REQUESTS_TOTAL.labels(method=method, endpoint=path, status=500).inc()
            MESH_REQUEST_DURATION.labels(method=method, endpoint=path).observe(
                time.time() - start_time
            )
            logger.error(f"请求处理异常: {e}")
            raise


def track_mesh_generation(mesh_type: str, algorithm: str):
    """
    装饰器，用于跟踪网格生成性能
    
    Args:
        mesh_type: 网格类型
        algorithm: 算法名称
        
    Returns:
        装饰器函数
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            ACTIVE_MESH_GENERATIONS.inc()
            
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                
                # 记录网格生成时间
                generation_time = time.time() - start_time
                MESH_GENERATION_DURATION.labels(
                    mesh_type=mesh_type, 
                    algorithm=algorithm
                ).observe(generation_time)
                
                # 如果函数返回网格信息，记录网格大小和质量
                if isinstance(result, dict) and 'mesh_info' in result:
                    mesh_info = result['mesh_info']
                    if 'element_count' in mesh_info:
                        MESH_SIZE.labels(mesh_type=mesh_type).set(mesh_info['element_count'])
                    
                    if 'quality_metrics' in mesh_info:
                        for metric_name, value in mesh_info['quality_metrics'].items():
                            MESH_QUALITY.labels(
                                mesh_type=mesh_type, 
                                metric_name=metric_name
                            ).set(value)
                
                return result
            finally:
                ACTIVE_MESH_GENERATIONS.dec()
                
        return wrapper
    return decorator 