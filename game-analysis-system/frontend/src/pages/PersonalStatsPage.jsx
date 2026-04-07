import { useEffect, useState } from 'react'
import { Card, Row, Col, Spin, Typography, Statistic, Tabs, Progress, Empty, message } from 'antd'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  AreaChart, Area, CartesianGrid, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'
import {
  HeartOutlined, StarOutlined, EyeOutlined, EditOutlined,
  LikeOutlined, TeamOutlined, MessageOutlined, FireOutlined
} from '@ant-design/icons'
import { statisticsApi } from '../api'
import { useLanguage } from '../context/LanguageContext'

const { Title, Text } = Typography

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1']

export default function PersonalStatsPage() {
  const { isZh } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  const t = isZh
    ? {
        loadFailed: '加载个人统计数据失败',
        defaultError: '加载失败，请确保已登录',
        empty: '暂无数据，多浏览和收藏游戏后会展示你的个人分析',
        title: '我的数据报告',
        overview: '个人概览',
        favorite: '收藏分析',
        rating: '评分分析',
        activity: '活跃统计',
        favoriteGames: '收藏游戏',
        ratedGames: '评分游戏',
        avgMyRating: '我的均分',
        history: '浏览记录',
        friends: '好友数量',
        active7d: '近7天活跃',
        favoriteAvg: '收藏游戏平均数据',
        avgPositive: '平均好评率',
        avgPrice: '平均价格',
        avgMeta: '平均Meta评分',
        favoriteGenre: '收藏类型偏好',
        favoritePlatform: '收藏平台分布',
        favoriteYear: '收藏游戏发行年份分布',
        favoriteCount: '收藏数',
        myRatingDist: '我的评分分布',
        ratingGenrePref: '评分类型偏好(按均分排序)',
        ratingLabel: '评分',
        gameCount: '游戏数',
        avgRating: '平均评分',
        interestRadar: '兴趣雷达图(收藏 vs 评分)',
        favoritePref: '收藏偏好',
        ratingPref: '评分偏好',
        posts: '发帖数',
        comments: '评论数',
        likesReceived: '获赞总数',
        historyGenre: '浏览类型偏好',
        activityScore: '个人活跃度',
        recentBrowse: '近7天浏览次数',
        timesPer7d: '次/7天'
      }
    : {
        loadFailed: 'Failed to load personal statistics',
        defaultError: 'Load failed, please ensure you are logged in',
        empty: 'No data yet. Browse and favorite more games to see your report.',
        title: 'My Data Report',
        overview: 'Overview',
        favorite: 'Favorites',
        rating: 'Ratings',
        activity: 'Activity',
        favoriteGames: 'Favorites',
        ratedGames: 'Rated Games',
        avgMyRating: 'My Avg Rating',
        history: 'History',
        friends: 'Friends',
        active7d: '7-day Activity',
        favoriteAvg: 'Favorite Games Average',
        avgPositive: 'Average Positive Rate',
        avgPrice: 'Average Price',
        avgMeta: 'Average Meta Score',
        favoriteGenre: 'Favorite Genre Preference',
        favoritePlatform: 'Favorite Platform Distribution',
        favoriteYear: 'Favorite Games by Release Year',
        favoriteCount: 'Favorites',
        myRatingDist: 'My Rating Distribution',
        ratingGenrePref: 'Rated Genre Preference (by avg rating)',
        ratingLabel: 'Rating',
        gameCount: 'Games',
        avgRating: 'Average Rating',
        interestRadar: 'Interest Radar (Favorites vs Ratings)',
        favoritePref: 'Favorite Preference',
        ratingPref: 'Rating Preference',
        posts: 'Posts',
        comments: 'Comments',
        likesReceived: 'Likes Received',
        historyGenre: 'Browsing Genre Preference',
        activityScore: 'Activity Score',
        recentBrowse: 'Recent 7-day views',
        timesPer7d: '/7 days'
      }

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await statisticsApi.getPersonal()
      setStats(res.data)
    } catch (error) {
      setError(error.response?.data?.message || t.defaultError)
      message.error(t.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />
  if (error) return <Empty description={error} />
  if (!stats) return <Empty description={t.empty} />
  if (stats.total_favorites === 0 && stats.total_ratings === 0 && stats.total_history === 0) return <Empty description={t.empty} />

  const OverviewCards = () => (
    <Row gutter={[16, 16]}>
      <Col span={4}><Card hoverable><Statistic title={t.favoriteGames} value={stats.total_favorites} prefix={<HeartOutlined />} valueStyle={{ color: '#ef4444' }} /></Card></Col>
      <Col span={4}><Card hoverable><Statistic title={t.ratedGames} value={stats.total_ratings} prefix={<StarOutlined />} valueStyle={{ color: '#f59e0b' }} /></Card></Col>
      <Col span={4}><Card hoverable><Statistic title={t.avgMyRating} value={stats.avg_my_rating} precision={1} suffix="/10" valueStyle={{ color: '#10b981' }} /></Card></Col>
      <Col span={4}><Card hoverable><Statistic title={t.history} value={stats.total_history} prefix={<EyeOutlined />} valueStyle={{ color: '#3b82f6' }} /></Card></Col>
      <Col span={4}><Card hoverable><Statistic title={t.friends} value={stats.total_friends} prefix={<TeamOutlined />} valueStyle={{ color: '#8b5cf6' }} /></Card></Col>
      <Col span={4}><Card hoverable><Statistic title={t.active7d} value={stats.recent_activity_7d} prefix={<FireOutlined />} valueStyle={{ color: '#f97316' }} /></Card></Col>
    </Row>
  )

  const FavoriteAnalysis = () => (
    <div>
      <Row gutter={16}>
        <Col span={8}>
          <Card title={t.favoriteAvg}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Progress type="dashboard" percent={parseFloat((stats.favorite_scores?.avg_positive_rate || 0)).toFixed(0)} format={p => `${p}%`} strokeColor="#10b981" />
              <Text type="secondary">{t.avgPositive}</Text>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-around' }}>
                <div><Text strong style={{ fontSize: 18, color: '#f59e0b' }}>${stats.favorite_price?.avg_price?.toFixed(1)}</Text><br /><Text type="secondary">{t.avgPrice}</Text></div>
                <div><Text strong style={{ fontSize: 18, color: '#ef4444' }}>{stats.favorite_scores?.avg_metacritic_score?.toFixed(0)}</Text><br /><Text type="secondary">{t.avgMeta}</Text></div>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title={t.favoriteGenre}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.favorite_genres?.slice(0, 8) || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" name={t.favoriteCount} radius={[0, 4, 4, 0]}>{(stats.favorite_genres?.slice(0, 8) || []).map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={8}>
          <Card title={t.favoritePlatform}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={[{ name: 'Windows', value: stats.favorite_platforms?.windows || 0 }, { name: 'Mac', value: stats.favorite_platforms?.mac || 0 }, { name: 'Linux', value: stats.favorite_platforms?.linux || 0 }]} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  <Cell fill="#3b82f6" /><Cell fill="#8b5cf6" /><Cell fill="#f59e0b" />
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {stats.favorite_years?.length > 0 && (
        <Card title={t.favoriteYear} style={{ marginTop: 16 }}>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={stats.favorite_years}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name={t.favoriteCount} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )

  const RatingAnalysis = () => (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Card title={t.myRatingDist}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.rating_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rating" label={{ value: t.ratingLabel, position: 'insideBottom', offset: -5 }} />
                <YAxis />
                <Tooltip formatter={(v, n) => (n === 'count' ? [v, t.gameCount] : v)} />
                <Bar dataKey="count" fill="#f59e0b" name={t.gameCount} radius={[4, 4, 0, 0]}>{(stats.rating_distribution || []).map((_, i) => <Cell key={i} fill={COLORS[i % 10]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t.ratingGenrePref}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.rated_genres?.slice(0, 10) || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 10]} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="avg_rating" fill="#10b981" name={t.avgRating} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {stats.favorite_genres?.length > 0 && (
        <Card title={t.interestRadar} style={{ marginTop: 16 }}>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={(() => {
              const allGenres = new Set([...(stats.favorite_genres?.map(g => g.name) || []), ...(stats.rated_genres?.map(g => g.name) || [])])
              const genreNames = [...allGenres].slice(0, 8)
              const favMap = Object.fromEntries((stats.favorite_genres || []).map(g => [g.name, g.count]))
              const rateMap = Object.fromEntries((stats.rated_genres || []).map(g => [g.name, g.avg_rating]))
              const maxFav = Math.max(...Object.values(favMap), 1)
              const maxRate = Math.max(...Object.values(rateMap), 1)
              return genreNames.map(name => ({
                genre: name,
                [t.favoritePref]: Math.round(((favMap[name] || 0) / maxFav) * 100) / 10,
                [t.ratingPref]: Math.round(((rateMap[name] || 0) / maxRate) * 100) / 10
              }))
            })()}>
              <PolarGrid />
              <PolarAngleAxis dataKey="genre" />
              <PolarRadiusAxis domain={[0, 10]} />
              <Radar name={t.favoritePref} dataKey={t.favoritePref} stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
              <Radar name={t.ratingPref} dataKey={t.ratingPref} stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )

  const ActivityAnalysis = () => (
    <div>
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic title={t.posts} value={stats.community?.total_posts || 0} prefix={<EditOutlined />} valueStyle={{ color: '#3b82f6' }} />
            <div style={{ marginTop: 12 }}><Statistic title={t.comments} value={stats.community?.total_comments || 0} prefix={<MessageOutlined />} valueStyle={{ color: '#8b5cf6', fontSize: 20 }} /></div>
            <div style={{ marginTop: 12 }}><Statistic title={t.likesReceived} value={stats.community?.total_likes_received || 0} prefix={<LikeOutlined />} valueStyle={{ color: '#ef4444', fontSize: 20 }} /></div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title={t.historyGenre}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={stats.history_genres?.slice(0, 8) || []} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {(stats.history_genres?.slice(0, 8) || []).map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={8}>
          <Card title={t.activityScore}>
            <div style={{ padding: '20px 0' }}>
              <Progress
                type="circle"
                percent={Math.min(100, ((stats.recent_activity_7d || 0) / 35) * 100)}
                format={() => <span style={{ fontSize: 18 }}>{stats.recent_activity_7d}<br /><span style={{ fontSize: 12 }}>{t.timesPer7d}</span></span>}
                strokeColor="#10b981"
                size={160}
              />
              <div style={{ textAlign: 'center', marginTop: 16 }}><Text type="secondary">{t.recentBrowse}</Text></div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )

  const tabs = [
    { key: 'overview', label: t.overview, content: <OverviewCards /> },
    { key: 'favorite', label: t.favorite, content: <FavoriteAnalysis /> },
    { key: 'rating', label: t.rating, content: <RatingAnalysis /> },
    { key: 'activity', label: t.activity, content: <ActivityAnalysis /> }
  ]

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>{t.title}</Title>
      <Tabs defaultActiveKey="overview" items={tabs.map(tab => ({ key: tab.key, label: tab.label, children: tab.content }))} />
    </div>
  )
}
