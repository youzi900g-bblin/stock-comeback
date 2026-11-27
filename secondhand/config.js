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
  STYLE_TAGS: ["可愛", "優雅", "哥德", "vintage", "街頭", "運動", "日系", "韓系", "極簡", "Y2K"],

  // ---- 創角選項 ----
  // 髮型：名稱取自系統設計的範例髮型，完整清單待定【佔位】
  HAIR_STYLES: [
    { id: "bob", name: "短鮑伯" },
    { id: "long", name: "長直髮" },
    { id: "buns", name: "丸子頭" },
  ],
  // 髮色：僅供色塊預覽【佔位值】
  HAIR_COLORS: { bob: "#4a3426", long: "#2a2230", buns: "#2f2420" },
  // 膚色：僅供色塊預覽【佔位值】（深棕 #8a5838 為文件標準色，其餘為佔位）
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
