"""
Steam游戏数据清洗脚本
从JSON数据清洗并导出为MySQL可用格式
"""

import pandas as pd
import json
import re
from datetime import datetime
from pathlib import Path


class GameDataCleaner:
    """游戏数据清洗器"""
    
    def __init__(self):
        self.raw_df = None
        self.cleaned_df = None
        self.cleaning_report = []
        
    def load_data(self, json_path='games.json'):
        """加载JSON原始数据"""
        print("="*60)
        print("Steam游戏数据清洗工具")
        print("="*60)
        print("\n开始加载数据...")
        
        # 加载JSON
        with open(json_path, 'r', encoding='utf-8') as f:
            json_data = json.load(f)
        
        # 将dict转为list
        records = []
        for appid, game in json_data.items():
            game['appid'] = appid
            records.append(game)
        
        self.raw_df = pd.DataFrame(records)
        print(f"[OK] JSON数据加载完成: {len(self.raw_df)} 条记录")
        
        self.cleaning_report.append(f"原始数据: {len(self.raw_df)} 条记录")
        return self
    
    def remove_duplicates(self):
        """去重处理"""
        before = len(self.raw_df)
        self.raw_df = self.raw_df.drop_duplicates(subset=['appid'], keep='first')
        after = len(self.raw_df)
        removed = before - after
        print(f"\n[1/9] 去重处理: 删除 {removed} 条重复记录, 剩余 {after} 条")
        self.cleaning_report.append(f"去重: 删除 {removed} 条重复记录")
        return self
    
    def clean_release_date(self):
        """清洗发行日期：统一格式为 YYYY-MM-DD"""
        def parse_date(date_str):
            if pd.isna(date_str) or date_str == '' or str(date_str).lower() in ['nan', 'none']:
                return None
            
            date_str = str(date_str).strip()
            
            # 常见格式尝试
            formats = [
                '%b %d, %Y',      # Aug 1, 2023
                '%B %d, %Y',      # August 1, 2023
                '%d %b, %Y',      # 1 Aug, 2023
                '%Y-%m-%d',       # 2023-08-01
                '%Y/%m/%d',       # 2023/08/01
                '%Y',             # 2023
                '%b %Y',          # Aug 2023
                '%B %Y',          # August 2023
            ]
            
            for fmt in formats:
                try:
                    return pd.to_datetime(date_str, format=fmt)
                except:
                    continue
            
            # 如果都不匹配，尝试模糊解析
            try:
                return pd.to_datetime(date_str)
            except:
                return None
        
        self.raw_df['release_date'] = self.raw_df['release_date'].apply(parse_date)
        self.raw_df['release_date'] = pd.to_datetime(self.raw_df['release_date'], errors='coerce')
        self.raw_df['release_year'] = self.raw_df['release_date'].dt.year
        self.raw_df['release_month'] = self.raw_df['release_date'].dt.month
        
        valid_dates = self.raw_df['release_date'].notna().sum()
        print(f"[2/9] 日期清洗: {valid_dates}/{len(self.raw_df)} 条有效日期")
        return self
    
    def clean_price(self):
        """清洗价格数据"""
        self.raw_df['price'] = pd.to_numeric(self.raw_df['price'], errors='coerce').fillna(0)
        self.raw_df['is_free'] = (self.raw_df['price'] == 0)
        
        free_count = self.raw_df['is_free'].sum()
        print(f"[3/9] 价格清洗: {free_count} 个免费游戏, {len(self.raw_df) - free_count} 个付费游戏")
        return self
    
    def clean_owners(self):
        """清洗销量数据：将字符串区间转为数值"""
        def parse_owners(owner_str):
            if pd.isna(owner_str):
                return 0
            
            # 格式如: "0 - 20000" 或 "100000 - 200000"
            match = re.findall(r'(\d+)', str(owner_str))
            if match:
                numbers = [int(n) for n in match]
                return sum(numbers) // len(numbers)
            return 0
        
        if 'estimated_owners' in self.raw_df.columns:
            self.raw_df['estimated_owners_num'] = self.raw_df['estimated_owners'].apply(parse_owners)
        else:
            self.raw_df['estimated_owners_num'] = 0
        
        print(f"[4/9] 销量数据清洗完成")
        return self
    
    def clean_tags_genres(self):
        """清洗标签和类型"""
        def parse_tags(x):
            """tags 可能是字典格式 {'tag': count}，需要提取标签名"""
            if isinstance(x, list):
                return x
            elif isinstance(x, dict):
                return list(x.keys())  # 提取字典的键作为标签名
            else:
                return []
        
        def parse_list(x):
            """解析列表或逗号分隔的字符串"""
            if isinstance(x, list):
                return x
            elif isinstance(x, str):
                # 尝试解析 JSON 字符串
                try:
                    parsed = json.loads(x)
                    if isinstance(parsed, list):
                        return parsed
                    elif isinstance(parsed, dict):
                        return list(parsed.keys())
                except:
                    # 逗号分隔的字符串
                    return [item.strip() for item in x.split(',') if item.strip()]
                return []
            else:
                return []
        
        # 处理 tags（可能是字典格式）
        if 'tags' in self.raw_df.columns:
            self.raw_df['tags'] = self.raw_df['tags'].apply(parse_tags)
        else:
            self.raw_df['tags'] = [[] for _ in range(len(self.raw_df))]
        
        # 处理 genres 和 categories
        for col in ['genres', 'categories']:
            if col in self.raw_df.columns:
                self.raw_df[col] = self.raw_df[col].apply(parse_list)
            else:
                self.raw_df[col] = [[] for _ in range(len(self.raw_df))]
        
        # 计算标签数量
        self.raw_df['tag_count'] = self.raw_df['tags'].apply(len)
        
        tags_with_data = (self.raw_df['tag_count'] > 0).sum()
        genres_with_data = self.raw_df['genres'].apply(lambda x: len(x) > 0).sum()
        print(f"[5/9] 标签/类型解析完成: {tags_with_data} 条有标签, {genres_with_data} 条有类型")
        return self
    
    def clean_developers_publishers(self):
        """清洗开发商和发行商"""
        def parse_list(x):
            """解析列表格式（支持 JSON 和 Python 字面量）"""
            import ast
            if isinstance(x, list):
                return x
            elif isinstance(x, str):
                x = x.strip()
                if not x or x == '[]':
                    return []
                # 尝试 JSON 格式
                try:
                    parsed = json.loads(x)
                    if isinstance(parsed, list):
                        return parsed
                except:
                    pass
                # 尝试 Python 字面量格式（如 ['Valve']）
                try:
                    parsed = ast.literal_eval(x)
                    if isinstance(parsed, list):
                        return parsed
                except:
                    pass
                return []
            else:
                return []
        
        for col in ['developers', 'publishers']:
            if col in self.raw_df.columns:
                self.raw_df[col] = self.raw_df[col].apply(parse_list)
            else:
                self.raw_df[col] = [[] for _ in range(len(self.raw_df))]
        
        devs_with_data = self.raw_df['developers'].apply(lambda x: len(x) > 0).sum()
        pubs_with_data = self.raw_df['publishers'].apply(lambda x: len(x) > 0).sum()
        print(f"[6/9] 开发商/发行商解析完成: {devs_with_data} 条有开发商, {pubs_with_data} 条有发行商")
        return self
    
    def clean_languages(self):
        """清洗语言字段"""
        def parse_languages(lang_list):
            if not isinstance(lang_list, list):
                return []
            # 清理语言名称
            languages = []
            for lang in lang_list:
                if isinstance(lang, str):
                    # 移除括号内容
                    lang = re.sub(r'\([^)]*\)', '', lang).strip()
                    if lang:
                        languages.append(lang)
            return languages
        
        if 'supported_languages' in self.raw_df.columns:
            self.raw_df['languages_list'] = self.raw_df['supported_languages'].apply(parse_languages)
        else:
            self.raw_df['languages_list'] = [[] for _ in range(len(self.raw_df))]
        
        self.raw_df['language_count'] = self.raw_df['languages_list'].apply(len)
        
        print(f"[7/11] 语言字段清洗完成")
        return self
    
    def clean_scores(self):
        """清洗评分数据"""
        # 确保数值类型
        score_cols = ['metacritic_score', 'user_score', 'positive', 'negative', 'recommendations']
        for col in score_cols:
            if col in self.raw_df.columns:
                self.raw_df[col] = pd.to_numeric(self.raw_df[col], errors='coerce').fillna(0)
            else:
                self.raw_df[col] = 0
        
        # 计算好评率
        total = self.raw_df['positive'] + self.raw_df['negative']
        self.raw_df['positive_rate'] = (self.raw_df['positive'] / total * 100).fillna(0)
        self.raw_df['total_reviews'] = total
        
        print(f"[8/11] 评分数据清洗完成")
        return self
    
    def clean_playtime(self):
        """清洗游戏时长数据"""
        playtime_cols = ['average_playtime_forever', 'average_playtime_2weeks',
                        'median_playtime_forever', 'median_playtime_2weeks']
        
        for col in playtime_cols:
            if col in self.raw_df.columns:
                self.raw_df[col] = pd.to_numeric(self.raw_df[col], errors='coerce').fillna(0)
            else:
                self.raw_df[col] = 0
        
        print(f"[9/11] 游戏时长数据清洗完成")
        return self
    
    def clean_text_fields(self):
        """清洗文本字段"""
        # 注意: developers 和 publishers 是列表格式，不在这里处理
        text_cols = ['name', 'about_the_game', 
                     'short_description', 'header_image', 'website']
        
        for col in text_cols:
            if col in self.raw_df.columns:
                self.raw_df[col] = self.raw_df[col].astype(str).str.strip()
                self.raw_df[col] = self.raw_df[col].replace(['nan', 'None', ''], None)
            else:
                self.raw_df[col] = None
        
        # 删除名称缺失的记录
        before = len(self.raw_df)
        self.raw_df = self.raw_df[self.raw_df['name'].notna()]
        after = len(self.raw_df)
        
        print(f"[10/11] 文本字段清洗: 删除 {before - after} 条无名称记录")
        return self
    
    def select_final_columns(self):
        """选择最终需要的列"""
        final_columns = [
            'appid', 'name', 'release_date', 'release_year', 'release_month',
            'estimated_owners_num', 'peak_ccu', 'required_age', 'price', 'is_free',
            'developers', 'publishers', 'genres', 'categories', 'tags', 'tag_count',
            'languages_list', 'language_count',
            'metacritic_score', 'user_score', 'positive', 'negative', 
            'positive_rate', 'total_reviews', 'recommendations',
            'average_playtime_forever', 'average_playtime_2weeks',
            'median_playtime_forever', 'median_playtime_2weeks',
            'windows', 'mac', 'linux',
            'header_image', 'website', 'short_description'
        ]
        
        # 只保留存在的列
        existing_cols = [col for col in final_columns if col in self.raw_df.columns]
        self.cleaned_df = self.raw_df[existing_cols].copy()
        
        return self
    
    def generate_report(self):
        """生成清洗报告"""
        print("\n" + "="*60)
        print("数据清洗报告")
        print("="*60)
        
        for report in self.cleaning_report:
            print(f"  - {report}")
        
        print(f"\n最终数据: {len(self.cleaned_df)} 条记录, {len(self.cleaned_df.columns)} 个字段")
        
        # 数据质量统计
        print("\n数据质量统计:")
        print(f"  - 有发行日期的记录: {self.cleaned_df['release_date'].notna().sum()}")
        print(f"  - 有标签的记录: {(self.cleaned_df['tag_count'] > 0).sum()}")
        print(f"  - 有评分的记录: {(self.cleaned_df['total_reviews'] > 0).sum()}")
        print(f"  - 免费游戏: {self.cleaned_df['is_free'].sum()}")
        print(f"  - 付费游戏: {(~self.cleaned_df['is_free']).sum()}")
        
        # 年份分布
        year_min = self.cleaned_df['release_year'].min()
        year_max = self.cleaned_df['release_year'].max()
        if pd.notna(year_min) and pd.notna(year_max):
            print(f"\n发行年份范围: {int(year_min)} - {int(year_max)}")
        
        return self
    
    def save_cleaned_data(self, output_path='cleaned_games.csv'):
        """保存清洗后的数据（保留列表格式便于Python读取）"""
        self.cleaned_df.to_csv(output_path, index=False, encoding='utf-8-sig')
        print(f"\n[OK] 清洗数据已保存: {output_path}")
        return self
    
    def export_for_mysql(self, output_path='games_for_mysql.csv'):
        """导出适合MySQL导入的格式"""
        df_export = self.cleaned_df.copy()
        
        # 将列表类型转为JSON字符串
        list_columns = ['tags', 'genres', 'categories', 'languages_list', 'developers', 'publishers']
        for col in list_columns:
            if col in df_export.columns:
                df_export[col] = df_export[col].apply(
                    lambda x: json.dumps(x, ensure_ascii=False) if isinstance(x, list) else '[]'
                )
        
        # 布尔值转为0/1
        bool_columns = ['windows', 'mac', 'linux', 'is_free']
        for col in bool_columns:
            if col in df_export.columns:
                df_export[col] = df_export[col].astype(int)
        
        # 日期格式化
        if 'release_date' in df_export.columns:
            df_export['release_date'] = df_export['release_date'].dt.strftime('%Y-%m-%d')
            df_export['release_date'] = df_export['release_date'].fillna('')
        
        df_export.to_csv(output_path, index=False, encoding='utf-8-sig')
        print(f"[11/11] MySQL导入数据已保存: {output_path}")
        return df_export


def main():
    """主函数"""
    cleaner = GameDataCleaner()
    
    # 执行清洗流程
    (cleaner
     .load_data()
     .remove_duplicates()
     .clean_release_date()
     .clean_price()
     .clean_owners()
     .clean_tags_genres()
     .clean_developers_publishers()
     .clean_languages()
     .clean_scores()
     .clean_playtime()
     .clean_text_fields()
     .select_final_columns()
     .generate_report()
     .save_cleaned_data()
     .export_for_mysql())
    
    print("\n" + "="*60)
    print("数据清洗完成！")
    print("="*60)


if __name__ == '__main__':
    main()
