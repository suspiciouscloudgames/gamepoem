import {passages,byId} from './content.js'
import {connectScreen} from './connection.js'
const params=new URLSearchParams(location.search)
const display=params.get('display')==='1'
const room=/^[a-zA-Z0-9_-]{1,40}$/.test(params.get('room')||'')?params.get('room'):'sinopale'
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value))
const layerRoot=document.querySelector('#layers')
const layerNodes=new Map()
function renderLayers(items) {
  const visible=new Set()
  for(const item of items) {
    if(!item || !byId.has(item.id) || item.active!==true || item.removed===true || !Number.isFinite(item.x)||!Number.isFinite(item.y)) continue
    visible.add(item.id)
    let el=layerNodes.get(item.id)
    if(!el) {
      el=document.createElement('div');el.className='layer';el.dataset.id=item.id
      const text=document.createElement('span');text.textContent=byId.get(item.id).text;el.append(text)
      layerRoot.append(el);layerNodes.set(item.id,el)
    }
    el.style.left=`${clamp(item.x,.06,.94)*100}%`
    // Keep the film's bilingual subtitle band unobstructed.
    el.style.top=`${(0.08+clamp(item.y,0,1)*.64)*100}%`
    requestAnimationFrame(()=>el.classList.add('visible'))
  }
  for(const [id,el] of layerNodes) if(!visible.has(id)) el.classList.remove('visible')
}
let network
if(display) {
  network=connectScreen({display:true,room,onState:renderLayers})
} else {
  // Load the sea only on the tablet, never in the transparent projection iframe.
  const ocean=document.querySelector('#ocean')
  ocean.muted=true
  ocean.poster=new URL('./assets/ocean-aerial-poster.jpg',import.meta.url).href
  ocean.src=new URL('./assets/ocean-aerial-loop.mp4',import.meta.url).href
  const playOcean=()=>{if(ocean.paused&&!document.hidden)ocean.play().catch(()=>{})}
  playOcean()
  // iPad power-saving policies can defer autoplay until the first touch.
  document.addEventListener('pointerdown',playOcean,{passive:true})
  document.addEventListener('visibilitychange',()=>document.hidden?ocean.pause():playOcean())
  const canvas=document.querySelector('#canvas')
  const states=new Map(passages.flat().map(p=>[p.id,{id:p.id,x:.5,y:.5,active:false,removed:false,placed:false}]))
  const nodes=new Map()
  const history=[]
  const edge=document.querySelector('#edge')
  const restore=document.querySelector('#restore')
  let chapter=0,drag=null,lastAction=Date.now(),sending=null
  const snapshot=()=>Array.from(states.values()).map(({id,x,y,active,removed})=>({id,x,y,active,removed}))
  function publish(immediate=false) {
    lastAction=Date.now()
    if(immediate){clearTimeout(sending);sending=null;network?.publish(snapshot());return}
    if(!sending)sending=setTimeout(()=>{sending=null;network?.publish(snapshot())},40)
  }
  network=connectScreen({display:false,room,getState:snapshot,onStatus:(connected,message)=>{
    const el=document.querySelector('#connection');el.textContent=connected?'스크린 연결됨':'스크린 대기 중';el.classList.toggle('connected',connected)
    document.querySelector('#connection-detail').textContent=message
  }})
  function updateNode(id) {
    const state=states.get(id),el=nodes.get(id);if(!el)return
    el.style.left=`${state.x*100}%`;el.style.top=`${state.y*100}%`
    el.classList.toggle('active',state.active);el.classList.toggle('removed',state.removed)
    el.setAttribute('aria-pressed',String(state.active));el.tabIndex=state.removed?-1:0
  }
  function layout() {
    const rect=canvas.getBoundingClientRect()
    const els=[...nodes.values()]
    const heights=els.map(el=>el.offsetHeight)
    const total=heights.reduce((a,b)=>a+b,0)
    const gap=Math.max(4,Math.min(24,(rect.height-total)/Math.max(1,els.length+1)))
    let y=Math.max(12,(rect.height-total-gap*(els.length-1))/2)
    els.forEach((el,i)=>{
      const state=states.get(el.dataset.id)
      if(!state.placed){state.x=.5+Math.sin(i*1.7)*.045;state.y=clamp((y+heights[i]/2)/rect.height,.03,.97)}
      y+=heights[i]+gap;updateNode(state.id)
    })
  }
  function renderChapter() {
    nodes.clear();canvas.replaceChildren()
    passages[chapter].forEach(p=>{
      const el=document.createElement('button');el.type='button';el.className='fragment';el.dataset.id=p.id;el.textContent=p.text;el.setAttribute('aria-label',p.text)
      el.addEventListener('pointerdown',event=>beginDrag(event,p.id))
      el.addEventListener('pointermove',moveDrag)
      el.addEventListener('pointerup',endDrag)
      el.addEventListener('pointercancel',cancelDrag)
      el.addEventListener('keydown',event=>{
        const state=states.get(p.id)
        if(event.key==='Enter'||event.key===' '){event.preventDefault();state.active=!state.active;updateNode(p.id);publish(true)}
        if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();remove(p.id);publish(true)}
        if(event.key.startsWith('Arrow')){event.preventDefault();state.x=clamp(state.x+(event.key==='ArrowRight'?.025:event.key==='ArrowLeft'?-.025:0),0,1);state.y=clamp(state.y+(event.key==='ArrowDown'?.025:event.key==='ArrowUp'?-.025:0),0,1);state.placed=true;state.active=true;updateNode(p.id);publish(true)}
      })
      canvas.append(el);nodes.set(p.id,el)
    })
    document.querySelector('#chapter').textContent=`${String(chapter+1).padStart(2,'0')} / 05`
    document.querySelector('#prev').disabled=chapter===0;document.querySelector('#next').disabled=chapter===4
    layout()
  }
  function outside(event){return event.clientX<24||event.clientX>innerWidth-24||event.clientY<35||event.clientY>innerHeight-45}
  function beginDrag(event,id) {
    if(drag||event.button!==0)return
    const state=states.get(id);if(state.removed)return
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId)
    drag={id,pointer:event.pointerId,sx:event.clientX,sy:event.clientY,original:{...state},moved:false}
    lastAction=Date.now();event.currentTarget.classList.add('dragging')
  }
  function moveDrag(event) {
    if(!drag||event.pointerId!==drag.pointer)return
    const rect=canvas.getBoundingClientRect(),state=states.get(drag.id)
    if(Math.hypot(event.clientX-drag.sx,event.clientY-drag.sy)>7)drag.moved=true
    if(!drag.moved)return
    state.x=drag.original.x+(event.clientX-drag.sx)/rect.width
    state.y=drag.original.y+(event.clientY-drag.sy)/rect.height
    state.active=true;state.placed=true
    updateNode(drag.id);nodes.get(drag.id).classList.toggle('leaving',outside(event));edge.classList.toggle('visible',outside(event));publish()
  }
  function remove(id) {
    const state=states.get(id);if(state.removed)return
    history.push({...state});state.removed=true;state.active=false
    updateNode(id);restore.disabled=false;restore.textContent=`되돌리기 ${history.length}`
  }
  function clearDrag() {
    if(drag)nodes.get(drag.id)?.classList.remove('dragging','leaving')
    drag=null;edge.classList.remove('visible')
  }
  function endDrag(event) {
    if(!drag||event.pointerId!==drag.pointer)return
    const state=states.get(drag.id)
    if(drag.moved&&outside(event))remove(drag.id)
    else if(!drag.moved){state.active=!state.active;updateNode(drag.id)}
    else {state.x=clamp(state.x,.05,.95);state.y=clamp(state.y,.04,.96);updateNode(drag.id)}
    clearDrag();publish(true)
  }
  function cancelDrag(event) {
    if(!drag||event.pointerId!==drag.pointer)return
    Object.assign(states.get(drag.id),drag.original);updateNode(drag.id);clearDrag();publish(true)
  }
  document.querySelector('#prev').onclick=()=>{chapter--;renderChapter();lastAction=Date.now()}
  document.querySelector('#next').onclick=()=>{chapter++;renderChapter();lastAction=Date.now()}
  restore.onclick=()=>{const previous=history.pop();if(!previous)return;Object.assign(states.get(previous.id),previous,{removed:false,placed:false,active:false});chapter=byId.get(previous.id).chapter;renderChapter();restore.disabled=!history.length;restore.textContent=history.length?`되돌리기 ${history.length}`:'되돌리기';publish(true)}
  function reset(){clearDrag();states.forEach(s=>Object.assign(s,{active:false,removed:false,placed:false}));history.length=0;chapter=0;restore.disabled=true;restore.textContent='되돌리기';renderChapter();publish(true)}
  document.querySelector('#reset').onclick=reset
  document.querySelector('#fullscreen').onclick=()=>{document.documentElement.requestFullscreen?.().catch(()=>{})}
  const help=document.querySelector('#help')
  document.querySelector('#connection').onclick=()=>help.showModal()
  document.querySelector('#room').value=room
  const screenUrl=new URL(['localhost','127.0.0.1'].includes(location.hostname)?'http://127.0.0.1:5174/video/index.html':'/rfsinopale/video/',location.origin);screenUrl.searchParams.set('room',room)
  document.querySelector('#screen-link').href=screenUrl.href
  document.querySelector('#room-form').onsubmit=event=>{event.preventDefault();const url=new URL(location.href);url.searchParams.set('room',document.querySelector('#room').value);location.href=url.href}
  new ResizeObserver(()=>{layout();network?.publish(snapshot())}).observe(canvas)
  setInterval(()=>{if(Date.now()-lastAction>90000&&!drag&&!help.open)reset()},1000)
  renderChapter()
}
window.addEventListener('pagehide',()=>network?.close())

window.addEventListener('pageshow',event=>{if(event.persisted)location.reload()})
