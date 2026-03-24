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

const colors = ['#FF0000', '#0066FF', '#00CC66', '#FF9900', '#9933FF', '#FF66CC', '#00CCCC']

// 根据细胞类型获取固定颜色
const getColorForCellType = (label: string): string => {
  const colorMap: Record<string, string> = {
    // 中文名称
    '血小板': '#0066FF',
    '白细胞': '#00CC66',
    '红细胞': '#FF0000',
    '淋巴细胞': '#FF9900',
    '单核细胞': '#9933FF',
    '嗜中性粒细胞': '#FF66CC',
    '嗜酸性粒细胞': '#00CCCC',
    '嗜碱性粒细胞': '#FFCC00',
    // 英文名称
    'platelet': '#0066FF',
    'white_blood_cell': '#00CC66',
    'red_blood_cell': '#FF0000',
    'rbc': '#FF0000',
    'wbc': '#00CC66',
    'platelets': '#0066FF',
  }
  
  // 转换为小写进行匹配
  const lowerLabel = label.toLowerCase()
  
  // 优先匹配特定细胞类型关键词
  for (const key of Object.keys(colorMap)) {
    if (lowerLabel.includes(key)) {
      return colorMap[key]
    }
  }
  
  // 对于 cell_1, cell_2, cell_3 等，使用不同颜色
  if (lowerLabel.match(/^cell_\d+$/)) {
    // 提取数字后缀
    const match = lowerLabel.match(/cell_(\d+)/)
    if (match) {
      const num = parseInt(match[1])
      return colors[num % colors.length]
    }
  }
  
  // 默认使用基于标签的哈希颜色
  let hash = 0
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

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
              const color = anno.color || getColorForCellType(anno.label)
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
                    fill="transparent"
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