import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, List, Avatar, Button, Input, Select, Space, Modal, Form, message, Empty, Spin, Typography, Pagination } from 'antd'
import { PlusOutlined, LikeOutlined, MessageOutlined, FireOutlined, ClockCircleOutlined, UserOutlined, CommentOutlined } from '@ant-design/icons'
import { postApi } from '../api'
import { useLanguage } from '../context/LanguageContext'

const { TextArea } = Input
const { Title, Paragraph, Text } = Typography

export default function CommunityPage() {
  const { isZh } = useLanguage()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [sortBy, setSortBy] = useState('latest')
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [createForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const text = isZh
    ? {
        loadFailed: '加载帖子失败',
        createSuccess: '发帖成功',
        createFailed: '发帖失败',
        justNow: '刚刚',
        minutesAgo: (v) => `${v}分钟前`,
        hoursAgo: (v) => `${v}小时前`,
        daysAgo: (v) => `${v}天前`,
        title: '游戏社区',
        latest: '最新发布',
        hottest: '最热讨论',
        post: '发帖',
        noPost: '暂无帖子，来发第一篇吧！',
        totalPosts: (v) => `共 ${v} 篇帖子`,
        publishPost: '发布帖子',
        inputTitle: '请输入标题',
        maxTitle: '标题不超过200字',
        titlePlaceholder: '标题（一句话描述你的帖子）',
        gameIdPlaceholder: '关联游戏ID（可选，填入游戏数字ID）',
        inputContent: '请输入内容',
        contentPlaceholder: '分享你的游戏体验、攻略、见解...',
        cancel: '取消',
        publish: '发布'
      }
    : {
        loadFailed: 'Failed to load posts',
        createSuccess: 'Post published',
        createFailed: 'Failed to publish post',
        justNow: 'just now',
        minutesAgo: (v) => `${v}m ago`,
        hoursAgo: (v) => `${v}h ago`,
        daysAgo: (v) => `${v}d ago`,
        title: 'Game Community',
        latest: 'Latest',
        hottest: 'Hottest',
        post: 'Post',
        noPost: 'No posts yet. Be the first to post!',
        totalPosts: (v) => `Total ${v} posts`,
        publishPost: 'Create Post',
        inputTitle: 'Please enter title',
        maxTitle: 'Title cannot exceed 200 characters',
        titlePlaceholder: 'Title (one-line summary of your post)',
        gameIdPlaceholder: 'Related game ID (optional, numeric)',
        inputContent: 'Please enter content',
        contentPlaceholder: 'Share your experience, guides, or thoughts...',
        cancel: 'Cancel',
        publish: 'Publish'
      }

  useEffect(() => {
    loadPosts()
  }, [pagination.current, sortBy])

  const loadPosts = async () => {
    setLoading(true)
    try {
      const res = await postApi.getPosts({
        page: pagination.current,
        page_size: pagination.pageSize,
        sort_by: sortBy
      })
      setPosts(res.data.posts || [])
      setPagination(prev => ({ ...prev, total: res.data.total }))
    } catch (error) {
      message.error(text.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async (values) => {
    setSubmitting(true)
    try {
      await postApi.createPost({
        title: values.title,
        content: values.content,
        game_id: values.game_id || null
      })
      message.success(text.createSuccess)
      setCreateModalVisible(false)
      createForm.resetFields()
      setPagination(prev => ({ ...prev, current: 1 }))
      loadPosts()
    } catch (error) {
      message.error(error.response?.data?.error || text.createFailed)
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now - date
    if (diff < 60000) return text.justNow
    if (diff < 3600000) return text.minutesAgo(Math.floor(diff / 60000))
    if (diff < 86400000) return text.hoursAgo(Math.floor(diff / 3600000))
    if (diff < 604800000) return text.daysAgo(Math.floor(diff / 86400000))
    return timeStr.split('T')[0]
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          <CommentOutlined style={{ marginRight: 8 }} />
          {text.title}
        </Title>
        <Space>
          <Select
            value={sortBy}
            onChange={setSortBy}
            style={{ width: 160 }}
            options={[
              { label: <span><ClockCircleOutlined /> {text.latest}</span>, value: 'latest' },
              { label: <span><FireOutlined /> {text.hottest}</span>, value: 'hottest' }
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
            {text.post}
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        {posts.length > 0 ? (
          <List
            itemLayout="vertical"
            dataSource={posts}
            renderItem={post => (
              <List.Item
                key={post.id}
                actions={[
                  <Space key="like"><LikeOutlined /> {post.like_count || 0}</Space>,
                  <Space key="comment"><MessageOutlined /> {post.comment_count || 0}</Space>
                ]}
                extra={
                  post.game ? (
                    <Link to={`/games/${post.game.id}`} style={{ textDecoration: 'none' }}>
                      <Card
                        size="small"
                        hoverable
                        cover={<img alt={post.game.name} src={post.game.header_image} style={{ height: 90, objectFit: 'cover' }} onError={(e) => (e.target.style.display = 'none')} />}
                        bodyStyle={{ padding: '8px 12px' }}
                      >
                        <Text ellipsis style={{ fontSize: 12 }}>{post.game.name}</Text>
                      </Card>
                    </Link>
                  ) : null
                }
              >
                <List.Item.Meta
                  avatar={<Link to={`/community/${post.id}`}><Avatar icon={<UserOutlined />} src={post.author?.avatar} /></Link>}
                  title={<Link to={`/community/${post.id}`} style={{ fontSize: 16, fontWeight: 600 }}>{post.title}</Link>}
                  description={
                    <Space>
                      <Text type="secondary">{post.author?.username}</Text>
                      <Text type="secondary">{formatTime(post.created_at)}</Text>
                    </Space>
                  }
                />
                <Paragraph ellipsis={{ rows: 2, expandable: false }} style={{ color: '#555', marginBottom: 0 }}>
                  {post.content}
                </Paragraph>
              </List.Item>
            )}
          />
        ) : (
          <Card><Empty description={text.noPost} /></Card>
        )}
      </Spin>

      {pagination.total > pagination.pageSize && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onChange={(page) => setPagination(prev => ({ ...prev, current: page }))}
            showTotal={(total) => text.totalPosts(total)}
          />
        </div>
      )}

      <Modal
        title={text.publishPost}
        open={createModalVisible}
        onCancel={() => { setCreateModalVisible(false); createForm.resetFields() }}
        footer={null}
        width={600}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreatePost}>
          <Form.Item name="title" rules={[{ required: true, message: text.inputTitle }, { max: 200, message: text.maxTitle }]}>
            <Input placeholder={text.titlePlaceholder} size="large" />
          </Form.Item>
          <Form.Item name="game_id">
            <Input placeholder={text.gameIdPlaceholder} />
          </Form.Item>
          <Form.Item name="content" rules={[{ required: true, message: text.inputContent }]}>
            <TextArea rows={6} placeholder={text.contentPlaceholder} showCount maxLength={5000} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setCreateModalVisible(false); createForm.resetFields() }}>{text.cancel}</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>{text.publish}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
