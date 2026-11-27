"""場景背景（只畫背景，人物另外疊上去）。尺寸 104×96 格，放大 8 倍輸出，色票與小套房相同。
輸出：小套房_夜晚、小套房_整理後、包貨角落、咖啡廳（art/ 下）。"""
import os
from PIL import Image, ImageDraw
from engine import H, dk, render, WHITE
import room

OUT = H('#302430')
W, HH = 104, 96

class Scene:
    def __init__(s, bg='#c8b8d8'):
        s.im = Image.new("RGB", (W, HH), H(bg)); s.d = ImageDraw.Draw(s.im)
    def R(s, x0, y0, x1, y1, f, o=None):
        s.d.rectangle([x0, y0, x1, y1], fill=f, outline=(dk(f, 0.7) if o is not None and f is not None else (dk(H('#88c4f4'), 0.7) if o is not None else None)))
    def grid(s): return [[s.im.getpixel((x, y)) for x in range(W)] for y in range(HH)]
    def save(s, path): render(s.grid(), 8).save(path)

def base_walls(sc, floor='#c09868'):
    """牆（淡紫直條）、地板（木板）、踢腳板，與小套房相同。"""
    R = sc.R
    for x in range(0, W, 6): R(x, 0, x+2, 47, H('#d2c4e2'))
    R(0, 48, W-1, HH-1, H(floor))
    for y in range(52, HH, 6):
        R(0, y, W-1, y, H('#a87c4c'))
        for x in range((y//6 % 2)*7, W, 14): R(x, y-5, x, y, H('#a87c4c'))
    R(0, 45, W-1, 47, H('#8c70a0')); R(0, 47, W-1, 47, dk(H('#8c70a0'), 0.7))

# ---- 小套房：夜晚 ----
def night_room():
    im = room.draw_room()
    px = im.load()
    for y in range(HH):
        for x in range(W):
            r, g, b = px[x, y]
            px[x, y] = (int(r*0.40)+8, int(g*0.38)+12, min(255, int(b*0.60)+44))
    d = ImageDraw.Draw(im)
    # 窗外夜空：玻璃部分換成深藍，窗框十字保留
    for y in range(9, 30):
        for x in range(41, 64):
            if 51 <= x <= 53 or 18 <= y <= 20: continue
            px[x, y] = H('#1c2860')
    for (x, y) in [(43, 11), (47, 25), (56, 12), (59, 24), (45, 20), (61, 15), (57, 27), (44, 27)]: px[x, y] = H('#f4f0ec')
    for (x, y) in [(46, 11), (46, 12), (45, 12), (45, 13), (45, 14), (46, 15), (47, 15), (47, 14)]: px[x, y] = H('#f8e060')   # 月牙
    # 串燈：亮起來，周圍多一圈柔光
    cols = [H('#f8e060'), H('#f080b0'), H('#88e0f0')]
    for n, x in enumerate(range(4, 102, 6)):
        y = min(8, max(3, 8-int(abs((x-26) % 52-26)/5)))
        for (a, b_) in [(x-1, y+1), (x-1, y+2), (x+2, y+1), (x+2, y+2), (x, y), (x+1, y), (x, y+3), (x+1, y+3)]:
            if 0 <= a < W and 0 <= b_ < HH:
                r, g, b = px[a, b_]; c = cols[n % 3]
                px[a, b_] = (int(r*0.6+c[0]*0.4), int(g*0.6+c[1]*0.4), int(b*0.6+c[2]*0.4))
        d.rectangle([x, y+1, x+1, y+2], fill=cols[n % 3])
    # 床邊小燈的光：地板上一圈暖色
    for y in range(52, 70):
        for x in range(30, 76):
            if (x-53)**2/460 + (y-61)**2/80 < 1:
                r, g, b = px[x, y]; px[x, y] = (min(255, r+22), min(255, g+16), max(0, b-4))
    return im

# ---- 包貨角落 ----
def packing_corner():
    sc = Scene(); R = sc.R; d = sc.d
    base_walls(sc)
    # 窗戶（左上，日光）
    R(6, 8, 26, 28, H('#88c4f4'), OUT); R(5, 7, 27, 29, None, OUT)
    R(15, 8, 17, 28, H('#f4f0ec')); R(6, 17, 26, 19, H('#f4f0ec'))
    R(10, 11, 13, 13, WHITE); R(20, 22, 24, 23, WHITE)
    R(4, 29, 28, 31, H('#f4f0ec'), OUT)
    # 軟木板：出貨單
    R(36, 8, 68, 30, H('#c89860'), OUT); R(37, 9, 67, 29, H('#d8aa70'))
    for (x, y, c) in [(39, 11, '#f4f0ec'), (47, 12, '#f4f0ec'), (55, 11, '#f4f0ec'), (60, 17, '#f4f0ec'), (40, 19, '#f4f0ec'), (50, 20, '#f4f0ec')]:
        R(x, y, x+6, y+5, H(c), OUT); R(x, y, x+6, y+1, H('#e888b0')); R(x+1, y+3, x+4, y+3, H('#6c4a50')); R(x+1, y+4, x+3, y+4, H('#c8b8d8'))
    for (x, y) in [(42, 10), (50, 11), (58, 10), (63, 16), (43, 18), (53, 19)]: R(x, y, x, y, H('#c85088'))
    # 層架（右上）：膠帶、紙盒、包裝紙
    R(74, 20, 100, 22, H('#6c4a50'), OUT)
    R(76, 12, 82, 19, H('#c89860'), OUT); R(79, 12, 79, 19, H('#e0c898'))
    R(84, 14, 90, 19, H('#e888b0'), OUT); R(85, 16, 89, 16, H('#f4d0e0'))
    R(92, 10, 99, 19, H('#d8aa70'), OUT); R(95, 10, 96, 19, H('#e8d0a0'))
    # 書桌
    R(30, 40, 100, 43, H('#c09868'), OUT); R(30, 43, 100, 44, H('#a87c4c'))
    R(31, 45, 99, 47, H('#6c4a50'), OUT)
    R(32, 48, 35, 66, H('#6c4a50'), OUT); R(95, 48, 98, 66, H('#6c4a50'), OUT)
    R(36, 52, 94, 60, H('#4a3038'), OUT)                          # 桌下抽屜層
    R(40, 54, 60, 58, H('#6c4a50'), OUT); R(48, 55, 52, 56, H('#c8b090'))
    R(66, 54, 90, 58, H('#6c4a50'), OUT); R(76, 55, 80, 56, H('#c8b090'))
    # 桌上：筆電
    R(40, 31, 56, 40, H('#2c2830'), OUT); R(42, 33, 54, 38, H('#88c4f4')); R(43, 34, 48, 35, WHITE); R(43, 37, 52, 37, H('#f080b0'))
    R(38, 40, 58, 41, H('#c8b8d8'), OUT)
    # 電子秤與包裹
    R(62, 38, 72, 40, H('#f4f0ec'), OUT); R(64, 36, 70, 37, H('#c8b8d8'), OUT); R(65, 38, 69, 38, H('#2c2830'))
    # 膠台
    R(75, 35, 82, 40, H('#e888b0'), OUT); R(77, 37, 80, 38, H('#f4d0e0')); R(83, 38, 86, 40, H('#f8e060'), OUT)
    # 摺好的衣服與氣泡信封
    for i, c in enumerate(['#f080b0', '#88c0f0', '#f4f0ec', '#7ab070']): R(89, 40-3*(i+1), 99, 40-3*i-1, H(c), OUT)
    R(88, 28, 100, 29, H('#f4d0e0'), OUT)
    # 地上：已包好的貨
    R(4, 66, 26, 82, H('#c89860'), OUT); R(13, 66, 17, 82, H('#e0c898')); R(5, 72, 25, 72, H('#a87840'))
    R(8, 74, 14, 79, H('#f4f0ec'), OUT); R(9, 75, 13, 75, H('#e888b0')); R(9, 77, 12, 77, H('#6c4a50'))
    R(28, 70, 46, 82, H('#d8aa70'), OUT); R(36, 70, 38, 82, H('#e8d0a0')); R(29, 75, 45, 75, H('#a87840'))
    R(10, 54, 24, 65, H('#d8aa70'), OUT); R(16, 54, 18, 65, H('#e8d0a0'))
    R(50, 74, 66, 83, H('#c89860'), OUT); R(57, 74, 59, 83, H('#e0c898'))
    # 捲筒包裝紙立在牆邊
    R(100, 50, 103, 80, H('#e888b0'), OUT); R(100, 50, 103, 53, H('#f4d0e0'))
    # 地墊
    d.ellipse([66, 70, 98, 86], fill=H('#e888b0'), outline=dk(H('#e888b0'), 0.7)); d.ellipse([70, 73, 94, 83], fill=H('#f4d0e0'))
    # 串燈
    d.line([(1, 3), (25, 8), (52, 3), (78, 8), (102, 3)], fill=dk(H('#d2c4e2'), 0.7))
    cols = [H('#f8e060'), H('#f080b0'), H('#88e0f0')]
    for n, x in enumerate(range(4, 102, 6)):
        y = min(8, max(3, 8-int(abs((x-26) % 52-26)/5))); R(x, y+1, x+1, y+2, cols[n % 3])
    return sc.im

# ---- 咖啡廳 ----
def cafe():
    sc = Scene(); R = sc.R; d = sc.d
    base_walls(sc)
    # 窗戶：外面是街景（建築剪影），上方有條紋遮陽篷
    R(6, 12, 38, 38, H('#88c4f4'), OUT); R(5, 11, 39, 39, None, OUT)
    for (x0, x1, y0, c) in [(7, 14, 28, '#8c70a0'), (15, 22, 22, '#6c4a50'), (23, 30, 30, '#85606a'), (31, 37, 26, '#8c70a0')]:
        R(x0, y0, x1, 38, H(c)); 
        for yy in range(y0+2, 38, 4):
            for xx in range(x0+1, x1, 3): R(xx, yy, xx, yy, H('#f8e060'))
    R(21, 12, 23, 38, H('#f4f0ec')); R(6, 24, 38, 26, H('#f4f0ec'))
    R(3, 38, 41, 40, H('#f4f0ec'), OUT)
    for i, x in enumerate(range(3, 42, 6)):
        R(x, 4, x+5, 10, H('#e888b0' if i % 2 == 0 else '#f4f0ec'), OUT)
    R(3, 10, 41, 11, H('#c85088'))
    # 菜單黑板
    R(46, 8, 70, 28, H('#4a3038'), OUT); R(47, 9, 69, 27, H('#2c2830'))
    for (x0, x1, y) in [(50, 66, 12), (50, 62, 16), (50, 65, 20), (50, 60, 24)]: R(x0, y, x1, y, H('#f4f0ec'))
    R(63, 22, 67, 26, H('#f4f0ec')); R(64, 23, 66, 25, H('#c09868')); R(67, 23, 68, 24, H('#f4f0ec'))
    # 吊燈
    for x in (52, 76, 94):
        R(x, 0, x, 7, H('#4a3038')); R(x-3, 8, x+3, 11, H('#f8e060'), OUT); R(x-2, 12, x+2, 12, H('#f8e060'))
    # 層架：杯子與罐子
    R(76, 20, 100, 22, H('#6c4a50'), OUT)
    for x, c in [(78, '#f4f0ec'), (83, '#f080b0'), (88, '#88c0f0'), (93, '#f4f0ec')]:
        R(x, 15, x+3, 19, H(c), OUT); R(x+4, 16, x+4, 17, H(c))
    R(96, 12, 100, 19, H('#c89860'), OUT); R(97, 11, 99, 11, H('#6c4a50'))
    # 櫃台
    R(44, 40, 100, 44, H('#f4f0ec'), OUT); R(44, 44, 100, 45, H('#c8b8d8'))
    R(45, 46, 99, 64, H('#6c4a50'), OUT)
    for x in range(52, 98, 10): R(x, 49, x+7, 61, H('#85606a'), OUT)
    # 咖啡機
    R(70, 26, 88, 40, H('#8c70a0'), OUT); R(72, 28, 86, 31, H('#c8b8d8')); R(74, 33, 78, 40, H('#2c2830')); R(80, 33, 84, 40, H('#2c2830'))
    R(75, 38, 77, 40, H('#f4f0ec')); R(81, 38, 83, 40, H('#f4f0ec')); R(77, 29, 79, 30, H('#f080b0'))
    # 櫃台上的杯子與蛋糕罩
    R(50, 34, 52, 40, H('#f4f0ec'), OUT); R(54, 36, 56, 40, H('#f080b0'), OUT)
    R(58, 30, 68, 40, H('#c8b8d8'), OUT); R(59, 31, 67, 39, H('#f4f0ec')); R(61, 35, 65, 39, H('#e888b0'), OUT); R(62, 33, 64, 34, H('#f4d0e0'))
    R(94, 35, 99, 40, H('#5aa060'), OUT); R(93, 31, 100, 35, H('#5aa060'), OUT)
    # 座位區：桌椅
    for (tx, ty) in [(10, 66), (52, 74)]:
        d.ellipse([tx, ty, tx+22, ty+6], fill=H('#f4f0ec'), outline=dk(H('#f4f0ec'), 0.7))
        R(tx+10, ty+6, tx+12, ty+20, H('#6c4a50'), OUT); R(tx+5, ty+19, tx+17, ty+21, H('#6c4a50'), OUT)
        R(tx+4, ty-4, tx+7, ty-1, H('#f4f0ec'), OUT); R(tx+5, ty-3, tx+6, ty-3, H('#c09868'))
        R(tx+14, ty-3, tx+16, ty, H('#f080b0'), OUT)
        for cx in (tx-8, tx+26):
            R(cx, ty-2, cx+5, ty+2, H('#c85088'), OUT); R(cx, ty+3, cx+5, ty+4, H('#6c4a50'), OUT)
            R(cx+1, ty+5, cx+1, ty+13, H('#6c4a50')); R(cx+4, ty+5, cx+4, ty+13, H('#6c4a50'))
    # 盆栽與地毯
    R(2, 60, 8, 72, H('#c85088'), OUT)
    for (px, py) in [(0, 50), (4, 47), (8, 52), (5, 52)]: R(px, py, px+2, py+9, H('#5aa060'), OUT)
    d.ellipse([60, 84, 98, 94], fill=H('#e888b0'), outline=dk(H('#e888b0'), 0.7)); d.ellipse([66, 86, 92, 92], fill=H('#f4d0e0'))
    return sc.im

def to_png(im, path):
    g = [[im.getpixel((x, y)) for x in range(im.width)] for y in range(im.height)]
    render(g, 8).save(path)

def build_scenes(out_dir):
    to_png(night_room(), os.path.join(out_dir, '小套房_夜晚.png'))
    to_png(room.draw_room(tidy=True), os.path.join(out_dir, '小套房_整理後.png'))
    to_png(packing_corner(), os.path.join(out_dir, '包貨角落.png'))
    to_png(cafe(), os.path.join(out_dir, '咖啡廳.png'))
