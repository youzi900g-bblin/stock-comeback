// 教學與新手任務檢查：教學走到「穿上」就結束；之後四個任務（上架、下一天、買貨、修補）依序完成。
// 用法：SP=截圖資料夾 node tools/qa/qa_repair.js
const { chromium } = require('playwright'); const path = require('path'); const SP = process.env.SP || '.';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file://' + path.resolve(__dirname, '../../index.html')); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.fill('#nm', '小雨'); await p.click('#start');
  const clearHaggle = async () => { while (await p.locator('#haggle-refuse').count() || await p.locator('.npcmsg').count()) { if (await p.locator('.npcmsg').count()) await p.click('#lin-close'); else { await p.click('#haggle-refuse'); await p.click('#haggle-ok'); } } };   // 也處理新手任務的 NPC 私訊
  const st = () => p.evaluate(() => { const s = window.__game.state; return { t: s.tutorial, quest: s.quest, money: s.money, day: s.day, stock: s.wardrobe.map((i) => [i.name, i.condition, !!i.fixing]) }; });
  // 教學
  await p.click('[data-nav="wardrobe"]'); await p.click('.piece.tutfirst'); await p.click('[data-sell]');
  await p.click('#spot-next'); await p.click('[data-pct="10"]'); await p.click('#confirm-price');
  await p.click('.piece.tutfirst'); await p.click('[data-keepit]');
  await p.click('[data-wseg="closet"]'); await p.click('[data-wear]:not([aria-pressed="true"])');
  await p.click('#reward-claim');
  console.log('教學結束', JSON.stringify(await st()));
  await p.screenshot({ path: path.join(SP, 'tut_end.png') });
  await p.click('#close-hint'); await p.click('[data-nav="home"]');
  await p.screenshot({ path: path.join(SP, 'quest_home.png') });
  // 任務 1：把待售全部上架（直接用程式清空，避免重複點擊）
  await p.evaluate(() => { const s = window.__game.state; s.listings.push(...s.wardrobe.map((item) => ({ item, price: 10, listedDay: s.day }))); s.wardrobe = []; });
  await p.click('[data-nav="social"]'); await p.click('#close-hint'); await p.click('[data-nav="home"]');
  console.log('任務 1 後', JSON.stringify(await st()));
  // 任務 2：下一天
  await p.click('#quest-go'); await p.click('#nextday'); await p.click('#close-summary'); await clearHaggle();
  console.log('任務 2 後', JSON.stringify(await st()));
  // 任務：包貨出貨（沒成交就補一筆，免得隨機結果讓檢查卡住）
  if (!(await p.locator('#pack-open').count())) { await p.evaluate(() => { const s = window.__game.state; s.shipping = [{ item: { name: '測試衣', type: '上衣', tags: [], condition: '良好', base: 50, cost: 0, color: '#fff', id: 999 }, price: 20 }]; }); await p.click('[data-nav="wardrobe"]'); await p.click('[data-nav="home"]'); }
  await clearHaggle(); await p.screenshot({ path: path.join(SP, 'quest_ship_home.png') });
  await p.click('#pack-open'); await p.screenshot({ path: path.join(SP, 'quest_pack.png') });
  const m0 = (await st()).money; await p.click('[data-pack]');
  console.log('出貨後', JSON.stringify(await st()), '收款前', m0);
  while (await p.locator('[data-pack]').count()) await p.click('[data-pack]');
  await p.click('#pack-close'); await clearHaggle();
  // 任務 3：買貨（保證第一則是有瑕疵、買得起）
  await p.evaluate(() => { window.__game.state.money = 300; }); await clearHaggle();
  await p.click('[data-nav="social"]'); await p.click('#refresh');
  await p.screenshot({ path: path.join(SP, 'quest_social.png') });
  await p.click('[data-buy]:not([disabled])');
  console.log('任務 3 後', JSON.stringify(await st()));
  // 任務 4：修補
  await clearHaggle(); await p.click('[data-nav="wardrobe"]'); await p.click('[data-wseg="stock"]'); await p.click('.piece.flawed'); await p.screenshot({ path: path.join(SP, 'quest_fix.png') });
  await p.click('[data-fix]');
  console.log('任務 4 後', JSON.stringify(await st()));
  await p.click('[data-nav="home"]'); await p.click('#nextday'); await p.click('#close-summary'); await clearHaggle();
  console.log('隔天', JSON.stringify(await st()));
  console.log('errors', errs); await b.close();
})();
