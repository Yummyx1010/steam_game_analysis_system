import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截器 - 添加token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

export const gameApi = {
  // 获取游戏列表
  getGames: (params) => api.get('/games', { params }),
  
  // 获取游戏详情
  getGame: (id) => api.get(`/games/${id}`),
  
  // 获取标签列表
  getTags: (limit = 50) => api.get('/tags', { params: { limit } }),
  
  // 获取类型列表
  getGenres: () => api.get('/genres'),
  
  // 获取统计数据
  getStatistics: () => api.get('/statistics'),
  
  // 获取年份列表
  getYears: () => api.get('/years')
}

export const authApi = {
  // 用户注册
  register: (data) => api.post('/auth/register', data),
  
  // 用户登录
  login: (data) => api.post('/auth/login', data),
  
  // 获取当前用户信息
  getCurrentUser: () => api.get('/auth/me')
}

export const favoriteApi = {
  // 获取收藏列表
  getFavorites: (params) => api.get('/favorites', { params }),
  
  // 添加收藏
  addFavorite: (gameId) => api.post(`/favorites/${gameId}`),
  
  // 取消收藏
  removeFavorite: (gameId) => api.delete(`/favorites/${gameId}`),
  
  // 检查是否收藏
  checkFavorite: (gameId) => api.get(`/favorites/check/${gameId}`)
}

export const ratingApi = {
  // 获取用户评分列表
  getUserRatings: () => api.get('/ratings'),
  
  // 评分游戏
  rateGame: (gameId, rating) => api.post(`/ratings/${gameId}`, { rating }),
  
  // 获取游戏评分
  getGameRating: (gameId) => api.get(`/ratings/${gameId}`)
}

export const recommendationApi = {
  // 综合推荐
  getRecommendations: () => api.get('/recommendations'),
  
  // 基于内容的推荐（相似游戏）
  getContentBased: (gameId) => api.get(`/recommendations/content-based/${gameId}`)
}

export const statisticsApi = {
  // 基础统计
  getBasic: () => api.get('/statistics'),
  
  // 价格统计
  getPrice: () => api.get('/statistics/price'),
  
  // 评分统计
  getScore: () => api.get('/statistics/score'),
  
  // 开发商统计
  getDevelopers: (limit = 20) => api.get('/statistics/developers', { params: { limit } }),
  
  // 平台统计
  getPlatform: () => api.get('/statistics/platform'),
  
  // 月度统计
  getMonthly: (year) => api.get('/statistics/monthly', { params: { year } }),
  
  // 个人数据统计
  getPersonal: () => api.get('/statistics/personal')
}

export const postApi = {
  // 获取帖子列表
  getPosts: (params) => api.get('/posts', { params }),
  
  // 获取帖子详情
  getPostDetail: (postId) => api.get(`/posts/${postId}`),
  
  // 创建帖子
  createPost: (data) => api.post('/posts', data),
  
  // 删除帖子
  deletePost: (postId) => api.delete(`/posts/${postId}`),
  
  // 评论帖子
  createComment: (postId, data) => api.post(`/posts/${postId}/comments`, data),
  
  // 点赞/取消点赞
  toggleLike: (postId) => api.post(`/posts/${postId}/like`),
  
  // 检查是否已点赞
  checkLike: (postId) => api.get(`/posts/${postId}/like`),
  
  // 获取当前用户的帖子
  getUserPosts: (params) => api.get('/posts/user', { params })
}

export const aiApi = {
  // AI聊天
  chat: (message, language) => api.post('/ai/chat', { message, language })
}


export const friendApi = {
  // 获取好友列表
  getFriends: () => api.get('/friends'),
  // 获取好友请求
  getFriendRequests: () => api.get('/friends/requests'),
  // 发送好友请求
  sendRequest: (friendId) => api.post('/friends/request', { friend_id: friendId }),
  // 接受好友请求
  acceptRequest: (requestId) => api.post(`/friends/request/${requestId}/accept`),
  // 拒绝好友请求
  rejectRequest: (requestId) => api.post(`/friends/request/${requestId}/reject`),
  // 删除好友
  removeFriend: (friendId) => api.delete(`/friends/${friendId}`),
  // 搜索用户
  searchUsers: (keyword) => api.get('/users/search', { params: { keyword } })
}

export const messageApi = {
  // 获取会话列表
  getConversations: () => api.get('/messages/conversations'),
  // 获取与某好友的私信记录
  getMessages: (friendId, params) => api.get(`/messages/${friendId}`, { params }),
  // 发送私信
  sendMessage: (friendId, content) => api.post(`/messages/${friendId}`, { content }),
  // 获取未读消息数
  getUnreadCount: () => api.get('/messages/unread-count')
}

export default api
