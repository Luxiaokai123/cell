import numpy as np
from enum import Enum
from dataclasses import dataclass
from typing import Tuple, List

class ModelChoice(Enum):
    """模型选择枚举"""
    DAS_DETR = "DAS-DETR"
    RDHS_YOLO = "RDHS-YOLO"

class ConfidenceLevel(Enum):
    """置信度级别"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

@dataclass
class DecisionResult:
    """决策结果数据结构"""
    model: ModelChoice
    confidence: ConfidenceLevel
    score: float
    reasons: List[str]
    features: dict

class AdvancedModelSelector:
    """高级模型选择器 - 基于多维度综合评分"""
    
    def __init__(self):
        # 权重配置
        self.weights = {
            'density_score': 0.30,
            'size_score': 0.25,
            'overlap_score': 0.20,
            'uniformity_score': 0.15,
            'count_score': 0.10
        }
        
        # 决策阈值
        self.thresholds = {
            'das_detr_strong': 0.70,
            'das_detr_weak': 0.55,
            'rdhs_yolo_weak': 0.40,
            'rdhs_yolo_strong': 0.25
        }
    
    def select(self, features: dict) -> DecisionResult:
        """
        根据图像特征选择最优模型
        
        Args:
            features: 包含 cell_count, avg_area, std_area, density 等
            
        Returns:
            DecisionResult: 决策结果
        """
        # Step 1: 归一化特征
        normalized = self._normalize_features(features)
        
        # Step 2: 计算综合得分
        score = self._calculate_score(normalized)
        
        # Step 3: 应用决策规则
        model, confidence, reasons = self._apply_rules(score, features)
        
        return DecisionResult(
            model=model,
            confidence=confidence,
            score=score,
            reasons=reasons,
            features=features
        )
    
    def _normalize_features(self, features: dict) -> dict:
        """特征归一化 - 映射到 [0,1] 区间"""
        normalized = {}
        
        # 密度评分
        density = features.get('density', 0)
        normalized['density_score'] = 1 / (1 + np.exp(-1000 * (density - 0.0005)))
        
        # 面积评分（小细胞适合 DAS-DETR）
        avg_area = features.get('avg_area', 0)
        normalized['size_score'] = 1 / (1 + np.exp(0.01 * (avg_area - 200)))
        
        # 重叠评分
        normalized['overlap_score'] = min(features.get('max_iou', 0), 1.0)
        
        # 均匀性评分
        std_area = features.get('std_area', 0)
        size_cv = std_area / (avg_area + 1e-6)
        normalized['uniformity_score'] = 1 / (1 + size_cv)
        
        # 数量评分
        cell_count = features.get('cell_count', 0)
        normalized['count_score'] = 1 / (1 + np.exp(-0.1 * (cell_count - 30)))
        
        return normalized
    
    def _calculate_score(self, normalized: dict) -> float:
        """计算加权综合得分"""
        score = sum(
            normalized[f'{key}_score'] * weight 
            for key, weight in self.weights.items()
        )
        return min(max(score, 0.0), 1.0)
    
    def _apply_rules(self, score: float, features: dict) -> Tuple[ModelChoice, ConfidenceLevel, List[str]]:
        """应用决策规则"""
        density = features.get('density', 0)
        avg_area = features.get('avg_area', 0)
        
        if score >= self.thresholds['das_detr_strong']:
            return (
                ModelChoice.DAS_DETR,
                ConfidenceLevel.HIGH,
                [
                    f"细胞密度高 (ρ={density:.6f})",
                    f"平均面积小 ({avg_area:.1f} pixels²)",
                    "DAS-DETR 在密集小细胞场景下表现更优"
                ]
            )
        elif score >= self.thresholds['das_detr_weak']:
            return (
                ModelChoice.DAS_DETR,
                ConfidenceLevel.MEDIUM,
                ["细胞密度较高，DAS-DETR 更适合"]
            )
        elif score >= self.thresholds['rdhs_yolo_weak']:
            return (
                ModelChoice.RDHS_YOLO,
                ConfidenceLevel.LOW,
                ["场景特征不显著，优先选择 RDHS-YOLO"]
            )
        else:
            return (
                ModelChoice.RDHS_YOLO,
                ConfidenceLevel.HIGH,
                [
                    f"细胞稀疏 (ρ={density:.6f})",
                    "RDHS-YOLO 能提供更精确的轮廓"
                ]
            )

# 单例
_selector = None

def get_model_selector():
    """获取模型选择器单例"""
    global _selector
    if _selector is None:
        _selector = AdvancedModelSelector()
    return _selector
