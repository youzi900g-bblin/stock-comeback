from PIL import Image, ImageDraw
def H(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))
def dk(c,f=0.6): return (min(255,int(c[0]*f)+4),min(255,int(c[1]*f*0.95)),min(255,int(c[2]*f)+14))
BG=H('#a89078'); WHITE=H('#fcfcfc')
W,HH,CX=27,53,13
def mask_poly(kind,*a):
    im=Image.new("1",(W,HH),0); d=ImageDraw.Draw(im)
    if kind=='rect': d.rectangle(a[0],fill=1)
    elif kind=='ell': d.ellipse(a[0],fill=1)
    elif kind=='poly': d.polygon(a[0],fill=1)
    return {(x,y) for y in range(HH) for x in range(W) if im.getpixel((x,y))}
def rows_mask(spec):  # {y:(x0,x1)}
    return {(x,y) for y,(a,b) in spec.items() for x in range(a,b+1)}
class Cv:
    def __init__(s): s.c=[[None]*W for _ in range(HH)]; s.L=None; s.log={}   # L：目前的圖層名；log：各圖層寫過的格子（供分層輸出）
    def _w(s,x,y,col):
        s.c[y][x]=col
        if s.L is not None: s.log.setdefault(s.L,{})[(x,y)]=col
    def paint(s,mask,fill,base=None,outline=True,warm=False):
        if not mask: return
        if outline:
            b=base if base else (fill if not callable(fill) else fill(*next(iter(mask))))
            oc=(int(b[0]*.72),int(b[1]*.58),int(b[2]*.56)) if warm else dk(b)
            for (x,y) in mask:
                for dx,dy in((1,0),(-1,0),(0,1),(0,-1)):
                    nx,ny=x+dx,y+dy
                    if 0<=nx<W and 0<=ny<HH and (nx,ny) not in mask: s._w(nx,ny,oc)
        for (x,y) in mask: s._w(x,y,fill(x,y) if callable(fill) else fill)
    def px(s,x,y,col):
        if 0<=x<W and 0<=y<HH: s._w(x,y,col)
BODY={'slim':dict(tw=3,nw=1,L=4,arm=3),'medium':dict(tw=4,nw=1,L=4,arm=3),'chubby':dict(tw=5,nw=2,L=5,arm=4)}
def diag(base,hi,lo,y0,k=0.6):
    def f(x,y):
        v=(x-CX)-(y-y0)*k
        return hi if v>1 else (lo if v<-3 else base)
    return f
def face_colors(P):
    sk=P['skin']; fc=P.get('freckles')
    if fc=='auto':
        lum=0.3*sk[0]+0.59*sk[1]+0.11*sk[2]
        w=max(0.0,min(1.0,(lum-110)/(190-110)))   # 0=深膚色 1=淺膚色
        pink=(190,100,104); dark=(110,56,34)
        br=tuple(dark[k]*(1-w)+pink[k]*w for k in range(3))
        t=0.26-0.02*w
        fc=tuple(int(sk[k]*(1-t)+br[k]*t) for k in range(3))
    return dict(brow=P.get('brow',P['hair']),white=WHITE,iris=P['iris'],blush=P['blush'],nose=P.get('nose',P['skin_s']),freckle=fc,lip=P['lip'])
def face_cells(P):
    """五官的格子清單 [(x,y,色名)]，依繪製順序（後面蓋前面）。"""
    out=[]; ey=P['eyes']
    for sd in (-1,1):
        o=CX+sd*3; i2=CX+sd*2
        wc,dc=(o,i2) if sd==-1 else (i2,o)
        if ey=='closed': out+=[(o,10,'brow'),(i2,10,'brow')]
        else:
            out+=[(wc,9,'brow'),(dc,9,'brow'),(wc,10,'white'),(dc,10,'iris')]
            if ey=='big': out+=[(wc,11,'white'),(dc,11,'iris')]
        if not P.get('no_blush'): out+=[(CX+sd*3,12,'blush'),(CX+sd*4,12,'blush')]
    out.append((CX,12,'nose'))
    if P.get('freckles'):
        dy=1 if ey=='big' else 0   # 大眼多一排，雀斑整體下移一格避免蓋到眼睛
        out+=[(x,y+dy,'freckle') for (x,y) in [(CX-3,11),(CX-1,11),(CX-2,12),(CX+3,11),(CX+1,11),(CX+2,12)]]
    m=P['mouth']
    if m=='small': out.append((CX,13,'lip'))
    elif m=='mid': out+=[(CX,13,'lip'),(CX+1,13,'lip')]
    elif m=='wide': out+=[(CX-1,13,'lip'),(CX,13,'lip'),(CX+1,13,'lip')]
    return out
def headwear(cv,hw):
    k,b,hi,lo=hw['kind'],hw['base'],hw['hi'],hw['lo']
    if k=='beret':
        cv.paint(mask_poly('ell',[CX-7,0,CX+6,5]),diag(b,hi,b,0,0.2),base=b); cv.px(CX-1,0,lo)
    elif k=='bow':
        for (dx,dy) in [(-2,-1),(-2,0),(-2,1),(-1,0),(1,0),(2,-1),(2,0),(2,1)]: cv.px(CX+4+dx,4+dy,b)
        cv.px(CX+4,4,lo)
    elif k=='cap':  # 網帽（3/4 側視、歪戴）：白色帽片偏右並帶黃星，左側露出紅色側片，簷偏右凸出
        m={(x,y) for (x,y) in mask_poly('ell',[CX-6,0,CX+6,10]) if y<=5}
        cv.paint(m,diag(b,hi,lo,0,0.3),base=b)
        wb,wh,wl=H('#f4f1ea'),H('#fcfcfc'),H('#cfcac2')
        seam=lambda y: CX-2-(y-1)//2          # 接縫往左下斜，帽子看起來歪向一邊
        panel={(x,y) for (x,y) in m if y>=1 and seam(y)<x<=CX+5}
        cv.paint(panel,diag(wb,wh,wl,0,0.3),base=wb,outline=False)
        for (x,y) in m:
            if y>=1 and x==seam(y): cv.px(x,y,lo)
        cv.px(CX-2,0,lo)
        for dy,row in enumerate(('.X.','XXX','X.X')):   # 3×3 的小星星
            for dx,ch in enumerate(row):
                if ch=='X': cv.px(CX+2+dx,2+dy,H('#f8d838'))
        cv.paint(rows_mask({6:(CX-6,CX+6)}),lo,base=lo)
        brim=rows_mask({6:(CX+2,CX+10),7:(CX+3,CX+10),8:(CX+5,CX+9)})
        cv.paint(brim,lambda x,y: hi if y==6 and x>CX+6 else lo,base=lo)
    elif k=='star':
        for (dx,dy) in [(0,0),(-1,1),(0,1),(1,1),(0,2)]: cv.px(CX+4+dx,3+dy,b)
        cv.px(CX+4,4,hi)
def fringe_new(kind,fw,hh,sd):
    """新版劉海：由 3 到 4 束大髮束組成，底緣高低錯開、保留一點額頭，加 3 格亮線與一根散落髮絲。
    回傳 (髮束格子, 亮色格子, 髮束間的暗線格子)。"""
    rows={}; hi=[]; seam=[]
    if kind=='part':      # 中分：左右各一束，由中線往外下垂成倒 V
        L={7:(CX-5,CX-1),8:(CX-5,CX-2),9:(CX-5,CX-3),10:(CX-5,CX-4)}
        R={7:(CX+1,CX+5),8:(CX+2,CX+5),9:(CX+3,CX+5),10:(CX+4,CX+5)}
        rows={y:[L[y],R[y]] for y in L}
        hi=[(CX-4,7),(CX-3,7),(CX-2,7),(CX+3,8),(CX+4,8),(CX+4,9)]; seam=[(CX-1,8),(CX+2,9)]
    elif kind=='airy':    # 空氣劉海：三束薄髮束，尖端長短不一，中間露出額頭
        rows={7:[(CX-5,CX-2),(CX-1,CX+1),(CX+2,CX+5)],8:[(CX-5,CX-4),(CX,CX),(CX+4,CX+5)]}
        hi=[(CX-4,7),(CX-3,7),(CX-2,7),(CX+3,7)]; seam=[(CX-2,8)]
    elif kind=='sweep':   # 斜劉海：三束大髮束由右上往左下掃，最長的一束落在左側
        rows={7:[(CX-5,CX+4)],8:[(CX-5,CX+1)],9:[(CX-5,CX-3)],10:[(CX-5,CX-4)]}
        hi=[(CX-1,7),(CX,7),(CX+1,7),(CX-3,8),(CX-2,8)]; seam=[(CX+2,7),(CX-1,8),(CX-3,9)]
    elif kind=='sweepR':  # 斜劉海（朝右）：與 sweep 左右相反
        rows={7:[(CX-4,CX+5)],8:[(CX-1,CX+5)],9:[(CX+3,CX+5)],10:[(CX+4,CX+5)]}
        hi=[(CX-1,7),(CX,7),(CX+1,7),(CX+2,8),(CX+3,8)]; seam=[(CX-2,7),(CX+1,8),(CX+3,9)]
    elif kind=='sidepart':  # 偏分：左邊短束、右邊一束大髮束斜垂
        rows={7:[(CX-5,CX-2),(CX-1,CX+5)],8:[(CX-5,CX-4),(CX+1,CX+5)],9:[(CX+3,CX+5)]}
        hi=[(CX+1,7),(CX+2,7),(CX+3,7),(CX-4,7)]; seam=[(CX-2,8),(CX+1,8)]
    elif kind=='curtain':   # 窗簾劉海：中間分開得較寬，兩束往外微彎
        rows={7:[(CX-5,CX-2),(CX+2,CX+5)],8:[(CX-5,CX-3),(CX+3,CX+5)],9:[(CX-5,CX-4),(CX+4,CX+5)]}
        hi=[(CX-4,7),(CX-3,7),(CX+3,8),(CX+4,8)]; seam=[(CX-2,7),(CX+2,7)]
    elif kind=='jag':       # 鋸齒齊劉海：整排髮束，底緣高低不齊
        rows={7:[(CX-5,CX+5)],8:[(CX-4,CX-3),(CX,CX),(CX+3,CX+4)]}
        hi=[(CX-3,7),(CX-2,7),(CX-1,7),(CX+3,7)]; seam=[(CX-2,8),(CX+1,8)]
    elif kind=='mshape':    # 露額：髮際線中間高、兩側低（M 形）
        rows={6:[(CX-5,CX-3),(CX+3,CX+5)],7:[(CX-5,CX-4),(CX+4,CX+5)]}
        hi=[(CX-4,6),(CX+4,6)]; seam=[]
    elif kind=='buzzline':  # 平頭：髮際線兩側往下一格，中間平整
        rows={6:[(CX-5,CX-4),(CX+4,CX+5)],7:[(CX-5,CX-5),(CX+5,CX+5)]}
        hi=[]; seam=[]
    cells={(x,y) for y,segs in rows.items() for (a,b) in segs for x in range(a,b+1)}
    return cells,hi,seam
def draw_shoes(cv,P,x0,x1):
    """鞋子：canvas（低筒，原本的畫法）、sneaker（含腳踝）、boot（短靴，蓋住小腿下段）、sandal（只有鞋底與兩條帶子）。"""
    st=P.get('shoe_style','canvas'); sh=P['shoe']; hi=P['shoe_hi']
    if st=='canvas':
        cv.paint(rows_mask({y:(x0-1,x1+1) for y in range(49,52)}),sh,base=sh)
        for x in range(x0-1,x1+2): cv.px(x,50,hi)
    elif st=='sneaker':
        cv.paint(rows_mask({48:(x0,x1),49:(x0-1,x1+1),50:(x0-1,x1+1),51:(x0-1,x1+1)}),sh,base=sh)
        for x in range(x0-1,x1+2): cv.px(x,51,hi)
        cv.px(x1,49,hi)
    elif st=='boot':
        cv.paint(rows_mask({y:(x0-1,x1+1) for y in range(44,52)}),sh,base=sh)
        for x in range(x0-1,x1+2): cv.px(x,44,hi); cv.px(x,51,hi)
    elif st=='sandal':
        cv.paint(rows_mask({50:(x0-1,x1+1),51:(x0-1,x1+1)}),sh,base=sh)
        for x in range(x0-1,x1+2): cv.px(x,51,hi)
        cv.px(x0,49,sh); cv.px(x1,49,sh)
def build(P,want_log=False):
    cv=Cv(); b=BODY[P['body']]; tw,nw,L,aw=b['tw'],b['nw'],b['L'],b['arm']
    sk,sks,blush,lip=P['skin'],P['skin_s'],P['blush'],P['lip']
    fw=5 if P.get('round') else 4
    hair=P['hair']; hh=P['hair_hi']
    # --- back hair
    cv.L='hair_back'
    if P['hs']=='puffs':
        cv.paint(mask_poly('ell',[CX-10,2,CX-2,10]),hair,outline=True)
        cv.paint(mask_poly('ell',[CX+2,2,CX+10,10]),hair)
        cv.paint(mask_poly('ell',[CX-6,2,CX+6,12]),hair)
        cv.paint(mask_poly('poly',[(CX-6,17),(CX+6,17),(CX+7,18),(CX-7,18)]),P['hood']) if False else None
    elif P['hs']=='bob':
        sp={}
        for y in range(5,18): sp[y]=(CX-7,CX+7) if y<15 else (CX-6,CX+6)
        cv.paint(rows_mask(sp),hair)
    elif P['hs']=='short':
        cv.paint(rows_mask({y:(CX-6,CX+6) for y in range(4,12)}),hair)
    elif P['hs']=='twin':
        cv.paint(rows_mask({y:(CX-6,CX+6) for y in range(4,12)}),hair)
        cv.paint(mask_poly('ell',[CX-11,8,CX-7,24]),hair)
        cv.paint(mask_poly('ell',[CX+7,8,CX+11,24]),hair)
    elif P['hs']=='hpony':   # 高馬尾：馬尾從頭頂偏右垂下
        cv.paint(rows_mask({y:(CX-6,CX+6) for y in range(4,12)}),hair)
        cv.paint(mask_poly('ell',[CX+5,1,CX+10,18]),hair)
    elif P['hs']=='lpony':   # 低馬尾：馬尾落在右肩
        cv.paint(rows_mask({y:(CX-6,CX+6) for y in range(4,12)}),hair)
        cv.paint(mask_poly('ell',[CX+5,11,CX+9,29]),hair)
    elif P['hs']=='braids':  # 麻花辮：後髮只有頭部，辮子畫在前層
        cv.paint(rows_mask({y:(CX-6,CX+6) for y in range(4,16)}),hair)
    elif P['hs']=='buzz':    # 平頭：幾乎不露後髮
        cv.paint(rows_mask({y:(CX-5,CX+5) for y in range(3,8)}),hair)
    elif P['hs']=='long':
        sp={}
        wv=lambda y: ((0,1,2,1)[(y//2)%4] if P.get('wave') and y>=12 else 0)   # 波浪：下半段每 8 格一個起伏，最寬多 2 格
        for y in range(5,30): sp[y]=(CX-7-wv(y),CX+7+wv(y)) if y<16 else ((CX-6-wv(y),CX+6+wv(y)) if y<27 else (CX-5-wv(y),CX+5+wv(y)))
        cv.paint(rows_mask(sp),hair)
    # --- 包包（身後的部分）：在褲子、裙子與手臂之下，所以腰部以下由褲子直接接上衣服
    cv.L='bag_back'
    bg=P.get('bag')
    if bg and bg['kind']=='pack':   # 後背包的背面：圓頂從肩膀後方探出，頂部加一個提把
        cv.paint(rows_mask({16:(CX-2,CX+2),17:(CX-4,CX+4),**{y:(CX-5,CX+5) for y in range(18,30)},30:(CX-4,CX+4),31:(CX-4,CX+4)}),bg['base'],base=bg['base'])
        for x in range(CX-3,CX): cv.px(x,17,bg['hi'])
        for x in range(CX-1,CX+2): cv.px(x,15,bg['lo'])
    # --- legs/bottom/shoes
    ytop=30
    legL=lambda: (CX-1-L,CX-2); legR=lambda:(CX+2,CX+1+L)
    bt=P['bottom']
    hemy=ytop+ (P['torso_len'])  # not used
    if bt['type']=='pants':
        cv.L='pants'
        for side in (0,1):
            x0,x1=legL() if side==0 else legR()
            sp={y:((x0-(1 if y>=45 else 0)),(x1+(1 if y>=45 else 0))) if True else None for y in range(30,49)}
            if bt.get('flare'):   # 喇叭褲：大腿貼腿、膝蓋最窄（外側內收 1 格），膝下逐步變寬，褲口最寬（外 2 格、內 1 格）
                def prof(y):   # (外側外擴格數, 內側內擴格數)，負值為內收
                    if y<35: return (0,0)
                    if y<41: return (-1,0)
                    if y<43: return (0,0)
                    if y<45: return (1,0)
                    if y<47: return (1,1)
                    return (2,1)
                sp={}
                for y in range(30,49):
                    o,i=prof(y)
                    sp[y]=(x0-o,x1+i) if side==0 else (x0-i,x1+o)
            else:
                ext=lambda y: 1 if y>=45 else 0
                sp={y:(x0-(ext(y) if side==0 else 0),x1+(ext(y) if side==1 else 0)) for y in range(30,49)}
            cv.paint(rows_mask(sp),diag(bt['base'],bt['hi'],bt['lo'],30,0.4),base=bt['base'])
        # waist band
        cv.paint(rows_mask({30:(CX-1-L,CX+1+L),31:(CX-1-L,CX+1+L)}),bt['lo'],base=bt['lo'])
        if bt.get('detail'): bt['detail'](cv)
        # shoes
        cv.L='shoes'
        for side in (0,1):
            x0,x1=legL() if side==0 else legR()
            draw_shoes(cv,P,x0,x1)
    else:
        LL=bt['legL']
        for side in (0,1):
            x0=CX-1-LL if side==0 else CX+2
            x1=CX-2 if side==0 else CX+1+LL
            cv.L='legs'
            cv.paint(rows_mask({y:(x0,x1) for y in range(bt['skin_y0'],49)}),sk,base=sk,warm=True)
            cv.L='socks'
            so=P.get('socks')
            if so:   # 玩家用的襪子（只在穿裙子時看得到）：short 到腳踝、long 到膝下、stripe 為長襪加橫條
                y0={'short':46,'long':40,'stripe':40}[so['kind']]
                fl=(lambda x,y: so['lo'] if (y%2==0) else so['base']) if so['kind']=='stripe' else so['base']
                cv.paint(rows_mask({y:(x0,x1) for y in range(y0,49)}),fl,base=so['base'])
                for x in range(x0,x1+1): cv.px(x,y0,so['lo'])
            if bt.get('sock'):
                cv.paint(rows_mask({y:(x0,x1) for y in range(bt['sock_y0'],49)}),bt['sock'],base=bt['sock'],outline=True)
                for x in range(x0,x1+1): cv.px(x,bt['sock_y0'],bt['sock_hi'])
            cv.L='shoes'
            draw_shoes(cv,P,x0,x1)
        cv.L='skirt'
        sp={}
        top,bot=30,bt['skirt_end']
        for y in range(top,bot+1):
            t=(y-top)/(bot-top)
            half=tw+int(round(t*bt['flare']))
            sp[y]=(CX-half,CX+half)
        cv.paint(rows_mask(sp),bt['fill'],base=bt['base'])
        if bt.get('detail'): bt['detail'](cv)
    # --- hood (behind neck)
    cv.L='hood'
    if P.get('hood'):
        cv.paint(mask_poly('ell',[CX-nw-4,15,CX+nw+4,21]),P['hood'])
    # --- sleeves / arms / hands
    cv.L='arms'
    for side in (-1,1):
        for y in range(20,32):
            pass
    def arm_cells(side,y0,y1):
        sp=set()
        for y in range(y0,y1+1):
            xc=CX+side*(tw+1+int((y-20)*0.2))
            x0=xc-aw//2; x1=x0+aw-1
            for x in range(x0,x1+1): sp.add((x,y))
        return sp
    sl=P['sleeve']
    for side in (-1,1):
        cv.paint(arm_cells(side,20,31),sk,base=sk,warm=True)   # bare arm
        sleeve_end=31 if sl['long'] else 24
        cv.paint(arm_cells(side,20,sleeve_end),sl.get('fill') or diag(sl['base'],sl['hi'],sl['lo'],20),base=sl['base'])
        if sl.get('cuff'):
            cv.paint(arm_cells(side,sleeve_end-1,sleeve_end),sl['cuff'],base=sl['cuff'])
        hy=arm_cells(side,32,34)
        cv.paint(hy,sk,base=sk,warm=True)
    jk=P.get('jacket')
    if jk:
        cv.L='jarms'
        for side in (-1,1):
            cv.paint(arm_cells(side,20,31),diag(jk['base'],jk['hi'],jk['lo'],20),base=jk['base'])
            cv.paint(arm_cells(side,30,31),jk['lo'],base=jk['lo'])
    cv.L='bracelet'
    if P.get('jewel',{}).get('bracelet'):
        for side in (-1,1):
            for (x,y) in arm_cells(side,31,31): cv.px(x,y,H('#e0b040'))
    # --- torso
    cv.L='torso'
    tb=P['top']; hem=P['torso_hem']
    cv.paint(rows_mask({y:(CX-tw,CX+tw) for y in range(19,hem+1)}),tb.get('fill') or diag(tb['base'],tb['hi'],tb['lo'],19),base=tb['base'])
    if 'detail' in P: P['detail'](cv,tw,hem)
    if jk:
        cv.L='jacket'
        kd=jk['kind']; h2=30+{'cardigan':3,'denim':1,'sport':2}[kd]
        if kd=='cardigan':   # 開襟：中間 3 格露出裡面的上衣
            cv.paint(rows_mask({y:(CX-tw,CX-2) for y in range(19,h2+1)}),diag(jk['base'],jk['hi'],jk['lo'],19),base=jk['base'])
            cv.paint(rows_mask({y:(CX+2,CX+tw) for y in range(19,h2+1)}),diag(jk['base'],jk['hi'],jk['lo'],19),base=jk['base'])
            for y in (22,25,28): cv.px(CX-2,y,jk['lo'])
        else:
            cv.paint(rows_mask({y:(CX-tw,CX+tw) for y in range(19,h2+1)}),diag(jk['base'],jk['hi'],jk['lo'],19),base=jk['base'])
            for y in range(19,h2+1): cv.px(CX,y,jk['lo'])
            for x in range(CX-3,CX+4): cv.px(x,19,jk['hi'])
            if kd=='denim':
                for y in (22,25,28): cv.px(CX,y,jk['hi'])
                for sd in (-1,1): cv.px(CX+sd*3,26,jk['lo']); cv.px(CX+sd*3,27,jk['lo'])
            else:
                for x in range(CX-tw,CX+tw+1): cv.px(x,h2,jk['lo'])
    cv.L='bag_front'
    if bg:
        k=bg['kind']
        if k=='cross':    # 斜背包：兩格寬的背帶由左肩斜到右髖，包身有包蓋、扣子與亮邊
            for i in range(11):
                x=CX-4+(i*7)//10
                cv.px(x,19+i,bg['lo']); cv.px(x+1,19+i,bg['lo'])
            cv.paint(rows_mask({y:(CX+3,CX+8) for y in range(29,35)}),bg['base'],base=bg['base'])
            for x in range(CX+3,CX+9): cv.px(x,29,bg['hi']); cv.px(x,30,bg['lo'])      # 包蓋
            cv.px(CX+5,31,bg['hi']); cv.px(CX+6,31,bg['hi'])                               # 扣子
        elif k=='tote':   # 托特包：提把掛在右手，方形大包身，上緣一道亮帶
            for x in range(CX+7,CX+11): cv.px(x,31,bg['lo'])
            for y in (32,33): cv.px(CX+7,y,bg['lo']); cv.px(CX+10,y,bg['lo'])
            cv.paint(rows_mask({y:(CX+5,CX+11) for y in range(34,42)}),bg['base'],base=bg['base'])
            for x in range(CX+5,CX+12): cv.px(x,34,bg['hi'])
            for x in range(CX+5,CX+12): cv.px(x,41,bg['lo'])
        elif k=='pack':   # 後背包的肩帶：從肩頭越過手臂與身體的交界，沿身側下垂（上寬下窄），在腋下轉向身後
            for sd in (-1,1):   # 肩帶蓋住身體與手臂的交界，整條實心（不露出衣服色）
                for y in range(19,21):
                    for dx in (3,4,5): cv.px(CX+sd*dx,y,bg['lo'])
                for y in range(21,28):
                    for dx in (4,5): cv.px(CX+sd*dx,y,bg['lo'])
                for dx in (4,5,6): cv.px(CX+sd*dx,28,bg['lo'])
                cv.px(CX+sd*4,24,bg['hi']); cv.px(CX+sd*5,24,bg['hi'])
    # --- neck
    cv.L='neck'
    sp={y:(CX-nw,CX+nw) for y in range(15,19)}
    cv.paint(rows_mask(sp),lambda x,y: sks if y<=16 else sk,base=sk,warm=True)
    cv.L='necklace'
    if P.get('jewel',{}).get('necklace'):
        for (x,y) in [(CX-2,18),(CX-1,19),(CX,20),(CX+1,19),(CX+2,18)]: cv.px(x,y,H('#e0b040'))
        cv.px(CX,21,H('#f080b0'))
    # --- face
    cv.L='face'
    fsp={}
    for y in range(5,14): fsp[y]=(CX-fw,CX+fw)
    fsp[13]=(CX-fw+1,CX+fw-1); fsp[14]=(CX-fw+2,CX+fw-2); fsp[15]=(CX-max(1,fw-3),CX+max(1,fw-3))
    cv.paint(rows_mask(fsp),lambda x,y: sks if (x==CX+fw and 8<=y<=13) or y==15 else sk,base=sk,warm=True)
    # --- front hair
    cv.L='hair_front'
    if P['hs']=='puffs':
        m=mask_poly('ell',[CX-6,1,CX+6,13]); m={(x,y) for (x,y) in m if y<=5}
        m|={(CX-fw-2,y) for y in range(6,10)}|{(CX+fw+2,y) for y in range(6,10)}
        if P.get('fringe'): m|=fringe_new(P['fringe'],fw,hh,None)[0]
        cv.paint(m,hair)
        for (x,y) in [(CX-9,4),(CX-7,6),(CX-8,8),(CX+8,4),(CX+7,7),(CX+9,6),(CX-2,3),(CX+3,3),(CX,2)]: cv.px(x,y,hh)
        if P.get('hp'):  # 頭飾可省略（hp=None 表示只有髮型）
            for (ax,col) in ((CX-9,P['hp'][0]),(CX+8,P['hp'][1])):
                for x in (ax,ax+1):
                    cv.px(x,9,col);cv.px(x,10,dk(col,0.8))
            s=P['hp'][2]
            for (dx,dy) in [(0,0),(-1,1),(0,1),(1,1),(0,2)]: cv.px(CX+4+dx,3+dy,s)
    elif P['hs']=='bob':
        m=mask_poly('ell',[CX-6,1,CX+6,12]); m={(x,y) for (x,y) in m if y<=6}
        if P.get('fringe'):
            fc,fh,fs=fringe_new(P['fringe'],fw,hh,None); m|=fc
            m|={(CX+fw+2,y) for y in range(7,14)}|{(CX-fw-2,y) for y in range(7,14)}
            cv.paint(m,hair)
            for (x,y) in fs: cv.px(x,y,dk(hair))
            for (x,y) in fh+[(CX-2,4),(CX+3,3)]: cv.px(x,y,hh)
        else:
            for y,(a,b2) in {7:(CX-fw,CX),8:(CX-fw,CX-2),9:(CX-fw,CX-3)}.items(): m|={(x,y) for x in range(a,b2+1)}
            m|={(CX+fw+2,y) for y in range(7,14)}|{(CX-fw-2,y) for y in range(7,14)}
            cv.paint(m,hair)
            for (x,y) in [(CX-3,7),(CX-1,6),(CX+2,5),(CX-5,9),(CX+5,9)]: cv.px(x,y,hh)
        if P.get('hp'):
            cv.paint(mask_poly('ell',[CX-7,0,CX+6,5]),diag(P['hp'][0],P['hp'][1],P['hp'][0],0,0.2),base=P['hp'][0])
            cv.px(CX-1,-1+1,P['hp'][2])
    elif P['hs']=='buzz':
        m=mask_poly('ell',[CX-6,1,CX+6,12]); m={(x,y) for (x,y) in m if y<=5}
        m|={(CX+fw+1,y) for y in range(6,9)}|{(CX-fw-1,y) for y in range(6,9)}
        if P.get('fringe'): m|=fringe_new(P['fringe'],fw,hh,None)[0]
        cv.paint(m,hair)
        for (x,y) in [(CX-3,3),(CX+1,2),(CX+4,4),(CX-5,5)]: cv.px(x,y,hh)
    elif P['hs'] in ('short','twin','hpony','lpony','braids'):
        m=mask_poly('ell',[CX-6,1,CX+6,12]); m={(x,y) for (x,y) in m if y<=6}
        if P.get('fringe'):
            fc,fh,fs=fringe_new(P['fringe'],fw,hh,None); m|=fc
            m|={(CX+fw+2,y) for y in range(7,11)}|{(CX-fw-2,y) for y in range(7,11)}
            cv.paint(m,hair)
            for (x,y) in fs: cv.px(x,y,dk(hair))
            for (x,y) in fh+[(CX+2,4)]: cv.px(x,y,hh)
        else:
            for y,(a,b2) in {7:(CX-fw,CX+1),8:(CX-fw,CX-1),9:(CX-fw,CX-3)}.items(): m|={(x,y) for x in range(a,b2+1)}
            m|={(CX+fw+2,y) for y in range(7,11)}|{(CX-fw-2,y) for y in range(7,11)}
            cv.paint(m,hair)
            for (x,y) in [(CX-3,7),(CX-1,6),(CX+2,5),(CX-5,8),(CX+5,8)]: cv.px(x,y,hh)
        if P['hs']=='twin':
            for sd in (-1,1):
                for dy in (0,1): cv.px(CX+sd*(fw+3),8+dy,hh)
        if P['hs']=='braids':   # 兩條麻花辮垂在肩前，左右各一，每 2 格錯開 1 格
            for sd in (-1,1):
                cv.paint(rows_mask({y:(CX+sd*6+(sd if (y//2)%2 else 0)-1,CX+sd*6+(sd if (y//2)%2 else 0)+1) for y in range(17,31)}),hair)
                for y in range(18,31,4): cv.px(CX+sd*6+(sd if (y//2)%2 else 0),y,hh)
    elif P['hs']=='long':
        if P.get('fringe'):
            m=mask_poly('ell',[CX-7,1,CX+7,12]); m={(x,y) for (x,y) in m if y<=6}
            fc,fh,fs=fringe_new(P['fringe'],fw,hh,None); m|=fc
        else:
            m={(x,y) for y in range(3,8) for x in range(CX-fw-2,CX+fw+3)}
            m|={(x,y) for y in range(3,5) for x in range(CX-fw,CX+fw+1)}
        m|={(CX-fw-3,y) for y in range(8,20)}|{(CX+fw+3,y) for y in range(8,20)}|{(CX-fw-2,y) for y in range(8,20)}|{(CX+fw+2,y) for y in range(8,20)}
        cv.paint(m,hair)
        if P.get('fringe'):
            for (x,y) in fs: cv.px(x,y,dk(hair))
            for (x,y) in fh: cv.px(x,y,hh)
        # strands over shoulders
        for side in (-1,1):
            sm={(CX+side*(tw+1+k+((0,1,2,1)[(y//2)%4] if P.get('wave') else 0)),y) for y in range(17,28) for k in range(2)}
            cv.paint(sm,hair)
        for (x,y) in [(CX-3,5),(CX+2,4),(CX-7,12),(CX+7,14),(CX-6,22),(CX+6,24),(CX-7,18)]: cv.px(x,y,hh)
        if P.get('hp'):
            bw,bk=P['hp']
            for (dx,dy) in [(-2,-1),(-2,0),(-2,1),(-1,0),(1,0),(2,-1),(2,0),(2,1)]: cv.px(CX+4+dx,4+dy,bw)
            cv.px(CX+4,4,bk)
            cv.px(CX-5,7,P['clip']);cv.px(CX-4,7,P['clip'])
    cv.L='earring'
    if P.get('jewel',{}).get('earring'):
        for sd in (-1,1): cv.px(CX+sd*5,12,H('#e0b040')); cv.px(CX+sd*5,13,H('#f8dc78'))
    # --- 頭飾（玩家用，與髮型無關；NPC 用上面的 hp）
    cv.L='headwear'
    if P.get('hw'): headwear(cv,P['hw'])
    # --- face features（與 face_cells 共用，確保遊戲內疊圖與整張圖一致）
    cv.L='features'
    if not P.get('nofeatures'):
        cols=face_colors(P)
        for (x,y,r) in face_cells(P): cv.px(x,y,cols[r])
    return (cv.c,cv.log) if want_log else cv.c
OUTL=H('#2a1c26')
def render(c,S=8,box=None):
    h=len(c);w=len(c[0])
    im=Image.new("RGB",(w*S,h*S),BG);dr=ImageDraw.Draw(im)
    for j,r in enumerate(c):
        for i,col in enumerate(r):
            if col: dr.rectangle([i*S,j*S,(i+1)*S-1,(j+1)*S-1],fill=col)
    return im

def render_rgba(c,S=8):
    """同 render，但背景透明，供遊戲內直接疊圖使用。"""
    h=len(c);w=len(c[0])
    im=Image.new("RGBA",(w*S,h*S),(0,0,0,0));dr=ImageDraw.Draw(im)
    for j,r in enumerate(c):
        for i,col in enumerate(r):
            if col: dr.rectangle([i*S,j*S,(i+1)*S-1,(j+1)*S-1],fill=col+(255,))
    return im
