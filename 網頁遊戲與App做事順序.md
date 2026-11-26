# 網頁遊戲與 App 做事順序

最後更新：2026-11-26。適用：單頁 HTML 網頁遊戲、可安裝到手機主畫面的網頁 App（PWA）。
規則與總表相同：標「扣點」的步驟先報價再問；內容與設計類先給編號選項；工程類直接做。

## 共同起手式

1. 開專案資料夾，在 Claude Code 打開。
2. `/init` 建立 CLAUDE.md。
3. 「先列出這次的範圍、順序和完成條件」。
4. 做完一段就說「commit」。
5. 對話太長 `/compact`，換任務 `/clear`，改壞了 `/rewind`。

## 先選做法

| 想做的 | 做法 |
|---|---|
| 回合制、卡牌、模擬經營類小遊戲 | 單一 `index.html` 加原生 JavaScript，不用框架 |
| 大量動畫或即時操作 | Canvas 2D |
| 手機加到主畫面、離線可玩 | PWA：manifest 加 service worker（第五節） |
| 上架 App Store 或 Google Play | 需要你的電腦（Xcode、Android Studio），目前沒有對應 skill；先用 PWA 驗證玩法 |

## 一、企劃

| 步驟 | 指令或說法 | 完成條件 |
|---|---|---|
| 1 規則 | 「寫遊戲規則、關卡和數值平衡表」 | 有 `平衡表.md` |
| 2 試玩規劃（選做） | `/design:user-research` 規劃真人試玩的題目 | 有訪談題目 |

## 二、原型

| 步驟 | 指令或說法 | 完成條件 |
|---|---|---|
| 3 原型 | 「先做一個能玩的單頁 HTML 原型，放在 `game/index.html`」 | 從頭玩到結束不當機 |
| 4 自我檢查 | 「寫一個自我檢查，並接上 GitHub Actions，每次推送自動跑」 | 推送後檢查通過 |
| 5 開起來看 | `/run` | 畫面正常、主控台無錯誤 |

第 4 步可直接沿用股海翻身的範本：`.github/workflows/selfcheck.yml` 與 `stock/tests/run-selfcheck.js`（檢查通過才發布到 GitHub Pages）。

## 三、試玩與除錯

| 步驟 | 指令或說法 | 完成條件 |
|---|---|---|
| 6 機器人試玩 | 「用 Playwright 以新手角度玩一輪，記下卡住的地方」 | 有 `新手反饋.md` |
| 7 抓隱藏錯誤 | `/click-path-audit` | 每個按鈕的最終狀態正確 |
| 8 整理真人反饋（選做） | `/design:research-synthesis` | 有優先順序清單 |
| 9 調數值 | 「照反饋調數值，再玩一輪比較」 | 前後差異寫進平衡表 |

## 四、介面與文字

| 步驟 | 指令或說法 | 完成條件 |
|---|---|---|
| 10 介面 | 新做：`/hallmark 做遊戲主畫面`；改舊：`/hallmark redesign 路徑` | 你同意設計方向 |
| 11 遊戲內文字 | 劇情、說明：`/zh-formal-copy`；按鈕、錯誤訊息、空狀態：`/design:ux-copy` | 文字不像 AI 寫的 |
| 12 體驗評論 | `/design:design-critique` | 問題清單已處理 |
| 13 無障礙 | `/design:accessibility-review` | 對比、觸控尺寸、鍵盤操作合格 |
| 14 圖表（有走勢圖、排行榜時） | `/dataviz` | 淺色、深色模式都看得清楚 |

自動化無障礙掃描可用 `/axe-accessibility:mcp-audit`，但需先跑 `/axe-accessibility:mcp-setup` 完成設定；本次檢查時該外掛連線失敗，暫以第 13 步代替。

## 五、App 化（選做）

| 步驟 | 指令或說法 | 完成條件 |
|---|---|---|
| 15 可安裝 | 「加上 manifest 和 service worker，讓手機能加到主畫面並離線開啟」 | 斷網仍能開 |
| 16 圖示 | 「用程式畫 App 圖示，512×512 與 192×192」 | 主畫面圖示清楚 |
| 17 手機測試 | 「用 iPhone 和 Android 尺寸測試觸控、直橫式和瀏海安全區」 | 按鈕不被遮住 |
| 18 多頁一致（頁面多時） | `/design:design-system` | 按鈕、顏色、字級統一 |

## 六、驗收與發布

| 步驟 | 指令或說法 | 完成條件 |
|---|---|---|
| 19 截圖 | `/browser-qa`（完整檢查說「完整 QA」） | 手機、電腦版截圖給你看過 |
| 20 程式檢查 | `/code-review`，再 `/security-review` | 無未處理的問題 |
| 21 精簡（選做） | `/simplify` | 重複程式已整理 |
| 22 發布 | 「commit 並推送」 | 自我檢查通過、線上版更新 |

## 七、宣傳

照總表第五節。補充：

- 語氣檔：`brand-voice`（股海翻身專案內建），拿以前的貼文建立語氣設定，之後沿用。
- 遊玩錄影：`/ui-demo`。
- 宣傳影片：照總表第一節，優先 `/remotion-video-creation`。
- 發文由你自己發，Claude 不代發。

## Skill 與外掛分工

| 狀況 | 用這個 | 不用 |
|---|---|---|
| 網站、介面設計 | `/hallmark` | `unslop`（功能重疊） |
| 中文文案 | `/zh-formal-copy` | `humanizer`、`anti-ai-writing`（以英文為主） |
| 宣傳圖片 | 程式繪製或 Canva | `/higgsfield-generate`、Runway（扣點，先報價） |
| 設計稿交接給工程 | `/design:design-handoff` | — |

Figma、Notion、Linear、Slack 等 design 外掛連接器需要先在 claude.ai 的連接器設定授權，本流程不依賴它們。
