#!/usr/bin/env python3
"""
Simple server runner for Deep Excavation Backend
"""
import sys
import os

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(backend_dir)
sys.path.insert(0, backend_dir)
sys.path.insert(0, parent_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Create a simple FastAPI app
app = FastAPI(
    title="Deep Excavation API",
    description="深基坑分析系统API",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def read_root():
    """Root endpoint"""
    return {"message": "Deep Excavation API is running", "status": "ok"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "deep-excavation-api"}

@app.get("/api/test")
async def test_endpoint():
    """Test endpoint for development"""
    return {"test": "success", "python_version": sys.version}

if __name__ == "__main__":
    print("🚀 启动深基坑分析系统后端服务...")
    print(f"📁 Backend目录: {backend_dir}")
    print(f"🐍 Python版本: {sys.version}")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        reload=True,
        log_level="info"
    ) 