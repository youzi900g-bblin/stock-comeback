/* 《衣櫃塞不下》第一階段：創角、衣櫃、上架、每日結算、教學、存檔。
 * 所有數值來自 config.js（皆為佔位值）。 */
(function () {
  "use strict";
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";   // 重新載入一律從最上面開始，不沿用舊的捲動位置
  const C = CONFIG;
  const app = document.getElementById("app");

  // ---------- 存檔 ----------
  let S = load();
  let view = S ? "home" : "create";
  let cat = "全部";
  let layout = "grid"; // 衣櫃顯示：grid 或 list
  let modal = null;    // {type, ...}
  let toast = "";
  let flashMoney = false;
  const fmtMoney = (n) => (n >= 1000 ? (Math.floor(n / 10) / 100).toFixed(2) + "K" : String(n));   // 1000 以上顯示 1.25K（小數第二位，捨去）
  let draft = { name: "", hair: C.HAIR_STYLES[0].id, skin: C.SKIN_TONES[1].id, ...C.DEFAULT_LOOK };

  function load() {
    try {
      const raw = localStorage.getItem(C.SAVE_KEY);
      const s = raw ? JSON.parse(raw) : null;
      if (s && s.tutorial === "market") s.tutorial = "done"; // 舊版卡住的狀態
      if (s && s.tutorial === "sell") s.tutorial = "pick";   // 舊版教學狀態對應新版
      if (s && ["backStock", "rest", "wait", "social", "refresh", "read", "buy", "fixGo", "fixPick", "fixDo"].includes(s.tutorial)) { s.tutorial = "done"; s.quest = 0; s.questV = 2; }   // 這些步驟已改成任務
      if (s && typeof s.quest === "number" && s.quest < 99 && (s.questV || 0) < 2) {   // 任務表改版：第 3 個新增「出貨」（v1），再於「出貨」後新增「好評」（v2）
        if (!s.questV && s.quest >= 2) s.quest += 1;
        if (s.quest >= 3) s.quest += 1;
        s.questV = 2;
      }
      return s;
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(C.SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 儲存失敗時略過 */ }
  }
  const settings = () => (S && S.settings) || {};
  function applyContrast() { document.body.classList.toggle("contrast", !!settings().contrast); }

  // ---------- 規則 ----------
  // 單一標籤的加成：流行 +、退燒 −，其餘 0
  const tagCoef = (t) => (S.season && S.season.up === t ? C.SEASON_UP : S.season && S.season.down === t ? C.SEASON_DOWN : 0);
  // 多標籤合併：各標籤加成取平均（沒影響的標籤算 0），互相調和
  const trendOf = (it) => (S.season && S.tutorial === "done" && it.tags.length ? it.tags.reduce((a, t) => a + tagCoef(t), 0) / it.tags.length : 0);
  // 基礎價值＝良好狀況的價值 × 狀況係數（有瑕疵 0.6）；修補一級就回到良好
  const valueOf = (it) => Math.round(it.base * (C.COND_FACTOR[it.condition] || 1));
  const marketAdj = (it) => (S && S.market && tutDone() && S.market[it.type]) || 0;   // 整體行情：該類別今天的漲跌（−0.15 到 +0.15）
  const marketPrice = (it) => Math.round(valueOf(it) * C.MARKET_FACTOR * (1 + trendOf(it)) * (1 + marketAdj(it)));
  const pctText = (a) => { const n = Math.round(a * 100); return n > 0 ? `▲${n}%` : n < 0 ? `▼${-n}%` : "持平"; };
  const repairCost = (it) => Math.max(C.REPAIR_MIN, Math.round(it.base * C.REPAIR_RATE));
  const fixingCount = () => S.wardrobe.filter((i) => i.fixing).length;
  // 每天成交機率（分段表在 config.js 的 SALE_CHANCE）
  // 賣場評價：分數每 10 分一顆星（至少 1 顆）；星星影響每天成交機率
  const reviewScore = () => (S && S.review && typeof S.review.score === "number" ? S.review.score : C.REVIEW_START);
  const reviewStars = () => Math.min(5, Math.max(1, Math.floor(reviewScore() / 10)));
  const reviewBonus = () => ((reviewStars() - 3) / 2) * C.REVIEW_CHANCE_MAX;
  const saleChance = (price, it) => { const r = price / marketPrice(it); return Math.min(1, Math.max(0, (C.SALE_CHANCE.find(([max]) => r <= max) || [0, 0.03])[1] + reviewBonus())); };
  const chanceLabel = (p) => (p >= 0.75 ? "很高" : p >= 0.5 ? "高" : p >= 0.25 ? "中" : p >= 0.1 ? "低" : "很低");
  const chanceText = (price, it) => { const p = saleChance(price, it); return `${chanceLabel(p)}（約 ${Math.round(p * 100)}%）`; };
  // 議價：買家出價、還價成功率、向賣家出價成功率（表在 config.js 的 HAGGLE_*）
  const haggleOffer = (l) => { const r = l.price / marketPrice(l.item), f = C.HAGGLE_OFFER.find(([m]) => r <= m)[1]; return Math.max(C.PRICE_MIN, Math.round(l.price * f)); };
  const counterChance = (offer, ask, p) => {
    const t = ask > offer ? Math.min(1, Math.max(0, (p - offer) / (ask - offer))) : 1, T = C.HAGGLE_COUNTER;
    for (let k = 1; k < T.length; k++) if (t <= T[k][0]) return T[k - 1][1] + (T[k][1] - T[k - 1][1]) * (t - T[k - 1][0]) / (T[k][0] - T[k - 1][0]);
    return T[T.length - 1][1];
  };
  const buyChance = (price, ask) => (C.HAGGLE_BUY.find(([m]) => price / ask >= m) || [0, 0])[1];
  const pct = (p) => Math.round(p * 100) + "%";
  const tutDone = () => S.tutorial === "done";
  const socialOpen = () => tutDone();
  const findItem = (id) => S.wardrobe.find((i) => i.id === id);

  // ---------- 林的任務鏈（內容為佔位，見 config.js）----------
  const linOn = () => !C.LIN_DRAFT || new URLSearchParams(location.search).has("draft");
  const linState = () => (S.lin = S.lin || { q: 0, phase: "offer", base: 0 });
  const linQuest = () => C.LIN_QUESTS[linState().q];
  const linVisible = () => linOn() && S && tutDone() && !!linQuest() && S.day >= linQuest().appearDay;
  function linProgress(q) {
    const g = q.goal;
    const cur = g.type === "sold" ? (S.stats ? S.stats.sold : 0) - linState().base
      : g.type === "money" ? S.money : C.WARDROBE_CAPACITY - S.wardrobe.length;
    return [Math.max(0, cur), g.n];
  }
  const linGoalText = (g) => g.type === "sold" ? `賣出 ${g.n} 件` : g.type === "money" ? `金錢達到 $${g.n}` : `衣櫃空出 ${g.n} 格`;

  // 創角選的衣物 → 開場衣櫃的前幾件（規則見 config.js 的 PICK_*）
  // 款式 → 物品：有對應基本款樣板就沿用其基礎價值與標籤，沒有就沿用同類型第一個樣板（規則見 config.js 的 PICK_*）
  const T = (name) => C.ITEM_TEMPLATES.find((t) => t.name === name);
  const hexOf = (id) => (C.HEADWEAR_COLORS.find((x) => x.id === id) || {}).color || "#cccccc";
  function styleItem(type, o, color) {
    const exact = T(o.name), tpl = exact || (C.PICK_FALLBACK[type] ? T(C.PICK_FALLBACK[type]) : null);
    const col = type === "鞋子" || type === "包包" ? color : exact ? exact.color : C.PICK_COLORS[o.id];
    return { name: o.name, type, tags: tpl ? tpl.tags : [], condition: "良好", base: tpl ? tpl.base : C.BAG_BASE, cost: 0, color: col, kept: false };
  }
  // 創角選的衣物 → 開場衣櫃的前幾件
  function starterPicks(p) {
    const pick = (list, id) => list.find((o) => o.id === id);
    const out = [];
    const tp = pick(C.TOPS, p.top), bt = pick(C.BOTTOMS, p.bottom), sh = pick(C.SHOES, p.shoes);
    const jk = p.jacket !== "none" && pick(C.JACKETS, p.jacket), bg = p.bag !== "none" && pick(C.BAGS, p.bag);
    if (tp) out.push(styleItem("上衣", tp));
    if (bt) out.push(styleItem("下身", bt));
    if (jk) out.push(styleItem("外套", jk));
    if (sh) out.push(styleItem("鞋子", sh, hexOf(p.shoesColor)));
    if (bg) out.push(styleItem("包包", bg, hexOf(p.bagColor)));
    return out;
  }

  // ---------- 社群收貨 ----------
  const socialState = () => (S.social = S.social || { left: C.SOCIAL_REFRESHES, offers: [], seq: 0 });
  const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function socialPool() {
    const lv = (list) => list.filter((o) => (!o.draft || DRAFT_MODE) && !o.reward);
    const col = () => rnd(C.HEADWEAR_COLORS).color;
    return [...lv(C.TOPS).map((o) => () => styleItem("上衣", o)), ...lv(C.BOTTOMS).map((o) => () => styleItem("下身", o)),
      ...lv(C.JACKETS).filter((o) => o.id !== "none").map((o) => () => styleItem("外套", o)),
      ...lv(C.SHOES).map((o) => () => styleItem("鞋子", o, col())), ...lv(C.BAGS).filter((o) => o.id !== "none").map((o) => () => styleItem("包包", o, col()))];
  }
  function refreshSocial() {
    const so = socialState();
    if (so.left <= 0) return;
    so.left -= 1;
    const pool = socialPool(), offers = [];
    for (let k = 0; k < C.SOCIAL_BATCH; k++) {
      const item = rnd(pool)();
      if (Math.random() < C.FLAW_CHANCE) { item.condition = "有瑕疵"; item.flaw = rnd(C.FLAW_NOTES); }
      const f = C.SOCIAL_PRICE_MIN + Math.random() * (C.SOCIAL_PRICE_MAX - C.SOCIAL_PRICE_MIN);
      const ask = Math.max(C.SOCIAL_PRICE_ROUND, Math.round(marketPrice(item) * f / C.SOCIAL_PRICE_ROUND) * C.SOCIAL_PRICE_ROUND);
      offers.push({ oid: ++so.seq, item, ask, who: rnd(C.SOCIAL_HANDLES), color: rnd(C.SOCIAL_COLORS), mins: 1 + Math.floor(Math.random() * 55),
        text: lineFor(item), likes: Math.floor(Math.random() * 16), cm: Math.floor(Math.random() * 5) });
    }
    const q = curQuest();
    if (q && (q.id === "buy" || q.id === "repair") && !S.wardrobe.some((i) => i.condition === "有瑕疵")) {   // 任務要修補：保證有一則有瑕疵、便宜、買得起的貨
      const R = C.SOCIAL_PRICE_ROUND, item = pool.map((f) => f()).sort((a, b) => marketPrice(a) - marketPrice(b))[0];
      item.condition = "有瑕疵"; item.flaw = rnd(C.FLAW_NOTES);
      const mk = marketPrice(item);
      const ask = Math.min(Math.max(R, Math.round(mk * 0.7 / R) * R), Math.max(R, Math.floor(Math.max(0, S.money - repairCost(item)) / R) * R));
      offers.unshift({ oid: ++so.seq, item, ask, who: rnd(C.SOCIAL_HANDLES), color: rnd(C.SOCIAL_COLORS), mins: 1, text: lineFor(item), likes: 8, cm: 1 });
      offers.length = C.SOCIAL_BATCH;
    }
    offers.sort((x, y) => x.mins - y.mins);
    so.offers = offers; // 沒買的貨隨刷新消失
    save(); render();
  }
  // 貼文文案：有瑕疵的貨不能寫「狀況良好」「沒穿過幾次」
  const lineFor = (item) => rnd(item.condition === "有瑕疵" ? C.SOCIAL_LINES.filter((s) => !/良好|沒穿過/.test(s)) : C.SOCIAL_LINES);
  const totalCount = () => S.wardrobe.length + (S.closet || []).length;   // 待售加私人，共用容量
  const nextItemId = () => 1 + Math.max(0, ...S.wardrobe.map((i) => i.id), ...(S.closet || []).map((i) => i.id), ...S.listings.map((l) => l.item.id));
  function endTutorial() {   // 教學結束：開放社群、開始第一季流行、開始新手任務
    S.tutorial = "done"; S.quest = 0; S.questV = 2; questGuide = false; rollSeason(); S.seen = { ...(S.seen || {}), season: true }; modal = { type: "tutReward" };
  }
  // 新手任務：依序一個個出現；S.quest 是目前第幾個（沒有這個欄位＝沒有任務，舊存檔就是這樣）
  let questGuide = false, questOpen = false;   // questOpen：任務卡的說明是否展開（預設收起）
  const QUEST_DONE = {
    listAll: () => S.wardrobe.every((i) => i.reward),   // 教學獎勵的衣服不要求上架
    nextDay: () => S.day >= 2,
    ship: () => ((S.stats && S.stats.shipped) || 0) >= 1,
    review: () => ((S.stats && S.stats.goodReviews) || 0) >= 1,
    buy: () => ((S.stats && S.stats.bought) || 0) >= 1,
    bargain: () => ((S.stats && S.stats.bargained) || 0) >= 1,
    repair: () => ((S.stats && S.stats.repaired) || 0) >= 1,
  };
  const curQuest = () => (S && tutDone() && typeof S.quest === "number" ? C.QUESTS[S.quest] : null);
  function questCheck() {
    if (!curQuest()) return;
    while (curQuest() && QUEST_DONE[curQuest().id]()) {
      const q = curQuest(); S.quest += 1; questGuide = false; questOpen = false;
      toast = `任務完成：${q.title}`; setTimeout(() => { if (toast.startsWith("任務完成")) { toast = ""; render(); } }, 2400);
    }
    if (!curQuest()) S.quest = C.QUESTS.length;
  }
  function shipCard() {
    const list = shippingList();
    if (!list.length) return "";
    const sum = list.reduce((a, s) => a + s.price, 0);
    return `<div class="tip shipline"><span><b>待出貨</b>　${list.length} 件・$${sum}</span><button class="btn small" id="pack-open">去包貨</button></div>`;
  }
  function questCard() {
    const q = curQuest();
    if (!q) return "";
    return `<div class="tip quest"><b>新手任務　${S.quest + 1}/${C.QUESTS.length}</b>　${esc(q.title)}${questOpen ? `<br><span class="muted">${esc(q.desc)}</span>` : ""}
      <div class="qbtns"><button class="btn small" id="quest-go">帶我去</button><button class="btn small alt" id="quest-more" aria-expanded="${questOpen}">${questOpen ? "收起說明" : "看說明"}</button></div></div>`;
  }
  function buyOffer(oid, price, silent) {
    const so = socialState(), o = so.offers.find((x) => x.oid === oid);
    if (price === undefined) price = o && o.ask;
    if (!o || S.money < price || totalCount() >= C.WARDROBE_CAPACITY) return;
    S.money -= price; flashMoney = true;
    const bought = { ...o.item, id: nextItemId(), cost: price };
    S.wardrobe.push(bought);
    so.offers = so.offers.filter((x) => x.oid !== oid);
    S.stats = S.stats || { sold: 0 }; S.stats.bought = (S.stats.bought || 0) + 1;
    save(); if (!silent) showToast(`已買下「${o.item.name}」$${price}`);
  }

  // 新遊戲：創角穿的衣物自動放進私人衣櫃並穿在身上；待售衣櫃是隨機的基本款
  function newGame(p) {
    const closet = starterPicks(p).map((it, i) => ({ id: i + 1, ...it }));
    const worn = {};
    closet.forEach((it) => { worn[SLOT_OF[it.type]] = it.id; });
    const have = new Set(closet.map((x) => x.name));
    const pool = C.ITEM_TEMPLATES.filter((t) => !have.has(t.name)).sort(() => Math.random() - 0.5);
    const wardrobe = pool.slice(0, C.START_ITEM_COUNT).map((t, k) => ({ id: closet.length + k + 1, name: t.name, type: t.type, tags: t.tags, condition: "良好",
      base: t.base, cost: 0, color: t.color, kept: false }));
    return { player: p, money: C.START_MONEY, day: 1, wardrobe, closet, worn, listings: [],
      tutorial: "goWardrobe", settings: { contrast: false }, social: { left: C.SOCIAL_REFRESHES, offers: [], seq: 0 }, stats: { sold: 0 } };
  }

  // 舊存檔：標為「留」的衣服搬進私人衣櫃，再把創角時穿的衣物補進私人衣櫃並穿上
  function ensureCloset() {
    if (!S || S.closet) return;
    S.closet = S.wardrobe.filter((i) => i.kept).map((i) => ({ ...i, kept: false }));
    S.wardrobe = S.wardrobe.filter((i) => !i.kept);
    S.worn = {};
    starterPicks(S.player || {}).forEach((it) => {
      const item = { ...it, id: nextItemId() };
      S.closet.push(item); S.worn[SLOT_OF[item.type]] = item.id;
    });
    save();
  }

  // 目前身上穿的：私人衣櫃裡穿著的衣物；沒穿的部位是內衣（白色吊嘎、黑色內褲、赤腳），外套與包包就是沒有
  function playerLook() {
    const w = S.worn || {}, get = (slot) => (S.closet || []).find((i) => i.id === w[slot]);
    const t = get("top"), b = get("bottom"), j = get("jacket"), s = get("shoes"), g2 = get("bag");
    const L = { ...S.player };
    L.top = t ? OPT[t.name] : "tank"; L.bottom = b ? OPT[b.name] : "brief"; L.jacket = j ? OPT[j.name] : "none";
    L.shoes = s ? OPT[s.name] : "bare"; L.shoeHex = s ? s.color : null;
    L.bag = g2 ? OPT[g2.name] : "none"; L.bagHex = g2 ? g2.color : null;
    if (!s) L.socks = "none";
    return L;
  }

  // 換季：隨機挑 1 個流行與 1 個退燒標籤，不和上一季重複；標籤取自目前所有款式
  function rollSeason() {
    const tags = [...new Set(C.ITEM_TEMPLATES.flatMap((t) => t.tags))], prev = S.season || {};
    const up = rnd(tags.filter((t) => t !== prev.up));
    const down = rnd(tags.filter((t) => t !== prev.down && t !== up));
    S.season = { start: S.day, up, down };
  }

  function nextDay() {
    S.day += 1;
    S.social = { left: C.SOCIAL_REFRESHES, offers: [], seq: (S.social && S.social.seq) || 0 };
    const sales = [];
    const sell = (l) => { addShipping(l.item, l.price); sales.push({ name: l.item.name, price: l.price, item: l.item, buyer: S.shipping[S.shipping.length - 1].buyer }); };
    S.market = S.market || {};   // 整體行情：每個類別每天隨機波動，累積不超過上下限
    C.MARKET_TYPES.forEach((t) => { S.market[t] = Math.max(-C.MARKET_CAP, Math.min(C.MARKET_CAP, (S.market[t] || 0) + (Math.random() * 2 - 1) * C.MARKET_DAILY)); });
    S.haggles = [];
    S.listings = S.listings.filter((l) => {
      if (Math.random() < saleChance(l.price, l.item)) {   // 每件各抽一次
        const offer = haggleOffer(l);
        if (offer < l.price && Math.random() < C.HAGGLE_CHANCE) { S.haggles.push({ id: l.item.id, offer }); return true; }   // 買家殺價：商品留著，等玩家回應
        sell(l); return false;
      }
      return true;
    });
    S.stats = S.stats || { sold: 0 }; S.stats.sold += sales.length;
    const fixed = S.wardrobe.filter((i) => i.fixing);   // 整理中的衣服，隔天完成：提升一級（有瑕疵 → 良好）
    fixed.forEach((i) => { i.condition = "良好"; i.fixing = false; delete i.flaw; });
    modal = { type: "summary", sales, fixed: fixed.map((i) => i.name), haggles: S.haggles.length };
    if (S.season && S.day - S.season.start >= C.SEASON_DAYS) { rollSeason(); modal.season = S.season; }
    save(); render();
  }

  // 包貨出貨：成交後商品進「待出貨」，玩家包貨後才收到款項
  const shippingList = () => (S && S.shipping) || [];
  function addShipping(item, price) { S.shipping = shippingList(); S.shipping.push({ item, price, buyer: rnd(C.SOCIAL_HANDLES) }); }
  function packOne(idx) {
    const s = shippingList()[idx];
    if (!s) return;
    S.shipping.splice(idx, 1); S.money += s.price; flashMoney = true;
    S.stats = S.stats || { sold: 0 }; S.stats.shipped = (S.stats.shipped || 0) + 1;
    const r = s.price / marketPrice(s.item), delta = C.REVIEW_RULE.find(([m]) => r <= m)[1];   // 賣價越接近（低於）市場價，評價越好
    const kind = delta >= 2 ? "good" : delta > 0 ? "ok" : "bad";
    S.review = { score: Math.min(C.REVIEW_MAX, Math.max(0, reviewScore() + delta)) };
    if (kind === "good") S.stats.goodReviews = (S.stats.goodReviews || 0) + 1;
    save();
    return { buyer: s.buyer || "買家", kind, text: rnd(C.BUYER_COMMENTS[kind]) };
  }
  function completeSale(l, price) {   // 議價成交：商品進待出貨、下架、計入賣出件數
    addShipping(l.item, price); S.listings = S.listings.filter((x) => x !== l);
    S.stats = S.stats || { sold: 0 }; S.stats.sold += 1;
  }
  function openHaggle() {   // 依序處理待回應的買家殺價
    while (S.haggles && S.haggles.length) {
      const h = S.haggles[0], l = S.listings.find((x) => x.item.id === h.id);
      if (l) return { type: "haggle", item: l.item, offer: h.offer, ask: l.price, counter: Math.round((h.offer + l.price) / 2), result: null };
      S.haggles.shift();
    }
    return null;
  }
  function showToast(msg) {
    toast = msg; render();
    setTimeout(() => { if (toast === msg) { toast = ""; render(); } }, 1800);
  }

  // ---------- 工具 ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // 玩家圖由 tools/pixel_art/player.py 輸出圖層資料（art/player/face.js），網頁依 Z 順序用 SVG 疊出，27×53 格。
  // 邊線色的算法要與 tools/pixel_art/engine.py 的 dk、warm 相同。
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const toHex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
  const dk = (c) => [Math.min(255, Math.floor(c[0] * 0.6) + 4), Math.min(255, Math.floor(c[1] * 0.6 * 0.95)), Math.min(255, Math.floor(c[2] * 0.6) + 14)];
  const warm = (c) => [Math.floor(c[0] * 0.72), Math.floor(c[1] * 0.58), Math.floor(c[2] * 0.56)];
  const rect = (x, y, w, c) => `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${c}"/>`;
  const LEGACY_HAIR_COLOR = { bob: "darkbrown", long: "black", buns: "black", short: "darkbrown", twin: "brown" }; // 舊存檔沒有髮色時沿用當時的髮色
  const sprite = (p) => {
    const q = { ...C.DEFAULT_LOOK, ...p }, F = window.PLAYER_FACE, col = F.colors[`${q.hairColor || LEGACY_HAIR_COLOR[q.hair] || "darkbrown"}_${q.skin}`];
    const hairColor = q.hairColor || LEGACY_HAIR_COLOR[q.hair] || "darkbrown";
    const it = (id) => F.pal.item[id], hexPal = (h) => ({ base: h, hi: toHex(hiOf(rgb(h))), lo: toHex(loOf(rgb(h))) });
    const sc = q.shoeHex ? hexPal(q.shoeHex) : it(q.shoesColor), bc = q.bagHex ? hexPal(q.bagHex) : it(q.bagColor);   // 穿搭時鞋與包用衣物本身的顏色
    const pal = { ...F.pal.skin[q.skin], ...F.pal.hair[hairColor], ...F.pal.hw[q.headwearColor],
      shoe: sc.base, shoe_lo: sc.lo, sock: it(q.socksColor).base, sock_lo: it(q.socksColor).lo, bag: bc.base, bag_hi: bc.hi, bag_lo: bc.lo };
    const bt = F.pal.btype[q.bottom];
    const over = bt === "pants" && (q.bottom === "flare" || q.shoes === "boot"); // 喇叭褲與穿短靴的長褲，褲口蓋住鞋子
    const resolve = (spec) => {
      if (spec[0] === "#") return spec;
      const [role, op] = spec.split(":"), c = rgb(pal[role]);
      return toHex(op === "dk" ? dk(c) : op === "warm" ? warm(c) : c);
    };
    const layers = [...F.layers.base, ...F.layers["hair:" + q.hair], ...F.layers["top:" + q.top], ...(q.jacket !== "none" && F.layers["top:" + q.top + ":hoodover:" + q.jacket] ? F.layers["top:" + q.top + ":hoodover:" + q.jacket] : []), ...F.layers[over ? `bottom:${q.bottom}:over` : "bottom:" + q.bottom], ...F.layers[`shoes:${q.shoes}:${bt}`],
      ...(q.headwear === "none" ? [] : F.layers["hw:" + q.headwear]), ...(q.socks === "none" || bt !== "skirt" ? [] : F.layers["socks:" + q.socks]),
      ...(q.jacket === "none" ? [] : F.layers["jacket:" + q.jacket]), ...(q.bag === "none" ? [] : F.layers["bag:" + q.bag]),
      ...["earring", "necklace", "bracelet"].filter((k) => q[k] === "on").flatMap((k) => F.layers["jewel:" + k])].sort((a, b) => a.z - b.z);
    const body = layers.map((l) => { const cols = l.cols.map(resolve); return l.runs.map(([x, y, w, ci]) => rect(x, y, w, cols[ci])).join(""); }).join("");
    const cell = ([x, y, c]) => rect(x, y, 1, c);
    const face = [...F.geo.eyes[q.eyes], ...F.geo.nose, ...(q.freckles === "on" ? (q.eyes === "big" ? F.geo.freckles_big : F.geo.freckles) : F.geo.blush), ...F.geo.mouth[q.mouth]]
      .map(([x, y, r]) => rect(x, y, 1, r === "iris" ? F.iris[q.iris] : col[r])).join("");
    const gl = q.glasses === "none" ? "" : F.geo.glasses[q.glasses].map(cell).join("");
    return `<svg class="sprite" viewBox="0 0 27 53" role="img" aria-label="${esc(q.name || "你的角色")}">${body}${face}${gl}</svg>`;
  };
  // 衣物縮圖：取用角色圖層中該件衣物的格子（略過皮膚），依衣物顏色套色，裁到該件的範圍。找不到圖層就退回色塊。
  // 私人衣櫃與穿搭：物品類型 → 穿著部位；物品名稱 → 創角選項 id（用來取角色圖層）
  const SLOT_OF = { 上衣: "top", 下身: "bottom", 外套: "jacket", 鞋子: "shoes", 包包: "bag" };
  const OPT = (() => {
    const m = {};
    [C.TOPS, C.BOTTOMS, C.JACKETS, C.SHOES, C.BAGS].forEach((list) => list.forEach((o) => { if (o.id !== "none") m[o.name] = o.id; }));
    return m;
  })();
  const LAYER_KEY = (() => {
    const m = {};
    C.TOPS.forEach((o) => { m[o.name] = "top:" + o.id; });
    C.BOTTOMS.forEach((o) => { m[o.name] = "bottom:" + o.id; });
    C.JACKETS.forEach((o) => { if (o.id !== "none") m[o.name] = "jacket:" + o.id; });
    C.SHOES.forEach((o) => { m[o.name] = `shoes:${o.id}:pants`; });
    C.BAGS.forEach((o) => { if (o.id !== "none") m[o.name] = "bag:" + o.id; });
    return m;
  })();
  const hiOf = (c) => c.map((v) => Math.min(255, Math.floor(v * 1.28) + 8)), loOf = (c) => c.map((v) => Math.floor(v * 0.72));
  const thumbCache = {};
  // 衣物圖（只有 svg）。找不到圖層回傳 null
  function thumbSvg(i) {
    const F = window.PLAYER_FACE, key = LAYER_KEY[i.name], ls = key && F && F.layers[key];
    if (!ls) return null;
    const ck = key + i.color;
    if (!thumbCache[ck]) {
      const base = rgb(i.color), pal = { shoe: i.color, shoe_lo: toHex(loOf(base)), bag: i.color, bag_hi: toHex(hiOf(base)), bag_lo: toHex(loOf(base)) };
      const resolve = (spec) => {
        if (spec[0] === "#") return spec;
        if (spec.startsWith("skin")) return null;
        const [role, op] = spec.split(":"), c = rgb(pal[role]);
        return toHex(op === "dk" ? dk(c) : c);
      };
      let x0 = 99, x1 = -1, y0 = 99, y1 = -1, cells = "";
      for (const l of ls) {
        const cols = l.cols.map(resolve);
        for (const [x, y, w, ci] of l.runs) {
          if (!cols[ci]) continue;
          cells += rect(x, y, w, cols[ci]);
          x0 = Math.min(x0, x); x1 = Math.max(x1, x + w); y0 = Math.min(y0, y); y1 = Math.max(y1, y + 1);
        }
      }
      const s = Math.max(x1 - x0, y1 - y0) + 2, vx = x0 - (s - (x1 - x0)) / 2, vy = y0 - (s - (y1 - y0)) / 2;
      thumbCache[ck] = `<svg class="sprite" viewBox="${vx} ${vy} ${s} ${s}" role="img" aria-label="${esc(i.name)}">${cells}</svg>`;
    }
    return thumbCache[ck];
  }
  function thumb(i) {
    const s = thumbSvg(i);
    return s ? `<div class="swatch-item thumb">${s}</div>` : `<div class="swatch-item" style="background:${i.color}"></div>`;
  }
  const staleListings = () => S.listings.filter((l) => S.day - l.listedDay > C.STALE_DAYS);

  // ---------- 畫面 ----------
  // 焦點：整個畫面重繪後，把焦點還給剛才的控制項；開關彈窗時移入與歸還
  let hadModal = false, returnSel = null;
  function selOf(el) {
    if (!el || el === document.body || !app.contains(el)) return null;
    if (el.id) return "#" + el.id;
    for (const a of el.attributes) if (a.name.startsWith("data-")) return `[${a.name}="${a.value}"]`;
    return null;
  }
  function focusSel(sel) {
    const el = sel && app.querySelector(sel);
    if (el) el.focus({ preventScroll: true });
  }
  // ---------- 教學聚光燈：只亮要點的地方，其餘壓暗且點不到 ----------
  let tutSub = 0, spotKey = "", spotT = null, placeSpot = null;
  function questSpec() {   // 按「帶我去」之後的指路（只亮要按的地方，可隨時按「不用帶路」離開）
    const q = curQuest(), go = (id, text) => ({ sel: `[data-nav="${id}"]`, text, quest: true });
    if (!q || !questGuide) return null;
    const piece = (sel, text) => ({ sel, text, quest: true });
    if (q.id === "listAll" || q.id === "repair") {
      if (modal && modal.type === "price") return { sel: "#confirm-price", text: "按「上架」。", quest: true };
      if (modal && modal.type === "item") return q.id === "repair" ? { sel: ".sheet [data-fix]", text: "按「修補」，付費整理，隔天完成。", quest: true } : { sel: ".sheet [data-sell]", text: "按「賣」。", quest: true };
      if (view !== "wardrobe") return go("wardrobe", "點下方的「衣櫃」。");
      if (wardView !== "stock") return { sel: '[data-wseg="stock"]', text: "先點「待售」。", quest: true };
      return piece(q.id === "repair" ? ".piece.flawed" : ".piece:not(.rewarditem)", q.id === "repair" ? "點這件有瑕疵的衣服。" : "點一件衣服。");
    }
    if (q.id === "ship" || q.id === "review") {
      if (modal && modal.type === "pack") return { sel: "[data-pack]", text: "按「包貨」，包好就收到錢。", quest: true };
      if (modal) return null;
      if (view !== "home") return go("home", "回首頁。");
      return shippingList().length ? { sel: "#pack-open", text: "按「去包貨」。", quest: true } : { sel: "#nextday", text: "還沒有成交，按「進入下一天」。", quest: true };
    }
    if (q.id === "nextDay") return view !== "home" ? go("home", "回首頁。") : { sel: "#nextday", text: "按「進入下一天」。", quest: true };
    if (q.id === "bargain") {
      if (modal && modal.type === "bargain" && !modal.result) return { sel: "#bargain-go", text: "按「出價」。出價越接近開價，成功機率越高。", quest: true };
      if (modal) return null;
      if (view !== "social") return go("social", "點下方的「社群」。");
      const so = socialState();
      return so.offers.length ? { sel: "[data-haggle]:not([disabled])", text: "挑一則，按「還價」。", quest: true } : { sel: "#refresh", text: "按「刷新看看」。", quest: true };
    }
    if (q.id === "buy") {
      if (modal) return null;
      if (view !== "social") return go("social", "點下方的「社群」。");
      const so = socialState();
      return so.offers.length ? { sel: "[data-buy]:not([disabled])", text: "挑一件，按「買下」。", quest: true } : { sel: "#refresh", text: "按「刷新看看」。", quest: true };
    }
    return null;
  }
  function tutSpec() {
    const t = S.tutorial, go = (id, text) => ({ sel: `[data-nav="${id}"]`, text });
    if (t === "done") return questSpec();
    if (t === "goWardrobe") return go("wardrobe", "點下方的「衣櫃」，打開你的衣櫃。");
    if (t === "pick" || t === "keep") {
      if (modal && modal.type === "item") return t === "pick"
        ? { sel: ".sheet [data-sell]", text: "按「賣」，把這件衣服拿去賣。" }
        : { sel: ".sheet [data-keepit]", text: "按「留」，把它放進你的私人衣櫃。" };
      if (view !== "wardrobe") return go("wardrobe", "點下方的「衣櫃」。");
      if (wardView !== "stock") return { sel: '[data-wseg="stock"]', text: "先點「待售」，回到要賣的衣服。" };
      return { sel: ".piece.tutfirst", text: t === "pick" ? "點這件衣服。" : "這件不賣，留著自己穿。點這件衣服。" };
    }
    if (t === "dress") {
      if (view !== "wardrobe") return go("wardrobe", "點下方的「衣櫃」。");
      if (wardView !== "closet") return { sel: '[data-wseg="closet"]', text: "點「私人」，打開你的私人衣櫃。" };
      return { sel: `[data-wear="${S.tutKept}"]`, text: "點這件衣服，穿到角色身上。" };
    }
    if (t === "price" && modal && modal.type === "price") {
      if (tutSub === 0) return { sel: ".prices", text: "這是這件衣服的「基礎價值」和現在的「市場價」。標價越接近市場價，越容易賣掉。", next: "我知道了" };
      if (tutSub === 1) return { sel: '[data-pct="10"]', text: "標價越高，成交機會越低。按一下「+10%」試試看。" };
      return { sel: "#confirm-price", text: "「每天成交機會」變低了。這樣就可以了，按「上架」。" };
    }
    return null;
  }
  function applySpot() {
    document.querySelectorAll(".spot-hole,.spot-cap,.spot-skip").forEach((e) => e.remove());
    spotT = null; placeSpot = null;
    if (!S || view === "create" || (modal && modal.type === "skipTut")) return;
    if (S.tutorial === "price" && !(modal && modal.type === "price")) S.tutorial = "pick";
    const sp = tutSpec(), t = sp && app.querySelector(sp.sel);
    if (!t) return;
    spotT = t;
    const key = S.tutorial + sp.sel + tutSub;
    if (key !== spotKey) { spotKey = key; t.scrollIntoView({ block: "center" }); }
    const hole = document.createElement("div"), cap = document.createElement("div");
    hole.className = "spot-hole"; cap.className = "spot-cap"; cap.setAttribute("role", "status");
    cap.innerHTML = `<div>${esc(sp.text)}</div>${sp.next ? `<div class="spot-btns"><button class="btn small" id="spot-next">${sp.next}</button></div>` : ""}`;
    const skipBtn = document.createElement("button");   // 固定在右上角，不放在說明框裡，避免誤觸
    skipBtn.className = "spot-skip"; skipBtn.id = "spot-skip"; skipBtn.textContent = sp.quest ? "不用帶路" : "跳過教學";
    document.body.append(hole, cap, skipBtn);
    placeSpot = () => {
      const r = t.getBoundingClientRect();
      Object.assign(hole.style, { left: r.left - 4 + "px", top: r.top - 4 + "px", width: r.width + 8 + "px", height: r.height + 8 + "px" });
      const sheet = t.closest(".sheet");
      if (sheet) { cap.style.top = "auto"; cap.style.bottom = innerHeight - sheet.getBoundingClientRect().top + 12 + "px"; }   // 視窗開著時，提示放在視窗上方，不蓋住視窗內容
      else if (r.top > innerHeight / 2) { cap.style.top = "auto"; cap.style.bottom = innerHeight - r.top + 14 + "px"; } else { cap.style.bottom = "auto"; cap.style.top = r.bottom + 14 + "px"; }
    };
    placeSpot();
    skipBtn.onclick = () => { if (sp.quest) { questGuide = false; save(); render(); } else { modal = { type: "skipTut" }; render(); } };   // 跳過教學要再確認一次
    const nx = cap.querySelector("#spot-next");
    if (nx) nx.onclick = sp.onNext || (() => { tutSub += 1; render(); });
  }
  window.addEventListener("scroll", () => placeSpot && placeSpot(), { passive: true });
  window.addEventListener("resize", () => placeSpot && placeSpot());
  document.addEventListener("click", (e) => {
    if (!spotT || !document.contains(spotT) || spotT.contains(e.target) || e.target.closest(".spot-cap, .spot-skip")) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
  }, true);

  function render() {
    ensureCloset();
    if (S && S.tutorial === "done" && !S.season) rollSeason();
    questCheck();
    if (S && view !== "create" && S.haggles && S.haggles.length && !modal) modal = openHaggle();
    { const nq = curQuest();   // 新手任務有 NPC 的，開始時跳一次私訊
      if (nq && C.QUEST_NPC[nq.id] && !modal && view !== "create" && !(S.seen && S.seen["npc_" + nq.id])) { S.seen = { ...(S.seen || {}), ["npc_" + nq.id]: true }; save(); modal = { type: "npcMsg", q: nq }; } }
    const cur = selOf(document.activeElement);
    applyContrast();
    app.innerHTML = view === "create" ? createView() : shell();
    bind();
    if (modal && !hadModal) {
      returnSel = cur;
      const sh = app.querySelector(".sheet");
      if (sh) sh.focus({ preventScroll: true });
    } else focusSel(modal ? cur : hadModal ? returnSel : cur);
    hadModal = !!modal;
    applySpot();
  }
  // Esc 關閉彈窗（等同按該彈窗的關閉鈕）
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !modal) return;
    const b = app.querySelector("#cancel, #pack-close, #skip-cancel, #close-settings, #close-summary, #close-market, #lin-close, #close-hint, #item-close");
    if (b) b.click();
  });

  function shell() {
    let body = "";
    if (view === "home") body = homeView();
    else if (view === "wardrobe") body = wardrobeView();
    else if (view === "social") body = socialView();
    else body = marketView();
    const nav = (id, label) => {
      return `<button data-nav="${id}" class="${view === id ? "on" : ""}"${view === id ? ' aria-current="page"' : ""}>${label}</button>`;
    };
    const primary = view === "home"
      ? `<div class="primary-bar"><button class="btn" id="nextday">進入下一天</button></div>` : "";
    const f = flashMoney ? " flash" : "";
    flashMoney = false;
    return `<div class="status"><span>第 ${S.day} 天</span><span class="money${f}">$ ${fmtMoney(S.money)}</span>
        <button class="gear" id="open-settings" aria-label="設定">設定</button></div>
      ${body}${primary}
      <nav class="nav">${nav("home", "首頁")}${nav("wardrobe", "衣櫃")}${socialOpen() ? nav("social", "社群") : ""}${nav("market", "賣場")}</nav>
      ${modalView()}${toast && !modal ? `<div class="toast" role="status">${esc(toast)}</div>` : ""}`;
  }

  // 創角分頁：每頁列出的欄位（key、顯示名、選項清單、是否用色塊）
  const CREATE_TABS = [
    { id: "face", name: "臉部", fields: [["skin", "膚色", () => C.SKIN_TONES, true], ["eyes", "眼睛", () => C.EYES], ["iris", "眼珠顏色", () => C.EYE_COLORS], ["mouth", "嘴巴", () => C.MOUTHS], ["freckles", "雀斑", () => C.FRECKLES]] },
    { id: "hair", name: "髮型與頭飾", fields: [["hair", "髮型", () => C.HAIR_STYLES], ["hairColor", "髮色", () => C.HAIR_COLORS, true], ["headwear", "頭飾", () => C.HEADWEAR], ["headwearColor", "頭飾顏色", () => C.HEADWEAR_COLORS, true]] },
    { id: "outfit", name: "服裝", fields: [["top", "上衣", () => C.TOPS], ["bottom", "下身", () => C.BOTTOMS], ["jacket", "外套", () => C.JACKETS], ["shoes", "鞋子", () => C.SHOES], ["shoesColor", "鞋子顏色", () => C.HEADWEAR_COLORS, true], ["socks", "襪子（穿裙子時看得到）", () => C.SOCKS], ["socksColor", "襪子顏色", () => C.HEADWEAR_COLORS, true]] },
    { id: "acc", name: "配件", fields: [["glasses", "眼鏡", () => C.GLASSES], ["bag", "包包", () => C.BAGS], ["bagColor", "包包顏色", () => C.HEADWEAR_COLORS, true], ["earring", "耳環", () => C.ONOFF], ["necklace", "項鍊", () => C.ONOFF], ["bracelet", "手環", () => C.ONOFF]] },
  ];
  let createTab = "face";
  // 排程新做的衣服在 config.js 標 draft: true，只有網址加 ?draft 才看得到，使用者標「通過」後才移除旗標
  const DRAFT_MODE = new URLSearchParams(location.search).has("draft");
  const live = (list) => list.filter((o) => (!o.draft || DRAFT_MODE) && !o.reward);

  function createView() {
    const opt = (key, o, sw) => `<button class="opt ${sw ? "swatch" : ""} ${draft[key] === o.id ? "on" : ""}" aria-pressed="${draft[key] === o.id}" data-look="${key}:${o.id}"${sw ? ` style="background:${o.color}" aria-label="${o.name}"` : ""}>${sw ? "" : o.name}</button>`;
    const tab = CREATE_TABS.find((t) => t.id === createTab);
    const fields = tab.fields.filter(([k]) => !({ headwearColor: "headwear", socksColor: "socks", bagColor: "bag" }[k] && draft[{ headwearColor: "headwear", socksColor: "socks", bagColor: "bag" }[k]] === "none"))
      .map(([k, label, list, sw]) => `<div class="field"><span class="lab">${label}</span><div class="opts">${live(list()).map((o) => opt(k, o, sw)).join("")}</div></div>`).join("");
    const tabs = CREATE_TABS.map((t) => `<button class="opt ${t.id === createTab ? "on" : ""}" role="tab" aria-selected="${t.id === createTab}" data-ctab="${t.id}">${t.name}</button>`).join("");
    const ok = !!draft.name.trim();
    return `<div class="status"><span>${C.TITLE_ZH}</span><small>${C.TITLE_EN}</small></div>
      <div class="win"><h2>創角</h2><div class="body">
        <p class="muted" style="margin-top:0">你愛買衣服，衣櫃早就塞不下了。先決定自己的樣子。</p>
        <div class="preview">${sprite(draft)}</div>
        <div class="field"><label for="nm">名字</label><div class="namerow"><input id="nm" type="text" maxlength="8" value="${esc(draft.name)}" placeholder="最多 8 個字" autocomplete="off"><button class="btn alt" id="rnd-name">隨機名字</button></div></div>
        <button class="btn alt block" id="rnd-look">隨機外觀</button>
        <div class="tabs ctabs" role="tablist" aria-label="外觀分類">${tabs}</div>
        ${fields}
        <button class="btn block" id="start" ${ok ? "" : "disabled"}>開始</button>
        <p class="why" id="why" ${ok ? "hidden" : ""}>請先輸入名字。</p>
      </div></div>`;
  }

  function trendBar(showMarket = true) {
    if (!S.season || !tutDone()) return "";
    const left = Math.max(0, S.season.start + C.SEASON_DAYS - S.day);
    return `<div class="trend"><span>本季流行　<b class="up">${esc(S.season.up)} ▲</b>　退燒　<b class="down">${esc(S.season.down)} ▼</b></span><small>還有 ${left} 天換季</small></div>${S.market && showMarket ? `<div class="trend2"><small>今日行情</small><div class="mkrow">${C.MARKET_TYPES.map((t) => { const a = S.market[t] || 0, n = Math.round(a * 100); return `<div class="mk"><small>${t}</small><b class="${n > 0 ? "up" : n < 0 ? "down" : "muted"}">${pctText(a)}</b></div>`; }).join("")}</div></div>` : ""}`;
  }

  function homeView() {
    const stale = staleListings().length;
    const full = totalCount() >= C.WARDROBE_CAPACITY;
    const tidy = S.wardrobe.length <= C.TIDY_AT;
    const roomImg = `<img class="room" src="art/${tidy ? "小套房_整理後" : "小套房背景"}.png" alt="${tidy ? "整理後的小套房" : "小套房"}" width="832" height="768">`;
    // 林（作者彩蛋）：依任務鏈出現，點她開對話
    const lq = linVisible() ? linQuest() : null;
    const mark = lq && (linState().phase === "offer" || linProgress(lq)[0] >= linProgress(lq)[1]) ? '<span class="mark" aria-hidden="true">!</span>' : "";
    const roomHtml = lq ? `<div class="roomwrap">${roomImg}<button class="lin" data-lin aria-label="林">${mark}<img src="art/林_透明.png" alt="" width="216" height="424"></button></div>` : roomImg;
    return `${questCard()}${shipCard()}${roomHtml}
      ${trendBar()}
      <div class="win"><h2>${esc(S.player.name)}</h2><div class="body me">
        ${sprite(playerLook())}
        <div><div class="muted">衣櫃 <span class="${full ? "full" : ""}">${totalCount()}/${C.WARDROBE_CAPACITY}</span>　賣場 ${S.listings.length} 件</div></div>
      </div></div>
      ${stale ? `<div class="tip"><b>提醒</b>　有 ${stale} 件掛賣超過 ${C.STALE_DAYS} 天，可到賣場調整價格。</div>` : ""}`;
  }

  // 衣櫃：開放式衣架加層架。上衣與外套、下身掛在衣桿上，鞋子與包包放在層架上；點衣服開詳情，再選賣或留。
  const RACK = [["上衣與外套", ["上衣", "外套"], "rail"], ["下身", ["下身"], "rail"], ["鞋子", ["鞋子"], "shelf"], ["包包", ["包包"], "shelf"]];
  function piece(i, hl) {
    const svg = thumbSvg(i) || `<div class="swatch-item" style="background:${i.color};width:48px;height:48px"></div>`;
    return `<button class="piece${i.reward ? " rewarditem" : ""}${hl ? " tutfirst" : ""}${i.condition === "有瑕疵" && !i.fixing ? " flawed" : ""}" data-item="${i.id}" aria-label="${esc(i.name)}">
      <span class="pic">${svg}</span><span class="pname">${esc(i.name)}</span>${i.fixing ? '<span class="chip flaw">整理中</span>' : i.condition === "有瑕疵" ? '<span class="chip flaw">有瑕疵</span>' : ""}</button>`;
  }
  let wardView = "stock", ccat = "全部";
  function wardrobeView() {
    const cl = S.closet || [];
    const seg = `<div class="seg" role="tablist"><button role="tab" aria-selected="${wardView === "stock"}" class="${wardView === "stock" ? "on" : ""}" data-wseg="stock">待售 ${S.wardrobe.length}</button><button role="tab" aria-selected="${wardView === "closet"}" class="${wardView === "closet" ? "on" : ""}" data-wseg="closet">私人 ${cl.length}</button></div>`;
    return seg + (wardView === "closet" ? closetView() : stockView());
  }

  // 私人衣櫃＝穿搭：左邊角色、右邊衣服格子；點衣服穿上或脫下，沒穿的可以放回待售
  function closetView() {
    const worn = new Set(Object.values(S.worn || {}));
    const items = (S.closet || []).filter((i) => ccat === "全部" || i.type === ccat);
    const tabs = C.CATEGORIES.map((c) => `<button class="opt ${ccat === c ? "on" : ""}" aria-pressed="${ccat === c}" data-ccat="${c}">${c}</button>`).join("");
    const tiles = items.map((i) => {
      const on = worn.has(i.id);
      return `<div class="it${on ? " on" : ""}"><button class="wear" data-wear="${i.id}" aria-pressed="${on}" aria-label="${esc(i.name)}${on ? "，穿著中，點一下脫下" : "，點一下穿上"}">
        ${on ? '<span class="on-badge">穿著</span>' : ""}<span class="p">${thumbSvg(i) || ""}</span><small>${esc(i.name)}</small></button>
        ${on ? "" : `<button class="btn small alt" data-unkeep="${i.id}" aria-label="放回待售：${esc(i.name)}">放回</button>`}</div>`;
    }).join("");
    const empty = (S.closet || []).length ? "這個分類沒有衣服。" : "私人衣櫃是空的。在待售衣櫃點衣服按「留」，就會放進來。";
    return `<div class="split"><div class="left"><div class="stage">${sprite(playerLook())}</div><button class="btn alt block" data-strip>全部脫下</button></div>
      <div class="right"><div class="cats">${tabs}</div><div class="cgrid">${tiles || `<p class="muted empty" style="grid-column:1/-1">${empty}</p>`}</div></div></div>`;
  }

  function stockView() {
    const tabs = C.CATEGORIES.map((c) => `<button class="opt ${cat === c ? "on" : ""}" aria-pressed="${cat === c}" data-cat="${c}">${c}</button>`).join("");
    const full = totalCount() >= C.WARDROBE_CAPACITY;
    const items = S.wardrobe.filter((i) => cat === "全部" || i.type === cat);
    const first = items[0];
    const tut = S.tutorial === "pick" || S.tutorial === "keep";
    const rows = RACK.map(([label, types, kind]) => {
      const list = items.filter((i) => types.includes(i.type));
      if (!list.length) return "";
      return `<div class="rack-row ${kind}"><span class="rlabel">${label}</span><div class="pieces">${list.map((i) => piece(i, tut && i === first)).join("")}</div></div>`;
    }).join("");
    const empty = S.wardrobe.length === 0 ? "沒有待售的衣服了。到社群收貨，或把私人衣櫃的衣服放回來。" : "這個分類沒有衣服。";
    return `<div class="tabs">${tabs}</div>
      <div class="rack-note"><span>衣櫃</span><span class="${full ? "full" : ""}">${totalCount()}/${C.WARDROBE_CAPACITY}${full ? "　已爆滿" : ""}</span></div>
      <div class="rack">${rows || `<p class="muted empty" style="padding:16px">${empty}</p>`}<div class="rack-floor"></div></div>`;
  }

  let socialTab = "new";
  const HEART = '<svg viewBox="0 0 7 6" width="21" height="18" aria-hidden="true"><path fill="#a65a89" d="M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z"/></svg>';
  const CHAT = '<svg viewBox="0 0 7 6" width="21" height="18" aria-hidden="true"><path fill="#6c4a50" d="M0 0h7v4H4v1H3V4H0z"/></svg>';
  function socialView() {
    const so = socialState(), full = totalCount() >= C.WARDROBE_CAPACITY;
    const tabs = [["new", "最新"], ["deal", "撿漏"], ["hot", "熱門"]].map(([id, n]) => `<button class="${socialTab === id ? "on" : ""}" role="tab" aria-selected="${socialTab === id}" data-stab="${id}">${n}</button>`).join("");
    let offers = so.offers.slice();
    if (socialTab === "deal") offers = offers.filter((o) => o.ask < marketPrice(o.item));
    if (socialTab === "hot") offers.sort((x, y) => y.likes - x.likes);
    const posts = offers.map((o) => {
      const mk = marketPrice(o.item), d = o.ask - mk;
      const diff = d < 0 ? `<span class="money-up">低於市場價 $${-d}</span>` : d > 0 ? `<span class="warn">高於市場價 $${d}</span>` : `<span class="muted">與市場價相同</span>`;
      const flaw = o.item.condition === "有瑕疵" ? '<span class="chip flaw">有瑕疵</span>' : "";
      const note = o.item.condition === "有瑕疵" && o.item.flaw ? `<div class="warn">瑕疵：${esc(o.item.flaw)}</div>` : "";
      const chips = flaw + o.item.tags.map((t) => `<span class="chip">${esc(t)}${tagCoef(t) > 0 ? " ▲" : tagCoef(t) < 0 ? " ▼" : ""}</span>`).join("");
      const can = S.money >= o.ask && !full;
      const minBid = Math.ceil(o.ask * C.HAGGLE_BUY_MIN), canBid = !full && o.ask >= 2 && S.money >= minBid;
      return `<article class="post"><div class="hd"><div class="av" style="background:${o.color}" aria-hidden="true">${esc(o.who[1].toUpperCase())}</div>
          <div class="nm">${esc(o.who)}<small>${o.mins} 分鐘前</small></div></div>
        <div>${esc(o.text)}</div>
        <div class="pimg">${thumbSvg(o.item) || ""}</div>
        <div><b>${esc(o.item.name)}</b>　<span class="muted">${esc(o.item.type)}</span></div>${note}
        <div class="price"><b>開價 $${o.ask}</b><span class="muted">市場價 $${mk}</span>${diff}</div>
        <div class="ft">${HEART}<span>${o.likes}</span>${CHAT}<span>${o.cm}</span>${chips}<span class="sp"></span>
          <button class="btn small alt" data-haggle="${o.oid}" ${canBid ? "" : "disabled"}>還價</button>
          <button class="btn small" data-buy="${o.oid}" ${can ? "" : "disabled"}>${full ? "衣櫃滿" : S.money < o.ask ? "錢不夠" : "買下"}</button></div></article>`;
    }).join("");
    const empty = !so.offers.length ? "還沒有貨。按「刷新看看」。" : "這個分頁目前沒有貨。";
    return `${trendBar(false)}<div class="stabs" role="tablist">${tabs}</div>
      <div class="sbar"><span>刷新 ${so.left}/${C.SOCIAL_REFRESHES}</span><button class="btn small" id="refresh" ${so.left > 0 ? "" : "disabled"}>${so.left > 0 ? "刷新看看" : "今天刷完了"}</button></div>
      ${full ? '<p class="warn" style="padding:0 12px">衣櫃已滿，先賣或清掉幾件才買得下。</p>' : ""}
      <div class="feed">${posts || `<p class="muted empty" style="padding:16px">${empty}</p>`}</div>`;
  }

  let marketTab = "all";
  function marketView() {
    const ch = (l) => saleChance(l.price, l.item);
    const tabs = [["all", `全部 ${S.listings.length}`], ["high", "機會高"], ["low", "機會低"]].map(([id, n]) => `<button class="${marketTab === id ? "on" : ""}" aria-pressed="${marketTab === id}" data-mtab="${id}">${n}</button>`).join("");
    const list = S.listings.filter((l) => marketTab === "all" || (marketTab === "high" ? ch(l) >= 0.5 : ch(l) < 0.5));
    const cards = list.map((l) => {
      const d = S.day - l.listedDay, stale = d > C.STALE_DAYS;
      return `<div class="prod"><span class="ptag">$${l.price}</span><div class="ppic">${thumbSvg(l.item) || ""}</div>
        <div class="pinfo"><div>${esc(l.item.name)}</div><div class="muted">已掛 ${d} 天・市場價 $${marketPrice(l.item)}</div>
          <div class="muted">成交機會 ${chanceText(l.price, l.item)}</div>${stale ? `<div class="warn">掛太久了，考慮調整價格</div>` : ""}</div>
        <div class="pbtns"><button class="btn small" data-reprice="${l.item.id}">改價</button><button class="btn small alt" data-pull="${l.item.id}">撤下</button></div></div>`;
    }).join("");
    const empty = S.listings.length ? "這個分頁沒有商品。" : "還沒有上架的衣服。到衣櫃挑一件「賣」。";
    return `<div class="banner"><div>${esc(S.player.name)}的賣場</div><small>掛賣 ${S.listings.length} 件</small></div>
      <div class="rating" aria-label="賣場評價 ${reviewStars()} 顆星">${[1, 2, 3, 4, 5].map((n) => `<span class="star${n <= reviewStars() ? " on" : ""}"></span>`).join("")}<span class="muted">評價 ${reviewScore()} 分，影響每天的成交機率</span></div>
      <div class="mtabs">${tabs}</div>
      <div class="pgrid">${cards || `<p class="muted empty" style="grid-column:1/-1">${empty}</p>`}</div>`;
  }

  function modalView() {
    if (!modal) return "";
    if (modal.type === "price") {
      const it = modal.item, p = modal.price, mk = marketPrice(it);
      const max = Math.max(mk * C.PRICE_SLIDER_MAX_RATIO, p);
      const prices = `<div class="prices"><div class="p-base"><small>基礎價值</small>$${valueOf(it)}</div>
             <div class="p-mkt"><small>市場價</small>$${mk}</div>
             <div class="p-you"><small>你的標價</small><span id="yp">$${p}</span></div></div>
           ${trendOf(it) ? `<div class="kv"><span>流行影響</span><span class="${trendOf(it) > 0 ? "money-up" : "warn"}">${trendOf(it) > 0 ? "+" : ""}${Math.round(trendOf(it) * 100)}%</span></div>` : ""}
           ${marketAdj(it) ? `<div class="kv"><span>${esc(it.type)}行情</span><span class="${marketAdj(it) > 0 ? "money-up" : "warn"}">${pctText(marketAdj(it))}</span></div>` : ""}
           <div class="kv"><span>每天成交機會</span><span id="eta">${p > 0 ? chanceText(p, it) : "—"}</span></div>
           <div class="warn" id="high" ${p > mk * C.HIGH_PRICE_RATIO ? "" : "hidden"}>標價遠高於市場價，很難賣掉。</div>`;
      return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="${modal.edit ? "改價" : "上架"}" tabindex="-1"><div class="kv" style="align-items:center;justify-content:flex-start;gap:10px">${thumb(it)}<h3 style="margin:0">${modal.edit ? "改價" : "上架"}：${esc(it.name)}</h3></div>
        ${prices}
        <div class="stepper">
          <button class="btn alt" data-pct="-10">-10%</button>
          <button class="btn alt" data-step="-${C.PRICE_STEP_SMALL}">-${C.PRICE_STEP_SMALL}</button>
          <input id="pr" type="number" inputmode="numeric" min="${C.PRICE_MIN}" value="${p}" aria-label="標價">
          <button class="btn alt" data-step="${C.PRICE_STEP_SMALL}">+${C.PRICE_STEP_SMALL}</button>
          <button class="btn alt" data-pct="10">+10%</button>
        </div>
        <input id="rng" type="range" min="${C.PRICE_MIN}" max="${max}" value="${Math.max(p, C.PRICE_MIN)}" aria-label="標價滑桿">
        <div class="btns"><button class="btn alt" id="cancel">取消</button><button class="btn main" id="confirm-price">${modal.edit ? "確定" : "上架"}</button></div>
      </div></div>`;
    }
    if (modal.type === "haggle") {
      const m = modal, mk = marketPrice(m.item);
      if (m.result) return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="殺價結果" tabindex="-1"><h3>買家殺價：${esc(m.item.name)}</h3>
        <p class="${m.result.ok ? "money-up" : "muted"}">${esc(m.result.text)}</p>
        <div class="btns"><button class="btn main" id="haggle-ok">好</button></div></div></div>`;
      return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="買家殺價" tabindex="-1">
        <div class="kv" style="align-items:center;justify-content:flex-start;gap:10px">${thumb(m.item)}<h3 style="margin:0">買家殺價：${esc(m.item.name)}</h3></div>
        <div class="prices"><div class="p-base"><small>你的標價</small>$${m.ask}</div><div class="p-mkt"><small>市場價</small>$${mk}</div><div class="p-you"><small>買家出價</small>$${m.offer}</div></div>
        <p class="muted" style="margin:6px 0">還價只有一次機會，越接近買家出價越容易成功。</p>
        <div class="kv"><span>你的還價 <b id="hc-p">$${m.counter}</b></span><span>成功機率 <b id="hc-c">${pct(counterChance(m.offer, m.ask, m.counter))}</b></span></div>
        <input id="hc-rng" type="range" min="${m.offer}" max="${m.ask}" value="${m.counter}" aria-label="還價">
        <div class="btns"><button class="btn alt" id="haggle-refuse">拒絕</button><button class="btn alt" id="haggle-counter">還價</button><button class="btn main" id="haggle-accept">接受 $${m.offer}</button></div>
      </div></div>`;
    }
    if (modal.type === "bargain") {
      const m = modal, mk = marketPrice(m.item), lo = Math.ceil(m.ask * C.HAGGLE_BUY_MIN);
      if (m.result) return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="議價結果" tabindex="-1"><h3>議價：${esc(m.item.name)}</h3>
        <p class="${m.result.ok ? "money-up" : "warn"}">${esc(m.result.text)}</p>
        <div class="btns"><button class="btn main" id="bargain-ok">好</button></div></div></div>`;
      return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="向賣家出價" tabindex="-1">
        <div class="kv" style="align-items:center;justify-content:flex-start;gap:10px">${thumb(m.item)}<h3 style="margin:0">議價：${esc(m.item.name)}</h3></div>
        <div class="prices"><div class="p-base"><small>開價</small>$${m.ask}</div><div class="p-mkt"><small>市場價</small>$${mk}</div><div class="p-you"><small>你的出價</small><span id="bg-p">$${m.price}</span></div></div>
        <p class="muted" style="margin:6px 0">只有一次機會。失敗的話，賣家就不理你了。</p>
        <div class="kv"><span>成功機率</span><b id="bg-c">${pct(buyChance(m.price, m.ask))}</b></div>
        <input id="bg-rng" type="range" min="${lo}" max="${m.ask - 1}" value="${m.price}" aria-label="出價">
        <div class="btns"><button class="btn alt" id="bargain-cancel">取消</button><button class="btn main" id="bargain-go"${S.money >= m.price ? "" : " disabled"}>出價</button></div>
      </div></div>`;
    }
    if (modal.type === "summary") {
      const sales = modal.sales;
      const body = sales.length
        ? sales.map((s) => `<div class="kv"><span>${esc(s.name)}<small class="muted">（${esc(s.buyer || "買家")}）</small>${s.item.cost ? `<small class="muted">（成本 $${s.item.cost}）</small>` : ""}</span><span class="money-up">$${s.price}</span></div>`).join("") + `<p class="muted">成交的商品要包貨出貨才會收到錢，到首頁按「去包貨」。</p>`
        : `<p class="muted">今天沒有成交。</p>`;
      return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="當日結算" tabindex="-1"><img class="room night" src="art/小套房_夜晚.png" alt="" width="832" height="768"><h3>第 ${S.day} 天・結算</h3>${body}
        ${modal.haggles ? `<p>有 ${modal.haggles} 位買家想殺價，按「好」之後逐一處理。</p>` : ""}
        ${(modal.fixed || []).map((n) => `<div class="kv"><span>整理完成：${esc(n)}</span><span class="money-up">良好</span></div>`).join("")}
        ${modal.season ? `<p>換季了：流行 <b>${esc(modal.season.up)}</b> ▲，退燒 <b>${esc(modal.season.down)}</b> ▼。</p>` : ""}
        <div class="kv"><span>目前金錢</span><span>$${fmtMoney(S.money)}</span></div>
        <div class="btns"><button class="btn main" id="close-summary">好</button></div></div></div>`;
    }
    if (modal.type === "market") {
      const it = modal.item;
      return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="第一筆收入" tabindex="-1"><h3>第一筆收入</h3>
        <p>「${esc(it.name)}」賣出去了，這是你的第一筆本金。認識兩個數字：</p>
        <div class="kv"><span>基礎價值</span><span>$${valueOf(it)}</span></div>
        <p class="muted" style="margin-top:0">這件衣服本身應有的價值，固定不變。</p>
        <div class="kv"><span>市場價</span><span>$${marketPrice(it)}</span></div>
        <p class="muted" style="margin-top:0">現在市場上願意買的價格。標價越接近市場價，成交越快；高出越多，等得越久。目前市場價等於基礎價值，之後會隨流行波動。</p>
        <div class="btns"><button class="btn main" id="close-market">我知道了</button></div></div></div>`;
    }
    if (modal.type === "npcMsg") {
      const n = C.QUEST_NPC[modal.q.id];
      return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(n.npc)}" tabindex="-1"><div class="npcmsg"><span class="npcface" style="background-position:${n.face * 50}% 50%" aria-hidden="true"></span><div><h3>${esc(n.npc)}</h3><p>${esc(n.text)}</p></div></div>
        <div class="kv"><span>新手任務</span><span>${esc(modal.q.title)}</span></div><div class="btns"><button class="btn main" id="lin-close">知道了</button></div></div></div>`;
    }
    if (modal.type === "lin") {
      const q = modal.quest;
      if (!q) return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="林" tabindex="-1"><h3>林</h3><p>${esc(C.LIN_ALL_DONE)}</p>
        <div class="btns"><button class="btn main" id="lin-close">好</button></div></div></div>`;
      const st = linState(), [cur, n] = linProgress(q), ready = st.phase === "active" && cur >= n;
      const body = st.phase === "offer" ? `<p>${esc(q.intro)}</p><div class="kv"><span>目標</span><span>${esc(linGoalText(q.goal))}</span></div><div class="kv"><span>獎勵</span><span>$${q.reward.money}</span></div>`
        : ready ? `<p>${esc(q.done)}</p><div class="kv"><span>獎勵</span><span class="money-up">+$${q.reward.money}</span></div>`
        : `<p>${esc(q.intro)}</p><div class="kv"><span>${esc(linGoalText(q.goal))}</span><span>${Math.min(cur, n)}/${n}</span></div>`;
      const btns = st.phase === "offer" ? `<button class="btn alt" id="lin-close">先不要</button><button class="btn main" id="lin-accept">接受</button>`
        : ready ? `<button class="btn main" id="lin-claim">領取獎勵</button>` : `<button class="btn main" id="lin-close">好</button>`;
      return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="林" tabindex="-1"><h3>林</h3>${body}<div class="btns">${btns}</div></div></div>`;
    }
    if (modal.type === "item") {
      const i = findItem(modal.id);
      if (!i) return "";
      const meta = i.tags.length ? `${esc(i.type)}・${i.tags.map(esc).join("、")}` : esc(i.type);
      return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(i.name)}" tabindex="-1">
        <div class="kv" style="justify-content:flex-start;gap:12px;align-items:center"><div class="swatch-item thumb" style="width:88px;height:88px">${thumbSvg(i) || ""}</div>
          <div><h3 style="margin:0">${esc(i.name)}</h3><div class="muted">${meta}・${esc(i.condition)}</div></div></div>
        <div class="kv"><span>基礎價值</span><span>$${valueOf(i)}</span></div>
        ${i.condition === "有瑕疵" && i.flaw ? `<div class="kv"><span>瑕疵</span><span>${esc(i.flaw)}</span></div>` : ""}
        ${i.condition === "有瑕疵" && !i.fixing ? `<div class="kv"><span>修補後</span><span>$${i.base}</span></div><p class="muted">修補要付費，並花一天時間。</p>` : ""}
        ${i.fixing ? `<p class="muted">整理中，隔天結算時完成。完成前不能賣或留。</p>` : ""}
        ${i.cost > 0 && tutDone() ? `<div class="kv"><span>成本</span><span>$${i.cost}</span></div>` : ""}
        <p class="muted">「留」會放進私人衣櫃，可以穿在角色身上。</p>
        <div class="btns"><button class="btn alt" id="item-close">關閉</button>
          ${i.condition === "有瑕疵" && !i.fixing ? `<button class="btn alt" data-fix="${i.id}"${S.money < repairCost(i) || fixingCount() >= C.REPAIR_SLOTS ? " disabled" : ""}>修補 $${repairCost(i)}</button>` : ""}
          <button class="btn alt" data-keepit="${i.id}"${i.fixing ? " disabled" : ""}>留</button>
          <button class="btn main" data-sell="${i.id}"${i.fixing ? " disabled" : ""}>賣</button></div>
        ${i.condition === "有瑕疵" && !i.fixing && fixingCount() >= C.REPAIR_SLOTS ? `<p class="muted">同時最多整理 ${C.REPAIR_SLOTS} 件。</p>` : ""}</div></div>`;
    }
    if (modal.type === "pack") {
      const list = shippingList();
      const rows = list.length ? list.map((s, i) => `<div class="kv"><span>${esc(s.item.name)}　$${s.price}<br><small class="muted">${esc(s.buyer || "買家")}</small></span><button class="btn small" data-pack="${i}">包貨</button></div>`).join("") : `<p class="muted">沒有待出貨的商品了。</p>`;
      return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="包貨" tabindex="-1"><img class="room night" src="art/包貨角落.png" alt="" width="832" height="768"><h3>包貨出貨</h3>
        <p class="muted">包好出貨，款項就入帳。</p>${modal.last ? `<div class="tip"><b>${esc(modal.last.buyer)}</b>　${modal.last.kind === "good" ? "好評" : modal.last.kind === "ok" ? "普通" : "差評"}<br>「${esc(modal.last.text)}」</div>` : ""}${rows}
        <div class="kv"><span>目前金錢</span><span>$${fmtMoney(S.money)}</span></div>
        <div class="btns"><button class="btn main" id="pack-close">${list.length ? "先離開" : "好"}</button></div></div></div>`;
    }
    if (modal.type === "skipTut") {
      return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="跳過教學" tabindex="-1"><h3>跳過教學？</h3>
        <p>跳過後不會領取教學完成的獎勵，也無法回頭重看教學。</p>
        <div class="btns"><button class="btn alt" id="skip-cancel">取消</button><button class="btn main" id="skip-ok">確定跳過</button></div></div></div>`;
    }
    if (modal.type === "tutReward") {
      const r = C.TUTORIAL_REWARD;
      return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="教學完成" tabindex="-1"><h3>教學完成</h3>
        <div class="kv"><span>${esc(r.name)}</span><span>${esc(r.type)}　基礎價值 $${r.base}</span></div>
        <p>送你一件衣服，狀況良好。可以賣、可以留，也可以穿。</p>
        <div class="btns"><button class="btn main" id="reward-claim">領取</button></div></div></div>`;
    }
    if (modal.type === "seasonHint") {
      return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="流行說明" tabindex="-1"><h3>流行與退燒</h3>
        ${modal.tutEnd ? '<p><b>教學完成。</b>社群開放了。首頁有「新手任務」，照著做就能學會收貨、結算與修補。</p>' : ""}
        ${S.season ? `<p>這一季：流行 <b>${esc(S.season.up)}</b> ▲，退燒 <b>${esc(S.season.down)}</b> ▼。</p>` : ""}
        <p>每隔幾天會換季。<b>流行</b>（▲）的風格，市場價會變高；<b>退燒</b>（▼）的風格，市場價會變低。</p>
        <p class="muted" style="margin-top:0">一件衣服有多個風格時，影響會互相平均。收貨與標價前，先看看這一季流行什麼。</p>
        <div class="btns"><button class="btn main" id="close-hint">我知道了</button></div></div></div>`;
    }
    if (modal.type === "socialHint") {
      return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="社群說明" tabindex="-1"><h3>社群上的貨</h3>
        <p>開價不一定等於市場價。開價比市場價低，買下來再賣就有價差可賺；開價比市場價高，就是買貴了。</p>
        <p class="muted" style="margin-top:0">每天可以刷新幾次，沒買的貨會隨刷新消失。</p>
        <div class="btns"><button class="btn main" id="close-hint">我知道了</button></div></div></div>`;
    }
    if (modal.type === "settings") {
      return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="設定" tabindex="-1"><h3>設定</h3>
        <div class="kv"><span>高對比模式</span><button class="btn alt small" id="set-contrast">${settings().contrast ? "開" : "關"}</button></div>
        <div class="kv"><span>新手教學</span><button class="btn alt small" id="replay-tut">重看教學</button></div>
        <div class="kv"><span>存檔</span><button class="btn alt small" id="reset-save">清除存檔</button></div>
        ${modal.confirmReset ? `<p class="warn">清除後無法復原，再按一次確定。</p><div class="btns"><button class="btn alt" id="close-settings">取消</button><button class="btn main" id="reset-yes">確定清除</button></div>`
          : `<div class="btns"><button class="btn main" id="close-settings">關閉</button></div>`}
      </div></div>`;
    }
    return "";
  }

  // ---------- 事件 ----------
  function bind() {
    const $ = (s) => app.querySelector(s);
    const all = (s, f) => app.querySelectorAll(s).forEach(f);

    if (view === "create") {
      const nm = $("#nm");
      nm.addEventListener("input", () => {
        draft.name = nm.value;
        const ok = !!nm.value.trim();
        $("#start").disabled = !ok; $("#why").hidden = ok;
      });
      all("[data-ctab]", (b) => b.onclick = () => { createTab = b.dataset.ctab; render(); });
      all("[data-look]", (b) => b.onclick = () => { const [k, v] = b.dataset.look.split(":"); draft[k] = v; render(); });
      const pick = (a) => { const l = live(a); return l[Math.floor(Math.random() * l.length)].id; };
      $("#rnd-name").onclick = () => { draft.name = C.RANDOM_NAMES[Math.floor(Math.random() * C.RANDOM_NAMES.length)]; render(); };
      $("#rnd-look").onclick = () => {
        Object.assign(draft, { hair: pick(C.HAIR_STYLES), skin: pick(C.SKIN_TONES), eyes: pick(C.EYES), iris: pick(C.EYE_COLORS), mouth: pick(C.MOUTHS),
          freckles: pick(C.FRECKLES), headwear: pick(C.HEADWEAR), glasses: pick(C.GLASSES), top: pick(C.TOPS), bottom: pick(C.BOTTOMS),
          hairColor: pick(C.HAIR_COLORS), headwearColor: pick(C.HEADWEAR_COLORS), shoes: pick(C.SHOES), shoesColor: pick(C.HEADWEAR_COLORS),
          socks: pick(C.SOCKS), socksColor: pick(C.HEADWEAR_COLORS), jacket: pick(C.JACKETS), bag: pick(C.BAGS), bagColor: pick(C.HEADWEAR_COLORS),
          earring: pick(C.ONOFF), necklace: pick(C.ONOFF), bracelet: pick(C.ONOFF) });
        render();
      };
      $("#start").onclick = () => {
        if (!draft.name.trim()) return;
        S = newGame({ ...draft, name: draft.name.trim() });
        view = "home"; window.scrollTo(0, 0); save(); render();
      };
      return;
    }

    all("[data-nav]", (b) => b.onclick = () => {
      if (b.dataset.nav !== view) window.scrollTo(0, 0);   // 換頁回到最上面，不要沿用上一頁的捲動位置
      view = b.dataset.nav;
      if (view === "social" && !(S.seen && S.seen.social)) { S.seen = { ...(S.seen || {}), social: true }; modal = { type: "socialHint" }; }
      if (view === "wardrobe" && S.tutorial === "goWardrobe") S.tutorial = "pick";
      save(); render();
    });
    all("[data-cat]", (b) => b.onclick = () => { cat = b.dataset.cat; render(); });
    all("[data-item]", (b) => b.onclick = () => { modal = { type: "item", id: +b.dataset.item }; render(); });
    all("[data-fix]", (b) => b.onclick = () => {
      const it = findItem(+b.dataset.fix);
      if (!it || it.condition !== "有瑕疵" || it.fixing || S.money < repairCost(it) || fixingCount() >= C.REPAIR_SLOTS) return;
      S.money -= repairCost(it); it.fixing = true; flashMoney = true;
      S.stats = S.stats || { sold: 0 }; S.stats.repaired = (S.stats.repaired || 0) + 1;
      modal = null; save(); showToast(`「${it.name}」整理中，隔天完成`);
    });
    const ic = $("#item-close"); if (ic) ic.onclick = () => { modal = null; render(); };
    all("[data-stab]", (b) => b.onclick = () => { socialTab = b.dataset.stab; render(); });
    all("[data-mtab]", (b) => b.onclick = () => { marketTab = b.dataset.mtab; render(); });
    all("[data-wseg]", (b) => b.onclick = () => { wardView = b.dataset.wseg; save(); render(); });
    all("[data-ccat]", (b) => b.onclick = () => { ccat = b.dataset.ccat; render(); });
    all("[data-keepit]", (b) => b.onclick = () => {
      const it = findItem(+b.dataset.keepit);
      if (!it) return;
      S.wardrobe = S.wardrobe.filter((x) => x.id !== it.id); S.closet.push({ ...it, kept: false });
      if (S.tutorial === "keep") { S.tutorial = "dress"; S.tutKept = it.id; ccat = "全部"; }
      modal = null; save(); showToast(`已放進私人衣櫃：${it.name}`);
    });
    all("[data-wear]", (b) => b.onclick = () => {
      const id = +b.dataset.wear, it = (S.closet || []).find((x) => x.id === id);
      if (!it) return;
      const slot = SLOT_OF[it.type]; S.worn = S.worn || {};
      S.worn[slot] = S.worn[slot] === id ? null : id;
      if (S.tutorial === "dress" && S.worn[slot] === id) { endTutorial(); save(); render(); return; }
      save(); render();
    });
    all("[data-strip]", (b) => b.onclick = () => { S.worn = {}; save(); render(); });
    all("[data-unkeep]", (b) => b.onclick = () => {
      const id = +b.dataset.unkeep, it = (S.closet || []).find((x) => x.id === id);
      if (!it || Object.values(S.worn || {}).includes(id)) return;
      S.closet = S.closet.filter((x) => x.id !== id); S.wardrobe.push(it);
      save(); showToast(`已放回待售：${it.name}`);
    });
    all("[data-sell]", (b) => b.onclick = () => {
      const it = findItem(+b.dataset.sell);
      if (S.tutorial === "pick") { S.tutorial = "price"; tutSub = 0; }
      modal = { type: "price", item: it, price: marketPrice(it), edit: false };
      render();
    });
    all("[data-reprice]", (b) => b.onclick = () => {
      const l = S.listings.find((x) => x.item.id === +b.dataset.reprice);
      modal = { type: "price", item: l.item, price: l.price, edit: true };
      render();
    });
    all("[data-pull]", (b) => b.onclick = () => {
      const idx = S.listings.findIndex((x) => x.item.id === +b.dataset.pull);
      const it = S.listings[idx].item;
      S.wardrobe.push(it); S.listings.splice(idx, 1);
      save(); showToast(`已撤下「${it.name}」`);
    });
    const lb = $("[data-lin]");
    if (lb) lb.onclick = () => { modal = { type: "lin", quest: linQuest() }; render(); };
    const la = $("#lin-accept");
    if (la) la.onclick = () => { const st = linState(); st.phase = "active"; st.base = S.stats ? S.stats.sold : 0; modal = null; save(); render(); };
    const lc = $("#lin-claim");
    if (lc) lc.onclick = () => {
      const st = linState(), q = linQuest();
      S.money += q.reward.money; flashMoney = true;
      st.q += 1; st.phase = "offer"; st.base = 0; modal = null; save(); render();
    };
    const lx = $("#lin-close"); if (lx) lx.onclick = () => { modal = null; render(); };
    const rf = $("#refresh"); if (rf) rf.onclick = refreshSocial;
    // 買家殺價
    const hl = () => S.listings.find((x) => x.item.id === modal.item.id);
    const hdone = (ok, text) => { S.haggles.shift(); modal.result = { ok, text }; save(); render(); };
    const hr = $("#hc-rng");
    if (hr) hr.addEventListener("input", () => { modal.counter = +hr.value; $("#hc-p").textContent = "$" + modal.counter; $("#hc-c").textContent = pct(counterChance(modal.offer, modal.ask, modal.counter)); });
    const ha = $("#haggle-accept"); if (ha) ha.onclick = () => { const l = hl(); if (l) completeSale(l, modal.offer); hdone(true, `以 $${modal.offer} 成交。`); };
    const hc2 = $("#haggle-counter");
    if (hc2) hc2.onclick = () => {
      const l = hl(), p = modal.counter;
      if (l && Math.random() < counterChance(modal.offer, modal.ask, p)) { completeSale(l, p); hdone(true, `買家答應了，以 $${p} 成交。`); }
      else hdone(false, "買家不接受，這次沒有成交。商品繼續掛在賣場。");
    };
    const hf = $("#haggle-refuse"); if (hf) hf.onclick = () => hdone(false, "你拒絕了，商品繼續掛在賣場。");
    const hk = $("#haggle-ok"); if (hk) hk.onclick = () => { modal = null; render(); };
    // 向社群賣家出價
    all("[data-haggle]", (b) => b.onclick = () => {
      const o = socialState().offers.find((x) => x.oid === +b.dataset.haggle);
      if (!o) return;
      const lo = Math.ceil(o.ask * C.HAGGLE_BUY_MIN), price = Math.min(o.ask - 1, Math.max(lo, Math.round(o.ask * C.HAGGLE_BUY_DEFAULT)));
      modal = { type: "bargain", oid: o.oid, item: o.item, ask: o.ask, price, result: null }; render();
    });
    const br = $("#bg-rng");
    if (br) br.addEventListener("input", () => { modal.price = +br.value; $("#bg-p").textContent = "$" + modal.price; $("#bg-c").textContent = pct(buyChance(modal.price, modal.ask)); $("#bargain-go").disabled = S.money < modal.price; });
    const bc = $("#bargain-cancel"); if (bc) bc.onclick = () => { modal = null; render(); };
    const bgo = $("#bargain-go");
    if (bgo) bgo.onclick = () => {
      const m = modal;
      if (S.money < m.price) return;
      if (Math.random() < buyChance(m.price, m.ask)) {
        buyOffer(m.oid, m.price, true); S.stats.bargained = (S.stats.bargained || 0) + 1;
        modal.result = { ok: true, text: `賣家答應了，以 $${m.price} 買下「${m.item.name}」。` };
      } else {
        const so = socialState(); so.offers = so.offers.filter((x) => x.oid !== m.oid);
        modal.result = { ok: false, text: "賣家不接受，這則貼文就不能買了。" };
      }
      save(); render();
    };
    const bk = $("#bargain-ok"); if (bk) bk.onclick = () => { modal = null; render(); };
    all("[data-buy]", (b) => b.onclick = () => buyOffer(+b.dataset.buy));
    const ch = $("#close-hint"); if (ch) ch.onclick = () => { modal = null; render(); };
    const nd = $("#nextday"); if (nd) nd.onclick = nextDay;
    const qm = $("#quest-more"); if (qm) qm.onclick = () => { questOpen = !questOpen; render(); };
    const qg = $("#quest-go"); if (qg) qg.onclick = () => { questGuide = true; render(); };
    const gear = $("#open-settings"); if (gear) gear.onclick = () => { modal = { type: "settings" }; render(); };

    // 設定
    const sc = $("#set-contrast");
    if (sc) sc.onclick = () => { S.settings = S.settings || {}; S.settings.contrast = !S.settings.contrast; save(); render(); };
    const rt = $("#replay-tut");
    if (rt) rt.onclick = () => { S.tutorial = "goWardrobe"; delete S.quest; modal = null; view = "home"; save(); render(); };
    const rs = $("#reset-save");
    if (rs) rs.onclick = () => { modal.confirmReset = true; render(); };
    const ry = $("#reset-yes");
    if (ry) ry.onclick = () => {
      try { localStorage.removeItem(C.SAVE_KEY); } catch (e) { /* 略過 */ }
      S = null; modal = null; view = "create"; draft.name = ""; render();
    };
    const cl = $("#close-settings"); if (cl) cl.onclick = () => { modal = null; render(); };

    // 標價
    const pr = $("#pr");
    if (pr) {
      const rng = $("#rng");
      const setPrice = (v, from) => {
        modal.price = Math.max(0, Math.floor(+v || 0));
        if (from !== "input") pr.value = modal.price;
        if (from !== "range") {
          rng.max = Math.max(marketPrice(modal.item) * C.PRICE_SLIDER_MAX_RATIO, modal.price);
          rng.value = modal.price;
        }
        const eta = $("#eta"), yp = $("#yp"), hi = $("#high");
        if (eta) eta.textContent = modal.price > 0 ? chanceText(modal.price, modal.item) : "—";
        if (yp) yp.textContent = "$" + modal.price;
        if (hi) hi.hidden = !(modal.price > marketPrice(modal.item) * C.HIGH_PRICE_RATIO);
      };
      pr.addEventListener("input", () => setPrice(pr.value, "input"));
      rng.addEventListener("input", () => setPrice(rng.value, "range"));
      all("[data-step]", (b) => b.onclick = () => setPrice(Math.max(C.PRICE_MIN, modal.price + (+b.dataset.step)), "step"));
      all("[data-pct]", (b) => b.onclick = () => {
        setPrice(Math.max(C.PRICE_MIN, Math.round(modal.price + marketPrice(modal.item) * (+b.dataset.pct) / 100)), "step");
        if (S.tutorial === "price" && tutSub === 1) { tutSub = 2; render(); }
      });
      $("#cancel").onclick = () => { if (S.tutorial === "price") S.tutorial = "pick"; modal = null; render(); };
      $("#confirm-price").onclick = () => {
        const price = Math.floor(+pr.value);
        if (!(price >= C.PRICE_MIN)) { pr.focus(); return; }
        const it = modal.item;
        const wasEdit = modal.edit;
        if (wasEdit) {
          const l = S.listings.find((x) => x.item.id === it.id);
          l.price = price; // 改價不重設掛賣天數，滯銷提醒不會被洗掉
        } else {
          S.wardrobe = S.wardrobe.filter((x) => x.id !== it.id);
          S.listings.push({ item: it, price, listedDay: S.day });
          if (S.tutorial === "price") { if (S.wardrobe.length) S.tutorial = "keep"; else endTutorial(); }
        }
        modal = null; save(); showToast(wasEdit ? "已改價" : `已上架「${it.name}」`);
      };
    }
    const po = $("#pack-open"); if (po) po.onclick = () => { modal = { type: "pack" }; render(); };
    const pc = $("#pack-close"); if (pc) pc.onclick = () => { modal = null; render(); };
    all("[data-pack]", (b) => b.onclick = () => { const r = packOne(+b.dataset.pack); if (modal && modal.type === "pack") modal.last = r; questCheck(); render(); });
    const skc = $("#skip-cancel"); if (skc) skc.onclick = () => { modal = null; render(); };
    const so2 = $("#skip-ok"); if (so2) so2.onclick = () => { S.tutorial = "done"; S.quest = 0; S.questV = 2; modal = null; save(); render(); };
    const rc = $("#reward-claim");
    if (rc) rc.onclick = () => {
      if (!S.rewardGot) { S.rewardGot = true; S.wardrobe.push({ ...C.TUTORIAL_REWARD, id: nextItemId(), condition: "良好", cost: 0, kept: false, reward: true }); }
      save(); modal = { type: "seasonHint", tutEnd: true }; render();
    };
    const cs = $("#close-summary");
    if (cs) cs.onclick = () => {
      const hint = modal.seasonHint;
      if (hint) S.seen = { ...(S.seen || {}), season: true };
      modal = hint ? { type: "seasonHint" } : null;
      save(); render();
    };
    const cm = $("#close-market");
    if (cm) cm.onclick = () => { modal = null; render(); };
  }

  // 供自我檢查與測試使用
  window.__game = { get state() { return S; }, linVisible, playerLook, trendOf, tagCoef, nextDay, saleChance, marketPrice, sprite };
  render();
})();
