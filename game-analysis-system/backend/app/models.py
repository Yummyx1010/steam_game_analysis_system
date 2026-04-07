from sqlalchemy import Column, Integer, String, DECIMAL, Text, Date, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Game(Base):
    __tablename__ = "games"
    
    id = Column(Integer, primary_key=True, index=True)
    appid = Column(String(20), unique=True, nullable=False)
    name = Column(String(500), nullable=False)
    release_date = Column(Date)
    release_year = Column(Integer)
    release_month = Column(Integer)
    price = Column(DECIMAL(10, 2), default=0)
    is_free = Column(Integer, default=0)
    estimated_owners_num = Column(Integer, default=0)
    peak_ccu = Column(Integer, default=0)
    recommendations = Column(Integer, default=0)
    metacritic_score = Column(Integer, default=0)
    user_score = Column(DECIMAL(5, 2), default=0)
    positive = Column(Integer, default=0)
    negative = Column(Integer, default=0)
    positive_rate = Column(DECIMAL(5, 2), default=0)
    total_reviews = Column(Integer, default=0)
    average_playtime_forever = Column(Integer, default=0)
    average_playtime_2weeks = Column(Integer, default=0)
    median_playtime_forever = Column(Integer, default=0)
    median_playtime_2weeks = Column(Integer, default=0)
    windows = Column(Integer, default=1)
    mac = Column(Integer, default=0)
    linux = Column(Integer, default=0)
    header_image = Column(String(1000))
    website = Column(String(1000))
    short_description = Column(Text)
    required_age = Column(Integer, default=0)
    tag_count = Column(Integer, default=0)
    language_count = Column(Integer, default=0)
    created_at = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP)


class Tag(Base):
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    game_count = Column(Integer, default=0)


class Genre(Base):
    __tablename__ = "genres"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    game_count = Column(Integer, default=0)


class Developer(Base):
    __tablename__ = "developers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), unique=True, nullable=False)
    game_count = Column(Integer, default=0)


class Publisher(Base):
    __tablename__ = "publishers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), unique=True, nullable=False)
    game_count = Column(Integer, default=0)


class GameTag(Base):
    __tablename__ = "game_tags"
    
    id = Column(Integer, primary_key=True)
    game_id = Column(Integer, ForeignKey("games.id"))
    tag_id = Column(Integer, ForeignKey("tags.id"))


class GameGenre(Base):
    __tablename__ = "game_genres"
    
    id = Column(Integer, primary_key=True)
    game_id = Column(Integer, ForeignKey("games.id"))
    genre_id = Column(Integer, ForeignKey("genres.id"))


class GameDeveloper(Base):
    __tablename__ = "game_developers"
    
    id = Column(Integer, primary_key=True)
    game_id = Column(Integer, ForeignKey("games.id"))
    developer_id = Column(Integer, ForeignKey("developers.id"))


class GamePublisher(Base):
    __tablename__ = "game_publishers"
    
    id = Column(Integer, primary_key=True)
    game_id = Column(Integer, ForeignKey("games.id"))
    publisher_id = Column(Integer, ForeignKey("publishers.id"))


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    avatar = Column(String(500))
    created_at = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP)


class UserFavorite(Base):
    """用户收藏的游戏"""
    __tablename__ = "user_favorites"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    game_id = Column(Integer, ForeignKey("games.id"))
    created_at = Column(TIMESTAMP)


class UserRating(Base):
    """用户评分"""
    __tablename__ = "user_ratings"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    game_id = Column(Integer, ForeignKey("games.id"))
    rating = Column(Integer)  # 1-10分
    created_at = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP)


class UserHistory(Base):
    """浏览历史"""
    __tablename__ = "user_history"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    game_id = Column(Integer, ForeignKey("games.id"))
    created_at = Column(TIMESTAMP)


class Post(Base):
    """社区帖子"""
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    game_id = Column(Integer, ForeignKey("games.id"), nullable=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    like_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    created_at = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP)


class PostComment(Base):
    """帖子评论"""
    __tablename__ = "post_comments"
    
    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    parent_id = Column(Integer, ForeignKey("post_comments.id"), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP)


class PostLike(Base):
    """帖子点赞"""
    __tablename__ = "post_likes"
    
    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(TIMESTAMP)


class Friendship(Base):
    """好友关系"""
    __tablename__ = "friendships"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    friend_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String(20), default="pending")  # pending / accepted / rejected
    created_at = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP)


class Message(Base):
    """私信"""
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    receiver_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text, nullable=False)
    is_read = Column(Integer, default=0)  # 0-未读, 1-已读
    created_at = Column(TIMESTAMP)
