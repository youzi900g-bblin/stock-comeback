// 整理修補檢查：從「刷新看看」教學步驟開始，走完買瑕疵貨 → 修補 → 隔天完成。
// 用法：SP=截圖資料夾 node tools/qa/qa_repair.js
const { chromium } = require('playwright'); const path = require('path'); const SP = process.env.SP || '.';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file://' + path.resolve(__dirname, '../../index.html')); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.fill('#nm', '小雨'); await p.click('#start');
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('overstuffed-save-v1')); s.tutorial = 'social'; s.money = 300; s.wardrobe = s.wardrobe.slice(0, 1); localStorage.setItem('overstuffed-save-v1', JSON.stringify(s)); });
  await p.reload();
  await p.click('[data-nav="social"]'); await p.click('#refresh');
  await p.click('.spot-cap #spot-next');                       // 第 13 步：我知道了
  await p.click('[data-buy]:not([disabled])');                  // 第 14 步：買下
  const st = () => p.evaluate(() => { const s = window.__game.state; return { t: s.tutorial, money: s.money, items: s.wardrobe.map((i) => [i.name, i.condition, !!i.fixing]) }; });
  console.log('after buy', JSON.stringify(await st()));
  await p.click('[data-nav="wardrobe"]');
  await p.click('.piece.tutfirst, .piece[data-item]:has(.chip.flaw)');
  await p.screenshot({ path: path.join(SP, 'fix_item.png') });
  await p.click('[data-fix]');
  console.log('after fix', JSON.stringify(await st()));
  await p.click('#close-hint');
  await p.click('[data-nav="home"]'); await p.click('#nextday');
  await p.screenshot({ path: path.join(SP, 'fix_summary.png') });
  console.log('after day', JSON.stringify(await st()));
  console.log('errors', errs); await b.close();
})();
