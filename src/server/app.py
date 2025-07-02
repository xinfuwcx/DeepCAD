"""
Main FastAPI application file for the Deep Excavation CAE System (V3 Rebuild).
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes.v3_router import router as v3_router
from src.api.routes.v4_router import router as v4_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles application startup and shutdown events."""
    print("--- Deep Excavation CAE API (V3 & V4 Rebuild) Startup ---")
    yield
    print("--- Deep Excavation CAE API (V3 & V4 Rebuild) Shutdown ---")

# -- FastAPI App Initialization --
app = FastAPI(
    title="Deep Excavation CAE API",
    description="Main API for CAE analysis, supporting V3 (legacy) and V4 (modular) pipelines.",
    version="4.0.0",
    lifespan=lifespan,
)

# -- Middleware Configuration --
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -- Route Registration --
app.include_router(v3_router, prefix="/api/v3", tags=["V3 - Legacy Analysis"])
app.include_router(v4_router, prefix="/api/v4", tags=["V4 - Modular Analysis"])

@app.get("/health", tags=["Monitoring"])
async def get_server_health():
    """Returns the health status of the API server."""
    return {"status": "ok", "message": "V3 API core is running."}

@app.get("/", tags=["Root"])
async def read_root():
    return {
        "message": "Welcome to the Deep Excavation CAE API!",
        "version": "4.0.0",
        "description": "Main API for CAE analysis, supporting V3 (legacy) and V4 (modular) pipelines."
    }

# Routers will be added back one by one.

# -- Main Entry Point for Uvicorn --
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 