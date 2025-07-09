from fastapi import FastAPI

app = FastAPI(
    title="DeepCAD API Gateway",
    description="The central gateway for all DeepCAD services.",
    version="1.0.0",
)

@app.get("/")
async def read_root():
    return {"message": "Welcome to the DeepCAD API Gateway"}

@app.get("/health")
async def health_check():
    return {"status": "ok"} 