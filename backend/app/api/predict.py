from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from pathlib import Path
import time
import numpy as np  # 显式导入 numpy

router = APIRouter()

# 模型配置：每个模型使用不同的类、置信度阈值和IOU阈值
MODEL_CONFIGS = {
    "RDHS-YOLO": {
        "path": "rdhs_yolo_best.pt",
        "class_name": "YOLO",  # 使用字符串，避免模块加载时未导入
        "conf": 0.2,
        "iou": 0.7
    },
    "DAS-DETR": {
        "path": "das_detr_best.pt",
        "class_name": "RTDETR",  # 使用字符串，避免模块加载时未导入
        "conf": 0.5,
        "iou": 0.7
    }
}


class InferenceRequest(BaseModel):
    """推理请求"""
    file_id: str
    model: str
    conf: Optional[float] = None  # 置信度阈值，None 时使用模型默认值
    iou: Optional[float] = None   # IOU阈值，None 时使用模型默认值

class BoxResult(BaseModel):
    """单个检测框结果"""
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float
    class_name: str
    mask: Optional[List[List[float]]] = None  # 实例分割掩码（多边形点列表）

class InferenceResponse(BaseModel):
    """推理响应"""
    file_id: str
    model_used: str
    cell_count: int
    boxes: List[BoxResult]
    processing_time: float
    message: str


def get_model(model_name: str, base_dir: Path):
    """获取或加载模型 - 根据模型类型使用不同的加载方式"""
    # ============ 第一步：注册自定义模块（解决 DAS-DETR 权重加载问题）============
    custom_ultralytics_path = Path(__file__).parent.parent.parent.parent / "ultralytics-test2" / "ultralytics"
    
    print(f"[DEBUG] Custom ultralytics path: {custom_ultralytics_path}")
    print(f"[DEBUG] Path exists: {custom_ultralytics_path.exists()}")
    
    # 关键：在导入任何 ultralytics 之前，先将自定义类注册到已安装的 ultralytics 命名空间
    if custom_ultralytics_path.exists():
        import sys
        import re
        
        # 方法：直接执行 block.py 文件内容，提取类定义并注册
        block_py_path = custom_ultralytics_path / "nn" / "modules" / "block.py"
        print(f"[DEBUG] Block file path: {block_py_path}")
        print(f"[DEBUG] Block file exists: {block_py_path.exists()}")
        
        if not block_py_path.exists():
            print(f"Warning: block.py not found at {block_py_path}")
        else:
            try:
                # 读取 block.py 文件内容
                with open(block_py_path, 'r', encoding='utf-8') as f:
                    block_code = f.read()
                
                print("[DEBUG] block.py read successfully")
                
                # 导入必要的依赖
                import torch
                import torch.nn as nn
                import torch.nn.functional as F
                from collections import OrderedDict
                
                print("[DEBUG] torch imports done")
                
                # 创建命名空间字典来执行代码
                namespace = {
                    'torch': torch,
                    'nn': nn,
                    'F': F,
                    'Module': nn.Module,
                    'Conv2d': nn.Conv2d,
                    'BatchNorm2d': nn.BatchNorm2d,
                    'Identity': nn.Identity,
                    'SiLU': nn.SiLU,
                    'ReLU': nn.ReLU,
                    'LeakyReLU': nn.LeakyReLU,
                    'GELU': nn.GELU,
                    'Sequential': nn.Sequential,
                    'ModuleList': nn.ModuleList,
                    'Parameter': torch.nn.Parameter,
                    'LayerNorm': nn.LayerNorm,
                    'Linear': nn.Linear,
                    'Dropout': nn.Dropout,
                    'AvgPool2d': nn.AvgPool2d,
                    'OrderedDict': OrderedDict,
                }
                
                # 需要注册的自定义类列表（按依赖顺序）
                target_classes = [
                    'ConvNormLayer', 
                    'get_activation', 
                    'BasicBlock',
                    'BottleNeck',
                    'Blocks', 
                    'DEConv', 
                    'DEBottleNeck', 
                    'SPDConv', 
                    'Agent_AIFI'
                ]
                
                # 1. 先执行 get_activation 函数（其他类依赖它）
                get_act_pattern = r'def get_activation\(act: str, inpace: bool = True\):.*?(?=\nclass |\Z)'
                act_match = re.search(get_act_pattern, block_code, re.DOTALL)
                
                if act_match:
                    get_act_code = act_match.group(0)
                    exec(get_act_code, namespace)
                    print("✓ get_activation function registered")
                
                # 2. 按顺序执行各个类定义（避免依赖问题）
                for class_name in target_classes:
                    if class_name == 'get_activation':
                        continue  # 已经处理过了
                    
                    # 匹配类定义
                    class_pattern = rf'class {class_name}\([^)]*\):.*?(?=\nclass |\Z)'
                    match = re.search(class_pattern, block_code, re.DOTALL)
                    
                    if match:
                        class_code = match.group(0)
                        try:
                            # 在命名空间中执行这个类定义
                            exec(class_code, namespace)
                            
                            # 获取定义的类
                            CustomClass = namespace.get(class_name)
                            
                            if CustomClass:
                                # 注册到已安装的 ultralytics 模块
                                import ultralytics.nn.modules.block as installed_block
                                setattr(installed_block, class_name, CustomClass)
                                # 同时也添加到 __dict__ 确保 pickle 能找到
                                installed_block.__dict__[class_name] = CustomClass
                                print(f"✓ {class_name} registered successfully to ultralytics.nn.modules.block")
                        except Exception as e:
                            print(f"Warning: Failed to register {class_name}: {e}")
                    else:
                        print(f"Warning: {class_name} class not found in block.py")
                    
            except Exception as e:
                print(f"Warning: Failed to register custom modules: {e}")
                import traceback
                traceback.print_exc()
    else:
        print(f"Warning: Custom ultralytics path does not exist: {custom_ultralytics_path}")
    # ============================================================================
    
    # 确保 numpy 已加载
    try:
        import numpy as np
        print(f"✓ numpy version: {np.__version__}")
    except ImportError:
        return None, None, "numpy not available"
    
    # 延迟导入，避免启动时加载 torch
    try:
        from ultralytics import YOLO, RTDETR
        # 创建模型类映射
        model_classes = {
            "YOLO": YOLO,
            "RTDETR": RTDETR
        }
        print("✓ ultralytics loaded successfully")
    except Exception as e:
        print(f"Failed to import ultralytics: {e}")
        return None, None, f"ultralytics 导入失败：{e}"
    
    if model_name not in MODEL_CONFIGS:
        return None, None, f"未知模型: {model_name}"
    
    config = MODEL_CONFIGS[model_name]
    model_path = base_dir / "weights" / config["path"]
    class_name = config["class_name"]
    model_class = model_classes.get(class_name)
    
    # 调试信息
    print(f"Looking for model: {model_path}")
    print(f"Absolute path: {model_path.absolute()}")
    print(f"File exists: {model_path.exists()}")
    print(f"Using model class: {model_class.__name__}")
    print(f"Model config: conf={config['conf']}, iou={config['iou']}")
    
    if not model_path.exists():
        return None, None, f"模型文件不存在: {model_path}"
    
    try:
        model = model_class(str(model_path))
        print(f"✓ Model {model_name} loaded successfully using {model_class.__name__}")
        return model, config, None
    except Exception as e:
        print(f"✗ Failed to load {model_name} model ({model_class.__name__}): {e}")
        import traceback
        traceback.print_exc()
        return None, None, f"模型加载失败: {e}"


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
        print(f"[DEBUG] Request model: {request.model}")
        if request.model:
            model_name = request.model.upper()
            if model_name not in ["RDHS-YOLO", "DAS-DETR"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"不支持的模型: {request.model}，可选值: RDHS-YOLO, DAS-DETR"
                )
        else:
            model_name = "RDHS-YOLO"
        
        print(f"[DEBUG] Target model: {model_name}")
        
        # 获取模型
        model, config, error_msg = get_model(model_name, base_dir)
        
        print(f"[DEBUG] Model loading result: {model is not None}, error: {error_msg}")
        
        if model is None:
            # 如果指定模型加载失败，尝试另一个模型
            fallback_model = "RDHS-YOLO" if model_name == "DAS-DETR" else "DAS-DETR"
            print(f"Primary model {model_name} failed: {error_msg}, trying {fallback_model}")
            model, config2, error_msg2 = get_model(fallback_model, base_dir)
            
            if model is None:
                raise HTTPException(
                    status_code=500,
                    detail=f"所有模型加载失败。{model_name}: {error_msg}, {fallback_model}: {error_msg2}"
                )
            else:
                model_name = fallback_model  # 使用成功加载的模型
                config = config2
        
        # 执行推理 - 优先使用用户传入的参数，否则使用模型默认参数
        conf = request.conf if request.conf is not None else config.get("conf", 0.25)
        iou = request.iou if request.iou is not None else config.get("iou", 0.45)
        try:
            results = model(str(file_path), verbose=False, conf=conf, iou=iou)
            result = results[0]
            
            # 提取检测框
            boxes = []
            if result.boxes is not None:
                xyxy = result.boxes.xyxy.cpu().numpy()
                confidences = result.boxes.conf.cpu().numpy()
                classes = result.boxes.cls.cpu().numpy()
                
                # 检查是否有实例分割掩码
                has_masks = result.masks is not None
                if has_masks:
                    # 获取掩码多边形数据
                    masks_xy = result.masks.xy  # 多边形坐标列表
                
                # 细胞类型名称映射
                # DSB2018 数据集只有 cell 一类
                if model_name == "RDHS-YOLO":
                    cell_type_names = {
                        0: 'cell',
                    }
                else:
                    # DAS-DETR 使用完整细胞分类
                    cell_type_names = {
                        0: '血小板',
                        1: '白细胞',
                        2: '红细胞',
                        3: '淋巴细胞',
                        4: '单核细胞',
                        5: '嗜中性粒细胞',
                        6: '嗜酸性粒细胞',
                        7: '嗜碱性粒细胞',
                    }
                
                for i in range(len(xyxy)):
                    x1, y1, x2, y2 = xyxy[i]
                    confidence_value = confidences[i]
                    cls = int(classes[i])
                    
                    # 获取细胞类型名称，如果不存在则使用默认名称
                    class_name = cell_type_names.get(cls, f"细胞{cls}")
                    
                    # 提取掩码数据（如果有）
                    mask_points = None
                    if has_masks and i < len(masks_xy):
                        # 将 numpy 数组转换为 Python 列表
                        mask_array = masks_xy[i]
                        if mask_array is not None and len(mask_array) > 0:
                            mask_points = mask_array.tolist()
                    
                    boxes.append(BoxResult(
                        x1=float(x1),
                        y1=float(y1),
                        x2=float(x2),
                        y2=float(y2),
                        confidence=float(confidence_value),
                        class_name=class_name,
                        mask=mask_points
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
