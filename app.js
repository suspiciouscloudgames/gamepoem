import {fragments,fragmentById as byId} from './content.js?v=phrase1'
import {pilePosition,directionAt,isEmission,clamp} from './interaction.js?v=phrase1'
import {createSeaEffects} from './effects.js?v=phrase1'
const params=new URLSearchParams(location.search)
const display=params.get('display')==='1'
const room=/^[a-zA-Z0-9_-]{1,40}$/.test(params.get('room')||'')?params.get('room'):'sinopale'
const layerRoot=document.querySelector('#layers')
const layerNodes=new Map()
let displayedItems=[]
let effects=null
function refreshLayerText() {
  const visible=new Set()
  for(const item of displayedItems) {
    const emitted=isEmission(item)
    if(!item.active || (item.removed&&!emitted) || (item.direction&&!emitted))continue
    visible.add(item.id)
    let el=layerNodes.get(item.id)
    if(!el){el=document.createElement('div');el.className='layer';el.dataset.id=item.id;el.textContent=byId.get(item.id).text;layerRoot.append(el);layerNodes.set(item.id,el)}
    el.className=`layer visible${emitted?' direction-'+item.direction:''}`
    const x=emitted?{up:.5,down:.5,left:.3,right:.7}[item.direction]:clamp(item.x,.15,.85)
    const y=emitted?{up:.22,down:.65,left:.4,right:.42}[item.direction]:.08+clamp(item.y,0,1)*.6
    el.style.left=`${x*100}%`;el.style.top=`${y*100}%`
    if(emitted&&el.dataset.sentAt!==String(item.sentAt)){el.dataset.sentAt=String(item.sentAt);el.style.setProperty('--phase',`${Math.max(0,Date.now()-item.sentAt)/1000}s`)}
  }
  for(const [id,el] of layerNodes)if(!visible.has(id))el.className='layer'
}
function renderLayers(items) {
  displayedItems=items.filter(item=>item&&byId.has(item.id)&&Number.isFinite(item.x)&&Number.isFinite(item.y))
  effects?.set(displayedItems.filter(item=>isEmission(item)).map(item=>({...item,text:byId.get(item.id).text})))
  refreshLayerText()
}
let network,pendingState,disposed=false
async function startConnection(options) {
  // Render the artwork before loading the network library or opening a socket.
  try {
    const [transport]=await Promise.all([
      import('./connection.js?v=phrase1'),
      new Promise((resolve,reject)=>{
        if(typeof window.Peer==='function'){resolve();return}
        const script=document.createElement('script')
        script.src=new URL('./vendor/peerjs-ios14.min.js',import.meta.url).href
        script.onload=resolve;script.onerror=reject;document.head.appendChild(script)
      })
    ])
    if(disposed)return
    network=transport.connectScreen(options)
    if(pendingState){network.publish(pendingState);pendingState=null}
  } catch {
    document.documentElement.dataset.screenConnection='waiting'
    if(!disposed)setTimeout(()=>startConnection(options),5000)
  }
}
if(display) {
  effects=createSeaEffects(layerRoot)
  setInterval(refreshLayerText,250)
  startConnection({display:true,room,onState:renderLayers})
} else {
  // Load the sea only on the tablet, never in the transparent projection iframe.
  const ocean=document.querySelector('#ocean')
  ocean.muted=true
  ocean.poster=new URL('./assets/ocean-aerial-poster.jpg',import.meta.url).href
  ocean.src=new URL('./assets/ocean-aerial-loop.mp4',import.meta.url).href
  let started=false
  const playOcean=()=>{if(started&&ocean.paused&&!document.hidden)ocean.play().catch(()=>{})}
  // iPad power-saving policies can defer autoplay until the first touch.
  document.addEventListener('pointerdown',playOcean,{passive:true})
  document.addEventListener('visibilitychange',()=>document.hidden?ocean.pause():playOcean())
  document.querySelector('#begin').addEventListener('click',()=>{
    const root=document.documentElement
    // iPad Safari before 16.4 uses the prefixed document fullscreen API.
    const fullscreen=root.requestFullscreen||root.webkitRequestFullscreen||root.webkitRequestFullScreen
    if(fullscreen&&!navigator.standalone){try{const result=fullscreen.call(root);result?.catch(()=>{})}catch{}}
    started=true;ocean.loop=true;ocean.muted=true
    document.querySelector('#tablet').classList.add('running')
    ocean.play().catch(()=>{started=false;document.querySelector('#tablet').classList.remove('running')})
  })
  const canvas=document.querySelector('#canvas')
  const states=new Map(fragments.map((p,index)=>[p.id,{id:p.id,index,x:.5,y:.5,active:false,removed:false,placed:false,direction:null,sentAt:0,energy:.5}]))
  const nodes=new Map()
  const edge=document.querySelector('#edge')
  let drag=null,lastAction=Date.now(),sending=null
  const snapshot=()=>Array.from(states.values()).filter(s=>s.active).map(({id,x,y,active,removed,direction,sentAt,energy})=>({id,x,y,active,removed,direction,sentAt,energy}))
  function publish(immediate=false) {
    lastAction=Date.now()
    if(immediate){clearTimeout(sending);sending=null;sendState();return}
    if(!sending)sending=setTimeout(()=>{sending=null;sendState()},40)
  }
  function sendState(){const items=snapshot();if(network)network.publish(items);else pendingState=items}
  function updateNode(id) {
    const state=states.get(id),el=nodes.get(id);if(!el)return
    el.style.left=`${state.x*100}%`;el.style.top=`${state.y*100}%`
    el.classList.toggle('active',state.active);el.classList.toggle('removed',state.removed)
    el.setAttribute('aria-pressed',String(state.active));el.tabIndex=state.removed?-1:0
  }
  function layout() {
    const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return
    canvas.style.setProperty('--sentence-size',`${clamp(rect.width/40,19,28)}px`)
    for(const [id,el] of nodes){
      const state=states.get(id),pile=pilePosition(state.index)
      if(!state.placed){state.x=pile.x;state.y=pile.y}
      el.style.setProperty('--tilt',`${pile.angle}deg`)
      el.style.setProperty('--depth-scale',pile.scale)
      el.style.setProperty('--lean',`${(pile.depth-50)*.35}deg`)
      el.style.setProperty('--depth-opacity',.62+pile.depth*.0038)
      el.style.zIndex=String(pile.depth)
      updateNode(id)
    }
  }
  function renderField() {
    nodes.clear();canvas.textContent=''
    fragments.forEach(p=>{
      const el=document.createElement('button');el.type='button';el.className='fragment';el.dataset.id=p.id;el.textContent=p.text;el.setAttribute('aria-label',p.text)
      el.addEventListener('pointerdown',event=>beginDrag(event,p.id))
      el.addEventListener('pointermove',moveDrag)
      el.addEventListener('pointerup',endDrag)
      el.addEventListener('pointercancel',cancelDrag)
      el.addEventListener('keydown',event=>{
        const state=states.get(p.id)
        if(event.key==='Enter'||event.key===' '){event.preventDefault();state.active=!state.active;state.direction=null;state.sentAt=0;updateNode(p.id);publish(true)}
        if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();remove(p.id);publish(true)}
        if(event.key.startsWith('Arrow')){event.preventDefault();emit(p.id,{ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[event.key]);publish(true)}
      })
      canvas.append(el);nodes.set(p.id,el)
    })
    layout()
  }
  function targetDirection(event){const rect=canvas.getBoundingClientRect();return directionAt((event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height)}
  function emit(id,direction){
    if(!direction)return
    const state=states.get(id)
    state.direction=direction;state.sentAt=Date.now();state.active=true;state.removed=true;state.placed=true
    updateNode(id)
    document.querySelector('#tablet').dataset.lastDirection=direction
  }
  function beginDrag(event,id) {
    if(drag||event.button!==0)return
    const state=states.get(id);if(state.removed)return
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);event.currentTarget.style.zIndex='1000'
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
    state.active=true;state.placed=true;state.direction=null;state.sentAt=0
    state.energy=clamp(Math.hypot(event.clientX-drag.sx,event.clientY-drag.sy)/Math.max(rect.width,rect.height),.2,1)
    const direction=targetDirection(event)
    updateNode(drag.id);nodes.get(drag.id).classList.toggle('leaving',!!direction);edge.classList.toggle('visible',!!direction);edge.dataset.direction=direction||'';publish()
  }
  function remove(id) {
    const state=states.get(id);if(state.removed)return
    state.removed=true;state.active=false
    updateNode(id)
  }
  function clearDrag() {
    if(drag)nodes.get(drag.id)?.classList.remove('dragging','leaving')
    drag=null;edge.classList.remove('visible');delete edge.dataset.direction
  }
  function endDrag(event) {
    if(!drag||event.pointerId!==drag.pointer)return
    const state=states.get(drag.id)
    if(drag.moved&&targetDirection(event))emit(drag.id,targetDirection(event))
    else if(!drag.moved){state.active=!state.active;state.direction=null;state.sentAt=0;updateNode(drag.id)}
    else {state.x=clamp(state.x,.05,.95);state.y=clamp(state.y,.04,.96);updateNode(drag.id)}
    clearDrag();publish(true)
  }
  function cancelDrag(event) {
    if(!drag||event.pointerId!==drag.pointer)return
    Object.assign(states.get(drag.id),drag.original);updateNode(drag.id);clearDrag();publish(true)
  }
  function fitViewport(){
    const viewport=window.visualViewport
    const height=viewport&&Math.abs(viewport.scale-1)<.01?viewport.height:window.innerHeight
    document.documentElement.style.setProperty('--viewport-height',`${Math.round(height)}px`)
    requestAnimationFrame(layout)
  }
  if(typeof ResizeObserver==='function')new ResizeObserver(layout).observe(canvas)
  window.addEventListener('resize',fitViewport)
  document.addEventListener('fullscreenchange',fitViewport)
  document.addEventListener('webkitfullscreenchange',fitViewport)
  window.addEventListener('orientationchange',()=>{clearDrag();setTimeout(fitViewport,150)})
  window.visualViewport?.addEventListener('resize',fitViewport)
  fitViewport()
  setInterval(()=>{if(Date.now()-lastAction>90000&&!drag){clearDrag();states.forEach(s=>Object.assign(s,{active:false,removed:false,placed:false,direction:null,sentAt:0}));renderField();lastAction=Date.now()}},1000)
  renderField()
  startConnection({display:false,room,getState:snapshot})
}
window.addEventListener('pagehide',()=>{disposed=true;network?.close()})

window.addEventListener('pageshow',event=>{if(event.persisted)location.reload()})
