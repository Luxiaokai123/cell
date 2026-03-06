import numpy as np
from pathlib import Path
import cv2

# 延迟导入 ultralytics，避免启动时加载 torch
YOLO_AVAILABLE = False
YOLO = None

def _try_import_yolo():
    """延迟导入 YOLO"""
    global YOLO_AVAILABLE, YOLO
    if YOLO_AVAILABLE or YOLO is not None:
        return YOLO
    
    try:
        from ultralytics import YOLO as YOLOClass
        YOLO = YOLOClass
        YOLO_AVAILABLE = True
        print("✓ ultralytics loaded successfully")
    except ImportError:
        print("Warning: ultralytics not installed, using simplified preanalyzer")
    except Exception as e:
        print(f"Warning: Failed to import ultralytics: {e}")
    
    return YOLO

class PreAnalyzer:
    """图像预分析器 - 提取细胞特征"""
    
    def __init__(self, model_path='yolov8n.pt'):
        """初始化预分析模型"""
        yolo_class = _try_import_yolo()
        if yolo_class:
            try:
                self.model = yolo_class(model_path)
            except Exception as e:
                print(f"Warning: Failed to load YOLO model: {e}")
                self.model = None
        else:
            self.model = None
    
    def analyze(self, image_path: str) -> dict:
        """
        分析图像特征
        
        Args:
            image_path: 图像文件路径
            
        Returns:
            包含细胞数量、面积、密度等特征的字典
        """
        # 读取图像
        if not Path(image_path).exists():
            # 如果文件不存在，返回默认特征
            return {
                'cell_count': 0,
                'avg_area': 0.0,
                'std_area': 0.0,
                'density': 0.0,
                'image_width': 0,
                'image_height': 0,
                'max_iou': 0.0
            }
        
        image = cv2.imread(image_path)
        if image is None:
            return {
                'cell_count': 0,
                'avg_area': 0.0,
                'std_area': 0.0,
                'density': 0.0,
                'image_width': 0,
                'image_height': 0,
                'max_iou': 0.0
            }
        
        h, w = image.shape[:2]
        
        # 执行检测
        if self.model is not None:
            results = self.model(image, verbose=False)
            boxes = results[0].boxes.xyxy.cpu().numpy()
        else:
            # 简化版本：使用轮廓检测
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
            contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            boxes = []
            for cnt in contours:
                x, y, w, h = cv2.boundingRect(cnt)
                boxes.append([x, y, x + w, y + h])
            boxes = np.array(boxes) if boxes else np.array([]).reshape(0, 4)
        
        # 计算特征
        if len(boxes) > 0:
            areas = [(x2 - x1) * (y2 - y1) for x1, y1, x2, y2 in boxes]
            avg_area = float(np.mean(areas)) if areas else 0.0
            std_area = float(np.std(areas)) if len(areas) > 1 else 0.0
            
            # 计算最大 IOU（用于判断重叠程度）
            max_iou = 0.0
            for i in range(len(boxes)):
                for j in range(i + 1, len(boxes)):
                    iou = self._calculate_iou(boxes[i], boxes[j])
                    max_iou = max(max_iou, iou)
        else:
            avg_area = 0.0
            std_area = 0.0
            max_iou = 0.0
        
        density = len(boxes) / (w * h) if w * h > 0 else 0.0
        
        return {
            'cell_count': len(boxes),
            'avg_area': avg_area,
            'std_area': std_area,
            'density': float(density),
            'image_width': w,
            'image_height': h,
            'max_iou': max_iou
        }
    
    def _calculate_iou(self, box1, box2) -> float:
        """计算两个框的 IOU"""
        x1 = max(box1[0], box2[0])
        y1 = max(box1[1], box2[1])
        x2 = min(box1[2], box2[2])
        y2 = min(box1[3], box2[3])
        
        intersection = max(0, x2 - x1) * max(0, y2 - y1)
        
        area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
        area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
        
        union = area1 + area2 - intersection
        
        return intersection / union if union > 0 else 0.0


# 单例模式
_preanalyzer = None

def get_preanalyzer():
    """获取预分析器单例实例"""
    global _preanalyzer
    if _preanalyzer is None:
        _preanalyzer = PreAnalyzer()
    return _preanalyzer
