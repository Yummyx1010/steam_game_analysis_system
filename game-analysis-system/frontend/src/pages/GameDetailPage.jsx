import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Tag, Spin, Button, Space, Typography, Row, Col, Rate, message, Modal } from 'antd'
import { ArrowLeftOutlined, WindowsOutlined, AppleOutlined, LinuxOutlined, HeartOutlined, HeartFilled, StarOutlined } from '@ant-design/icons'
import { gameApi, favoriteApi, ratingApi, recommendationApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

const { Title, Paragraph } = Typography

function GameDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isZh } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [game, setGame] = useState(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [userRating, setUserRating] = useState(null)
  const [similarGames, setSimilarGames] = useState([])
  const [ratingModalVisible, setRatingModalVisible] = useState(false)
  const [tempRating, setTempRating] = useState(0)

  const text = isZh
    ? {
        loginFirst: '请先登录',
        unfavorite: '已取消收藏',
        favorite: '已添加到收藏',
        actionFailed: '操作失败',
        chooseRating: '请选择评分',
        ratingSuccess: '评分成功',
        ratingFailed: '评分失败',
        gameNotFound: '游戏不存在',
        backList: '返回列表',
        free: '免费',
        positiveRate: '好评率',
        collected: '已收藏',
        collect: '收藏',
        myRating: (v) => `我的评分: ${v}/10`,
        rate: '评分',
        detailInfo: '详细信息',
        releaseDate: '发行日期',
        owners: '估计拥有者',
        peakCcu: '最高同时在线',
        metacritic: 'Metacritic评分',
        userScore: '用户评分',
        positive: '好评数',
        negative: '差评数',
        totalReviews: '总评价数',
        recommendations: '推荐数',
        avgPlaytime: '平均游戏时长',
        minute: '分钟',
        ageLimit: '年龄限制',
        languageCount: '支持语言数',
        tagCount: '标签数',
        platform: '平台支持',
        tags: '标签',
        developers: '开发商',
        publishers: '发行商',
        similar: '相似游戏推荐',
        positiveShort: '好评',
        officialSite: '访问官方网站 →',
        rateTitle: '给游戏评分',
        submit: '提交评分',
        cancel: '取消',
        score: '评分'
      }
    : {
        loginFirst: 'Please log in first',
        unfavorite: 'Removed from favorites',
        favorite: 'Added to favorites',
        actionFailed: 'Operation failed',
        chooseRating: 'Please choose a rating',
        ratingSuccess: 'Rating submitted',
        ratingFailed: 'Rating failed',
        gameNotFound: 'Game not found',
        backList: 'Back to List',
        free: 'Free',
        positiveRate: 'Positive Rate',
        collected: 'Collected',
        collect: 'Collect',
        myRating: (v) => `My Rating: ${v}/10`,
        rate: 'Rate',
        detailInfo: 'Details',
        releaseDate: 'Release Date',
        owners: 'Estimated Owners',
        peakCcu: 'Peak CCU',
        metacritic: 'Metacritic',
        userScore: 'User Score',
        positive: 'Positive',
        negative: 'Negative',
        totalReviews: 'Total Reviews',
        recommendations: 'Recommendations',
        avgPlaytime: 'Average Playtime',
        minute: 'min',
        ageLimit: 'Age Limit',
        languageCount: 'Languages',
        tagCount: 'Tags',
        platform: 'Platforms',
        tags: 'Tags',
        developers: 'Developers',
        publishers: 'Publishers',
        similar: 'Similar Games',
        positiveShort: 'positive',
        officialSite: 'Visit official website →',
        rateTitle: 'Rate this game',
        submit: 'Submit',
        cancel: 'Cancel',
        score: 'Score'
      }

  useEffect(() => {
    fetchGame()
    if (user) {
      checkFavorite()
      fetchUserRating()
    }
    fetchSimilarGames()
  }, [id, user])

  const fetchGame = async () => {
    setLoading(true)
    try {
      const res = await gameApi.getGame(id)
      setGame(res.data)
    } finally {
      setLoading(false)
    }
  }

  const checkFavorite = async () => {
    try {
      const res = await favoriteApi.checkFavorite(id)
      setIsFavorite(res.data.is_favorite)
    } catch (error) {}
  }

  const fetchUserRating = async () => {
    try {
      const res = await ratingApi.getGameRating(id)
      setUserRating(res.data.rating)
    } catch (error) {}
  }

  const fetchSimilarGames = async () => {
    try {
      const res = await recommendationApi.getContentBased(id)
      setSimilarGames(res.data.slice(0, 6))
    } catch (error) {}
  }

  const handleToggleFavorite = async () => {
    if (!user) {
      message.warning(text.loginFirst)
      return
    }
    try {
      if (isFavorite) {
        await favoriteApi.removeFavorite(id)
        message.success(text.unfavorite)
      } else {
        await favoriteApi.addFavorite(id)
        message.success(text.favorite)
      }
      setIsFavorite(!isFavorite)
    } catch (error) {
      message.error(error.response?.data?.error || text.actionFailed)
    }
  }

  const handleRateGame = async () => {
    if (!user) {
      message.warning(text.loginFirst)
      return
    }
    if (!tempRating) {
      message.warning(text.chooseRating)
      return
    }
    try {
      await ratingApi.rateGame(id, tempRating)
      setUserRating(tempRating)
      setRatingModalVisible(false)
      message.success(text.ratingSuccess)
    } catch (error) {
      message.error(text.ratingFailed)
    }
  }

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />
  if (!game) return <div>{text.gameNotFound}</div>

  return (
    <div>
      <Link to="/games"><Button icon={<ArrowLeftOutlined />} style={{ marginBottom: 16 }}>{text.backList}</Button></Link>

      <Card>
        <Row gutter={24}>
          <Col span={8}>
            <img src={game.header_image || 'https://via.placeholder.com/460x215'} alt={game.name} style={{ width: '100%', borderRadius: 8 }} />
          </Col>
          <Col span={16}>
            <Title level={2}>{game.name}</Title>
            <Space style={{ marginBottom: 16 }}>{game.genres?.map(g => <Tag key={g} color="blue">{g}</Tag>)}</Space>
            <Paragraph ellipsis={{ rows: 3, expandable: true }}>{game.short_description}</Paragraph>
            <Space size="large" style={{ marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 24, color: game.is_free ? '#52c41a' : '#1890ff', fontWeight: 'bold' }}>
                  {game.is_free ? text.free : `$${game.price}`}
                </span>
              </div>
              <div>
                <span style={{ fontSize: 24, color: '#faad14', fontWeight: 'bold' }}>{game.positive_rate?.toFixed(1)}%</span>
                <span style={{ color: '#999', marginLeft: 8 }}>{text.positiveRate}</span>
              </div>
            </Space>
            <Space>
              <Button type={isFavorite ? 'primary' : 'default'} icon={isFavorite ? <HeartFilled /> : <HeartOutlined />} onClick={handleToggleFavorite}>
                {isFavorite ? text.collected : text.collect}
              </Button>
              <Button icon={<StarOutlined />} onClick={() => { setTempRating(userRating || 5); setRatingModalVisible(true) }}>
                {userRating ? text.myRating(userRating) : text.rate}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card title={text.detailInfo} style={{ marginTop: 16 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="App ID">{game.appid}</Descriptions.Item>
          <Descriptions.Item label={text.releaseDate}>{game.release_date}</Descriptions.Item>
          <Descriptions.Item label={text.owners}>{game.estimated_owners_num?.toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label={text.peakCcu}>{game.peak_ccu?.toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label={text.metacritic}>{game.metacritic_score || '-'}</Descriptions.Item>
          <Descriptions.Item label={text.userScore}>{game.user_score || '-'}</Descriptions.Item>
          <Descriptions.Item label={text.positive}>{game.positive?.toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label={text.negative}>{game.negative?.toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label={text.totalReviews}>{game.total_reviews?.toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label={text.recommendations}>{game.recommendations?.toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label={text.avgPlaytime}>{game.average_playtime_forever} {text.minute}</Descriptions.Item>
          <Descriptions.Item label={text.ageLimit}>{game.required_age}+</Descriptions.Item>
          <Descriptions.Item label={text.languageCount}>{game.language_count}</Descriptions.Item>
          <Descriptions.Item label={text.tagCount}>{game.tag_count}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={text.platform} style={{ marginTop: 16 }}>
        <Space size="large">
          <Tag icon={<WindowsOutlined />} color={game.windows ? 'blue' : 'default'}>Windows</Tag>
          <Tag icon={<AppleOutlined />} color={game.mac ? 'purple' : 'default'}>macOS</Tag>
          <Tag icon={<LinuxOutlined />} color={game.linux ? 'orange' : 'default'}>Linux</Tag>
        </Space>
      </Card>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}><Card title={text.tags}><Space wrap>{game.tags?.map(tag => <Tag key={tag}>{tag}</Tag>)}</Space></Card></Col>
        <Col span={12}><Card title={text.developers}><Space wrap>{game.developers?.map(dev => <Tag key={dev} color="green">{dev}</Tag>)}</Space></Card></Col>
      </Row>

      {game.publishers?.length > 0 && (
        <Card title={text.publishers} style={{ marginTop: 16 }}>
          <Space wrap>{game.publishers?.map(pub => <Tag key={pub} color="purple">{pub}</Tag>)}</Space>
        </Card>
      )}

      {similarGames.length > 0 && (
        <Card title={text.similar} style={{ marginTop: 16 }}>
          <Row gutter={[16, 16]}>
            {similarGames.map(similar => (
              <Col span={4} key={similar.id}>
                <Card
                  hoverable
                  size="small"
                  cover={<img alt={similar.name} src={similar.header_image} style={{ height: 80, objectFit: 'cover' }} onError={(e) => (e.target.style.display = 'none')} />}
                  onClick={() => navigate(`/games/${similar.id}`)}
                >
                  <Card.Meta
                    title={similar.name}
                    description={<span style={{ color: similar.positive_rate >= 80 ? '#52c41a' : '#faad14', fontSize: 12 }}>{similar.positive_rate?.toFixed(0)}% {text.positiveShort}</span>}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {game.website && (
        <Card style={{ marginTop: 16 }}>
          <a href={game.website} target="_blank" rel="noopener noreferrer">{text.officialSite}</a>
        </Card>
      )}

      <Modal title={text.rateTitle} open={ratingModalVisible} onOk={handleRateGame} onCancel={() => setRatingModalVisible(false)} okText={text.submit} cancelText={text.cancel}>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Rate value={tempRating / 2} onChange={(value) => setTempRating(value * 2)} allowHalf style={{ fontSize: 36 }} />
          <div style={{ marginTop: 16, fontSize: 18 }}>{text.score}: {tempRating} / 10</div>
        </div>
      </Modal>
    </div>
  )
}

export default GameDetailPage
