// 網頁端比對：把期望 JSON 裡每組造型丟給 window.__game.sprite()，把 SVG 的格子還原成 27×53，與引擎整張重畫逐格比對。
// 用法：node tools/qa/qa_sprite.js 期望.json（需要 playwright；輸出 {"bad":0} 才算通過）
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const exp = JSON.parse(fs.readFileSync(process.argv[2]));
  const b = await chromium.launch(); const pg = await b.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(String(e))); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.goto('file://' + path.resolve(__dirname, '../../index.html')); await pg.evaluate(() => localStorage.clear()); await pg.reload();
  const res = await pg.evaluate((exp) => {
    let bad = 0; const first = [];
    for (const e of exp) {
      const d = document.createElement('div'); d.innerHTML = window.__game.sprite(e.look);
      const g = Array.from({ length: 53 }, () => Array(27).fill(''));
      d.querySelectorAll('rect').forEach((r) => { const x = +r.getAttribute('x'), y = +r.getAttribute('y'), w = +r.getAttribute('width'), f = r.getAttribute('fill').slice(1, 7); for (let i = 0; i < w; i++) g[y][x + i] = f; });
      if (JSON.stringify(g) !== JSON.stringify(e.grid)) { bad++; if (first.length < 2) first.push(e.look); }
    }
    return { bad, first };
  }, exp);
  console.log(JSON.stringify(res), errs); await b.close();
})();
