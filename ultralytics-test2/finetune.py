import warnings
warnings.filterwarnings('ignore')
from ultralytics import RTDETR

if __name__ == '__main__':
    # 必须指向你 exp2 的最佳权重
    model = RTDETR('/root/ultralytics-test2/runs/detect/runs/train/exp/weights/best.pt')

    model.train(
        data='/root/ultralytics-test2/datasets/Monuseg_Dataset/data.yaml',
        epochs=100,           # 追加 100 轮
        imgsz=640,
        batch=8,
        workers=0,            # 保持你之前的 workers=0 避免多进程报错
        project='runs/train',
        name='exp_finetune',
        
        # --- 微调核心参数调整 ---
        optimizer='AdamW',    # 沿用 AdamW
        lr0=0.00002,          # 稍微调高到 2e-5 (比你 200 轮结束时的 1e-7 高，但比初始 1e-4 低)
        lrf=0.01,             # 最终降到 2e-7
        warmup_epochs=5,      # 稍微拉长预热，防止直接加载权重后梯度爆炸
        
        # --- 保持医学影像的特性 ---
        mosaic=0.0,           # 继续保持关闭，确保图像真实性
        augment=True,         # 开启基础增强 (旋转、翻转等)
        overlap_mask=True,    # 沿用之前的设置
        
        # --- 其他设置 ---
        amp=False,            # 你之前是 False，建议保持一致以确保精度
        device='0'
    )