// 議價檢查：買家殺價（接受、還價成功、還價失敗、拒絕）與向社群賣家出價（成功、失敗）。
// 用法：SP=截圖資料夾 node tools/qa/qa_haggle.js
const { chromium } = require('playwright'); const path = require('path'); const SP = process.env.SP || '.';
(async () => {
  const b = await chromium.launch(); const errs = []; const out = [];
  async function fresh(rand, seed) {
    const p = await b.newPage({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 1 });
    p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.addInitScript((r) => { window.__rand = r; Math.random = () => window.__rand; }, rand);
    await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
    await p.evaluate(() => localStorage.clear()); await p.reload();
    await p.fill('#nm', '小雨'); await p.click('#start');
    await p.evaluate((src) => { const sd = eval(src);
      const s = JSON.parse(localStorage.getItem('overstuffed-save-v1')); s.tutorial = 'done'; s.quest = 99; s.season = { start: 1, up: '街頭', down: '運動' };
      s.money = 500; Object.assign(s, sd(s)); localStorage.setItem('overstuffed-save-v1', JSON.stringify(s));
    }, seed.toString());
    await p.reload(); return p;
  }
  const st = (p) => p.evaluate(() => { const s = window.__game.state; return { money: s.money, sold: s.stats.sold, listings: s.listings.length, haggles: (s.haggles || []).length }; });
  const seedHaggle = (s) => { const it = s.wardrobe[0]; return { wardrobe: s.wardrobe.slice(1), listings: [{ item: it, price: 100, listedDay: 1 }], haggles: [{ id: it.id, offer: 80 }], stats: { sold: 0 } }; };
  // 買家殺價：接受
  let p = await fresh(0.5, seedHaggle);
  await p.screenshot({ path: path.join(SP, 'haggle.png') });
  await p.click('#haggle-accept'); out.push(['接受', await st(p)]); await p.click('#haggle-ok'); await p.close();
  // 還價成功（亂數 0.01）
  p = await fresh(0.01, seedHaggle); await p.click('#haggle-counter'); out.push(['還價成功', await st(p)]); await p.close();
  // 還價失敗（亂數 0.99）
  p = await fresh(0.99, seedHaggle); await p.click('#haggle-counter'); out.push(['還價失敗', await st(p)]); await p.close();
  // 拒絕
  p = await fresh(0.5, seedHaggle); await p.click('#haggle-refuse'); out.push(['拒絕', await st(p)]); await p.close();
  // 向社群賣家出價：成功與失敗
  for (const [rand, name] of [[0.01, '出價成功'], [0.99, '出價失敗']]) {
    p = await fresh(rand, () => ({ stats: { sold: 0 }, social: { left: 5, seq: 1, offers: [{ oid: 1, item: { name: '白 T 恤', type: '上衣', tags: ['極簡'], condition: '良好', base: 120, cost: 0, color: '#f4f1ea', kept: false }, ask: 100, who: '@pocket_pie', color: '#8a5838', mins: 3, text: '換季出清。', likes: 3, cm: 1 }] } }));
    await p.click('[data-nav="social"]'); await p.click('#close-hint').catch(() => {});
    await p.screenshot({ path: path.join(SP, 'bargain_post.png') });
    await p.click('[data-haggle]'); await p.screenshot({ path: path.join(SP, 'bargain.png') });
    await p.click('#bargain-go'); out.push([name, await p.evaluate(() => { const s = window.__game.state; return { money: s.money, wardrobe: s.wardrobe.length, offers: s.social.offers.length, bargained: s.stats.bargained || 0 }; })]); await p.close();
  }
  out.forEach((o) => console.log(o[0], JSON.stringify(o[1]))); console.log('errors', errs); await b.close();
})();
