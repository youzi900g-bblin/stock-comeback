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
  // 整體行情（第二階段）：以類別（上衣、下身、外套、鞋子、包包）為單位的每日波動，全部為【佔位值】
  MARKET_TYPES: ["上衣", "下身", "外套", "鞋子", "包包"],
  MARKET_DAILY: 0.05,      // 每天每個類別隨機波動的幅度（±5%）
  MARKET_CAP: 0.15,        // 累積上下限（±15%）
  TIDY_AT: 2,             // 衣櫃件數不高於此值時，首頁換成「整理後」房間圖【佔位值】
  STALE_DAYS: 7,           // 滯銷提示天數【佔位值】（設計為 5 到 10 天，確切天數待定）

  // 成交機率：每天結算時，每件上架的衣服各抽一次；機率看「標價 ÷ 市場價」，標價越低、當天賣掉的機率越高
  // 分段表：[比率上限, 每天成交機率]，由小到大【佔位值】
  SALE_CHANCE: [[0.7, 0.9], [0.85, 0.83], [1.0, 0.77], [1.15, 0.7], [1.3, 0.5], [1.5, 0.3], [Infinity, 0.1]],
  // ---- 新手任務（教學結束後依序出現）----
  QUESTS: [
    { id: "listAll", title: "把待售衣服全部上架", desc: "衣櫃裡還有要賣的衣服，一件一件標價上架。" },
    { id: "nextDay", title: "進入下一天", desc: "回首頁按「進入下一天」，看買家有沒有成交。" },
    { id: "ship", title: "包好並出貨一件商品", desc: "成交的商品要包貨出貨才會收到錢。首頁有「待出貨」時，按「去包貨」。還沒成交就再進入下一天。" },
    { id: "review", title: "讓賣場獲得一次好評", desc: "標價不高過市場價，買家收到貨滿意就會留好評。包貨出貨時就會看到評價。" },
    { id: "buy", title: "到社群買一件衣服", desc: "刷新社群，挑一件開價比市場價低的買下來。" },
    { id: "bargain", title: "在社群議價成功一次", desc: "社群貼文的「還價」按鈕：出價越接近開價，賣家越容易答應。每則只有一次機會。" },
    { id: "repair", title: "修補一件有瑕疵的衣服", desc: "有瑕疵的衣服修好之後基礎價值會變高。到衣櫃點它，按「修補」。" },
  ],
  // 新手任務的 NPC 私訊（【佔位台詞】，待使用者改寫）；face＝「三個臉.png」裡由左到右的位置
  QUEST_NPC: {
    ship: { npc: "由奈", face: 2, text: "成交了！東西要包好寄出去，錢才會進帳。去首頁的「待出貨」包貨吧。" },
    review: { npc: "伊瑪", face: 0, text: "賣東西要的是口碑。價格別開太貴，買家收到貨滿意就會留好評。" },
    buy: { npc: "由奈", face: 2, text: "欸，社群上有人在出清衣服，一起去逛逛？挑一件開價比市場價低的。" },
    bargain: { npc: "伊瑪", face: 0, text: "買東西不殺價怎麼行？去社群試試「還價」，出價別太低，賣家比較肯答應。" },
    repair: { npc: "艾蓮娜", face: 1, text: "有瑕疵的衣服修一修，價值會變高。你衣櫃裡有的話，試著修補看看。" },
  },

  // ---- 賣場評價（第二階段第 6 段，全部為【佔位值】，買家留言也是佔位文案）----
  REVIEW_START: 30,        // 評價分數起始值（每 10 分一顆星，起始 3 顆）
  REVIEW_MAX: 50,          // 分數上限（5 顆星）
  REVIEW_RULE: [[1.0, 2], [1.15, 1], [Infinity, -1]],   // 出貨時，賣價÷市場價 ≤ 門檻 → 加減分數（≥2 好評、1 普通、負數差評）
  REVIEW_CHANCE_MAX: 0.1,  // 評價對每天成交機率的最大影響：5 顆星 +10 個百分點、1 顆星 −10 個百分點，3 顆星不變
  BUYER_COMMENTS: {
    good: ["東西跟描述一樣，包得很仔細，五顆星！", "價格很公道，下次還會來。", "出貨很快，謝謝！"],
    ok: ["收到了，普通。", "價格有點高，但東西還可以。"],
    bad: ["比想像中貴，不太划算。", "價格偏高，不太推薦。"],
  },
  // ---- NPC 簡單任務（第二階段末，全部為【佔位內容】，任務條件、台詞與獎勵格數都待使用者決定）----
  // 出現條件：新手任務全部完成，且天數 ≥ appearDay。goal.type：bargained（社群議價成功 n 次）、boughtTag（買下帶任一標籤的衣服 n 件）
  NPC_TASKS: [
    { id: "imma1", npc: "伊瑪", face: 0, appearDay: 3, title: "幫伊瑪殺價兩次", intro: "社群的價格都太高了。你去幫我殺價，成功兩次再來找我。", done: "不錯嘛，你很會殺價！", goal: { type: "bargained", n: 2 }, reward: { capacity: 1 } },
    { id: "elena1", npc: "艾蓮娜", face: 1, appearDay: 5, title: "替艾蓮娜找古著", intro: "我在找帶有古著或優雅風格的衣服。社群上看到的話，幫我買一件。", done: "眼光真好，這件我很喜歡。", goal: { type: "boughtTag", tags: ["vintage", "優雅"], n: 1 }, reward: { capacity: 1 } },
    { id: "yuna1", npc: "由奈", face: 2, appearDay: 7, title: "陪由奈逛社群", intro: "一起逛社群吧！幫我買一件可愛風格的衣服。", done: "謝謝你陪我逛，好開心。", goal: { type: "boughtTag", tags: ["可愛"], n: 1 }, reward: { capacity: 1 } },
  ],
  // 教學完成獎勵（基礎價值 200 為【佔位值】）
  TUTORIAL_REWARD: { name: "聖誕毛衣", type: "上衣", tags: ["可愛"], base: 200, color: "#c43a3a" },
  // 瑕疵說明（草案，待使用者確認）：每件瑕疵貨隨機一句
  FLAW_NOTES: ["袖口有一點污漬", "縫線有些鬆脫", "有輕微起毛球", "整體有點褪色", "領口有點變形", "有一小塊勾紗"],

  // ---- 議價（第二階段第 4 段，全部為【佔位值】）----
  HAGGLE_CHANCE: 0.4,      // 本來會成交的商品，改成「買家殺價」的機率
  HAGGLE_OFFER: [[1.0, 0.9], [1.15, 0.85], [1.3, 0.8], [Infinity, 0.7]],   // 標價÷市場價 ≤ 門檻 → 買家出價占標價的比例
  HAGGLE_COUNTER: [[0, 0.95], [0.5, 0.9], [1, 0.2]],   // 還價位置（0＝買家出價，1＝標價）→ 成功率，線性內插
  HAGGLE_BUY: [[0.9, 0.85], [0.8, 0.55], [0.7, 0.25], [0, 0.05]],   // 向社群賣家出價：出價÷開價 ≥ 門檻 → 成功率
  HAGGLE_BUY_MIN: 0.5,     // 向社群賣家最低可出價（占開價）
  HAGGLE_BUY_DEFAULT: 0.9, // 出價視窗的預設出價（占開價）

  // ---- 整理修補（第二階段第 3 段，全部為【佔位值】）----
  COND_FACTOR: { "有瑕疵": 0.6, "良好": 1.0, "全新": 1.3 },  // 狀況對基礎價值的係數；基礎樣板的 base 是「良好」的價值
  REPAIR_RATE: 0.2,        // 修補費＝良好基礎價值的 20%【佔位值】
  REPAIR_MIN: 5,           // 修補費下限【佔位值】
  REPAIR_SLOTS: 2,         // 同時最多整理幾件【佔位值】
  FLAW_CHANCE: 0.25,       // 社群貨有瑕疵的機率【佔位值】
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
    { id: "xmas", name: "聖誕毛衣", reward: true },   // reward：教學完成獎勵專用，不出現在創角與社群
  ],
  BOTTOMS: [
    { id: "jeans", name: "直筒牛仔褲" }, { id: "flare", name: "喇叭牛仔褲" }, { id: "ripped", name: "破洞牛仔褲" }, { id: "shorts", name: "牛仔短褲" },
    { id: "track", name: "運動長褲" }, { id: "pleat", name: "百褶裙" },
  ],
  EYES: [{ id: "closed", name: "瞇眼" }, { id: "normal", name: "一般" }, { id: "big", name: "大眼" }],
  MOUTHS: [{ id: "small", name: "小嘴" }, { id: "mid", name: "一般" }, { id: "wide", name: "大嘴" }],
  EYE_COLORS: [{ id: "brown", name: "深褐" }, { id: "blue", name: "藍" }, { id: "green", name: "綠" }, { id: "violet", name: "紫" }],
  HEADWEAR: [{ id: "none", name: "無" }, { id: "beret", name: "貝雷帽" }, { id: "bow", name: "蝴蝶結" }, { id: "cap", name: "網帽" }, { id: "star", name: "星星髮夾" }],
  // 隨機名字用的名單【佔位】，每個不超過 8 字
  RANDOM_NAMES: ["小雨", "小晴", "阿橘", "小米", "糖糖", "心心", "小柚", "莓莓", "芝芝", "嘟嘟", "小布", "阿福", "柚子", "小滿", "圓圓", "小棠", "咪咪", "阿秋", "小暖", "豆豆"],
  SHOES: [{ id: "canvas", name: "帆布鞋" }, { id: "sneaker", name: "運動鞋" }, { id: "boot", name: "短靴" }, { id: "sandal", name: "涼鞋" }],
  SOCKS: [{ id: "none", name: "無" }, { id: "short", name: "短襪" }, { id: "long", name: "長襪" }, { id: "stripe", name: "條紋襪" }],
  JACKETS: [{ id: "none", name: "無" }, { id: "cardigan", name: "針織開襟衫" }, { id: "denim", name: "牛仔外套" }, { id: "sport", name: "運動外套" }],
  BAGS: [{ id: "none", name: "無" }, { id: "cross", name: "斜背包" }, { id: "tote", name: "托特包" }, { id: "pack", name: "後背包" }],
  ONOFF: [{ id: "off", name: "無" }, { id: "on", name: "有" }],
  GLASSES: [{ id: "none", name: "無" }, { id: "round", name: "棕圓框" }, { id: "square", name: "黑方框" }, { id: "rimless", name: "無框" }, { id: "gold", name: "金絲" }, { id: "pink", name: "粉框" }, { id: "sun", name: "墨鏡" }],
  FRECKLES: [{ id: "off", name: "無" }, { id: "on", name: "有" }],
  DEFAULT_LOOK: { top: "white", bottom: "jeans", eyes: "normal", mouth: "mid", freckles: "off", headwear: "none", iris: "brown", glasses: "none", hairColor: "darkbrown", headwearColor: "red",
    shoes: "canvas", shoesColor: "white", socks: "none", socksColor: "white", jacket: "none", bag: "none", bagColor: "blue",
    earring: "off", necklace: "off", bracelet: "off" },
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
  CATEGORIES: ["全部", "上衣", "下身", "外套", "鞋子", "包包"],

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
  // ---- 林（作者彩蛋）的任務鏈（全部為【佔位】：出現天數、目標數字、獎勵、台詞都待使用者決定）----
  // LIN_DRAFT 為 true 時，只有網址加 ?draft 才看得到林；使用者通過內容後改為 false。
  // goal.type：sold＝接任務後累計賣出件數；money＝目前金錢；free＝衣櫃空出的格數
  LIN_DRAFT: true,
  LIN_QUESTS: [
    { id: "lin1", appearDay: 3, goal: { type: "sold", n: 3 }, reward: { money: 100 },
      intro: "你的衣櫃看起來很擠。先試著賣出三件，不用急著挑最貴的。",
      done: "三件都賣出去了。讓衣服被人穿走，比放在衣櫃裡好。這是一點心意。" },
    { id: "lin2", appearDay: 6, goal: { type: "money", n: 800 }, reward: { money: 200 },
      intro: "賣了幾件之後，手邊的錢開始有用了。先存到 $800，之後收貨需要本金。",
      done: "存下來了。錢不用全花掉，留一點給下一次。" },
    { id: "lin3", appearDay: 9, goal: { type: "free", n: 16 }, reward: { money: 300 },
      intro: "衣櫃還是太滿。清到只剩四件，空間要留給真正想穿的。",
      done: "空出來的位置，之後會有更好的東西住進去。" },
  ],
  LIN_ALL_DONE: "目前只有這些。之後再見。", // 【佔位台詞】
  // 創角選的衣物會成為開場衣櫃的前幾件（上衣、下身、外套、鞋子、包包；選「無」就不產生），其餘用基本款補滿【佔位】
  // 沒有對應基本款樣板的款式，基礎價值與標籤沿用同類型的第一個樣板；顏色用 PICK_COLORS，鞋與包用創角選的顏色
  PICK_FALLBACK: { 下身: "直筒牛仔褲", 外套: "針織開襟衫", 鞋子: "帆布鞋" },
  PICK_COLORS: { flare: "#5f7fa8", ripped: "#5f7fa8", shorts: "#6c8bb3", sport: "#4d4f58" },
  BAG_BASE: 200,           // 包包的基礎價值【佔位值】，目前還沒有包包的基本款樣板
  // ---- 社群收貨（第二階段第 1 段，全部為【佔位值】）----
  // 貨源＝目前所有（已通過的）款式，之後新增款式會自動進貨源
  SOCIAL_REFRESHES: 5,     // 每天可刷新次數（設計：約 5 次，確切次數待定）【佔位值】
  SOCIAL_BATCH: 4,         // 每次刷新出現的件數【佔位值】
  SOCIAL_PRICE_MIN: 0.6,   // 開價 = 市場價 × 係數（隨機，範圍如下）【佔位值】
  SOCIAL_PRICE_MAX: 1.4,   // 【佔位值】
  SOCIAL_PRICE_ROUND: 10,  // 開價四捨五入到幾元【佔位值】
  // 社群貼文的賣家、文案、頭像色（全部為【佔位】示意內容，之後由使用者決定）
  SOCIAL_HANDLES: ["@mimi_vintage", "@littlecloud", "@shoes_lab", "@momo_closet", "@sunny_swap", "@hazel_thrift", "@pocket_pie", "@kiki_reuse"],
  SOCIAL_LINES: ["搬家清衣櫃，這件只穿過兩次。", "朋友送的，尺寸不合，便宜出。", "整理衣櫃找到的，沒穿過幾次。", "換季出清。", "買重複了，讓給有緣人。", "狀況良好，一直好好收著。"],
  SOCIAL_COLORS: ["#c85088", "#3a5a8a", "#1f6b45", "#8a5838", "#5a5ab8", "#a8461f"],
  // ---- 流行與標籤（第二階段第 2 段，全部為【佔位值】）----
  SEASON_DAYS: 7,          // 幾天換一季【佔位值】
  SEASON_UP: 0.3,          // 流行標籤的市場價加成【佔位值】
  SEASON_DOWN: -0.2,       // 退燒標籤的市場價加成【佔位值】
  START_ITEM_COUNT: 5,     // 開場衣櫃件數：創角選的衣物優先，不足就隨機補基本款；教學要把這幾件全部上架【佔位值】
};
