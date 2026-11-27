"""玩家角色：用與 NPC 相同的引擎（engine.py）產生。

規則出處：docs/系統設計.md「八-1、角色美術規格」、docs/美術製作指南.md。
輸出（art/player/）：
  <髮型>_<膚色>_<上衣>_<下身>.png  身體底圖（27×53 格、1 格 1 像素、透明背景、不含五官；網頁以整數倍放大）
  face.js                          五官格子與各髮色膚色組合的顏色，網頁用 SVG 疊在底圖上
id 要與 config.js 的 HAIR_STYLES / SKIN_TONES / TOPS / BOTTOMS / EYES / MOUTHS 一致。
體型固定為中等（不開放玩家改，避免衣服要跟著改版）。

【佔位】髮色、衣服配色、五官樣式都是暫定值，尚未決定。
"""
import json, os
from engine import H, CX, build, face_cells, face_colors, render_rgba

# 與 config.js 的 SKIN_TONES 同色（網頁的膚色選鈕用 config.js；改色要兩邊一起改）
SKIN_TONES = {'s1': '#f1cfb4', 's2': '#e3b38e', 's3': '#c68b62', 's4': '#8a5838', 's5': '#5f3b25'}
# hs 是 engine.py 的髮型名稱；髮色為【佔位值】
HAIR = {'bob': ('bob', '#4a3426'), 'long': ('long', '#2a2230'), 'buns': ('puffs', '#2f2420'),
        'short': ('short', '#3a2c26'), 'twin': ('twin', '#5a3a2a')}
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

def _top(tid):
    if tid == 'white':  t = tone('#f4f1ea'); return dict(top=t, sleeve=dict(long=False, **t), torso_hem=30)
    if tid == 'black':  t = tone('#2b2b30'); return dict(top=t, sleeve=dict(long=False, **t), torso_hem=30)
    if tid == 'stripe':
        t = tone('#9db7d6'); f = _stripe(dict(base=t['base'], hi=H('#f4f1ea')))
        return dict(top=dict(fill=f, **t), sleeve=dict(long=False, fill=f, **t), torso_hem=30)
    if tid == 'hoodie':
        t = tone('#e3b93c'); return dict(top=t, sleeve=dict(long=True, cuff=t['lo'], **t), torso_hem=31, hood=t['base'])
    raise KeyError(tid)

def _bottom(bid):
    if bid in ('jeans', 'track'):
        t = tone({'jeans': '#5f7fa8', 'track': '#4d4f58'}[bid]); return dict(type='pants', **t)
    if bid == 'pleat':
        t = tone('#d98aa6')
        return dict(type='skirt', base=t['base'], fill=lambda x, y: t['lo'] if (x-CX) % 3 == 0 else (t['hi'] if y < 33 else t['base']),
                    skirt_end=37, flare=2, legL=3, skin_y0=36)
    raise KeyError(bid)

HEADWEAR = {'beret': '#f080b0', 'bow': '#c85088', 'band': '#88c0f0', 'star': '#f8d838'}  # 【佔位色】
IRIS = {'brown': '#3a2a28', 'blue': '#4a6aa8', 'green': '#4a8a5a', 'violet': '#7a5a9a'}  # 眼珠色【佔位色】
TOPS = ('white', 'black', 'stripe', 'hoodie')
BOTTOMS = ('jeans', 'track', 'pleat')

def player(hair_id, skin_id, top='white', bottom='jeans', eyes='normal', mouth='mid', freckles=False, features=True, hw=None, iris='brown'):
    sk = H(SKIN_TONES[skin_id]); hs, hc = HAIR[hair_id]; hair = H(hc)
    shade, lip, blush = skin_colors(sk)
    P = dict(body='medium', skin=sk, skin_s=shade, blush=blush, lip=lip,
        hair=hair, hair_hi=hi_of(hair), hs=hs, hp=None,
        bottom=_bottom(bottom), shoe=H('#f4f0ec'), shoe_hi=H('#c8c4bc'), torso_len=0,
        iris=H(IRIS[iris]), eyes=eyes, mouth=mouth, freckles='auto' if freckles else None,
        nofeatures=not features)
    if hw: t = tone(HEADWEAR[hw]); P['hw'] = dict(kind=hw, **t)
    P.update(_top(top))
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
    allc = face_cells(player('bob', 's1', freckles=True))
    geo['blush'] = [list(c) for c in allc if c[2] in ('blush', 'nose')]
    geo['freckles'] = [list(c) for c in allc if c[2] == 'freckle']
    colors = {}
    for h in HAIR:
        for s in SKIN_TONES:
            P = player(h, s, freckles=True)
            colors[f'{h}_{s}'] = {k: _hex(v) for k, v in face_colors(P).items()}
    # 頭飾：與「無頭飾」的底圖逐格比對，只留不同的格子（含自動邊線），不需另做圖檔
    hw = {}
    for h in HAIR:
        ref = build(player(h, 's1', features=False))
        for k in HEADWEAR:
            cur = build(player(h, 's1', features=False, hw=k))
            hw[f'{h}_{k}'] = [[x, y, _hex(cur[y][x])] for y in range(len(cur)) for x in range(len(cur[0])) if cur[y][x] != ref[y][x]]
    # 眼鏡：畫在五官之上；鏡框圍住眼睛（x 為 CX±1..±4、y 8..11），墨鏡把鏡片填滿
    fr, ln = '#8a5a7a', '#2a2430'
    def box(corners, fill):
        out = []
        for sd in (-1, 1):
            for y in range(8, 12):
                for dx in range(1, 5):
                    edge = y in (8, 11) or dx in (1, 4)
                    corner = y in (8, 11) and dx in (1, 4)
                    if fill or (edge and (corners or not corner)): out.append([CX + sd*dx, y, ln if fill else fr])
        return out + [[CX, 9, fr]]
    geo['glasses'] = dict(round=box(False, False), square=box(True, False), sun=box(True, True))
    return dict(geo=geo, colors=colors, hw=hw, iris=IRIS)

def build_all(out_dir, scale=1):
    d = os.path.join(out_dir, 'player'); os.makedirs(d, exist_ok=True)
    for f in os.listdir(d):
        if f.endswith('.png'): os.remove(os.path.join(d, f))
    for h in HAIR:
        for s in SKIN_TONES:
            for t in TOPS:
                for b in BOTTOMS:
                    render_rgba(build(player(h, s, t, b, features=False)), scale).save(os.path.join(d, f'{h}_{s}_{t}_{b}.png'))
    with open(os.path.join(d, 'face.js'), 'w') as f:
        f.write('window.PLAYER_FACE=' + json.dumps(face_data(), separators=(',', ':')) + ';\n')
    return d
