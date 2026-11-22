/* 《股海翻身》自我檢查：在遊戲頁面用「間接 eval」執行（才讀得到頁面的 S、ST 等全域變數）。
   例：(0,eval)(await (await fetch('/game-selfcheck.js')).text())
   會暫時開一局測試用遊戲，結束後還原 localStorage；任一項失敗就丟出錯誤。 */
(() => {
  const ok = (cond, msg) => { if (!cond) throw new Error('自我檢查失敗：' + msg); };
  const saved = Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]));
  const metaBefore = JSON.stringify(META);
  const closeModal = () => { $('modal').classList.remove('on'); S.modal = false; S.lesson = null; };
  const bar = (st, o, h, l) => { st.hist[st.hist.length - 1] = { o, h, l, c: o }; st.price = o; st.prev = o; st.limit = null; };
  const reset = () => { S.cash = 1e7; S.debt = 1e6; S.shark = 0; S.repaid = 0; S.hold = {}; S.short = {}; S.orders = []; S.lesson = null; };
  const order = (id, t, p, q) => {
    S.sel = id; S.otype = t; $('o-price').value = p; $('o-qty').value = q;
    const n = S.orders.length; addOrder(); return S.orders.length > n;
  };

  try {
    CH = { ...avChar(), n: '自我檢查' };
    startGame(true);

    // 第 1 項：賣光後舊停損停利不能動到新持股，限價買單要保留
    const A = stock('TSMC');
    reset(); bar(A, 100, 100, 100);
    buyQty('TSMC', 100);
    S.orders = [{ id: 'TSMC', t: 'sl', p: 90, q: 0 }, { id: 'TSMC', t: 'tp', p: 110, q: 0 }, { id: 'TSMC', t: 'buy', p: 80, q: 5 }];
    sell('TSMC', 1, true);
    ok(S.orders.length === 1 && S.orders[0].t === 'buy', '賣光後應只留下買單');

    reset(); bar(A, 100, 120, 80);
    buyQty('TSMC', 100);
    S.orders = [{ id: 'TSMC', t: 'tp', p: 110, q: 0 }, { id: 'TSMC', t: 'buy', p: 90, q: 10 }, { id: 'TSMC', t: 'sl', p: 85, q: 0 }];
    runOrders();
    ok(S.hold.TSMC && S.hold.TSMC.qty === 10, '同日賣光再買進後，舊停損不可賣掉新持股');
    ok(S.orders.length === 0, '同日成交後不應留下舊單');

    reset(); bar(A, 100, 120, 80);
    buyQty('TSMC', 100);
    S.orders = [{ id: 'TSMC', t: 'sl', p: 70, q: 0 }, { id: 'TSMC', t: 'tp', p: 110, q: 0 }, { id: 'TSMC', t: 'buy', p: 90, q: 10 }];
    runOrders();
    ok(S.hold.TSMC && S.hold.TSMC.qty === 10 && S.orders.length === 0, '未觸發的舊停損不可留到新持股上');

    // 第 3 項：催收走 repay，不多扣、repaid 不為負，還清觸發擺脫流程
    const collect = () => CHOICES.find(c => c.w === 2 && /先還 3 萬/.test(String(c.f))).f().opts[0].fn();
    reset(); S.shark = 20000; S.cash = 100000; S.sharkFree = 0;
    collect(); closeModal();
    ok(S.shark === 0 && S.cash === 80000 && S.repaid === 20000, '催收不可多扣');
    ok(S.sharkFree === S.day && S.day >= 0 && META.ach.shark, '還清應觸發擺脫地下錢莊');

    reset(); S.shark = 100000; S.cash = 100000;
    collect(); closeModal();
    ok(S.shark === 70000 && S.cash === 70000 && S.repaid === 30000, '催收應還 3 萬');

    reset(); S.shark = 100000; S.cash = -5000;
    collect(); closeModal();
    ok(S.repaid === 0 && S.cash === -5000 && S.shark === 100000, '負現金時 repaid 不可變負');

    // 第 4 項：跌停時百分比與手動股數都不能放空
    reset(); bar(A, 100, 100, 100); A.limit = 'down';
    ok(openShort('TSMC', 100000) === false, '跌停時百分比放空應被拒絕');
    ok(shortQty('TSMC', 10) === false && !S.short.TSMC, '跌停時手動股數放空應被拒絕');
    A.limit = null;
    ok(shortQty('TSMC', 10) === true && S.short.TSMC.qty === 10, '未跌停時應可放空');

    // 第 6 項：自動單數量驗證
    reset(); bar(A, 100, 100, 100);
    for (const q of ['0', '-1', '1.5']) ok(!order('TSMC', 'buy', 90, q), `股票數量 ${q} 應被拒絕`);
    ok(order('TSMC', 'buy', 90, '3'), '正整數應可掛單');
    buyQty('TSMC', 10);
    for (const q of ['0', '-1', '1.5']) ok(!order('TSMC', 'sl', 90, q), `停損數量 ${q} 應被拒絕`);
    ok(order('TSMC', 'sl', 90, '') && S.orders[S.orders.length - 1].q === 0, '停損空白數量應代表全部');
    ok(order('TSMC', 'tp', 110, '') && S.orders[S.orders.length - 1].q === 0, '停利空白數量應代表全部');

    const C = stock('BTC'); bar(C, 100, 100, 100);
    ok(!order('BTC', 'buy', 90, '0.0000001'), '加密幣低於最小單位應被拒絕');
    ok(order('BTC', 'buy', 90, '0.000001'), '加密幣最小單位應可掛單');

    return '自我檢查全部通過（第 1、3、4、6 項）';
  } finally {
    S = null;
    META = JSON.parse(metaBefore);
    localStorage.clear();
    Object.entries(saved).forEach(([k, v]) => localStorage.setItem(k, v));
    $('modal').classList.remove('on');
    $('o-price').value = ''; $('o-qty').value = '';
    refreshTitle(); go('title');
  }
})();
