import { Stage, Layer, Image as KonvaImage, Group, Rect, Text } from 'react-konva'
import { useState, useEffect } from 'react'

interface Annotation {
  bbox: [number, number, number, number] // [x1, y1, x2, y2] 基于原始图片尺寸的绝对像素坐标
  label: string
  confidence: number
  color?: string
}

interface ImageViewerProps {
  imageUrl: string
  annotations?: Annotation[]
  showAnnotations?: boolean
  targetWidth?: number   // 目标显示宽度
  targetHeight?: number  // 目标显示高度
}

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']

const ImageViewer: React.FC<ImageViewerProps> = ({
  imageUrl,
  annotations = [],
  showAnnotations = true,
  targetWidth = 500,
  targetHeight = 450
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [scale, setScale] = useState(1)
  const [displaySize, setDisplaySize] = useState({ width: targetWidth, height: targetHeight })

  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
    
    if (imageUrl.startsWith('/')) {
      img.src = `${window.location.origin}${imageUrl}`
    }
    
    img.onload = () => {
      setImage(img)
      // 计算缩放比例，使图片适应目标容器（保持宽高比）
      const scaleRatio = Math.min(
        targetWidth / img.width,
        targetHeight / img.height
      )
      setScale(scaleRatio)
      setDisplaySize({
        width: img.width * scaleRatio,
        height: img.height * scaleRatio
      })
    }
    
    img.onerror = () => {
      console.error('图片加载失败:', imageUrl)
    }
  }, [imageUrl, targetWidth, targetHeight])

  if (!image) {
    return (
      <div style={{ 
        width: targetWidth, 
        height: targetHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        borderRadius: '8px'
      }}>
        加载中...
      </div>
    )
  }

  return (
    <div style={{ 
      width: displaySize.width,
      height: displaySize.height,
      overflow: 'hidden',
      background: '#f5f5f5',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <Stage width={displaySize.width} height={displaySize.height}>
        {/* 背景图层 */}
        <Layer>
          <KonvaImage
            image={image}
            width={displaySize.width}
            height={displaySize.height}
          />
        </Layer>
        
        {/* 标注图层 */}
        {showAnnotations && annotations.length > 0 && (
          <Layer>
            {annotations.map((anno, idx) => {
              const color = anno.color || colors[idx % colors.length]
              // bbox 是基于原始图片尺寸的绝对坐标，乘以 scale 映射到显示尺寸
              const x1 = anno.bbox[0] * scale
              const y1 = anno.bbox[1] * scale
              const x2 = anno.bbox[2] * scale
              const y2 = anno.bbox[3] * scale
              const width = x2 - x1
              const height = y2 - y1

              // 动态调整线宽和字体，保持视觉一致性
              const strokeWidth = Math.max(2, 2 / scale)
              const fontSize = Math.max(10, 12 / Math.sqrt(scale))

              return (
                <Group key={idx}>
                  {/* 检测框 */}
                  <Rect
                    x={x1}
                    y={y1}
                    width={width}
                    height={height}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill={`${color}20`}
                  />
                  {/* 标签背景 */}
                  <Rect
                    x={x1}
                    y={y1 - fontSize - 6}
                    width={Math.max(width, 100)}
                    height={fontSize + 6}
                    fill={color}
                    opacity={0.9}
                  />
                  {/* 标签文本 */}
                  <Text
                    x={x1 + 3}
                    y={y1 - fontSize - 3}
                    text={`${anno.label} ${(anno.confidence * 100).toFixed(0)}%`}
                    fontSize={fontSize}
                    fill="white"
                    fontStyle="bold"
                  />
                </Group>
              )
            })}
          </Layer>
        )}
      </Stage>
    </div>
  )
}

export default ImageViewer