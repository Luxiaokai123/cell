import { useState } from 'react'
import { Upload, message, Card, Radio, Button, Spin, Slider } from 'antd'
import { InboxOutlined, PlayCircleOutlined, UploadOutlined, FileExcelOutlined, FileTextOutlined } from '@ant-design/icons'
import axios from 'axios'
import ImageViewer from '@/components/ImageViewer'

const { Button: RadioButton } = Radio

// 模型默认参数配置
const MODEL_DEFAULT_PARAMS: Record<string, { conf: number; iou: number }> = {
  'RDHS-YOLO': { conf: 0.2, iou: 0.7 },
  'DAS-DETR': { conf: 0.5, iou: 0.7 }
}

interface BoxResult {
  x1: number
  y1: number
  x2: number
  y2: number
  confidence: number
  class_name: string
  mask?: number[][] // 实例分割掩码
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
const VIEWER_WIDTH = 380
const VIEWER_HEIGHT = 380

const UploadPage = () => {
  const [selectedModel, setSelectedModel] = useState<string>('RDHS-YOLO')
  const [uploading, setUploading] = useState(false)
  const [inferring, setInferring] = useState(false)
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [result, setResult] = useState<InferenceResult | null>(null)
  const [showControl, setShowControl] = useState(false)
  
  // 参数调节状态
  const [params, setParams] = useState({
    conf: MODEL_DEFAULT_PARAMS['RDHS-YOLO'].conf,
    iou: MODEL_DEFAULT_PARAMS['RDHS-YOLO'].iou
  })

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
      const requestData: { file_id: string; model: string; conf: number; iou: number } = { 
        file_id: uploadedFileId,
        model: selectedModel,
        conf: params.conf,
        iou: params.iou
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

  // 导出检测结果
  const handleExport = async (format: 'excel' | 'csv') => {
    if (!result || result.boxes.length === 0) {
      message.warning('没有可导出的检测结果')
      return
    }
    
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boxes: result.boxes,
          format: format,
          filename: `cell_detection_${Date.now()}`
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || '导出失败')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cell_detection_${Date.now()}.${format === 'excel' ? 'xlsx' : 'csv'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      message.success(`导出成功: ${format === 'excel' ? 'Excel' : 'CSV'} 文件`)
    } catch (error: any) {
      message.error(`导出失败: ${error.message}`)
    }
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
        marginBottom: '20px',
        textAlign: 'center',
        background: 'white',
        padding: '16px',
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
        gap: '20px'
      }}>
        {/* 顶部区域：模型选择 + 上传/控制 */}
        <div style={{ 
          display: 'flex',
          gap: '20px',
          flex: '0 0 140px'
        }}>
          {/* 左侧：模型选择 + 参数调节 */}
          <Card 
            title="🔧 模型选择" 
            style={{ flex: '0 0 40%', height: '100%' }}
            bodyStyle={{ padding: '8px' }}
          >
            <Radio.Group 
              value={selectedModel} 
              onChange={(e) => {
                const newModel = e.target.value
                setSelectedModel(newModel)
                // 切换模型时更新为该模型的默认参数
                setParams(MODEL_DEFAULT_PARAMS[newModel])
              }}
              buttonStyle="solid"
              style={{ width: '100%' }}
            >
              <RadioButton value="RDHS-YOLO" style={{ width: '50%' }}>实例分割 RDHS-YOLO</RadioButton>
              <RadioButton value="DAS-DETR" style={{ width: '50%' }}>目标检测 DAS-DETR</RadioButton>
            </Radio.Group>
            <div style={{ marginTop: 8, color: '#888', fontSize: 11 }}>
              {selectedModel === 'RDHS-YOLO'
                ? '实例分割模型，可精确勾勒细胞边界轮廓' 
                : '目标检测模型，快速定位细胞位置'}
            </div>
            
            {/* 参数调节区域 */}
            <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: '11px', color: '#666' }}>置信度阈值</span>
                  <span style={{ fontSize: '11px', color: '#1890ff', fontWeight: 'bold' }}>{params.conf.toFixed(2)}</span>
                </div>
                <Slider
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={params.conf}
                  onChange={(v) => setParams({...params, conf: v})}
                  tooltip={{ formatter: (v) => v?.toFixed(2) }}
                  style={{ margin: 0 }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: '11px', color: '#666' }}>IOU阈值</span>
                  <span style={{ fontSize: '11px', color: '#1890ff', fontWeight: 'bold' }}>{params.iou.toFixed(2)}</span>
                </div>
                <Slider
                  min={0.3}
                  max={0.9}
                  step={0.05}
                  value={params.iou}
                  onChange={(v) => setParams({...params, iou: v})}
                  tooltip={{ formatter: (v) => v?.toFixed(2) }}
                  style={{ margin: 0 }}
                />
              </div>
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
                bodyStyle={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>支持 JPEG/PNG 格式，不超过 20MB</p>
              </Card>
            ) : (
              <Card 
                title="🧠 推理控制"
                style={{ height: '100%' }}
                bodyStyle={{ padding: '8px' }}
                extra={
                  <Button size="small" onClick={handleReset}>
                    重新上传
                  </Button>
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px' }}>已上传：<strong>{uploadedFileName}</strong></p>
                    <p style={{ margin: 0, color: '#888', fontSize: '11px' }}>模型：{selectedModel === 'RDHS-YOLO' ? '实例分割' : '目标检测'}</p>
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
          bodyStyle={{ height: 'calc(100% - 57px)', padding: '8px' }}
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
              gap: '8px',
              height: '100%',
              justifyContent: 'space-between'
            }}>
              {/* 原图 - 关键修改：使用 ImageViewer，保持和预测图完全相同的尺寸 */}
              <div style={{ 
                flex: '1',
                display: 'flex',
                flexDirection: 'column',
                background: '#fafafa',
                borderRadius: '0px',
                overflow: 'hidden',
                maxWidth: '33%'
              }}>
                <div style={{ 
                  padding: '8px',
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
                  padding: '8px'
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
                  padding: '8px',
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
                  padding: '8px'
                }}>
                  {result ? (
                    <ImageViewer
                      imageUrl={`http://127.0.0.1:8000/uploads/${uploadedFileId}`}
                      annotations={result.boxes.map(box => ({
                        bbox: [box.x1, box.y1, box.x2, box.y2] as [number, number, number, number],
                        label: box.class_name,
                        confidence: box.confidence,
                        mask: box.mask
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
                  padding: '8px',
                  background: '#fff7e6',
                  borderBottom: '1px solid #d9d9d9',
                  textAlign: 'center',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <strong>📈 统计结果</strong>
                  {result && result.boxes.length > 0 && (
                    <div>
                      <Button 
                        size="small" 
                        icon={<FileExcelOutlined />}
                        onClick={() => handleExport('excel')}
                        style={{ marginRight: 8 }}
                      >
                        导出Excel
                      </Button>
                      <Button 
                        size="small" 
                        icon={<FileTextOutlined />}
                        onClick={() => handleExport('csv')}
                      >
                        导出CSV
                      </Button>
                    </div>
                  )}
                </div>
                <div style={{ 
                  flex: 1,
                  padding: '8px',
                  overflow: 'auto'
                }}>
                  {result ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* <div style={{ 
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
                      </div> */}

                      {/* 细胞类型统计 */}
                      {(() => {
                        // 统计每种细胞类型的数量
                        const typeCount: Record<string, number> = {}
                        result.boxes.forEach(box => {
                          const name = box.class_name || '未知'
                          typeCount[name] = (typeCount[name] || 0) + 1
                        })
                        const types = Object.entries(typeCount).sort((a, b) => b[1] - a[1])
                        
                        return (
                          <div style={{ 
                            marginTop: '12px',
                            padding: '8px',
                            background: 'white',
                            borderRadius: '8px'
                          }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>细胞类型分布</div>
                            {types.map(([name, count], idx) => (
                              <div key={idx} style={{ 
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '4px 0',
                                borderBottom: idx < types.length - 1 ? '1px dashed #ddd' : 'none'
                              }}>
                                <span style={{ color: '#666' }}>{name}</span>
                                <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{count} 个</span>
                              </div>
                            ))}
                          </div>
                        )
                      })()}

                      <div style={{ 
                        padding: '8px',
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
                        padding: '8px',
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
                        padding: '8px',
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
                        padding: '8px',
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