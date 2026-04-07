import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Button, Space } from 'antd'
import { GlobalOutlined, HomeOutlined, SearchOutlined, BarChartOutlined, UserOutlined, LogoutOutlined, StarOutlined, MessageOutlined, TeamOutlined, WechatOutlined } from '@ant-design/icons'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider, useLanguage } from './context/LanguageContext'
import HomePage from './pages/HomePage'
import GameListPage from './pages/GameListPage'
import GameDetailPage from './pages/GameDetailPage'
import StatisticsPage from './pages/StatisticsPage'
import AuthPage from './pages/AuthPage'
import ProfilePage from './pages/ProfilePage'
import RecommendationsPage from './pages/RecommendationsPage'
import CommunityPage from './pages/CommunityPage'
import PostDetailPage from './pages/PostDetailPage'
import FriendsPage from './pages/FriendsPage'
import ChatPage from './pages/ChatPage'
import PersonalStatsPage from './pages/PersonalStatsPage'
import CompareLabPage from './pages/CompareLabPage'
import AIAssistant from './components/AIAssistant'

import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

const { Header, Content, Footer } = Layout

function AppContent() {
  const { user, logout } = useAuth()
  const { isZh, toggleLanguage } = useLanguage()
  const location = useLocation()

  const text = isZh
    ? {
        home: '首页',
        gameList: '游戏列表',
        recommendation: '推荐',
        community: '社区',
        compareLab: '对比实验室',
        analytics: '数据分析',

        myReport: '我的报告',
        profile: '个人中心',
        friends: '好友管理',
        chat: '私信',
        logout: '退出登录',
        loginRegister: '登录 / 注册',
        logo: 'Steam游戏分析',
        footer: 'Steam游戏分析系统 ©2026'
      }
    : {
        home: 'Home',
        gameList: 'Games',
        recommendation: 'Recommendations',
        community: 'Community',
        compareLab: 'Compare Lab',
        analytics: 'Analytics',

        myReport: 'My Report',
        profile: 'Profile',
        friends: 'Friends',
        chat: 'Messages',
        logout: 'Log out',
        loginRegister: 'Login / Sign up',
        logo: 'Steam Game Analytics',
        footer: 'Steam Game Analytics ©2026'
      }

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: <Link to="/">{text.home}</Link> },
    {
      key: '/games-group',
      icon: <SearchOutlined />,
      label: text.gameList,
      children: [
        { key: '/games', label: <Link to="/games">{text.gameList}</Link> },
        { key: '/games/compare', label: <Link to="/games/compare">{text.compareLab}</Link> }
      ]
    },
    { key: '/recommendations', icon: <StarOutlined />, label: <Link to="/recommendations">{text.recommendation}</Link> },
    { key: '/community', icon: <MessageOutlined />, label: <Link to="/community">{text.community}</Link> },
    { key: '/statistics', icon: <BarChartOutlined />, label: <Link to="/statistics">{text.analytics}</Link> },
    { key: '/personal-stats', icon: <StarOutlined />, label: <Link to="/personal-stats">{text.myReport}</Link> }
  ]

  const selectedMenuKey = location.pathname.startsWith('/games/compare')
    ? '/games/compare'
    : location.pathname.startsWith('/games')
      ? '/games'
      : location.pathname


  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <Link to="/profile">{text.profile}</Link>
    },
    {
      key: 'friends',
      icon: <TeamOutlined />,
      label: <Link to="/friends">{text.friends}</Link>
    },
    {
      key: 'chat',
      icon: <WechatOutlined />,
      label: <Link to="/chat">{text.chat}</Link>
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: text.logout,
      onClick: logout
    }
  ]

  if (location.pathname === '/auth') {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    )
  }

  return (
    <Layout className="layout">
      <Header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        <div className="logo">{text.logo}</div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedMenuKey]}

          items={menuItems}
          style={{ flex: 1, minWidth: 0 }}
        />
        <Space style={{ marginLeft: 'auto' }}>
          <Button icon={<GlobalOutlined />} onClick={toggleLanguage}>
            {isZh ? 'EN' : '中文'}
          </Button>
          {user ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer', color: '#fff' }}>
                <Avatar icon={<UserOutlined />} src={user.avatar} />
                <span>{user.username}</span>
              </Space>
            </Dropdown>
          ) : (
            <Link to="/auth">
              <Button type="primary" icon={<UserOutlined />}>
                {text.loginRegister}
              </Button>
            </Link>
          )}
        </Space>
      </Header>
      <Content style={{ padding: '0 50px' }}>
        <div className="site-layout-content">
          <Routes>
            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/games" element={<ProtectedRoute><GameListPage /></ProtectedRoute>} />
            <Route path="/games/compare" element={<ProtectedRoute><CompareLabPage /></ProtectedRoute>} />
            <Route path="/games/:id" element={<ProtectedRoute><GameDetailPage /></ProtectedRoute>} />

            <Route path="/recommendations" element={<ProtectedRoute><RecommendationsPage /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
            <Route path="/community/:id" element={<ProtectedRoute><PostDetailPage /></ProtectedRoute>} />
            <Route path="/statistics" element={<ProtectedRoute><StatisticsPage /></ProtectedRoute>} />
            <Route path="/personal-stats" element={<ProtectedRoute><PersonalStatsPage /></ProtectedRoute>} />
            <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="/chat/:friendId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        {text.footer}
      </Footer>
      <AIAssistant />
    </Layout>
  )
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}

export default App
