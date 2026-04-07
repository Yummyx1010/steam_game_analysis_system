import { useState, useRef, useEffect } from 'react'
import { Button, Input, Avatar, Space, Typography, Spin } from 'antd'
import { RobotOutlined, CloseOutlined, SendOutlined, UserOutlined } from '@ant-design/icons'
import { aiApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

const { Text } = Typography

const WELCOME_ZH = '你好！我是Steam游戏分析系统的AI助手。我可以帮你：\n- 推荐适合你的游戏\n- 解读游戏数据\n- 提供游戏选择建议\n\n请问有什么可以帮你的？'
const WELCOME_EN = 'Hi! I am the AI assistant of Steam Game Analytics. I can help you with:\n- Recommending games for you\n- Explaining game data\n- Giving game selection suggestions\n\nHow can I help you today?'

export default function AIAssistant() {
  const { user } = useAuth()
  const { isZh, language } = useLanguage()

  const [visible, setVisible] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: isZh ? WELCOME_ZH : WELCOME_EN }
  ])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const text = isZh
    ? {
        aiTitle: 'AI 游戏助手',
        thinking: '正在思考...',
        placeholder: '问我任何游戏相关的问题...',
        error: 'AI服务暂时不可用，请稍后重试',
        sorry: '抱歉，',
        fabTitle: 'AI助手'
      }
    : {
        aiTitle: 'AI Game Assistant',
        thinking: 'Thinking...',
        placeholder: 'Ask me anything about games...',
        error: 'AI service is temporarily unavailable. Please try again later.',
        sorry: 'Sorry, ',
        fabTitle: 'AI Assistant'
      }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus()
    }
  }, [visible])

  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [{ role: 'assistant', content: isZh ? WELCOME_ZH : WELCOME_EN }]
      }
      return prev
    })
  }, [isZh])

  const handleSend = async () => {
    const textValue = inputValue.trim()
    if (!textValue || loading) return

    setInputValue('')
    setMessages(prev => [...prev, { role: 'user', content: textValue }])
    setLoading(true)

    try {
      const res = await aiApi.chat(textValue, language)

      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch (error) {
      const errMsg = error.response?.data?.error || text.error
      setMessages(prev => [...prev, { role: 'assistant', content: `${text.sorry}${errMsg}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!visible) {
    return (
      <div
        className="ai-assistant-fab"
        onClick={() => setVisible(true)}
        title={text.fabTitle}
      >
        <RobotOutlined style={{ fontSize: 24 }} />
      </div>
    )
  }

  return (
    <div className="ai-assistant-panel">
      <div className="ai-assistant-header">
        <Space>
          <RobotOutlined style={{ color: '#d1fae5', fontSize: 18 }} />
          <Text strong style={{ color: '#fff', fontSize: 15 }}>{text.aiTitle}</Text>
        </Space>
        <CloseOutlined
          className="ai-assistant-close"
          onClick={() => setVisible(false)}
        />
      </div>

      <div className="ai-assistant-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`ai-message ai-message-${msg.role}`}>
            <Avatar
              size={28}
              icon={msg.role === 'assistant' ? <RobotOutlined /> : <UserOutlined />}
              style={{
                backgroundColor: msg.role === 'assistant' ? '#10b981' : '#f59e0b',
                flexShrink: 0
              }}
            />
            <div className="ai-message-content">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="ai-message ai-message-assistant">
            <Avatar size={28} icon={<RobotOutlined />} style={{ backgroundColor: '#10b981', flexShrink: 0 }} />
            <div className="ai-message-content ai-typing">
              <Spin size="small" /> {text.thinking}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-assistant-input">
        <Input.TextArea
          ref={inputRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={text.placeholder}
          autoSize={{ minRows: 1, maxRows: 3 }}
          style={{ flex: 1 }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          disabled={!inputValue.trim() || loading}
          loading={loading}
        />
      </div>
    </div>
  )
}
