import { useState } from 'react'
import { Upload, message, Card, Radio, Button, Spin, Space } from 'antd'
import { InboxOutlined, PlayCircleOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import ImageViewer from '@/components/ImageViewer'

const { Dragger } = Upload
const { Button: RadioButton } = Radio

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

// 统一显示尺寸 - 两个图片区域用完全一样的尺寸
const VIEWER_WIDTH = 350
const VIEWER_HEIGHT = 350

const UploadPage = () => {
  const navigate = useNavigate()
  const [selectedModel, setSelectedModel] = useState<string>('auto')
  const [uploading, setUploading] = useState(false)
  const [inferring, setInferring] = useState(false)
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [result, setResult] = useState<InferenceResult | null>(null)
  const [showControl, setShowControl] = useState(false)

  const handleUpload = async (file: File) => {
    setUploading(true)
    setResult(null)
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post('/api/upload/single', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      const savedFilename = response.data.saved_filename
      setUploadedFileId(savedFilename)
      setUploadedFileName(file.name)
      setShowControl(true)
      message.success(`${file.name} 上传成功！请点击"开始推理"按钮`)
      
    } catch (error: any) {
      message.error(`上传失败: ${error.response?.data?.detail || error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleInference = async () => {
    if (!uploadedFileId) {
      message.warning('请先上传图片')
      return
    }
    
    setInferring(true)
    setResult(null)
    
    try {
      const requestData: { file_id: string; model?: string } = { file_id: uploadedFileId }
      if (selectedModel !== 'auto') {
        requestData.model = selectedModel
      }
      
      const response = await axios.post('/api/inference', requestData)
      setResult(response.data)
      
      if (response.data.cell_count > 0) {
        message.success(`推理完成，检测到 ${response.data.cell_count} 个细胞`)
      } else {
        message.warning('未检测到细胞')
      }
    } catch (error: any) {
      message.error(`推理失败: ${error.response?.data?.detail || error.message}`)
    } finally {
      setInferring(false)
    }
  }

  const handleReset = () => {
    setShowControl(false)
    setUploadedFileId(null)
    setUploadedFileName(null)
    setResult(null)
  }

  const uploadProps = {
    name: 'file',
    multiple: false,
    maxCount: 1,
    accept: 'image/jpeg,image/png',
    showUploadList: false,
    beforeUpload: (file: File) => {
      if (file.size > 20 * 1024 * 1024) {
        message.error('文件大小不能超过 20MB')
        return false
      }
      handleUpload(file)
      return false
    },
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#f0f2f5',
      padding: '24px'
    }}>
      {/* 顶部标题栏 */}
      <div style={{ 
        marginBottom: '24px',
        textAlign: 'center',
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, fontSize: '32px', color: '#1890ff' }}>
          🔬 细胞智能计数系统
        </h1>
      </div>

      {/* 主内容区域 */}
      <div style={{ 
        maxWidth: '1800px',
        margin: '0 auto',
        height: 'calc(100vh - 140px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* 顶部区域：模型选择 + 上传/控制 */}
        <div style={{ 
          display: 'flex',
          gap: '16px',
          flex: '0 0 100px'
        }}>
          {/* 左侧：模型选择 */}
          <Card 
            title="🔧 模型选择" 
            style={{ flex: '0 0 40%', height: '100%' }}
            bodyStyle={{ padding: '12px' }}
          >
            <Radio.Group 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              buttonStyle="solid"
              style={{ width: '100%' }}
            >
              <RadioButton value="auto" style={{ width: '33%' }}>🤖 自动</RadioButton>
              <RadioButton value="RDHS-YOLO" style={{ width: '33%' }}>RDHS-YOLO</RadioButton>
              <RadioButton value="DAS-DETR" style={{ width: '33%' }}>DAS-DETR</RadioButton>
            </Radio.Group>
            <div style={{ marginTop: 8, color: '#888', fontSize: 11 }}>
              {selectedModel === 'auto' 
                ? '系统将根据图像特征自动选择最优模型' 
                : `强制使用 ${selectedModel} 模型进行推理`}
            </div>
          </Card>

          {/* 右侧：上传或控制 */}
          <div style={{ flex: '1', height: '100%' }}>
            {!showControl ? (
              <Card 
                title="📤 上传细胞图像"
                extra={
                  <Upload {...uploadProps}>
                    <Button type="primary" icon={<UploadOutlined />} size="small" loading={uploading}>
                      选择文件
                    </Button>
                  </Upload>
                }
                style={{ height: '100%' }}
                bodyStyle={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>支持 JPEG/PNG 格式，不超过 20MB</p>
              </Card>
            ) : (
              <Card 
                title="🧠 推理控制"
                style={{ height: '100%' }}
                bodyStyle={{ padding: '12px' }}
                extra={
                  <Button size="small" onClick={handleReset}>
                    重新上传
                  </Button>
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px' }}>已上传：<strong>{uploadedFileName}</strong></p>
                    <p style={{ margin: 0, color: '#888', fontSize: '11px' }}>模型：{selectedModel === 'auto' ? '自动选择' : selectedModel}</p>
                  </div>
                  <Button 
                    type="primary" 
                    icon={<PlayCircleOutlined />}
                    onClick={handleInference}
                    loading={inferring}
                    style={{ height: '36px', padding: '0 24px' }}
                  >
                    {inferring ? '推理中...' : '开始推理'}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* 下方区域：结果展示（三栏布局） */}
        <Card 
          title="📊 检测结果"
          style={{ flex: 1, overflow: 'hidden' }}
          bodyStyle={{ height: 'calc(100% - 57px)', padding: '16px' }}
        >
          {uploading || inferring ? (
            <div style={{ 
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Spin size="large" tip={uploading ? "上传中..." : "推理中..."} />
            </div>
          ) : uploadedFileId ? (
            <div style={{ 
              display: 'flex',
              gap: '16px',
              height: '100%',
              justifyContent: 'space-between'
            }}>
              {/* 原图 - 关键修改：使用 ImageViewer，保持和预测图完全相同的尺寸 */}
              <div style={{ 
                flex: '1',
                display: 'flex',
                flexDirection: 'column',
                background: '#fafafa',
                borderRadius: '8px',
                overflow: 'hidden',
                maxWidth: '33%'
              }}>
                <div style={{ 
                  padding: '12px',
                  background: '#e6f7ff',
                  borderBottom: '1px solid #d9d9d9',
                  textAlign: 'center'
                }}>
                  <strong>🖼️ 原图</strong>
                </div>
                <div style={{ 
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'auto',
                  padding: '16px'
                }}>
                  <ImageViewer
                    imageUrl={`http://127.0.0.1:8000/uploads/${uploadedFileId}`}
                    annotations={[]}
                    showAnnotations={false}
                    targetWidth={VIEWER_WIDTH}
                    targetHeight={VIEWER_HEIGHT}
                  />
                </div>
              </div>

              {/* 预测图 */}
              <div style={{ 
                flex: '1',
                display: 'flex',
                flexDirection: 'column',
                background: '#fafafa',
                borderRadius: '8px',
                overflow: 'hidden',
                maxWidth: '33%'
              }}>
                <div style={{ 
                  padding: '12px',
                  background: '#f6ffed',
                  borderBottom: '1px solid #d9d9d9',
                  textAlign: 'center'
                }}>
                  <strong>🎯 预测图</strong>
                </div>
                <div style={{ 
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'auto',
                  padding: '16px'
                }}>
                  {result ? (
                    <ImageViewer
                      imageUrl={`http://127.0.0.1:8000/uploads/${uploadedFileId}`}
                      annotations={result.boxes.map(box => ({
                        bbox: [box.x1, box.y1, box.x2, box.y2] as [number, number, number, number],
                        label: box.class_name,
                        confidence: box.confidence
                      }))}
                      showAnnotations={true}
                      targetWidth={VIEWER_WIDTH}      // 和原图完全相同的尺寸！
                      targetHeight={VIEWER_HEIGHT}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#999' }}>
                      <p>点击"开始推理"查看预测结果</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 结果统计 */}
              <div style={{ 
                flex: '1',
                display: 'flex',
                flexDirection: 'column',
                background: '#fafafa',
                borderRadius: '8px',
                overflow: 'hidden',
                maxWidth: '33%'
              }}>
                <div style={{ 
                  padding: '12px',
                  background: '#fff7e6',
                  borderBottom: '1px solid #d9d9d9',
                  textAlign: 'center'
                }}>
                  <strong>📈 统计结果</strong>
                </div>
                <div style={{ 
                  flex: 1,
                  padding: '16px',
                  overflow: 'auto'
                }}>
                  {result ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ 
                        textAlign: 'center',
                        padding: '20px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '8px',
                        color: 'white'
                      }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: 4 }}>
                          {result.cell_count}
                        </div>
                        <div style={{ fontSize: '12px', opacity: 0.9 }}>细胞总数</div>
                      </div>

                      <div style={{ 
                        padding: '12px',
                        background: 'white',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}>
                        <span style={{ color: '#666' }}>使用模型</span>
                        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{result.model_used}</span>
                      </div>

                      <div style={{ 
                        padding: '12px',
                        background: 'white',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}>
                        <span style={{ color: '#666' }}>处理时间</span>
                        <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                          {result.processing_time.toFixed(3)}s
                        </span>
                      </div>

                      <div style={{ 
                        padding: '12px',
                        background: 'white',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}>
                        <span style={{ color: '#666' }}>检测框数</span>
                        <span style={{ fontWeight: 'bold', color: '#fa8c16' }}>{result.boxes.length}</span>
                      </div>

                      <div style={{ 
                        padding: '12px',
                        background: 'white',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}>
                        <span style={{ color: '#666' }}>平均置信度</span>
                        <span style={{ fontWeight: 'bold', color: '#722ed1' }}>
                          {result.boxes.length > 0 
                            ? (result.boxes.reduce((sum, box) => sum + box.confidence, 0) / result.boxes.length * 100).toFixed(1) + '%'
                            : 'N/A'}
                        </span>
                      </div>

                      <Space style={{ marginTop: '8px' }}>
                        <Button 
                          type="primary" 
                          icon={<ReloadOutlined />}
                          onClick={handleInference}
                          loading={inferring}
                        >
                          重新推理
                        </Button>
                        <Button onClick={handleReset}>
                          上传新图
                        </Button>
                      </Space>
                    </div>
                  ) : (
                    <div style={{ 
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#999',
                      textAlign: 'center'
                    }}>
                      <div>
                        <p>推理完成后显示统计信息</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ 
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999'
            }}>
              <div style={{ textAlign: 'center' }}>
                <InboxOutlined style={{ fontSize: '64px', marginBottom: '16px' }} />
                <p>请先在上方上传图片</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default UploadPage