/*
 * 《衣櫃塞不下》Overstuffed：集中設定檔
 *
 * 標示【佔位值】的數字都尚未決定，只是讓第一階段能跑起來，
 * 日後調整請只改這個檔案。標示【已定】的來自 docs/系統設計.md。
 */
const CONFIG = {
  // ---- 名稱（已定）----
  TITLE_ZH: "衣櫃塞不下",
  TITLE_EN: "Overstuffed",

  SAVE_KEY: "overstuffed-save-v1",

  // ---- 數值（全部為【佔位值】）----
  WARDROBE_CAPACITY: 20,   // 衣櫃初始容量（系統設計：初始 20 件，佔位值）
  START_MONEY: 0,          // 初始金錢【佔位值】
  MARKET_FACTOR: 1,        // 市場係數：第一階段固定為 1（計畫書已定）
  STALE_DAYS: 7,           // 滯銷提示天數【佔位值】（設計為 5 到 10 天，確切天數待定）

  // 等待天數 = 依「標價 ÷ 市場價」換算【佔位值】
  // 比率 <= 1 時最快 1 天；每高出 WAIT_STEP（比率）多等 1 天；至多 WAIT_MAX 天
  WAIT_MIN_DAYS: 1,        // 【佔位值】
  WAIT_STEP: 0.15,         // 【佔位值】
  WAIT_MAX_DAYS: 14,       // 【佔位值】
  PRICE_MIN: 1,            // 可標的最低價【佔位值】
  PRICE_SLIDER_MAX_RATIO: 3, // 滑桿上限＝市場價的幾倍【佔位值】
  PRICE_STEP_SMALL: 1,     // 加減按鈕的小步進【佔位值】
  PRICE_STEP_LARGE: 10,    // 加減按鈕的大步進【佔位值】
  HIGH_PRICE_RATIO: 1.5,   // 標價超過市場價幾倍時顯示「偏高」提示【佔位值】

  // ---- 風格標籤（已定，見系統設計第五節）----
  // 標籤屬於「衣服」，不屬於玩家角色；創角不選標籤。ITEM_TEMPLATES 的 tags 只能取自這份清單。
  STYLE_TAGS: ["可愛", "優雅", "哥德", "vintage", "街頭", "運動", "日系", "韓系", "極簡", "Y2K"],

  // ---- 創角選項 ----
  // 髮型：名稱取自系統設計的範例髮型，完整清單待定【佔位】
  HAIR_STYLES: [
    { id: "bob", name: "短鮑伯" },
    { id: "long", name: "長直髮" },
    { id: "buns", name: "丸子頭" },
    { id: "short", name: "短髮" },
    { id: "twin", name: "雙馬尾" },
    { id: "hpony", name: "高馬尾" },
    { id: "lpony", name: "低馬尾" },
    { id: "braids", name: "麻花辮" },
    { id: "wavy", name: "波浪長髮" },
    { id: "buzz", name: "平頭" },
  ],
  // 髮色與頭飾色：id 要與 tools/pixel_art/player.py 一致；color 只用於選鈕顯示【佔位色】
  HAIR_COLORS: [
    { id: "black", name: "黑", color: "#2a2230" }, { id: "darkbrown", name: "深棕", color: "#3a2418" },
    { id: "brown", name: "棕", color: "#6a4a32" }, { id: "chestnut", name: "栗紅", color: "#8c3c2c" },
    { id: "blonde", name: "金", color: "#d8b058" }, { id: "ginger", name: "薑橘", color: "#d06a28" },
    { id: "pink", name: "粉", color: "#e878a8" }, { id: "violet", name: "藍紫", color: "#5a5ab8" },
  ],
  HEADWEAR_COLORS: [
    { id: "red", name: "紅", color: "#d83a3a" }, { id: "white", name: "白", color: "#f4f1ea" },
    { id: "black", name: "黑", color: "#2a2430" }, { id: "blue", name: "藍", color: "#3a5a8a" },
    { id: "pink", name: "粉", color: "#f080b0" }, { id: "yellow", name: "黃", color: "#f8d838" },
  ],
  // 上衣、下身、五官：id 要與 tools/pixel_art/player.py 一致；名稱與配色取自基本款【佔位】。體型固定為中等，不開放選擇
  TOPS: [
    { id: "white", name: "白 T 恤" }, { id: "black", name: "黑 T 恤" },
    { id: "stripe", name: "條紋 T 恤" }, { id: "hoodie", name: "連帽 T" },
  ],
  BOTTOMS: [
    { id: "jeans", name: "牛仔褲" }, { id: "track", name: "運動長褲" }, { id: "pleat", name: "百褶裙" },
  ],
  EYES: [{ id: "closed", name: "瞇眼" }, { id: "normal", name: "一般" }, { id: "big", name: "大眼" }],
  MOUTHS: [{ id: "small", name: "小嘴" }, { id: "mid", name: "一般" }, { id: "wide", name: "大嘴" }],
  EYE_COLORS: [{ id: "brown", name: "深褐" }, { id: "blue", name: "藍" }, { id: "green", name: "綠" }, { id: "violet", name: "紫" }],
  HEADWEAR: [{ id: "none", name: "無" }, { id: "beret", name: "貝雷帽" }, { id: "bow", name: "蝴蝶結" }, { id: "cap", name: "網帽" }, { id: "star", name: "星星髮夾" }],
  // 隨機名字用的名單【佔位】，每個不超過 8 字
  RANDOM_NAMES: ["小雨", "小晴", "阿橘", "小米", "糖糖", "心心", "小柚", "莓莓", "芝芝", "嘟嘟", "小布", "阿福", "柚子", "小滿", "圓圓", "小棠", "咪咪", "阿秋", "小暖", "豆豆"],
  GLASSES: [{ id: "none", name: "無" }, { id: "round", name: "棕圓框" }, { id: "square", name: "黑方框" }, { id: "rimless", name: "無框" }, { id: "gold", name: "金絲" }, { id: "pink", name: "粉框" }, { id: "sun", name: "墨鏡" }],
  FRECKLES: [{ id: "off", name: "無" }, { id: "on", name: "有" }],
  DEFAULT_LOOK: { top: "white", bottom: "jeans", eyes: "normal", mouth: "mid", freckles: "off", headwear: "none", iris: "brown", glasses: "none", hairColor: "darkbrown", headwearColor: "red" },
  // 膚色：選鈕的顏色，要與 tools/pixel_art/player.py 的 SKIN_TONES 一致【佔位值】（深棕 #8a5838 為文件標準色，其餘為佔位）
  // 玩家圖由 tools/pixel_art/player.py 產生；髮色與預設服裝也定義在那裡（皆為佔位）
  SKIN_TONES: [
    { id: "s1", name: "淺", color: "#f1cfb4" },
    { id: "s2", name: "淺暖", color: "#e3b38e" },
    { id: "s3", name: "中", color: "#c68b62" },
    { id: "s4", name: "深棕", color: "#8a5838" },
    { id: "s5", name: "深", color: "#5f3b25" },
  ],

  // ---- 物品類型 ----
  CATEGORIES: ["全部", "上衣", "下身", "外套", "鞋子"],

  // ---- 基本款樣板（名稱取自設計的基本款，數值全部為【佔位值】）----
  // base：基礎價值；condition：狀況分級待定，先用「良好」
  ITEM_TEMPLATES: [
    { name: "白 T 恤", type: "上衣", tags: ["極簡"], base: 120, color: "#f4f1ea" },
    { name: "黑 T 恤", type: "上衣", tags: ["極簡", "街頭"], base: 130, color: "#2b2b30" },
    { name: "條紋 T 恤", type: "上衣", tags: ["日系"], base: 150, color: "#9db7d6" },
    { name: "連帽 T", type: "上衣", tags: ["街頭"], base: 250, color: "#e3b93c" },
    { name: "直筒牛仔褲", type: "下身", tags: ["極簡"], base: 300, color: "#5f7fa8" },
    { name: "運動長褲", type: "下身", tags: ["運動"], base: 200, color: "#4d4f58" },
    { name: "百褶裙", type: "下身", tags: ["可愛"], base: 220, color: "#d98aa6" },
    { name: "針織開襟衫", type: "外套", tags: ["優雅"], base: 280, color: "#c9a98a" },
    { name: "牛仔外套", type: "外套", tags: ["vintage"], base: 350, color: "#6c8bb3" },
    { name: "帆布鞋", type: "鞋子", tags: ["日系"], base: 180, color: "#eee6d6" },
  ],
  START_ITEM_COUNT: 20,    // 開場衣櫃件數：等於初始容量，呈現「爆滿」【佔位值】
};
