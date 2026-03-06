from pydantic_settings import BaseSettings
from pathlib import Path
import os

class Settings(BaseSettings):
    # 基础配置
    PROJECT_NAME: str = "细胞智能计数系统"
    VERSION: str = "1.0.0"
    
    # 服务器配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # 文件配置
    BASE_DIR: Path = Path(__file__).parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "temp" / "uploads"
    EXPORT_DIR: Path = BASE_DIR / "temp" / "exports"
    MAX_FILE_SIZE: int = 20 * 1024 * 1024  # 20MB
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# 确保目录存在
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.EXPORT_DIR, exist_ok=True)
