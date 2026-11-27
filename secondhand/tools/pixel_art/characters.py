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
# 林：使用者手繪稿逐格（x, y, 顏色；None 為清除）。第一輪由手繪筆觸換算，第二輪為使用者在像素圖上直接修改。
LIN_OVERLAY=[
  (17,6,(38, 20, 28)), (18,6,(38, 20, 28)), (16,7,(38, 20, 28)), (17,7,(38, 20, 28)), (18,7,(38, 20, 28)), (22,7,(38, 20, 28)),
  (16,8,(38, 20, 28)), (17,8,(240, 208, 176)), (21,8,(38, 20, 28)), (22,8,(38, 20, 28)), (10,9,(0, 0, 0)), (11,9,(0, 0, 0)),
  (13,9,(240, 208, 176)), (15,9,(0, 0, 0)), (16,9,(0, 0, 0)), (17,9,(240, 208, 176)), (20,9,(200, 204, 212)), (21,9,(38, 20, 28)),
  (22,9,(58, 36, 24)), (23,9,(58, 36, 24)), (19,10,(38, 20, 28)), (20,10,(200, 204, 212)), (21,10,(38, 20, 28)), (22,10,(58, 36, 24)),
  (23,10,None), (19,11,(200, 204, 212)), (20,11,(200, 204, 212)), (21,11,(200, 204, 212)), (22,11,None), (23,11,None),
  (19,12,(38, 20, 28)), (20,12,(200, 204, 212)), (21,12,None), (22,12,None), (14,13,(240, 208, 176)), (18,13,(38, 20, 28)),
  (19,13,(38, 20, 28)), (20,13,(38, 20, 28)), (21,13,None), (17,14,(38, 20, 28)), (18,14,(38, 20, 28)), (19,14,(38, 20, 28)),
  (20,14,(58, 36, 24)), (17,15,None), (18,15,(38, 20, 28)), (19,15,(38, 20, 28)), (20,15,None), (9,18,(42, 28, 28)),
  (10,18,(172, 120, 98)), (11,18,(240, 208, 176)), (15,18,(240, 208, 176)), (16,18,(42, 28, 28)), (17,18,(172, 120, 98)), (8,19,(42, 28, 28)),
  (9,19,(42, 28, 28)), (10,19,(42, 28, 28)), (11,19,(42, 28, 28)), (12,19,(240, 208, 176)), (13,19,(240, 208, 176)), (14,19,(240, 208, 176)),
  (15,19,(240, 208, 176)), (16,19,(42, 28, 28)), (17,19,(240, 208, 176)), (18,19,(172, 120, 98)), (10,20,(42, 28, 28)), (11,20,(42, 28, 28)),
  (12,20,(42, 28, 28)), (13,20,(42, 28, 28)), (14,20,(42, 28, 28)), (15,20,(42, 28, 28)), (16,20,(42, 28, 28)), (17,20,(240, 208, 176)),
  (18,20,(240, 208, 176)), (19,20,(172, 120, 98)), (12,21,(220, 222, 224)), (13,21,(220, 222, 224)), (14,21,(42, 28, 28)), (15,21,(42, 28, 28)),
  (16,21,(42, 28, 28)), (17,21,(42, 28, 28)), (18,21,(42, 28, 28)), (19,21,(42, 28, 28)), (14,22,(220, 222, 224)), (15,23,(138, 90, 56)),
  (16,23,(138, 90, 56)), (14,24,(220, 222, 224)), (15,24,(138, 90, 56)), (16,29,(174, 178, 184)), (15,30,(42, 28, 28)), (16,30,(42, 28, 28)),
  (10,31,(174, 178, 184)), (11,31,(174, 178, 184)), (12,31,(42, 28, 28)), (13,31,(42, 28, 28)), (14,31,(42, 28, 28)), (15,31,(58, 50, 38)),
  (16,31,(58, 50, 38)), (17,31,(58, 50, 38)), (10,32,(58, 50, 38)), (11,32,(58, 50, 38)), (12,32,(58, 50, 38)), (13,32,(58, 50, 38)),
  (14,32,(58, 50, 38)), (15,32,(58, 50, 38)), (16,32,(58, 50, 38)), (11,33,(58, 50, 38)),
]
def D():
    """林（作者彩蛋）：纖瘦、齊瀏海、斜肩灰白上衣、迷彩喇叭工作褲、黑平底鞋。
    色碼皆為【佔位色】。"""
    sk=H('#f0d0b0'); sks=H('#d8a888')
    gy=dict(base=H('#dcdee0'),hi=H('#f0f1f2'),lo=H('#aeb2b8'))
    blk=H('#2a2a30'); silver=H('#c8ccd4')
    cam=[H('#4a4030'),H('#3a3226'),H('#5a5238'),H('#2c261e')]
    def camo(x,y):
        v=(x*7+y*13+(x*y)%5)%11
        return cam[0] if v<4 else (cam[1] if v<7 else (cam[2] if v<9 else cam[3]))
    def det(cv,tw,hem):
        for y in (19,20,21):                                   # 右肩露出（畫面右側），左側維持衣服色
            for x in range(CX+2+(y-19),CX+tw+1): cv.px(x,y,sk)
        for y in (19,20,21,22): cv.px(CX+2,y,blk) if False else None
        for y in (19,20): cv.px(CX+tw-1,y,blk);cv.px(CX+tw,y,blk)  # 黑色蕾絲細肩帶（兩格寬）
        for i,x in enumerate(range(CX-3,CX+2)): cv.px(x,19+i//2+1,blk)  # 斜領黑滾邊
        for x in range(CX-tw,CX+tw+1): cv.px(x,hem,gy['lo'])  # 下擺陰影
        cv.px(CX+1,24,H('#8a5a38'))                          # 胸前小徽章
        for y in (21,22,23): cv.px(CX-2,y,blk) if False else None
        for y in (12,13,14): cv.px(CX-5,y,silver)             # 垂墜耳環
    def pockets(cv):
        for sd in (-1,1):
            for y in (36,37,38):
                for x in (CX+sd*4,CX+sd*5): cv.px(x,y,cam[2])
        for y in range(30,32): pass
    return dict(body='slim',skin=sk,skin_s=sks,blush=H('#eba098'),lip=H('#d8707c'),
      hair=H('#3a2418'),hair_hi=H('#5a4030'),hs='lpony',tail_end=11,fringe='jag',hp=None,
      bottom=dict(type='pants',base=cam[0],hi=cam[2],lo=cam[3],legfill=camo,flare=True,detail=pockets),
      shoe=blk,shoe_hi=H('#52525c'),
      sleeve=dict(long=False,base=gy['base'],hi=gy['hi'],lo=gy['lo'],cuff=gy['lo']),
      top=gy,torso_hem=30,torso_len=0,detail=det,
      iris=H('#2a1c1c'),eyes='big',mouth='mid',overlay=LIN_OVERLAY)
