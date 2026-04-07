from flask import Flask, jsonify, request, stream_with_context, Response
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_jwt_extended.exceptions import JWTExtendedException
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import requests as http_requests
from app.config import config
from app.database import SessionLocal
from app.models import (Game, Tag, Genre, Developer, Publisher, GameTag, GameGenre, 
                        GameDeveloper, GamePublisher, User, UserFavorite, UserRating, UserHistory,
                        Post, PostComment, PostLike, Friendship, Message)
from sqlalchemy import func, desc, or_, and_, text, case

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    # JWT配置
    app.config['JWT_SECRET_KEY'] = getattr(config, 'JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    app.config['JWT_TOKEN_LOCATION'] = ['headers']
    app.config['JWT_HEADER_NAME'] = 'Authorization'
    app.config['JWT_HEADER_TYPE'] = 'Bearer'
    jwt = JWTManager(app)
    
    # JWT错误处理器
    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        return jsonify({'error': '无效的token', 'detail': error_string}), 422
    
    @jwt.unauthorized_loader
    def missing_token_callback(error_string):
        return jsonify({'error': '缺少token', 'detail': error_string}), 401
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'token已过期'}), 401
    
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'token已被撤销'}), 401
    
    @app.route('/')
    def index():
        return jsonify({
            'message': 'Steam游戏分析系统API',
            'docs': '/api/games'
        })
    
    @app.route('/api/games', methods=['GET'])
    def get_games():
        """获取游戏列表"""
        db = SessionLocal()
        try:
            # 获取参数
            page = int(request.args.get('page', 1))
            page_size = int(request.args.get('page_size', 20))
            search = request.args.get('search')
            genre = request.args.get('genre')
            tag = request.args.get('tag')
            is_free = request.args.get('is_free', type=int)
            min_price = request.args.get('min_price', type=float)
            max_price = request.args.get('max_price', type=float)
            min_score = request.args.get('min_score', type=float)
            year = request.args.get('year', type=int)
            sort_by = request.args.get('sort_by', 'release_date')
            sort_order = request.args.get('sort_order', 'desc')
            
            query = db.query(Game)
            
            # 筛选条件
            if search:
                query = query.filter(Game.name.ilike(f'%{search}%'))
            if genre:
                query = query.join(GameGenre).join(Genre).filter(Genre.name == genre)
            if tag:
                query = query.join(GameTag).join(Tag).filter(Tag.name == tag)
            if is_free is not None:
                query = query.filter(Game.is_free == is_free)
            if min_price is not None:
                query = query.filter(Game.price >= min_price)
            if max_price is not None:
                query = query.filter(Game.price <= max_price)
            if min_score is not None:
                query = query.filter(Game.positive_rate >= min_score)
            if year:
                query = query.filter(Game.release_year == year)
            
            # 排序
            sort_column = getattr(Game, sort_by, Game.release_date)
            if sort_order == 'desc':
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(sort_column)
            
            # 总数
            total = query.count()
            
            # 分页
            games = query.offset((page - 1) * page_size).limit(page_size).all()
            
            # 构建响应
            games_list = []
            for game in games:
                # 获取关联数据
                tags = db.query(Tag.name).join(GameTag).filter(GameTag.game_id == game.id).all()
                genres = db.query(Genre.name).join(GameGenre).filter(GameGenre.game_id == game.id).all()
                developers = db.query(Developer.name).join(GameDeveloper).filter(GameDeveloper.game_id == game.id).all()
                publishers = db.query(Publisher.name).join(GamePublisher).filter(GamePublisher.game_id == game.id).all()
                
                games_list.append({
                    'id': game.id,
                    'appid': game.appid,
                    'name': game.name,
                    'release_date': str(game.release_date) if game.release_date else None,
                    'release_year': game.release_year,
                    'release_month': game.release_month,
                    'price': float(game.price) if game.price else 0,
                    'is_free': game.is_free,
                    'estimated_owners_num': game.estimated_owners_num,
                    'peak_ccu': game.peak_ccu,
                    'recommendations': game.recommendations,
                    'metacritic_score': game.metacritic_score,
                    'user_score': float(game.user_score) if game.user_score else 0,
                    'positive': game.positive,
                    'negative': game.negative,
                    'positive_rate': float(game.positive_rate) if game.positive_rate else 0,
                    'total_reviews': game.total_reviews,
                    'average_playtime_forever': game.average_playtime_forever,
                    'average_playtime_2weeks': game.average_playtime_2weeks,
                    'median_playtime_forever': game.median_playtime_forever,
                    'median_playtime_2weeks': game.median_playtime_2weeks,
                    'windows': game.windows,
                    'mac': game.mac,
                    'linux': game.linux,
                    'header_image': game.header_image,
                    'website': game.website,
                    'short_description': game.short_description,
                    'tag_count': game.tag_count,
                    'language_count': game.language_count,
                    'tags': [t[0] for t in tags],
                    'genres': [g[0] for g in genres],
                    'developers': [d[0] for d in developers],
                    'publishers': [p[0] for p in publishers]
                })
            
            return jsonify({
                'total': total,
                'page': page,
                'page_size': page_size,
                'games': games_list
            })
        finally:
            db.close()
    
    @app.route('/api/games/<int:game_id>', methods=['GET'])
    def get_game(game_id):
        """获取游戏详情"""
        db = SessionLocal()
        try:
            game = db.query(Game).filter(Game.id == game_id).first()
            if not game:
                return jsonify({'error': '游戏不存在'}), 404
            
            # 记录浏览历史(如果用户已登录)
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                try:
                    # 手动验证token并获取用户ID
                    from flask_jwt_extended import decode_token
                    token = auth_header.split(' ')[1]
                    decoded = decode_token(token)
                    user_id = decoded.get('sub')
                    if user_id:
                        # 检查是否已存在浏览记录，避免重复
                        existing = db.query(UserHistory).filter(
                            UserHistory.user_id == int(user_id),
                            UserHistory.game_id == game_id
                        ).first()
                        if not existing:
                            history = UserHistory(
                                user_id=int(user_id),
                                game_id=game_id,
                                created_at=datetime.now()
                            )
                            db.add(history)
                            db.commit()
                except Exception as e:
                    pass  # token无效或过期，忽略
            
            # 获取关联数据
            tags = db.query(Tag.name).join(GameTag).filter(GameTag.game_id == game.id).all()
            genres = db.query(Genre.name).join(GameGenre).filter(GameGenre.game_id == game.id).all()
            developers = db.query(Developer.name).join(GameDeveloper).filter(GameDeveloper.game_id == game.id).all()
            publishers = db.query(Publisher.name).join(GamePublisher).filter(GamePublisher.game_id == game.id).all()
            
            return jsonify({
                'id': game.id,
                'appid': game.appid,
                'name': game.name,
                'release_date': str(game.release_date) if game.release_date else None,
                'release_year': game.release_year,
                'release_month': game.release_month,
                'price': float(game.price) if game.price else 0,
                'is_free': game.is_free,
                'estimated_owners_num': game.estimated_owners_num,
                'peak_ccu': game.peak_ccu,
                'recommendations': game.recommendations,
                'metacritic_score': game.metacritic_score,
                'user_score': float(game.user_score) if game.user_score else 0,
                'positive': game.positive,
                'negative': game.negative,
                'positive_rate': float(game.positive_rate) if game.positive_rate else 0,
                'total_reviews': game.total_reviews,
                'average_playtime_forever': game.average_playtime_forever,
                'average_playtime_2weeks': game.average_playtime_2weeks,
                'median_playtime_forever': game.median_playtime_forever,
                'median_playtime_2weeks': game.median_playtime_2weeks,
                'windows': game.windows,
                'mac': game.mac,
                'linux': game.linux,
                'header_image': game.header_image,
                'website': game.website,
                'short_description': game.short_description,
                'tag_count': game.tag_count,
                'language_count': game.language_count,
                'tags': [t[0] for t in tags],
                'genres': [g[0] for g in genres],
                'developers': [d[0] for d in developers],
                'publishers': [p[0] for p in publishers]
            })
        finally:
            db.close()
    
    @app.route('/api/tags', methods=['GET'])
    def get_tags():
        """获取标签列表"""
        db = SessionLocal()
        try:
            limit = int(request.args.get('limit', 50))
            tags = db.query(Tag).order_by(desc(Tag.game_count)).limit(limit).all()
            return jsonify([{
                'id': t.id,
                'name': t.name,
                'game_count': t.game_count
            } for t in tags])
        finally:
            db.close()
    
    @app.route('/api/genres', methods=['GET'])
    def get_genres():
        """获取类型列表"""
        db = SessionLocal()
        try:
            genres = db.query(Genre).order_by(desc(Genre.game_count)).all()
            return jsonify([{
                'id': g.id,
                'name': g.name,
                'game_count': g.game_count
            } for g in genres])
        finally:
            db.close()
    
    @app.route('/api/statistics', methods=['GET'])
    def get_statistics():
        """获取统计数据"""
        db = SessionLocal()
        try:
            # 总游戏数
            total_games = db.query(func.count(Game.id)).scalar()
            
            # 免费游戏数
            total_free_games = db.query(func.count(Game.id)).filter(Game.is_free == 1).scalar()
            
            # 平均价格
            avg_price = db.query(func.avg(Game.price)).filter(Game.is_free == 0).scalar() or 0
            
            # 平均好评率
            avg_positive_rate = db.query(func.avg(Game.positive_rate)).filter(Game.total_reviews > 0).scalar() or 0
            
            # 热门标签
            top_tags = db.query(Tag.name, Tag.game_count).order_by(desc(Tag.game_count)).limit(10).all()
            
            # 热门类型
            top_genres = db.query(Genre.name, Genre.game_count).order_by(desc(Genre.game_count)).limit(10).all()
            
            # 每年游戏数量
            games_by_year = db.query(
                Game.release_year,
                func.count(Game.id)
            ).filter(Game.release_year.isnot(None)).group_by(Game.release_year).order_by(Game.release_year).all()
            
            return jsonify({
                'total_games': total_games,
                'total_free_games': total_free_games,
                'avg_price': float(avg_price),
                'avg_positive_rate': float(avg_positive_rate),
                'top_tags': [{'name': t[0], 'count': t[1]} for t in top_tags],
                'top_genres': [{'name': g[0], 'count': g[1]} for g in top_genres],
                'games_by_year': [{'year': g[0], 'count': g[1]} for g in games_by_year]
            })
        finally:
            db.close()
    
    @app.route('/api/years', methods=['GET'])
    def get_years():
        """获取年份列表"""
        db = SessionLocal()
        try:
            years = db.query(Game.release_year).filter(
                Game.release_year.isnot(None)
            ).distinct().order_by(Game.release_year).all()
            return jsonify([y[0] for y in years])
        finally:
            db.close()
    
    # ==================== 用户认证相关API ====================
    
    @app.route('/api/auth/register', methods=['POST'])
    def register():
        """用户注册"""
        db = SessionLocal()
        try:
            data = request.get_json()
            username = data.get('username')
            email = data.get('email')
            password = data.get('password')
            
            if not all([username, email, password]):
                return jsonify({'error': '请填写完整信息'}), 400
            
            # 检查用户名是否已存在
            if db.query(User).filter(User.username == username).first():
                return jsonify({'error': '用户名已存在'}), 400
            
            # 检查邮箱是否已存在
            if db.query(User).filter(User.email == email).first():
                return jsonify({'error': '邮箱已被注册'}), 400
            
            # 创建用户
            user = User(
                username=username,
                email=email,
                password_hash=generate_password_hash(password),
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            db.add(user)
            db.commit()
            
            # 生成token (identity转为字符串)
            access_token = create_access_token(identity=str(user.id))
            
            return jsonify({
                'message': '注册成功',
                'token': access_token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            }), 201
        finally:
            db.close()
    
    @app.route('/api/auth/login', methods=['POST'])
    def login():
        """用户登录"""
        db = SessionLocal()
        try:
            data = request.get_json()
            username = data.get('username')
            password = data.get('password')
            
            if not all([username, password]):
                return jsonify({'error': '请填写完整信息'}), 400
            
            # 查找用户（支持用户名或邮箱登录）
            user = db.query(User).filter(
                or_(User.username == username, User.email == username)
            ).first()
            
            if not user or not check_password_hash(user.password_hash, password):
                return jsonify({'error': '用户名或密码错误'}), 401
            
            # 生成token (identity转为字符串)
            access_token = create_access_token(identity=str(user.id))
            
            return jsonify({
                'message': '登录成功',
                'token': access_token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'avatar': user.avatar
                }
            })
        finally:
            db.close()
    
    @app.route('/api/auth/me', methods=['GET'])
    @jwt_required()
    def get_current_user():
        """获取当前用户信息"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            user = db.query(User).filter(User.id == user_id).first()
            
            if not user:
                return jsonify({'error': '用户不存在'}), 404
            
            return jsonify({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'avatar': user.avatar,
                'created_at': str(user.created_at) if user.created_at else None
            })
        finally:
            db.close()
    
    # ==================== 用户收藏相关API ====================
    
    @app.route('/api/debug/token', methods=['GET'])
    def debug_token():
        """调试端点 - 检查token"""
        auth_header = request.headers.get('Authorization', 'No Auth Header')
        return jsonify({
            'auth_header': auth_header,
            'headers': dict(request.headers)
        })
    
    @app.route('/api/favorites', methods=['GET'])
    @jwt_required()
    def get_favorites():
        """获取用户收藏列表"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            page = int(request.args.get('page', 1))
            page_size = int(request.args.get('page_size', 20))
            
            # 查询用户收藏的游戏
            query = db.query(Game).join(UserFavorite).filter(
                UserFavorite.user_id == user_id
            ).order_by(desc(UserFavorite.created_at))
            
            total = query.count()
            games = query.offset((page - 1) * page_size).limit(page_size).all()
            
            games_list = []
            for game in games:
                genres = db.query(Genre.name).join(GameGenre).filter(GameGenre.game_id == game.id).all()
                games_list.append({
                    'id': game.id,
                    'name': game.name,
                    'header_image': game.header_image,
                    'price': float(game.price) if game.price else 0,
                    'is_free': game.is_free,
                    'positive_rate': float(game.positive_rate) if game.positive_rate else 0,
                    'genres': [g[0] for g in genres]
                })
            
            return jsonify({
                'total': total,
                'page': page,
                'page_size': page_size,
                'games': games_list
            })
        finally:
            db.close()
    
    @app.route('/api/favorites/<int:game_id>', methods=['POST'])
    @jwt_required()
    def add_favorite(game_id):
        """添加收藏"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            
            # 检查是否已收藏
            existing = db.query(UserFavorite).filter(
                UserFavorite.user_id == user_id,
                UserFavorite.game_id == game_id
            ).first()
            
            if existing:
                return jsonify({'error': '已收藏该游戏'}), 400
            
            # 添加收藏
            favorite = UserFavorite(
                user_id=user_id,
                game_id=game_id,
                created_at=datetime.now()
            )
            db.add(favorite)
            db.commit()
            
            return jsonify({'message': '收藏成功'})
        finally:
            db.close()
    
    @app.route('/api/favorites/<int:game_id>', methods=['DELETE'])
    @jwt_required()
    def remove_favorite(game_id):
        """取消收藏"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            
            favorite = db.query(UserFavorite).filter(
                UserFavorite.user_id == user_id,
                UserFavorite.game_id == game_id
            ).first()
            
            if not favorite:
                return jsonify({'error': '未收藏该游戏'}), 400
            
            db.delete(favorite)
            db.commit()
            
            return jsonify({'message': '取消收藏成功'})
        finally:
            db.close()
    
    @app.route('/api/favorites/check/<int:game_id>', methods=['GET'])
    @jwt_required()
    def check_favorite(game_id):
        """检查是否已收藏"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            
            favorite = db.query(UserFavorite).filter(
                UserFavorite.user_id == user_id,
                UserFavorite.game_id == game_id
            ).first()
            
            return jsonify({'is_favorite': favorite is not None})
        finally:
            db.close()
    
    # ==================== 用户评分相关API ====================
    
    @app.route('/api/ratings', methods=['GET'])
    @jwt_required()
    def get_user_ratings():
        """获取用户评分列表"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            
            ratings = db.query(UserRating, Game).join(Game).filter(
                UserRating.user_id == user_id
            ).order_by(desc(UserRating.updated_at)).all()
            
            result = []
            for rating, game in ratings:
                result.append({
                    'game_id': game.id,
                    'game_name': game.name,
                    'header_image': game.header_image,
                    'rating': rating.rating,
                    'updated_at': str(rating.updated_at) if rating.updated_at else None
                })
            
            return jsonify(result)
        finally:
            db.close()
    
    @app.route('/api/ratings/<int:game_id>', methods=['POST'])
    @jwt_required()
    def rate_game(game_id):
        """评分游戏"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            data = request.get_json()
            rating = data.get('rating')
            
            if not rating or rating < 1 or rating > 10:
                return jsonify({'error': '评分范围为1-10'}), 400
            
            # 检查是否已评分
            existing = db.query(UserRating).filter(
                UserRating.user_id == user_id,
                UserRating.game_id == game_id
            ).first()
            
            if existing:
                existing.rating = rating
                existing.updated_at = datetime.now()
            else:
                new_rating = UserRating(
                    user_id=user_id,
                    game_id=game_id,
                    rating=rating,
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                db.add(new_rating)
            
            db.commit()
            return jsonify({'message': '评分成功', 'rating': rating})
        finally:
            db.close()
    
    @app.route('/api/ratings/<int:game_id>', methods=['GET'])
    @jwt_required()
    def get_game_rating(game_id):
        """获取用户对某游戏的评分"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            
            rating = db.query(UserRating).filter(
                UserRating.user_id == user_id,
                UserRating.game_id == game_id
            ).first()
            
            return jsonify({'rating': rating.rating if rating else None})
        finally:
            db.close()
    
    # ==================== 推荐系统API ====================
    
    @app.route('/api/recommendations/content-based/<int:game_id>', methods=['GET'])
    def get_content_based_recommendations(game_id):
        """基于内容的推荐（根据类型、标签相似度）"""
        db = SessionLocal()
        try:
            # 获取当前游戏的类型和标签
            game_genres = db.query(Genre.id).join(GameGenre).filter(GameGenre.game_id == game_id).all()
            game_tags = db.query(Tag.id).join(GameTag).filter(GameTag.game_id == game_id).all()
            
            genre_ids = [g[0] for g in game_genres]
            tag_ids = [t[0] for t in game_tags]
            
            if not genre_ids and not tag_ids:
                return jsonify([])
            
            # 查找有相似类型或标签的游戏
            similar_games = db.query(
                Game.id,
                Game.name,
                Game.header_image,
                Game.price,
                Game.is_free,
                Game.positive_rate,
                func.count(func.distinct(GameGenre.genre_id)).label('genre_match'),
                func.count(func.distinct(GameTag.tag_id)).label('tag_match')
            ).outerjoin(GameGenre, GameGenre.game_id == Game.id).outerjoin(
                GameTag, GameTag.game_id == Game.id
            ).filter(
                Game.id != game_id,
                or_(
                    GameGenre.genre_id.in_(genre_ids),
                    GameTag.tag_id.in_(tag_ids)
                )
            ).group_by(Game.id).order_by(
                desc('genre_match'), desc('tag_match'), desc(Game.positive_rate)
            ).limit(10).all()
            
            result = []
            for g in similar_games:
                result.append({
                    'id': g.id,
                    'name': g.name,
                    'header_image': g.header_image,
                    'price': float(g.price) if g.price else 0,
                    'is_free': g.is_free,
                    'positive_rate': float(g.positive_rate) if g.positive_rate else 0
                })
            
            return jsonify(result)
        finally:
            db.close()
    
    @app.route('/api/recommendations', methods=['GET'])
    @jwt_required(optional=True)
    def get_recommendations():
        """综合推荐 - 返回三种推荐
        
        算法说明：
        1. 协同过滤：找到与当前用户有相同收藏的用户，推荐他们收藏的其他游戏
        2. 基于内容：根据用户收藏游戏的类型/标签找相似游戏
        3. 热点游戏：高评分、高评价数的游戏
        """
        db = SessionLocal()
        try:
            # 调试：检查请求头
            auth_header = request.headers.get('Authorization', 'No Auth Header')
            print(f"[推荐调试] Authorization Header: {auth_header[:50] if auth_header != 'No Auth Header' else auth_header}...")
            
            user_id = None
            jwt_identity = get_jwt_identity()
            print(f"[推荐调试] JWT Identity: {jwt_identity}, type: {type(jwt_identity)}")
            
            if jwt_identity:
                try:
                    user_id = int(jwt_identity)
                except (TypeError, ValueError) as e:
                    print(f"[推荐调试] 转换user_id失败: {e}")
            
            # 获取用户的收藏和评分
            favorite_ids = []
            liked_ids = []
            genre_ids = []
            tag_ids = []
            
            if user_id:
                # 获取收藏
                user_favorites = db.query(UserFavorite.game_id).filter(
                    UserFavorite.user_id == user_id
                ).all()
                favorite_ids = [f[0] for f in user_favorites]
                
                # 获取高评分(>=7分)
                user_ratings = db.query(UserRating.game_id).filter(
                    UserRating.user_id == user_id,
                    UserRating.rating >= 7
                ).all()
                liked_ids = list(set(favorite_ids + [r[0] for r in user_ratings]))
                
                # 获取收藏游戏的类型和标签
                if liked_ids:
                    game_genres = db.query(Genre.id).join(GameGenre).filter(
                        GameGenre.game_id.in_(liked_ids)
                    ).all()
                    game_tags = db.query(Tag.id).join(GameTag).filter(
                        GameTag.game_id.in_(liked_ids)
                    ).all()
                    genre_ids = list(set([g[0] for g in game_genres]))
                    tag_ids = list(set([t[0] for t in game_tags]))
            
            # ==================== 1. 协同过滤推荐 - "与你相似的人喜欢" ====================
            # 真正的协同过滤：找有相同收藏的其他用户，推荐他们收藏的游戏
            collaborative = []
            
            # 调试信息
            print(f"[推荐调试] user_id: {user_id}, liked_ids: {liked_ids}")
            
            if liked_ids:
                # 找到收藏了相同游戏的其他用户
                similar_users = db.query(UserFavorite.user_id).filter(
                    UserFavorite.game_id.in_(liked_ids),
                    UserFavorite.user_id != user_id
                ).distinct().all()
                similar_user_ids = [u[0] for u in similar_users]
                
                print(f"[推荐调试] 找到相似用户: {similar_user_ids}")
                
                if similar_user_ids:
                    # 计算每个相似用户与当前用户的重叠游戏数（相似度）
                    # 然后推荐他们收藏但当前用户没收藏的游戏
                    # 按被推荐次数排序（越多相似用户收藏，越值得推荐）
                    recommended_games = db.query(
                        Game.id,
                        Game.name,
                        Game.header_image,
                        Game.price,
                        Game.is_free,
                        Game.positive_rate,
                        func.count(UserFavorite.user_id).label('recommend_count')
                    ).select_from(Game).join(
                        UserFavorite, UserFavorite.game_id == Game.id
                    ).filter(
                        UserFavorite.user_id.in_(similar_user_ids),
                        Game.id.notin_(liked_ids)  # 排除已收藏的
                    ).group_by(Game.id).order_by(
                        desc('recommend_count'),  # 按推荐次数排序
                        desc(Game.positive_rate)
                    ).limit(6).all()
                    
                    print(f"[推荐调试] 协同过滤推荐游戏数: {len(recommended_games)}")
                    
                    collaborative = [{
                        'id': g.id, 'name': g.name, 'header_image': g.header_image,
                        'price': float(g.price) if g.price else 0, 'is_free': g.is_free,
                        'positive_rate': float(g.positive_rate) if g.positive_rate else 0
                    } for g in recommended_games]
                
                # 如果有收藏但没有相似用户/相似用户没有其他收藏
                # 则推荐相似类型的高评分游戏作为fallback
                if not collaborative and (genre_ids or tag_ids):
                    print("[推荐调试] 没有相似用户，使用相似类型作为fallback")
                    fallback_games = db.query(Game).select_from(Game).outerjoin(
                        GameGenre, GameGenre.game_id == Game.id
                    ).outerjoin(
                        GameTag, GameTag.game_id == Game.id
                    ).filter(
                        Game.id.notin_(liked_ids),
                        Game.positive_rate >= 80,
                        or_(
                            GameGenre.genre_id.in_(genre_ids) if genre_ids else False,
                            GameTag.tag_id.in_(tag_ids) if tag_ids else False
                        )
                    ).group_by(Game.id).order_by(func.random()).limit(6).all()
                    
                    collaborative = [{
                        'id': g.id, 'name': g.name, 'header_image': g.header_image,
                        'price': float(g.price) if g.price else 0, 'is_free': g.is_free,
                        'positive_rate': float(g.positive_rate) if g.positive_rate else 0
                    } for g in fallback_games]
            else:
                print("[推荐调试] 用户没有收藏任何游戏")
            
            # 新用户（无收藏）或完全无法获取推荐：随机推荐高评分游戏
            if not collaborative:
                print("[推荐调试] 使用随机高评分游戏作为最终fallback")
                top_games = db.query(Game).filter(
                    Game.positive_rate >= 90,
                    Game.total_reviews > 500
                ).order_by(func.random()).limit(6).all()
                collaborative = [{
                    'id': g.id, 'name': g.name, 'header_image': g.header_image,
                    'price': float(g.price) if g.price else 0, 'is_free': g.is_free,
                    'positive_rate': float(g.positive_rate) if g.positive_rate else 0
                } for g in top_games]
            
            # ==================== 2. 基于内容推荐 - "基于你的喜爱推荐" ====================
            # 根据用户收藏游戏的类型/标签找相似游戏（随机推荐）
            content_based = []
            if liked_ids and (genre_ids or tag_ids):
                # 随机推荐同类型的高评分游戏
                content_games = db.query(Game).select_from(Game).outerjoin(
                    GameGenre, GameGenre.game_id == Game.id
                ).outerjoin(
                    GameTag, GameTag.game_id == Game.id
                ).filter(
                    Game.id.notin_(liked_ids),
                    Game.positive_rate >= 70,  # 只推荐好评率70%以上的
                    or_(
                        GameGenre.genre_id.in_(genre_ids) if genre_ids else False,
                        GameTag.tag_id.in_(tag_ids) if tag_ids else False
                    )
                ).group_by(Game.id).order_by(func.random()).limit(6).all()
                
                print(f"[推荐调试] 基于内容推荐游戏数: {len(content_games)}")
                
                content_based = [{
                    'id': g.id, 'name': g.name, 'header_image': g.header_image,
                    'price': float(g.price) if g.price else 0, 'is_free': g.is_free,
                    'positive_rate': float(g.positive_rate) if g.positive_rate else 0
                } for g in content_games]
            
            # 新用户或没有匹配：随机推荐热门游戏
            if not content_based:
                print("[推荐调试] 基于内容无结果，使用随机热门游戏")
                hot_fallback = db.query(Game).filter(
                    Game.estimated_owners_num > 100000
                ).order_by(func.random()).limit(6).all()
                content_based = [{
                    'id': g.id, 'name': g.name, 'header_image': g.header_image,
                    'price': float(g.price) if g.price else 0, 'is_free': g.is_free,
                    'positive_rate': float(g.positive_rate) if g.positive_rate else 0
                } for g in hot_fallback]
            
            # ==================== 3. 近期热点 - "近期热点游戏" ====================
            exclude_ids = liked_ids + [g['id'] for g in collaborative] + [g['id'] for g in content_based]
            hot_games = db.query(Game).filter(
                Game.total_reviews > 1000,
                Game.positive_rate >= 80
            ).filter(
                Game.id.notin_(exclude_ids) if exclude_ids else True
            ).order_by(
                desc(Game.estimated_owners_num), desc(Game.positive_rate)
            ).limit(6).all()
            
            trending = [{
                'id': g.id, 'name': g.name, 'header_image': g.header_image,
                'price': float(g.price) if g.price else 0, 'is_free': g.is_free,
                'positive_rate': float(g.positive_rate) if g.positive_rate else 0
            } for g in hot_games]
            
            return jsonify({
                'collaborative': collaborative,  # 与你相似的人喜欢（真正的协同过滤）
                'contentBased': content_based,    # 基于你的喜爱推荐（基于内容）
                'trending': trending              # 近期热点游戏
            })
        finally:
            db.close()
    
    # ==================== 扩展统计数据API ====================
    
    @app.route('/api/statistics/price', methods=['GET'])
    def get_price_statistics():
        """价格分析统计"""
        db = SessionLocal()
        try:
            # 价格区间分布
            price_ranges = db.query(
                case(
                    (Game.price == 0, '免费'),
                    (Game.price < 10, '0-10'),
                    (Game.price < 30, '10-30'),
                    (Game.price < 60, '30-60'),
                    (Game.price < 100, '60-100'),
                    else_='100+'
                ).label('price_range'),
                func.count(Game.id).label('count')
            ).filter(Game.is_free == 0).group_by(text('price_range')).all()
            
            # 价格与评分关系
            price_rating = db.query(
                func.floor(Game.price / 10) * 10,
                func.avg(Game.positive_rate).label('avg_rating'),
                func.count(Game.id).label('count')
            ).filter(
                Game.is_free == 0,
                Game.total_reviews > 0
            ).group_by(func.floor(Game.price / 10) * 10).order_by(
                func.floor(Game.price / 10) * 10
            ).all()
            
            return jsonify({
                'price_ranges': [{'range': p[0], 'count': p[1]} for p in price_ranges],
                'price_rating': [{'price': int(p[0]) if p[0] else 0, 'rating': float(p[1]) if p[1] else 0, 'count': p[2]} for p in price_rating]
            })
        finally:
            db.close()
    
    @app.route('/api/statistics/score', methods=['GET'])
    def get_score_statistics():
        """评分分析统计"""
        db = SessionLocal()
        try:
            # 评分区间分布
            score_ranges = db.query(
                case(
                    (Game.positive_rate < 20, '0-20%'),
                    (Game.positive_rate < 40, '20-40%'),
                    (Game.positive_rate < 60, '40-60%'),
                    (Game.positive_rate < 80, '60-80%'),
                    (Game.positive_rate < 90, '80-90%'),
                    else_='90-100%'
                ).label('score_range'),
                func.count(Game.id).label('count')
            ).filter(Game.total_reviews > 0).group_by(text('score_range')).all()
            
            # 高分游戏类型分布
            top_genres = db.query(
                Genre.name,
                func.count(Game.id).label('game_count'),
                func.avg(Game.positive_rate).label('avg_rating')
            ).select_from(Genre).join(GameGenre, Genre.id == GameGenre.genre_id).join(
                Game, Game.id == GameGenre.game_id
            ).filter(
                Game.positive_rate >= 90,
                Game.total_reviews > 100
            ).group_by(Genre.id).order_by(text('game_count DESC')).limit(10).all()
            
            return jsonify({
                'score_ranges': [{'range': s[0], 'count': s[1]} for s in score_ranges],
                'top_genres': [{'name': g[0], 'count': g[1], 'avg_rating': float(g[2]) if g[2] else 0} for g in top_genres]
            })
        finally:
            db.close()
    
    @app.route('/api/statistics/developers', methods=['GET'])
    def get_developer_statistics():
        """开发商统计"""
        db = SessionLocal()
        try:
            limit = int(request.args.get('limit', 20))
            
            # 热门开发商
            top_developers = db.query(
                Developer.name,
                Developer.game_count,
                func.avg(Game.positive_rate).label('avg_rating'),
                func.avg(Game.price).label('avg_price')
            ).select_from(Developer).join(
                GameDeveloper, Developer.id == GameDeveloper.developer_id
            ).join(
                Game, Game.id == GameDeveloper.game_id
            ).filter(
                Developer.game_count > 0
            ).group_by(Developer.id).order_by(desc(Developer.game_count)).limit(limit).all()
            
            # 热门发行商
            top_publishers = db.query(
                Publisher.name,
                Publisher.game_count,
                func.avg(Game.positive_rate).label('avg_rating'),
                func.avg(Game.price).label('avg_price')
            ).select_from(Publisher).join(
                GamePublisher, Publisher.id == GamePublisher.publisher_id
            ).join(
                Game, Game.id == GamePublisher.game_id
            ).filter(
                Publisher.game_count > 0
            ).group_by(Publisher.id).order_by(desc(Publisher.game_count)).limit(limit).all()
            
            return jsonify({
                'top_developers': [{
                    'name': d[0],
                    'game_count': d[1],
                    'avg_rating': float(d[2]) if d[2] else 0,
                    'avg_price': float(d[3]) if d[3] else 0
                } for d in top_developers],
                'top_publishers': [{
                    'name': p[0],
                    'game_count': p[1],
                    'avg_rating': float(p[2]) if p[2] else 0,
                    'avg_price': float(p[3]) if p[3] else 0
                } for p in top_publishers]
            })
        finally:
            db.close()
    
    @app.route('/api/statistics/platform', methods=['GET'])
    def get_platform_statistics():
        """平台支持统计"""
        db = SessionLocal()
        try:
            total = db.query(func.count(Game.id)).scalar()
            
            windows_count = db.query(func.count(Game.id)).filter(Game.windows == 1).scalar()
            mac_count = db.query(func.count(Game.id)).filter(Game.mac == 1).scalar()
            linux_count = db.query(func.count(Game.id)).filter(Game.linux == 1).scalar()
            
            return jsonify({
                'total': total,
                'windows': windows_count,
                'mac': mac_count,
                'linux': linux_count
            })
        finally:
            db.close()
    
    @app.route('/api/statistics/monthly', methods=['GET'])
    def get_monthly_statistics():
        """按月统计游戏发布趋势"""
        db = SessionLocal()
        try:
            year = request.args.get('year', type=int)
            
            query = db.query(
                Game.release_year,
                Game.release_month,
                func.count(Game.id).label('count')
            ).filter(
                Game.release_year.isnot(None),
                Game.release_month.isnot(None)
            )
            
            if year:
                query = query.filter(Game.release_year == year)
            
            monthly = query.group_by(
                Game.release_year, Game.release_month
            ).order_by(Game.release_year, Game.release_month).all()
            
            return jsonify([{
                'year': m[0],
                'month': m[1],
                'count': m[2]
            } for m in monthly])
        finally:
            db.close()
    
    # ==================== 社区帖子API ====================
    
    @app.route('/api/posts', methods=['GET'])
    def get_posts():
        """获取帖子列表"""
        db = SessionLocal()
        try:
            page = int(request.args.get('page', 1))
            page_size = int(request.args.get('page_size', 20))
            game_id = request.args.get('game_id', type=int)
            sort_by = request.args.get('sort_by', 'latest')  # latest / hottest
            
            query = db.query(Post)
            
            if game_id:
                query = query.filter(Post.game_id == game_id)
            
            if sort_by == 'hottest':
                query = query.order_by(desc(Post.like_count), desc(Post.created_at))
            else:
                query = query.order_by(desc(Post.created_at))
            
            total = query.count()
            posts = query.offset((page - 1) * page_size).limit(page_size).all()
            
            result = []
            for post in posts:
                author = db.query(User).filter(User.id == post.user_id).first()
                game_info = None
                if post.game_id:
                    game = db.query(Game).filter(Game.id == post.game_id).first()
                    if game:
                        game_info = {
                            'id': game.id,
                            'name': game.name,
                            'header_image': game.header_image
                        }
                result.append({
                    'id': post.id,
                    'title': post.title,
                    'content': post.content[:200] + '...' if len(post.content) > 200 else post.content,
                    'content_full': post.content,
                    'like_count': post.like_count,
                    'comment_count': post.comment_count,
                    'game': game_info,
                    'author': {
                        'id': author.id,
                        'username': author.username,
                        'avatar': author.avatar
                    } if author else None,
                    'created_at': str(post.created_at) if post.created_at else None
                })
            
            return jsonify({
                'total': total,
                'page': page,
                'page_size': page_size,
                'posts': result
            })
        finally:
            db.close()
    
    @app.route('/api/posts', methods=['POST'])
    @jwt_required()
    def create_post():
        """创建帖子"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            data = request.get_json()
            title = data.get('title', '').strip()
            content = data.get('content', '').strip()
            game_id = data.get('game_id')
            
            if not title or not content:
                return jsonify({'error': '标题和内容不能为空'}), 400
            
            if len(title) > 200:
                return jsonify({'error': '标题不能超过200个字符'}), 400
            
            post = Post(
                user_id=user_id,
                game_id=game_id,
                title=title,
                content=content,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            db.add(post)
            db.commit()
            
            return jsonify({
                'message': '发帖成功',
                'post_id': post.id
            }), 201
        finally:
            db.close()
    
    @app.route('/api/posts/<int:post_id>', methods=['GET'])
    def get_post_detail(post_id):
        """获取帖子详情"""
        db = SessionLocal()
        try:
            post = db.query(Post).filter(Post.id == post_id).first()
            if not post:
                return jsonify({'error': '帖子不存在'}), 404
            
            author = db.query(User).filter(User.id == post.user_id).first()
            game_info = None
            if post.game_id:
                game = db.query(Game).filter(Game.id == post.game_id).first()
                if game:
                    game_info = {
                        'id': game.id,
                        'name': game.name,
                        'header_image': game.header_image
                    }
            
            # 获取顶级评论(非回复)
            comments = db.query(PostComment).filter(
                PostComment.post_id == post_id,
                PostComment.parent_id == None
            ).order_by(desc(PostComment.created_at)).all()
            
            comment_list = []
            for c in comments:
                c_author = db.query(User).filter(User.id == c.user_id).first()
                # 获取该评论的回复
                replies = db.query(PostComment).filter(
                    PostComment.parent_id == c.id
                ).order_by(PostComment.created_at).all()
                reply_list = []
                for r in replies:
                    r_author = db.query(User).filter(User.id == r.user_id).first()
                    reply_list.append({
                        'id': r.id,
                        'content': r.content,
                        'author': {
                            'id': r_author.id,
                            'username': r_author.username,
                            'avatar': r_author.avatar
                        } if r_author else None,
                        'created_at': str(r.created_at) if r.created_at else None
                    })
                comment_list.append({
                    'id': c.id,
                    'content': c.content,
                    'author': {
                        'id': c_author.id,
                        'username': c_author.username,
                        'avatar': c_author.avatar
                    } if c_author else None,
                    'replies': reply_list,
                    'reply_count': len(reply_list),
                    'created_at': str(c.created_at) if c.created_at else None
                })
            
            return jsonify({
                'id': post.id,
                'title': post.title,
                'content': post.content,
                'like_count': post.like_count,
                'comment_count': post.comment_count,
                'game': game_info,
                'author': {
                    'id': author.id,
                    'username': author.username,
                    'avatar': author.avatar
                } if author else None,
                'comments': comment_list,
                'created_at': str(post.created_at) if post.created_at else None
            })
        finally:
            db.close()
    
    @app.route('/api/posts/<int:post_id>', methods=['DELETE'])
    @jwt_required()
    def delete_post(post_id):
        """删除帖子"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            post = db.query(Post).filter(Post.id == post_id).first()
            
            if not post:
                return jsonify({'error': '帖子不存在'}), 404
            
            if post.user_id != user_id:
                return jsonify({'error': '只能删除自己的帖子'}), 403
            
            db.delete(post)
            db.commit()
            return jsonify({'message': '删除成功'})
        finally:
            db.close()
    
    @app.route('/api/posts/<int:post_id>/comments', methods=['POST'])
    @jwt_required()
    def create_comment(post_id):
        """评论帖子"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            data = request.get_json()
            content = data.get('content', '').strip()
            parent_id = data.get('parent_id')
            
            if not content:
                return jsonify({'error': '评论内容不能为空'}), 400
            
            post = db.query(Post).filter(Post.id == post_id).first()
            if not post:
                return jsonify({'error': '帖子不存在'}), 404
            
            if parent_id:
                parent_comment = db.query(PostComment).filter(PostComment.id == parent_id).first()
                if not parent_comment or parent_comment.post_id != post_id:
                    return jsonify({'error': '回复的目标评论不存在'}), 400
            
            comment = PostComment(
                post_id=post_id,
                user_id=user_id,
                parent_id=parent_id,
                content=content,
                created_at=datetime.now()
            )
            db.add(comment)
            post.comment_count = (post.comment_count or 0) + 1
            db.commit()
            
            author = db.query(User).filter(User.id == user_id).first()
            
            return jsonify({
                'message': '评论成功',
                'comment': {
                    'id': comment.id,
                    'content': comment.content,
                    'author': {
                        'id': author.id,
                        'username': author.username,
                        'avatar': author.avatar
                    } if author else None,
                    'created_at': str(comment.created_at) if comment.created_at else None
                }
            }), 201
        finally:
            db.close()
    
    @app.route('/api/posts/<int:post_id>/like', methods=['POST'])
    @jwt_required()
    def like_post(post_id):
        """点赞/取消点赞帖子"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            
            post = db.query(Post).filter(Post.id == post_id).first()
            if not post:
                return jsonify({'error': '帖子不存在'}), 404
            
            existing = db.query(PostLike).filter(
                PostLike.post_id == post_id,
                PostLike.user_id == user_id
            ).first()
            
            if existing:
                db.delete(existing)
                post.like_count = max(0, (post.like_count or 0) - 1)
                db.commit()
                return jsonify({'message': '取消点赞', 'liked': False})
            else:
                like = PostLike(
                    post_id=post_id,
                    user_id=user_id,
                    created_at=datetime.now()
                )
                db.add(like)
                post.like_count = (post.like_count or 0) + 1
                db.commit()
                return jsonify({'message': '点赞成功', 'liked': True})
        finally:
            db.close()
    
    @app.route('/api/posts/<int:post_id>/like', methods=['GET'])
    @jwt_required()
    def check_post_like(post_id):
        """检查是否已点赞"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            like = db.query(PostLike).filter(
                PostLike.post_id == post_id,
                PostLike.user_id == user_id
            ).first()
            return jsonify({'liked': like is not None})
        finally:
            db.close()
    
    @app.route('/api/posts/user', methods=['GET'])
    @jwt_required()
    def get_user_posts():
        """获取当前用户的帖子"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            page = int(request.args.get('page', 1))
            page_size = int(request.args.get('page_size', 20))
            
            query = db.query(Post).filter(Post.user_id == user_id).order_by(desc(Post.created_at))
            total = query.count()
            posts = query.offset((page - 1) * page_size).limit(page_size).all()
            
            result = []
            for post in posts:
                game_info = None
                if post.game_id:
                    game = db.query(Game).filter(Game.id == post.game_id).first()
                    if game:
                        game_info = {'id': game.id, 'name': game.name, 'header_image': game.header_image}
                result.append({
                    'id': post.id,
                    'title': post.title,
                    'content': post.content[:100] + '...' if len(post.content) > 100 else post.content,
                    'like_count': post.like_count,
                    'comment_count': post.comment_count,
                    'game': game_info,
                    'created_at': str(post.created_at) if post.created_at else None
                })
            
            return jsonify({
                'total': total,
                'page': page,
                'page_size': page_size,
                'posts': result
            })
        finally:
            db.close()
    
    # ==================== AI助手API ====================
    
    @app.route('/api/ai/chat', methods=['POST'])
    @jwt_required()
    def ai_chat():
        """AI助手 - 接入DeepSeek API"""
        user_id = int(get_jwt_identity())
        data = request.get_json() or {}
        message = data.get('message', '').strip()
        language = str(data.get('language', 'zh')).lower()
        language = 'en' if language == 'en' else 'zh'

        
        if not message:
            return jsonify({'error': 'Message cannot be empty' if language == 'en' else '消息不能为空'}), 400

        
        api_key = getattr(config, 'DEEPSEEK_API_KEY', '')
        if not api_key:
            return jsonify({'error': 'AI助手未配置，请联系管理员设置DeepSeek API Key'}), 503
        
        # 构建系统提示词 - 基于Steam游戏分析的上下文
        if language == 'en':
            system_prompt = """You are the AI assistant of \"Steam Game Analytics\". You can help users with:
1. Game recommendation - recommend suitable Steam games based on user preferences
2. Game data analysis - interpret game price, ratings, popularity and related data
3. Gameplay guidance - provide general game selection suggestions
4. Product guidance - explain how to use this system effectively

Please follow these rules:
- Keep responses concise, friendly, and structured
- If you are unsure about a game, be honest about uncertainty
- Reply primarily in English
- If the user explicitly asks for another language, follow the user's request"""
        else:
            system_prompt = """你是\"Steam游戏分析系统\"的AI助手。你可以帮助用户：
1. 推荐游戏 - 根据用户的喜好推荐合适的Steam游戏
2. 分析游戏数据 - 解读游戏的价格、评分、热度等数据
3. 游戏攻略建议 - 提供通用的游戏选择建议
4. 系统使用帮助 - 指导用户如何使用本系统的各项功能

请注意：
- 你的回答应该简洁、友好、有条理
- 如果用户问到你不了解的游戏，请诚实说明
- 默认用中文回答
- 如果用户明确要求其他语言，请按用户要求回答"""

        
        # 获取用户最近的浏览/收藏信息作为上下文
        db = SessionLocal()
        try:
            recent_favorites = db.query(Game.name).join(UserFavorite).filter(
                UserFavorite.user_id == user_id
            ).order_by(desc(UserFavorite.created_at)).limit(5).all()
            recent_ratings = db.query(Game.name, UserRating.rating).join(UserRating, Game.id == UserRating.game_id).filter(
                UserRating.user_id == user_id
            ).order_by(desc(UserRating.updated_at)).limit(5).all()
            
            if recent_favorites or recent_ratings:
                if language == 'en':
                    context = "\n\nCurrent user context:\n"
                    if recent_favorites:
                        fav_names = [f[0] for f in recent_favorites]
                        context += f"- Recently favorited games: {', '.join(fav_names)}\n"
                    if recent_ratings:
                        rating_info = ', '.join([f"{r[0]}({r[1]}/10)" for r in recent_ratings])
                        context += f"- Recently rated games: {rating_info}\n"
                else:
                    context = "\n\n当前用户信息：\n"
                    if recent_favorites:
                        fav_names = [f[0] for f in recent_favorites]
                        context += f"- 最近收藏的游戏: {', '.join(fav_names)}\n"
                    if recent_ratings:
                        rating_info = ', '.join([f"{r[0]}({r[1]}分)" for r in recent_ratings])
                        context += f"- 最近评分的游戏: {rating_info}\n"
                system_prompt += context

        finally:
            db.close()
        
        try:
            response = http_requests.post(
                config.DEEPSEEK_API_URL,
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': config.DEEPSEEK_MODEL,
                    'messages': [
                        {'role': 'system', 'content': system_prompt},
                        {'role': 'user', 'content': message}
                    ],
                    'max_tokens': 1024,
                    'temperature': 0.7
                },
                timeout=30
            )
            
            if response.status_code != 200:
                msg = f'AI service is temporarily unavailable ({response.status_code})' if language == 'en' else f'AI服务暂时不可用({response.status_code})'
                return jsonify({'error': msg}), 503

            
            result = response.json()
            ai_reply = result['choices'][0]['message']['content']
            
            return jsonify({'reply': ai_reply})
        except http_requests.exceptions.Timeout:
            return jsonify({'error': 'AI response timeout, please try again later' if language == 'en' else 'AI响应超时，请稍后重试'}), 504
        except Exception as e:
            msg = f'AI service error: {str(e)}' if language == 'en' else f'AI服务异常: {str(e)}'
            return jsonify({'error': msg}), 503

    
    # ==================== 好友系统API ====================
    
    @app.route('/api/friends', methods=['GET'])
    @jwt_required()
    def get_friends():
        """获取好友列表(已接受的)"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            # 双向查询: 我加的 + 加我的
            friends = db.query(Friendship).filter(
                Friendship.status == 'accepted',
                or_(
                    Friendship.user_id == user_id,
                    Friendship.friend_id == user_id
                )
            ).all()
            
            result = []
            for f in friends:
                friend_id = f.friend_id if f.user_id == user_id else f.user_id
                friend = db.query(User).filter(User.id == friend_id).first()
                if friend:
                    result.append({
                        'id': f.id,
                        'friend_id': friend.id,
                        'username': friend.username,
                        'avatar': friend.avatar,
                        'created_at': str(f.created_at) if f.created_at else None
                    })
            
            return jsonify(result)
        finally:
            db.close()
    
    @app.route('/api/friends/requests', methods=['GET'])
    @jwt_required()
    def get_friend_requests():
        """获取好友请求(收到+发出的)"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            # 收到的请求
            received = db.query(Friendship).filter(
                Friendship.friend_id == user_id,
                Friendship.status == 'pending'
            ).all()
            # 发出的请求
            sent = db.query(Friendship).filter(
                Friendship.user_id == user_id,
                Friendship.status == 'pending'
            ).all()
            
            received_list = []
            for r in received:
                u = db.query(User).filter(User.id == r.user_id).first()
                if u:
                    received_list.append({
                        'id': r.id,
                        'user_id': u.id,
                        'username': u.username,
                        'avatar': u.avatar,
                        'created_at': str(r.created_at) if r.created_at else None
                    })
            
            sent_list = []
            for s in sent:
                u = db.query(User).filter(User.id == s.friend_id).first()
                if u:
                    sent_list.append({
                        'id': s.id,
                        'user_id': u.id,
                        'username': u.username,
                        'avatar': u.avatar,
                        'created_at': str(s.created_at) if s.created_at else None
                    })
            
            return jsonify({'received': received_list, 'sent': sent_list})
        finally:
            db.close()
    
    @app.route('/api/friends/request', methods=['POST'])
    @jwt_required()
    def send_friend_request():
        """发送好友请求"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            data = request.get_json()
            friend_id = data.get('friend_id')
            
            if not friend_id or friend_id == user_id:
                return jsonify({'error': '参数错误'}), 400
            
            friend_id = int(friend_id)
            
            friend = db.query(User).filter(User.id == friend_id).first()
            if not friend:
                return jsonify({'error': '用户不存在'}), 404
            
            # 检查是否已有关系
            existing = db.query(Friendship).filter(
                or_(
                    and_(Friendship.user_id == user_id, Friendship.friend_id == friend_id),
                    and_(Friendship.user_id == friend_id, Friendship.friend_id == user_id)
                )
            ).first()
            
            if existing:
                if existing.status == 'accepted':
                    return jsonify({'error': '已经是好友了'}), 400
                elif existing.status == 'pending':
                    return jsonify({'error': '已有待处理的好友请求'}), 400
                else:
                    # rejected -> 可以重新发送
                    existing.status = 'pending'
                    db.commit()
                    return jsonify({'message': '已重新发送好友请求'})
            
            friendship = Friendship(
                user_id=user_id,
                friend_id=friend_id,
                status='pending',
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            db.add(friendship)
            db.commit()
            return jsonify({'message': '好友请求已发送'}), 201
        finally:
            db.close()
    
    @app.route('/api/friends/request/<int:request_id>/accept', methods=['POST'])
    @jwt_required()
    def accept_friend_request(request_id):
        """接受好友请求"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            friendship = db.query(Friendship).filter(
                Friendship.id == request_id,
                Friendship.friend_id == user_id,
                Friendship.status == 'pending'
            ).first()
            
            if not friendship:
                return jsonify({'error': '请求不存在或已处理'}), 404
            
            friendship.status = 'accepted'
            friendship.updated_at = datetime.now()
            db.commit()
            return jsonify({'message': '已接受好友请求'})
        finally:
            db.close()
    
    @app.route('/api/friends/request/<int:request_id>/reject', methods=['POST'])
    @jwt_required()
    def reject_friend_request(request_id):
        """拒绝好友请求"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            friendship = db.query(Friendship).filter(
                Friendship.id == request_id,
                Friendship.friend_id == user_id,
                Friendship.status == 'pending'
            ).first()
            
            if not friendship:
                return jsonify({'error': '请求不存在或已处理'}), 404
            
            friendship.status = 'rejected'
            friendship.updated_at = datetime.now()
            db.commit()
            return jsonify({'message': '已拒绝好友请求'})
        finally:
            db.close()
    
    @app.route('/api/friends/<int:friend_id>', methods=['DELETE'])
    @jwt_required()
    def remove_friend(friend_id):
        """删除好友"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            db.query(Friendship).filter(
                Friendship.status == 'accepted',
                or_(
                    and_(Friendship.user_id == user_id, Friendship.friend_id == friend_id),
                    and_(Friendship.user_id == friend_id, Friendship.friend_id == user_id)
                )
            ).delete()
            db.commit()
            return jsonify({'message': '已删除好友'})
        finally:
            db.close()
    
    @app.route('/api/users/search', methods=['GET'])
    @jwt_required()
    def search_users():
        """搜索用户(用于添加好友)"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            keyword = request.args.get('keyword', '').strip()
            
            if not keyword:
                return jsonify([])
            
            users = db.query(User).filter(
                User.id != user_id,
                or_(
                    User.username.ilike(f'%{keyword}%'),
                    User.email.ilike(f'%{keyword}%')
                )
            ).limit(20).all()
            
            return jsonify([{
                'id': u.id,
                'username': u.username,
                'avatar': u.avatar
            } for u in users])
        finally:
            db.close()
    
    # ==================== 私信API ====================
    
    @app.route('/api/messages/conversations', methods=['GET'])
    @jwt_required()
    def get_conversations():
        """获取会话列表(最近联系的好友)"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            
            # 获取与我相关的所有私信，按最新消息排序
            conversations = db.query(
                Message.sender_id,
                Message.receiver_id,
                func.max(Message.created_at).label('last_time'),
                func.count(Message.id).label('total'),
                func.sum(case((Message.is_read == 0, 1), else_=0)).label('unread')
            ).filter(
                or_(Message.sender_id == user_id, Message.receiver_id == user_id)
            ).group_by(
                Message.sender_id, Message.receiver_id
            ).order_by(desc('last_time')).all()
            
            result = []
            seen = set()
            for conv in conversations:
                other_id = conv.receiver_id if conv.sender_id == user_id else conv.sender_id
                if other_id in seen:
                    continue
                seen.add(other_id)
                
                other = db.query(User).filter(User.id == other_id).first()
                if other:
                    # 获取最后一条消息内容
                    last_msg = db.query(Message).filter(
                        or_(
                            and_(Message.sender_id == user_id, Message.receiver_id == other_id),
                            and_(Message.sender_id == other_id, Message.receiver_id == user_id)
                        )
                    ).order_by(desc(Message.created_at)).first()
                    
                    result.append({
                        'friend_id': other.id,
                        'username': other.username,
                        'avatar': other.avatar,
                        'last_message': last_msg.content if last_msg else '',
                        'last_time': str(conv.last_time) if conv.last_time else None,
                        'unread': int(conv.unread or 0)
                    })
            
            return jsonify(result)
        finally:
            db.close()
    
    @app.route('/api/messages/<int:friend_id>', methods=['GET'])
    @jwt_required()
    def get_messages(friend_id):
        """获取与某好友的私信记录"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            page = int(request.args.get('page', 1))
            page_size = int(request.args.get('page_size', 50))
            
            messages = db.query(Message).filter(
                or_(
                    and_(Message.sender_id == user_id, Message.receiver_id == friend_id),
                    and_(Message.sender_id == friend_id, Message.receiver_id == user_id)
                )
            ).order_by(desc(Message.created_at)).offset((page - 1) * page_size).limit(page_size).all()
            
            # 标记对方发来的未读消息为已读
            db.query(Message).filter(
                Message.sender_id == friend_id,
                Message.receiver_id == user_id,
                Message.is_read == 0
            ).update({'is_read': 1})
            db.commit()
            
            return jsonify([{
                'id': m.id,
                'sender_id': m.sender_id,
                'receiver_id': m.receiver_id,
                'content': m.content,
                'is_read': m.is_read,
                'created_at': str(m.created_at) if m.created_at else None
            } for m in reversed(messages)])
        finally:
            db.close()
    
    @app.route('/api/messages/<int:friend_id>', methods=['POST'])
    @jwt_required()
    def send_message(friend_id):
        """发送私信"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            data = request.get_json()
            content = data.get('content', '').strip()
            
            if not content:
                return jsonify({'error': '消息内容不能为空'}), 400
            
            # 检查是否是好友
            is_friend = db.query(Friendship).filter(
                Friendship.status == 'accepted',
                or_(
                    and_(Friendship.user_id == user_id, Friendship.friend_id == friend_id),
                    and_(Friendship.user_id == friend_id, Friendship.friend_id == user_id)
                )
            ).first()
            
            if not is_friend:
                return jsonify({'error': '只能给好友发私信'}), 403
            
            msg = Message(
                sender_id=user_id,
                receiver_id=friend_id,
                content=content,
                created_at=datetime.now()
            )
            db.add(msg)
            db.commit()
            
            return jsonify({
                'message': '发送成功',
                'id': msg.id,
                'created_at': str(msg.created_at)
            }), 201
        finally:
            db.close()
    
    @app.route('/api/messages/unread-count', methods=['GET'])
    @jwt_required()
    def get_unread_count():
        """获取未读消息总数"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            count = db.query(func.count(Message.id)).filter(
                Message.receiver_id == user_id,
                Message.is_read == 0
            ).scalar() or 0
            return jsonify({'count': count})
        finally:
            db.close()
    
    # ==================== 个人数据统计API ====================
    
    @app.route('/api/statistics/personal', methods=['GET'])
    @jwt_required()
    def get_personal_statistics():
        """获取当前用户的个人数据统计"""
        db = SessionLocal()
        try:
            user_id = int(get_jwt_identity())
            stats = {}
            
            # 收藏统计
            total_favorites = db.query(func.count(UserFavorite.id)).filter(
                UserFavorite.user_id == user_id
            ).scalar() or 0
            stats['total_favorites'] = total_favorites
            
            # 收藏游戏的类型分布
            fav_genres = db.query(Genre.name, func.count(Genre.id).label('count')).join(
                GameGenre, Genre.id == GameGenre.genre_id
            ).join(
                UserFavorite, GameGenre.game_id == UserFavorite.game_id
            ).filter(
                UserFavorite.user_id == user_id
            ).group_by(Genre.name).order_by(desc('count')).limit(15).all()
            stats['favorite_genres'] = [{'name': g[0], 'count': g[1]} for g in fav_genres]
            
            # 收藏游戏的价格分布
            fav_price_stats = db.query(
                func.count(Game.id).label('count'),
                func.avg(Game.price).label('avg_price'),
                func.min(Game.price).label('min_price'),
                func.max(Game.price).label('max_price')
            ).join(
                UserFavorite, Game.id == UserFavorite.game_id
            ).filter(
                UserFavorite.user_id == user_id
            ).first()
            stats['favorite_price'] = {
                'count': fav_price_stats.count or 0,
                'avg_price': float(fav_price_stats.avg_price or 0),
                'min_price': float(fav_price_stats.min_price or 0),
                'max_price': float(fav_price_stats.max_price or 0)
            }
            
            # 收藏游戏的评分分布
            fav_score_stats = db.query(
                func.avg(Game.positive_rate).label('avg_rate'),
                func.avg(Game.metacritic_score).label('avg_metacritic'),
                func.avg(Game.user_score).label('avg_user_score')
            ).join(
                UserFavorite, Game.id == UserFavorite.game_id
            ).filter(
                UserFavorite.user_id == user_id
            ).first()
            stats['favorite_scores'] = {
                'avg_positive_rate': float(fav_score_stats.avg_rate or 0),
                'avg_metacritic_score': float(fav_score_stats.avg_metacritic or 0),
                'avg_user_score': float(fav_score_stats.avg_user_score or 0)
            }
            
            # 收藏游戏的平台分布 - 使用原生SQL
            fav_platform = db.execute(
                text("""
                    SELECT 
                        SUM(CASE WHEN windows = 1 THEN 1 ELSE 0 END) as windows,
                        SUM(CASE WHEN mac = 1 THEN 1 ELSE 0 END) as mac,
                        SUM(CASE WHEN linux = 1 THEN 1 ELSE 0 END) as linux,
                        SUM(CASE WHEN is_free = 1 THEN 1 ELSE 0 END) as free
                    FROM games g
                    JOIN user_favorites uf ON g.id = uf.game_id
                    WHERE uf.user_id = :uid
                """), {'uid': user_id}
            ).first()
            stats['favorite_platforms'] = {
                'windows': int(fav_platform.windows or 0),
                'mac': int(fav_platform.mac or 0),
                'linux': int(fav_platform.linux or 0),
                'free': int(fav_platform.free or 0)
            }
            
            # 收藏游戏的发行年份分布
            fav_years = db.query(Game.release_year, func.count(Game.id).label('count')).join(
                UserFavorite, Game.id == UserFavorite.game_id
            ).filter(
                UserFavorite.user_id == user_id,
                Game.release_year.isnot(None)
            ).group_by(Game.release_year).order_by(Game.release_year).all()
            stats['favorite_years'] = [{'year': y[0], 'count': y[1]} for y in fav_years]
            
            # 评分统计
            total_ratings = db.query(func.count(UserRating.id)).filter(
                UserRating.user_id == user_id
            ).scalar() or 0
            stats['total_ratings'] = total_ratings
            
            avg_my_rating = db.query(func.avg(UserRating.rating)).filter(
                UserRating.user_id == user_id
            ).scalar()
            stats['avg_my_rating'] = float(avg_my_rating or 0)
            
            # 我的评分分布
            rating_dist = db.query(UserRating.rating, func.count(UserRating.id).label('count')).filter(
                UserRating.user_id == user_id
            ).group_by(UserRating.rating).order_by(UserRating.rating).all()
            stats['rating_distribution'] = [{'rating': r[0], 'count': r[1]} for r in rating_dist]
            
            # 评分游戏的类型偏好
            high_rated_genres = db.query(Genre.name, func.count(Genre.id).label('count'), func.avg(UserRating.rating).label('avg_rating')).join(
                GameGenre, Genre.id == GameGenre.genre_id
            ).join(
                UserRating, GameGenre.game_id == UserRating.game_id
            ).filter(
                UserRating.user_id == user_id
            ).group_by(Genre.name).order_by(desc('avg_rating')).limit(15).all()
            stats['rated_genres'] = [{'name': g[0], 'count': g[1], 'avg_rating': float(g[2] or 0)} for g in high_rated_genres]
            
            # 浏览历史统计
            total_history = db.query(func.count(UserHistory.id)).filter(
                UserHistory.user_id == user_id
            ).scalar() or 0
            stats['total_history'] = total_history
            
            # 浏览最多的类型
            history_genres = db.query(Genre.name, func.count(Genre.id).label('count')).join(
                GameGenre, Genre.id == GameGenre.genre_id
            ).join(
                UserHistory, GameGenre.game_id == UserHistory.game_id
            ).filter(
                UserHistory.user_id == user_id
            ).group_by(Genre.name).order_by(desc('count')).limit(10).all()
            stats['history_genres'] = [{'name': g[0], 'count': g[1]} for g in history_genres]
            
            # 社区统计
            total_posts = db.query(func.count(Post.id)).filter(
                Post.user_id == user_id
            ).scalar() or 0
            total_comments = db.query(func.count(PostComment.id)).filter(
                PostComment.user_id == user_id
            ).scalar() or 0
            total_likes_received = db.query(func.sum(Post.like_count)).filter(
                Post.user_id == user_id
            ).scalar() or 0
            stats['community'] = {
                'total_posts': total_posts,
                'total_comments': total_comments,
                'total_likes_received': int(total_likes_received)
            }
            
            # 好友统计
            total_friends = db.query(func.count(Friendship.id)).filter(
                Friendship.status == 'accepted',
                or_(
                    Friendship.user_id == user_id,
                    Friendship.friend_id == user_id
                )
            ).scalar() or 0
            stats['total_friends'] = total_friends
            
            # 活跃度 - 最近7天
            from datetime import timedelta
            week_ago = datetime.now() - timedelta(days=7)
            try:
                recent_activity = db.query(func.count(UserHistory.id)).filter(
                    UserHistory.user_id == user_id,
                    UserHistory.created_at >= week_ago
                ).scalar() or 0
            except:
                # 如果 created_at 列不存在，使用总数
                recent_activity = total_history
            stats['recent_activity_7d'] = recent_activity
            
            return jsonify(stats)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()
    
    return app
