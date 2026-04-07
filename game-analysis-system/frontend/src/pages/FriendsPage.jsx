import { useState, useEffect } from 'react'
import { Card, List, Avatar, Button, Input, Typography, message, Tabs, Badge, Popconfirm, Empty, Spin } from 'antd'
import { UserAddOutlined, UserOutlined, CheckOutlined, CloseOutlined, DeleteOutlined, SearchOutlined, MessageOutlined } from '@ant-design/icons'
import { friendApi } from '../api'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

const { Title, Text } = Typography

export default function FriendsPage() {
  const navigate = useNavigate()
  const { isZh } = useLanguage()
  const [friends, setFriends] = useState([])
  const [received, setReceived] = useState([])
  const [sent, setSent] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('friends')

  const text = isZh
    ? {
        loadFailed: '加载好友数据失败',
        searchFailed: '搜索失败',
        requestSent: '好友请求已发送',
        sendFailed: '发送失败',
        accepted: '已接受好友请求',
        rejected: '已拒绝',
        removed: '已删除好友',
        actionFailed: '操作失败',
        myFriends: '我的好友',
        chat: '私信',
        remove: '删除',
        removeConfirm: '确定删除该好友？',
        confirm: '确定',
        cancel: '取消',
        addedAt: '添加时间',
        noFriends: '暂无好友，去搜索添加吧',
        receivedRequests: '收到的请求',
        accept: '接受',
        reject: '拒绝',
        requestTime: '请求时间',
        noRequests: '暂无好友请求',
        sentRequests: '发出的请求',
        waiting: '等待对方确认...',
        noSent: '暂无发出的请求',
        addFriend: '添加好友',
        searchPlaceholder: '输入用户名或邮箱搜索',
        search: '搜索',
        add: '添加好友',
        notFound: '未找到用户',
        inputTip: '输入关键词搜索用户',
        pageTitle: '好友管理'
      }
    : {
        loadFailed: 'Failed to load friend data',
        searchFailed: 'Search failed',
        requestSent: 'Friend request sent',
        sendFailed: 'Failed to send request',
        accepted: 'Friend request accepted',
        rejected: 'Request rejected',
        removed: 'Friend removed',
        actionFailed: 'Operation failed',
        myFriends: 'My Friends',
        chat: 'Message',
        remove: 'Remove',
        removeConfirm: 'Remove this friend?',
        confirm: 'OK',
        cancel: 'Cancel',
        addedAt: 'Added at',
        noFriends: 'No friends yet. Search and add some!',
        receivedRequests: 'Received Requests',
        accept: 'Accept',
        reject: 'Reject',
        requestTime: 'Requested at',
        noRequests: 'No friend requests',
        sentRequests: 'Sent Requests',
        waiting: 'Waiting for confirmation...',
        noSent: 'No sent requests',
        addFriend: 'Add Friend',
        searchPlaceholder: 'Search by username or email',
        search: 'Search',
        add: 'Add',
        notFound: 'No user found',
        inputTip: 'Enter keywords to search users',
        pageTitle: 'Friend Management'
      }

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        friendApi.getFriends(),
        friendApi.getFriendRequests()
      ])
      setFriends(friendsRes.data)
      setReceived(requestsRes.data.received || [])
      setSent(requestsRes.data.sent || [])
    } catch (error) {
      message.error(text.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (value) => {
    setSearchKeyword(value)
    if (!value.trim()) {
      setSearchResults([])
      return
    }
    try {
      const res = await friendApi.searchUsers(value.trim())
      setSearchResults(res.data)
    } catch (error) {
      message.error(text.searchFailed)
    }
  }

  const handleSendRequest = async (friendId) => {
    try {
      await friendApi.sendRequest(friendId)
      message.success(text.requestSent)
      handleSearch(searchKeyword)
    } catch (error) {
      message.error(error.response?.data?.error || text.sendFailed)
    }
  }

  const handleAccept = async (requestId) => {
    try {
      await friendApi.acceptRequest(requestId)
      message.success(text.accepted)
      loadAll()
    } catch (error) {
      message.error(text.actionFailed)
    }
  }

  const handleReject = async (requestId) => {
    try {
      await friendApi.rejectRequest(requestId)
      message.success(text.rejected)
      loadAll()
    } catch (error) {
      message.error(text.actionFailed)
    }
  }

  const handleRemove = async (friendId) => {
    try {
      await friendApi.removeFriend(friendId)
      message.success(text.removed)
      loadAll()
    } catch (error) {
      message.error(text.actionFailed)
    }
  }

  const formatTime = (timeStr) => (timeStr ? timeStr.split('T')[0] : '')

  const tabItems = [
    {
      key: 'friends',
      label: <span>{text.myFriends} {friends.length > 0 && `(${friends.length})`}</span>,
      children: (
        <Spin spinning={loading}>
          {friends.length > 0 ? (
            <List
              dataSource={friends}
              renderItem={item => (
                <List.Item
                  actions={[
                    <Button type="link" icon={<MessageOutlined />} onClick={() => navigate(`/chat/${item.friend_id}`, { state: { username: item.username } })}>
                      {text.chat}
                    </Button>,
                    <Popconfirm title={text.removeConfirm} onConfirm={() => handleRemove(item.friend_id)} okText={text.confirm} cancelText={text.cancel}>
                      <Button type="link" danger icon={<DeleteOutlined />}>{text.remove}</Button>
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} src={item.avatar} />}
                    title={item.username}
                    description={`${text.addedAt}: ${formatTime(item.created_at)}`}
                  />
                </List.Item>
              )}
            />
          ) : <Card><Empty description={text.noFriends} /></Card>}
        </Spin>
      )
    },
    {
      key: 'received',
      label: <span>{text.receivedRequests} {received.length > 0 && <Badge count={received.length} size="small" style={{ marginLeft: 4 }} />}</span>,
      children: received.length > 0 ? (
        <List
          dataSource={received}
          renderItem={item => (
            <List.Item actions={[
              <Button type="primary" icon={<CheckOutlined />} onClick={() => handleAccept(item.id)}>{text.accept}</Button>,
              <Button icon={<CloseOutlined />} onClick={() => handleReject(item.id)}>{text.reject}</Button>
            ]}>
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} src={item.avatar} />}
                title={item.username}
                description={`${text.requestTime}: ${formatTime(item.created_at)}`}
              />
            </List.Item>
          )}
        />
      ) : <Card><Empty description={text.noRequests} /></Card>
    },
    {
      key: 'sent',
      label: <span>{text.sentRequests} {sent.length > 0 && `(${sent.length})`}</span>,
      children: sent.length > 0 ? (
        <List
          dataSource={sent}
          renderItem={item => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} src={item.avatar} />}
                title={item.username}
                description={<Text type="secondary">{text.waiting}</Text>}
              />
            </List.Item>
          )}
        />
      ) : <Card><Empty description={text.noSent} /></Card>
    },
    {
      key: 'search',
      label: <span><SearchOutlined /> {text.addFriend}</span>,
      children: (
        <div>
          <Input.Search
            placeholder={text.searchPlaceholder}
            allowClear
            enterButton={text.search}
            size="large"
            onSearch={handleSearch}
            onChange={e => { if (!e.target.value) setSearchResults([]) }}
            style={{ marginBottom: 16 }}
          />
          {searchResults.length > 0 ? (
            <List
              dataSource={searchResults}
              renderItem={item => (
                <List.Item actions={[
                  <Button type="primary" icon={<UserAddOutlined />} onClick={() => handleSendRequest(item.id)}>{text.add}</Button>
                ]}>
                  <List.Item.Meta avatar={<Avatar icon={<UserOutlined />} src={item.avatar} />} title={item.username} />
                </List.Item>
              )}
            />
          ) : searchKeyword ? <Card><Empty description={text.notFound} /></Card> : <Card><Empty description={text.inputTip} /></Card>}
        </div>
      )
    }
  ]

  return (
    <div>
      <Title level={3}><UserOutlined style={{ marginRight: 8 }} />{text.pageTitle}</Title>
      <Card><Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} /></Card>
    </div>
  )
}
