from pathlib import Path

# 尝试导入 torch，如果不可用则使用简化版本
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    print("Warning: torch not installed, using simplified model manager")

class ModelManager:
    """模型管理器 - 单例模式"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.rdhs_yolo = None
            cls._instance.das_detr = None
            cls._instance._initialized = False
        return cls._instance
    
    def initialize(self, base_dir: Path = None):
        """初始化模型"""
        if self._initialized:
            return
        
        if base_dir is None:
            base_dir = Path(__file__).parent.parent.parent
        
        if TORCH_AVAILABLE:
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        else:
            device = None
        
        # 加载 RDHS-YOLO（TODO: 替换为真实加载代码）
        try:
            weight_path = base_dir / "weights" / "rdhs_yolo_best.pt"
            if weight_path.exists():
                if TORCH_AVAILABLE:
                    self.rdhs_yolo = torch.load(weight_path, map_location=device)
                    self.rdhs_yolo.eval()
                else:
                    self.rdhs_yolo = {"status": "loaded", "path": str(weight_path)}
                print("✓ RDHS-YOLO loaded")
            else:
                print("⚠ RDHS-YOLO weights not found")
        except Exception as e:
            print(f"✗ Failed to load RDHS-YOLO: {e}")
        
        # 加载 DAS-DETR（TODO: 替换为真实加载代码）
        try:
            weight_path = base_dir / "weights" / "das_detr_best.pt"
            if weight_path.exists():
                if TORCH_AVAILABLE:
                    self.das_detr = torch.load(weight_path, map_location=device)
                    self.das_detr.eval()
                else:
                    self.das_detr = {"status": "loaded", "path": str(weight_path)}
                print("✓ DAS-DETR loaded")
            else:
                print("⚠ DAS-DETR weights not found")
        except Exception as e:
            print(f"✗ Failed to load DAS-DETR: {e}")
        
        self._initialized = True
    
    def get_model(self, model_name: str):
        """获取指定模型"""
        if not self._initialized:
            self.initialize()
        
        if model_name == 'RDHS-YOLO':
            return self.rdhs_yolo
        elif model_name == 'DAS-DETR':
            return self.das_detr
        else:
            raise ValueError(f"Unknown model: {model_name}")
    
    def is_loaded(self, model_name: str) -> bool:
        """检查模型是否已加载"""
        if model_name == 'RDHS-YOLO':
            return self.rdhs_yolo is not None
        elif model_name == 'DAS-DETR':
            return self.das_detr is not None
        return False


# 全局实例
model_manager = ModelManager()
