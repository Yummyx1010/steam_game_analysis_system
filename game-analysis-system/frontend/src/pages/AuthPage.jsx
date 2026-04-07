import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Form, Input, Button, Card, Tabs, message } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, LoginOutlined, UserAddOutlined, GlobalOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

const gameImages = [
  'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/440/header.jpg',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/578080/header.jpg',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg'
]

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const { isZh, toggleLanguage } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/'

  const text = isZh
    ? {
        loginSuccess: '登录成功！',
        loginFail: '登录失败',
        registerSuccess: '注册成功！',
        registerFail: '注册失败',
        login: '登录',
        register: '注册',
        usernameOrEmail: '用户名或邮箱',
        password: '密码',
        username: '用户名',
        email: '邮箱',
        confirmPassword: '确认密码',
        slogan: '发现你喜爱的游戏数据',
        requiredUserOrEmail: '请输入用户名或邮箱',
        requiredPassword: '请输入密码',
        requiredUsername: '请输入用户名',
        usernameLength: '用户名至少3个字符',
        requiredEmail: '请输入邮箱',
        invalidEmail: '请输入有效的邮箱地址',
        passwordLength: '密码至少6个字符',
        requiredConfirmPassword: '请确认密码',
        passwordMismatch: '两次输入的密码不一致',
        brand: 'Steam 游戏分析'
      }
    : {
        loginSuccess: 'Login successful!',
        loginFail: 'Login failed',
        registerSuccess: 'Registration successful!',
        registerFail: 'Registration failed',
        login: 'Login',
        register: 'Sign up',
        usernameOrEmail: 'Username or email',
        password: 'Password',
        username: 'Username',
        email: 'Email',
        confirmPassword: 'Confirm password',
        slogan: 'Discover your favorite game data',
        requiredUserOrEmail: 'Please enter username or email',
        requiredPassword: 'Please enter password',
        requiredUsername: 'Please enter username',
        usernameLength: 'Username must be at least 3 characters',
        requiredEmail: 'Please enter email',
        invalidEmail: 'Please enter a valid email address',
        passwordLength: 'Password must be at least 6 characters',
        requiredConfirmPassword: 'Please confirm password',
        passwordMismatch: 'Passwords do not match',
        brand: 'Steam Game Analytics'
      }

  const handleLogin = async (values) => {
    setLoading(true)
    try {
      await login(values.username, values.password)
      message.success(text.loginSuccess)
      navigate(from, { replace: true })
    } catch (error) {
      message.error(error.response?.data?.error || text.loginFail)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (values) => {
    setLoading(true)
    try {
      await register(values.username, values.email, values.password)
      message.success(text.registerSuccess)
      navigate(from, { replace: true })
    } catch (error) {
      message.error(error.response?.data?.error || text.registerFail)
    } finally {
      setLoading(false)
    }
  }

  const items = [
    {
      key: 'login',
      label: <span><LoginOutlined /> {text.login}</span>,
      children: (
        <Form name="login" onFinish={handleLogin} layout="vertical" size="large">
          <Form.Item name="username" rules={[{ required: true, message: text.requiredUserOrEmail }]}>
            <Input prefix={<UserOutlined />} placeholder={text.usernameOrEmail} />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: text.requiredPassword }]}>
            <Input.Password prefix={<LockOutlined />} placeholder={text.password} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>{text.login}</Button>
          </Form.Item>
        </Form>
      )
    },
    {
      key: 'register',
      label: <span><UserAddOutlined /> {text.register}</span>,
      children: (
        <Form name="register" onFinish={handleRegister} layout="vertical" size="large">
          <Form.Item name="username" rules={[{ required: true, message: text.requiredUsername }, { min: 3, message: text.usernameLength }]}>
            <Input prefix={<UserOutlined />} placeholder={text.username} />
          </Form.Item>
          <Form.Item name="email" rules={[{ required: true, message: text.requiredEmail }, { type: 'email', message: text.invalidEmail }]}>
            <Input prefix={<MailOutlined />} placeholder={text.email} />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: text.requiredPassword }, { min: 6, message: text.passwordLength }]}>
            <Input.Password prefix={<LockOutlined />} placeholder={text.password} />
          </Form.Item>
          <Form.Item name="confirmPassword" dependencies={['password']} rules={[{ required: true, message: text.requiredConfirmPassword }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('password') === value) { return Promise.resolve() } return Promise.reject(new Error(text.passwordMismatch)) } })]}>
            <Input.Password prefix={<LockOutlined />} placeholder={text.confirmPassword} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>{text.register}</Button>
          </Form.Item>
        </Form>
      )
    }
  ]

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      background: '#1a1a2e'
    }}>
      <Button
        icon={<GlobalOutlined />}
        onClick={toggleLanguage}
        style={{ position: 'absolute', right: 24, top: 24, zIndex: 3 }}
      >
        {isZh ? 'EN' : '中文'}
      </Button>

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        zIndex: 0
      }}>
        {gameImages.map((img, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              width: 460,
              height: 215,
              backgroundImage: `url(${img})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.3,
              borderRadius: 8,
              animation: `float${index % 4} ${20 + index * 5}s linear infinite`,
              left: `${(index * 25) % 100}%`,
              top: `${(index * 30) % 100}%`,
              animationDelay: `${index * 2}s`,
              filter: 'blur(1px)'
            }}
          />
        ))}
      </div>

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at center, transparent 0%, rgba(26,26,46,0.8) 100%)',
        zIndex: 1
      }} />

      <Card
        style={{
          width: 420,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          borderRadius: 12,
          zIndex: 2,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)'
        }}
        styles={{ body: { padding: '24px 32px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            fontSize: 28,
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 8
          }}>
            {text.brand}
          </div>
          <div style={{ color: '#666', fontSize: 14 }}>
            {text.slogan}
          </div>
        </div>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} centered size="large" />
      </Card>

      <style>{`
        @keyframes float0 {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(100px, 50px) rotate(5deg); }
          50% { transform: translate(50px, 100px) rotate(-5deg); }
          75% { transform: translate(-50px, 50px) rotate(3deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes float1 {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-80px, 60px) rotate(-5deg); }
          50% { transform: translate(40px, -40px) rotate(5deg); }
          75% { transform: translate(60px, 80px) rotate(-3deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes float2 {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(70px, -50px) scale(1.05); }
          66% { transform: translate(-30px, 70px) scale(0.95); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes float3 {
          0% { transform: translate(0, 0) rotate(0deg); }
          20% { transform: translate(-60px, -40px) rotate(-3deg); }
          40% { transform: translate(80px, 20px) rotate(5deg); }
          60% { transform: translate(20px, 60px) rotate(-2deg); }
          80% { transform: translate(-40px, -20px) rotate(3deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
      `}</style>
    </div>
  )
}
