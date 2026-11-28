"""玩家角色：用與 NPC 相同的引擎（engine.py）產生。

規則出處：docs/系統設計.md「八-1、角色美術規格」、docs/美術製作指南.md。
輸出（art/player/）：
  face.js    各選項的圖層（格子與色名）、色票、五官／頭飾／眼鏡的格子，網頁用 SVG 依序疊出角色
id 要與 config.js 的 HAIR_STYLES / SKIN_TONES / TOPS / BOTTOMS / EYES / MOUTHS 一致。
體型固定為中等（不開放玩家改，避免衣服要跟著改版）。

【佔位】髮色、衣服配色、五官樣式都是暫定值，尚未決定。
"""
import json, os
from engine import H, CX, dk, diag, build, face_cells, face_colors, render_rgba

# 與 config.js 的 SKIN_TONES 同色（網頁的膚色選鈕用 config.js；改色要兩邊一起改）
SKIN_TONES = {'s1': '#f1cfb4', 's2': '#e3b38e', 's3': '#c68b62', 's4': '#8a5838', 's5': '#5f3b25'}
# hs 是 engine.py 的髮型名稱（id 與 config.js 的 HAIR_STYLES 一致）
HAIR = {'bob': 'bob', 'long': 'long', 'buns': 'puffs', 'short': 'short', 'twin': 'twin',
        'hpony': 'hpony', 'lpony': 'lpony', 'braids': 'braids', 'wavy': 'long', 'buzz': 'buzz'}
# 髮色與頭飾色（id 與 config.js 的 HAIR_COLORS / HEADWEAR_COLORS 一致）【佔位色】
# 每款髮型各自的劉海（樣式見 engine.fringe_new）
FRINGE = {'bob': 'part', 'long': 'airy', 'short': 'sweep', 'buns': 'mshape', 'twin': 'jag', 'hpony': 'sweepR',
          'lpony': 'sidepart', 'braids': 'curtain', 'wavy': 'sidepart', 'buzz': 'buzzline'}
HAIR_COLORS = {'black': '#2a2230', 'darkbrown': '#3a2418', 'brown': '#6a4a32', 'chestnut': '#8c3c2c',
               'blonde': '#d8b058', 'ginger': '#d06a28', 'pink': '#e878a8', 'violet': '#5a5ab8'}
HW_COLORS = {'red': '#d83a3a', 'white': '#f4f1ea', 'black': '#2a2430', 'blue': '#3a5a8a', 'pink': '#f080b0', 'yellow': '#f8d838'}
EYES = ('closed', 'normal', 'big')
MOUTHS = ('small', 'mid', 'wide')

def _w(sk):
    """膚色的淺深權重：0＝深膚色，1＝淺膚色（與 engine 雀斑的算法相同）。"""
    lum = 0.3*sk[0] + 0.59*sk[1] + 0.11*sk[2]
    return max(0.0, min(1.0, (lum - 110) / (190 - 110)))

def _mul(sk, r):
    return tuple(max(0, min(255, int(sk[i]*r[i]))) for i in range(3))

def _lerp(a, b, w):
    return tuple(a[i]*(1-w) + b[i]*w for i in range(3))

def skin_colors(sk):
    """由膚色換算陰影、嘴唇、腮紅。
    深色端取系統設計的標準膚色比例（#8a5838 → 陰影 #6c4028、嘴唇 #74383a、腮紅 #a84c44），
    淺色端取既有 NPC（艾蓮娜）的比例，中間線性過渡。"""
    w = _w(sk)
    shade = _mul(sk, _lerp((108/138, 64/88, 40/56), (224/246, 170/216, 152/200), w))
    lip = _mul(sk, _lerp((116/138, 56/88, 58/56), (192/246, 96/216, 108/200), w))
    blush = _mul(sk, _lerp((168/138, 76/88, 68/56), (236/246, 144/216, 144/200), w))
    return shade, lip, blush

def hi_of(c): return tuple(min(255, int(v*1.28)+8) for v in c)
def lo_of(c): return tuple(int(v*0.72) for v in c)
def tone(hexc):
    b = H(hexc); return dict(base=b, hi=hi_of(b), lo=lo_of(b))

def _stripe(t):
    return lambda x, y: t['hi'] if y % 4 < 2 else t['base']

# ---- 衣服細節規則：褶只用陰影／亮色，不描邊；領口、袖口、下擺下方各加一排陰影；褶要少而明確 ----
def _torso_fill(t, y0=19):
    """身體的明暗用 45 度斜線切：右上亮、左下暗，線條每格錯一格，沒有不規則的階梯。"""
    return lambda x, y: t['hi'] if (x-CX)-(y-y0) >= 2 else (t['lo'] if (y-y0)-(x-CX+4) >= 6 else t['base'])

def _sleeve_fill(t):
    """袖子改成兩色直條（外側一欄暗、其餘底色），避免斜切陰影在 3 格寬的袖子上變成棋盤格。"""
    def f(x, y):
        xc = CX - (5 + int((y-20)*0.2)) if x < CX else CX + (5 + int((y-20)*0.2))
        return t['lo'] if abs(x - xc) == 1 and ((x < CX and x < xc) or (x > CX and x > xc)) else t['base']
    return f

def _top_detail(t, hem, extra=None, folds=True):
    def f(cv, tw, h):
        for x in range(CX-2, CX+3): cv.px(x, 20, t['lo'])
        for x in range(CX-tw, CX+tw+1): cv.px(x, h, t['lo'])              # 下擺陰影
        if extra: extra(cv, t)
    return f

def _hoodie_extra(cv, t):
    for x in range(CX-3, CX+4): cv.px(x, 26, t['lo'])                      # 口袋上緣
    for y in (27, 28, 29): cv.px(CX-3, y, t['lo']); cv.px(CX+3, y, t['lo'])
    for y in (21, 22): cv.px(CX-1, y, t['hi']); cv.px(CX+1, y, t['hi'])  # 抽繩

def _tank(skin, shade):
    """白色吊嘎（背心）：細肩帶、方領帶圓角，無袖。回傳 _top 同樣格式的設定。"""
    t = tone('#f4f1ea'); hem = 30
    S = lambda y, *segs: {(x, y) for a, b in segs for x in range(a, b + 1)}
    mask = set()
    for y in range(19, 22): mask |= S(y, (CX-4, CX-3), (CX+3, CX+4))                         # 肩帶貼著衣身外緣，領口兩側垂直
    mask |= S(22, (CX-4, CX-2), (CX+2, CX+4))                                                # 領口底部兩角收一格（圓角）
    for y in range(23, hem + 1): mask |= S(y, (CX-4, CX+4))
    opening = {**{y: (CX-2, CX+2) for y in range(19, 22)}, 22: (CX-1, CX+1)}                # 領口：方形，底部兩角圓
    pre = [(x, y, skin) for y, (a, b) in opening.items() for x in range(a, b + 1)]          # 領口內的皮膚（先畫，衣身的灰色邊線蓋在上面）
    nk = [(x, 19, skin) for x in range(CX-1, CX+2)]                                          # 脖子底部那一列邊線：領口內不要線，改成皮膚
    def det(cv, tw, h):
        for x in range(CX-4, CX+5): cv.px(x, h, t['lo'])              # 下擺陰影
    return dict(top=dict(fill=_torso_fill(t), **t), sleeve=None, torso_hem=hem, detail=det, torso_mask=mask, pre_torso=pre, post_neck=nk)

def _top(tid, skin=None, shade=None):
    if tid == 'tank': return _tank(skin, shade)
    if tid == 'white':  t = tone('#f4f1ea'); return dict(top=dict(fill=_torso_fill(t), **t), sleeve=dict(long=False, fill=_sleeve_fill(t), cuff=t['lo'], cuff_outline=False, **t), torso_hem=30, detail=_top_detail(t, 30))
    if tid == 'black':  t = tone('#2b2b30'); return dict(top=dict(fill=_torso_fill(t), **t), sleeve=dict(long=False, fill=_sleeve_fill(t), cuff=t['lo'], cuff_outline=False, **t), torso_hem=30, detail=_top_detail(t, 30))
    if tid == 'stripe':
        t = tone('#9db7d6'); f = _stripe(dict(base=t['base'], hi=H('#f4f1ea')))
        return dict(top=dict(fill=f, **t), sleeve=dict(long=False, fill=_sleeve_fill(t), cuff=t['lo'], cuff_outline=False, **t), torso_hem=30, detail=_top_detail(t, 30, folds=False))
    if tid == 'hoodie':
        t = tone('#e3b93c'); return dict(top=dict(fill=_torso_fill(t), **t), sleeve=dict(long=True, fill=_sleeve_fill(t), cuff=t['lo'], cuff_outline=False, **t), torso_hem=31, hood=t['base'], detail=_top_detail(t, 31, _hoodie_extra))
    raise KeyError(tid)

def _bottom(bid, skin=None, cover=False):
    if bid in ('jeans', 'flare', 'ripped', 'track'):
        t = tone({'track': '#4d4f58'}.get(bid, '#5f7fa8'))
        def det(cv):
            for (a, b_) in ((CX-5, CX-2), (CX+2, CX+5)):
                for x in range(a, b_+1): cv.px(x, 47, t['lo'])                      # 褲口陰影
            if bid == 'track':
                for y in range(32, 47): cv.px(CX-5, y, H('#9a9ca8')); cv.px(CX+5, y, H('#9a9ca8'))   # 側邊條紋
            if bid == 'ripped':   # 左膝一個破洞：露出皮膚，下緣兩格線頭
                for x in (CX-4, CX-3):
                    for y in (38, 39): cv.px(x, y, skin)
                cv.px(CX-4, 40, H('#f4f1ea')); cv.px(CX-3, 40, t['hi'])
        return dict(type='pants', detail=det, legfill=diag(t['base'], t['hi'], t['lo'], 30, 0.5), flare=(bid == 'flare'), cover=((49 if bid == 'flare' else 48) if cover else 0), **t)
    if bid == 'shorts':   # 牛仔短褲：褲口在大腿中段，露出小腿；腿寬與裙子相同，所以襪子與短靴看得到
        t = tone('#6c8bb3')
        def det(cv):
            for x in list(range(CX-5, CX-1)) + list(range(CX+2, CX+6)): cv.px(x, 38, t['lo'])   # 褲口陰影
        return dict(type='skirt', shorts=True, base=t['base'], fill=diag(t['base'], t['hi'], t['lo'], 30, 0.4), skirt_end=38, flare=0, legL=3, skin_y0=39, detail=det)
    if bid == 'brief':   # 黑色內褲：比牛仔短褲更短，露出大腿
        t = tone('#2b2b30')
        def det(cv):
            for x in list(range(CX-5, CX-1)) + list(range(CX+2, CX+6)): cv.px(x, 35, t['lo'])   # 褲口陰影
            for x in range(CX-4, CX+5): cv.px(x, 30, t['hi'])                                  # 腰帶亮邊
        return dict(type='skirt', shorts=True, base=t['base'], fill=lambda x, y: t['hi'] if (x - CX) >= 2 else t['base'], skirt_end=35, flare=0, legL=3, skin_y0=36, detail=det)
    if bid == 'pleat':
        t = tone('#d98aa6')
        return dict(type='skirt', base=t['base'], fill=lambda x, y: t['lo'] if (x-CX) % 3 == 0 else (t['hi'] if y < 32 else t['base']),
                    skirt_end=37, flare=2, legL=3, skin_y0=36,
                    detail=lambda cv: [cv.px(x, 37, t['lo']) for x in range(CX-6, CX+7)])   # 下擺陰影
    raise KeyError(bid)

HEADWEAR = ('beret', 'bow', 'cap', 'star')
SHOES = ('canvas', 'sneaker', 'boot', 'sandal')
SOCKS = ('short', 'long', 'stripe')
JACKETS = {'cardigan': '#c9a98a', 'denim': '#6c8bb3', 'sport': '#4d4f58'}   # 配色取自基本款樣板【佔位】
BAGS = ('cross', 'tote', 'pack')
BTYPE = {'brief': 'skirt', 'jeans': 'pants', 'flare': 'pants', 'ripped': 'pants', 'track': 'pants', 'shorts': 'skirt', 'pleat': 'skirt'}   # 鞋子的位置依下身是褲子或裙子而不同
IRIS = {'brown': '#3a2a28', 'blue': '#4a6aa8', 'green': '#4a8a5a', 'violet': '#7a5a9a'}  # 眼珠色【佔位色】
TOPS = ('white', 'black', 'stripe', 'hoodie')
BOTTOMS = ('jeans', 'flare', 'ripped', 'shorts', 'track', 'pleat')

def player(hair_id, skin_id, top='white', bottom='jeans', eyes='normal', mouth='mid', freckles=False, features=True, hw=None, iris='brown', hair_color='darkbrown', hw_color='red',
           shoes='canvas', shoe_color='white', socks=None, sock_color='white', jacket=None, bag=None, bag_color='blue',
           earring=False, necklace=False, bracelet=False):
    sk = H(SKIN_TONES[skin_id]); hs = HAIR[hair_id]; hair = H(HAIR_COLORS[hair_color])
    shade, lip, blush = skin_colors(sk)
    P = dict(body='medium', skin=sk, skin_s=shade, blush=blush, lip=lip,
        hair=hair, hair_hi=hi_of(hair), hs=hs, hp=None,
        bottom=_bottom(bottom, sk, cover=(BTYPE[bottom] == 'pants' and (bottom == 'flare' or shoes == 'boot'))), shoe=tone(HW_COLORS[shoe_color])['base'], shoe_hi=tone(HW_COLORS[shoe_color])['lo'], shoe_style=shoes, torso_len=0,
        iris=H(IRIS[iris]), eyes=eyes, mouth=mouth, freckles='auto' if freckles else None,
        nofeatures=not features, no_blush=bool(freckles), brow=dk(hair), wave=(hair_id == 'wavy'), fringe=FRINGE.get(hair_id))  # 有雀斑就不畫腮紅（美術規則）
    if hw: P['hw'] = dict(kind=hw, **tone(HW_COLORS[hw_color]))
    if socks: P['socks'] = dict(kind=socks, **tone(HW_COLORS[sock_color]))
    if jacket:
        jt = tone(JACKETS[jacket]); P['jacket'] = dict(kind=jacket, fill=_torso_fill(jt), sfill=_sleeve_fill(jt), **jt)
    if bag: P['bag'] = dict(kind=bag, **tone(HW_COLORS[bag_color]))
    P['jewel'] = dict(earring=earring, necklace=necklace, bracelet=bracelet)
    P.update(_top(top, sk, shade))
    return P

def _hex(c): return '#%02x%02x%02x' % tuple(int(v) for v in c)

def face_data():
    """五官格子（只含位置與色名）與每個髮型×膚色的顏色表。"""
    geo = {}
    for k, kw in (('eyes', EYES), ('mouth', MOUTHS)):
        for v in kw:
            # 只取該選項新增或不同的格子：眼睛只留 y<=11 且非腮紅，嘴只留 y==13
            pick = (lambda c: c[2] in ('brow', 'white', 'iris')) if k == 'eyes' else (lambda c: c[2] == 'lip')
            geo.setdefault(k, {})[v] = [list(c) for c in face_cells(player('bob', 's1', **{k: v})) if pick(c)]
    allc = face_cells(player('bob', 's1')) + face_cells(player('bob', 's1', freckles=True))
    geo['blush'] = [list(c) for c in allc if c[2] == 'blush']
    geo['nose'] = [list(c) for c in face_cells(player('bob', 's1')) if c[2] == 'nose']
    geo['freckles'] = [list(c) for c in allc if c[2] == 'freckle']
    geo['freckles_big'] = [list(c) for c in face_cells(player('bob', 's1', eyes='big', freckles=True)) if c[2] == 'freckle']
    colors = {}
    for h in HAIR_COLORS:
        for s_ in SKIN_TONES:
            P = player('bob', s_, freckles=True, hair_color=h)
            colors[f'{h}_{s_}'] = {k: _hex(v) for k, v in face_colors(P).items()}
    # 眼鏡：畫在五官之上。鏡框 1 格寬、左右對稱，圍住眼睛（x 為 CX±1..±5、y 8..12）；
    # 鏡片填半透明淺色並留 1 格反光，才不會在黑髮或深膚色上糊掉。圓框去掉四個角。
    def glasses(frame, lens, rnd, glint, opaque=False):
        out = []
        for sd in (-1, 1):
            for y in range(8, 13):
                for dx in range(1, 6):
                    edge = y in (8, 12) or dx in (1, 5)
                    if edge and rnd and y in (8, 12) and dx in (1, 5): continue
                    if edge: out.append([CX + sd*dx, y, frame])
                    else: out.append([CX + sd*dx, y, lens])
        # 反光不對稱：兩片鏡片的亮點都在右上，光源方向一致
        return out + [[CX, 9, frame], [CX+4, 9, glint], [CX-2, 9, glint]]
    geo['glasses'] = dict(
        round=glasses('#7a4a2a', '#d8ecf8a0', True, '#ffffffd0'),
        square=glasses('#5a5470', '#d8ecf8a0', False, '#ffffffd0'),
        rimless=glasses('#b8d4e8', '#d8ecf860', True, '#ffffffd0'),
        gold=glasses('#e0b040', '#f8f0d070', True, '#ffffffd0'),
        pink=glasses('#f080b0', '#f8d8ec80', True, '#ffffffd0'),
        sun=glasses('#6a6488', '#34304a', False, '#a8a8d0') +
            # 墨鏡反光：每片鏡片同方向（右上亮、左下暗）一道斜線加一個小亮點
            [c for dx in (0, -6) for c in ([CX+4+dx, 9, '#e4e4ff'], [CX+3+dx, 10, '#a8a8e0'], [CX+2+dx, 11, '#6a6aa0'], [CX+4+dx, 11, '#5a5a90'])])
    return dict(geo=geo, colors=colors, iris=IRIS)

# ---- 分層輸出 ----
# 每個選項輸出自己的圖層（格子加色名），顏色在網頁上才套入。圖層依 Z 由小到大疊，
# 順序與 engine.build 的繪製順序一致，所以疊出來的結果與整張重畫逐格相同（有比對測試）。
Z = {'hair_back': 10, 'legs': 20, 'pants': 20, 'socks': 21, 'shoes': 22, 'skirt': 23,
     'hood': 30, 'arms': 40, 'torso': 50, 'neck': 60, 'face': 70, 'hair_front': 80, 'headwear': 90, 'pants_over': 24,
     'bag_back': 15, 'jarms': 45, 'bracelet': 47, 'jacket': 55, 'bag_front': 57, 'necklace': 65, 'earring': 85}
# 可換色的色名 → 標記色（引擎跑一遍後，由標記色反查是哪個色名；邊線色由標記色推得）
MARK = {'skin': (251, 1, 3), 'skin_s': (251, 7, 9), 'hair': (3, 251, 1), 'hair_hi': (9, 251, 7),
        'hw': (250, 250, 3), 'hw_hi': (250, 250, 9), 'hw_lo': (250, 250, 15),
        'shoe': (250, 3, 250), 'shoe_lo': (250, 9, 250), 'sock': (3, 250, 250), 'sock_lo': (9, 250, 250),
        'bag': (250, 130, 3), 'bag_lo': (250, 130, 9), 'bag_hi': (250, 130, 15)}

def _dk(c, f=0.6): return (min(255, int(c[0]*f)+4), min(255, int(c[1]*f*0.95)), min(255, int(c[2]*f)+14))
def _warm(b): return (int(b[0]*.72), int(b[1]*.58), int(b[2]*.56))

def _spec_table():
    t = {}
    for role, m in MARK.items():
        t[m] = role; t[_dk(m)] = role + ':dk'; t[_warm(m)] = role + ':warm'
    assert len(t) == 3*len(MARK), '標記色的邊線色互相撞色'
    return t

def _marked(hair_id, top, bottom, hw=None, shoes='canvas', socks=None, jacket=None, bag=None, cover=False):
    P = player(hair_id, 's1', top, bottom, features=False, hw=hw, shoes=shoes, socks=socks, jacket=jacket, bag=bag,
               earring=True, necklace=True, bracelet=True)
    P.update(skin=MARK['skin'], skin_s=MARK['skin_s'], hair=MARK['hair'], hair_hi=MARK['hair_hi'],
             shoe=MARK['shoe'], shoe_hi=MARK['shoe_lo'])
    P['bottom'] = _bottom(bottom, MARK['skin'], cover)   # 破洞牛仔褲的破洞用膚色，要用色名標記
    if hw: P['hw'] = dict(kind=hw, base=MARK['hw'], hi=MARK['hw_hi'], lo=MARK['hw_lo'])
    if socks: P['socks'] = dict(kind=socks, base=MARK['sock'], lo=MARK['sock_lo'])
    if bag: P['bag'] = dict(kind=bag, base=MARK['bag'], hi=MARK['bag_hi'], lo=MARK['bag_lo'])
    return P

def _layers(P, names):
    """回傳指定圖層名的 [{z, cols, runs}]；runs 為 [x, y, 寬, 色索引]（同列同色合併）。"""
    _, log = build(P, want_log=True)
    table = _spec_table(); out = []
    for n in names:
        if n not in log: continue
        cols, runs, idx = [], [], {}
        cells = log[n]
        for y in range(53):
            x = 0
            while x < 27:
                c = cells.get((x, y))
                if c is None: x += 1; continue
                spec = table.get(tuple(c)) or _hex(c)
                x2 = x
                while x2+1 < 27 and cells.get((x2+1, y)) == c: x2 += 1
                if spec not in idx: idx[spec] = len(cols); cols.append(spec)
                runs.append([x, y, x2-x+1, idx[spec]]); x = x2+1
        out.append(dict(z=Z[n], cols=cols, runs=runs))
    return out

def layer_data():
    L = {'base': _layers(_marked('bob', 'white', 'jeans'), ('neck', 'face'))}
    for h in HAIR: L['hair:'+h] = _layers(_marked(h, 'white', 'jeans'), ('hair_back', 'hair_front'))
    for t in TOPS: L['top:'+t] = _layers(_marked('bob', t, 'jeans'), ('hood', 'arms', 'torso'))
    for b in BOTTOMS:
        L['bottom:'+b] = _layers(_marked('bob', 'white', b), ('legs', 'pants', 'skirt'))
        if BTYPE[b] == 'pants': L['bottom:'+b+':over'] = _layers(_marked('bob', 'white', b, cover=True), ('pants_over',))
    for st in SHOES:
        for bt, rep in (('pants', 'jeans'), ('skirt', 'pleat')): L[f'shoes:{st}:{bt}'] = _layers(_marked('bob', 'white', rep, shoes=st), ('shoes',))
    for k in SOCKS: L['socks:'+k] = _layers(_marked('bob', 'white', 'pleat', socks=k), ('socks',))
    for k in JACKETS: L['jacket:'+k] = _layers(_marked('bob', 'white', 'jeans', jacket=k), ('jarms', 'jacket'))
    for k in BAGS: L['bag:'+k] = _layers(_marked('bob', 'white', 'jeans', bag=k), ('bag_back', 'bag_front'))
    for k in ('earring', 'necklace', 'bracelet'): L['jewel:'+k] = _layers(_marked('bob', 'white', 'jeans'), (k,))
    for k in HEADWEAR: L['hw:'+k] = _layers(_marked('bob', 'white', 'jeans', hw=k), ('headwear',))
    pal = dict(skin={}, hair={}, hw={}, item={})
    for s_, hexc in SKIN_TONES.items():
        P = player('bob', s_); pal['skin'][s_] = dict(skin=_hex(P['skin']), skin_s=_hex(P['skin_s']))
    for h, hexc in HAIR_COLORS.items():
        c = H(hexc); pal['hair'][h] = dict(hair=_hex(c), hair_hi=_hex(hi_of(c)))
    for h, hexc in HW_COLORS.items():
        t = tone(hexc); pal['hw'][h] = dict(hw=_hex(t['base']), hw_hi=_hex(t['hi']), hw_lo=_hex(t['lo']))
        pal['item'][h] = dict(base=_hex(t['base']), hi=_hex(t['hi']), lo=_hex(t['lo']))
    return L, dict(pal, btype=BTYPE)

def build_all(out_dir):
    d = os.path.join(out_dir, 'player'); os.makedirs(d, exist_ok=True)
    for f in os.listdir(d): os.remove(os.path.join(d, f))
    data = face_data(); data['layers'], data['pal'] = layer_data()
    with open(os.path.join(d, 'face.js'), 'w') as f:
        f.write('window.PLAYER_FACE=' + json.dumps(data, separators=(',', ':')) + ';\n')
    return d
