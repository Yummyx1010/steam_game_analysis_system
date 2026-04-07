"""
将清洗后的数据导入MySQL数据库
智能跳过已存在的数据，无需注释代码
"""

import pandas as pd
import json
import sys
import ast
import pymysql
from sqlalchemy import create_engine, text
from tqdm import tqdm

sys.stdout.reconfigure(encoding='utf-8')


def parse_list(value):
    """解析列表，支持 JSON 和 Python 字面量格式"""
    if not value or pd.isna(value):
        return []
    if isinstance(value, list):
        return value
    value = str(value).strip()
    if not value or value == '[]':
        return []
    # 尝试 JSON 格式
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return parsed
    except:
        pass
    # 尝试 Python 字面量格式（如 ['Valve']）
    try:
        parsed = ast.literal_eval(value)
        if isinstance(parsed, list):
            return parsed
    except:
        pass
    return []

# MySQL配置
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'yyx20031010',  # 请修改为你的密码
    'database': 'steam_games',
    'charset': 'utf8mb4'
}


def get_connection():
    """获取原生数据库连接"""
    return pymysql.connect(
        host=DB_CONFIG['host'],
        port=DB_CONFIG['port'],
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password'],
        database=DB_CONFIG['database'],
        charset=DB_CONFIG['charset']
    )


def get_engine():
    """创建数据库连接引擎"""
    url = f"mysql+pymysql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}?charset={DB_CONFIG['charset']}"
    return create_engine(url, pool_pre_ping=True)


def check_table_count(conn, table_name):
    """检查表中已有的记录数"""
    cursor = conn.cursor()
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    count = cursor.fetchone()[0]
    cursor.close()
    return count


def get_existing_appids(conn):
    """获取已存在的游戏appid"""
    cursor = conn.cursor()
    cursor.execute("SELECT appid FROM games")
    appids = set(str(row[0]) for row in cursor.fetchall())
    cursor.close()
    return appids


def import_games(conn, csv_path='games_for_mysql.csv'):
    """导入游戏主表数据 - 智能跳过已存在的"""
    print("\n[1/5] 导入游戏主表...")
    
    # 检查已有数据
    existing_count = check_table_count(conn, 'games')
    existing_appids = get_existing_appids(conn) if existing_count > 0 else set()
    
    df = pd.read_csv(csv_path)
    
    # 选择需要的列
    game_columns = [
        'appid', 'name', 'release_date', 'release_year', 'release_month',
        'estimated_owners_num', 'peak_ccu', 'required_age', 'price', 'is_free',
        'metacritic_score', 'user_score', 'positive', 'negative',
        'positive_rate', 'total_reviews', 'recommendations',
        'average_playtime_forever', 'average_playtime_2weeks',
        'median_playtime_forever', 'median_playtime_2weeks',
        'windows', 'mac', 'linux',
        'header_image', 'website', 'short_description',
        'tag_count', 'language_count'
    ]
    
    df_games = df[game_columns].copy()
    
    # 过滤已存在的游戏
    df_games['appid_str'] = df_games['appid'].astype(str)
    df_new = df_games[~df_games['appid_str'].isin(existing_appids)].copy()
    
    if len(df_new) == 0:
        print(f"  跳过: 所有 {len(df_games)} 条游戏记录已存在")
        return df
    
    df_new = df_new.drop(columns=['appid_str'])
    
    # 批量插入
    cursor = conn.cursor()
    inserted = 0
    
    for _, row in tqdm(df_new.iterrows(), total=len(df_new), desc="导入游戏"):
        try:
            # 处理日期
            release_date = row['release_date'] if pd.notna(row['release_date']) else None
            
            # 处理描述（截断超长文本）
            desc = str(row['short_description'])[:5000] if pd.notna(row['short_description']) else None
            
            sql = """
            INSERT INTO games (appid, name, release_date, release_year, release_month,
                estimated_owners_num, peak_ccu, required_age, price, is_free,
                metacritic_score, user_score, positive, negative,
                positive_rate, total_reviews, recommendations,
                average_playtime_forever, average_playtime_2weeks,
                median_playtime_forever, median_playtime_2weeks,
                windows, mac, linux, header_image, website, short_description,
                tag_count, language_count)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (
                str(row['appid']), row['name'], release_date,
                int(row['release_year']) if pd.notna(row['release_year']) else None,
                int(row['release_month']) if pd.notna(row['release_month']) else None,
                int(row['estimated_owners_num']) if pd.notna(row['estimated_owners_num']) else 0,
                int(row['peak_ccu']) if pd.notna(row['peak_ccu']) else 0,
                int(row['required_age']) if pd.notna(row['required_age']) else 0,
                float(row['price']) if pd.notna(row['price']) else 0,
                int(row['is_free']) if pd.notna(row['is_free']) else 0,
                int(row['metacritic_score']) if pd.notna(row['metacritic_score']) else 0,
                float(row['user_score']) if pd.notna(row['user_score']) else 0,
                int(row['positive']) if pd.notna(row['positive']) else 0,
                int(row['negative']) if pd.notna(row['negative']) else 0,
                float(row['positive_rate']) if pd.notna(row['positive_rate']) else 0,
                int(row['total_reviews']) if pd.notna(row['total_reviews']) else 0,
                int(row['recommendations']) if pd.notna(row['recommendations']) else 0,
                int(row['average_playtime_forever']) if pd.notna(row['average_playtime_forever']) else 0,
                int(row['average_playtime_2weeks']) if pd.notna(row['average_playtime_2weeks']) else 0,
                int(row['median_playtime_forever']) if pd.notna(row['median_playtime_forever']) else 0,
                int(row['median_playtime_2weeks']) if pd.notna(row['median_playtime_2weeks']) else 0,
                int(row['windows']) if pd.notna(row['windows']) else 1,
                int(row['mac']) if pd.notna(row['mac']) else 0,
                int(row['linux']) if pd.notna(row['linux']) else 0,
                row['header_image'] if pd.notna(row['header_image']) else None,
                row['website'] if pd.notna(row['website']) else None,
                desc,
                int(row['tag_count']) if pd.notna(row['tag_count']) else 0,
                int(row['language_count']) if pd.notna(row['language_count']) else 0
            ))
            inserted += 1
        except Exception as e:
            if 'Duplicate' not in str(e):
                print(f"  错误 {row['appid']}: {e}")
    
    conn.commit()
    cursor.close()
    
    print(f"  完成: 导入 {inserted} 条新游戏, 跳过 {len(df_games) - inserted} 条已存在")
    return df


def import_tags_and_genres(conn, csv_path='games_for_mysql.csv'):
    """导入标签和类型 - 智能跳过已存在的"""
    print("\n[2/5] 导入标签和类型...")
    
    # 检查已有数据
    existing_tags = check_table_count(conn, 'tags')
    existing_genres = check_table_count(conn, 'genres')
    
    if existing_tags > 0 and existing_genres > 0:
        print(f"  跳过: 已有 {existing_tags} 个标签, {existing_genres} 个类型")
        return
    
    df = pd.read_csv(csv_path)
    
    # 收集所有唯一的标签和类型
    all_tags = set()
    all_genres = set()
    
    for _, row in tqdm(df.iterrows(), total=len(df), desc="解析标签类型"):
        tags = json.loads(row['tags']) if pd.notna(row['tags']) else []
        genres = json.loads(row['genres']) if pd.notna(row['genres']) else []
        all_tags.update(tags)
        all_genres.update(genres)
    
    cursor = conn.cursor()
    
    # 导入标签
    if existing_tags == 0:
        for tag in tqdm(sorted(all_tags), desc="导入标签"):
            try:
                cursor.execute("INSERT INTO tags (name) VALUES (%s)", (tag,))
            except:
                pass  # 跳过重复
        conn.commit()
        print(f"  完成: 导入 {len(all_tags)} 个标签")
    else:
        print(f"  跳过: 标签已存在 ({existing_tags} 个)")
    
    # 导入类型
    if existing_genres == 0:
        for genre in tqdm(sorted(all_genres), desc="导入类型"):
            try:
                cursor.execute("INSERT INTO genres (name) VALUES (%s)", (genre,))
            except:
                pass
        conn.commit()
        print(f"  完成: 导入 {len(all_genres)} 个类型")
    else:
        print(f"  跳过: 类型已存在 ({existing_genres} 个)")
    
    cursor.close()


def import_relations(conn, csv_path='games_for_mysql.csv'):
    """导入关联表数据 - 智能跳过已存在的"""
    print("\n[3/5] 导入关联表...")
    
    # 检查已有数据
    existing_gt = check_table_count(conn, 'game_tags')
    existing_gg = check_table_count(conn, 'game_genres')
    
    if existing_gt > 0 and existing_gg > 0:
        print(f"  跳过: 已有 {existing_gt} 条标签关联, {existing_gg} 条类型关联")
        return
    
    df = pd.read_csv(csv_path)
    
    cursor = conn.cursor()
    
    # 获取所有游戏ID映射
    cursor.execute("SELECT id, appid FROM games")
    game_map = {str(row[1]): row[0] for row in cursor.fetchall()}
    
    # 获取所有标签ID映射
    cursor.execute("SELECT id, name FROM tags")
    tag_map = {row[1]: row[0] for row in cursor.fetchall()}
    
    # 获取所有类型ID映射
    cursor.execute("SELECT id, name FROM genres")
    genre_map = {row[1]: row[0] for row in cursor.fetchall()}
    
    # 准备关联数据
    game_tags = []
    game_genres = []
    
    for _, row in tqdm(df.iterrows(), total=len(df), desc="处理关联"):
        game_id = game_map.get(str(row['appid']))
        if not game_id:
            continue
        
        # 标签关联
        if existing_gt == 0:
            tags = json.loads(row['tags']) if pd.notna(row['tags']) else []
            for tag in tags:
                tag_id = tag_map.get(tag)
                if tag_id:
                    game_tags.append((game_id, tag_id))
        
        # 类型关联
        if existing_gg == 0:
            genres = json.loads(row['genres']) if pd.notna(row['genres']) else []
            for genre in genres:
                genre_id = genre_map.get(genre)
                if genre_id:
                    game_genres.append((game_id, genre_id))
    
    # 批量导入标签关联
    if game_tags and existing_gt == 0:
        cursor.executemany(
            "INSERT IGNORE INTO game_tags (game_id, tag_id) VALUES (%s, %s)",
            game_tags
        )
        conn.commit()
        print(f"  完成: 导入 {len(game_tags)} 条游戏-标签关联")
    
    # 批量导入类型关联
    if game_genres and existing_gg == 0:
        cursor.executemany(
            "INSERT IGNORE INTO game_genres (game_id, genre_id) VALUES (%s, %s)",
            game_genres
        )
        conn.commit()
        print(f"  完成: 导入 {len(game_genres)} 条游戏-类型关联")
    
    cursor.close()


def import_developers_publishers(conn, csv_path='games_for_mysql.csv'):
    """导入开发商和发行商 - 智能跳过已存在的"""
    print("\n[4/5] 导入开发商和发行商...")
    
    # 检查已有数据
    existing_dev = check_table_count(conn, 'developers')
    existing_pub = check_table_count(conn, 'publishers')
    existing_gd = check_table_count(conn, 'game_developers')
    existing_gp = check_table_count(conn, 'game_publishers')
    
    if existing_dev > 0 and existing_pub > 0 and existing_gd > 0 and existing_gp > 0:
        print(f"  跳过: 已有 {existing_dev} 个开发商, {existing_pub} 个发行商")
        return
    
    df = pd.read_csv(csv_path)
    
    # 收集所有唯一的开发商和发行商
    all_developers = set()
    all_publishers = set()
    
    for _, row in tqdm(df.iterrows(), total=len(df), desc="收集开发商/发行商"):
        for dev in parse_list(row.get('developers')):
            if dev and str(dev).strip():
                all_developers.add(str(dev).strip()[:200])
        for pub in parse_list(row.get('publishers')):
            if pub and str(pub).strip():
                all_publishers.add(str(pub).strip()[:200])
    
    cursor = conn.cursor()
    
    # 导入开发商
    if existing_dev == 0:
        for dev_name in tqdm(sorted(all_developers), desc="导入开发商"):
            try:
                cursor.execute("INSERT INTO developers (name) VALUES (%s)", (dev_name,))
            except:
                pass
        conn.commit()
        print(f"  完成: 导入 {len(all_developers)} 个开发商")
    else:
        print(f"  跳过: 开发商已存在 ({existing_dev} 个)")
    
    # 导入发行商
    if existing_pub == 0:
        for pub_name in tqdm(sorted(all_publishers), desc="导入发行商"):
            try:
                cursor.execute("INSERT INTO publishers (name) VALUES (%s)", (pub_name,))
            except:
                pass
        conn.commit()
        print(f"  完成: 导入 {len(all_publishers)} 个发行商")
    else:
        print(f"  跳过: 发行商已存在 ({existing_pub} 个)")
    
    # 导入关联
    if existing_gd == 0 or existing_gp == 0:
        cursor.execute("SELECT id, appid FROM games")
        game_map = {str(row[1]): row[0] for row in cursor.fetchall()}
        
        cursor.execute("SELECT id, name FROM developers")
        dev_map = {row[1]: row[0] for row in cursor.fetchall()}
        
        cursor.execute("SELECT id, name FROM publishers")
        pub_map = {row[1]: row[0] for row in cursor.fetchall()}
        
        game_devs = []
        game_pubs = []
        
        for _, row in tqdm(df.iterrows(), total=len(df), desc="处理关联"):
            game_id = game_map.get(str(row['appid']))
            if not game_id:
                continue
            
            if existing_gd == 0:
                for dev_name in parse_list(row.get('developers')):
                    dev_id = dev_map.get(dev_name)
                    if dev_id:
                        game_devs.append((game_id, dev_id))
            
            if existing_gp == 0:
                for pub_name in parse_list(row.get('publishers')):
                    pub_id = pub_map.get(pub_name)
                    if pub_id:
                        game_pubs.append((game_id, pub_id))
        
        if game_devs and existing_gd == 0:
            cursor.executemany(
                "INSERT IGNORE INTO game_developers (game_id, developer_id) VALUES (%s, %s)",
                game_devs
            )
            conn.commit()
            print(f"  完成: 导入 {len(game_devs)} 条开发商关联")
        
        if game_pubs and existing_gp == 0:
            cursor.executemany(
                "INSERT IGNORE INTO game_publishers (game_id, publisher_id) VALUES (%s, %s)",
                game_pubs
            )
            conn.commit()
            print(f"  完成: 导入 {len(game_pubs)} 条发行商关联")
    
    cursor.close()


def update_statistics(conn):
    """更新统计数据"""
    print("\n[5/5] 更新统计数据...")
    
    cursor = conn.cursor()
    
    # 更新标签游戏数
    cursor.execute("""
        UPDATE tags t 
        SET game_count = (SELECT COUNT(*) FROM game_tags WHERE tag_id = t.id)
    """)
    
    # 更新类型游戏数
    cursor.execute("""
        UPDATE genres g 
        SET game_count = (SELECT COUNT(*) FROM game_genres WHERE genre_id = g.id)
    """)
    
    # 更新开发商游戏数
    cursor.execute("""
        UPDATE developers d 
        SET game_count = (SELECT COUNT(*) FROM game_developers WHERE developer_id = d.id)
    """)
    
    # 更新发行商游戏数
    cursor.execute("""
        UPDATE publishers p 
        SET game_count = (SELECT COUNT(*) FROM game_publishers WHERE publisher_id = p.id)
    """)
    
    conn.commit()
    cursor.close()
    
    print("  完成: 统计数据已更新")


def main():
    """主函数"""
    print("="*60)
    print("Steam游戏数据导入MySQL (智能跳过已存在数据)")
    print("="*60)
    
    print("\n请确保:")
    print("  1. MySQL服务已启动")
    print("  2. 已创建数据库 steam_games")
    print("  3. 已执行 database_schema.sql 创建表")
    print("  4. 已修改 DB_CONFIG 中的密码")
    
    try:
        conn = get_connection()
        print("\n[OK] 数据库连接成功")
        
        # 执行导入
        import_games(conn)
        import_tags_and_genres(conn)
        import_relations(conn)
        import_developers_publishers(conn)
        update_statistics(conn)
        
        conn.close()
        
        print("\n" + "="*60)
        print("数据导入完成！")
        print("="*60)
        
    except Exception as e:
        print(f"\n[ERROR] 导入失败: {e}")
        raise


if __name__ == '__main__':
    main()
