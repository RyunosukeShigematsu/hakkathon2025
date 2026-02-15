-- 1. ユーザーテーブル
CREATE TABLE users (
    user_id VARCHAR(50) PRIMARY KEY, -- 既存のapp.jsのIDと紐付け
    name VARCHAR(100),
    age INT,
    gender ENUM('male', 'female', 'other', 'unknown'),
    preference_tags TEXT,           -- JSON形式などで「カフェ,肉,ワイン」等を保存
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 店舗テーブル
CREATE TABLE stores (
    store_id INT AUTO_INCREMENT PRIMARY KEY,
    store_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),           -- イタリアン、居酒屋、カフェ等
    avg_price_range INT,            -- 平均客単価
    location_detail VARCHAR(255)    -- レンガ坂内の位置など
);

-- 3. レシート・来店履歴テーブル
CREATE TABLE receipts (
    receipt_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50),
    store_id INT,
    total_amount INT,
    visit_time DATETIME,            -- レシートから抽出した来店日時
    image_url VARCHAR(255),         -- S3などの画像URL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (store_id) REFERENCES stores(store_id)
);

-- 4. クーポン・マッチングログテーブル
CREATE TABLE coupons (
    coupon_id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT,
    title VARCHAR(100),
    discount_amount INT,
    -- クーポン側の特徴（マッチング用メタデータ）
    target_age_min INT,
    target_age_max INT,
    target_gender ENUM('male', 'female', 'all') DEFAULT 'all',
    target_time_slot VARCHAR(50),   -- 'night', 'lunch' 等
    
    -- 分析用フラグ
    user_id VARCHAR(50),            -- 誰に提示したか
    is_selected BOOLEAN DEFAULT FALSE, -- 3択の中から選ばれたか
    is_used BOOLEAN DEFAULT FALSE,     -- 実際に使用されたか
    presented_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (store_id) REFERENCES stores(store_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);