import warnings
warnings.filterwarnings('ignore')
from ultralytics import RTDETR

# 训练好的模型配置文件，以相对路径调用，也可以使用绝对路径
model_yaml_path = '/root/ultralytics-test2/runs/detect/runs/train/exp/weights/best.pt'  #这行使用训练和的best.pt文件

#数据集配置文件，以相对路径调用，也可以使用绝对路径
data_yaml_path = '/root/ultralytics-test2/datasets/Monuseg_Dataset/data.yaml'
if __name__ == '__main__':
    model = RTDETR(model_yaml_path)
    metrics = model.val(data=data_yaml_path,
              split='val',
              imgsz=640,
              batch=16,
              # save_json=True, # 这个保存coco精度指标的开关
              project='runs/val',
              name='exp',
              )
    # 2. 打印核心论文指标
    print("\n" + "="*30)
    print("📊 改进版 RT-DETR 核心指标汇总")
    print("-" * 30)
    print(f"mAP@50:      {metrics.box.map50:.4f}")      # 这是你现在的 0.743
    print(f"mAP@75:      {metrics.box.map75:.4f}")      # 🔥 关键看这个！
    print(f"mAP@50-95:   {metrics.box.map:.4f}")        # 这是你现在的 0.459
    print(f"Precision:   {metrics.box.mp:.4f}")         # 精确率
    print(f"Recall:      {metrics.box.mr:.4f}")         # 召回率
    print("="*30)