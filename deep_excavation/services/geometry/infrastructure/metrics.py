"""
指标收集模块
用于收集和导出Prometheus指标
"""

import time
from fastapi import FastAPI, Request
from prometheus_client import Counter, Histogram, Gauge, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import logging

logger = logging.getLogger(__name__)

# 定义指标
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests count",
    ["method", "endpoint", "status_code"]
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"]
)

ACTIVE_REQUESTS = Gauge(
    "http_active_requests",
    "Number of active HTTP requests",
    ["method", "endpoint"]
)

# 几何服务特定指标
GEOMETRY_OPERATIONS = Counter(
    "geometry_operations_total",
    "Total geometry operations count",
    ["operation_type", "status"]
)

GEOMETRY_OPERATION_LATENCY = Histogram(
    "geometry_operation_duration_seconds",
    "Geometry operation latency in seconds",
    ["operation_type"]
)

BOOLEAN_OPERATIONS = Counter(
    "boolean_operations_total",
    "Total boolean operations count",
    ["operation_type", "status"]
)


class PrometheusMiddleware(BaseHTTPMiddleware):
    """Prometheus中间件，收集HTTP请求指标"""
    
    async def dispatch(self, request: Request, call_next):
        method = request.method
        path = request.url.path
        
        # 排除指标端点本身
        if path == "/metrics":
            return await call_next(request)
        
        # 增加活跃请求计数
        ACTIVE_REQUESTS.labels(method=method, endpoint=path).inc()
        
        # 记录请求开始时间
        start_time = time.time()
        
        # 处理请求
        try:
            response = await call_next(request)
            status_code = response.status_code
            
            # 记录请求指标
            REQUEST_COUNT.labels(
                method=method, 
                endpoint=path, 
                status_code=status_code
            ).inc()
            
            return response
        except Exception as e:
            # 记录异常请求
            REQUEST_COUNT.labels(
                method=method, 
                endpoint=path, 
                status_code=500
            ).inc()
            raise e
        finally:
            # 记录请求延迟
            REQUEST_LATENCY.labels(
                method=method, 
                endpoint=path
            ).observe(time.time() - start_time)
            
            # 减少活跃请求计数
            ACTIVE_REQUESTS.labels(method=method, endpoint=path).dec()


async def metrics_endpoint():
    """指标端点，返回Prometheus格式的指标数据"""
    return Response(
        content=generate_latest(),
        media_type="text/plain"
    )


def setup_metrics(app: FastAPI, service_name: str):
    """设置指标收集"""
    try:
        # 添加Prometheus中间件
        app.add_middleware(PrometheusMiddleware)
        
        # 添加指标端点
        app.add_route("/metrics", metrics_endpoint)
        
        logger.info(f"已设置Prometheus指标收集: {service_name}")
    except Exception as e:
        logger.error(f"设置Prometheus指标收集失败: {e}")


# 辅助函数

def track_geometry_operation(operation_type: str, start_time: float, success: bool):
    """记录几何操作指标"""
    duration = time.time() - start_time
    status = "success" if success else "failure"
    
    GEOMETRY_OPERATIONS.labels(
        operation_type=operation_type,
        status=status
    ).inc()
    
    GEOMETRY_OPERATION_LATENCY.labels(
        operation_type=operation_type
    ).observe(duration)


def track_boolean_operation(operation_type: str, start_time: float, success: bool):
    """记录布尔操作指标"""
    duration = time.time() - start_time
    status = "success" if success else "failure"
    
    BOOLEAN_OPERATIONS.labels(
        operation_type=operation_type,
        status=status
    ).inc()
    
    GEOMETRY_OPERATION_LATENCY.labels(
        operation_type=f"boolean_{operation_type}"
    ).observe(duration) 