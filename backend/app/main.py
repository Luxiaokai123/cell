from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pathlib import Path

# 创建 FastAPI 应用
app = FastAPI(
    title="细胞智能计数系统",
    version="1.0.0",
    description="细胞智能计数系统 API"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
