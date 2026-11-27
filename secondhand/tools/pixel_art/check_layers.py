import sys, random, json; import os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import player as p
from engine import build, H, dk
D=p.face_data(); L,pal=p.layer_data()
def hi_(c): return tuple(min(255,int(v*1.28)+8) for v in c)
def resolve(spec,pl):
    if spec.startswith('#'): return H(spec)
    role,_,op=spec.partition(':'); c=H(pl[role])
    return c if not op else (p._dk(c) if op=='dk' else p._warm(c))
def compose(h,s,t,b,hc='darkbrown',hw=None,hwc='red',sh='canvas',shc='white',so=None,soc='white',jk=None,bg=None,bgc='blue',jw=()):
    it=lambda c: pal['item'][c]
    pl={**pal['skin'][s],**pal['hair'][hc],**pal['hw'][hwc],'shoe':it(shc)['base'],'shoe_lo':it(shc)['lo'],
        'sock':it(soc)['base'],'sock_lo':it(soc)['lo'],'bag':it(bgc)['base'],'bag_lo':it(bgc)['lo']}
    bt=pal['btype'][b]
    layers=L['base']+L['hair:'+h]+L['top:'+t]+L['bottom:'+b]+L[f'shoes:{sh}:{bt}']
    if hw: layers+=L['hw:'+hw]
    if so and bt=='skirt': layers+=L['socks:'+so]
    if jk: layers+=L['jacket:'+jk]
    if bg: layers+=L['bag:'+bg]
    for k in jw: layers+=L['jewel:'+k]
    g=[[None]*27 for _ in range(53)]
    for ly in sorted(layers,key=lambda l:l['z']):
        cols=[resolve(c,pl) for c in ly['cols']]
        for x,y,w,ci in ly['runs']:
            for i in range(w): g[y][x+i]=cols[ci]
    return g
random.seed(3); n=bad=0
for _ in range(2500):
    h=random.choice(list(p.HAIR)); s=random.choice(list(p.SKIN_TONES)); t=random.choice(p.TOPS); b=random.choice(p.BOTTOMS)
    hc=random.choice(list(p.HAIR_COLORS)); hw=random.choice([None]+list(p.HEADWEAR)); hwc=random.choice(list(p.HW_COLORS))
    sh=random.choice(p.SHOES); shc=random.choice(list(p.HW_COLORS)); so=random.choice([None]+list(p.SOCKS)); soc=random.choice(list(p.HW_COLORS))
    jk=random.choice([None]+list(p.JACKETS)); bg=random.choice([None]+list(p.BAGS)); bgc=random.choice(list(p.HW_COLORS))
    jw=[k for k in ('earring','necklace','bracelet') if random.random()<.5]
    n+=1
    exp=build(p.player(h,s,t,b,features=False,hw=hw,hair_color=hc,hw_color=hwc,shoes=sh,shoe_color=shc,socks=so,sock_color=soc,jacket=jk,bag=bg,bag_color=bgc,
        earring='earring' in jw,necklace='necklace' in jw,bracelet='bracelet' in jw))
    if compose(h,s,t,b,hc,hw,hwc,sh,shc,so,soc,jk,bg,bgc,jw)!=exp: bad+=1
print('combos',n,'mismatch',bad)
