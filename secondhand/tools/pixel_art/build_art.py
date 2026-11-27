"""重新產生所有角色與房間圖片。

用法：python3 build_art.py [輸出資料夾]
預設輸出到 secondhand/art/。需要 Pillow（pip install pillow）。
"""
import os, sys
from PIL import Image
from engine import H, BG, render, build
from characters import A, B, C, D
import room
import scenes
import player

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'art')
os.makedirs(OUT, exist_ok=True)
GAP = 20

def sheet(images, gap=GAP):
    w = sum(i.width for i in images) + gap * (len(images) + 1)
    h = max(i.height for i in images) + gap * 2
    sh = Image.new("RGB", (w, h), BG)
    x = gap
    for i in images:
        sh.paste(i, (x, gap))
        x += i.width + gap
    return sh

def head(P, s=14):
    c = build(P)
    return render([r[2:25] for r in c[:21]], s)

def crop(P, s=16):
    c = build(P)
    return render([r[7:20] for r in c[3:18]], s)

chars = (A, B, C)
# 三位角色全身
sheet([render(build(f()), 8) for f in chars]).save(os.path.join(OUT, '三位角色.png'))
# 林（作者彩蛋 NPC，單獨輸出，不影響前三位的圖）
render(build(D()), 8).save(os.path.join(OUT, '林.png'))
# 三張臉
sheet([head(f()) for f in chars]).save(os.path.join(OUT, '三個臉.png'))
# 3x3 眼睛與嘴巴
eyes = ['closed', 'normal', 'big']
mouths = ['small', 'mid', 'wide']
cells = [[crop({**C(), 'eyes': e, 'mouth': m}, 14) for m in mouths] for e in eyes]
w, h = cells[0][0].width, cells[0][0].height
mat = Image.new("RGB", (w * 3 + GAP * 4, h * 3 + GAP * 4), BG)
for r, row in enumerate(cells):
    for c, im in enumerate(row):
        mat.paste(im, (GAP + c * (w + GAP), GAP + r * (h + GAP)))
mat.save(os.path.join(OUT, '眼睛嘴巴組合.png'))
# 四種膚色的雀斑、嘴唇、鼻子（第 5 張為標準角色伊瑪）
def lip_from(sk):
    return (int(sk[0]*116/138), int(sk[1]*56/88), min(255, int(sk[2]*58/56)))
brown = H('#b07850')
tones = [
    (H('#f6d8c8'), H('#e0aa98'), H('#c0606c'), None),
    (H('#f0d0b0'), H('#d8a888'), H('#d8707c'), None),
    (brown, H('#8c5a3c'), lip_from(brown), H('#8c5a3c')),
    (H('#8a5838'), H('#6c4028'), H('#74383a'), H('#6c4028')),
]
ims = []
for sk, sks, lp, ns in tones:
    P = {**B(), 'skin': sk, 'skin_s': sks, 'lip': lp}
    if ns:
        P['nose'] = ns
    ims.append(crop(P))
ims.append(crop(A()))
sheet(ims).save(os.path.join(OUT, '雀斑_各膚色.png'))
# 玩家角色（3 髮型 × 5 膚色）
player.build_all(OUT)
# 房間
room.build_room(OUT)
# 其他場景背景（小套房夜晚與整理後、包貨角落、咖啡廳）
scenes.build_scenes(OUT)
print('done ->', os.path.abspath(OUT))
