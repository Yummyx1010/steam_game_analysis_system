import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Tabs, Table, Button, Rate, Avatar, Space, Tag, message, Empty } from 'antd'
import { UserOutlined, HeartOutlined, StarOutlined, LogoutOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'
import { favoriteApi, ratingApi } from '../api'
import { useLanguage } from '../context/LanguageContext'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { isZh } = useLanguage()
  const [activeTab, setActiveTab] = useState('favorites')
  const [favorites, setFavorites] = useState([])
  const [ratings, setRatings] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  const text = isZh
    ? {
        loadFavoritesFailed: '加载收藏失败',
        loadRatingsFailed: '加载评分失败',
        removedFavorite: '已取消收藏',
        actionFailed: '操作失败',
        loggedOut: '已退出登录',
        game: '游戏',
        genre: '类型',
        price: '价格',
        free: '免费',
        positiveRate: '好评率',
        operation: '操作',
        removeFavorite: '取消收藏',
        myRating: '我的评分',
        ratingTime: '评分时间',
        myFavorites: '我的收藏',
        myRatings: '我的评分',
        noFavorites: '暂无收藏',
        noRatings: '暂无评分',
        registerTime: '注册时间',
        logout: '退出登录'
      }
    : {
        loadFavoritesFailed: 'Failed to load favorites',
        loadRatingsFailed: 'Failed to load ratings',
        removedFavorite: 'Removed from favorites',
        actionFailed: 'Operation failed',
        loggedOut: 'Logged out',
        game: 'Game',
        genre: 'Genre',
        price: 'Price',
        free: 'Free',
        positiveRate: 'Positive Rate',
        operation: 'Action',
        removeFavorite: 'Remove',
        myRating: 'My Rating',
        ratingTime: 'Rated At',
        myFavorites: 'My Favorites',
        myRatings: 'My Ratings',
        noFavorites: 'No favorites yet',
        noRatings: 'No ratings yet',
        registerTime: 'Registered',
        logout: 'Log out'
      }

  useEffect(() => {
    if (activeTab === 'favorites') {
      loadFavorites()
    } else {
      loadRatings()
    }
  }, [activeTab, pagination.current])

  const loadFavorites = async () => {
    setLoading(true)
    try {
      const res = await favoriteApi.getFavorites({ page: pagination.current, page_size: pagination.pageSize })
      setFavorites(res.data.games)
      setPagination(prev => ({ ...prev, total: res.data.total }))
    } catch (error) {
      message.error(text.loadFavoritesFailed)
    } finally {
      setLoading(false)
    }
  }

  const loadRatings = async () => {
    setLoading(true)
    try {
      const res = await ratingApi.getUserRatings()
      setRatings(res.data)
    } catch (error) {
      message.error(text.loadRatingsFailed)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFavorite = async (gameId) => {
    try {
      await favoriteApi.removeFavorite(gameId)
      message.success(text.removedFavorite)
      loadFavorites()
    } catch (error) {
      message.error(text.actionFailed)
    }
  }

  const handleLogout = () => {
    logout()
    message.success(text.loggedOut)
    navigate('/')
  }

  const favoriteColumns = [
    {
      title: text.game,
      dataIndex: 'name',
      key: 'name',
      render: (value, record) => (
        <Space>
          <img src={record.header_image} alt={value} style={{ width: 80, height: 45, objectFit: 'cover', borderRadius: 4 }} onError={(e) => (e.target.style.display = 'none')} />
          <a onClick={() => navigate(`/games/${record.id}`)}>{value}</a>
        </Space>
      )
    },
    { title: text.genre, dataIndex: 'genres', key: 'genres', render: (genres) => genres?.slice(0, 2).map(g => <Tag key={g}>{g}</Tag>) },
    { title: text.price, dataIndex: 'price', key: 'price', render: (price, record) => record.is_free ? <Tag color="green">{text.free}</Tag> : `$${price}` },
    {
      title: text.positiveRate,
      dataIndex: 'positive_rate',
      key: 'positive_rate',
      render: (rate) => <span style={{ color: rate >= 80 ? '#52c41a' : rate >= 60 ? '#faad14' : '#ff4d4f' }}>{rate?.toFixed(1)}%</span>
    },
    {
      title: text.operation,
      key: 'action',
      render: (_, record) => <Button type="link" danger onClick={() => handleRemoveFavorite(record.id)}>{text.removeFavorite}</Button>
    }
  ]

  const ratingColumns = [
    {
      title: text.game,
      dataIndex: 'game_name',
      key: 'game_name',
      render: (value, record) => (
        <Space>
          <img src={record.header_image} alt={value} style={{ width: 80, height: 45, objectFit: 'cover', borderRadius: 4 }} onError={(e) => (e.target.style.display = 'none')} />
          <a onClick={() => navigate(`/games/${record.game_id}`)}>{value}</a>
        </Space>
      )
    },
    { title: text.myRating, dataIndex: 'rating', key: 'rating', render: (rating) => <Rate disabled value={rating / 2} allowHalf /> },
    { title: text.ratingTime, dataIndex: 'updated_at', key: 'updated_at', render: (date) => date?.split('T')[0] }
  ]

  const items = [
    {
      key: 'favorites',
      label: <span><HeartOutlined /> {text.myFavorites} ({pagination.total})</span>,
      children: (
        <Table
          columns={favoriteColumns}
          dataSource={favorites}
          rowKey="id"
          loading={loading}
          pagination={{ ...pagination, showSizeChanger: false, onChange: (page) => setPagination(prev => ({ ...prev, current: page })) }}
          locale={{ emptyText: <Empty description={text.noFavorites} /> }}
        />
      )
    },
    {
      key: 'ratings',
      label: <span><StarOutlined /> {text.myRatings} ({ratings.length})</span>,
      children: (
        <Table
          columns={ratingColumns}
          dataSource={ratings}
          rowKey="game_id"
          loading={loading}
          pagination={false}
          locale={{ emptyText: <Empty description={text.noRatings} /> }}
        />
      )
    }
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space size="large">
            <Avatar size={64} icon={<UserOutlined />} src={user?.avatar} />
            <div>
              <h2 style={{ margin: 0 }}>{user?.username}</h2>
              <p style={{ margin: 0, color: '#666' }}>{user?.email}</p>
              <p style={{ margin: 0, color: '#999', fontSize: 12 }}>{text.registerTime}: {user?.created_at?.split('T')[0]}</p>
            </div>
          </Space>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>{text.logout}</Button>
        </div>
      </Card>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
      </Card>
    </div>
  )
}
