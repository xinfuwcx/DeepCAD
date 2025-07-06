"""
链路追踪模块
用于集成OpenTelemetry和Jaeger
"""

import os
import logging
from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# 尝试导入OpenTelemetry
try:
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.jaeger.thrift import JaegerExporter
    from opentelemetry.sdk.resources import SERVICE_NAME, Resource
    from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    
    OPENTELEMETRY_AVAILABLE = True
except ImportError:
    logger.warning("OpenTelemetry库未安装，链路追踪功能不可用")
    OPENTELEMETRY_AVAILABLE = False


class TracingMiddleware(BaseHTTPMiddleware):
    """链路追踪中间件，为每个请求创建span"""
    
    async def dispatch(self, request: Request, call_next):
        if not OPENTELEMETRY_AVAILABLE:
            return await call_next(request)
        
        # 获取当前tracer
        tracer = trace.get_tracer(__name__)
        
        # 从请求头中提取上下文
        carrier = {}
        for key, value in request.headers.items():
            carrier[key] = value
        
        # 提取上下文
        ctx = TraceContextTextMapPropagator().extract(carrier=carrier)
        
        # 创建请求span
        with tracer.start_as_current_span(
            f"{request.method} {request.url.path}",
            context=ctx,
            kind=trace.SpanKind.SERVER,
        ) as span:
            # 添加请求属性
            span.set_attribute("http.method", request.method)
            span.set_attribute("http.url", str(request.url))
            span.set_attribute("http.scheme", request.url.scheme)
            span.set_attribute("http.host", request.url.hostname)
            
            # 处理请求
            response = await call_next(request)
            
            # 添加响应属性
            span.set_attribute("http.status_code", response.status_code)
            
            return response


def setup_tracing(app: FastAPI, service_name: str):
    """设置链路追踪"""
    if not OPENTELEMETRY_AVAILABLE:
        logger.warning("OpenTelemetry库未安装，跳过链路追踪设置")
        return
    
    try:
        # 获取Jaeger配置
        jaeger_host = os.getenv("JAEGER_AGENT_HOST", "localhost")
        jaeger_port = int(os.getenv("JAEGER_AGENT_PORT", "6831"))
        
        # 创建资源
        resource = Resource(attributes={
            SERVICE_NAME: service_name
        })
        
        # 创建TracerProvider
        provider = TracerProvider(resource=resource)
        
        # 创建Jaeger导出器
        jaeger_exporter = JaegerExporter(
            agent_host_name=jaeger_host,
            agent_port=jaeger_port,
        )
        
        # 添加BatchSpanProcessor
        provider.add_span_processor(BatchSpanProcessor(jaeger_exporter))
        
        # 设置全局TracerProvider
        trace.set_tracer_provider(provider)
        
        # 使用FastAPIInstrumentor自动检测
        FastAPIInstrumentor.instrument_app(app)
        
        # 添加中间件
        app.add_middleware(TracingMiddleware)
        
        logger.info(f"已设置OpenTelemetry链路追踪: {service_name} -> {jaeger_host}:{jaeger_port}")
    except Exception as e:
        logger.error(f"设置链路追踪失败: {e}")


def create_span(name: str, parent_span=None):
    """创建一个新的span"""
    if not OPENTELEMETRY_AVAILABLE:
        return None
    
    tracer = trace.get_tracer(__name__)
    
    if parent_span:
        context = trace.set_span_in_context(parent_span)
        return tracer.start_span(name, context=context)
    else:
        return tracer.start_span(name)


def end_span(span):
    """结束一个span"""
    if span:
        span.end() 