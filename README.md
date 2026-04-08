# Steam 游戏数据分析系统 / Steam Game Analytics System

一个基于 Flask + React 的 Steam 游戏数据分析系统，提供游戏信息查询、筛选、统计分析、用户认证、游戏推荐、社区互动、AI助手等功能。

A Steam game analytics platform built with Flask + React, featuring game discovery/filtering, statistics, authentication, recommendations, community interaction, and an AI assistant.


## 技术栈

**后端**: Flask + SQLAlchemy + MySQL + JWT认证

**前端**: React + Ant Design + Recharts

**数据分析**: Python + Pandas

**推荐系统**: 基于内容推荐 + 协同过滤

**AI助手**: 接入 DeepSeek API

## 项目结构（其中games.csv可在https://www.kaggle.com/datasets/fronkongames/steam-games-dataset下载到项目文件中）

```
game-analysis-system/
├── backend/                # 后端代码
│   ├── app/
│   │   ├── config.py       # 配置文件
│   │   ├── database.py     # 数据库连接
│   │   ├── models.py       # 数据模型
│   │   └── routes.py       # API 路由
│   ├── main.py             # 入口文件
│   └── requirements.txt    # Python 依赖
├── frontend/               # 前端代码
│   ├── src/
│   │   ├── api/            # API 服务
│   │   ├── context/        # React Context
│   │   ├── pages/          # 页面组件
│   │   ├── App.jsx         # 主组件
│   │   └── main.jsx        # 入口文件
│   ├── package.json        # Node 依赖
│   └── vite.config.js      # Vite 配置
├── data_cleaning.py        # 数据清洗脚本
├── import_to_mysql.py      # 数据导入脚本
├── database_schema.sql     # 数据库表结构
├── games.csv               # 原始数据
├── cleaned_games.csv       # 清洗后数据 (Python 分析用)
└── games_for_mysql.csv     # MySQL 导入数据
```

---

## 快速开始

### 前置要求

Python 3.8+

Node.js 18+

MySQL 8.0+

---

## 第一步：安装依赖

### 1.1 安装 Python 依赖

```bash
# 数据清洗和导入依赖
pip install pandas pymysql sqlalchemy tqdm

# 后端依赖
cd backend
pip install -r requirements.txt
```

### 1.2 安装前端依赖

```bash
cd frontend
npm install
```

---

## 第二步：数据清洗

运行数据清洗脚本，生成清洗后的数据文件：

```bash
python data_cleaning.py
```

**输出文件**:
- `cleaned_games.csv` - 用于 Python 分析
- `games_for_mysql.csv` - 用于 MySQL 导入

---

## 第三步：创建数据库

### 3.1 创建 MySQL 数据库

```sql
CREATE DATABASE steam_games CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3.2 创建表结构

```bash
mysql -u root -p steam_games < database_schema.sql
```

或在 MySQL 客户端中执行：

```sql
USE steam_games;
SOURCE database_schema.sql;
```

---

## 第四步：导入数据到 MySQL

### 4.1 修改数据库配置

编辑 `import_to_mysql.py` 第 17 行，修改数据库密码：

```python
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'your_password',  # 改成你的密码
    'database': 'steam_games',
    'charset': 'utf8mb4'
}
```

### 4.2 运行导入脚本

```bash
python import_to_mysql.py
```

导入过程包含 5 个步骤：
1. 导入游戏主表 (约 12 万条记录)
2. 导入标签和类型
3. 导入关联表
4. 导入开发商和发行商
5. 更新统计数据

**注意**: 由于数据量较大，游戏主表采用单条插入方式，导入时间约 10 分钟。

---

## 第五步：配置后端

编辑 `backend/app/config.py`，修改数据库连接信息：

```python
class Config:
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 3306))
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = 'your_password'  # 改成你的密码
    DB_NAME = os.getenv('DB_NAME', 'steam_games')
```

### 5.2 配置 DeepSeek AI 助手（可选）

在 `backend/app/config.py` 中添加 DeepSeek API Key：

```python
    DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY', 'your_deepseek_api_key')
```

或通过环境变量设置：

```bash
export DEEPSEEK_API_KEY='sk-xxxxxxxxxxxxxxxx'
```

> **注意**：AI助手功能为可选功能。如果未配置 API Key，AI助手会提示"未配置"但不影响其他功能的使用。

---

## 第六步：启动服务

### 6.1 启动后端

```bash
cd backend
python main.py
```

访问 http://localhost:8000/api/games 测试 API

### 6.2 启动前端

```bash
cd frontend
npm run dev
```

访问 http://localhost:3000 查看前端页面

---

## 功能介绍

### 首页
- 游戏总数、免费游戏数统计
- 平均价格、平均好评率
- 热门标签和类型排行

### 游戏列表
- 支持游戏名称搜索
- 支持按类型、标签、年份、价格类型筛选
- 支持排序（发行日期、价格、好评率、评价数）
- 分页浏览
- **对比实验室**：支持最多 4 款游戏横向对比
- **优势高亮**：每项关键指标自动标记最佳值
- **评分模型**：支持权重调节并对缺失值做稳健处理（缺失值不扣分）


### 游戏详情
- 游戏基本信息（名称、价格、发行日期等）
- 评分信息（Metacritic 评分、用户评分、好评率）
- 平台支持（Windows/macOS/Linux）
- 标签、类型、开发商、发行商
- **收藏功能**（登录后可用）
- **评分功能**（登录后可用）
- **相似游戏推荐**

### 游戏推荐
- **协同过滤推荐**：基于用户收藏和评分行为推荐
- **基于内容推荐**：根据游戏类型和标签相似度推荐

### 用户认证
- 用户注册/登录
- 个人中心
- 收藏管理
- 评分管理

### 多语言支持
- 全局中英文切换（右上角按钮）
- 语言偏好本地持久化（`localStorage`）
- 主要页面文案双语化


### 游戏社区
- **发帖功能**：用户可发布游戏相关帖子（支持关联游戏）
- **评论回复**：支持对帖子评论和回复评论
- **点赞互动**：对帖子点赞/取消点赞
- **排序浏览**：按最新/最热排序
- **帖子管理**：可删除自己的帖子

### AI 游戏助手
- 右下角浮动按钮，点击展开对话面板
- 接入 **DeepSeek API**，提供智能对话
- 基于用户收藏/评分上下文进行个性化推荐
- 支持游戏推荐、数据解读、系统使用帮助等
- 支持与系统语言联动（中文/英文），可按界面语言返回回答


### 好友系统
- **添加好友**：搜索用户并发送好友请求
- **好友管理**：查看好友列表、接受/拒绝请求、删除好友
- **私信功能**：与好友实时聊天，支持历史消息查看
- **未读提醒**：会话列表显示未读消息数量

### 个人数据报告
- **个人概览**：收藏数、评分数、好友数、活跃度等核心指标
- **收藏分析**：收藏游戏的类型偏好、价格分布、平台分布、年份分布
- **评分分析**：评分分布图、类型偏好雷达图
- **活跃统计**：发帖数、评论数、获赞数、浏览偏好

### 数据分析中心
分为 5 个详细板块：

#### 1. 市场概览
- 游戏总数、免费/付费游戏统计
- 游戏发布趋势（近20年）
- 免费vs付费游戏占比
- 月度发布趋势（可按年份筛选）
- 平台支持雷达图

#### 2. 类型与标签分析
- 热门游戏类型 TOP 15 横向柱状图
- 热门标签分布饼图
- **游戏标签词云**
- **游戏类型词云**

#### 3. 价格分析
- 价格区间分布柱状图
- 价格与评分关系散点图
- 价格区间评分详情表

#### 4. 评分分析
- 评分区间分布
- 高分游戏类型分布（好评率≥90%）
- 高分游戏类型详情表

#### 5. 开发商与发行商分析
- 热门开发商 TOP 15
- 热门发行商 TOP 15
- 开发商详情表（含平均好评率、平均价格）

---

## API 接口


### 游戏相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/games` | GET | 获取游戏列表（支持筛选、分页） |
| `/api/games/{id}` | GET | 获取游戏详情 |
| `/api/tags` | GET | 获取标签列表 |
| `/api/genres` | GET | 获取类型列表 |
| `/api/years` | GET | 获取年份列表 |

### 用户认证

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/me` | GET | 获取当前用户信息 |

### 收藏相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/favorites` | GET | 获取收藏列表 |
| `/api/favorites/{game_id}` | POST | 添加收藏 |
| `/api/favorites/{game_id}` | DELETE | 取消收藏 |
| `/api/favorites/check/{game_id}` | GET | 检查是否收藏 |

### 评分相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/ratings` | GET | 获取用户评分列表 |
| `/api/ratings/{game_id}` | POST | 评分游戏 |
| `/api/ratings/{game_id}` | GET | 获取游戏评分 |

### 推荐系统

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/recommendations` | GET | 综合推荐（协同+内容+热点） |
| `/api/recommendations/content-based/{game_id}` | GET | 基于内容推荐 |

### 社区帖子

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/posts` | GET | 获取帖子列表（支持分页、排序） |
| `/api/posts` | POST | 创建帖子（需登录） |
| `/api/posts/{id}` | GET | 获取帖子详情（含评论） |
| `/api/posts/{id}` | DELETE | 删除帖子（需登录，仅作者） |
| `/api/posts/{id}/comments` | POST | 评论帖子（需登录） |
| `/api/posts/{id}/like` | POST | 点赞/取消点赞（需登录） |
| `/api/posts/{id}/like` | GET | 检查是否已点赞 |
| `/api/posts/user` | GET | 获取当前用户的帖子 |

### AI助手

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/ai/chat` | POST | AI对话（需登录，支持 `message` + `language(zh/en)`） |


### 统计数据

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/statistics` | GET | 基础统计数据 |
| `/api/statistics/price` | GET | 价格分析统计 |
| `/api/statistics/score` | GET | 评分分析统计 |
| `/api/statistics/developers` | GET | 开发商统计 |
| `/api/statistics/platform` | GET | 平台支持统计 |
| `/api/statistics/monthly` | GET | 月度统计 |
| `/api/statistics/personal` | GET | 个人数据统计（需登录） |

### 好友系统

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/friends` | GET | 获取好友列表 |
| `/api/friends/requests` | GET | 获取好友请求（收到+发出） |
| `/api/friends/request` | POST | 发送好友请求 |
| `/api/friends/request/{id}/accept` | POST | 接受好友请求 |
| `/api/friends/request/{id}/reject` | POST | 拒绝好友请求 |
| `/api/friends/{id}` | DELETE | 删除好友 |
| `/api/users/search` | GET | 搜索用户 |

### 私信系统

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/messages/conversations` | GET | 获取会话列表 |
| `/api/messages/{friend_id}` | GET | 获取与某好友的聊天记录 |
| `/api/messages/{friend_id}` | POST | 发送私信 |
| `/api/messages/unread-count` | GET | 获取未读消息数 |

### 游戏列表参数

| 参数 | 类型 | 说明 |
|------|------|------|
| page | int | 页码（默认 1） |
| page_size | int | 每页数量（默认 20，最大 100） |
| search | string | 搜索关键词 |
| genre | string | 类型筛选 |
| tag | string | 标签筛选 |
| is_free | int | 免费筛选（0: 付费, 1: 免费） |
| min_price | float | 最低价格 |
| max_price | float | 最高价格 |
| min_score | float | 最低好评率 |
| year | int | 发行年份 |
| sort_by | string | 排序字段（release_date/price/positive_rate/total_reviews） |
| sort_order | string | 排序方式（asc/desc） |

---

## 数据库表结构

| 表名 | 说明 |
|------|------|
| games | 游戏主表 |
| tags | 标签表 |
| genres | 类型表 |
| developers | 开发商表 |
| publishers | 发行商表 |
| game_tags | 游戏-标签关联表 |
| game_genres | 游戏-类型关联表 |
| game_developers | 游戏-开发商关联表 |
| game_publishers | 游戏-发行商关联表 |
| users | 用户表 |
| user_favorites | 用户收藏表 |
| user_ratings | 用户评分表 |
| user_history | 浏览历史表 |
| search_logs | 搜索日志表 |
| statistics | 统计缓存表 |
| posts | 社区帖子表 |
| post_comments | 帖子评论表 |
| post_likes | 帖子点赞表 |
| friendships | 好友关系表 |
| messages | 私信表 |

---

## 常见问题

### 1. 数据导入失败：参数过多

MySQL 对单次 SQL 语句的参数数量有限制。如果遇到此问题，可减小 `import_to_mysql.py` 中的批次大小。

### 2. user_score 字段超范围

如果提示 `Out of range value for column 'user_score'`，需要修改表结构：

```sql
ALTER TABLE games MODIFY COLUMN user_score DECIMAL(5,2) DEFAULT 0;
```

### 3. 开发商/发行商重复导入

脚本已处理重复数据，会自动跳过已存在的记录。

---

## 开发说明

### 添加新的 API 接口

1. 在 `backend/app/models.py` 添加数据模型
2. 在 `backend/app/routes.py` 添加路由函数

### 添加新的前端页面

1. 在 `frontend/src/pages/` 创建页面组件
2. 在 `frontend/src/App.jsx` 添加路由配置
3. 在菜单中添加入口

### 添加新的统计图表

1. 在 `backend/app/routes.py` 添加统计 API
2. 在 `frontend/src/api/index.js` 添加 API 调用
3. 在 `frontend/src/pages/StatisticsPage.jsx` 添加图表组件

---

## License

MIT
