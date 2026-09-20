import {passages,byId} from './content.js'
import {connectScreen} from './connection.js?v=autolink2'
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
  const edge=document.querySelector('#edge')
  let drag=null,lastAction=Date.now(),sending=null
  const snapshot=()=>Array.from(states.values()).map(({id,x,y,active,removed})=>({id,x,y,active,removed}))
  function publish(immediate=false) {
    lastAction=Date.now()
    if(immediate){clearTimeout(sending);sending=null;network?.publish(snapshot());return}
    if(!sending)sending=setTimeout(()=>{sending=null;network?.publish(snapshot())},40)
  }
  network=connectScreen({display:false,room,getState:snapshot})
  function updateNode(id) {
    const state=states.get(id),el=nodes.get(id);if(!el)return
    el.style.left=`${state.x*100}%`;el.style.top=`${state.y*100}%`
    el.classList.toggle('active',state.active);el.classList.toggle('removed',state.removed)
    el.setAttribute('aria-pressed',String(state.active));el.tabIndex=state.removed?-1:0
  }
  function layout() {
    const rect=canvas.getBoundingClientRect()
    if(!rect.width||!rect.height)return
    const els=[...nodes.values()]
    const columns=rect.width>rect.height*1.15?3:2
    const gutter=18, width=(rect.width-gutter*(columns-1))/columns
    els.forEach(el=>{el.style.width=`${width}px`;el.style.maxWidth='none'})
    let positions=[],bottoms=[]
    // Measure all sentences together, so no paragraph requires another screen.
    for(let font=Math.max(14,Math.min(19,rect.width/52));font>=10;font-=.5) {
      canvas.style.setProperty('--sentence-size',`${font}px`)
      bottoms=Array(columns).fill(10);positions=[]
      for(const el of els) {
        const column=bottoms.indexOf(Math.min(...bottoms)),height=el.offsetHeight
        positions.push({x:(column*(width+gutter)+width/2)/rect.width,y:(bottoms[column]+height/2)/rect.height})
        bottoms[column]+=height+8
      }
      if(Math.max(...bottoms)<=rect.height-10)break
    }
    const spare=Math.max(0,(rect.height-Math.max(...bottoms))/2)
    els.forEach((el,i)=>{
      const state=states.get(el.dataset.id)
      if(!state.placed){state.x=positions[i].x;state.y=positions[i].y+spare/rect.height}
      updateNode(state.id)
    })
  }
  function renderField() {
    nodes.clear();canvas.replaceChildren()
    passages.flat().forEach(p=>{
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
    state.removed=true;state.active=false
    updateNode(id)
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
  new ResizeObserver(layout).observe(canvas)
  setInterval(()=>{if(Date.now()-lastAction>90000&&!drag){clearDrag();states.forEach(s=>Object.assign(s,{active:false,removed:false,placed:false}));renderField();lastAction=Date.now()}},1000)
  renderField()
}
window.addEventListener('pagehide',()=>network?.close())

window.addEventListener('pageshow',event=>{if(event.persisted)location.reload()})
