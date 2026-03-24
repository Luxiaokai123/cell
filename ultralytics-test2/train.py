import warnings
warnings.filterwarnings('ignore')
from ultralytics import RTDETR

# 模型配置文件，以相对路径调用，也可以使用绝对路径
model_yaml_path = '/root/ultralytics-test2/yaml/rtdetr-r50.yaml'
#数据集配置文件，以相对路径调用，也可以使用绝对路径
data_yaml_path = '/root/ultralytics-test2/datasets/Monuseg_Dataset/data.yaml'
if __name__ == '__main__':
    model = RTDETR(model_yaml_path)
    # model.load('rtdetr-l.pt') # 加载预训练权重
    #训练模型
    results = model.train(data=data_yaml_path,
                          imgsz=640,
                          epochs=200,
                          batch=8,
                          workers=0,
                          project='runs/train',
                          name='exp',
                          )
    
# import warnings
# warnings.filterwarnings('ignore')
# from ultralytics import RTDETR

# # 配置文件路径
# model_yaml_path = '/root/ultralytics-test2/yaml/rtdetr-r50-pro.yaml'
# data_yaml_path = '/root/ultralytics-test2/datasets/Monuseg_Dataset/data.yaml'

# if __name__ == '__main__':
#     # 初始化模型
#     model = RTDETR(model_yaml_path)
    
#     # 训练模型
#     results = model.train(
#         data=data_yaml_path,
#         imgsz=640,
#         epochs=200,
#         batch=8,           # 显存爆了，改为8
#         lr0=0.00005,       # 学习率随batch减小而减半 (16->8, 所以 0.0001->0.00005)
#         nbs=32,            # 名义batch size调小一点，有助于配合小batch稳定梯度
#         workers=0,         # 安全起见设为0，减少内存负载
#         project='runs/train',
#         name='exp',
#         amp=True           # 开启混合精度训练，大幅节省显存
#     )


# import warnings
# warnings.filterwarnings('ignore')
# from ultralytics import RTDETR

# # 1. 路径配置（请确保路径与你服务器上的实际路径一致）
# MODEL_CONFIG = '/root/ultralytics-test2/yaml/rtdetr-r50-pro.yaml'
# DATA_CONFIG = '/root/ultralytics-test2/datasets/BCCDv4_Dataset/data.yaml'

# if __name__ == '__main__':
#     # 初始化模型
#     model = RTDETR(MODEL_CONFIG)
    
#     # 开始训练
#     # 这里显式写出关键参数，确保它们覆盖掉任何隐藏的默认设置
#     model.train(
#         data=DATA_CONFIG,
#         imgsz=640,
#         epochs=500,               # 给足空间，冲刺 500 轮
#         patience=0,              # 比之前稍微收紧一点，80轮不涨就停，防止过度拟合
#         batch=16,
#         optimizer='AdamW',        # 核心：必须使用 AdamW
#         lr0=0.0001,               # 初始学习率 1e-4
#         lrf=0.01,                 # 最终学习率倍率
#         weight_decay=0.01,        # 增加权重衰减，防止小数据集过拟合
#         warmup_epochs=5,          # 给模型 5 轮热身时间
#         mosaic=0.0,               # 强制关闭 Mosaic，保护密集红细胞特征
#         close_mosaic=0,           # 既然全程不开启，这里设为 0
#         project='runs/train',     # 保存项目名
#         name='RTDETR_BCCD_Final', # 实验名称
#         device='0',               # 指定显卡
#         amp=False,                # 追求极致稳定，建议关闭混合精度
#         plots=True                # 自动生成可视化图表
#     )