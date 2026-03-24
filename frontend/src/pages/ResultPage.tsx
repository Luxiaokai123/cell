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
    <div style={{ 
      minHeight: '100vh',
      background: '#f0f2f5',
      padding: '24px'
    }}>
      {/* 顶部标题栏 */}
      <div style={{ 
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, fontSize: '32px', color: '#1890ff' }}>
          📊 细胞检测结果可视化
        </h1>
        <Space size="middle">
          <Button icon={<HomeOutlined />} onClick={() => navigate('/')}>
            返回首页
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => navigate('/upload')}>
            重新上传
          </Button>
        </Space>
      </div>

      {/* 主内容区域 - 左右分栏布局 */}
      <div style={{ 
        display: 'flex',
        gap: '24px',
        maxWidth: '1800px',
        margin: '0 auto',
        height: 'calc(100vh - 140px)'
      }}>
        {/* 左侧：图像展示区域（70%） */}
        <div style={{ 
          flex: '0 0 70%',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ 
            padding: '16px',
            borderBottom: '1px solid #e8e8e8',
            background: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#1890ff' }}>
              🔍 图像预览
            </h2>
            {loading && !result && (
              <Spin size="small" tip="推理中..." />
            )}
          </div>
          
          <div style={{ 
            flex: 1,
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fafafa',
            overflow: 'auto'
          }}>
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
              <ImageViewer
                imageUrl={imageUrl}
                annotations={annotations}
                showAnnotations={true}
              />
            )}
          </div>
        </div>

        {/* 右侧：统计信息区域（30%） */}
        <div style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {/* 结果统计卡片 */}
          {result && (
            <Card 
              title="📈 检测结果统计" 
              size="small"
              style={{ 
                flex: 1,
                background: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '20px 0' }}>
                <div style={{ 
                  textAlign: 'center',
                  padding: '24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '8px',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: 8 }}>
                    {result.cell_count}
                  </div>
                  <div style={{ fontSize: '16px', opacity: 0.9 }}>细胞总数</div>
                </div>

                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px'
                }}>
                  <div style={{ 
                    padding: '16px',
                    background: '#e6f7ff',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: 8 }}>使用模型</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                      {result.model_used}
                    </div>
                  </div>

                  <div style={{ 
                    padding: '16px',
                    background: '#f6ffed',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: 8 }}>处理时间</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
                      {result.processing_time.toFixed(3)}s
                    </div>
                  </div>

                  <div style={{ 
                    padding: '16px',
                    background: '#fff7e6',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: 8 }}>检测框数</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fa8c16' }}>
                      {result.boxes.length}
                    </div>
                  </div>

                  <div style={{ 
                    padding: '16px',
                    background: '#f9f0ff',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: 8 }}>平均置信度</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#722ed1' }}>
                      {result.boxes.length > 0 
                        ? (result.boxes.reduce((sum, box) => sum + box.confidence, 0) / result.boxes.length * 100).toFixed(1) + '%'
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* 操作按钮 */}
          <Card 
            size="small"
            style={{ 
              background: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Button 
                type="primary" 
                block 
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={() => handleInference()}
                loading={loading}
              >
                重新推理
              </Button>
              <Button 
                block 
                size="large"
                icon={<UploadOutlined />}
                onClick={() => navigate('/upload')}
              >
                上传新图片
              </Button>
            </Space>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ResultPage
