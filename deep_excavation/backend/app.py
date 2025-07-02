"""
Main FastAPI application file for the Deep Excavation CAE System (V3 Rebuild).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import (
    analysis_router,
    auth_router,
    project_router,
    v3_router,
    v4_router,
)
from backend.database import init_db

app = FastAPI(
    title="Deep Excavation API",
    description="API for the Deep Excavation CAE Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    init_db()

# API Routers
app.include_router(
    auth_router.router,
    prefix="/api/auth",
    tags=["Authentication"]
)
app.include_router(
    project_router.router,
    prefix="/api/projects",
    tags=["Project Management"]
)
app.include_router(
    v3_router.router,
    prefix="/api/v3",
    tags=["V3 Analysis"]
)
app.include_router(
    v4_router.router,
    prefix="/api/v4",
    tags=["V4 Analysis"]
)
app.include_router(
    analysis_router.router,
    prefix="/api/v4",
    tags=["V4 BIM Analysis"]
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Deep Excavation API"}

@app.get("/health", tags=["Monitoring"])
async def get_server_health():
    """Returns the health status of the API server."""
    return {"status": "ok", "message": "V3 API core is running."}

# Routers will be added back one by one.

# -- Main Entry Point for Uvicorn --
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 