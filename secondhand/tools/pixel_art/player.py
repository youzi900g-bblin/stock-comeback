"""玩家角色：用與 NPC 相同的引擎（engine.py）產生，輸出透明背景 PNG。

規則出處：docs/系統設計.md「八-1、角色美術規格」、docs/美術製作指南.md。
輸出：art/player/<髮型>_<膚色>.png，髮型與膚色的 id 要與 config.js 一致。

【佔位】髮色、預設服裝（白 T 加牛仔褲）、體型（中等）、五官（一般眼、2 格嘴）
都是第一階段的暫定值，尚未決定。
"""
import os
from engine import H, build, render_rgba

# 與 config.js 的 SKIN_TONES 同色（網頁的膚色選鈕用 config.js；改色要兩邊一起改）
SKIN_TONES = {'s1': '#f1cfb4', 's2': '#e3b38e', 's3': '#c68b62', 's4': '#8a5838', 's5': '#5f3b25'}
# id 與 config.js 的 HAIR_STYLES 一致；hs 是 engine.py 的髮型名稱。髮色為【佔位值】
HAIR = {'bob': ('bob', '#4a3426'), 'long': ('long', '#2a2230'), 'buns': ('puffs', '#2f2420')}

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

def hi_of(c):
    return tuple(min(255, int(v*1.28)+8) for v in c)

def player(hair_id, skin_id):
    sk = H(SKIN_TONES[skin_id]); hs, hc = HAIR[hair_id]; hair = H(hc)
    shade, lip, blush = skin_colors(sk)
    tee = dict(base=H('#ece8e0'), hi=H('#f8f4ec'), lo=H('#c4c0b8'))
    jeans = dict(base=H('#6c8bb3'), hi=H('#94b0d4'), lo=H('#4a6590'))
    return dict(body='medium', skin=sk, skin_s=shade, blush=blush, lip=lip,
        hair=hair, hair_hi=hi_of(hair), hs=hs, hp=None,
        bottom=dict(type='pants', **jeans), shoe=H('#f4f0ec'), shoe_hi=H('#c8c4bc'),
        sleeve=dict(long=False, base=tee['base'], hi=tee['hi'], lo=tee['lo']),
        top=tee, torso_hem=30, torso_len=0,
        iris=H('#3a2a28'), eyes='normal', mouth='mid')

def build_all(out_dir, scale=8):
    d = os.path.join(out_dir, 'player'); os.makedirs(d, exist_ok=True)
    for h in HAIR:
        for s in SKIN_TONES:
            render_rgba(build(player(h, s)), scale).save(os.path.join(d, f'{h}_{s}.png'))
    return d
