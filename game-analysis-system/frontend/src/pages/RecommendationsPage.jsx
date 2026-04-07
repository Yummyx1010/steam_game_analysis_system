import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Tag, Spin, Empty, message, Typography, Divider } from 'antd'
import { StarOutlined, HeartOutlined, FireOutlined, TeamOutlined, LikeOutlined } from '@ant-design/icons'
import { recommendationApi, favoriteApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

const { Title } = Typography

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState({
    collaborative: [],
    contentBased: [],
    trending: []
  })
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { isZh } = useLanguage()
  const navigate = useNavigate()

  const text = isZh
    ? {
        loadFailed: '加载推荐失败',
        loginFirst: '请先登录',
        addedFavorite: '已添加到收藏',
        actionFailed: '操作失败',
        free: '免费',
        positiveRate: '好评率',
        noData: '暂无数据',
        title: '🎮 游戏推荐',
        collaborative: '与你相似的人喜欢',
        contentBased: '基于你的喜爱推荐',
        trending: '近期热点游戏'
      }
    : {
        loadFailed: 'Failed to load recommendations',
        loginFirst: 'Please log in first',
        addedFavorite: 'Added to favorites',
        actionFailed: 'Operation failed',
        free: 'Free',
        positiveRate: 'Positive Rate',
        noData: 'No data',
        title: '🎮 Game Recommendations',
        collaborative: 'People Like You Also Play',
        contentBased: 'Based on Your Preferences',
        trending: 'Trending Recently'
      }

  useEffect(() => {
    loadRecommendations()
  }, [])

  const loadRecommendations = async () => {
    setLoading(true)
    try {
      const res = await recommendationApi.getRecommendations()
      setRecommendations(res.data)
    } catch (error) {
      console.error('load recommendations failed:', error)
      message.error(text.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  const handleAddFavorite = async (gameId) => {
    if (!user) {
      message.warning(text.loginFirst)
      return
    }
    try {
      await favoriteApi.addFavorite(gameId)
      message.success(text.addedFavorite)
    } catch (error) {
      message.error(error.response?.data?.error || text.actionFailed)
    }
  }

  const GameCard = ({ game }) => (
    <Card
      hoverable
      cover={
        <img
          alt={game.name}
          src={game.header_image}
          style={{ height: 140, objectFit: 'cover' }}
          onError={(e) => (e.target.style.display = 'none')}
        />
      }
      actions={[
        <StarOutlined key="star" />,
        <HeartOutlined key="heart" onClick={(e) => { e.stopPropagation(); handleAddFavorite(game.id) }} />
      ]}
      onClick={() => navigate(`/games/${game.id}`)}
    >
      <Card.Meta
        title={<div style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.name}</div>}
        description={
          <div>
            <div style={{ marginBottom: 4 }}>
              {game.is_free ? <Tag color="green">{text.free}</Tag> : <Tag color="blue">${game.price}</Tag>}
            </div>
            <div style={{ color: game.positive_rate >= 80 ? '#52c41a' : '#faad14', fontSize: 12 }}>
              {text.positiveRate}: {game.positive_rate?.toFixed(1)}%
            </div>
          </div>
        }
      />
    </Card>
  )

  const RecommendationSection = ({ title, icon, data, color }) => (
    <div style={{ marginBottom: 32 }}>
      <Title level={4} style={{ marginBottom: 16 }}>
        <span style={{ marginRight: 8 }}>{icon}</span>
        <span style={{ color }}>{title}</span>
      </Title>
      {data.length > 0 ? (
        <Row gutter={[16, 16]}>
          {data.map(game => (
            <Col xs={24} sm={12} md={8} lg={4} key={game.id}>
              <GameCard game={game} />
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description={text.noData} />
      )}
    </div>
  )

  return (
    <div style={{ padding: 24 }}>
      <Title level={2} style={{ marginBottom: 24, textAlign: 'center' }}>{text.title}</Title>

      <Spin spinning={loading}>
        <RecommendationSection
          title={text.collaborative}
          icon={<TeamOutlined style={{ color: '#1890ff' }} />}
          data={recommendations.collaborative}
          color="#1890ff"
        />

        <Divider />

        <RecommendationSection
          title={text.contentBased}
          icon={<LikeOutlined style={{ color: '#52c41a' }} />}
          data={recommendations.contentBased}
          color="#52c41a"
        />

        <Divider />

        <RecommendationSection
          title={text.trending}
          icon={<FireOutlined style={{ color: '#ff4d4f' }} />}
          data={recommendations.trending}
          color="#ff4d4f"
        />
      </Spin>
    </div>
  )
}
