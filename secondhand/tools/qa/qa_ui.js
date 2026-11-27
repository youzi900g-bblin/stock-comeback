// 創角畫面檢查：手機（375）與桌機（1440）各走一遍所有分頁，檢查橫向溢出、觸控目標小於 44px、主控台錯誤、隨機按鈕、舊存檔。
// 用法：SP=截圖資料夾 node tools/qa/qa_ui.js
const { chromium } = require('playwright'); const path = require('path'); const SP = process.env.SP || '.';
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, h, n] of [[375, 667, 'm'], [1440, 900, 'd']]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto('file://' + path.resolve(__dirname, '../../index.html')); await p.evaluate(() => localStorage.clear()); await p.reload();
    await p.fill('#nm', '小雨');
    for (const tab of ['face', 'hair', 'outfit', 'acc']) { await p.click(`[data-ctab="${tab}"]`); await p.screenshot({ path: path.join(SP, `ui_${n}_${tab}.png`) }); }
    const over = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const small = await p.evaluate(() => [...document.querySelectorAll('.opt,.btn')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.width < 44 || r.height < 44); }).length);
    console.log(n, 'overflow', over, 'small', small);
    for (let i = 0; i < 10; i++) await p.click('#rnd-look');
    await p.click('#rnd-name'); await p.click('#start');
    await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('overstuffed-save-v1')); s.player = { name: '舊', hair: 'long', skin: 's2' }; localStorage.setItem('overstuffed-save-v1', JSON.stringify(s)); });
    await p.reload(); console.log(n, 'old save sprite', await p.evaluate(() => !!document.querySelector('.me svg rect')));
  }
  console.log('errors', errs); await b.close();
})();
