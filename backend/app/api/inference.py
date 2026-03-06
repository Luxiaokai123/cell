from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from pathlib import Path

# 延迟导入，避免启动时加载 torch
def _get_preanalyzer():
    from app.services.preanalyzer import get_preanalyzer
    return get_preanalyzer

from app.services.model_selector import get_model_selector, ModelChoice, ConfidenceLevel

router = APIRouter()

class PreanalysisRequest(BaseModel):
    """预分析请求"""
    file_id: str
    # 可选：手动指定模型，不指定则自动选择
    model: Optional[str] = None

class PreanalysisResponse(BaseModel):
    """预分析响应"""
    features: dict
    selected_model: str
    confidence: str
    score: float
    reasons: List[str]
    is_manual: bool = False  # 是否手动选择

@router.post("/preanalysis", response_model=PreanalysisResponse)
async def preanalysis(request: PreanalysisRequest):
    """
    预分析并选择模型
    
    - 如果不指定 model 参数，系统会根据图像特征自动选择最优模型
    - 如果指定 model 参数（RDHS-YOLO 或 DAS-DETR），则使用手动选择的模型
    
    请求示例：
    - 自动选择：{"file_id": "xxx.jpg"}
    - 手动选择：{"file_id": "xxx.jpg", "model": "RDHS-YOLO"}
    """
    try:
        # 构建文件路径
        base_dir = Path(__file__).parent.parent.parent
        file_path = base_dir / "temp" / "uploads" / request.file_id
        
        # 如果文件不存在，尝试直接使用文件名
        if not file_path.exists():
            file_path = Path(request.file_id)
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"文件不存在: {request.file_id}")
        
        # 执行预分析
        preanalyzer = _get_preanalyzer()()
        features = preanalyzer.analyze(str(file_path))
        
        # 模型选择
        selector = get_model_selector()
        
        # 判断是否为手动选择
        if request.model:
            # 手动选择模型
            is_manual = True
            model_name = request.model.upper()
            
            if model_name == "RDHS-YOLO":
                selected_model = ModelChoice.RDHS_YOLO
                confidence = ConfidenceLevel.HIGH
                reasons = ["用户手动选择 RDHS-YOLO 模型"]
            elif model_name == "DAS-DETR":
                selected_model = ModelChoice.DAS_DETR
                confidence = ConfidenceLevel.HIGH
                reasons = ["用户手动选择 DAS-DETR 模型"]
            else:
                raise HTTPException(
                    status_code=400, 
                    detail=f"不支持的模型: {request.model}，可选值: RDHS-YOLO, DAS-DETR"
                )
            
            # 计算一个模拟分数（基于特征）
            score = 0.5
        else:
            # 自动选择模型
            is_manual = False
            decision = selector.select(features)
            selected_model = decision.model
            confidence = decision.confidence
            score = decision.score
            reasons = decision.reasons
        
        return PreanalysisResponse(
            features=features,
            selected_model=selected_model.value,
            confidence=confidence.value,
            score=score,
            reasons=reasons,
            is_manual=is_manual
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """推理服务健康检查"""
    return {
        "status": "ok",
        "service": "inference",
        "version": "1.0.0"
    }
