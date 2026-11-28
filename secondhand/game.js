/* 《衣櫃塞不下》第一階段：創角、衣櫃、上架、每日結算、教學、存檔。
 * 所有數值來自 config.js（皆為佔位值）。 */
(function () {
  "use strict";
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
  let draft = { name: "", hair: C.HAIR_STYLES[0].id, skin: C.SKIN_TONES[1].id, ...C.DEFAULT_LOOK };

  function load() {
    try {
      const raw = localStorage.getItem(C.SAVE_KEY);
      const s = raw ? JSON.parse(raw) : null;
      if (s && s.tutorial === "market") s.tutorial = "done"; // 舊版卡住的狀態
      if (s && s.tutorial === "sell") s.tutorial = "pick";   // 舊版教學狀態對應新版
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
  const marketPrice = (it) => Math.round(it.base * C.MARKET_FACTOR * (1 + trendOf(it)));
  function waitDays(price, it) {
    const ratio = price / marketPrice(it);
    const extra = ratio > 1 ? Math.ceil((ratio - 1) / C.WAIT_STEP) : 0;
    return Math.min(C.WAIT_MAX_DAYS, C.WAIT_MIN_DAYS + extra);
  }
  const tutDone = () => S.tutorial === "done";
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
    const lv = (list) => list.filter((o) => !o.draft || DRAFT_MODE);
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
      const item = rnd(pool)(), f = C.SOCIAL_PRICE_MIN + Math.random() * (C.SOCIAL_PRICE_MAX - C.SOCIAL_PRICE_MIN);
      const ask = Math.max(C.SOCIAL_PRICE_ROUND, Math.round(marketPrice(item) * f / C.SOCIAL_PRICE_ROUND) * C.SOCIAL_PRICE_ROUND);
      offers.push({ oid: ++so.seq, item, ask, who: rnd(C.SOCIAL_HANDLES), color: rnd(C.SOCIAL_COLORS), mins: 1 + Math.floor(Math.random() * 55),
        text: rnd(C.SOCIAL_LINES), likes: Math.floor(Math.random() * 16), cm: Math.floor(Math.random() * 5) });
    }
    offers.sort((x, y) => x.mins - y.mins);
    so.offers = offers; // 沒買的貨隨刷新消失
    save(); render();
  }
  const nextItemId = () => 1 + Math.max(0, ...S.wardrobe.map((i) => i.id), ...S.listings.map((l) => l.item.id));
  function buyOffer(oid) {
    const so = socialState(), o = so.offers.find((x) => x.oid === oid);
    if (!o || S.money < o.ask || S.wardrobe.length >= C.WARDROBE_CAPACITY) return;
    S.money -= o.ask; flashMoney = true;
    S.wardrobe.push({ ...o.item, id: nextItemId(), cost: o.ask });
    so.offers = so.offers.filter((x) => x.oid !== oid);
    save(); showToast(`已買下「${o.item.name}」$${o.ask}`);
  }

  function newGame(p) {
    const wardrobe = starterPicks(p).slice(0, C.START_ITEM_COUNT).map((it, i) => ({ id: i + 1, ...it }));
    // 不足的件數從基本款隨機補（避免和已有的同名）
    const have = new Set(wardrobe.map((x) => x.name));
    const pool = C.ITEM_TEMPLATES.filter((t) => !have.has(t.name)).sort(() => Math.random() - 0.5);
    for (let i = wardrobe.length, k = 0; i < C.START_ITEM_COUNT && k < pool.length; i++, k++) {
      const t = pool[k];
      wardrobe.push({ id: i + 1, name: t.name, type: t.type, tags: t.tags, condition: "良好",
        base: t.base, cost: 0, color: t.color, kept: false });
    }
    return { player: p, money: C.START_MONEY, day: 1, wardrobe, listings: [],
      tutorial: "goWardrobe", settings: { contrast: false }, social: { left: C.SOCIAL_REFRESHES, offers: [], seq: 0 }, stats: { sold: 0 } };
  }

  // 換季：隨機挑 1 個流行與 1 個退燒標籤，不和上一季重複；標籤取自目前所有款式
  function rollSeason() {
    const tags = [...new Set(C.ITEM_TEMPLATES.flatMap((t) => t.tags))], prev = S.season || {};
    const up = rnd(tags.filter((t) => t !== prev.up));
    const down = rnd(tags.filter((t) => t !== prev.down && t !== up));
    S.season = { start: S.day, up, down };
    S.listings.forEach((l) => { l.waitDays = waitDays(l.price, l.item); }); // 已上架商品依新市場價重算等待天數
  }

  function nextDay() {
    S.day += 1;
    S.social = { left: C.SOCIAL_REFRESHES, offers: [], seq: (S.social && S.social.seq) || 0 };
    const sales = [];
    S.listings = S.listings.filter((l) => {
      if (S.day - l.listedDay >= l.waitDays) {
        S.money += l.price;
        sales.push({ name: l.item.name, price: l.price, item: l.item });
        return false;
      }
      return true;
    });
    S.stats = S.stats || { sold: 0 }; S.stats.sold += sales.length;
    modal = { type: "summary", sales };
    if (S.tutorial === "wait") {
      S.tutorial = "done"; modal.tutEnd = true;
      rollSeason(); modal.season = S.season; modal.seasonHint = !(S.seen && S.seen.season);
    } else if (S.season && S.day - S.season.start >= C.SEASON_DAYS) { rollSeason(); modal.season = S.season; }
    if (sales.length) flashMoney = true;
    save(); render();
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
    const it = (id) => F.pal.item[id], pal = { ...F.pal.skin[q.skin], ...F.pal.hair[hairColor], ...F.pal.hw[q.headwearColor],
      shoe: it(q.shoesColor).base, shoe_lo: it(q.shoesColor).lo, sock: it(q.socksColor).base, sock_lo: it(q.socksColor).lo, bag: it(q.bagColor).base, bag_hi: it(q.bagColor).hi, bag_lo: it(q.bagColor).lo };
    const bt = F.pal.btype[q.bottom];
    const over = bt === "pants" && (q.bottom === "flare" || q.shoes === "boot"); // 喇叭褲與穿短靴的長褲，褲口蓋住鞋子
    const resolve = (spec) => {
      if (spec[0] === "#") return spec;
      const [role, op] = spec.split(":"), c = rgb(pal[role]);
      return toHex(op === "dk" ? dk(c) : op === "warm" ? warm(c) : c);
    };
    const layers = [...F.layers.base, ...F.layers["hair:" + q.hair], ...F.layers["top:" + q.top], ...F.layers[over ? `bottom:${q.bottom}:over` : "bottom:" + q.bottom], ...F.layers[`shoes:${q.shoes}:${bt}`],
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
  function tutSpec() {
    const t = S.tutorial, go = (id, text) => ({ sel: `[data-nav="${id}"]`, text });
    if (t === "goWardrobe") return go("wardrobe", "第 1 步　點下方的「衣櫃」，打開你的衣櫃。");
    if (t === "pick") {
      if (modal && modal.type === "item") return { sel: ".sheet [data-sell]", text: "第 3 步　按「賣」，把這件衣服拿去賣。" };
      if (view !== "wardrobe") return go("wardrobe", "點下方的「衣櫃」。");
      return { sel: ".piece.tutfirst", text: "第 2 步　點這件衣服。" };
    }
    if (t === "price" && modal && modal.type === "price") {
      if (tutSub === 0) return { sel: ".prices", text: "第 4 步　這是這件衣服的「基礎價值」和現在的「市場價」。標價越接近市場價，越快賣掉。", next: "我知道了" };
      if (tutSub === 1) return { sel: '[data-pct="10"]', text: "標價越高，要等越久。按一下「+10%」試試看。" };
      return { sel: "#confirm-price", text: "「預計等待」變長了。這樣就可以了，按「上架」。" };
    }
    if (t === "wait") {
      if (view !== "home") return go("home", "第 6 步　回首頁，準備進入下一天。");
      return { sel: "#nextday", text: "第 6 步　按「進入下一天」，看買家有沒有成交。" };
    }
    return null;
  }
  function applySpot() {
    document.querySelectorAll(".spot-hole,.spot-cap").forEach((e) => e.remove());
    spotT = null; placeSpot = null;
    if (!S || view === "create") return;
    if (S.tutorial === "price" && !(modal && modal.type === "price")) S.tutorial = "pick";
    const sp = tutSpec(), t = sp && app.querySelector(sp.sel);
    if (!t) return;
    spotT = t;
    const key = S.tutorial + sp.sel + tutSub;
    if (key !== spotKey) { spotKey = key; t.scrollIntoView({ block: "center" }); }
    const hole = document.createElement("div"), cap = document.createElement("div");
    hole.className = "spot-hole"; cap.className = "spot-cap"; cap.setAttribute("role", "status");
    cap.innerHTML = `<div>${esc(sp.text)}</div><div class="spot-btns">${sp.next ? `<button class="btn small" id="spot-next">${sp.next}</button>` : ""}<button class="skip" id="spot-skip">跳過教學</button></div>`;
    document.body.append(hole, cap);
    placeSpot = () => {
      const r = t.getBoundingClientRect();
      Object.assign(hole.style, { left: r.left - 4 + "px", top: r.top - 4 + "px", width: r.width + 8 + "px", height: r.height + 8 + "px" });
      const sheet = t.closest(".sheet");
      if (sheet) { cap.style.top = "auto"; cap.style.bottom = innerHeight - sheet.getBoundingClientRect().top + 12 + "px"; }   // 視窗開著時，提示放在視窗上方，不蓋住視窗內容
      else if (r.top > innerHeight / 2) { cap.style.top = "auto"; cap.style.bottom = innerHeight - r.top + 14 + "px"; } else { cap.style.bottom = "auto"; cap.style.top = r.bottom + 14 + "px"; }
    };
    placeSpot();
    cap.querySelector("#spot-skip").onclick = () => { S.tutorial = "done"; save(); render(); };
    const nx = cap.querySelector("#spot-next");
    if (nx) nx.onclick = () => { tutSub += 1; render(); };
  }
  window.addEventListener("scroll", () => placeSpot && placeSpot(), { passive: true });
  window.addEventListener("resize", () => placeSpot && placeSpot());
  document.addEventListener("click", (e) => {
    if (!spotT || !document.contains(spotT) || spotT.contains(e.target) || e.target.closest(".spot-cap")) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
  }, true);

  function render() {
    if (S && S.tutorial === "done" && !S.season) rollSeason();
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
    const b = app.querySelector("#cancel, #close-settings, #close-summary, #close-market, #lin-close, #close-hint, #item-close");
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
    return `<div class="status"><span>第 ${S.day} 天</span><span class="money${f}">$ ${S.money}</span>
        <button class="gear" id="open-settings" aria-label="設定">設定</button></div>
      ${tipView()}${body}${primary}
      <nav class="nav">${nav("home", "首頁")}${nav("wardrobe", "衣櫃")}${tutDone() ? nav("social", "社群") : ""}${nav("market", "賣場")}</nav>
      ${modalView()}${toast && !modal ? `<div class="toast" role="status">${esc(toast)}</div>` : ""}`;
  }

  // 教學：主要步驟用聚光燈（見 applySpot），只有「自己試試看」這一步用頂部提示
  function tipView() {
    if (!S || S.tutorial !== "rest") return "";
    const n = S.wardrobe.filter((i) => !i.kept).length;
    return `<div class="tip"><b>新手教學</b>　第 5 步　剩下 ${n} 件，自己試試看：點衣服 → 賣 → 標價 → 上架。全部上架後再進行下一步。<br><button class="skip" id="skip-tut">跳過教學</button></div>`;
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
  const live = (list) => list.filter((o) => !o.draft || DRAFT_MODE);

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

  function trendBar() {
    if (!S.season || !tutDone()) return "";
    const left = Math.max(0, S.season.start + C.SEASON_DAYS - S.day);
    return `<div class="trend"><span>本季流行　<b class="up">${esc(S.season.up)} ▲</b>　退燒　<b class="down">${esc(S.season.down)} ▼</b></span><small>還有 ${left} 天換季</small></div>`;
  }

  function homeView() {
    const stale = staleListings().length;
    const full = S.wardrobe.length >= C.WARDROBE_CAPACITY;
    const tidy = S.wardrobe.length <= C.TIDY_AT;
    const roomImg = `<img class="room" src="art/${tidy ? "小套房_整理後" : "小套房背景"}.png" alt="${tidy ? "整理後的小套房" : "小套房"}" width="832" height="768">`;
    // 林（作者彩蛋）：依任務鏈出現，點她開對話
    const lq = linVisible() ? linQuest() : null;
    const mark = lq && (linState().phase === "offer" || linProgress(lq)[0] >= linProgress(lq)[1]) ? '<span class="mark" aria-hidden="true">!</span>' : "";
    const roomHtml = lq ? `<div class="roomwrap">${roomImg}<button class="lin" data-lin aria-label="林">${mark}<img src="art/林_透明.png" alt="" width="216" height="424"></button></div>` : roomImg;
    return `${roomHtml}
      ${trendBar()}
      <div class="win"><h2>${esc(S.player.name)}</h2><div class="body me">
        ${sprite(S.player)}
        <div><div class="muted">衣櫃 <span class="${full ? "full" : ""}">${S.wardrobe.length}/${C.WARDROBE_CAPACITY}</span>　賣場 ${S.listings.length} 件</div></div>
      </div></div>
      ${stale ? `<div class="tip"><b>提醒</b>　有 ${stale} 件掛賣超過 ${C.STALE_DAYS} 天，可到賣場調整價格。</div>` : ""}`;
  }

  // 衣櫃：開放式衣架加層架。上衣與外套、下身掛在衣桿上，鞋子與包包放在層架上；點衣服開詳情，再選賣或留。
  const RACK = [["上衣與外套", ["上衣", "外套"], "rail"], ["下身", ["下身"], "rail"], ["鞋子", ["鞋子"], "shelf"], ["包包", ["包包"], "shelf"]];
  function piece(i, hl) {
    const svg = thumbSvg(i) || `<div class="swatch-item" style="background:${i.color};width:48px;height:48px"></div>`;
    return `<button class="piece${hl ? " tutfirst" : ""}${i.kept ? " kept" : ""}" data-item="${i.id}" aria-label="${esc(i.name)}${i.kept ? "（留）" : ""}">
      <span class="pic">${svg}</span><span class="pname">${esc(i.name)}</span>${i.kept ? '<span class="badge">留</span>' : ""}</button>`;
  }
  function wardrobeView() {
    const tabs = C.CATEGORIES.map((c) => `<button class="opt ${cat === c ? "on" : ""}" aria-pressed="${cat === c}" data-cat="${c}">${c}</button>`).join("");
    const full = S.wardrobe.length >= C.WARDROBE_CAPACITY;
    const items = S.wardrobe.filter((i) => cat === "全部" || i.type === cat);
    const first = items.find((i) => !i.kept);
    const tut = S.tutorial === "pick";
    const rows = RACK.map(([label, types, kind]) => {
      const list = items.filter((i) => types.includes(i.type));
      if (!list.length) return "";
      return `<div class="rack-row ${kind}"><span class="rlabel">${label}</span><div class="pieces">${list.map((i) => piece(i, tut && i === first)).join("")}</div></div>`;
    }).join("");
    const empty = S.wardrobe.length === 0 ? "衣櫃是空的。" : "這個分類沒有衣服。";
    return `<div class="tabs">${tabs}</div>
      <div class="rack-note"><span>衣櫃</span><span class="${full ? "full" : ""}">${S.wardrobe.length}/${C.WARDROBE_CAPACITY}${full ? "　已爆滿" : ""}</span></div>
      <div class="rack">${rows || `<p class="muted empty" style="padding:16px">${empty}</p>`}<div class="rack-floor"></div></div>`;
  }

  let socialTab = "new";
  const HEART = '<svg viewBox="0 0 7 6" width="21" height="18" aria-hidden="true"><path fill="#a65a89" d="M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z"/></svg>';
  const CHAT = '<svg viewBox="0 0 7 6" width="21" height="18" aria-hidden="true"><path fill="#6c4a50" d="M0 0h7v4H4v1H3V4H0z"/></svg>';
  function socialView() {
    const so = socialState(), full = S.wardrobe.length >= C.WARDROBE_CAPACITY;
    const tabs = [["new", "最新"], ["deal", "撿漏"], ["hot", "熱門"]].map(([id, n]) => `<button class="${socialTab === id ? "on" : ""}" role="tab" aria-selected="${socialTab === id}" data-stab="${id}">${n}</button>`).join("");
    let offers = so.offers.slice();
    if (socialTab === "deal") offers = offers.filter((o) => o.ask < marketPrice(o.item));
    if (socialTab === "hot") offers.sort((x, y) => y.likes - x.likes);
    const posts = offers.map((o) => {
      const mk = marketPrice(o.item), d = o.ask - mk;
      const diff = d < 0 ? `<span class="money-up">低於市場價 $${-d}</span>` : d > 0 ? `<span class="warn">高於市場價 $${d}</span>` : `<span class="muted">與市場價相同</span>`;
      const chips = o.item.tags.map((t) => `<span class="chip">${esc(t)}${tagCoef(t) > 0 ? " ▲" : tagCoef(t) < 0 ? " ▼" : ""}</span>`).join("");
      const can = S.money >= o.ask && !full;
      return `<article class="post"><div class="hd"><div class="av" style="background:${o.color}" aria-hidden="true">${esc(o.who[1].toUpperCase())}</div>
          <div class="nm">${esc(o.who)}<small>${o.mins} 分鐘前</small></div></div>
        <div>${esc(o.text)}</div>
        <div class="pimg">${thumbSvg(o.item) || ""}</div>
        <div><b>${esc(o.item.name)}</b>　<span class="muted">${esc(o.item.type)}</span></div>
        <div class="price"><b>開價 $${o.ask}</b><span class="muted">市場價 $${mk}</span>${diff}</div>
        <div class="ft">${HEART}<span>${o.likes}</span>${CHAT}<span>${o.cm}</span>${chips}<span class="sp"></span>
          <button class="btn small" data-buy="${o.oid}" ${can ? "" : "disabled"}>${full ? "衣櫃滿" : S.money < o.ask ? "錢不夠" : "買下"}</button></div></article>`;
    }).join("");
    const empty = !so.offers.length ? "還沒有貨。按「刷新看看」。" : "這個分頁目前沒有貨。";
    return `${trendBar()}<div class="stabs" role="tablist">${tabs}</div>
      <div class="sbar"><span>刷新 ${so.left}/${C.SOCIAL_REFRESHES}</span><button class="btn small" id="refresh" ${so.left > 0 ? "" : "disabled"}>${so.left > 0 ? "刷新看看" : "今天刷完了"}</button></div>
      ${full ? '<p class="warn" style="padding:0 12px">衣櫃已滿，先賣或清掉幾件才買得下。</p>' : ""}
      <div class="feed">${posts || `<p class="muted empty" style="padding:16px">${empty}</p>`}</div>`;
  }

  let marketTab = "all";
  function marketView() {
    const left = (l) => Math.max(1, l.waitDays - (S.day - l.listedDay));
    const tabs = [["all", `全部 ${S.listings.length}`], ["wait", "等待中"], ["soon", "快成交"]].map(([id, n]) => `<button class="${marketTab === id ? "on" : ""}" aria-pressed="${marketTab === id}" data-mtab="${id}">${n}</button>`).join("");
    const list = S.listings.filter((l) => marketTab === "all" || (marketTab === "soon" ? left(l) <= 1 : left(l) > 1));
    const cards = list.map((l) => {
      const d = S.day - l.listedDay, stale = d > C.STALE_DAYS;
      return `<div class="prod"><span class="ptag">$${l.price}</span><div class="ppic">${thumbSvg(l.item) || ""}</div>
        <div class="pinfo"><div>${esc(l.item.name)}</div><div class="muted">已掛 ${d} 天${tutDone() ? `・市場價 $${marketPrice(l.item)}` : ""}</div>
          ${tutDone() ? `<div class="muted">約 ${left(l)} 天後成交</div>` : ""}${stale ? `<div class="warn">掛太久了，考慮調整價格</div>` : ""}</div>
        <div class="pbtns"><button class="btn small" data-reprice="${l.item.id}">改價</button><button class="btn small alt" data-pull="${l.item.id}">撤下</button></div></div>`;
    }).join("");
    const empty = S.listings.length ? "這個分頁沒有商品。" : "還沒有上架的衣服。到衣櫃挑一件「賣」。";
    return `<div class="banner"><div>${esc(S.player.name)}的賣場</div><small>掛賣 ${S.listings.length} 件</small></div>
      <div class="mtabs">${tabs}</div>
      <div class="pgrid">${cards || `<p class="muted empty" style="grid-column:1/-1">${empty}</p>`}</div>`;
  }

  function modalView() {
    if (!modal) return "";
    if (modal.type === "price") {
      const it = modal.item, p = modal.price, mk = marketPrice(it);
      const max = Math.max(mk * C.PRICE_SLIDER_MAX_RATIO, p);
      const prices = `<div class="prices"><div class="p-base"><small>基礎價值</small>$${it.base}</div>
             <div class="p-mkt"><small>市場價</small>$${mk}</div>
             <div class="p-you"><small>你的標價</small><span id="yp">$${p}</span></div></div>
           ${trendOf(it) ? `<div class="kv"><span>流行影響</span><span class="${trendOf(it) > 0 ? "money-up" : "warn"}">${trendOf(it) > 0 ? "+" : ""}${Math.round(trendOf(it) * 100)}%</span></div>` : ""}
           <div class="kv"><span>預計等待</span><span id="eta">${p > 0 ? waitDays(p, it) + " 天" : "—"}</span></div>
           <div class="warn" id="high" ${p > mk * C.HIGH_PRICE_RATIO ? "" : "hidden"}>標價遠高於市場價，會等很久。</div>`;
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
    if (modal.type === "summary") {
      const sales = modal.sales;
      const body = sales.length
        ? sales.map((s) => `<div class="kv"><span>${esc(s.name)}${s.item.cost ? `<small class="muted">（成本 $${s.item.cost}）</small>` : ""}</span><span class="money-up">+$${s.price}</span></div>`).join("")
        : `<p class="muted">今天沒有成交。</p>`;
      return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="當日結算" tabindex="-1"><img class="room night" src="art/小套房_夜晚.png" alt="" width="832" height="768"><h3>第 ${S.day} 天・結算</h3>${body}
        ${modal.season ? `<p>換季了：流行 <b>${esc(modal.season.up)}</b> ▲，退燒 <b>${esc(modal.season.down)}</b> ▼。</p>` : ""}
        ${modal.tutEnd ? '<p class="muted">教學完成。之後每天結算一次，買家會依你的標價陸續成交。</p>' : ""}
        <div class="kv"><span>目前金錢</span><span>$${S.money}</span></div>
        <div class="btns"><button class="btn main" id="close-summary">好</button></div></div></div>`;
    }
    if (modal.type === "market") {
      const it = modal.item;
      return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="第一筆收入" tabindex="-1"><h3>第一筆收入</h3>
        <p>「${esc(it.name)}」賣出去了，這是你的第一筆本金。認識兩個數字：</p>
        <div class="kv"><span>基礎價值</span><span>$${it.base}</span></div>
        <p class="muted" style="margin-top:0">這件衣服本身應有的價值，固定不變。</p>
        <div class="kv"><span>市場價</span><span>$${marketPrice(it)}</span></div>
        <p class="muted" style="margin-top:0">現在市場上願意買的價格。標價越接近市場價，成交越快；高出越多，等得越久。目前市場價等於基礎價值，之後會隨流行波動。</p>
        <div class="btns"><button class="btn main" id="close-market">我知道了</button></div></div></div>`;
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
        <div class="kv"><span>基礎價值</span><span>$${i.base}</span></div>
        ${i.cost > 0 && tutDone() ? `<div class="kv"><span>成本</span><span>$${i.cost}</span></div>` : ""}
        ${i.kept ? '<p class="muted">已標為「留」。要賣先按「不留」。</p>' : ""}
        <div class="btns"><button class="btn alt" id="item-close">關閉</button>
          <button class="btn alt" data-keep="${i.id}" aria-pressed="${i.kept}">${i.kept ? "不留" : "留"}</button>
          ${i.kept ? "" : `<button class="btn main" data-sell="${i.id}">賣</button>`}</div></div></div>`;
    }
    if (modal.type === "seasonHint") {
      return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="流行說明" tabindex="-1"><h3>流行與退燒</h3>
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
        view = "home"; save(); render();
      };
      return;
    }

    all("[data-nav]", (b) => b.onclick = () => {
      view = b.dataset.nav;
      if (view === "social" && !(S.seen && S.seen.social)) { S.seen = { ...(S.seen || {}), social: true }; modal = { type: "socialHint" }; }
      if (view === "wardrobe" && S.tutorial === "goWardrobe") S.tutorial = "pick";
      save(); render();
    });
    all("[data-cat]", (b) => b.onclick = () => { cat = b.dataset.cat; render(); });
    all("[data-item]", (b) => b.onclick = () => { modal = { type: "item", id: +b.dataset.item }; render(); });
    const ic = $("#item-close"); if (ic) ic.onclick = () => { modal = null; render(); };
    all("[data-stab]", (b) => b.onclick = () => { socialTab = b.dataset.stab; render(); });
    all("[data-mtab]", (b) => b.onclick = () => { marketTab = b.dataset.mtab; render(); });
    all("[data-keep]", (b) => b.onclick = () => { const it = findItem(+b.dataset.keep); it.kept = !it.kept; save(); render(); });
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
    all("[data-buy]", (b) => b.onclick = () => buyOffer(+b.dataset.buy));
    const ch = $("#close-hint"); if (ch) ch.onclick = () => { modal = null; render(); };
    const nd = $("#nextday"); if (nd) nd.onclick = nextDay;
    const sk = $("#skip-tut"); if (sk) sk.onclick = () => { S.tutorial = "done"; save(); render(); };
    const gear = $("#open-settings"); if (gear) gear.onclick = () => { modal = { type: "settings" }; render(); };

    // 設定
    const sc = $("#set-contrast");
    if (sc) sc.onclick = () => { S.settings = S.settings || {}; S.settings.contrast = !S.settings.contrast; save(); render(); };
    const rt = $("#replay-tut");
    if (rt) rt.onclick = () => { S.tutorial = "goWardrobe"; modal = null; view = "home"; save(); render(); };
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
        if (eta) eta.textContent = modal.price > 0 ? waitDays(modal.price, modal.item) + " 天" : "—";
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
          l.price = price; l.waitDays = waitDays(price, it); // 改價重算等待天數，但掛賣天數照舊，滯銷提醒不會被洗掉
        } else {
          S.wardrobe = S.wardrobe.filter((x) => x.id !== it.id);
          S.listings.push({ item: it, price, listedDay: S.day, waitDays: waitDays(price, it) });
          if (S.tutorial === "price" || S.tutorial === "rest") S.tutorial = S.wardrobe.some((x) => !x.kept) ? "rest" : "wait";
        }
        modal = null; save(); showToast(wasEdit ? "已改價" : `已上架「${it.name}」`);
      };
    }
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
  window.__game = { get state() { return S; }, linVisible, trendOf, tagCoef, nextDay, waitDays, marketPrice, sprite };
  render();
})();
