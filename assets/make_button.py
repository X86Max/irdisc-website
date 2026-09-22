"""Developer-only generator for the bundled GIF; Pillow is not needed to build the site.
The central arrow mark follows the project's original SVG path geometry.
Tiny bitmap letterforms are drawn at native size, not downscaled artwork.
"""
from pathlib import Path
from PIL import Image, ImageDraw
HERE=Path(__file__).resolve().parent
letters={
'I':['111','010','010','010','010','010','111'],
'R':['11110','10001','10001','11110','10100','10010','10001'],
'd':['00001','00001','01101','10011','10001','10001','01111'],
'i':['1','0','1','1','1','1','1'],
's':['0000','0000','0111','1000','0110','0001','1110'],
'C':['0111','1000','1000','1000','1000','1000','0111']}
frames=[]
for n in range(3):
    im=Image.new('RGB',(88,31),'#152b35');d=ImageDraw.Draw(im)
    d.rectangle((0,0,87,30),outline='#090d16');d.line((1,1,86,1),fill='#d9e9d4');d.line((1,1,1,29),fill='#d9e9d4');d.line((2,29,86,29),fill='#546f77');d.line((86,2,86,29),fill='#546f77')
    d.rectangle((3,3,23,27),fill='#294a53');d.line((25,3,25,27),fill='#728e83')
    accent=['#8ed9cd','#d8df93','#8ed9cd'][n]
    # Same two-way arrow and vertical stroke as the original ⇹ identity.
    d.line([(5,15),(21,15)],fill=accent,width=2)
    d.line([(9,10),(5,15),(9,20)],fill=accent,width=2)
    d.line([(17,10),(21,15),(17,20)],fill=accent,width=2)
    d.line([(13,8),(13,22)],fill=accent,width=2)
    x=32
    for char in 'IRdisC':
        glyph=letters[char]
        for y,row in enumerate(glyph):
            for dx,v in enumerate(row):
                if v=='1':d.point((x+dx,7+y),fill='#f0f2d9')
        x+=len(glyph[0])+2
    x=32
    for char in 'IRC':
        glyph=letters[char]
        for y,row in enumerate(glyph):
            for dx,v in enumerate(row):
                if v=='1': d.point((x+dx,18+y),fill='#8ed9cd')
        x+=len(glyph[0])+2
    sx,sy=[(79,7),(76,23),(80,16)][n]
    d.line((sx-2,sy,sx+2,sy),fill='#efe4a0');d.line((sx,sy-2,sx,sy+2),fill='#efe4a0')
    frames.append(im)
frames[0].save(HERE/'irdisc-88x31.gif',save_all=True,append_images=frames[1:],duration=[900,700,900],loop=0,disposal=2,optimize=False)
frames[0].save(HERE/'irdisc-88x31-static.gif')
with Image.open(HERE/'irdisc-88x31.gif') as im:
    assert im.size==(88,31) and im.format=='GIF' and im.n_frames==3
    print(im.size,im.format,im.n_frames)
