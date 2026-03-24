import { Button, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'

const { Title, Paragraph } = Typography

const HomePage = () => {
  const navigate = useNavigate()

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px'
    }}>
      <div style={{ 
        textAlign: 'center',
        color: 'white',
        maxWidth: '800px'
      }}>
        <Title level={1} style={{ 
          fontSize: '48px', 
          marginBottom: '24px',
          fontWeight: 'bold',
          textShadow: '2px 2px 8px rgba(0,0,0,0.3)'
        }}>
          🔬 细胞智能计数系统
        </Title>
        <Paragraph style={{ 
          fontSize: '20px', 
          marginBottom: '40px',
          color: 'rgba(255,255,255,0.9)',
          lineHeight: '1.8'
        }}>
          基于深度学习的细胞检测与分析平台<br/>
          支持 RDHS-YOLO 和 DAS-DETR 双模型推理
        </Paragraph>
        <Button 
          type="primary" 
          size="large"
          onClick={() => navigate('/upload')}
          style={{ 
            height: '56px',
            fontSize: '20px',
            padding: '0 48px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          📤 开始上传图像
        </Button>
      </div>
    </div>
  )
}

export default HomePage
