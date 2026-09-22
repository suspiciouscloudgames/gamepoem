import {EFFECT_LIFETIME,isEmission,seed} from './interaction.js?v=phrase1'
export function createSeaEffects(root){
  const canvas=document.createElement('canvas');canvas.className='sea-effects';canvas.setAttribute('aria-hidden','true');root.prepend(canvas)
  const ctx=canvas.getContext('2d');let items=[],raf=0,w=0,h=0
  function resize(){const rect=root.getBoundingClientRect();w=rect.width;h=rect.height;const ratio=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx?.setTransform(ratio,0,0,ratio,0,0)}
  if(typeof ResizeObserver==='function')new ResizeObserver(resize).observe(root)
  window.addEventListener('resize',resize);resize()
  function draw(){
    raf=0;if(!ctx||!w||!h)return
    ctx.clearRect(0,0,w,h)
    const now=Date.now();items=items.filter(item=>isEmission(item,now))
    items.slice(-18).forEach((item,index)=>{
      const age=Math.max(0,(now-item.sentAt)/1000),t=age/18,fade=Math.min(1,age/1.2,(18-age)/3),power=(.6+(item.energy||.5)*.4)*fade
      const x=Math.max(.1,Math.min(.9,item.x))*w,y=Math.max(.15,Math.min(.67,item.y))*h
      ctx.save();ctx.globalAlpha=power
      if(item.direction==='up'){
        ctx.globalCompositeOperation='screen'
        for(let j=0;j<12;j++){
          const px=x+(seed(index,j)-.5)*w*.38+Math.sin(age*.45+j)*18,py=h*.72-((age*25+j*31)%(h*.72))
          const r=2+seed(j,index)*4;const glow=ctx.createRadialGradient(px,py,0,px,py,r*7);glow.addColorStop(0,'rgba(217,255,241,.8)');glow.addColorStop(1,'rgba(129,242,224,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(px,py,r*7,0,Math.PI*2);ctx.fill()
        }
      }else if(item.direction==='down'){
        const level=h*(.57+t*.15);const wash=ctx.createLinearGradient(0,level-100,0,h);wash.addColorStop(0,'rgba(1,18,43,0)');wash.addColorStop(1,'rgba(1,15,40,.33)');ctx.fillStyle=wash;ctx.fillRect(0,0,w,h)
        for(let j=0;j<4;j++){ctx.beginPath();for(let px=0;px<=w;px+=12){const py=level+j*19+Math.sin(px/w*9+age*.6+j)*15;px?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.strokeStyle=`rgba(103,182,204,${.14-j*.025})`;ctx.lineWidth=2;ctx.stroke()}
      }else if(item.direction==='left'){
        ctx.font=`${Math.max(18,w*.022)}px Arial`;ctx.fillStyle='#c9ebf1'
        for(let j=0;j<5;j++){ctx.globalAlpha=power*(.22-j*.035);ctx.fillText(item.text,w*(.8-j*.16)-age*12,h*(.25+(index%4)*.1)+Math.sin(age*.45+j)*13)}
      }else if(item.direction==='right'){
        const cx=w*(.56+seed(index,6)*.23)+Math.sin(age*.35+index)*32,cy=h*(.27+seed(index,7)*.22)-age*2,r=Math.min(w,h)*(.065+Math.sin(age*1.6)*.005)
        // Rhizostoma pulmo: a substantial dome, violet scalloped rim,
        // and eight frilled oral arms with club ends; no marginal tentacles.
        ctx.translate(cx,cy);ctx.rotate(Math.sin(age*.45+index)*.075)
        const pulse=1+Math.sin(age*1.6)*.045
        ctx.scale(pulse,1/pulse)
        for(let j=0;j<8;j++){
          const spread=(j-3.5)/3.5,sway=Math.sin(age*1.2+j*.7)*r*.055
          const sx=spread*r*.37,ex=spread*r*.52+sway,len=r*(1.2+seed(j,3)*.38)
          ctx.beginPath();ctx.moveTo(sx-r*.085,-r*.02)
          ctx.bezierCurveTo(sx-r*.23,r*.4,ex-r*.15,len*.64,ex-r*.075,len*.84)
          ctx.bezierCurveTo(ex-r*.17,len*1.12,ex+r*.17,len*1.12,ex+r*.075,len*.84)
          ctx.bezierCurveTo(ex+r*.15,len*.64,sx+r*.23,r*.4,sx+r*.085,-r*.02)
          ctx.closePath();ctx.fillStyle=j%2?'rgba(221,219,244,.36)':'rgba(229,245,246,.42)';ctx.fill()
          ctx.strokeStyle='rgba(181,171,220,.5)';ctx.lineWidth=.8;ctx.stroke()
          // Dense short folds read as cauliflower-like feeding surfaces.
          for(let k=0;k<9;k++){
            const f=k/10,ay=r*.12+f*len*.65,ax=sx+(ex-sx)*f+Math.sin(k*1.8+j+age*.6)*r*.035
            ctx.beginPath();ctx.ellipse(ax,ay,r*(.11-.035*f),r*.055,Math.sin(j+k)*.5,0,Math.PI*2)
            ctx.fillStyle='rgba(236,242,247,.32)';ctx.fill();ctx.strokeStyle='rgba(170,157,214,.24)';ctx.stroke()
          }
        }
        const bell=ctx.createRadialGradient(-r*.28,-r*.58,r*.05,0,-r*.25,r*1.2)
        bell.addColorStop(0,'rgba(245,253,255,.57)');bell.addColorStop(.65,'rgba(194,224,244,.34)');bell.addColorStop(1,'rgba(141,151,214,.23)')
        ctx.beginPath();ctx.moveTo(-r,0)
        ctx.bezierCurveTo(-r*1.02,-r*1.43,r*1.02,-r*1.43,r,0)
        for(let k=0;k<=32;k++){const f=k/32;ctx.lineTo(r-2*r*f,r*(.045+Math.sin(Math.PI*f)*.12+Math.sin(f*Math.PI*32)*.024))}
        ctx.closePath();ctx.fillStyle=bell;ctx.fill();ctx.strokeStyle='rgba(222,236,254,.55)';ctx.lineWidth=1;ctx.stroke()
        ctx.beginPath()
        for(let k=0;k<=96;k++){const f=k/96,px=-r+2*r*f,py=r*(.045+Math.sin(Math.PI*f)*.12+Math.sin(f*Math.PI*32)*.024);k?ctx.lineTo(px,py):ctx.moveTo(px,py)}
        ctx.strokeStyle='rgba(132,110,212,.9)';ctx.lineWidth=Math.max(1.8,r*.035);ctx.stroke()
        ctx.beginPath();ctx.ellipse(-r*.25,-r*.52,r*.37,r*.13,-.45,Math.PI,Math.PI*1.85);ctx.strokeStyle='rgba(250,255,255,.34)';ctx.lineWidth=r*.035;ctx.stroke()

      }
      ctx.restore()
    })
    if(items.length&&!document.hidden)raf=requestAnimationFrame(draw)
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!raf)draw()})
  return {set(next){items=next;if(!raf)draw()}}
}
