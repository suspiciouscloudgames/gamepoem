// Exhibition tablet: allow vertical poem scrolling, but not page zoom gestures.
export function installTabletTouchGuard(onInterrupt){
  document.documentElement.classList.add('tablet-kiosk')
  const viewport=document.querySelector('meta[name="viewport"]')
  viewport?.setAttribute('content','width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover')
  let multiTouch=false,ignoreClickUntil=0
  const pointers=new Set()
  function block(event){if(event.cancelable)event.preventDefault();event.stopImmediatePropagation()}
  for(const type of ['pointerdown','pointerup','pointercancel'])document.addEventListener(type,event=>{
    if(event.pointerType!=='touch')return
    if(type==='pointerdown')pointers.add(event.pointerId)
    if(pointers.size>1&&!multiTouch){multiTouch=true;onInterrupt()}
    if(multiTouch||Date.now()<ignoreClickUntil)block(event)
    if(type!=='pointerdown'){
      pointers.delete(event.pointerId)
      if(multiTouch&&!pointers.size){multiTouch=false;ignoreClickUntil=Date.now()+400}
    }
  },{passive:false,capture:true})
  function gesture(event){block(event);onInterrupt()}
  document.addEventListener('gesturestart',gesture,{passive:false,capture:true})
  document.addEventListener('gesturechange',gesture,{passive:false,capture:true})
  function touch(event){
    if(Date.now()<ignoreClickUntil){block(event);return}
    if(event.touches.length>1&&!multiTouch){multiTouch=true;onInterrupt()}
    if(!multiTouch)return
    block(event)
    if(!event.touches.length){multiTouch=false;ignoreClickUntil=Date.now()+400}
  }
  for(const type of ['touchstart','touchmove','touchend','touchcancel'])document.addEventListener(type,touch,{passive:false,capture:true})
  document.addEventListener('click',event=>{if(multiTouch||Date.now()<ignoreClickUntil)block(event)},{capture:true})
  document.addEventListener('dblclick',event=>{if(event.cancelable)event.preventDefault()},{passive:false})
  const reset=()=>{multiTouch=false;pointers.clear();ignoreClickUntil=0}
  window.addEventListener('blur',reset)
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset()})
}

export function tabletViewportHeight(){
  const viewport=window.visualViewport
  // Pinch zoom reduces visualViewport.height; undo the scale for layout sizing.
  return Math.round(viewport?viewport.height*(viewport.scale||1):window.innerHeight)
}
