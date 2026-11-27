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
    def __init__(s): s.c=[[None]*W for _ in range(HH)]
    def paint(s,mask,fill,base=None,outline=True,warm=False):
        if not mask: return
        if outline:
            b=base if base else (fill if not callable(fill) else fill(*next(iter(mask))))
            oc=(int(b[0]*.72),int(b[1]*.58),int(b[2]*.56)) if warm else dk(b)
            for (x,y) in mask:
                for dx,dy in((1,0),(-1,0),(0,1),(0,-1)):
                    nx,ny=x+dx,y+dy
                    if 0<=nx<W and 0<=ny<HH and (nx,ny) not in mask: s.c[ny][nx]=oc
        for (x,y) in mask: s.c[y][x]=fill(x,y) if callable(fill) else fill
    def px(s,x,y,col):
        if 0<=x<W and 0<=y<HH: s.c[y][x]=col
BODY={'slim':dict(tw=3,nw=1,L=4,arm=3),'medium':dict(tw=4,nw=1,L=4,arm=3),'chubby':dict(tw=5,nw=2,L=5,arm=4)}
def diag(base,hi,lo,y0,k=0.6):
    def f(x,y):
        v=(x-CX)-(y-y0)*k
        return hi if v>1 else (lo if v<-3 else base)
    return f
def build(P):
    cv=Cv(); b=BODY[P['body']]; tw,nw,L,aw=b['tw'],b['nw'],b['L'],b['arm']
    sk,sks,blush,lip=P['skin'],P['skin_s'],P['blush'],P['lip']
    fw=5 if P.get('round') else 4
    hair=P['hair']; hh=P['hair_hi']
    # --- back hair
    if P['hs']=='puffs':
        cv.paint(mask_poly('ell',[CX-10,2,CX-2,10]),hair,outline=True)
        cv.paint(mask_poly('ell',[CX+2,2,CX+10,10]),hair)
        cv.paint(mask_poly('ell',[CX-6,2,CX+6,12]),hair)
        cv.paint(mask_poly('poly',[(CX-6,17),(CX+6,17),(CX+7,18),(CX-7,18)]),P['hood']) if False else None
    elif P['hs']=='bob':
        sp={}
        for y in range(5,18): sp[y]=(CX-7,CX+7) if y<15 else (CX-6,CX+6)
        cv.paint(rows_mask(sp),hair)
    elif P['hs']=='long':
        sp={}
        for y in range(5,30): sp[y]=(CX-7,CX+7) if y<16 else ((CX-6,CX+6) if y<27 else (CX-5,CX+5))
        cv.paint(rows_mask(sp),hair)
    # --- legs/bottom/shoes
    ytop=30
    legL=lambda: (CX-1-L,CX-2); legR=lambda:(CX+2,CX+1+L)
    bt=P['bottom']
    hemy=ytop+ (P['torso_len'])  # not used
    if bt['type']=='pants':
        for side in (0,1):
            x0,x1=legL() if side==0 else legR()
            sp={y:((x0-(1 if y>=45 else 0)),(x1+(1 if y>=45 else 0))) if True else None for y in range(30,49)}
            sp={y:(x0-(1 if (y>=45 and side==0) else 0),x1+(1 if (y>=45 and side==1) else 0)) for y in range(30,49)}
            cv.paint(rows_mask(sp),diag(bt['base'],bt['hi'],bt['lo'],30,0.4),base=bt['base'])
        # waist band
        cv.paint(rows_mask({30:(CX-1-L,CX+1+L),31:(CX-1-L,CX+1+L)}),bt['lo'],base=bt['lo'])
        # shoes
        for side in (0,1):
            x0,x1=legL() if side==0 else legR()
            cv.paint(rows_mask({y:(x0-1,x1+1) for y in range(49,52)}),P['shoe'],base=P['shoe'])
            for x in range(x0-1,x1+2): cv.px(x,50,P['shoe_hi'])
            cv.px(x0-1 if side==0 else x1+1,51,P['shoe_hi']) if False else None
    else:
        LL=bt['legL']
        for side in (0,1):
            x0=CX-1-LL if side==0 else CX+2
            x1=CX-2 if side==0 else CX+1+LL
            cv.paint(rows_mask({y:(x0,x1) for y in range(bt['skin_y0'],49)}),sk,base=sk,warm=True)
            if bt.get('sock'):
                cv.paint(rows_mask({y:(x0,x1) for y in range(bt['sock_y0'],49)}),bt['sock'],base=bt['sock'],outline=True)
                for x in range(x0,x1+1): cv.px(x,bt['sock_y0'],bt['sock_hi'])
            cv.paint(rows_mask({y:(x0-1,x1+1) for y in range(49,52)}),P['shoe'],base=P['shoe'])
            for x in range(x0-1,x1+2): cv.px(x,50,P['shoe_hi'])
        sp={}
        top,bot=30,bt['skirt_end']
        for y in range(top,bot+1):
            t=(y-top)/(bot-top)
            half=tw+int(round(t*bt['flare']))
            sp[y]=(CX-half,CX+half)
        cv.paint(rows_mask(sp),bt['fill'],base=bt['base'])
    # --- hood (behind neck)
    if P.get('hood'):
        cv.paint(mask_poly('ell',[CX-nw-4,15,CX+nw+4,21]),P['hood'])
    # --- sleeves / arms / hands
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
        cv.paint(arm_cells(side,20,sleeve_end),diag(sl['base'],sl['hi'],sl['lo'],20),base=sl['base'])
        if sl.get('cuff'):
            cv.paint(arm_cells(side,sleeve_end-1,sleeve_end),sl['cuff'],base=sl['cuff'])
        hy=arm_cells(side,32,34)
        cv.paint(hy,sk,base=sk,warm=True)
    # --- torso
    tb=P['top']; hem=P['torso_hem']
    cv.paint(rows_mask({y:(CX-tw,CX+tw) for y in range(19,hem+1)}),diag(tb['base'],tb['hi'],tb['lo'],19),base=tb['base'])
    if 'detail' in P: P['detail'](cv,tw,hem)
    # --- neck
    sp={y:(CX-nw,CX+nw) for y in range(15,19)}
    cv.paint(rows_mask(sp),lambda x,y: sks if y<=16 else sk,base=sk,warm=True)
    # --- face
    fsp={}
    for y in range(5,14): fsp[y]=(CX-fw,CX+fw)
    fsp[13]=(CX-fw+1,CX+fw-1); fsp[14]=(CX-fw+2,CX+fw-2); fsp[15]=(CX-max(1,fw-3),CX+max(1,fw-3))
    cv.paint(rows_mask(fsp),lambda x,y: sks if (x==CX+fw and 8<=y<=13) or y==15 else sk,base=sk,warm=True)
    # --- front hair
    if P['hs']=='puffs':
        m=mask_poly('ell',[CX-6,1,CX+6,13]); m={(x,y) for (x,y) in m if y<=5}
        m|={(CX-fw-2,y) for y in range(6,10)}|{(CX+fw+2,y) for y in range(6,10)}
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
        for y,(a,b2) in {7:(CX-fw,CX),8:(CX-fw,CX-2),9:(CX-fw,CX-3)}.items(): m|={(x,y) for x in range(a,b2+1)}
        m|={(CX+fw+2,y) for y in range(7,14)}|{(CX-fw-2,y) for y in range(7,14)}
        cv.paint(m,hair)
        for (x,y) in [(CX-3,7),(CX-1,6),(CX+2,5),(CX-5,9),(CX+5,9)]: cv.px(x,y,hh)
        if P.get('hp'):
            cv.paint(mask_poly('ell',[CX-7,0,CX+6,5]),diag(P['hp'][0],P['hp'][1],P['hp'][0],0,0.2),base=P['hp'][0])
            cv.px(CX-1,-1+1,P['hp'][2])
    elif P['hs']=='long':
        m={(x,y) for y in range(3,8) for x in range(CX-fw-2,CX+fw+3)}
        m|={(x,y) for y in range(3,5) for x in range(CX-fw,CX+fw+1)}
        m|={(CX-fw-3,y) for y in range(8,20)}|{(CX+fw+3,y) for y in range(8,20)}|{(CX-fw-2,y) for y in range(8,20)}|{(CX+fw+2,y) for y in range(8,20)}
        cv.paint(m,hair)
        # strands over shoulders
        for side in (-1,1):
            sm={(CX+side*(tw+1+k),y) for y in range(17,28) for k in range(2)}
            cv.paint(sm,hair)
        for (x,y) in [(CX-3,5),(CX+2,4),(CX-7,12),(CX+7,14),(CX-6,22),(CX+6,24),(CX-7,18)]: cv.px(x,y,hh)
        if P.get('hp'):
            bw,bk=P['hp']
            for (dx,dy) in [(-2,-1),(-2,0),(-2,1),(-1,0),(1,0),(2,-1),(2,0),(2,1)]: cv.px(CX+4+dx,4+dy,bw)
            cv.px(CX+4,4,bk)
            cv.px(CX-5,7,P['clip']);cv.px(CX-4,7,P['clip'])
    # --- face features
    iris=P['iris']; ey=P['eyes']; hc=P['hair']
    for sd in (-1,1):
        o=CX+sd*3; i2=CX+sd*2
        wc,dc=(o,i2) if sd==-1 else (i2,o)
        if ey=='closed':
            cv.px(o,10,hc);cv.px(i2,10,hc)
        else:
            cv.px(wc,9,hc);cv.px(dc,9,hc)
            cv.px(wc,10,WHITE);cv.px(dc,10,iris)
            if ey=='big':
                cv.px(wc,11,WHITE);cv.px(dc,11,iris)
        if not P.get('no_blush'):
            cv.px(CX+sd*3,12,blush)
            cv.px(CX+sd*4,12,blush)
    cv.px(CX,12,P.get('nose',sks))
    if P.get('freckles'):
        fc=P['freckles']
        if fc=='auto':
            lum=0.3*sk[0]+0.59*sk[1]+0.11*sk[2]
            w=max(0.0,min(1.0,(lum-110)/(190-110)))   # 0=深膚色 1=淺膚色
            pink=(190,100,104); dark=(110,56,34)
            br=tuple(dark[k]*(1-w)+pink[k]*w for k in range(3))
            t=0.26-0.02*w
            fc=tuple(int(sk[k]*(1-t)+br[k]*t) for k in range(3))
        P=dict(P,freckles=fc)
        for (x,y) in [(CX-3,11),(CX-1,11),(CX-2,12),(CX+3,11),(CX+1,11),(CX+2,12)]: cv.px(x,y,P['freckles'])
    m=P['mouth']
    if m=='small': cv.px(CX,13,lip)
    elif m=='mid': cv.px(CX,13,lip);cv.px(CX+1,13,lip)
    elif m=='wide':
        for x in (CX-1,CX,CX+1): cv.px(x,13,lip)
    return cv.c
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
