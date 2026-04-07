import { useMemo, useState } from 'react'
import { Card, Select, Table, Tag, Row, Col, Space, Button, message, Spin, Slider, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { gameApi } from '../api'
import { useLanguage } from '../context/LanguageContext'

const { Text } = Typography

const SCORE_KEYS = ['positive_rate', 'total_reviews', 'estimated_owners_num', 'peak_ccu', 'average_playtime_forever', 'price']

function CompareLabPage() {
  const { isZh } = useLanguage()
  const [selectedIds, setSelectedIds] = useState([])
  const [options, setOptions] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [games, setGames] = useState([])
  const [weights, setWeights] = useState({
    positive_rate: 30,
    total_reviews: 15,
    estimated_owners_num: 15,
    peak_ccu: 15,
    average_playtime_forever: 10,
    price: 15
  })

  const text = isZh
    ? {
        title: '游戏对比实验室',
        subtitle: '最多选择 4 款游戏，横向对比关键指标',
        selectPlaceholder: '输入游戏名搜索并选择（最多4个）',
        clear: '清空选择',
        loading: '加载对比数据中...',
        metric: '指标',
        gameName: '游戏名称',
        releaseDate: '发行日期',
        price: '价格',
        positiveRate: '好评率',
        reviews: '评价数',
        owners: '估计拥有者',
        peakCcu: '最高同时在线',
        avgPlaytime: '平均游戏时长',
        genres: '类型',
        free: '免费',
        minSelect: '请至少选择2款游戏进行对比',
        maxSelect: '最多只能选择4款游戏',
        best: '优势',
        scoreModelTitle: '评分模型',
        scoreModelDesc: '可调整权重生成综合分（缺失值会自动跳过，不会拉低分数）',
        resetWeights: '重置权重',
        score: '综合分',
        rank: '排名',
        game: '游戏',
        scoreUnavailable: '暂无可计算指标',
        noData: '无数据'
      }
    : {
        title: 'Game Compare Lab',
        subtitle: 'Select up to 4 games for side-by-side comparison',
        selectPlaceholder: 'Search and select games (max 4)',
        clear: 'Clear',
        loading: 'Loading comparison data...',
        metric: 'Metric',
        gameName: 'Game',
        releaseDate: 'Release Date',
        price: 'Price',
        positiveRate: 'Positive Rate',
        reviews: 'Reviews',
        owners: 'Estimated Owners',
        peakCcu: 'Peak CCU',
        avgPlaytime: 'Avg Playtime',
        genres: 'Genres',
        free: 'Free',
        minSelect: 'Please select at least 2 games to compare',
        maxSelect: 'You can select up to 4 games only',
        best: 'Best',
        scoreModelTitle: 'Scoring Model',
        scoreModelDesc: 'Adjust weights for overall score (missing values are skipped, not penalized)',
        resetWeights: 'Reset Weights',
        score: 'Score',
        rank: 'Rank',
        game: 'Game',
        scoreUnavailable: 'No computable metrics',
        noData: 'No data'
      }

  const metricDefs = useMemo(() => ([
    {
      key: 'name',
      label: text.gameName,
      display: (g) => g.name
    },
    {
      key: 'release_date',
      label: text.releaseDate,
      display: (g) => g.release_date || '-'
    },
    {
      key: 'price',
      label: text.price,
      direction: 'lower',
      number: (g) => {
        if (g.is_free) return 0
        const v = Number(g.price)
        return Number.isFinite(v) ? v : null
      },
      display: (g) => (g.is_free ? text.free : (Number.isFinite(Number(g.price)) ? `$${Number(g.price).toFixed(2)}` : '-'))
    },
    {
      key: 'positive_rate',
      label: text.positiveRate,
      direction: 'higher',
      number: (g) => (Number.isFinite(Number(g.positive_rate)) ? Number(g.positive_rate) : null),
      display: (g) => (Number.isFinite(Number(g.positive_rate)) ? `${Number(g.positive_rate).toFixed(1)}%` : '-')
    },
    {
      key: 'total_reviews',
      label: text.reviews,
      direction: 'higher',
      number: (g) => (Number.isFinite(Number(g.total_reviews)) ? Number(g.total_reviews) : null),
      display: (g) => (Number.isFinite(Number(g.total_reviews)) ? Number(g.total_reviews).toLocaleString() : '-')
    },
    {
      key: 'estimated_owners_num',
      label: text.owners,
      direction: 'higher',
      number: (g) => (Number.isFinite(Number(g.estimated_owners_num)) ? Number(g.estimated_owners_num) : null),
      display: (g) => (Number.isFinite(Number(g.estimated_owners_num)) ? Number(g.estimated_owners_num).toLocaleString() : '-')
    },
    {
      key: 'peak_ccu',
      label: text.peakCcu,
      direction: 'higher',
      number: (g) => (Number.isFinite(Number(g.peak_ccu)) ? Number(g.peak_ccu) : null),
      display: (g) => (Number.isFinite(Number(g.peak_ccu)) ? Number(g.peak_ccu).toLocaleString() : '-')
    },
    {
      key: 'average_playtime_forever',
      label: text.avgPlaytime,
      direction: 'higher',
      number: (g) => (Number.isFinite(Number(g.average_playtime_forever)) ? Number(g.average_playtime_forever) : null),
      display: (g) => (Number.isFinite(Number(g.average_playtime_forever)) ? `${Number(g.average_playtime_forever).toLocaleString()} min` : '-')
    },
    {
      key: 'genres',
      label: text.genres,
      display: (g) => (
        <Space wrap>
          {(g.genres || []).slice(0, 4).map(item => <Tag key={`${g.id}-${item}`}>{item}</Tag>)}
        </Space>
      )
    }
  ]), [text])

  const scoreMetrics = useMemo(() => metricDefs.filter(m => SCORE_KEYS.includes(m.key)), [metricDefs])

  const totalWeight = useMemo(() => SCORE_KEYS.reduce((sum, key) => sum + (weights[key] || 0), 0), [weights])

  const bestIdMap = useMemo(() => {
    const map = {}
    metricDefs.forEach((metric) => {
      if (!metric.number || !metric.direction) return
      const values = games
        .map(g => ({ id: g.id, v: metric.number(g) }))
        .filter(item => item.v !== null)

      if (!values.length) {
        map[metric.key] = new Set()
        return
      }

      const bestVal = metric.direction === 'higher'
        ? Math.max(...values.map(item => item.v))
        : Math.min(...values.map(item => item.v))

      map[metric.key] = new Set(values.filter(item => Math.abs(item.v - bestVal) < 1e-9).map(item => item.id))
    })
    return map
  }, [games, metricDefs])

  const scoreMap = useMemo(() => {
    const ranges = {}
    scoreMetrics.forEach((m) => {
      const vals = games.map(g => m.number(g)).filter(v => v !== null)
      ranges[m.key] = vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : null
    })

    const result = {}
    games.forEach((g) => {
      let weightedScore = 0
      let effectiveWeight = 0

      scoreMetrics.forEach((m) => {
        const raw = m.number(g)
        const range = ranges[m.key]
        const w = Number(weights[m.key] || 0)

        if (raw === null || !range || w <= 0) return

        let normalized = 1
        if (range.max !== range.min) {
          normalized = m.direction === 'higher'
            ? (raw - range.min) / (range.max - range.min)
            : (range.max - raw) / (range.max - range.min)
        }

        weightedScore += normalized * w
        effectiveWeight += w
      })

      result[g.id] = effectiveWeight > 0 ? (weightedScore / effectiveWeight) * 100 : null
    })

    return result
  }, [games, scoreMetrics, weights])

  const rankRows = useMemo(() => {
    const rows = games.map(g => ({
      key: g.id,
      game: g,
      score: scoreMap[g.id]
    }))

    rows.sort((a, b) => {
      if (a.score === null && b.score === null) return 0
      if (a.score === null) return 1
      if (b.score === null) return -1
      return b.score - a.score
    })

    return rows.map((row, idx) => ({ ...row, rank: idx + 1 }))
  }, [games, scoreMap])

  const searchGames = async (keyword) => {
    const q = keyword.trim()
    if (!q) {
      setOptions([])
      return
    }

    setSearchLoading(true)
    try {
      const res = await gameApi.getGames({ search: q, page: 1, page_size: 20 })
      setOptions((res.data.games || []).map(g => ({ label: g.name, value: g.id })))
    } finally {
      setSearchLoading(false)
    }
  }

  const fetchCompareGames = async (ids) => {
    if (ids.length < 2) {
      setGames([])
      return
    }

    setLoading(true)
    try {
      const results = await Promise.all(ids.map(id => gameApi.getGame(id)))
      setGames(results.map(r => r.data))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (values) => {
    if (values.length > 4) {
      message.warning(text.maxSelect)
      return
    }
    setSelectedIds(values)
    fetchCompareGames(values)
  }

  const scoreMetricConfig = [
    { key: 'positive_rate', label: text.positiveRate },
    { key: 'total_reviews', label: text.reviews },
    { key: 'estimated_owners_num', label: text.owners },
    { key: 'peak_ccu', label: text.peakCcu },
    { key: 'average_playtime_forever', label: text.avgPlaytime },
    { key: 'price', label: text.price }
  ]

  const columns = useMemo(() => ([
    {
      title: text.metric,
      dataIndex: 'metric',
      key: 'metric',
      width: 180,
      fixed: 'left'
    },
    ...games.map(g => ({
      title: (
        <Space direction="vertical" size={0}>
          <Link to={`/games/${g.id}`}>{g.name}</Link>
          <Text type={scoreMap[g.id] === null ? 'secondary' : 'success'} style={{ fontSize: 12 }}>
            {text.score}: {scoreMap[g.id] === null ? text.noData : scoreMap[g.id].toFixed(1)}
          </Text>
        </Space>
      ),
      dataIndex: `g_${g.id}`,
      key: `g_${g.id}`,
      width: 230
    }))
  ]), [games, text.metric, text.score, text.noData, scoreMap])

  const dataSource = useMemo(() => metricDefs.map(metric => {
    const row = { key: metric.key, metric: metric.label }

    games.forEach(g => {
      const isBest = bestIdMap[metric.key]?.has(g.id)
      const content = metric.display(g)
      row[`g_${g.id}`] = (metric.number && metric.direction && isBest)
        ? (
          <Space size={6} wrap>
            <Text strong style={{ color: '#237804' }}>{content}</Text>
            <Tag color="green">{text.best}</Tag>
          </Space>
        )
        : content
    })

    return row
  }), [metricDefs, games, bestIdMap, text.best])

  return (
    <div>
      <Card title={text.title} style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 12, color: '#666' }}>{text.subtitle}</div>
        <Row gutter={12}>
          <Col flex="auto">
            <Select
              mode="multiple"
              allowClear
              showSearch
              filterOption={false}
              value={selectedIds}
              onSearch={searchGames}
              onChange={handleChange}
              options={options}
              loading={searchLoading}
              placeholder={text.selectPlaceholder}
              style={{ width: '100%' }}
            />
          </Col>
          <Col>
            <Button onClick={() => handleChange([])}>{text.clear}</Button>
          </Col>
        </Row>
      </Card>

      <Card style={{ marginBottom: 16 }} title={text.scoreModelTitle} extra={<Button onClick={() => setWeights({ positive_rate: 30, total_reviews: 15, estimated_owners_num: 15, peak_ccu: 15, average_playtime_forever: 10, price: 15 })}>{text.resetWeights}</Button>}>
        <div style={{ marginBottom: 12, color: '#666' }}>{text.scoreModelDesc}</div>
        <Row gutter={[16, 8]}>
          {scoreMetricConfig.map(item => (
            <Col span={12} key={item.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text>{item.label}</Text>
                <Text strong>{weights[item.key]}</Text>
              </div>
              <Slider
                min={0}
                max={100}
                value={weights[item.key]}
                onChange={(value) => setWeights(prev => ({ ...prev, [item.key]: value }))}
              />
            </Col>
          ))}
        </Row>
        <Text type="secondary">{isZh ? `当前权重总和：${totalWeight}` : `Current weight total: ${totalWeight}`}</Text>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Table
          pagination={false}
          size="small"
          dataSource={rankRows}
          rowKey="key"
          columns={[
            { title: text.rank, dataIndex: 'rank', width: 80 },
            {
              title: text.game,
              dataIndex: 'game',
              render: (g) => <Link to={`/games/${g.id}`}>{g.name}</Link>
            },
            {
              title: text.score,
              dataIndex: 'score',
              width: 140,
              render: (v) => v === null ? <Text type="secondary">{text.scoreUnavailable}</Text> : <Text strong>{v.toFixed(1)}</Text>
            }
          ]}
        />
      </Card>

      <Card>
        {selectedIds.length < 2 ? (
          <div style={{ color: '#999' }}>{text.minSelect}</div>
        ) : (
          <Spin spinning={loading} tip={text.loading}>
            <Table
              columns={columns}
              dataSource={dataSource}
              pagination={false}
              bordered
              scroll={{ x: Math.max(900, games.length * 230 + 180) }}
            />
          </Spin>
        )}
      </Card>
    </div>
  )
}

export default CompareLabPage
