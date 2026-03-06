from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from pathlib import Path
import time
import numpy as np  # 显式导入 numpy

router = APIRouter()

class InferenceRequest(BaseModel):
    """推理请求"""
    file_id: str
    model: Optional[str] = None

class BoxResult(BaseModel):
    """单个检测框结果"""
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float
    class_name: str

class InferenceResponse(BaseModel):
    """推理响应"""
    file_id: str
    model_used: str
    cell_count: int
    boxes: List[BoxResult]
    processing_time: float
    message: str


def get_yolo_model(model_name: str, base_dir: Path):
    """获取或加载 YOLO 模型 - 延迟导入"""
    # 确保 numpy 已加载
    try:
        import numpy as np
        print(f"✓ numpy version: {np.__version__}")
    except ImportError:
        return None, "numpy not available"
    
    # 延迟导入，避免启动时加载 torch
    try:
        from ultralytics import YOLO
        print("✓ ultralytics loaded successfully")
    except Exception as e:
        print(f"Failed to import ultralytics: {e}")
        return None, f"ultralytics 导入失败：{e}"
    
    # 确定模型文件路径
    if model_name == "RDHS-YOLO":
        model_path = base_dir / "weights" / "rdhs_yolo_best.pt"
    elif model_name == "DAS-DETR":
        model_path = base_dir / "weights" / "das_detr_best.pt"
    else:
        return None, f"未知模型: {model_name}"
    
    # 调试信息
    print(f"Looking for model: {model_path}")
    print(f"Absolute path: {model_path.absolute()}")
    print(f"File exists: {model_path.exists()}")
    
    if not model_path.exists():
        return None, f"模型文件不存在: {model_path}"
    
    try:
        model = YOLO(str(model_path))
        return model, None
    except Exception as e:
        print(f"Failed to load model: {e}")
        return None, f"模型加载失败: {e}"


@router.post("/inference", response_model=InferenceResponse)
async def inference(request: InferenceRequest):
    """模型推理接口"""
    start_time = time.time()
    
    try:
        # 构建文件路径
        base_dir = Path(__file__).parent.parent.parent
        file_path = base_dir / "temp" / "uploads" / request.file_id
        
        if not file_path.exists():
            file_path = Path(request.file_id)
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"文件不存在: {request.file_id}")
        
        # 确定使用的模型
        if request.model:
            model_name = request.model.upper()
            if model_name not in ["RDHS-YOLO", "DAS-DETR"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"不支持的模型: {request.model}，可选值: RDHS-YOLO, DAS-DETR"
                )
        else:
            model_name = "RDHS-YOLO"
        
        # 获取 YOLO 模型
        model, error_msg = get_yolo_model(model_name, base_dir)
        
        if model is None:
            # 如果指定模型加载失败，尝试另一个模型
            fallback_model = "RDHS-YOLO" if model_name == "DAS-DETR" else "DAS-DETR"
            print(f"Primary model {model_name} failed: {error_msg}, trying {fallback_model}")
            model, error_msg2 = get_yolo_model(fallback_model, base_dir)
            
            if model is None:
                raise HTTPException(
                    status_code=500,
                    detail=f"所有模型加载失败。{model_name}: {error_msg}, {fallback_model}: {error_msg2}"
                )
            else:
                model_name = fallback_model  # 使用成功加载的模型
        
        # 执行推理
        try:
            results = model(str(file_path), verbose=False)
            result = results[0]
            
            # 提取检测框
            boxes = []
            if result.boxes is not None:
                xyxy = result.boxes.xyxy.cpu().numpy()
                confidences = result.boxes.conf.cpu().numpy()
                classes = result.boxes.cls.cpu().numpy()
                
                for i in range(len(xyxy)):
                    x1, y1, x2, y2 = xyxy[i]
                    conf = confidences[i]
                    cls = int(classes[i])
                    
                    boxes.append(BoxResult(
                        x1=float(x1),
                        y1=float(y1),
                        x2=float(x2),
                        y2=float(y2),
                        confidence=float(conf),
                        class_name=f"cell_{cls}"
                    ))
            
            cell_count = len(boxes)
            message = f"推理成功，使用 {model_name} 模型检测到 {cell_count} 个细胞"
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"推理失败: {str(e)}")
        
        processing_time = time.time() - start_time
        
        return InferenceResponse(
            file_id=request.file_id,
            model_used=model_name,
            cell_count=cell_count,
            boxes=boxes,
            processing_time=processing_time,
            message=message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/status")
async def models_status():
    """获取模型加载状态"""
    base_dir = Path(__file__).parent.parent.parent
    
    status = {}
    for model_name in ["RDHS-YOLO", "DAS-DETR"]:
        model_file = f"{model_name.lower().replace('-', '_')}_best.pt"
        model_path = base_dir / "weights" / model_file
        status[model_name] = {
            "exists": model_path.exists(),
            "path": str(model_path)
        }
    
    return {
        "status": status,
        "message": "模型状态查询"
    }


@router.post("/models/load")
async def load_models():
    """手动加载模型"""
    return {
        "status": "ok",
        "message": "模型将在推理时自动加载"
    }
