import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Card, Avatar, Button, Input, Space, Typography, Tag, message, Spin, Divider, Popconfirm, Empty } from 'antd'
import { ArrowLeftOutlined, LikeOutlined, LikeFilled, MessageOutlined, UserOutlined, DeleteOutlined, SendOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { postApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

const { Title, Text } = Typography
const { TextArea } = Input

export default function PostDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isZh } = useLanguage()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [replyTexts, setReplyTexts] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const text = isZh
    ? {
        postLoadFailed: '帖子不存在或加载失败',
        loginFirst: '请先登录',
        actionFailed: '操作失败',
        inputComment: '请输入评论内容',
        commentSuccess: '评论成功',
        commentFailed: '评论失败',
        inputReply: '请输入回复内容',
        replySuccess: '回复成功',
        replyFailed: '回复失败',
        deleteSuccess: '删除成功',
        deleteFailed: '删除失败',
        justNow: '刚刚',
        minutesAgo: (v) => `${v}分钟前`,
        hoursAgo: (v) => `${v}小时前`,
        daysAgo: (v) => `${v}天前`,
        postNotFound: '帖子不存在',
        backCommunity: '返回社区',
        relatedGame: '关联游戏',
        deleteConfirm: '确定删除这篇帖子吗？',
        confirm: '确定',
        cancel: '取消',
        delete: '删除',
        likeUnit: '赞',
        commentUnit: '评论',
        commentTitle: (v) => `评论 (${v})`,
        commentPlaceholder: '写下你的评论...',
        publishComment: '发表评论',
        noComment: '暂无评论，来说两句吧~',
        reply: '回复',
        replyPlaceholder: '写回复...'
      }
    : {
        postLoadFailed: 'Post not found or failed to load',
        loginFirst: 'Please log in first',
        actionFailed: 'Operation failed',
        inputComment: 'Please enter a comment',
        commentSuccess: 'Comment posted',
        commentFailed: 'Failed to post comment',
        inputReply: 'Please enter a reply',
        replySuccess: 'Reply posted',
        replyFailed: 'Failed to post reply',
        deleteSuccess: 'Deleted successfully',
        deleteFailed: 'Failed to delete',
        justNow: 'just now',
        minutesAgo: (v) => `${v}m ago`,
        hoursAgo: (v) => `${v}h ago`,
        daysAgo: (v) => `${v}d ago`,
        postNotFound: 'Post not found',
        backCommunity: 'Back to Community',
        relatedGame: 'Related Game',
        deleteConfirm: 'Delete this post?',
        confirm: 'OK',
        cancel: 'Cancel',
        delete: 'Delete',
        likeUnit: 'likes',
        commentUnit: 'comments',
        commentTitle: (v) => `Comments (${v})`,
        commentPlaceholder: 'Write your comment...',
        publishComment: 'Post Comment',
        noComment: 'No comments yet. Be the first!',
        reply: 'Reply',
        replyPlaceholder: 'Write a reply...'
      }

  useEffect(() => {
    loadPost()
  }, [id])

  const loadPost = async () => {
    setLoading(true)
    try {
      const res = await postApi.getPostDetail(id)
      setPost(res.data)
      try {
        const likeRes = await postApi.checkLike(id)
        setLiked(likeRes.data.liked)
      } catch (e) {}
    } catch (error) {
      message.error(text.postLoadFailed)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleLike = async () => {
    if (!user) {
      message.warning(text.loginFirst)
      return
    }
    try {
      const res = await postApi.toggleLike(id)
      setLiked(res.data.liked)
      setPost(prev => ({
        ...prev,
        like_count: res.data.liked ? prev.like_count + 1 : Math.max(0, prev.like_count - 1)
      }))
    } catch (error) {
      message.error(text.actionFailed)
    }
  }

  const handleComment = async () => {
    if (!user) { message.warning(text.loginFirst); return }
    if (!commentText.trim()) { message.warning(text.inputComment); return }
    setSubmitting(true)
    try {
      await postApi.createComment(id, { content: commentText.trim() })
      message.success(text.commentSuccess)
      setCommentText('')
      loadPost()
    } catch (error) {
      message.error(error.response?.data?.error || text.commentFailed)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReply = async (commentId) => {
    if (!user) { message.warning(text.loginFirst); return }
    const replyValue = replyTexts[commentId]
    if (!replyValue?.trim()) { message.warning(text.inputReply); return }
    setSubmitting(true)
    try {
      await postApi.createComment(id, { content: replyValue.trim(), parent_id: commentId })
      message.success(text.replySuccess)
      setReplyTexts(prev => ({ ...prev, [commentId]: '' }))
      loadPost()
    } catch (error) {
      message.error(error.response?.data?.error || text.replyFailed)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await postApi.deletePost(id)
      message.success(text.deleteSuccess)
      navigate('/community')
    } catch (error) {
      message.error(error.response?.data?.error || text.deleteFailed)
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

  const renderComment = (comment, isReply = false) => (
    <div key={comment.id} style={{ padding: '12px 0', borderBottom: isReply ? 'none' : '1px solid #f0f0f0' }}>
      <Space align="start" style={{ width: '100%' }}>
        <Avatar size={isReply ? 28 : 36} icon={<UserOutlined />} src={comment.author?.avatar} />
        <div style={{ flex: 1 }}>
          <Space style={{ marginBottom: 4 }}>
            <Text strong>{comment.author?.username}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{formatTime(comment.created_at)}</Text>
          </Space>
          <div style={{ color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{comment.content}</div>
          {!isReply && (
            <Button
              type="link"
              size="small"
              style={{ padding: 0, marginTop: 4 }}
              onClick={() => setReplyTexts(prev => ({ ...prev, [comment.id]: prev[comment.id] || '' }))}
            >
              {text.reply}
            </Button>
          )}
          {replyTexts[comment.id] !== undefined && (
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <Input
                size="small"
                placeholder={text.replyPlaceholder}
                value={replyTexts[comment.id]}
                onChange={e => setReplyTexts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                onPressEnter={() => handleReply(comment.id)}
                style={{ flex: 1 }}
              />
              <Button size="small" type="primary" icon={<SendOutlined />} loading={submitting} onClick={() => handleReply(comment.id)}>
                {text.reply}
              </Button>
            </div>
          )}
          {comment.replies?.length > 0 && (
            <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: '2px solid #f0f0f0' }}>
              {comment.replies.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </Space>
    </div>
  )

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />

  if (!post) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Empty description={text.postNotFound} />
        <Button type="primary" onClick={() => navigate('/community')} style={{ marginTop: 16 }}>{text.backCommunity}</Button>
      </div>
    )
  }

  return (
    <div>
      <Link to="/community">
        <Button icon={<ArrowLeftOutlined />} style={{ marginBottom: 16 }}>{text.backCommunity}</Button>
      </Link>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Title level={2} style={{ marginBottom: 12 }}>{post.title}</Title>
            <Space style={{ marginBottom: 16 }}>
              <Avatar icon={<UserOutlined />} src={post.author?.avatar} />
              <div>
                <Text strong>{post.author?.username}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}><ClockCircleOutlined /> {formatTime(post.created_at)}</Text>
              </div>
            </Space>
            {post.game && (
              <Link to={`/games/${post.game.id}`} style={{ textDecoration: 'none' }}>
                <Tag color="blue" style={{ fontSize: 13, padding: '2px 10px' }}>
                  {text.relatedGame}: {post.game.name}
                </Tag>
              </Link>
            )}
          </div>
          {user && user.id === post.author?.id && (
            <Popconfirm title={text.deleteConfirm} onConfirm={handleDelete} okText={text.confirm} cancelText={text.cancel}>
              <Button type="text" danger icon={<DeleteOutlined />}>{text.delete}</Button>
            </Popconfirm>
          )}
        </div>

        <Divider style={{ margin: '16px 0' }} />

        <div style={{ fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#333', marginBottom: 24 }}>
          {post.content}
        </div>

        <Space size="large">
          <Button type={liked ? 'primary' : 'default'} icon={liked ? <LikeFilled /> : <LikeOutlined />} onClick={handleToggleLike}>
            {post.like_count || 0} {text.likeUnit}
          </Button>
          <Space>
            <MessageOutlined />
            <span>{post.comment_count || 0} {text.commentUnit}</span>
          </Space>
        </Space>

        <Divider style={{ margin: '16px 0' }} />

        <Title level={5}>{text.commentTitle(post.comments?.length || 0)}</Title>

        {user && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <Avatar icon={<UserOutlined />} src={user.avatar} />
            <div style={{ flex: 1 }}>
              <TextArea
                rows={3}
                placeholder={text.commentPlaceholder}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                maxLength={1000}
                showCount
              />
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <Button type="primary" icon={<SendOutlined />} loading={submitting} onClick={handleComment} disabled={!commentText.trim()}>
                  {text.publishComment}
                </Button>
              </div>
            </div>
          </div>
        )}

        {post.comments?.length > 0 ? post.comments.map(comment => renderComment(comment)) : <Empty description={text.noComment} />}
      </Card>
    </div>
  )
}
