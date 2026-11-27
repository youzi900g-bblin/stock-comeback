"""場景背景（只畫背景，人物另外疊上去）。尺寸 104×96 格，放大 8 倍輸出。
各場景有自己的配色；小套房維持淡紫、深木色、梅紅與粉。
規則（見 docs/美術製作指南.md「場景背景」）：
  1. 圖層順序：牆與地板 → 牆面物 → 靠牆家具 → 地面平貼物（地毯）→ 地上物件 → 前景桌椅 → 光效；
     同一層依物件底邊列數由小到大畫（越靠後越先畫）。
  2. 花紋以物件中心為軸對稱，由中心往兩側算位置。
  3. 有光才畫光暈，沒有光源就不畫。"""
import os
from PIL import Image, ImageDraw
from engine import H, dk, render, WHITE
import room

OUT = H('#302430')
W, HH = 104, 96
L_WALL, L_WALLOBJ, L_FURN, L_FLAT, L_FLOOR, L_FRONT, L_LIGHT = range(7)

class Scene:
    def __init__(s):
        s.im = Image.new("RGB", (W, HH), (0, 0, 0)); s.d = ImageDraw.Draw(s.im); s.items = []
    def R(s, x0, y0, x1, y1, f, o=False):
        f = H(f) if isinstance(f, str) else f
        s.d.rectangle([x0, y0, x1, y1], fill=f, outline=(dk(f, 0.7) if o else None))
    def E(s, x0, y0, x1, y1, f, o=True):
        f = H(f) if isinstance(f, str) else f
        s.d.ellipse([x0, y0, x1, y1], fill=f, outline=(dk(f, 0.7) if o else None))
    def add(s, layer, base, fn): s.items.append((layer, base, len(s.items), fn))
    def draw(s):
        for _, _, _, fn in sorted(s.items, key=lambda t: t[:3]): fn()
        return s.im

def sym(cx, offsets):
    """以 cx 為軸，回傳左右對稱的位置清單。"""
    return [cx+o for o in offsets] + [cx-o for o in offsets]

def stripes(sc, c1, c2, y1=47):
    sc.R(0, 0, W-1, y1, c1)
    for x in range(0, W, 6): sc.R(x, 0, x+2, y1, c2)

def floor_boards(sc, base, line, y0=48):
    sc.R(0, y0, W-1, HH-1, base)
    for y in range(y0+4, HH, 6):
        sc.R(0, y, W-1, y, line)
        for x in range((y//6 % 2)*7, W, 14): sc.R(x, y-5, x, y, line)

def string_lights(sc, cols=('#f8e060', '#f080b0', '#88e0f0'), wire='#a89bc0'):
    sc.d.line([(1, 3), (25, 8), (52, 3), (78, 8), (102, 3)], fill=H(wire))
    for n, x in enumerate(range(4, 102, 6)):
        y = min(8, max(3, 8-int(abs((x-26) % 52-26)/5))); sc.R(x, y+1, x+1, y+2, cols[n % 3])

# ---- 小套房：夜晚 ----
def night_room():
    im = room.draw_room(); px = im.load()
    for y in range(HH):
        for x in range(W):
            r, g, b = px[x, y]; px[x, y] = (int(r*0.40)+8, int(g*0.38)+12, min(255, int(b*0.60)+44))
    d = ImageDraw.Draw(im)
    for y in range(9, 30):
        for x in range(41, 64):
            if 51 <= x <= 53 or 18 <= y <= 20: continue
            px[x, y] = H('#1c2860')
    for (x, y) in [(43, 11), (47, 25), (56, 12), (59, 24), (45, 20), (61, 15), (57, 27), (44, 27)]: px[x, y] = H('#f4f0ec')
    for (x, y) in [(46, 11), (46, 12), (45, 12), (45, 13), (45, 14), (46, 15), (47, 15), (47, 14)]: px[x, y] = H('#f8e060')
    cols = [H('#f8e060'), H('#f080b0'), H('#88e0f0')]
    for n, x in enumerate(range(4, 102, 6)):   # 串燈亮起，周圍有柔光（光源就是串燈）
        y = min(8, max(3, 8-int(abs((x-26) % 52-26)/5)))
        for (a, b_) in [(x-1, y+1), (x-1, y+2), (x+2, y+1), (x+2, y+2), (x, y), (x+1, y), (x, y+3), (x+1, y+3)]:
            if 0 <= a < W and 0 <= b_ < HH:
                r, g, b = px[a, b_]; c = cols[n % 3]
                px[a, b_] = (int(r*0.6+c[0]*0.4), int(g*0.6+c[1]*0.4), int(b*0.6+c[2]*0.4))
        d.rectangle([x, y+1, x+1, y+2], fill=cols[n % 3])
    return im

# ---- 包貨角落（牛皮紙與薄荷）----
def packing_corner():
    sc = Scene(); R = sc.R
    KR, KR2, KR3, KRD = '#c89860', '#d8aa70', '#e8d0a0', '#a87840'
    MINT, MINT2, SLATE, CREAM, CORAL = '#6cc0a8', '#b8e4d4', '#3a4450', '#f0e8d8', '#e87060'
    def walls():
        stripes(sc, CREAM, '#e6dcc6')
        R(0, 48, W-1, HH-1, '#a4a8a8')
        for y in range(52, HH, 8): R(0, y, W-1, y, '#868a8c')
        for y in range(48, HH, 8):
            for x in range(((y//8) % 2)*13, W, 26): R(x, y, x, y+7, '#868a8c')
        R(0, 45, W-1, 47, '#5a6a6c'); R(0, 47, W-1, 47, dk(H('#5a6a6c'), 0.7))
    sc.add(L_WALL, 0, walls)
    def window():   # 窗戶（中心 x=16），十字窗框以中心對稱
        R(6, 8, 26, 28, '#a8d8e8', True); R(5, 7, 27, 29, None, True) if False else None
        R(5, 7, 27, 29, '#a8d8e8'); R(6, 8, 26, 28, '#a8d8e8', True)
        R(15, 8, 17, 28, '#f4f0ec'); R(6, 17, 26, 19, '#f4f0ec')
        R(9, 11, 12, 13, WHITE); R(20, 22, 23, 23, WHITE); R(4, 29, 28, 31, '#f4f0ec', True)
    sc.add(L_WALLOBJ, 31, window)
    def cork():     # 軟木板（中心 x=52）與出貨單
        R(36, 8, 68, 30, KR, True); R(37, 9, 67, 29, KR2)
        for (x, y) in [(39, 11), (47, 12), (55, 11), (60, 17), (40, 19), (50, 20)]:
            R(x, y, x+6, y+5, '#f4f0ec', True); R(x, y, x+6, y+1, MINT); R(x+1, y+3, x+4, y+3, SLATE); R(x+1, y+4, x+3, y+4, '#c8d4d0')
        for (x, y) in [(42, 10), (50, 11), (58, 10), (63, 16), (43, 18), (53, 19)]: R(x, y, x, y, CORAL)
    sc.add(L_WALLOBJ, 30, cork)
    def shelf():
        R(74, 20, 100, 22, SLATE, True)
        R(76, 12, 82, 19, KR, True); R(79, 12, 79, 19, KR3)
        R(84, 14, 90, 19, MINT, True); R(85, 16, 89, 16, MINT2)
        R(92, 10, 99, 19, KR2, True); R(95, 10, 96, 19, KR3)
    sc.add(L_WALLOBJ, 22, shelf)
    def desk():     # 書桌：中心 x=65，腿與抽屜以中心對稱
        R(30, 40, 100, 43, '#d8c090', True); R(30, 43, 100, 44, '#b09870')
        R(31, 45, 99, 47, SLATE, True)
        for x in (32, 95): R(x, 48, x+3, 66, SLATE, True)
        R(36, 52, 94, 60, '#2c3440', True)
        for x0 in (37, 68):   # 兩個等寬抽屜（各 26 格）以中心 65 對稱
            R(x0, 54, x0+25, 58, '#4a5664', True); R(x0+10, 55, x0+15, 56, '#b8c4c0')
        # 桌上：筆電
        R(40, 31, 56, 40, '#2c2830', True); R(42, 33, 54, 38, '#a8d8e8'); R(43, 34, 48, 35, WHITE); R(43, 37, 52, 37, MINT)
        R(38, 40, 58, 41, '#c8d4d0', True)
        R(62, 38, 72, 40, '#f4f0ec', True); R(64, 36, 70, 37, '#c8d4d0', True); R(65, 38, 69, 38, '#2c3440')   # 電子秤
        R(75, 35, 82, 40, MINT, True); R(77, 37, 80, 38, MINT2); R(83, 38, 86, 40, '#f8e060', True)           # 膠台
        for i, c in enumerate(['#f4f0ec', KR3, MINT2, '#f4f0ec']): R(89, 40-3*(i+1), 99, 40-3*i-1, c, True)    # 摺好的衣服
        R(88, 28, 100, 29, '#f4f0ec', True)
    sc.add(L_FURN, 66, desk)
    def rug():
        sc.E(66, 70, 98, 86, MINT, True); sc.E(70, 73, 94, 83, MINT2, False)
    sc.add(L_FLAT, 86, rug)
    def tape(x0, y0, x1, y1, w=3):   # 紙箱：中間一道膠帶
        cx = (x0+x1)//2; R(x0, y0, x1, y1, KR, True); R(cx-w//2, y0, cx+w//2, y1, KR3)
    sc.add(L_FLOOR, 65, lambda: (tape(10, 54, 24, 65), None))
    sc.add(L_FLOOR, 82, lambda: (tape(4, 66, 26, 82), R(5, 72, 25, 72, KRD), R(8, 74, 14, 79, '#f4f0ec', True), R(9, 75, 13, 75, MINT), R(9, 77, 12, 77, SLATE)))
    sc.add(L_FLOOR, 82, lambda: (tape(28, 70, 46, 82), R(29, 75, 45, 75, KRD)))
    sc.add(L_FLOOR, 83, lambda: tape(50, 74, 66, 83))
    def roll():
        R(100, 50, 103, 80, KR, True); R(100, 50, 103, 53, KR3)
    sc.add(L_FLOOR, 80, roll)
    sc.add(L_LIGHT, 0, lambda: string_lights(sc, ('#f8e060', '#e87060', '#6cc0a8'), '#868a8c'))
    return sc.draw()

# ---- 咖啡廳（咖啡色系）----
def cafe():
    sc = Scene(); R = sc.R
    CREAM, BRICK, BRICK2, ESP, ESP2, MUST, OLIVE = '#f0e0c8', '#a8503c', '#c87860', '#4a3028', '#6a4838', '#e0b040', '#6c7a3c'
    def walls():
        stripes(sc, CREAM, '#e8d4b4', 31)
        R(0, 32, W-1, 47, BRICK)                    # 下半牆：磚紅（磚縫錯開）
        for y in range(34, 47, 4):
            R(0, y, W-1, y, BRICK2)
            for x in range(((y//4) % 2)*6, W, 12): R(x, y-3, x, y, BRICK2)
        R(0, 32, W-1, 32, '#f4ecd8'); R(0, 47, W-1, 47, '#5a2e22')
        for y in range(48, HH, 8):                  # 地板：米色與咖啡色棋盤磚（8×8）
            for x in range(0, W, 8): R(x, y, x+7, y+7, '#e8d8b8' if ((x//8)+(y//8)) % 2 == 0 else '#dcc8a2')   # 兩個接近的米色，低對比，人物站上去才讀得出來
    sc.add(L_WALL, 0, walls)
    def window():   # 窗戶（中心 x=22）：街景、十字窗框、窗台與遮陽篷，條紋以中心對稱
        R(6, 12, 38, 38, '#a8d8e8', True)
        for (x0, x1, y0, c) in [(7, 14, 28, '#8c70a0'), (15, 20, 22, '#6c4a50'), (24, 29, 30, '#85606a'), (30, 37, 26, '#8c70a0')]:
            R(x0, y0, x1, 38, c)
            for yy in range(y0+2, 38, 4):
                for xx in range(x0+1, x1, 3): R(xx, yy, xx, yy, '#f8e060')
        R(21, 12, 23, 38, '#f4f0ec'); R(6, 24, 38, 26, '#f4f0ec'); R(3, 38, 41, 40, '#f4f0ec', True)
        for i in range(7): R(3+i*6, 4, 8+i*6, 10, MUST if i % 2 == 0 else '#f4f0ec', True)   # 7 條：兩端都是芥末黃，中心對稱
        R(3, 10, 41, 11, '#b88820')
    sc.add(L_WALLOBJ, 40, window)
    def board():    # 菜單黑板（中心 x=58）
        R(46, 10, 70, 28, '#4a3028', True); R(47, 11, 69, 27, '#2c3a34')
        for (x0, x1, y) in [(50, 66, 14), (50, 62, 18), (50, 65, 22), (50, 60, 26)]: R(x0, y, x1, y, '#f4f0ec')
        R(63, 24, 67, 27, '#f4f0ec'); R(64, 25, 66, 26, '#b87040')
    sc.add(L_WALLOBJ, 28, board)
    def shelf():
        R(76, 20, 100, 22, ESP2, True)
        for x, c in [(78, '#f4f0ec'), (83, MUST), (88, '#88c0f0'), (93, '#f4f0ec')]: R(x, 15, x+3, 19, c, True); R(x+4, 16, x+4, 17, c)
        R(96, 12, 100, 19, '#b87040', True)
    sc.add(L_WALLOBJ, 22, shelf)
    def counter():  # 櫃台（中心 x=72）：五塊櫃門以中心對稱，左右各留 4 格
        R(44, 40, 100, 44, '#f4ecd8', True); R(44, 44, 100, 45, '#d8c8a8')
        R(45, 46, 99, 64, ESP, True)
        for x in sym(72, [0]) if False else [49, 59, 69, 79, 89]: R(x, 49, x+6, 61, ESP2, True)
        R(70, 26, 88, 40, '#b87040', True); R(72, 28, 86, 31, '#e0b090'); R(74, 33, 78, 40, '#2c2830'); R(80, 33, 84, 40, '#2c2830')
        R(75, 38, 77, 40, '#f4f0ec'); R(81, 38, 83, 40, '#f4f0ec'); R(77, 29, 79, 30, MUST)
        R(50, 34, 52, 40, '#f4f0ec', True); R(54, 36, 56, 40, MUST, True)
        R(58, 30, 68, 40, '#d8c8a8', True); R(59, 31, 67, 39, '#f4f0ec'); R(61, 35, 65, 39, '#c87860', True); R(62, 33, 64, 34, '#f4ecd8')
        R(94, 35, 99, 40, OLIVE, True); R(93, 31, 100, 35, OLIVE, True)
    sc.add(L_FURN, 64, counter)
    def lamps():    # 吊燈：以櫃台中心 72 對稱，高度只到黑板上方（不蓋住黑板）
        for x in sym(72, [0, 22]):
            if x == 72 or True: pass
        for x in (50, 72, 94):
            R(x, 0, x, 3, ESP); R(x-3, 4, x+3, 7, MUST, True)
            # 有燈才有光：燈下一小片暖光
            for yy in range(8, 11): R(x-2-(yy-8), yy, x+2+(yy-8), yy, '#f6d890') if False else None
    sc.add(L_LIGHT, 0, lamps)
    def rug():
        sc.E(46, 82, 98, 94, '#c87860', True); sc.E(52, 85, 92, 92, '#f0d8b8', False)
    sc.add(L_FLAT, 94, rug)
    def table(tx, ty):
        sc.E(tx, ty, tx+22, ty+6, '#f4ecd8', True)
        R(tx+10, ty+6, tx+12, ty+20, ESP2, True); R(tx+5, ty+19, tx+17, ty+21, ESP2, True)
        R(tx+4, ty-4, tx+7, ty-1, '#f4f0ec', True); R(tx+5, ty-3, tx+6, ty-3, '#b87040')
        R(tx+14, ty-3, tx+16, ty, MUST, True)
    def chair(cx, ty):
        R(cx, ty-2, cx+5, ty+2, '#c0603c', True); R(cx, ty+3, cx+5, ty+4, ESP2, True)
        R(cx+1, ty+5, cx+1, ty+13, ESP2); R(cx+4, ty+5, cx+4, ty+13, ESP2)
    def plant():
        R(2, 50, 8, 62, '#c0603c', True)
        for (px, py) in [(0, 40), (4, 37), (8, 42), (5, 42)]: R(px, py, px+2, py+9, OLIVE, True)
    sc.add(L_FLOOR, 62, plant)
    for (tx, ty) in [(12, 68), (54, 72)]:
        sc.add(L_FRONT, ty+21, lambda tx=tx, ty=ty: table(tx, ty))
        for cx in (tx-8, tx+26): sc.add(L_FRONT, ty+13, lambda cx=cx, ty=ty: chair(cx, ty))
    return sc.draw()

# ---- 街頭（黃昏、霓虹）----
def street():
    sc = Scene(); R = sc.R
    NEON_P, NEON_T, DARK = '#f060a8', '#40e0d0', '#2c2840'
    def sky():
        bands = ['#2c2860', '#3c3478', '#5a4090', '#8a4a98', '#c0587c', '#e88860']
        for i, c in enumerate(bands): R(0, i*8, W-1, i*8+7, c)
        for i in range(1, len(bands)):   # 色帶交界用抖色（棋盤式交錯）過渡
            for x in range(W):
                if (x+i) % 2 == 0: R(x, i*8-1, x, i*8-1, bands[i])
                else: R(x, i*8, x, i*8, bands[i-1])
        for (x, y) in [(6, 3), (20, 8), (38, 4), (60, 6), (82, 2), (96, 9), (50, 12)]: R(x, y, x, y, '#f4f0ec')
        # 遠景天際線（兩層）
        for (x0, x1, y0) in [(0, 9, 30), (10, 22, 24), (23, 34, 32), (35, 48, 26), (49, 60, 33), (61, 75, 22), (76, 88, 30), (89, 103, 25)]:
            R(x0, y0, x1, 47, '#3c3860')
            for yy in range(y0+3, 44, 5):
                for xx in range(x0+2, x1-1, 4): R(xx, yy, xx+1, yy+1, '#f8d870' if (xx*7+yy) % 3 else '#5a5088')
    sc.add(L_WALL, 0, sky)
    def ground():
        R(0, 48, W-1, 62, '#8c8ca8')                              # 人行道磚
        for x in range(0, W, 12): R(x, 48, x, 62, '#74748c')
        for y in (54, 60): R(0, y, W-1, y, '#74748c')
        R(0, 63, W-1, 65, '#5a5a74', True)                        # 路緣
        R(0, 66, W-1, HH-1, '#3a3a50')                            # 柏油路
        for x in range(4, W, 20): R(x, 82, x+9, 83, '#e8d890')    # 車道線（對稱於畫面中心 52）
    sc.add(L_WALL, 1, ground)
    def shop():     # 店面（中心 x=80）：招牌、窗與條紋遮陽，皆以中心對稱
        R(58, 12, 102, 47, '#2c3a50', True)
        R(62, 14, 98, 22, DARK, True)
        for x0 in (64, 80): R(x0, 16, x0+14, 20, NEON_P)          # 招牌霓虹（兩段，中心對稱）
        for x in sym(80, [1, 3, 5, 7, 9, 11, 13, 15]): R(x, 17, x, 19, '#f4b8d8')
        R(62, 30, 98, 47, '#f0c878', True); R(63, 31, 97, 46, '#f8dc98')   # 亮著的櫥窗
        for i in range(9): R(60+i*4, 24, 63+i*4, 29, NEON_T if i % 2 == 0 else '#f4f0ec', True)   # 遮陽篷 9 條，兩端同色
        R(78, 36, 82, 46, '#6a4838', True)                         # 門
        for x in sym(80, [8, 14]): R(x-2, 36, x+2, 40, '#c87860', True)   # 櫥窗裡的衣服
    sc.add(L_WALLOBJ, 47, shop)
    def graffiti():  # 塗鴉牆（左）
        R(0, 28, 40, 47, '#74708c', True)
        for y in range(31, 47, 4):
            R(0, y, 40, y, '#5a5674')
            for x in range(((y//4) % 2)*5, 41, 10): R(x, y-3, x, y, '#5a5674')
        R(4, 32, 14, 40, NEON_P, True); R(6, 34, 12, 38, '#f4b8d8'); R(18, 30, 30, 36, NEON_T, True); R(20, 32, 28, 34, '#b8f4ec'); R(10, 41, 34, 44, '#f8e060', True)
    sc.add(L_WALLOBJ, 47, graffiti)
    def vending():  # 自動販賣機（中心 x=16，欄位左右對稱）
        R(8, 30, 24, 60, '#2c3a50', True); R(10, 32, 22, 48, '#40c0c0', True)
        for r in range(3):
            for c in range(3): R(11+c*4, 33+r*5, 13+c*4, 36+r*5, ['#f060a8', '#f8e060', '#f4f0ec'][(r+c) % 3])
        R(10, 50, 22, 56, DARK, True); R(14, 52, 18, 54, NEON_P)
    sc.add(L_FLOOR, 60, vending)
    def bike():
        sc.E(62, 50, 74, 60, '#1c1c28', True); sc.E(64, 52, 72, 58, '#8c8ca8', False); sc.E(80, 50, 92, 60, '#1c1c28', True); sc.E(82, 52, 90, 58, '#8c8ca8', False)
        sc.d.line([(68, 55), (74, 49), (86, 55), (68, 55)], fill=H(NEON_P), width=1); sc.d.line([(74, 49), (80, 49)], fill=H('#f4f0ec'))
        sc.d.line([(86, 55), (84, 46), (88, 46)], fill=H('#f4f0ec'))
    sc.add(L_FLOOR, 60, bike)
    def bin_():
        R(44, 48, 52, 60, '#4a5a64', True); R(43, 47, 53, 49, '#6a7a84', True); R(46, 51, 50, 51, '#2c3a40'); R(46, 54, 50, 54, '#2c3a40')
    sc.add(L_FLOOR, 60, bin_)
    def lamp():     # 路燈（中心 x=34）：有燈才有光
        R(33, 22, 35, 62, '#2c2840', True); R(26, 20, 42, 23, '#2c2840', True); R(27, 23, 41, 25, '#f8e8a0')
    sc.add(L_FLOOR, 62, lamp)
    def glow():
        px = sc.im.load()
        for y in range(25, 66):
            for x in range(14, 56):
                dd = ((x-34)/20.0)**2 + ((y-25)/26.0)**2
                if dd < 1:
                    r, g, b = px[x, y]; k = (1-dd)*0.30
                    px[x, y] = (min(255, int(r+(250-r)*k)), min(255, int(g+(220-g)*k)), min(255, int(b+(140-b)*k)))
    sc.add(L_LIGHT, 0, glow)
    return sc.draw()

def to_png(im, path):
    render([[im.getpixel((x, y)) for x in range(im.width)] for y in range(im.height)], 8).save(path)

def build_scenes(out_dir):
    to_png(night_room(), os.path.join(out_dir, '小套房_夜晚.png'))
    to_png(room.draw_room(tidy=True), os.path.join(out_dir, '小套房_整理後.png'))
    to_png(packing_corner(), os.path.join(out_dir, '包貨角落.png'))
    to_png(cafe(), os.path.join(out_dir, '咖啡廳.png'))
    to_png(street(), os.path.join(out_dir, '街頭.png'))
