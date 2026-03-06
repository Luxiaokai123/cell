from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pathlib import Path
from app.api import upload
from app.api import inference
from app.api import predict

# 创建 FastAPI 应用
app = FastAPI(
    title="细胞智能计数系统",
    version="1.0.0",
    description="细胞智能计数系统 API"
)

# 启动时检查依赖
@app.on_event("startup")
async def check_dependencies():
    """检查必要的依赖"""
    try:
        import numpy as np
        print(f"✓ numpy version: {np.__version__}")
    except ImportError:
        print("✗ numpy not installed!")
    
    try:
        from ultralytics import YOLO
        print("✓ ultralytics loaded successfully")
    except Exception as e:
        print(f"⚠ ultralytics load failed: {e}")

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(upload.router, prefix="/api", tags=["文件上传"])
app.include_router(inference.router, prefix="/api", tags=["推理服务"])
app.include_router(predict.router, prefix="/api", tags=["模型推理"])

# 健康检查接口
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": "1.0.0"
    }

# 根路径
@app.get("/")
async def root():
    return {
        "message": "欢迎使用细胞智能计数系统 API",
        "docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
