import { useNavigate } from 'react-router-dom'
import { Button, Result } from 'antd'
import { HomeOutlined } from '@ant-design/icons'

// 结果页面已整合到上传页面，此页面仅作为重定向提示
const ResultPage = () => {
  const navigate = useNavigate()

  return (
    <Result
      status="info"
      title="功能已整合"
      subTitle="检测结果现在直接在 Upload 页面右侧显示"
      extra={[
        <Button type="primary" key="upload" icon={<HomeOutlined />} onClick={() => navigate('/upload')}>
          前往上传页面
        </Button>
      ]}
    />
  )
}

export default ResultPage
