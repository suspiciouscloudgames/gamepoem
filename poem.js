import {pilePosition,directionAt,clamp} from './interaction.js?v=portrait1'
export function setupPoem({fragments,canvas,startConnection,send,room}){
  const tablet=document.querySelector('#tablet'),nodes=new Map(),states=new Map(),order=[]
  let selected=null,choiceTimer=0,endingTimer=0,drag=null,lastAction=Date.now(),ending=false
  const svg=(path)=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`
  const pen=svg('M5 19h14 M6 15l1-4 9-9 4 4-9 9-5 1 M14 4l4 4')
  const check=svg('M5 12l5 5 9-10')
  const replay=svg('M5 8a8 8 0 1 1-1 7 M5 3v5h5')
  const composer=document.createElement('section');composer.id='poem-composer';composer.setAttribute('aria-label','시 정렬')
  composer.innerHTML=`<div id="poem-lines"></div><button id="poem-finish" aria-label="시 완성">${check}</button>`
  const chooser=document.createElement('div');chooser.id='phrase-choice';chooser.hidden=true
  chooser.innerHTML=`<button class="choice-dismiss" aria-label="선택 취소"></button><div class="choice-wheel" role="dialog" aria-label="어구 선택"><div class="choice-phrase"></div><button data-send="up" aria-label="위로 보내기">↑</button><button data-send="left" aria-label="왼쪽으로 보내기">←</button><button data-send="right" aria-label="오른쪽으로 보내기">→</button><button data-send="down" aria-label="아래로 보내기">↓</button><button class="choice-write" aria-label="시에 넣기">${pen}</button></div>`
  const end=document.createElement('section');end.id='poem-ending';end.hidden=true
  end.innerHTML=`<div id="finished-poem"></div><button id="poem-restart" aria-label="처음으로">${replay}</button><div class="ending-progress"></div>`
  tablet.append(composer,chooser,end)
  const lines=composer.querySelector('#poem-lines'),finish=composer.querySelector('#poem-finish')
  const snapshot=()=>Array.from(states.values()).filter(s=>s.active).map(({id,x,y,active,removed,direction,sentAt,energy})=>({id,x,y,active,removed,direction,sentAt,energy}))
  function publish(){lastAction=Date.now();send(snapshot())}
  function clearChoice(){clearTimeout(choiceTimer);selected=null;chooser.hidden=true;tablet.classList.remove('choosing');nodes.forEach(el=>el.classList.remove('picked'))}
  function choose(id){
    clearChoice();if(ending)return
    selected=id;lastAction=Date.now();chooser.querySelector('.choice-phrase').textContent=states.get(id).text
    chooser.hidden=false;tablet.classList.add('choosing');nodes.get(id).classList.add('picked')
    choiceTimer=setTimeout(clearChoice,7000)
  }
  function removeFromPoem(id){const i=order.indexOf(id);if(i>=0)order.splice(i,1)}
  function emit(id,direction){
    removeFromPoem(id);Object.assign(states.get(id),{active:true,removed:true,direction,sentAt:Date.now(),energy:.8})
    tablet.dataset.lastDirection=direction;clearChoice();renderPoem();layout();publish()
  }
  function add(id){if(!order.includes(id))order.push(id);Object.assign(states.get(id),{active:false,removed:false,direction:null,sentAt:0});clearChoice();renderPoem();layout();publish()}
  function renderPoem(){
    lines.textContent='';composer.classList.toggle('has-lines',order.length>0);finish.hidden=order.length<2
    order.forEach((id,i)=>{
      const el=document.createElement('button');el.className='poem-line';el.dataset.id=id;el.setAttribute('aria-label',states.get(id).text)
      el.innerHTML='<span class="line-grip" aria-hidden="true">⠿</span><span></span>';el.lastChild.textContent=states.get(id).text
      el.addEventListener('pointerdown',event=>begin(event,id,true));el.addEventListener('pointermove',move);el.addEventListener('pointerup',release);el.addEventListener('pointercancel',cancel)
      el.addEventListener('keydown',event=>{
        if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(id)}
        if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();const target=clamp(i+(event.key==='ArrowUp'?-1:1),0,order.length-1);order.splice(i,1);order.splice(target,0,id);renderPoem();lastAction=Date.now()}
      });lines.append(el)
    })
    lines.scrollTop=lines.scrollHeight
  }
  function layout(){
    const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return
    const portrait=rect.height>rect.width,size=portrait?clamp(rect.width/31,19,27):clamp(rect.width/40,19,28)
    for(const [id,el] of nodes){
      const state=states.get(id),p=pilePosition(state.index,portrait)
      state.x=p.x;state.y=.43+(p.y-.26)*.65
      el.style.fontSize=`${size}px`;el.style.setProperty('--tilt',`${p.angle}deg`);el.style.setProperty('--depth-scale',p.scale);el.style.setProperty('--lean',`${(p.depth-50)*.35}deg`);el.style.setProperty('--depth-opacity',.7+p.depth*.003);el.style.zIndex=p.depth
      if(el.scrollWidth>rect.width*.72)el.style.fontSize=`${size*rect.width*.72/el.scrollWidth}px`
      const a=Math.abs(p.angle)*Math.PI/180,half=(el.offsetWidth*Math.cos(a)+el.offsetHeight*Math.sin(a))*p.scale/2
      state.x=clamp(state.x,.06+half/rect.width,.94-half/rect.width)
      el.style.left=`${state.x*100}%`;el.style.top=`${state.y*100}%`
      el.classList.toggle('removed',state.removed||order.includes(id));el.tabIndex=state.removed||order.includes(id)?-1:0
    }
  }
  function begin(event,id,inPoem=false){
    if(drag||ending||selected||event.button!==0)return
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId)
    drag={id,inPoem,pointer:event.pointerId,x:event.clientX,y:event.clientY,el:event.currentTarget,moved:false}
    lastAction=Date.now();drag.el.classList.add('dragging')
  }
  function move(event){
    if(!drag||drag.pointer!==event.pointerId)return
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y
    if(Math.hypot(dx,dy)>8)drag.moved=true
    if(!drag.moved)return
    drag.el.style.transform=drag.inPoem?`translate(${dx}px,${dy}px)`:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`
    composer.classList.toggle('receiving',inside(event,composer))
  }
  function inside(event,el){const r=el.getBoundingClientRect();return event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom}
  function cancel(){if(drag){drag.el.style.transform='';drag.el.classList.remove('dragging')}drag=null;composer.classList.remove('receiving');layout()}
  function release(event){
    if(!drag||drag.pointer!==event.pointerId)return
    const d=drag,r=tablet.getBoundingClientRect(),direction=directionAt((event.clientX-r.left)/r.width,(event.clientY-r.top)/r.height)
    cancel()
    if(!d.moved){choose(d.id);return}
    if(inside(event,composer)&&!finish.hidden&&inside(event,finish)){layout();return}
    if(inside(event,composer)){
      if(!d.inPoem){add(d.id);return}
      const remaining=order.filter(id=>id!==d.id)
      let at=remaining.findIndex(id=>{const box=lines.querySelector(`[data-id="${id}"]`).getBoundingClientRect();return event.clientY<box.top+box.height/2})
      if(at<0)at=remaining.length
      remaining.splice(at,0,d.id);order.splice(0,order.length,...remaining);renderPoem();lastAction=Date.now()
    }else if(direction)emit(d.id,direction)
    // A release in unmarked water commits nothing: return to the original place.
  }
  function reset(){clearTimeout(endingTimer);clearChoice();cancel();ending=false;end.hidden=true;tablet.classList.remove('ending');order.length=0;states.forEach(s=>Object.assign(s,{active:false,removed:false,direction:null,sentAt:0}));renderPoem();layout();publish()}
  finish.addEventListener('click',()=>{
    if(order.length<2)return
    clearChoice();ending=true;tablet.classList.add('ending');const poem=end.querySelector('#finished-poem');poem.textContent=''
    order.forEach(id=>{const line=document.createElement('p');line.textContent=states.get(id).text;poem.append(line)})
    end.hidden=false;endingTimer=setTimeout(reset,12000)
  })
  end.querySelector('#poem-restart').addEventListener('click',reset)
  chooser.querySelector('.choice-dismiss').addEventListener('click',clearChoice)
  chooser.querySelector('.choice-write').addEventListener('click',()=>{if(selected)add(selected)})
  chooser.querySelectorAll('[data-send]').forEach(button=>button.addEventListener('click',()=>{if(selected)emit(selected,button.dataset.send)}))
  document.addEventListener('keydown',event=>{if(event.key==='Escape')clearChoice()})
  canvas.textContent=''
  fragments.forEach((p,index)=>{
    states.set(p.id,{id:p.id,index,text:p.text,x:.5,y:.5,active:false,removed:false,direction:null,sentAt:0,energy:.5})
    const el=document.createElement('button');el.className='fragment';el.textContent=p.text;el.dataset.id=p.id
    el.addEventListener('pointerdown',event=>begin(event,p.id));el.addEventListener('pointermove',move);el.addEventListener('pointerup',release);el.addEventListener('pointercancel',cancel)
    el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(p.id)}})
    canvas.append(el);nodes.set(p.id,el)
  })
  function fit(){const v=window.visualViewport;document.documentElement.style.setProperty('--viewport-height',`${Math.round(v&&Math.abs(v.scale-1)<.01?v.height:innerHeight)}px`);requestAnimationFrame(layout)}
  if(typeof ResizeObserver==='function')new ResizeObserver(layout).observe(canvas)
  window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);document.addEventListener('fullscreenchange',fit);document.addEventListener('webkitfullscreenchange',fit);window.addEventListener('orientationchange',()=>{cancel();clearChoice();setTimeout(fit,150)})
  setInterval(()=>{if(!ending&&!drag&&Date.now()-lastAction>90000)reset()},1000)
  fit();renderPoem();startConnection({display:false,room,getState:snapshot})
}
