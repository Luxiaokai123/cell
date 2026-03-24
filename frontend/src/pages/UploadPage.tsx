import { useState } from 'react'
import { Upload, message, Card, Radio, Button, Spin, Result } from 'antd'
import { InboxOutlined, PlayCircleOutlined } from '@ant-design/icons'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

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
        // 跳转到结果页面
        navigate(`/result?file_id=${response.data.file_id}`, { 
          state: { result: response.data }
        })
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

      {/* 主内容区域 - 左右分栏布局 */}
      <div style={{ 
        display: 'flex',
        gap: '24px',
        maxWidth: '1600px',
        margin: '0 auto',
        height: 'calc(100vh - 140px)'
      }}>
        {/* 左侧：模型选择和上传区域 */}
        <div style={{ 
          flex: '0 0 450px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {/* 模型选择卡片 */}
          <Card title="🔧 模型选择" style={{ flexShrink: 0 }}>
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
            <div style={{ marginTop: 12, color: '#888', fontSize: 12 }}>
              {selectedModel === 'auto' 
                ? '系统将根据图像特征自动选择最优模型' 
                : `强制使用 ${selectedModel} 模型进行推理`}
            </div>
          </Card>

          {/* 上传区域 */}
          {!showControl && (
            <Card title="📤 上传细胞图像" style={{ flex: 1 }}>
              <Spin spinning={uploading}>
                <Dragger {...uploadProps} style={{ padding: '40px 20px' }}>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽文件到此上传</p>
                  <p className="ant-upload-hint">
                    支持 JPEG/PNG 格式，不超过 20MB
                  </p>
                </Dragger>
              </Spin>
            </Card>
          )}

          {/* 推理控制 */}
          {showControl && (
            <Card 
              title="🧠 手动推理模式"
              style={{ flex: 1 }}
              extra={
                <Button onClick={handleReset}>
                  重新上传
                </Button>
              }
            >
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ marginBottom: 8 }}>已上传文件：</p>
                <p style={{ fontWeight: 'bold', marginBottom: 16 }}>{uploadedFileName}</p>
                <p style={{ marginBottom: 8 }}>选择模型：</p>
                <p style={{ fontWeight: 'bold', marginBottom: 24 }}>
                  {selectedModel === 'auto' ? '自动选择' : selectedModel}
                </p>
                
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<PlayCircleOutlined />}
                  onClick={handleInference}
                  loading={inferring}
                  style={{ width: '100%', height: '48px' }}
                >
                  {inferring ? '推理中...' : '开始推理'}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* 右侧：预览和结果展示区域 */}
        <div style={{ 
          flex: 1,
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
            background: '#fafafa'
          }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#1890ff' }}>
              📊 实时预览与结果
            </h2>
          </div>
          
          <div style={{ 
            flex: 1,
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fafafa'
          }}>
            {uploading || inferring ? (
              <Spin size="large" tip={uploading ? "上传中..." : "推理中..."} />
            ) : uploadedFileId ? (
              <div style={{ textAlign: 'center' }}>
                <img 
                  src={`http://127.0.0.1:8000/uploads/${uploadedFileId}`}
                  alt="Uploaded"
                  style={{ 
                    maxHeight: '500px',
                    maxWidth: '100%',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <p style={{ marginTop: 16, color: '#888' }}>{uploadedFileName}</p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#999' }}>
                <InboxOutlined style={{ fontSize: '64px', marginBottom: '16px' }} />
                <p>请上传图片以查看预览</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadPage
