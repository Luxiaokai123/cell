import { useState, useEffect } from 'react'
import { Card, Button, Space, message, Spin, Empty } from 'antd'
import { UploadOutlined, PlayCircleOutlined, HomeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import ImageViewer from '@/components/ImageViewer'

interface BoxResult {
  x1: number
  y1: number
  x2: number
  y2: number
  confidence: number
  class_name: string
}

interface InferenceResult {
  file_id: string
  model_used: string
  cell_count: number
  boxes: BoxResult[]
  processing_time: number
  message: string
}

const ResultPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<InferenceResult | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null)

  // 从 URL 参数获取文件 ID（如果有）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fileId = params.get('file_id')
    if (fileId) {
      setUploadedFileId(fileId)
      setImageUrl(`http://127.0.0.1:8000/uploads/${fileId}`)
      // 自动开始推理
      handleInference(fileId)
    }
  }, [])

  // 模拟一个上传和推理的完整流程
  const handleDemo = async () => {
    setLoading(true)
    try {
      // 这里可以添加实际的图片上传逻辑
      // 为了演示，我们假设已经有一张图片
      message.info('请先上传图片')
    } catch (error: any) {
      message.error(`操作失败：${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 从 URL 参数获取文件 ID（如果有）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fileId = params.get('file_id')
    if (fileId) {
      setUploadedFileId(fileId)
      setImageUrl(`http://127.0.0.1:8000/uploads/${fileId}`)
      // 自动开始推理
      handleInference(fileId)
    }
  }, [])

  const handleInference = async (fileId?: string) => {
    const targetFileId = fileId || uploadedFileId
    if (!targetFileId) {
      message.warning('请先上传图片')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post('/api/inference', {
        file_id: targetFileId,
        model: 'RDHS-YOLO' // 或者让用户选择
      })

      setResult(response.data)
      message.success(`推理完成！检测到 ${response.data.cell_count} 个细胞`)
    } catch (error: any) {
      message.error(`推理失败：${error.response?.data?.detail || error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const annotations = result ? result.boxes.map(box => ({
    bbox: [box.x1, box.y1, box.x2, box.y2] as [number, number, number, number],
    label: box.class_name,
    confidence: box.confidence,
    color: undefined // 使用默认颜色
  })) : []

  return (
    <div style={{ padding: 40, maxWidth: 1400, margin: '0 auto' }}>
      <Card 
        title="📊 细胞检测结果可视化"
        extra={
          <Space>
            <Button icon={<HomeOutlined />} onClick={() => navigate('/')}>
              返回首页
            </Button>
            <Button icon={<UploadOutlined />} onClick={() => navigate('/upload')}>
              重新上传
            </Button>
          </Space>
        }
      >
        {!imageUrl ? (
          <Empty 
            description="暂无图片"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Space>
              <Button type="primary" icon={<UploadOutlined />} onClick={() => navigate('/upload')}>
                上传图片
              </Button>
              <Button icon={<PlayCircleOutlined />} onClick={handleDemo}>
                演示模式
              </Button>
            </Space>
          </Empty>
        ) : (
          <>
            {/* 图像展示区域 */}
            <div style={{ marginBottom: 24 }}>
              {loading && !result && (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <Spin size="large" tip="正在推理中..." />
                </div>
              )}
              
              {!loading && imageUrl && (
                <ImageViewer
                  imageUrl={imageUrl}
                  annotations={annotations}
                  showAnnotations={true}
                />
              )}
            </div>

            {/* 结果统计 */}
            {result && (
              <Card 
                title="📈 检测结果统计" 
                size="small"
                style={{ background: '#f9f9f9' }}
              >
                <Space size="large" wrap>
                  <div>
                    <strong style={{ fontSize: 24, color: '#1890ff' }}>
                      {result.cell_count}
                    </strong>
                    <div>细胞总数</div>
                  </div>
                  <div>
                    <strong>{result.model_used}</strong>
                    <div>使用模型</div>
                  </div>
                  <div>
                    <strong>{result.processing_time.toFixed(3)}s</strong>
                    <div>处理时间</div>
                  </div>
                  <div>
                    <strong>{result.boxes.length}</strong>
                    <div>检测框数量</div>
                  </div>
                </Space>
              </Card>
            )}
          </>
        )}
      </Card>
    </div>
  )
}

export default ResultPage
