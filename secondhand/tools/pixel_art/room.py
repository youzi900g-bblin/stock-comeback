from PIL import Image, ImageDraw
from engine import *
from characters import A,B,C
OUT=H('#302430')
import os

def build_room(out_dir):

    W,Hh=104,72
    im=Image.new("RGB",(W,Hh),H('#c8b8d8')); d=ImageDraw.Draw(im)
    def R(x0,y0,x1,y1,f,o=None):
        if o is not None:
            base=f if f is not None else H('#88c4f4')
            o=dk(base,0.7)
        d.rectangle([x0,y0,x1,y1],fill=f,outline=o)
    # wall stripes
    for x in range(0,W,6): R(x,0,x+2,47,H('#d2c4e2'))
    # floor
    R(0,48,W-1,Hh-1,H('#c09868'))
    for y in range(52,Hh,6):
        R(0,y,W-1,y,H('#a87c4c'))
        for x in range((y//6%2)*7,W,14): R(x,y-5,x,y,H('#a87c4c'))
    # baseboard
    R(0,45,W-1,47,H('#8c70a0')); R(0,47,W-1,47,dk(H('#8c70a0'),0.7))
    # window
    R(40,8,64,30,H('#88c4f4'),OUT); R(39,7,65,31,None,OUT)
    R(41,9,63,29,H('#88c4f4'))
    R(46,13,52,15,WHITE);R(48,12,56,14,WHITE);R(55,20,60,21,WHITE)
    R(51,8,53,30,H('#f4f0ec')); R(40,18,64,20,H('#f4f0ec'))
    R(38,30,66,32,H('#f4f0ec'),OUT)
    # curtains
    for x0 in (34,64):
        R(x0,6,x0+5,33,H('#e888b0'),OUT)
        for k in range(x0+1,x0+5,2): R(k,8,k,32,H('#c85088'))
    R(32,5,72,6,H('#6c4a50'),OUT)
    # string lights
    d.line([(1,3),(25,8),(52,3),(78,8),(102,3)],fill=dk(H('#d2c4e2'),0.7))
    cols=[H('#f8e060'),H('#f080b0'),H('#88e0f0')]
    for n,x in enumerate(range(4,102,6)):
        y=3+int(abs((x%52)-26)*5/26*(1 if True else 0)); y=min(8,max(3,8-int(abs((x-26)%52-26)/5)))
        R(x,y+1,x+1,y+2,cols[n%3])
    # posters
    R(10,14,22,30,H('#5a3c78'),OUT); R(15,17,17,19,H('#f8e060')); R(12,22,20,23,H('#f080b0')); R(13,25,19,26,H('#88e0f0'))
    R(78,12,90,24,H('#2c2830'),OUT); R(82,15,86,19,H('#c02840')); R(80,21,88,21,H('#f4f0ec'))
    # wardrobe (overflowing)
    R(76,26,100,52,H('#6c4a50'),OUT); R(76,26,100,28,H('#85606a'))
    R(77,29,99,51,H('#4a3038'))
    R(88,29,88,51,OUT)
    cl=[H('#f080b0'),H('#2a2430'),H('#88c0f0'),H('#f8e060'),H('#7ab070'),H('#e8e0d0'),H('#c85088')]
    x=78
    n=0
    while x<98:
        if x==88: x+=1; continue
        R(x,31,x+2,31+8+(n*3)%6,cl[n%7],OUT); n+=1; x+=3
    R(78,30,98,30,H('#c8b090'))
    # overflow pile
    for k,(px,py,pw,ph) in enumerate([(70,50,8,4),(74,52,9,4),(68,53,7,3),(78,54,8,3)]):
        R(px,py,px+pw,py+ph,cl[(k*2)%7],OUT)
    # boxes
    R(84,56,98,66,H('#c89860'),OUT); R(90,56,92,66,H('#e0c898')); R(86,60,98,60,H('#a87840'))
    R(88,48,98,56,H('#d8aa70'),OUT); R(92,48,93,56,H('#e8d0a0'))
    # bed
    R(2,30,6,56,H('#6c4a50'),OUT)
    R(4,42,34,56,H('#6c4a50'),OUT)
    R(6,40,33,50,H('#f0a8c8'),OUT)
    for x in range(8,33,4): R(x,41,x+1,49,H('#e888b0'))
    R(7,36,16,42,WHITE,OUT)
    R(17,37,32,41,H('#88c0f0'),OUT); R(22,34,30,38,cl[3],OUT); R(10,33,15,36,cl[1],OUT)
    # plant
    R(37,54,41,60,H('#c85088'),OUT)
    for (px,py) in [(36,48),(39,46),(41,50),(38,50)]: R(px,py,px+2,py+5,H('#5aa060'),OUT)
    # rug
    d.ellipse([34,60,72,70],fill=H('#e888b0'),outline=dk(H('#e888b0'),0.7))
    d.ellipse([38,62,68,68],fill=H('#f4d0e0'))

    def to_grid(im): return [[im.getpixel((x,y)) for x in range(im.width)] for y in range(im.height)]
    RW,RH=im.width,im.height
    base=to_grid(im)
    render(base,8).save(os.path.join(out_dir,"小套房背景.png"))
    sc=[r[:] for r in base]
    for f,cx in ((A,30),(B,52),(C,76)):
        ch=build(f()); oy=RH-3-len(ch)
        for j,r in enumerate(ch):
            for i2,col in enumerate(r):
                if col: sc[oy+j][cx-13+i2]=col
    render(sc,8).save(os.path.join(out_dir,"小套房_三人合照.png"))

