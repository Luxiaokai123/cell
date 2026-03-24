import { useState, useRef } from 'react'
import { Upload, message, Card, Radio, Button, Spin, Progress, Table, Slider, Row, Col, Statistic, Tag, Modal } from 'antd'
import { InboxOutlined, PlayCircleOutlined, ArrowLeftOutlined, FileExcelOutlined, DeleteOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const { Dragger } = Upload
const { Button: RadioButton } = Radio

// 模型默认参数配置
const MODEL_DEFAULT_PARAMS: Record<string, { conf: number; iou: number }> = {
  'RDHS-YOLO': { conf: 0.2, iou: 0.7 },
  'DAS-DETR': { conf: 0.5, iou: 0.7 }
}

interface BatchResult {
  file_id: string
  file_name: string
  model_used: string
  cell_count: number
  processing_time: number
  status: string
  error?: string
  original_image_url?: string
  result_image_url?: string
}

interface BatchSummary {
  total_cells: number
  avg_cells_per_image: number
  avg_processing_time: number
  total_processing_time: number
}

const BatchPage = () => {
  const navigate = useNavigate()
  const [selectedModel, setSelectedModel] = useState<string>('RDHS-YOLO')
  const [params, setParams] = useState({
    conf: MODEL_DEFAULT_PARAMS['RDHS-YOLO'].conf,
    iou: MODEL_DEFAULT_PARAMS['RDHS-YOLO'].iou
  })
  
  const [fileList, setFileList] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [inferring, setInferring] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<BatchResult[]>([])
  const [summary, setSummary] = useState<BatchSummary | null>(null)
  const [previewImages, setPreviewImages] = useState<{original: string, result: string} | null>(null)
  const fileIdMap = useRef<Record<string, string>>({})

  // 处理文件选择
  const handleFileChange = (info: any) => {
    const newFiles = info.fileList.map((f: any) => f.originFileObj || f).filter(Boolean)
    setFileList(newFiles)
    // 清除之前的结果
    setResults([])
    setSummary(null)
    setProgress(0)
  }

  // 批量上传
  const uploadFiles = async (): Promise<string[]> => {
    const fileIds: string[] = []
    fileIdMap.current = {}
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      const formData = new FormData()
      formData.append('file', file)
      
      try {
        const response = await axios.post('/api/upload/single', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        const savedFilename = response.data.saved_filename
        fileIds.push(savedFilename)
        fileIdMap.current[file.name] = savedFilename
        setProgress(Math.round((i + 1) / fileList.length * 30))
      } catch (error: any) {
        message.error(`上传失败 ${file.name}: ${error.response?.data?.detail || error.message}`)
      }
    }
    
    return fileIds
  }

  // 批量推理
  const handleBatchInference = async () => {
    if (fileList.length === 0) {
      message.warning('请先选择图片文件')
      return
    }
    
    if (fileList.length > 20) {
      message.warning('一次最多处理20张图片')
      return
    }
    
    setInferring(true)
    setResults([])
    setSummary(null)
    setProgress(0)
    
    try {
      // 1. 批量上传
      setUploading(true)
      const fileIds = await uploadFiles()
      setUploading(false)
      
      if (fileIds.length === 0) {
        message.error('所有文件上传失败')
        setInferring(false)
        return
      }
      
      // 2. 批量推理
      setProgress(35)
      const response = await axios.post('/api/batch/inference', {
        file_ids: fileIds,
        model: selectedModel,
        conf: params.conf,
        iou: params.iou
      })
      
      setProgress(100)
      setResults(response.data.results)
      setSummary(response.data.summary)
      
      const successCount = response.data.completed
      message.success(`批量处理完成，成功 ${successCount}/${fileIds.length} 张`)
    } catch (error: any) {
      message.error(`批量处理失败: ${error.response?.data?.detail || error.message}`)
    } finally {
      setInferring(false)
    }
  }

  // 导出汇总报告
  const handleExportSummary = () => {
    if (!summary || results.length === 0) {
      message.warning('没有可导出的数据')
      return
    }
    
    const data = results.map((r, i) => ({
      '序号': i + 1,
      '文件名': r.file_name,
      '模型': r.model_used,
      '细胞数': r.cell_count,
      '处理时间(s)': r.processing_time.toFixed(3),
      '状态': r.status === 'success' ? '成功' : '失败',
      '错误信息': r.error || ''
    }))
    
    // 添加汇总行
    data.push({
      '序号': 0,
      '文件名': '汇总',
      '模型': '',
      '细胞数': summary.total_cells,
      '处理时间(s)': summary.total_processing_time.toFixed(3),
      '状态': '',
      '错误信息': ''
    } as any)
    
    // 转换为 CSV
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const val = (row as any)[h]
        // 处理包含逗号或引号的值
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`
        }
        return val
      }).join(','))
    ].join('\n')
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `batch_summary_${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    message.success('汇总报告导出成功')
  }

  // 清空重选
  const handleClear = () => {
    setFileList([])
    setResults([])
    setSummary(null)
    setProgress(0)
    fileIdMap.current = {}
  }

  // 表格列定义
  const columns = [
    {
      title: '文件名',
      dataIndex: 'file_name',
      key: 'file_name',
      ellipsis: true
    },
    {
      title: '模型',
      dataIndex: 'model_used',
      key: 'model_used',
      width: 120
    },
    {
      title: '细胞数',
      dataIndex: 'cell_count',
      key: 'cell_count',
      width: 80,
      render: (count: number, record: BatchResult) => (
        record.status === 'success' ? count : '-'
      )
    },
    {
      title: '处理时间',
      dataIndex: 'processing_time',
      key: 'processing_time',
      width: 100,
      render: (time: number) => `${time.toFixed(2)}s`
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: BatchResult) => (
        record.status === 'success' && record.original_image_url ? (
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setPreviewImages({
              original: record.original_image_url!,
              result: record.result_image_url || record.original_image_url!
            })}
          >
            预览
          </Button>
        ) : null
      )
    }
  ]

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#f0f2f5',
      padding: '24px'
    }}>
      {/* 顶部标题栏 */}
      <div style={{ 
        marginBottom: '20px',
        background: 'white',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#1890ff' }}>
          📁 批量细胞检测
        </h1>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/upload')}>
          返回单图检测
        </Button>
      </div>

      {/* 模型配置 - 顶部独立区域 */}
      <Card title="🔧 模型配置" bodyStyle={{ padding: '12px 16px' }} style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          <Col span={12}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>选择模型</label>
              <Radio.Group 
                value={selectedModel} 
                onChange={(e) => {
                  const newModel = e.target.value
                  setSelectedModel(newModel)
                  setParams(MODEL_DEFAULT_PARAMS[newModel])
                }}
                buttonStyle="solid"
              >
                <RadioButton value="RDHS-YOLO">实例分割 RDHS-YOLO</RadioButton>
                <RadioButton value="DAS-DETR">目标检测 DAS-DETR</RadioButton>
              </Radio.Group>
              <div style={{ marginTop: 4, color: '#888', fontSize: 11 }}>
                {selectedModel === 'RDHS-YOLO'
                  ? '实例分割模型，可精确勾勒细胞边界轮廓' 
                  : '目标检测模型，快速定位细胞位置'}
              </div>
            </div>
          </Col>
          <Col span={12}>
            <Row gutter={16}>
              <Col span={12}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>置信度阈值</span>
                    <span style={{ fontSize: '12px', color: '#1890ff', fontWeight: 'bold' }}>{params.conf.toFixed(2)}</span>
                  </div>
                  <Slider
                    min={0.1}
                    max={0.9}
                    step={0.05}
                    value={params.conf}
                    onChange={(v) => setParams({...params, conf: v})}
                  />
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>IOU阈值</span>
                    <span style={{ fontSize: '12px', color: '#1890ff', fontWeight: 'bold' }}>{params.iou.toFixed(2)}</span>
                  </div>
                  <Slider
                    min={0.3}
                    max={0.9}
                    step={0.05}
                    value={params.iou}
                    onChange={(v) => setParams({...params, iou: v})}
                  />
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* 主内容区域 - 左右布局 */}
      <div style={{ 
        display: 'flex',
        gap: '20px',
        height: '484px'
      }}>
        {/* 左侧：上传区域 */}
        <div style={{ flex: 1, minWidth: 0 }}>
        {/* 文件上传区域 */}
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📤 批量上传</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Upload
                  multiple
                  maxCount={20}
                  accept="image/jpeg,image/png"
                  fileList={fileList as any}
                  onChange={handleFileChange}
                  beforeUpload={() => false}
                  showUploadList={false}
                >
                  <Button 
                    type="primary" 
                    icon={<InboxOutlined />}
                    size="small"
                  >
                    选择图片文件
                  </Button>
                </Upload>
                <span style={{ color: '#888', fontSize: 12 }}>支持 JPEG/PNG 格式，最多 20 张图片</span>
              </div>
            </div>
          }
          bodyStyle={{ padding: '4px 16px 16px', height: 'calc(484px - 57px)', overflow: 'auto' }}
        >
          {/* 已选文件列表 */}
          {fileList.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#666' }}>已选择 {fileList.length} 个文件</span>
                <div>
                  <Button 
                    icon={<DeleteOutlined />} 
                    onClick={handleClear}
                    style={{ marginRight: 8 }}
                  >
                    清空
                  </Button>
                  <Button 
                    type="primary" 
                    icon={<PlayCircleOutlined />}
                    onClick={handleBatchInference}
                    loading={inferring || uploading}
                  >
                    {uploading ? '上传中...' : inferring ? '推理中...' : '开始批量推理'}
                  </Button>
                </div>
              </div>
              
              {/* 文件列表 */}
              <div style={{ 
                maxHeight: 'calc(100vh - 484px)', 
                overflow: 'auto',
                border: '1px solid #f0f0f0',
                borderRadius: 4,
                padding: '8px 16px'
              }}>
                {fileList.map((file, index) => (
                  <div key={index} style={{ 
                    padding: '8px 0', 
                    borderBottom: index < fileList.length - 1 ? '1px solid #f0f0f0' : 'none',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: '#1890ff', marginRight: 8 }}>📎</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </span>
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => {
                        const newFileList = fileList.filter((_, i) => i !== index)
                        setFileList(newFileList)
                      }}
                      style={{ color: '#999', padding: '0 4px' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 右侧：结果展示区域 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 结果展示 */}
        {results.length > 0 ? (
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📊 批量处理结果</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {(uploading || inferring || progress > 0) && progress < 100 && (
                    <div style={{ width: 200 }}>
                      <Progress 
                        percent={progress} 
                        size="small" 
                        status={inferring ? 'active' : 'success'}
                      />
                    </div>
                  )}
                  <Button 
                    size="small" 
                    icon={<FileExcelOutlined />}
                    onClick={handleExportSummary}
                  >
                    导出汇总报告
                  </Button>
                </div>
              </div>
            }
            bodyStyle={{ padding: '16px', height: 'calc(484px - 57px)', overflow: 'auto' }}
          >
            
            {/* 详细结果表格 */}
            <Table 
              dataSource={results}
              columns={columns}
              rowKey="file_id"
              size="small"
              pagination={{ pageSize: 8 }}
              scroll={{ y: 340 }}
            />
          </Card>
        ) : (
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📊 批量处理结果</span>
                {(uploading || inferring || progress > 0) && progress < 100 && (
                  <div style={{ width: 200 }}>
                    <Progress 
                      percent={progress} 
                      size="small" 
                      status={inferring ? 'active' : 'success'}
                    />
                  </div>
                )}
              </div>
            }
            bodyStyle={{ 
              padding: '16px', 
              height: 'calc(484px - 57px)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#999'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <InboxOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: 16 }} />
              <p>上传图片并点击"开始批量推理"后，结果将显示在这里</p>
            </div>
          </Card>
        )}
      </div>
    </div>

    {/* 图片预览弹窗 */}
    <Modal
      open={!!previewImages}
      onCancel={() => setPreviewImages(null)}
      footer={null}
      width={1000}
      title="图片预览"
    >
      {previewImages && (
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ marginBottom: 12 }}>原图</h4>
            <img 
              src={previewImages.original} 
              alt="原图" 
              style={{ width: '100%', border: '1px solid #f0f0f0', borderRadius: 4 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ marginBottom: 12 }}>预测结果</h4>
            <img 
              src={previewImages.result} 
              alt="预测结果" 
              style={{ width: '100%', border: '1px solid #f0f0f0', borderRadius: 4 }}
            />
          </div>
        </div>
      )}
    </Modal>
    </div>
  )
}

export default BatchPage
