"""
指标收集模块，用于监控服务性能
"""
import time
import logging
from prometheus_client import Counter, Histogram, Gauge

logger = logging.getLogger(__name__)

# 定义指标
ANALYSIS_REQUESTS_TOTAL = Counter(
    'analysis_requests_total', 
    '分析请求总数',
    ['method', 'endpoint', 'status']
)

ANALYSIS_REQUEST_DURATION = Histogram(
    'analysis_request_duration_seconds', 
    '分析请求处理时间',
    ['method', 'endpoint'],
    buckets=(0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0, 120.0, float('inf'))
)

ANALYSIS_DURATION = Histogram(
    'analysis_duration_seconds', 
    '分析计算时间',
    ['analysis_type', 'algorithm'],
    buckets=(0.5, 1.0, 5.0, 10.0, 30.0, 60.0, 120.0, 300.0, 600.0, float('inf'))
)

ACTIVE_ANALYSES = Gauge(
    'active_analyses', 
    '当前活跃的分析任务数',
    ['analysis_type']
)

RESULT_SIZE = Gauge(
    'result_size_bytes', 
    '结果文件大小',
    ['analysis_type']
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
            ANALYSIS_REQUESTS_TOTAL.labels(
                method=method, 
                endpoint=path, 
                status=status
            ).inc()
            
            ANALYSIS_REQUEST_DURATION.labels(
                method=method, 
                endpoint=path
            ).observe(time.time() - start_time)
            
            return response
        except Exception as e:
            # 记录错误请求
            ANALYSIS_REQUESTS_TOTAL.labels(
                method=method, 
                endpoint=path, 
                status=500
            ).inc()
            
            ANALYSIS_REQUEST_DURATION.labels(
                method=method, 
                endpoint=path
            ).observe(time.time() - start_time)
            
            logger.error(f"请求处理异常: {e}")
            raise


def track_analysis(analysis_type: str, algorithm: str):
    """
    装饰器，用于跟踪分析性能
    
    Args:
        analysis_type: 分析类型
        algorithm: 算法名称
        
    Returns:
        装饰器函数
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            ACTIVE_ANALYSES.labels(analysis_type=analysis_type).inc()
            
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                
                # 记录分析时间
                analysis_time = time.time() - start_time
                ANALYSIS_DURATION.labels(
                    analysis_type=analysis_type, 
                    algorithm=algorithm
                ).observe(analysis_time)
                
                # 如果函数返回结果文件路径，记录文件大小
                if isinstance(result, dict) and 'result_file' in result:
                    try:
                        import os
                        file_size = os.path.getsize(result['result_file'])
                        RESULT_SIZE.labels(analysis_type=analysis_type).set(file_size)
                    except Exception as e:
                        logger.warning(f"无法获取结果文件大小: {e}")
                
                return result
            finally:
                ACTIVE_ANALYSES.labels(analysis_type=analysis_type).dec()
                
        return wrapper
    return decorator 