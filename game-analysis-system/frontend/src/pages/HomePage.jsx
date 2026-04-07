import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Row, Col, Statistic, List, Typography, Spin } from 'antd'
import { AppstoreOutlined, DollarOutlined, StarOutlined } from '@ant-design/icons'
import { gameApi } from '../api'
import { useLanguage } from '../context/LanguageContext'

const { Title } = Typography

function HomePage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const { isZh } = useLanguage()

  const text = isZh
    ? {
        title: 'Steam游戏分析系统',
        totalGames: '游戏总数',
        freeGames: '免费游戏',
        avgPrice: '平均价格',
        avgPositiveRate: '平均好评率',
        topTags: '热门标签',
        topGenres: '热门类型',
        gameCountUnit: '款游戏',
        viewAll: '查看全部游戏 →'
      }
    : {
        title: 'Steam Game Analytics',
        totalGames: 'Total Games',
        freeGames: 'Free Games',
        avgPrice: 'Average Price',
        avgPositiveRate: 'Average Positive Rate',
        topTags: 'Top Tags',
        topGenres: 'Top Genres',
        gameCountUnit: 'games',
        viewAll: 'View all games →'
      }

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await gameApi.getStatistics()
      setStats(res.data)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />
  }

  return (
    <div>
      <Title level={2}>{text.title}</Title>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={text.totalGames}
              value={stats?.total_games || 0}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={text.freeGames}
              value={stats?.total_free_games || 0}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={text.avgPrice}
              value={stats?.avg_price?.toFixed(2) || 0}
              prefix="$"
              suffix="USD"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={text.avgPositiveRate}
              value={stats?.avg_positive_rate?.toFixed(1) || 0}
              prefix={<StarOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card title={text.topTags}>
            <List
              dataSource={stats?.top_tags || []}
              renderItem={(item) => (
                <List.Item>
                  <span>{item.name}</span>
                  <span style={{ color: '#999' }}>{item.count} {text.gameCountUnit}</span>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title={text.topGenres}>
            <List
              dataSource={stats?.top_genres || []}
              renderItem={(item) => (
                <List.Item>
                  <span>{item.name}</span>
                  <span style={{ color: '#999' }}>{item.count} {text.gameCountUnit}</span>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 24 }}>
        <Link to="/games">{text.viewAll}</Link>
      </Card>
    </div>
  )
}

export default HomePage
