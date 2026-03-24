import warnings
warnings.filterwarnings('ignore')
from ultralytics import RTDETR

if __name__ == '__main__':
    model = RTDETR('./rtdetr-l.pt') # 使用自己训练好的权重文件
    model.predict(
        source='./ultralytics/assets/bus.jpg',  # 预测的数据源，可以是图片、文件夹、视频路径等
        imgsz=640,                     # 图片的输入尺寸
        project='runs/detect',         # 预测结果保存的项目目录
        name='exp',                    # 子目录名（最终保存路径为 runs/detect/exp）
        save=True,                     # 是否保存预测后的图片
        # visualize=True,              # 是否可视化中间特征图（默认注释掉，即不启用）
        # show_conf=False,             # 是否显示置信度（关闭显示）
        # show_labels=False,           # 是否显示标签（关闭显示）
    )