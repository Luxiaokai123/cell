import { useState } from 'react'
import { Upload, message, Card, Radio, Button, Spin, Result } from 'antd'
import { InboxOutlined, PlayCircleOutlined } from '@ant-design/icons'
import axios from 'axios'

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
    <div style={{ padding: 40, maxWidth: 800, margin: '0 auto' }}>
      {/* 模型选择 */}
      <Card title="🔧 模型选择" style={{ marginBottom: 24 }}>
        <Radio.Group 
          value={selectedModel} 
          onChange={(e) => setSelectedModel(e.target.value)}
          buttonStyle="solid"
        >
          <RadioButton value="auto">🤖 自动选择</RadioButton>
          <RadioButton value="RDHS-YOLO">📊 RDHS-YOLO</RadioButton>
          <RadioButton value="DAS-DETR">🔬 DAS-DETR</RadioButton>
        </Radio.Group>
        <div style={{ marginTop: 12, color: '#888', fontSize: 12 }}>
          {selectedModel === 'auto' 
            ? '系统将根据图像特征自动选择最优模型' 
            : `强制使用 ${selectedModel} 模型进行推理`}
        </div>
      </Card>

      {/* 上传区域 */}
      {!showControl && (
        <Card title="📤 上传细胞图像">
          <Spin spinning={uploading}>
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 JPEG/PNG 格式，单个文件不超过 20MB
              </p>
            </Dragger>
          </Spin>
        </Card>
      )}

      {/* 推理控制 */}
      {showControl && (
        <Card 
          title="🧠 手动推理模式"
          extra={
            <Button onClick={handleReset}>
              重新上传
            </Button>
          }
        >
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p>已上传文件：<strong>{uploadedFileName}</strong></p>
            <p>选择模型：<strong>{selectedModel === 'auto' ? '自动选择' : selectedModel}</strong></p>
            
            <Button 
              type="primary" 
              size="large" 
              icon={<PlayCircleOutlined />}
              onClick={handleInference}
              loading={inferring}
              style={{ marginTop: 16 }}
            >
              {inferring ? '推理中...' : '开始推理'}
            </Button>
          </div>
        </Card>
      )}

      {/* 推理结果 */}
      {result && !inferring && (
        <Card title="📊 推理结果" style={{ marginTop: 24 }}>
          <Result
            status={result.cell_count > 0 ? 'success' : 'warning'}
            title={result.cell_count > 0 ? `检测到 ${result.cell_count} 个细胞` : '未检测到细胞'}
            subTitle={
              <div>
                <p>使用模型：<strong>{result.model_used}</strong></p>
                <p>处理时间：{result.processing_time.toFixed(3)} 秒</p>
                <p style={{ fontSize: 12, color: '#888' }}>{result.message}</p>
              </div>
            }
            extra={[
              <Button 
                type="primary" 
                key="retry"
                onClick={handleInference}
              >
                重新推理
              </Button>,
              <Button 
                key="reset"
                onClick={handleReset}
              >
                上传新图片
              </Button>
            ]}
          />
        </Card>
      )}
    </div>
  )
}

export default UploadPage
