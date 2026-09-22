import {pilePosition,clamp} from './interaction.js?v=portrait1'
export function setupPoem({fragments,canvas,startConnection,send,room}){
  const tablet=document.querySelector('#tablet'),nodes=new Map(),states=new Map(),order=[]
  let drag=null,lastAction=Date.now()
  const available=new Set()
  let currentCycle=null,poemToken=''
  const drifting=new Map()
  const staged=new Set()
  const completedAnswers=new Map()
  const composer=document.createElement('section');composer.id='poem-composer';composer.setAttribute('aria-label','시를 모으는 노란 해')
  composer.innerHTML='<div class="poem-sun" aria-hidden="true"></div><div id="poem-lines"></div>'
  const assembly=document.createElement('section');assembly.id='poem-assembly';assembly.setAttribute('aria-label','문장과 빠진 어구를 맞추는 자리')
  tablet.append(composer,assembly)
  const lines=composer.querySelector('#poem-lines')
  const poemMeasure=document.createElement('canvas').getContext('2d')
  const snapshot=()=>[...Array.from(states.values()).filter(s=>s.active).map(({id,x,y,active,removed,direction,sentAt,energy})=>({id,x,y,active,removed,direction,sentAt,energy})),...(order.length?[{id:'poem',kind:'poem',lines:order.slice(),token:poemToken}]:[])]
  function poemChanged(){poemToken=`${Date.now()}-${Math.random().toString(36).slice(2)}`}
  function publish(){lastAction=Date.now();send(snapshot())}
  function removeFromPoem(id){const i=order.indexOf(id);if(i>=0){order.splice(i,1);completedAnswers.delete(id);poemChanged()}}
  function emit(id,direction){
    removeFromPoem(id);Object.assign(states.get(id),{active:true,removed:true,direction,sentAt:Date.now(),energy:.8})
    tablet.dataset.lastDirection=direction;renderPoem();layout();publish()
  }
  function collected(id){return staged.has(id)||order.includes(id)||Array.from(completedAnswers.values()).includes(id)}
  function paint(el,state,complete=false){
    el.textContent=''
    if(state.kind!=='sentence'||complete){el.textContent=state.text;return}
    const before=document.createElement('span'),blank=document.createElement('span'),after=document.createElement('span')
    before.textContent=state.before;after.textContent=state.after
    blank.className='redacted';blank.style.width=`${Math.min(10,Math.max(2,state.answer.length*.72))}em`;blank.setAttribute('aria-label','가려진 어구')
    el.append(before,blank,after)
  }
  function add(id){
    stopDrift(id)
    if(collected(id))return
    const state=states.get(id)
    staged.add(id);Object.assign(state,{active:false,removed:false,direction:null,sentAt:0})
    const match=Array.from(staged).find(other=>other!==id&&(state.kind==='sentence'
      ?states.get(other).kind==='answer'&&states.get(other).text===state.answer
      :states.get(other).kind==='sentence'&&states.get(other).answer===state.text))
    if(match){
      staged.delete(id);staged.delete(match)
      const sentence=state.kind==='sentence'?id:match
      completedAnswers.set(sentence,state.kind==='answer'?id:match)
      order.push(sentence);poemChanged()
    }
    renderPoem();layout();publish()
  }
  function renderAssembly(){
    assembly.textContent=''
    for(const id of staged){
      const state=states.get(id),el=document.createElement('button')
      el.className=`assembly-piece ${state.kind}`;el.dataset.id=id;paint(el,state)
      el.addEventListener('pointerdown',event=>begin(event,id,'staged'));el.addEventListener('pointermove',move);el.addEventListener('pointerup',release);el.addEventListener('pointercancel',cancel)
      el.addEventListener('keydown',event=>{if(event.key==='Escape'){staged.delete(id);renderPoem();layout()}})
      assembly.append(el)
    }
    fitAssembly()
  }
  function fitAssembly(){
    const ids=Array.from(staged),columns=ids.length>8?3:ids.length>3?2:1
    const width=Math.max(30,(assembly.clientWidth-14*(columns-1))/columns)
    let size=15
    for(;size>2;size-=.5){
      poemMeasure.font=`${size}px "Nanum Myeongjo"`
      const rows=[]
      ids.forEach((id,i)=>{
        const row=Math.floor(i/columns),text=states.get(id).text
        const wraps=Math.max(1,Math.ceil(poemMeasure.measureText(text).width/(width*.72)))
        rows[row]=Math.max(rows[row]||0,Math.ceil(wraps*size*1.65)+8)
      })
      if(rows.reduce((a,b)=>a+b,0)+Math.max(0,rows.length-1)*8<=assembly.clientHeight)break
    }
    assembly.style.gridTemplateColumns=`repeat(${columns},minmax(0,1fr))`
    assembly.style.setProperty('--assembly-size',`${size}px`)
  }

  function renderPoem(){
    renderAssembly()
    lines.textContent='';composer.classList.toggle('has-lines',order.length>0)
    order.forEach((id,i)=>{
      const el=document.createElement('button');el.className='poem-line';el.dataset.id=id;el.setAttribute('aria-label',states.get(id).text)
      el.textContent=states.get(id).text
      el.addEventListener('pointerdown',event=>begin(event,id,true));el.addEventListener('pointermove',move);el.addEventListener('pointerup',release);el.addEventListener('pointercancel',cancel)
      el.addEventListener('keydown',event=>{
        if(event.key==='Escape'){event.preventDefault();removeFromPoem(id);renderPoem();layout();publish()}
        if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();const target=clamp(i+(event.key==='ArrowUp'?-1:1),0,order.length-1);order.splice(i,1);order.splice(target,0,id);poemChanged();renderPoem();publish()}
      });lines.append(el)
    })
    fitPoem()
  }
  function fitPoem(){
    const height=tablet.getBoundingClientRect().height
    const base=clamp(innerWidth*.021,14,19)
    // Pack every collected phrase into the visible shore; never create a scroll area.
    let chosen={columns:1,size:0,height:height*.38}
    const maxHeight=height*.38
    for(let columns=1;columns<=4;columns++){
      const columnWidth=Math.max(20,(lines.clientWidth-12*(columns-1))/columns)
      for(let size=base;size>=2;size-=.5){
        poemMeasure.font=`${size}px "Nanum Myeongjo"`
        const rows=[]
        order.forEach((id,i)=>{
          const row=Math.floor(i/columns)
          const wraps=Math.max(1,Math.ceil(poemMeasure.measureText(states.get(id).text).width/(columnWidth*.85)))
          rows[row]=Math.max(rows[row]||0,Math.ceil(wraps*size*1.45)+4)
        })
        const needed=rows.reduce((sum,n)=>sum+n,0)+8
        if(needed<=maxHeight){
          if(size>chosen.size)chosen={columns,size,height:Math.max(height*.23,needed)}
          break
        }
      }
    }
    lines.style.gridTemplateColumns=`repeat(${chosen.columns},minmax(0,1fr))`
    lines.style.setProperty('--poem-size',`${chosen.size}px`)
    composer.style.height=`${chosen.height}px`
    composer.style.top=`${height*.46-chosen.height}px`
  }
  function layout(){
    const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return
    fitPoem();fitAssembly()
    const portrait=rect.height>rect.width,size=portrait?clamp(rect.width/43,14,19):clamp(rect.width/57,14,19)
    for(const [id,el] of nodes){
      el.hidden=!available.has(id)
      if(drifting.has(id))continue
      const state=states.get(id),p=pilePosition(state.index,portrait)
      state.x=p.x;state.y=.89+(p.y-.56)*.22
      el.style.fontSize=`${size}px`;el.style.setProperty('--tilt',`${p.angle}deg`);el.style.setProperty('--depth-scale',p.scale);el.style.setProperty('--lean',`${(p.depth-50)*.35}deg`);el.style.setProperty('--depth-opacity',.7+p.depth*.003);el.style.zIndex=p.depth
      if(state.kind!=='sentence'&&el.scrollWidth>rect.width*.72)el.style.fontSize=`${size*rect.width*.72/el.scrollWidth}px`
      const a=Math.abs(p.angle)*Math.PI/180,half=(el.offsetWidth*Math.cos(a)+el.offsetHeight*Math.sin(a))*p.scale/2
      state.x=clamp(state.x,.06+half/rect.width,.94-half/rect.width)
      el.style.left=`${state.x*100}%`;el.style.top=`${state.y*100}%`
      el.hidden=!available.has(id);el.classList.toggle('removed',state.removed||collected(id));el.tabIndex=!available.has(id)||state.removed||collected(id)?-1:0
    }
  }
  function begin(event,id,inPoem=false){
    if(drag||tablet.classList.contains('at-ending')||!available.has(id)||event.button!==0)return
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId)
    const r=event.currentTarget.getBoundingClientRect(),ghost=document.createElement('div')
    stopDrift(id)
    ghost.className='floating-phrase';paint(ghost,states.get(id),inPoem===true);ghost.classList.toggle('sentence',states.get(id).kind==='sentence');ghost.style.fontSize=getComputedStyle(event.currentTarget).fontSize
    tablet.append(ghost);ghost.style.left=`${r.left+r.width/2}px`;ghost.style.top=`${r.top+r.height/2}px`
    tint(ghost,r.top+r.height/2)
    drag={id,inPoem,pointer:event.pointerId,x:event.clientX,y:event.clientY,cx:r.left+r.width/2,cy:r.top+r.height/2,el:event.currentTarget,ghost,moved:false}
    lastAction=Date.now();drag.el.classList.add('held');tablet.classList.add('holding')
  }
  // The photographed shoreline is the bottom of the land drop area.
  // Brighten the upper letters first as a phrase crosses from sea to land.
  function tint(ghost,y){
    const shore=composer.getBoundingClientRect().bottom
    const lift=clamp((shore+120-y)/200,0,1)
    ghost.style.setProperty('--surface-position',`${100-lift*100}%`)
  }
  function move(event){
    if(!drag||drag.pointer!==event.pointerId)return
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y
    if(Math.hypot(dx,dy)>8)drag.moved=true
    drag.ghost.style.left=`${drag.cx+dx}px`;drag.ghost.style.top=`${drag.cy+dy}px`
    tint(drag.ghost,drag.cy+dy)
    const over=inside(event,composer)||inside(event,assembly);composer.classList.toggle('receiving',over)
    tablet.dataset.dragDirection=over?'poem':''
  }
  function inside(event,el){const r=el.getBoundingClientRect();return event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom}
  function finishDrag(){const d=drag;if(!d)return null;drag=null;d.el.classList.remove('held');tablet.classList.remove('holding');delete tablet.dataset.dragDirection;composer.classList.remove('receiving');return d}
  function settle(d,side=null){
    layout();const el=nodes.get(d.id),r=el.getBoundingClientRect(),g=d.ghost
    const fromX=parseFloat(g.style.left),fromY=parseFloat(g.style.top)
    const toX=side?(side==='left'?-180:innerWidth+180):r.left+r.width/2,toY=side?fromY+22:r.top+r.height/2
    el.classList.add('held')
    const anim=g.animate([{left:fromX+'px',top:fromY+'px',opacity:1},{left:(fromX+toX)/2+Math.sin(states.get(d.id).index)*18+'px',top:(fromY+toY)/2+'px',opacity:.85,offset:.55},{left:toX+'px',top:toY+'px',opacity:side?0:.15}],{duration:side?850:1400,easing:'cubic-bezier(.2,.45,.3,1)',fill:'forwards'})
    const cleanup=()=>{g.remove();el.classList.remove('held')};anim.onfinish=cleanup;setTimeout(cleanup,1600)
  }
  function cancel(){const d=finishDrag();if(d){d.ghost.remove();layout()}}
  function release(event){
    if(!drag||drag.pointer!==event.pointerId)return
    const d=finishDrag()
    if(d.moved&&(inside(event,composer)||inside(event,assembly))){
      if(!d.inPoem)add(d.id)
      else if(d.inPoem===true){
        const remaining=order.filter(id=>id!==d.id)
        let at=remaining.findIndex(id=>{const box=lines.querySelector(`[data-id="${id}"]`).getBoundingClientRect();return event.clientY<box.top||(event.clientY<=box.bottom&&event.clientX<box.left+box.width/2)})
        if(at<0)at=remaining.length
        remaining.splice(at,0,d.id);order.splice(0,order.length,...remaining);poemChanged();renderPoem();publish()
      }
      d.ghost.remove()
    }else{
      if(d.inPoem&&d.moved){if(d.inPoem==='staged')staged.delete(d.id);else removeFromPoem(d.id);renderPoem();publish()}
      if(d.inPoem&&!d.moved)d.ghost.remove();else settle(d)
    }
  }
  function reset(shouldPublish=true){for(const id of drifting.keys())stopDrift(id);fragments.forEach(p=>available.add(p.id));canvas.dataset.arrived=String(fragments.length);cancel();staged.clear();completedAnswers.clear();order.length=0;states.forEach(s=>Object.assign(s,{active:false,removed:false,direction:null,sentAt:0}));renderPoem();layout();if(shouldPublish)publish()}
  canvas.textContent=''
  fragments.forEach((p,index)=>{
    states.set(p.id,{...p,index,x:.5,y:.5,active:false,removed:false,direction:null,sentAt:0,energy:.5})
    available.add(p.id)
    const el=document.createElement('button');el.hidden=false;el.className=`fragment ${p.kind}`;paint(el,p);el.dataset.id=p.id
    el.addEventListener('pointerdown',event=>begin(event,p.id));el.addEventListener('pointermove',move);el.addEventListener('pointerup',release);el.addEventListener('pointercancel',cancel)
    el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();if(available.has(p.id))add(p.id)}
})
    canvas.append(el);nodes.set(p.id,el)
  })
  function stopDrift(id){
    const animation=drifting.get(id)
    if(animation){animation.onfinish=null;animation.cancel();drifting.delete(id);nodes.get(id).classList.remove('drifting')}
  }
  function driftOne(){
    if(document.hidden||tablet.classList.contains('at-ending')||drifting.size>=3)return
    const candidates=fragments.filter(p=>!collected(p.id)&&!states.get(p.id).removed&&!drifting.has(p.id)&&drag?.id!==p.id&&!nodes.get(p.id).classList.contains('held'))
    if(!candidates.length)return
    const {id}=candidates[Math.floor(Math.random()*candidates.length)],el=nodes.get(id)
    const r=el.getBoundingClientRect(),base=canvas.getBoundingClientRect()
    const x=r.left+r.width/2-base.left,y=r.top+r.height/2-base.top
    const side=Math.random()<.5?'left':'right',end=side==='left'?-r.width:base.width+r.width
    el.classList.add('drifting')
    const animation=el.animate([
      {left:x+'px',top:y+'px',transform:'translate(-50%,-50%) rotate(-3deg)',offset:0},
      {left:(x-4)+'px',top:(y-5)+'px',transform:'translate(-50%,-50%) rotate(3deg)',offset:.015},
      {left:(x+4)+'px',top:(y-9)+'px',transform:'translate(-50%,-50%) rotate(-2deg)',offset:.03},
      {left:x+'px',top:(y-20)+'px',transform:'translate(-50%,-50%) rotate(0deg)',offset:.05},
      {left:(x+(end-x)*.4)+'px',top:(y-base.height*.12)+'px',offset:.5},
      {left:end+'px',top:(y-base.height*.16)+'px',transform:'translate(-50%,-50%) rotate(4deg)',offset:1}
    ],{duration:24000+Math.random()*12000,fill:'forwards',easing:'linear'})
    drifting.set(id,animation)
    animation.onfinish=()=>{stopDrift(id);emit(id,side)}
  }
  function scheduleDrift(){setTimeout(()=>{driftOne();scheduleDrift()},5000+Math.random()*6000)}
  scheduleDrift()
  document.addEventListener('visibilitychange',()=>{for(const anim of drifting.values())document.hidden?anim.pause():anim.play()})
  function updateCycle(data){
    if(typeof data.cycle!=='string')return
    if(currentCycle===null){currentCycle=data.cycle;return}
    if(currentCycle!==data.cycle){currentCycle=data.cycle;reset()}
  }
  function fit(){const v=window.visualViewport;document.documentElement.style.setProperty('--viewport-height',`${Math.round(v&&Math.abs(v.scale-1)<.01?v.height:innerHeight)}px`);requestAnimationFrame(layout)}
  if(typeof ResizeObserver==='function')new ResizeObserver(layout).observe(canvas)
  window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);document.addEventListener('fullscreenchange',fit);document.addEventListener('webkitfullscreenchange',fit);window.addEventListener('orientationchange',()=>{cancel();setTimeout(fit,150)})
  if(document.fonts)document.fonts.load('24px "Nanum Myeongjo"').then(()=>layout()).catch(()=>{})
  fit();renderPoem();startConnection({display:false,room,getState:snapshot,onProgress(data){if(data.phase==='ending'){cancel();for(const id of drifting.keys())stopDrift(id);layout()}updateCycle(data);tablet.classList.toggle('at-ending',data.phase==='ending');composer.dataset.filmProgress=String(data.progress)},onControl(data){if(data.token===poemToken)reset()}})
}
