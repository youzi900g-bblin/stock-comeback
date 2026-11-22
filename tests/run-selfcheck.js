/* 用無頭瀏覽器開啟遊戲並執行 game-selfcheck.js；失敗時結束碼為 1。 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ORIGIN = 'http://game.test';
const root = path.join(__dirname, '..', 'game');

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    // 直接由本機檔案回應，外部資源（Google 字型）一律擋掉，結果才不受網路影響
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== ORIGIN) return route.abort();
      const file = path.join(root, decodeURIComponent(url.pathname));
      const found = file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile();
      return found ? route.fulfill({ path: file }) : route.fulfill({ status: 404 });
    });
    await page.goto(ORIGIN + '/index.html');
    const src = fs.readFileSync(path.join(__dirname, 'game-selfcheck.js'), 'utf8');
    const result = await page.evaluate(code => (0, eval)(code), src);
    if (errors.length) throw new Error('頁面發生錯誤：' + errors.join('；'));
    console.log(result);
  } finally {
    await browser.close();
  }
})().catch(e => {
  console.error(e.message);
  process.exitCode = 1;
});
