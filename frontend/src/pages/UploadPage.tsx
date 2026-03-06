import { Upload, message } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import axios from 'axios'

const { Dragger } = Upload

const UploadPage = () => {
  const uploadProps = {
    name: 'file',
    action: '/api/upload/single',
    multiple: false,
    maxCount: 1,
    accept: 'image/jpeg,image/png',
    beforeUpload: (file: File) => {
      // 验证文件大小
      if (file.size > 20 * 1024 * 1024) {
        message.error('文件大小不能超过 20MB')
        return false
      }
      return true
    },
    onChange: (info: any) => {
      if (info.file.status === 'done') {
        message.success(`${info.file.name} 上传成功`)
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} 上传失败`)
      }
    },
  }

  return (
    <div style={{ padding: 40 }}>
      <Dragger {...uploadProps}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p className="ant-upload-hint">
          支持 JPEG/PNG 格式，单个文件不超过 20MB
        </p>
      </Dragger>
    </div>
  )
}

export default UploadPage
