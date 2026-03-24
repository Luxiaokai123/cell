import { Stage, Layer, Image as KonvaImage, Group, Rect, Text } from 'react-konva'
import { useState, useRef, useEffect } from 'react'

interface Annotation {
  bbox: [number, number, number, number] // [x1, y1, x2, y2]
  label: string
  confidence: number
  color?: string
}

interface ImageViewerProps {
  imageUrl: string
  annotations?: Annotation[]
  showAnnotations?: boolean
  maxWidth?: number
  maxHeight?: number
}

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']

const ImageViewer: React.FC<ImageViewerProps> = ({
  imageUrl,
  annotations = [],
  showAnnotations = true,
  maxWidth = 400,
  maxHeight = 300
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [scale, setScale] = useState(1)
  const [displaySize, setDisplaySize] = useState({ width: 400, height: 300 })

  useEffect(() => {
    console.log('Loading image:', imageUrl)
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
    
    // 如果是本地文件 URL，可能需要特殊处理
    if (imageUrl.startsWith('/')) {
      img.src = `${window.location.origin}${imageUrl}`
    }
    
    img.onload = () => {
      console.log('Image loaded successfully:', img.width, 'x', img.height)
      setImage(img)
      // 计算缩放比例以适应容器
      const scaleRatio = Math.min(
        maxWidth / img.width,
        maxHeight / img.height,
        1
      )
      setScale(scaleRatio)
      setDisplaySize({
        width: img.width * scaleRatio,
        height: img.height * scaleRatio
      })
    }
    
    img.onerror = (error) => {
      console.error('图片加载失败:', error, imageUrl)
    }
  }, [imageUrl])

  return (
    <div style={{ 
      border: '1px solid #ddd', 
      borderRadius: '8px',
      overflow: 'auto',
      background: '#f5f5f5',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      {/* Canvas 标注层 */}
      <Stage width={displaySize.width} height={displaySize.height}>
        {/* 背景图层 */}
        <Layer>
          {image && (
            <KonvaImage
              image={image}
              width={displaySize.width}
              height={displaySize.height}
            />
          )}
        </Layer>
        
        {/* 标注图层 */}
        {showAnnotations && annotations.length > 0 && (
          <Layer>
            {annotations.map((anno, idx) => {
              const color = anno.color || colors[idx % colors.length]
              const x1 = anno.bbox[0] * scale
              const y1 = anno.bbox[1] * scale
              const x2 = anno.bbox[2] * scale
              const y2 = anno.bbox[3] * scale
              const width = x2 - x1
              const height = y2 - y1

              return (
                <Group key={idx}>
                  {/* 检测框 */}
                  <Rect
                    x={x1}
                    y={y1}
                    width={width}
                    height={height}
                    stroke={color}
                    strokeWidth={2}
                    fill={`${color}20`} // 20% 透明度
                  />
                  {/* 标签文本 */}
                  <Text
                    x={x1}
                    y={y1 - 20}
                    text={`${anno.label} ${(anno.confidence * 100).toFixed(0)}%`}
                    fontSize={12}
                    fill={color}
                    fontStyle="bold"
                    padding={4}
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
