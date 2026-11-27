from engine import *
def A():
    sk=H('#8a5838'); sks=H('#6c4028')
    yel=dict(base=H('#f0c040'),hi=H('#f8dc78'),lo=H('#c89828'))
    def det(cv,tw,hem):
        W_=H('#f4f0ec')
        for y in range(21,24): cv.px(CX-2,y,W_);cv.px(CX+2,y,W_)
        for x in range(CX-tw+1,CX+tw): cv.px(x,hem-4,yel['lo'])
        for y in range(hem-4,hem): cv.px(CX-tw+1,y,yel['lo']);cv.px(CX+tw-1,y,yel['lo'])
    return dict(body='chubby',round=True,skin=sk,skin_s=sks,blush=H('#a84c44'),lip=H('#74383a'),
      hair=H('#2e1e1e'),hair_hi=H('#52403a'),hs='puffs',hp=(H('#30c0b0'),H('#f08838'),H('#f8d838')),
      hood=H('#d8aa30'),
      bottom=dict(type='pants',base=H('#8ab4e8'),hi=H('#b4d4f8'),lo=H('#5a84c0')),
      shoe=H('#f4f0ec'),shoe_hi=H('#d84040'),
      sleeve=dict(long=True,base=yel['base'],hi=yel['hi'],lo=yel['lo'],cuff=yel['lo']),
      top=yel,torso_hem=32,torso_len=0,detail=det,
      iris=H('#2a1c1c'),eyes='big',mouth='wide')
def B():
    sk=H('#f6d8c8'); sks=H('#e0aa98')
    bur=dict(base=H('#8a3040'),hi=H('#a8485c'),lo=H('#6a2030'))
    def det(cv,tw,hem):
        CR=H('#f4ecd8')
        for y in range(19,24):
            for x in range(CX-1,CX+2): cv.px(x,y,CR)
        cv.px(CX-2,19,CR);cv.px(CX+2,19,CR);cv.px(CX-2,20,CR);cv.px(CX+2,20,CR)
        for y in (23,25,27,29): cv.px(CX,y,H('#d8b050'))
    def plaid(x,y):
        base=H('#a08058');line=H('#5a6a30');l2=H('#d8c090')
        if (y%5==0): return line
        if ((x-CX)%5==0): return line
        if (y%5==2): return l2
        return base
    return dict(body='medium',skin=sk,skin_s=sks,blush=H('#ec9090'),lip=H('#c0606c'),
      hair=H('#8c3c2c'),hair_hi=H('#b8643c'),hs='bob',hp=(H('#6a7a3a'),H('#8a9a58'),H('#4a5a28')),
      bottom=dict(type='skirt',fill=plaid,base=H('#a08058'),skirt_end=46,flare=3,legL=3,skin_y0=44,sock=H('#f4ecd8'),sock_y0=46,sock_hi=H('#cfc8b8')),
      shoe=H('#5a3420'),shoe_hi=H('#8a5a38'),
      sleeve=dict(long=True,base=bur['base'],hi=bur['hi'],lo=bur['lo'],cuff=H('#f4ecd8')),
      top=bur,torso_hem=31,torso_len=0,detail=det,
      iris=H('#4a6aa8'),eyes='normal',mouth='mid',freckles='auto',no_blush=True)
def C():
    sk=H('#f0d0b0'); sks=H('#d8a888')
    lil=dict(base=H('#b8a8e8'),hi=H('#d0c4f4'),lo=H('#8a7cc0'))
    pk=dict(base=H('#f4a8c8'),hi=H('#f8c8dc'),lo=H('#d878a0'))
    def det(cv,tw,hem):
        Wt=H('#f4f0ec')
        for y in range(19,24):
            for x in range(CX-1,CX+2): cv.px(x,y,Wt)
        cv.px(CX-2,19,Wt);cv.px(CX+2,19,Wt)
        cv.px(CX,20,H('#f080b0'));cv.px(CX-1,21,H('#f080b0'));cv.px(CX+1,21,H('#f080b0'))
        for y in (24,26,28): cv.px(CX-2,y,Wt);cv.px(CX+2,y,Wt)
    def pleat(x,y):
        return pk['lo'] if (x-CX)%3==0 else (pk['hi'] if y<33 else pk['base'])
    return dict(body='slim',skin=sk,skin_s=sks,blush=H('#eba098'),lip=H('#d8707c'),
      hair=H('#2a2430'),hair_hi=H('#4c4a70'),hs='long',hp=(H('#f080b0'),H('#c85088')),clip=H('#f8d0e0'),
      bottom=dict(type='skirt',fill=pleat,base=pk['base'],skirt_end=37,flare=2,legL=3,skin_y0=36,sock=H('#f4f0ec'),sock_y0=41,sock_hi=H('#d8a8c8')),
      shoe=H('#3a2c3a'),shoe_hi=H('#6a5a6a'),
      sleeve=dict(long=True,base=lil['base'],hi=lil['hi'],lo=lil['lo'],cuff=H('#f4f0ec')),
      top=lil,torso_hem=29,torso_len=0,detail=det,
      iris=H('#2a2430'),eyes='closed',mouth='small')
