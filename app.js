import {connectPoemEnding} from './projection-poem.js?v=phrase-without-demonstrative1'
import {setupBlackout} from './blackout.js?v=phrase-without-demonstrative1'
import {fragmentById as byId} from './blackout-content.js?v=phrase-without-demonstrative1'
import {isEmission,clamp} from './interaction.js?v=portrait1'
import {createSeaEffects} from './effects.js?v=pulmo1'
const params=new URLSearchParams(location.search)
const display=params.get('display')==='1'
const room=/^[a-zA-Z0-9_-]{1,40}$/.test(params.get('room')||'')?params.get('room'):'sinopale'
const layerRoot=document.querySelector('#layers')
const layerNodes=new Map()
let displayedItems=[]
let effects=null
let poemEnding=null
const cameraEvents=new Set()
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
  poemEnding?.set(items)
  for(const item of items){
    if(!isEmission(item)||!['left','right'].includes(item.direction))continue
    const eventId=`${item.id}:${item.sentAt}`
    if(cameraEvents.has(eventId))continue
    cameraEvents.add(eventId);if(cameraEvents.size>256)cameraEvents.delete(cameraEvents.values().next().value)
    if(parent!==window&&document.referrer)parent.postMessage({type:'film-camera',direction:item.direction,eventId},new URL(document.referrer).origin)
  }
  displayedItems=items.filter(item=>item&&!['left','right'].includes(item.direction)&&byId.has(item.id)&&Number.isFinite(item.x)&&Number.isFinite(item.y))
  effects?.set(displayedItems.filter(item=>isEmission(item)).map(item=>({...item,text:byId.get(item.id).text})))
  refreshLayerText()
}
let network,pendingState,disposed=false
const pendingTriggers=[],knownLines=new Set()
function publishPoem(items){
  if(!items.length)knownLines.clear()
  for(const fill of items.find(item=>item.kind==='poem')?.fills||[]){
    if(knownLines.has(fill.lineId))continue
    knownLines.add(fill.lineId)
    if(network)network.publishTrigger(fill.sentenceId);else pendingTriggers.push(fill.sentenceId)
  }
  if(network)network.publish(items);else pendingState=items
}
async function startConnection(options) {
  // Render the artwork before loading the network library or opening a socket.
  try {
    const [transport]=await Promise.all([
      import('./connection.js?v=two-projectors1'),
      new Promise((resolve,reject)=>{
        if(typeof window.Peer==='function'){resolve();return}
        const script=document.createElement('script')
        script.src=new URL('./vendor/peerjs-ios14.min.js',import.meta.url).href
        script.onload=resolve;script.onerror=reject;document.head.appendChild(script)
      })
    ])
    if(disposed)return
    network=transport.connectScreen(options)
    for(const id of pendingTriggers.splice(0))network.publishTrigger(id)
    if(pendingState){network.publish(pendingState);pendingState=null}
  } catch {
    document.documentElement.dataset.screenConnection='waiting'
    if(!disposed)setTimeout(()=>startConnection(options),5000)
  }
}
if(display) {
  poemEnding=connectPoemEnding({byId,complete:token=>network?.completePoem(token),progress:(value,phase,time,cycle)=>network?.reportProgress(value,phase,time,cycle)})
  effects=createSeaEffects(layerRoot)
  setInterval(refreshLayerText,250)
  const acknowledgements=new Map(),screenSession=params.get('screenSession')
  const parentOrigin=parent!==window&&document.referrer?new URL(document.referrer).origin:null
  window.addEventListener('message',event=>{
    if(event.source!==parent||event.origin!==parentOrigin||event.data?.type!=='sentence-ack'||event.data.sessionId!==screenSession)return
    acknowledgements.get(event.data.eventId)?.();acknowledgements.delete(event.data.eventId)
  })
  startConnection({display:true,room,onState:renderLayers,screenSession:parentOrigin?screenSession:null,onTrigger(event,ack){
    if(!parentOrigin)return
    acknowledgements.set(event.eventId,ack)
    parent.postMessage({type:'sentence-trigger',event,room},parentOrigin)
  }})
} else {
  setupBlackout({room,startConnection,
    send:publishPoem})

}
window.addEventListener('pagehide',()=>{disposed=true;network?.close()})

window.addEventListener('pageshow',event=>{if(event.persisted)location.reload()})
