"""
@file app.py
@description FastAPI应用程序入口文件
@author Deep Excavation Team
@version 2.0.0
@copyright 2025
"""
import sys
import os
from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

# -- Add project root to path to allow absolute imports --
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# -- Import Core Routers --
from src.api.routes.modeling_router import router as modeling_router
from src.api.routes.compute_router import router as compute_router
from src.api.routes.ai_router import router as ai_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles application startup and shutdown events."""
    print("Starting Deep Excavation CAE System Backend...")
    yield
    print("Shutting down Deep Excavation CAE System Backend...")

# -- FastAPI App Initialization --
app = FastAPI(
    title="Deep Excavation CAE System API",
    description="Professional API for modeling, computation, and analysis of deep excavation projects.",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# -- CORS Configuration --
# Allows the frontend development server to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -- API Router Setup --
# Central router to include all domain-specific routers
api_router = APIRouter(prefix="/api")

api_router.include_router(modeling_router, prefix="/modeling", tags=["Modeling"])
api_router.include_router(compute_router, prefix="/compute", tags=["Computation & Analysis"])
api_router.include_router(ai_router, prefix="/ai", tags=["Physics AI"])

app.include_router(api_router)

# -- Root Endpoint --
@app.get("/", tags=["Root"])
async def root():
    """Provides basic information about the API."""
    return {
        "name": "Deep Excavation CAE System API",
        "version": "2.0.0",
        "description": "Welcome! See API documentation at /docs",
    }

# -- Main Entry Point --
if __name__ == "__main__":
    uvicorn.run(
        "src.server.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    ) 