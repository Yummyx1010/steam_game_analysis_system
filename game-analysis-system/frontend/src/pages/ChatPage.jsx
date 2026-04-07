import { useState, useEffect, useRef } from 'react'
import { Card, List, Avatar, Input, Button, Typography, Badge, Spin, Empty } from 'antd'
import { SendOutlined, ArrowLeftOutlined, UserOutlined, MessageOutlined } from '@ant-design/icons'
import { messageApi } from '../api'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

const { Text, Title } = Typography

export default function ChatPage() {
  const { friendId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { isZh } = useLanguage()
  const friendName = location.state?.username || ''

  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [activeFriend, setActiveFriend] = useState(friendId ? parseInt(friendId) : null)
  const messagesEndRef = useRef(null)

  const text = isZh
    ? {
        pageTitle: '私信',
        noConversations: '暂无会话，去好友列表找好友聊天吧',
        back: '返回',
        friend: '好友',
        noMessages: '暂无消息，发条消息开始聊天吧',
        inputPlaceholder: '输入消息...',
        send: '发送'
      }
    : {
        pageTitle: 'Messages',
        noConversations: 'No conversations yet. Start chatting from friends list.',
        back: 'Back',
        friend: 'Friend',
        noMessages: 'No messages yet. Send one to start chatting.',
        inputPlaceholder: 'Type a message...',
        send: 'Send'
      }

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (activeFriend) loadMessages(activeFriend)
  }, [activeFriend])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversations = async () => {
    setLoading(true)
    try {
      const res = await messageApi.getConversations()
      setConversations(res.data)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (fId) => {
    try {
      const res = await messageApi.getMessages(fId, { page: 1, page_size: 100 })
      setMessages(res.data)
      setConversations(prev => prev.map(c => (c.friend_id === fId ? { ...c, unread: 0 } : c)))
    } catch (error) {
      console.error('load messages failed', error)
    }
  }

  const handleSend = async () => {
    const msgText = inputValue.trim()
    if (!msgText || !activeFriend || sending) return

    setInputValue('')
    setSending(true)
    try {
      await messageApi.sendMessage(activeFriend, msgText)
      await loadMessages(activeFriend)
      loadConversations()
    } catch (error) {
      console.error('send failed', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const d = new Date(timeStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const locale = isZh ? 'zh-CN' : 'en-US'
    if (isToday) {
      return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    }
    return `${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`
  }

  const activeConversation = conversations.find(c => c.friend_id === activeFriend)

  if (!activeFriend && !friendId) {
    return (
      <div>
        <Title level={3}><MessageOutlined style={{ marginRight: 8 }} />{text.pageTitle}</Title>
        <Card>
          <Spin spinning={loading}>
            {conversations.length > 0 ? (
              <List
                dataSource={conversations}
                renderItem={conv => (
                  <List.Item style={{ cursor: 'pointer', padding: '16px' }} onClick={() => setActiveFriend(conv.friend_id)}>
                    <List.Item.Meta
                      avatar={<Badge count={conv.unread} size="small" offset={[-4, 32]}><Avatar size={48} icon={<UserOutlined />} src={conv.avatar} /></Badge>}
                      title={<span style={{ fontWeight: 600 }}>{conv.username}</span>}
                      description={
                        <div>
                          <Text ellipsis style={{ maxWidth: 280, display: 'inline-block' }}>{conv.last_message}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>{formatTime(conv.last_time)}</Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : <Empty description={text.noConversations} />}
          </Spin>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => { setActiveFriend(null); navigate('/chat') }}>{text.back}</Button>
      </div>
      <Card bodyStyle={{ padding: 0, height: 580 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar icon={<UserOutlined />} src={activeConversation?.avatar} size={40} />
          <div><Text strong style={{ fontSize: 16 }}>{activeConversation?.username || friendName || text.friend}</Text></div>
        </div>

        <div className="chat-messages" style={{ height: 440 }}>
          {messages.length > 0 ? (
            messages.map(msg => {
              const isSelf = msg.sender_id !== activeFriend
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'row', justifyContent: isSelf ? 'flex-end' : 'flex-start', marginBottom: 16, width: '100%' }}>
                  {!isSelf && <Avatar icon={<UserOutlined />} src={activeConversation?.avatar} size={32} style={{ marginRight: 8, flexShrink: 0 }} />}
                  <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start' }}>
                    <div className={`chat-bubble ${isSelf ? 'chat-bubble-self' : 'chat-bubble-other'}`} style={{ display: 'inline-block' }}>{msg.content}</div>
                    <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>{formatTime(msg.created_at)}</Text>
                  </div>
                </div>
              )
            })
          ) : (
            <div style={{ textAlign: 'center', paddingTop: 100 }}><Empty description={text.noMessages} /></div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <Input.TextArea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={text.inputPlaceholder}
            autoSize={{ minRows: 1, maxRows: 3 }}
            style={{ flex: 1 }}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={handleSend} disabled={!inputValue.trim() || sending} loading={sending} style={{ height: 40 }}>
            {text.send}
          </Button>
        </div>
      </Card>
    </div>
  )
}
