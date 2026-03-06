from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import shutil
from datetime import datetime

router = APIRouter()

@router.post("/upload/single")
async def upload_single_file(file: UploadFile = File(...)):
    """
    上传单个细胞图片文件
    """
    # 验证文件类型
    allowed_types = ["image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型：{file.content_type}。只支持 JPEG/PNG 格式"
        )
    
    # 验证文件大小（20MB）
    file_size = 0
    content = await file.read()
    file_size = len(content)
    if file_size > 20 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="文件大小不能超过 20MB"
        )
    
    # 生成保存路径
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    
    # 确保上传目录存在
    upload_dir = Path(__file__).parent.parent.parent / "temp" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = upload_dir / filename
    
    # 保存文件
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    return {
        "filename": file.filename,
        "saved_filename": filename,
        "file_path": str(file_path),
        "file_size": file_size,
        "content_type": file.content_type,
        "message": "上传成功"
    }


@router.post("/upload/batch")
async def upload_batch_files(files: list[UploadFile] = File(...)):
    """
    批量上传细胞图片文件
    """
    uploaded_files = []
    failed_files = []
    
    for file in files:
        try:
            # 验证文件类型
            allowed_types = ["image/jpeg", "image/png", "image/jpg"]
            if file.content_type not in allowed_types:
                failed_files.append({
                    "filename": file.filename,
                    "reason": f"不支持的文件类型：{file.content_type}"
                })
                continue
            
            # 读取文件内容
            content = await file.read()
            
            # 验证文件大小
            if len(content) > 20 * 1024 * 1024:
                failed_files.append({
                    "filename": file.filename,
                    "reason": "文件大小超过 20MB 限制"
                })
                continue
            
            # 生成保存路径
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}_{file.filename}"
            
            # 确保上传目录存在
            upload_dir = Path(__file__).parent.parent.parent / "temp" / "uploads"
            upload_dir.mkdir(parents=True, exist_ok=True)
            
            file_path = upload_dir / filename
            
            # 保存文件
            with open(file_path, "wb") as buffer:
                buffer.write(content)
            
            uploaded_files.append({
                "filename": file.filename,
                "saved_filename": filename,
                "file_path": str(file_path),
                "file_size": len(content),
                "content_type": file.content_type
            })
            
        except Exception as e:
            failed_files.append({
                "filename": file.filename,
                "reason": str(e)
            })
    
    return {
        "uploaded": uploaded_files,
        "failed": failed_files,
        "total": len(files),
        "success_count": len(uploaded_files),
        "failed_count": len(failed_files),
        "message": f"上传完成，成功 {len(uploaded_files)} 个，失败 {len(failed_files)} 个"
    }
