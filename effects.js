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
        ctx.strokeStyle='rgba(190,252,236,.68)';ctx.fillStyle='rgba(155,237,219,.10)';ctx.lineWidth=1.5
        ctx.beginPath();ctx.moveTo(cx-r,cy);ctx.bezierCurveTo(cx-r*.85,cy-r*1.3,cx+r*.85,cy-r*1.3,cx+r,cy);ctx.quadraticCurveTo(cx,cy+r*.22,cx-r,cy);ctx.fill();ctx.stroke()
        for(let j=0;j<7;j++){ctx.beginPath();const sx=cx+(j-3)*r*.23;ctx.moveTo(sx,cy);for(let k=1;k<=22;k++){const py=cy+k*r*.11,px=sx+Math.sin(k*.35-age*1.6+j)*r*.18*(k/22);ctx.lineTo(px,py)}ctx.strokeStyle=`rgba(179,247,229,${.45-j*.025})`;ctx.stroke()}
      }
      ctx.restore()
    })
    if(items.length&&!document.hidden)raf=requestAnimationFrame(draw)
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!raf)draw()})
  return {set(next){items=next;if(!raf)draw()}}
}
