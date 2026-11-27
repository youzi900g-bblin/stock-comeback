import sys, random, json; import os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import player as p
from engine import build, H, dk
D=p.face_data(); L,pal=p.layer_data()
def hi_(c): return tuple(min(255,int(v*1.28)+8) for v in c)
def resolve(spec,pl):
    if spec.startswith('#'): return H(spec)
    role,_,op=spec.partition(':'); c=H(pl[role])
    return c if not op else (p._dk(c) if op=='dk' else p._warm(c))
def compose(h,s,t,b):
    pl={**pal['skin'][s],**pal['hair'][h]}
    layers=L['base']+L['hair:'+h]+L['top:'+t]+L['bottom:'+b]
    g=[[None]*27 for _ in range(53)]
    for ly in sorted(layers,key=lambda l:l['z']):
        cols=[resolve(c,pl) for c in ly['cols']]
        for x,y,w,ci in ly['runs']:
            for i in range(w): g[y][x+i]=cols[ci]
    return g
bad=0; n=0
for h in p.HAIR:
  for s in p.SKIN_TONES:
    for t in p.TOPS:
      for b in p.BOTTOMS:
        n+=1
        if compose(h,s,t,b)!=build(p.player(h,s,t,b,features=False)): bad+=1
print('combos',n,'mismatch',bad)
