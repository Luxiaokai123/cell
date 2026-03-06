import { Button, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'

const { Title } = Typography

const HomePage = () => {
  const navigate = useNavigate()

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <Title>细胞智能计数系统</Title>
      <Button 
        type="primary" 
        size="large"
        onClick={() => navigate('/upload')}
      >
        开始上传图像
      </Button>
    </div>
  )
}

export default HomePage
