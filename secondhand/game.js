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
      return s;
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(C.SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 儲存失敗時略過 */ }
  }
  const settings = () => (S && S.settings) || {};
  function applyContrast() { document.body.classList.toggle("contrast", !!settings().contrast); }

  // ---------- 規則 ----------
  const marketPrice = (it) => Math.round(it.base * C.MARKET_FACTOR);
  function waitDays(price, it) {
    const ratio = price / marketPrice(it);
    const extra = ratio > 1 ? Math.ceil((ratio - 1) / C.WAIT_STEP) : 0;
    return Math.min(C.WAIT_MAX_DAYS, C.WAIT_MIN_DAYS + extra);
  }
  const tutDone = () => S.tutorial === "done";
  const findItem = (id) => S.wardrobe.find((i) => i.id === id);

  function newGame(p) {
    const wardrobe = [];
    for (let i = 0; i < C.START_ITEM_COUNT; i++) {
      const t = C.ITEM_TEMPLATES[i % C.ITEM_TEMPLATES.length];
      wardrobe.push({ id: i + 1, name: t.name, type: t.type, tags: t.tags, condition: "良好",
        base: t.base, cost: 0, color: t.color, kept: false });
    }
    return { player: p, money: C.START_MONEY, day: 1, wardrobe, listings: [],
      tutorial: "goWardrobe", settings: { contrast: false } };
  }

  function nextDay() {
    S.day += 1;
    const sales = [];
    S.listings = S.listings.filter((l) => {
      if (S.day - l.listedDay >= l.waitDays) {
        S.money += l.price;
        sales.push({ name: l.item.name, price: l.price, item: l.item });
        return false;
      }
      return true;
    });
    modal = { type: "summary", sales };
    if (sales.length && S.tutorial === "wait") { S.tutorial = "done"; modal.intro = sales[0].item; }
    if (sales.length) flashMoney = true;
    save(); render();
  }

  function showToast(msg) {
    toast = msg; render();
    setTimeout(() => { if (toast === msg) { toast = ""; render(); } }, 1800);
  }

  // ---------- 工具 ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // 玩家圖由 tools/pixel_art/player.py 產生（與 NPC 同一套引擎）
  // 玩家圖：身體底圖（art/player/）加上用 SVG 疊的五官格子（art/player/face.js），27×53 格
  const sprite = (p) => {
    const q = { ...C.DEFAULT_LOOK, ...p }, F = window.PLAYER_FACE, col = F.colors[`${q.hair}_${q.skin}`];
    const i = F.atlas.keys.indexOf(`${q.hair}_${q.skin}_${q.top}_${q.bottom}`);
    const cells = [...F.geo.eyes[q.eyes], ...F.geo.blush, ...(q.freckles === "on" ? F.geo.freckles : []), ...F.geo.mouth[q.mouth]]
      .map(([x, y, r]) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${r === "iris" ? F.iris[q.iris] : col[r]}"/>`).join("");
    const gl = q.glasses === "none" ? "" : F.geo.glasses[q.glasses].map(([x, y, c]) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`).join("");
    const hw = q.headwear === "none" ? "" : F.hw[`${q.hair}_${q.headwear}`].map(([x, y, c]) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`).join("");
    return `<svg class="sprite" viewBox="0 0 27 53" role="img" aria-label="${esc(q.name || "你的角色")}"><image href="art/player/atlas.png" x="${-(i % F.atlas.cols) * 27}" y="${-Math.floor(i / F.atlas.cols) * 53}" width="${F.atlas.cols * 27}" height="${Math.ceil(F.atlas.keys.length / F.atlas.cols) * 53}"/>${hw}${cells}${gl}</svg>`;
  };
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
  function render() {
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
  }
  // Esc 關閉彈窗（等同按該彈窗的關閉鈕）
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !modal) return;
    const b = app.querySelector("#cancel, #close-settings, #close-summary, #close-market");
    if (b) b.click();
  });

  function shell() {
    let body = "";
    if (view === "home") body = homeView();
    else if (view === "wardrobe") body = wardrobeView();
    else body = marketView();
    const nav = (id, label) => {
      const hl = S.tutorial === "goWardrobe" && id === "wardrobe" ? " hl" : "";
      // 教學第一步：先淡出其他分頁，只留要點的那個
      const dim = S.tutorial === "goWardrobe" && id !== "wardrobe" && id !== view ? " dim" : "";
      const goHome = S.tutorial === "wait" && id === "home" && view !== "home" ? " hl" : "";
      return `<button data-nav="${id}" class="${view === id ? "on" : ""}${hl}${dim}${goHome}"${view === id ? ' aria-current="page"' : ""}>${label}</button>`;
    };
    const primary = view === "home"
      ? `<div class="primary-bar"><button class="btn ${S.tutorial === "wait" ? "hl" : ""}" id="nextday">進入下一天</button></div>` : "";
    const f = flashMoney ? " flash" : "";
    flashMoney = false;
    return `<div class="status"><span>第 ${S.day} 天</span><span class="money${f}">$ ${S.money}</span>
        <button class="gear" id="open-settings" aria-label="設定">設定</button></div>
      ${tipView()}${body}${primary}
      <nav class="nav">${nav("home", "首頁")}${nav("wardrobe", "衣櫃")}${nav("market", "賣場")}</nav>
      ${modalView()}${toast && !modal ? `<div class="toast" role="status">${esc(toast)}</div>` : ""}`;
  }

  function tipView() {
    const msg = {
      goWardrobe: "<b>新手教學</b>　衣櫃塞滿了。點下方「衣櫃」，挑一件賣掉。",
      sell: "<b>新手教學</b>　按任何一件衣服的「賣」。",
      wait: "<b>新手教學</b>　已上架。回首頁按「進入下一天」，等買家。",
    }[S.tutorial];
    return msg ? `<div class="tip">${msg}<br><button class="skip" id="skip-tut">跳過教學</button></div>` : "";
  }

  function createView() {
    const group = (key, label, list) => `<div class="field"><span class="lab">${label}</span><div class="opts">${list.map((o) => `<button class="opt ${draft[key] === o.id ? "on" : ""}" aria-pressed="${draft[key] === o.id}" data-look="${key}:${o.id}">${o.name}</button>`).join("")}</div></div>`;
    const skins = C.SKIN_TONES.map((s) => `<button class="opt swatch ${draft.skin === s.id ? "on" : ""}" aria-pressed="${draft.skin === s.id}" data-look="skin:${s.id}" style="background:${s.color}" aria-label="膚色：${s.name}"></button>`).join("");
    const ok = !!draft.name.trim();
    return `<div class="status"><span>${C.TITLE_ZH}</span><small>${C.TITLE_EN}</small></div>
      <div class="win"><h2>創角</h2><div class="body">
        <p class="muted" style="margin-top:0">你愛買衣服，衣櫃早就塞不下了。先決定自己的樣子。</p>
        <div class="preview">${sprite(draft)}</div>
        <div class="field"><label for="nm">名字</label><div class="namerow"><input id="nm" type="text" maxlength="8" value="${esc(draft.name)}" placeholder="最多 8 個字" autocomplete="off"><button class="btn alt" id="rnd-name">隨機名字</button></div></div>
        <button class="btn alt block" id="rnd-look">隨機外觀</button>
        ${group("hair", "髮型", C.HAIR_STYLES)}
        <div class="field"><span class="lab">膚色</span><div class="opts">${skins}</div></div>
        ${group("eyes", "眼睛", C.EYES)}${group("iris", "眼珠顏色", C.EYE_COLORS)}${group("mouth", "嘴巴", C.MOUTHS)}${group("freckles", "雀斑", C.FRECKLES)}
        ${group("headwear", "頭飾", C.HEADWEAR)}${group("glasses", "眼鏡", C.GLASSES)}${group("top", "上衣", C.TOPS)}${group("bottom", "下身", C.BOTTOMS)}
        <button class="btn block" id="start" ${ok ? "" : "disabled"}>開始</button>
        <p class="why" id="why" ${ok ? "hidden" : ""}>請先輸入名字。</p>
      </div></div>`;
  }

  function homeView() {
    const stale = staleListings().length;
    const full = S.wardrobe.length >= C.WARDROBE_CAPACITY;
    return `<img class="room" src="art/小套房背景.png" alt="小套房" width="832" height="768">
      <div class="win"><h2>${esc(S.player.name)}</h2><div class="body me">
        ${sprite(S.player)}
        <div><div class="muted">衣櫃 <span class="${full ? "full" : ""}">${S.wardrobe.length}/${C.WARDROBE_CAPACITY}</span>　賣場 ${S.listings.length} 件</div></div>
      </div></div>
      ${stale ? `<div class="tip"><b>提醒</b>　有 ${stale} 件掛賣超過 ${C.STALE_DAYS} 天，可到賣場調整價格。</div>` : ""}`;
  }

  function itemCard(i, first) {
    const hl = (S.tutorial === "goWardrobe" || S.tutorial === "sell") && first && !i.kept ? " hl" : "";
    const meta = `${esc(i.type)}・${i.tags.map(esc).join("、")}`;
    const val = tutDone() ? `<div class="muted">基礎價值 $${i.base}</div>` : "";
    // 留下的衣服不顯示「賣」，要賣得先按「不留」，避免誤賣
    const acts = `${i.kept ? "" : `<button class="btn small${hl}" data-sell="${i.id}">賣</button>`}
      <button class="btn small alt" data-keep="${i.id}" aria-pressed="${i.kept}">${i.kept ? "不留" : "留"}</button>`;
    const name = `${esc(i.name)}${i.kept ? ' <span class="badge">留</span>' : ""}`;
    if (layout === "grid") {
      return `<div class="card"><div class="swatch-item" style="background:${i.color}"></div>
        <div>${name}</div><div class="muted">${meta}</div>${val}<div class="btns2">${acts}</div></div>`;
    }
    return `<div class="item"><div class="swatch-item" style="background:${i.color}"></div>
      <div class="info"><div>${name}</div><div class="muted">${meta}・${esc(i.condition)}</div>${val}</div>
      <div class="acts">${acts}</div></div>`;
  }

  function wardrobeView() {
    const tabs = C.CATEGORIES.map((c) => `<button class="opt ${cat === c ? "on" : ""}" aria-pressed="${cat === c}" data-cat="${c}">${c}</button>`).join("");
    const items = S.wardrobe.filter((i) => cat === "全部" || i.type === cat);
    const full = S.wardrobe.length >= C.WARDROBE_CAPACITY;
    const firstSellable = items.find((i) => !i.kept);
    const cards = items.map((i) => itemCard(i, i === firstSellable)).join("");
    const list = layout === "grid" ? `<div class="grid">${cards}</div>` : cards;
    const empty = S.wardrobe.length === 0 ? "衣櫃是空的。" : "這個分類沒有衣服。";
    return `<div class="tabs">${tabs}</div>
      <div class="viewsw"><button class="opt ${layout === "grid" ? "on" : ""}" aria-pressed="${layout === "grid"}" data-layout="grid">網格</button>
        <button class="opt ${layout === "list" ? "on" : ""}" aria-pressed="${layout === "list"}" data-layout="list">清單</button></div>
      <div class="win"><h2>衣櫃　<span class="${full ? "full" : ""}" style="${full ? "color:#ffd0b8" : ""}">${S.wardrobe.length}/${C.WARDROBE_CAPACITY}${full ? "　已爆滿" : ""}</span></h2>
        <div class="body">${cards ? list : `<p class="muted empty">${empty}</p>`}</div></div>`;
  }

  function marketView() {
    const rows = S.listings.map((l) => {
      const d = S.day - l.listedDay;
      const stale = d > C.STALE_DAYS;
      return `<div class="item">
        <div class="swatch-item" style="background:${l.item.color}"></div>
        <div class="info"><div>${esc(l.item.name)}</div>
          <div>標價 $${l.price}・已掛 ${d} 天</div>
          ${tutDone() ? `<div class="muted">市場價 $${marketPrice(l.item)}・約 ${Math.max(1, l.waitDays - d)} 天後成交</div>` : ""}
          ${stale ? `<div class="warn">掛太久了，考慮調整價格</div>` : ""}</div>
        <div class="acts"><button class="btn small" data-reprice="${l.item.id}">改價</button>
          <button class="btn small alt" data-pull="${l.item.id}">撤下</button></div></div>`;
    }).join("");
    return `<div class="win"><h2>我的賣場（${S.listings.length}）</h2><div class="body">
      ${rows || '<p class="muted empty">還沒有上架的衣服。到衣櫃挑一件「賣」。</p>'}</div></div>`;
  }

  function modalView() {
    if (!modal) return "";
    if (modal.type === "price") {
      const it = modal.item, p = modal.price, mk = marketPrice(it);
      const max = Math.max(mk * C.PRICE_SLIDER_MAX_RATIO, p);
      const known = tutDone();
      const prices = known
        ? `<div class="prices"><div class="p-base"><small>基礎價值</small>$${it.base}</div>
             <div class="p-mkt"><small>市場價</small>$${mk}</div>
             <div class="p-you"><small>你的標價</small><span id="yp">$${p}</span></div></div>
           <div class="kv"><span>預計等待</span><span id="eta">${p > 0 ? waitDays(p, it) + " 天" : "—"}</span></div>
           <div class="warn" id="high" ${p > mk * C.HIGH_PRICE_RATIO ? "" : "hidden"}>標價遠高於市場價，會等很久。</div>`
        : `<p class="muted">先隨意標一個價格。標得越高，通常等得越久。</p>`;
      return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="${modal.edit ? "改價" : "上架"}" tabindex="-1"><h3>${modal.edit ? "改價" : "上架"}：${esc(it.name)}</h3>
        ${prices}
        <div class="stepper">
          <button class="btn alt" data-step="-${C.PRICE_STEP_LARGE}">-${C.PRICE_STEP_LARGE}</button>
          <button class="btn alt" data-step="-${C.PRICE_STEP_SMALL}">-${C.PRICE_STEP_SMALL}</button>
          <input id="pr" type="number" inputmode="numeric" min="${C.PRICE_MIN}" value="${p}" aria-label="標價">
          <button class="btn alt" data-step="${C.PRICE_STEP_SMALL}">+${C.PRICE_STEP_SMALL}</button>
          <button class="btn alt" data-step="${C.PRICE_STEP_LARGE}">+${C.PRICE_STEP_LARGE}</button>
        </div>
        <input id="rng" type="range" min="${C.PRICE_MIN}" max="${max}" value="${Math.max(p, C.PRICE_MIN)}" aria-label="標價滑桿">
        <div class="btns"><button class="btn alt" id="cancel">取消</button><button class="btn main" id="confirm-price">${modal.edit ? "確定" : "上架"}</button></div>
      </div></div>`;
    }
    if (modal.type === "summary") {
      const sales = modal.sales;
      const body = sales.length
        ? sales.map((s) => `<div class="kv"><span>${esc(s.name)}</span><span class="money-up">+$${s.price}</span></div>`).join("")
        : `<p class="muted">今天沒有成交。</p>`;
      return `<div class="mask"><div class="sheet" role="dialog" aria-modal="true" aria-label="當日結算" tabindex="-1"><h3>第 ${S.day} 天・結算</h3>${body}
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
      all("[data-look]", (b) => b.onclick = () => { const [k, v] = b.dataset.look.split(":"); draft[k] = v; render(); });
      const pick = (a) => a[Math.floor(Math.random() * a.length)].id;
      $("#rnd-name").onclick = () => { draft.name = C.RANDOM_NAMES[Math.floor(Math.random() * C.RANDOM_NAMES.length)]; render(); };
      $("#rnd-look").onclick = () => {
        Object.assign(draft, { hair: pick(C.HAIR_STYLES), skin: pick(C.SKIN_TONES), eyes: pick(C.EYES), iris: pick(C.EYE_COLORS), mouth: pick(C.MOUTHS),
          freckles: pick(C.FRECKLES), headwear: pick(C.HEADWEAR), glasses: pick(C.GLASSES), top: pick(C.TOPS), bottom: pick(C.BOTTOMS) });
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
      if (view === "wardrobe" && S.tutorial === "goWardrobe") S.tutorial = "sell";
      save(); render();
    });
    all("[data-cat]", (b) => b.onclick = () => { cat = b.dataset.cat; render(); });
    all("[data-layout]", (b) => b.onclick = () => { layout = b.dataset.layout; render(); });
    all("[data-keep]", (b) => b.onclick = () => { const it = findItem(+b.dataset.keep); it.kept = !it.kept; save(); render(); });
    all("[data-sell]", (b) => b.onclick = () => {
      const it = findItem(+b.dataset.sell);
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
      $("#cancel").onclick = () => { modal = null; render(); };
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
          if (S.tutorial === "sell") S.tutorial = "wait";
        }
        modal = null; save(); showToast(wasEdit ? "已改價" : `已上架「${it.name}」`);
      };
    }
    const cs = $("#close-summary");
    if (cs) cs.onclick = () => {
      const intro = modal.intro;
      modal = intro ? { type: "market", item: intro } : null;
      render();
    };
    const cm = $("#close-market");
    if (cm) cm.onclick = () => { modal = null; render(); };
  }

  // 供自我檢查與測試使用
  window.__game = { get state() { return S; }, waitDays, marketPrice };
  render();
})();
