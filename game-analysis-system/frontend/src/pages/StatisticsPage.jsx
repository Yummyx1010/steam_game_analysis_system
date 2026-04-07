import { useEffect, useState } from 'react'
import { Card, Row, Col, Spin, Typography, Statistic, Tabs, Table, Tag, Progress, Select, Space, Button } from 'antd'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  Line, ComposedChart, AreaChart, Area, ScatterChart, Scatter, CartesianGrid, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'
import { DollarOutlined, StarOutlined, GlobalOutlined } from '@ant-design/icons'
import { gameApi, statisticsApi } from '../api'
import { useLanguage } from '../context/LanguageContext'

const { Title } = Typography
const { Option } = Select

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb']

function WordCloud({ words, maxWords = 50, tooltipSuffix }) {
  if (!words || words.length === 0) return null

  const sortedWords = [...words].sort((a, b) => b.count - a.count).slice(0, maxWords)
  const maxCount = sortedWords[0]?.count || 1
  const minCount = sortedWords[sortedWords.length - 1]?.count || 1

  const getFontSize = (count) => {
    const minSize = 12
    const maxSize = 36
    if (maxCount === minCount) return (minSize + maxSize) / 2
    return minSize + ((count - minCount) / (maxCount - minCount)) * (maxSize - minSize)
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'center', padding: 20, minHeight: 300 }}>
      {sortedWords.map((word, index) => (
        <span
          key={word.name}
          style={{
            fontSize: getFontSize(word.count),
            color: COLORS[index % COLORS.length],
            fontWeight: word.count > maxCount * 0.5 ? 'bold' : 'normal',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => (e.target.style.transform = 'scale(1.1)')}
          onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
          title={`${word.name}: ${word.count}${tooltipSuffix}`}
        >
          {word.name}
        </span>
      ))}
    </div>
  )
}

function StatisticsPage() {
  const { isZh } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [basicStats, setBasicStats] = useState(null)
  const [priceStats, setPriceStats] = useState(null)
  const [scoreStats, setScoreStats] = useState(null)
  const [developerStats, setDeveloperStats] = useState(null)
  const [platformStats, setPlatformStats] = useState(null)
  const [monthlyStats, setMonthlyStats] = useState(null)
  const [selectedYear, setSelectedYear] = useState(null)
  const [error, setError] = useState(null)

  const t = isZh
    ? {
        reload: '重新加载',
        loadFail: '数据加载失败，请刷新页面重试',
        title: '数据分析中心',
        totalGames: '游戏总数',
        freeGames: '免费游戏',
        paidGames: '付费游戏',
        avgPrice: '平均价格',
        avgPositiveRate: '平均好评率',
        windowsSupport: 'Windows支持',
        marketOverview: '市场概览',
        genreTag: '类型与标签',
        priceAnalysis: '价格分析',
        scoreAnalysis: '评分分析',
        developerAnalysis: '开发商/发行商',
        releaseTrend20y: '游戏发布趋势（近20年）',
        gameCount: '游戏数量',
        trendLine: '趋势线',
        freePaidRatio: '免费/付费游戏占比',
        free: '免费游戏',
        paid: '付费游戏',
        monthlyTrend: '月度发布趋势',
        yearSuffix: '年',
        platformStatus: '平台支持情况',
        topGenres: '热门游戏类型 TOP 15',
        topTags: '热门标签分布 TOP 15',
        tagCloud: '游戏标签词云',
        genreCloud: '游戏类型词云',
        priceRange: '价格区间分布（付费游戏）',
        priceVsScore: '价格与评分关系',
        priceRangeDetail: '价格区间评分详情',
        scoreRange: '评分区间分布',
        highScoreGenre: '高分游戏类型分布（好评率≥90%）',
        highScoreDetail: '高分游戏类型详情',
        topDevelopers: '热门开发商 TOP 15',
        topPublishers: '热门发行商 TOP 15',
        developerDetail: '开发商详情',
        range: '区间',
        priceRangeCol: '价格区间',
        avgRating: '平均好评率',
        count: '数量',
        type: '类型',
        highScoreCount: '高分游戏数量',
        developer: '开发商',
        publisher: '发行商',
        avgPriceCol: '平均价格',
        gamesSuffix: '个游戏'
      }
    : {
        reload: 'Reload',
        loadFail: 'Failed to load data. Please refresh and try again.',
        title: 'Analytics Center',
        totalGames: 'Total Games',
        freeGames: 'Free Games',
        paidGames: 'Paid Games',
        avgPrice: 'Average Price',
        avgPositiveRate: 'Average Positive Rate',
        windowsSupport: 'Windows Support',
        marketOverview: 'Market Overview',
        genreTag: 'Genres & Tags',
        priceAnalysis: 'Price Analysis',
        scoreAnalysis: 'Score Analysis',
        developerAnalysis: 'Developers/Publishers',
        releaseTrend20y: 'Release Trend (Last 20 Years)',
        gameCount: 'Games',
        trendLine: 'Trend',
        freePaidRatio: 'Free vs Paid Ratio',
        free: 'Free',
        paid: 'Paid',
        monthlyTrend: 'Monthly Release Trend',
        yearSuffix: '',
        platformStatus: 'Platform Support',
        topGenres: 'Top Genres (TOP 15)',
        topTags: 'Top Tags Distribution (TOP 15)',
        tagCloud: 'Tag Word Cloud',
        genreCloud: 'Genre Word Cloud',
        priceRange: 'Price Distribution (Paid Games)',
        priceVsScore: 'Price vs Score',
        priceRangeDetail: 'Price-Range Score Details',
        scoreRange: 'Score Distribution',
        highScoreGenre: 'High-score Genre Distribution (≥90%)',
        highScoreDetail: 'High-score Genre Details',
        topDevelopers: 'Top Developers (TOP 15)',
        topPublishers: 'Top Publishers (TOP 15)',
        developerDetail: 'Developer Details',
        range: 'Range',
        priceRangeCol: 'Price Range',
        avgRating: 'Average Positive Rate',
        count: 'Count',
        type: 'Type',
        highScoreCount: 'High-score Games',
        developer: 'Developer',
        publisher: 'Publisher',
        avgPriceCol: 'Average Price',
        gamesSuffix: ' games'
      }

  useEffect(() => {
    fetchAllStats()
  }, [])

  useEffect(() => {
    if (selectedYear) fetchMonthlyStats(selectedYear)
  }, [selectedYear])

  const fetchAllStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const basic = await gameApi.getStatistics()
      setBasicStats(basic.data)
      if (basic.data?.games_by_year?.length > 0) {
        const years = basic.data.games_by_year.map(g => g.year)
        setSelectedYear(Math.max(...years))
      }

      try { const price = await statisticsApi.getPrice(); setPriceStats(price.data) } catch (e) {}
      try { const score = await statisticsApi.getScore(); setScoreStats(score.data) } catch (e) {}
      try { const developer = await statisticsApi.getDevelopers(15); setDeveloperStats(developer.data) } catch (e) {}
      try { const platform = await statisticsApi.getPlatform(); setPlatformStats(platform.data) } catch (e) {}
    } catch (err) {
      setError(t.loadFail)
    } finally {
      setLoading(false)
    }
  }

  const fetchMonthlyStats = async (year) => {
    try {
      const res = await statisticsApi.getMonthly(year)
      setMonthlyStats(res.data)
    } catch (error) {}
  }

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Title level={3} type="danger">{error}</Title>
        <Button onClick={fetchAllStats}>{t.reload}</Button>
      </div>
    )
  }

  const years = basicStats?.games_by_year?.map(g => g.year) || []
  const pieColors = ['#52c41a', '#1890ff']

  const OverviewCards = () => (
    <Row gutter={16}>
      <Col span={4}><Card><Statistic title={t.totalGames} value={basicStats?.total_games} prefix={<GlobalOutlined />} valueStyle={{ color: '#1890ff' }} /></Card></Col>
      <Col span={4}><Card><Statistic title={t.freeGames} value={basicStats?.total_free_games} prefix={<StarOutlined />} valueStyle={{ color: '#52c41a' }} /></Card></Col>
      <Col span={4}><Card><Statistic title={t.paidGames} value={basicStats?.total_games - basicStats?.total_free_games} prefix={<DollarOutlined />} valueStyle={{ color: '#faad14' }} /></Card></Col>
      <Col span={4}><Card><Statistic title={t.avgPrice} value={basicStats?.avg_price} precision={2} prefix="$" valueStyle={{ color: '#722ed1' }} /></Card></Col>
      <Col span={4}><Card><Statistic title={t.avgPositiveRate} value={basicStats?.avg_positive_rate} precision={1} suffix="%" valueStyle={{ color: '#13c2c2' }} /></Card></Col>
      <Col span={4}>
        <Card>
          <Statistic title={t.windowsSupport} value={platformStats?.windows} suffix={`/ ${platformStats?.total}`} valueStyle={{ color: '#eb2f96' }} />
          <Progress percent={Math.round((platformStats?.windows || 0) / (platformStats?.total || 1) * 100)} size="small" showInfo={false} />
        </Card>
      </Col>
    </Row>
  )

  const MarketOverview = () => (
    <div>
      <OverviewCards />

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={16}>
          <Card title={t.releaseTrend20y}>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={basicStats?.games_by_year?.slice(-20) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="#1890ff" name={t.gameCount} />
                <Line yAxisId="right" type="monotone" dataKey="count" stroke="#52c41a" name={t.trendLine} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={8}>
          <Card title={t.freePaidRatio}>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={[{ name: t.free, value: basicStats?.total_free_games }, { name: t.paid, value: basicStats?.total_games - basicStats?.total_free_games }]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                >
                  <Cell fill={pieColors[0]} />
                  <Cell fill={pieColors[1]} />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={16}>
          <Card
            title={<Space><span>{t.monthlyTrend}</span><Select value={selectedYear} onChange={setSelectedYear} style={{ width: 120 }}>{years.slice(-10).reverse().map(year => <Option key={year} value={year}>{`${year}${t.yearSuffix}`}</Option>)}</Select></Space>}
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyStats || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#1890ff" fill="#1890ff" fillOpacity={0.3} name={t.gameCount} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={8}>
          <Card title={t.platformStatus}>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={[{ platform: 'Windows', value: platformStats?.windows || 0, fullMark: platformStats?.total || 1 }, { platform: 'macOS', value: platformStats?.mac || 0, fullMark: platformStats?.total || 1 }, { platform: 'Linux', value: platformStats?.linux || 0, fullMark: platformStats?.total || 1 }]}>
                <PolarGrid />
                <PolarAngleAxis dataKey="platform" />
                <PolarRadiusAxis />
                <Radar name={t.gameCount} dataKey="value" stroke="#1890ff" fill="#1890ff" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  )

  const GenreTagAnalysis = () => (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Card title={t.topGenres}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={basicStats?.top_genres?.slice(0, 15) || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#52c41a" name={t.gameCount}>{basicStats?.top_genres?.slice(0, 15)?.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t.topTags}>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie data={basicStats?.top_tags?.slice(0, 15) || []} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={140} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {basicStats?.top_tags?.slice(0, 15)?.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title={t.tagCloud} style={{ marginTop: 16 }}><WordCloud words={basicStats?.top_tags || []} maxWords={60} tooltipSuffix={t.gamesSuffix} /></Card>
      <Card title={t.genreCloud} style={{ marginTop: 16 }}><WordCloud words={basicStats?.top_genres || []} maxWords={30} tooltipSuffix={t.gamesSuffix} /></Card>
    </div>
  )

  const PriceAnalysis = () => (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Card title={t.priceRange}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={priceStats?.price_ranges || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#faad14" name={t.gameCount}>{priceStats?.price_ranges?.map((entry, index) => <Cell key={entry.range} fill={COLORS[index % COLORS.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t.priceVsScore}>
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="price" name={t.priceRangeCol} unit="$" />
                <YAxis dataKey="rating" name={t.avgRating} unit="%" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={priceStats?.price_rating || []} fill="#1890ff" name={t.gameCount} />
              </ScatterChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title={t.priceRangeDetail} style={{ marginTop: 16 }}>
        <Table
          dataSource={priceStats?.price_rating || []}
          columns={[
            { title: t.priceRangeCol, dataIndex: 'price', key: 'price', render: (v) => `$${v}-${v + 10}` },
            { title: t.count, dataIndex: 'count', key: 'count', sorter: (a, b) => a.count - b.count },
            { title: t.avgRating, dataIndex: 'rating', key: 'rating', render: (v) => <Tag color={v >= 80 ? 'green' : v >= 60 ? 'orange' : 'red'}>{v?.toFixed(1)}%</Tag> }
          ]}
          rowKey="price"
          pagination={false}
        />
      </Card>
    </div>
  )

  const ScoreAnalysis = () => (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Card title={t.scoreRange}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={scoreStats?.score_ranges || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#13c2c2" name={t.gameCount}>{scoreStats?.score_ranges?.map((entry, index) => <Cell key={entry.range} fill={COLORS[index % COLORS.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t.highScoreGenre}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={scoreStats?.top_genres || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#52c41a" name={t.gameCount} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title={t.highScoreDetail} style={{ marginTop: 16 }}>
        <Table
          dataSource={scoreStats?.top_genres || []}
          columns={[
            { title: t.type, dataIndex: 'name', key: 'name' },
            { title: t.highScoreCount, dataIndex: 'count', key: 'count', sorter: (a, b) => a.count - b.count },
            { title: t.avgRating, dataIndex: 'avg_rating', key: 'avg_rating', render: (v) => <Tag color="green">{v?.toFixed(1)}%</Tag> }
          ]}
          rowKey="name"
          pagination={false}
        />
      </Card>
    </div>
  )

  const DeveloperAnalysis = () => (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Card title={t.topDevelopers}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={developerStats?.top_developers?.slice(0, 15) || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="game_count" fill="#722ed1" name={t.gameCount} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t.topPublishers}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={developerStats?.top_publishers?.slice(0, 15) || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="game_count" fill="#eb2f96" name={t.gameCount} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title={t.developerDetail} style={{ marginTop: 16 }}>
        <Table
          dataSource={developerStats?.top_developers || []}
          columns={[
            { title: t.developer, dataIndex: 'name', key: 'name' },
            { title: t.count, dataIndex: 'game_count', key: 'game_count', sorter: (a, b) => a.game_count - b.game_count },
            { title: t.avgRating, dataIndex: 'avg_rating', key: 'avg_rating', render: (v) => <Tag color={v >= 80 ? 'green' : v >= 60 ? 'orange' : 'red'}>{v?.toFixed(1)}%</Tag> },
            { title: t.avgPriceCol, dataIndex: 'avg_price', key: 'avg_price', render: (v) => `$${v?.toFixed(2)}` }
          ]}
          rowKey="name"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  )

  const tabs = [
    { key: 'overview', label: t.marketOverview, content: <MarketOverview /> },
    { key: 'genre', label: t.genreTag, content: <GenreTagAnalysis /> },
    { key: 'price', label: t.priceAnalysis, content: <PriceAnalysis /> },
    { key: 'score', label: t.scoreAnalysis, content: <ScoreAnalysis /> },
    { key: 'developer', label: t.developerAnalysis, content: <DeveloperAnalysis /> }
  ]

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>{t.title}</Title>
      <Tabs defaultActiveKey="overview" items={tabs.map(tab => ({ key: tab.key, label: tab.label, children: tab.content }))} />
    </div>
  )
}

export default StatisticsPage
