import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Card, Row, Col, Input, Select, Button, Table, Tag, Pagination, Spin, Space } from 'antd'
import { SearchOutlined, ReloadOutlined, ExperimentOutlined } from '@ant-design/icons'

import { gameApi } from '../api'
import { useLanguage } from '../context/LanguageContext'

const { Search } = Input

function GameListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const [games, setGames] = useState([])
  const [total, setTotal] = useState(0)
  const [genres, setGenres] = useState([])
  const [tags, setTags] = useState([])
  const [years, setYears] = useState([])
  const { isZh } = useLanguage()

  const text = isZh
    ? {
        cover: '封面',
        gameName: '游戏名称',
        releaseDate: '发行日期',
        price: '价格',
        free: '免费',
        positiveRate: '好评率',
        reviews: '评价数',
        genre: '类型',
        platform: '平台',
        filterTitle: '筛选条件',
        searchGame: '搜索游戏名称',
        search: '搜索',
        tag: '标签',
        year: '发行年份',
        priceType: '价格类型',
        freeGame: '免费游戏',
        paidGame: '付费游戏',
        reset: '重置',
        compareLab: '对比实验室',
        totalGames: (v) => `共 ${v} 款游戏`

      }
    : {
        cover: 'Cover',
        gameName: 'Game',
        releaseDate: 'Release Date',
        price: 'Price',
        free: 'Free',
        positiveRate: 'Positive Rate',
        reviews: 'Reviews',
        genre: 'Genre',
        platform: 'Platform',
        filterTitle: 'Filters',
        searchGame: 'Search game name',
        search: 'Search',
        tag: 'Tag',
        year: 'Release Year',
        priceType: 'Price Type',
        freeGame: 'Free Games',
        paidGame: 'Paid Games',
        reset: 'Reset',
        compareLab: 'Compare Lab',
        totalGames: (v) => `Total ${v} games`

      }

  const [filters, setFilters] = useState({
    page: parseInt(searchParams.get('page') || '1'),
    page_size: 20,
    search: searchParams.get('search') || '',
    genre: searchParams.get('genre') || '',
    tag: searchParams.get('tag') || '',
    year: searchParams.get('year') || '',
    is_free: searchParams.get('is_free') || '',
    sort_by: searchParams.get('sort_by') || 'release_date',
    sort_order: searchParams.get('sort_order') || 'desc'
  })

  useEffect(() => {
    fetchFilters()
    fetchGames()
  }, [filters])

  const fetchFilters = async () => {
    const [genresRes, tagsRes, yearsRes] = await Promise.all([
      gameApi.getGenres(),
      gameApi.getTags(100),
      gameApi.getYears()
    ])
    setGenres(genresRes.data)
    setTags(tagsRes.data)
    setYears(yearsRes.data)
  }

  const fetchGames = async () => {
    setLoading(true)
    try {
      const params = { ...filters }
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) {
          delete params[key]
        }
      })
      const res = await gameApi.getGames(params)
      setGames(res.data.games)
      setTotal(res.data.total)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value) => {
    const newFilters = { ...filters, search: value, page: 1 }
    setFilters(newFilters)
    updateUrl(newFilters)
  }

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value, page: 1 }
    setFilters(newFilters)
    updateUrl(newFilters)
  }

  const handlePageChange = (page) => {
    const newFilters = { ...filters, page }
    setFilters(newFilters)
    updateUrl(newFilters)
  }

  const handleReset = () => {
    const newFilters = {
      page: 1,
      page_size: 20,
      search: '',
      genre: '',
      tag: '',
      year: '',
      is_free: '',
      sort_by: 'release_date',
      sort_order: 'desc'
    }
    setFilters(newFilters)
    updateUrl(newFilters)
  }

  const updateUrl = (params) => {
    const urlParams = new URLSearchParams()
    Object.keys(params).forEach(key => {
      if (params[key] !== '' && params[key] !== null) {
        urlParams.set(key, params[key])
      }
    })
    setSearchParams(urlParams)
  }

  const columns = [
    {
      title: text.cover,
      dataIndex: 'header_image',
      key: 'header_image',
      width: 120,
      render: (url, record) => (
        <Link to={`/games/${record.id}`}>
          <img
            src={url || 'https://via.placeholder.com/120x45'}
            alt={record.name}
            style={{ width: 120, height: 45, objectFit: 'cover', borderRadius: 4 }}
          />
        </Link>
      )
    },
    {
      title: text.gameName,
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (name, record) => <Link to={`/games/${record.id}`}>{name}</Link>
    },
    {
      title: text.releaseDate,
      dataIndex: 'release_date',
      key: 'release_date',
      width: 110
    },
    {
      title: text.price,
      dataIndex: 'price',
      key: 'price',
      width: 80,
      render: (price, record) => record.is_free ? <Tag color="green">{text.free}</Tag> : `$${price}`
    },
    {
      title: text.positiveRate,
      dataIndex: 'positive_rate',
      key: 'positive_rate',
      width: 90,
      render: (rate) => (
        <span style={{ color: rate >= 80 ? '#52c41a' : rate >= 60 ? '#faad14' : '#ff4d4f' }}>
          {rate?.toFixed(1)}%
        </span>
      )
    },
    {
      title: text.reviews,
      dataIndex: 'total_reviews',
      key: 'total_reviews',
      width: 90,
      sorter: true
    },
    {
      title: text.genre,
      dataIndex: 'genres',
      key: 'genres',
      width: 150,
      render: (genres) => (
        <>
          {genres?.slice(0, 2).map(g => <Tag key={g}>{g}</Tag>)}
          {genres?.length > 2 && <span>+{genres.length - 2}</span>}
        </>
      )
    },
    {
      title: text.platform,
      key: 'platforms',
      width: 100,
      render: (_, record) => (
        <Space>
          {record.windows && <Tag color="blue">Win</Tag>}
          {record.mac && <Tag color="purple">Mac</Tag>}
          {record.linux && <Tag color="orange">Linux</Tag>}
        </Space>
      )
    }
  ]

  return (
    <div>
      <Card
        title={text.filterTitle}
        style={{ marginBottom: 16 }}
        extra={(
          <Button type="primary" icon={<ExperimentOutlined />} onClick={() => navigate('/games/compare')}>
            {text.compareLab}
          </Button>
        )}
      >

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Search
              placeholder={text.searchGame}
              allowClear
              enterButton={<><SearchOutlined /> {text.search}</>}
              size="large"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onSearch={handleSearch}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder={text.genre}
              allowClear
              style={{ width: '100%' }}
              value={filters.genre || undefined}
              onChange={(v) => handleFilterChange('genre', v || '')}
              options={genres.map(g => ({ label: `${g.name} (${g.game_count})`, value: g.name }))}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder={text.tag}
              allowClear
              showSearch
              style={{ width: '100%' }}
              value={filters.tag || undefined}
              onChange={(v) => handleFilterChange('tag', v || '')}
              options={tags.map(t => ({ label: `${t.name} (${t.game_count})`, value: t.name }))}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder={text.year}
              allowClear
              style={{ width: '100%' }}
              value={filters.year ? parseInt(filters.year) : undefined}
              onChange={(v) => handleFilterChange('year', v || '')}
              options={years.map(y => ({ label: y, value: y }))}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder={text.priceType}
              allowClear
              style={{ width: '100%' }}
              value={filters.is_free || undefined}
              onChange={(v) => handleFilterChange('is_free', v || '')}
              options={[
                { label: text.freeGame, value: 1 },
                { label: text.paidGame, value: 0 }
              ]}
            />
          </Col>
          <Col span={4}>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>{text.reset}</Button>
          </Col>
        </Row>
      </Card>

      <Card>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={games}
            rowKey="id"
            pagination={false}
            size="middle"
          />
          <Pagination
            current={filters.page}
            pageSize={filters.page_size}
            total={total}
            onChange={handlePageChange}
            showSizeChanger={false}
            showTotal={(v) => text.totalGames(v)}
            style={{ marginTop: 16, textAlign: 'right' }}
          />
        </Spin>
      </Card>
    </div>
  )
}

export default GameListPage
