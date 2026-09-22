import {pilePosition,directionAt,clamp} from './interaction.js?v=portrait1'
export function setupPoem({fragments,canvas,startConnection,send,room}){
  const tablet=document.querySelector('#tablet'),nodes=new Map(),states=new Map(),order=[]
  let drag=null,lastAction=Date.now()
  const available=new Set()
  let currentCycle=null,lastFilmTime=0,lastProgressAt=0,poemToken=''
  const water=document.createElement('div');water.id='tank-water';water.setAttribute('aria-hidden','true');water.innerHTML='<div class="tank-surface"></div><div class="tank-depth"></div>'
  const composer=document.createElement('section');composer.id='poem-composer';composer.setAttribute('aria-label','시를 모으는 바위')
  composer.innerHTML=`<svg class="poem-rock" viewBox="0 0 800 340" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="rock-tone" x2=".2" y2="1"><stop stop-color="#737f7d"/><stop offset=".35" stop-color="#4d6366"/><stop offset="1" stop-color="#1b373f"/></linearGradient></defs><path d="M36 60L110 24 281 13 401 24 562 10 696 32 763 71 790 145 768 239 713 297 533 325 347 313 192 328 65 280 14 179Z" fill="url(#rock-tone)"/><path d="M36 60L197 51 303 68 424 44 562 49 696 32M65 280L128 206 113 169M713 297L672 242 700 182" fill="none" stroke="#b9c6bd" stroke-opacity=".17" stroke-width="2"/></svg><div id="poem-lines"></div>`
  tablet.append(water,composer)
  const lines=composer.querySelector('#poem-lines')
  const snapshot=()=>[...Array.from(states.values()).filter(s=>s.active).map(({id,x,y,active,removed,direction,sentAt,energy})=>({id,x,y,active,removed,direction,sentAt,energy})),...(order.length?[{id:'poem',kind:'poem',lines:order.slice(),token:poemToken}]:[])]
  function poemChanged(){poemToken=`${Date.now()}-${Math.random().toString(36).slice(2)}`}
  function publish(){lastAction=Date.now();send(snapshot())}
  function removeFromPoem(id){const i=order.indexOf(id);if(i>=0){order.splice(i,1);poemChanged()}}
  function emit(id,direction){
    removeFromPoem(id);Object.assign(states.get(id),{active:true,removed:true,direction,sentAt:Date.now(),energy:.8})
    tablet.dataset.lastDirection=direction;renderPoem();layout();publish()
  }
  function add(id){if(!order.includes(id)){order.push(id);poemChanged()}Object.assign(states.get(id),{active:false,removed:false,direction:null,sentAt:0});renderPoem();layout();publish()}
  function renderPoem(){
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
    lines.scrollTop=lines.scrollHeight
  }
  function layout(){
    const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return
    const portrait=rect.height>rect.width,size=portrait?clamp(rect.width/31,19,27):clamp(rect.width/40,19,28)
    for(const [id,el] of nodes){
      el.hidden=!available.has(id)
      const state=states.get(id),p=pilePosition(state.index,portrait)
      state.x=p.x;state.y=.78+(p.y-.56)*.28
      el.style.fontSize=`${size}px`;el.style.setProperty('--tilt',`${p.angle}deg`);el.style.setProperty('--depth-scale',p.scale);el.style.setProperty('--lean',`${(p.depth-50)*.35}deg`);el.style.setProperty('--depth-opacity',.7+p.depth*.003);el.style.zIndex=p.depth
      if(el.scrollWidth>rect.width*.72)el.style.fontSize=`${size*rect.width*.72/el.scrollWidth}px`
      const a=Math.abs(p.angle)*Math.PI/180,half=(el.offsetWidth*Math.cos(a)+el.offsetHeight*Math.sin(a))*p.scale/2
      state.x=clamp(state.x,.06+half/rect.width,.94-half/rect.width)
      el.style.left=`${state.x*100}%`;el.style.top=`${state.y*100}%`
      el.hidden=!available.has(id);el.classList.toggle('removed',state.removed||order.includes(id));el.tabIndex=!available.has(id)||state.removed||order.includes(id)?-1:0
    }
  }
  function direction(event){const r=tablet.getBoundingClientRect();return event.clientX<r.left+r.width*.12?'left':event.clientX>r.right-r.width*.12?'right':null}
  function begin(event,id,inPoem=false){
    if(drag||tablet.classList.contains('at-ending')||!available.has(id)||event.button!==0)return
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId)
    const r=event.currentTarget.getBoundingClientRect(),ghost=document.createElement('div')
    ghost.className='floating-phrase';ghost.textContent=states.get(id).text;ghost.style.fontSize=getComputedStyle(event.currentTarget).fontSize
    tablet.append(ghost);ghost.style.left=`${r.left+r.width/2}px`;ghost.style.top=`${r.top+r.height/2}px`
    drag={id,inPoem,pointer:event.pointerId,x:event.clientX,y:event.clientY,cx:r.left+r.width/2,cy:r.top+r.height/2,el:event.currentTarget,ghost,moved:false}
    lastAction=Date.now();drag.el.classList.add('held');tablet.classList.add('holding')
  }
  function move(event){
    if(!drag||drag.pointer!==event.pointerId)return
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y
    if(Math.hypot(dx,dy)>8)drag.moved=true
    drag.ghost.style.left=`${drag.cx+dx}px`;drag.ghost.style.top=`${drag.cy+dy}px`
    const over=inside(event,composer);composer.classList.toggle('receiving',over)
    tablet.dataset.dragDirection=over?'poem':direction(event)||''
    if(over){const r=lines.getBoundingClientRect();if(event.clientY<r.top+35)lines.scrollTop-=10;if(event.clientY>r.bottom-35)lines.scrollTop+=10}
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
    const d=finishDrag(),side=direction(event)
    if(d.moved&&inside(event,composer)){
      if(!d.inPoem)add(d.id)
      else{
        const remaining=order.filter(id=>id!==d.id)
        let at=remaining.findIndex(id=>{const box=lines.querySelector(`[data-id="${id}"]`).getBoundingClientRect();return event.clientY<box.top+box.height/2})
        if(at<0)at=remaining.length
        remaining.splice(at,0,d.id);order.splice(0,order.length,...remaining);poemChanged();renderPoem();publish()
      }
      d.ghost.remove()
    }else if(d.moved&&side){emit(d.id,side);settle(d,side)}
    else{
      if(d.inPoem&&d.moved){removeFromPoem(d.id);renderPoem();publish()}
      if(d.inPoem&&!d.moved)d.ghost.remove();else settle(d)
    }
  }
  function reset(shouldPublish=true){available.clear();canvas.dataset.arrived='0';cancel();order.length=0;states.forEach(s=>Object.assign(s,{active:false,removed:false,direction:null,sentAt:0}));renderPoem();layout();if(shouldPublish)publish()}
  lines.addEventListener('scroll',()=>{lastAction=Date.now()},{passive:true})
  canvas.textContent=''
  fragments.forEach((p,index)=>{
    states.set(p.id,{id:p.id,index,text:p.text,x:.5,y:.5,active:false,removed:false,direction:null,sentAt:0,energy:.5})
    const el=document.createElement('button');el.hidden=true;el.className='fragment';el.textContent=p.text;el.dataset.id=p.id
    el.addEventListener('pointerdown',event=>begin(event,p.id));el.addEventListener('pointermove',move);el.addEventListener('pointerup',release);el.addEventListener('pointercancel',cancel)
    el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();if(available.has(p.id))add(p.id)}
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();if(available.has(p.id))emit(p.id,event.key==='ArrowLeft'?'left':'right')}})
    canvas.append(el);nodes.set(p.id,el)
  })
  function updateArrivals(data){
    if(!Number.isFinite(data.currentTime)||data.currentTime<0||typeof data.cycle!=='string'||data.phase==='ending')return
    if(currentCycle!==data.cycle){currentCycle=data.cycle;reset(order.length>0||Array.from(states.values()).some(s=>s.active))}
    lastFilmTime=data.currentTime
    const added=[]
    for(const phrase of fragments)if(phrase.start<=lastFilmTime&&!available.has(phrase.id)){available.add(phrase.id);added.push(phrase.id)}
    if(!added.length)return
    layout()
    for(const id of added){const el=nodes.get(id);el.classList.remove('arriving');void el.offsetWidth;el.classList.add('arriving')}
    canvas.dataset.arrived=String(available.size)
  }
  function fit(){const v=window.visualViewport;document.documentElement.style.setProperty('--viewport-height',`${Math.round(v&&Math.abs(v.scale-1)<.01?v.height:innerHeight)}px`);requestAnimationFrame(layout)}
  if(typeof ResizeObserver==='function')new ResizeObserver(layout).observe(canvas)
  window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);document.addEventListener('fullscreenchange',fit);document.addEventListener('webkitfullscreenchange',fit);window.addEventListener('orientationchange',()=>{cancel();setTimeout(fit,150)})
  setInterval(()=>{if(lastProgressAt&&Date.now()-lastProgressAt>6000)tablet.classList.add('tide-stale')},2000)
  if(document.fonts)document.fonts.load('24px "Nanum Myeongjo"').then(()=>layout()).catch(()=>{})
  fit();renderPoem();startConnection({display:false,room,getState:snapshot,onProgress(data){if(data.phase==='ending')cancel();lastProgressAt=Date.now();updateArrivals(data);tablet.style.setProperty('--water-level',String(data.progress));tablet.classList.toggle('nearly-full',data.progress>=.9);tablet.classList.toggle('at-ending',data.phase==='ending');tablet.classList.remove('tide-stale');composer.dataset.filmProgress=String(data.progress)},onControl(data){if(data.token===poemToken)reset()}})
}
