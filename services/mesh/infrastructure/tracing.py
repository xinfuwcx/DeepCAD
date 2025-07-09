"""
分布式追踪模块，用于追踪服务调用链路
"""
import os
import logging
from typing import Optional
from fastapi import Request
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import SERVICE_NAME, Resource

logger = logging.getLogger(__name__)


def setup_tracing(service_name: Optional[str] = None):
    """
    设置分布式追踪
    
    Args:
        service_name: 服务名称，如果为None则从环境变量获取
    """
    try:
        _service_name = service_name or os.environ.get("SERVICE_NAME", "mesh_service")
        otlp_endpoint = os.environ.get("OTLP_ENDPOINT", "http://jaeger:4317")
        
        # 创建资源
        resource = Resource(attributes={
            SERVICE_NAME: _service_name
        })
        
        # 创建追踪提供者
        provider = TracerProvider(resource=resource)
        
        # 创建OTLP导出器
        otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
        
        # 创建批处理器
        span_processor = BatchSpanProcessor(otlp_exporter)
        
        # 添加处理器到提供者
        provider.add_span_processor(span_processor)
        
        # 设置全局追踪提供者
        trace.set_tracer_provider(provider)
        
        logger.info(f"分布式追踪已设置: 服务={_service_name}, 端点={otlp_endpoint}")
    except Exception as e:
        logger.error(f"设置分布式追踪失败: {e}")


def get_tracer(name: str = __name__):
    """
    获取追踪器
    
    Args:
        name: 追踪器名称
        
    Returns:
        追踪器对象
    """
    return trace.get_tracer(name)


class TracingMiddleware:
    """FastAPI中间件，用于追踪HTTP请求"""
    
    async def __call__(self, request: Request, call_next):
        """
        处理请求并创建追踪span
        
        Args:
            request: FastAPI请求对象
            call_next: 下一个中间件或路由处理函数
            
        Returns:
            响应对象
        """
        tracer = get_tracer("mesh_service.http")
        
        # 获取请求信息
        method = request.method
        path = request.url.path
        
        # 创建span
        with tracer.start_as_current_span(
            f"{method} {path}",
            kind=trace.SpanKind.SERVER,
            attributes={
                "http.method": method,
                "http.url": str(request.url),
                "http.path": path,
                "http.host": request.headers.get("host", "unknown"),
                "http.user_agent": request.headers.get("user-agent", "unknown")
            }
        ) as span:
            try:
                # 调用下一个处理函数
                response = await call_next(request)
                
                # 记录响应信息
                span.set_attribute("http.status_code", response.status_code)
                
                return response
            except Exception as e:
                # 记录异常信息
                span.record_exception(e)
                span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
                raise 