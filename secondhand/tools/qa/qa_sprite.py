"""產生網頁端比對用的期望資料：隨機挑 300 組玩家造型，用引擎整張重畫，存成 JSON。
用法：python3 tools/qa/qa_sprite.py 輸出.json；再用 node tools/qa/qa_sprite.js 輸出.json 比對網頁端的輸出。"""
import json, os, random, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'pixel_art'))
import player as p
from engine import build

random.seed(int(os.environ.get('SEED', '1')))
out = []
for _ in range(300):
    h = random.choice(list(p.HAIR)); s = random.choice(list(p.SKIN_TONES)); t = random.choice(p.TOPS); b = random.choice(p.BOTTOMS)
    e = random.choice(p.EYES); m = random.choice(p.MOUTHS); f = random.random() < .5
    hw = random.choice([None] + list(p.HEADWEAR)); ir = random.choice(list(p.IRIS))
    hc = random.choice(list(p.HAIR_COLORS)); hwc = random.choice(list(p.HW_COLORS))
    sh = random.choice(p.SHOES); shc = random.choice(list(p.HW_COLORS)); so = random.choice([None] + list(p.SOCKS)); soc = random.choice(list(p.HW_COLORS))
    jk = random.choice([None] + list(p.JACKETS)); bg = random.choice([None] + list(p.BAGS)); bgc = random.choice(list(p.HW_COLORS))
    jw = [k for k in ('earring', 'necklace', 'bracelet') if random.random() < .5]
    g = build(p.player(h, s, t, b, e, m, f, hw=hw, iris=ir, hair_color=hc, hw_color=hwc, shoes=sh, shoe_color=shc, socks=so, sock_color=soc,
                       jacket=jk, bag=bg, bag_color=bgc, earring='earring' in jw, necklace='necklace' in jw, bracelet='bracelet' in jw))
    out.append(dict(look=dict(hair=h, skin=s, top=t, bottom=b, eyes=e, mouth=m, freckles='on' if f else 'off', headwear=hw or 'none', iris=ir, glasses='none',
                              hairColor=hc, headwearColor=hwc, shoes=sh, shoesColor=shc, socks=so or 'none', socksColor=soc, jacket=jk or 'none',
                              bag=bg or 'none', bagColor=bgc, earring='on' if 'earring' in jw else 'off', necklace='on' if 'necklace' in jw else 'off',
                              bracelet='on' if 'bracelet' in jw else 'off'),
                    grid=[['%02x%02x%02x' % tuple(c) if c else '' for c in row] for row in g]))
json.dump(out, open(sys.argv[1], 'w'))
