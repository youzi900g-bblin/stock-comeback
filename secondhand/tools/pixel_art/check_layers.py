import sys, random, json; import os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import player as p
from engine import build, H, dk
D=p.face_data(); L,pal=p.layer_data()
def hi_(c): return tuple(min(255,int(v*1.28)+8) for v in c)
def resolve(spec,pl):
    if spec.startswith('#'): return H(spec)
    role,_,op=spec.partition(':'); c=H(pl[role])
    return c if not op else (p._dk(c) if op=='dk' else p._warm(c))
def compose(h,s,t,b,hc='darkbrown',hw=None,hwc='red'):
    pl={**pal['skin'][s],**pal['hair'][hc],**pal['hw'][hwc]}
    layers=L['base']+L['hair:'+h]+L['top:'+t]+L['bottom:'+b]+(L['hw:'+hw] if hw else [])
    g=[[None]*27 for _ in range(53)]
    for ly in sorted(layers,key=lambda l:l['z']):
        cols=[resolve(c,pl) for c in ly['cols']]
        for x,y,w,ci in ly['runs']:
            for i in range(w): g[y][x+i]=cols[ci]
    return g
random.seed(3); n=bad=0
for _ in range(1500):
    h=random.choice(list(p.HAIR)); s=random.choice(list(p.SKIN_TONES)); t=random.choice(p.TOPS); b=random.choice(p.BOTTOMS)
    hc=random.choice(list(p.HAIR_COLORS)); hw=random.choice([None]+list(p.HEADWEAR)); hwc=random.choice(list(p.HW_COLORS))
    n+=1
    if compose(h,s,t,b,hc,hw,hwc)!=build(p.player(h,s,t,b,features=False,hw=hw,hair_color=hc,hw_color=hwc)): bad+=1
print('combos',n,'mismatch',bad)
