// Exhibition tablet: allow vertical poem scrolling, but not page zoom gestures.
export function installTabletTouchGuard(onInterrupt){
  document.documentElement.classList.add('tablet-kiosk')
  const viewport=document.querySelector('meta[name="viewport"]')
  viewport?.setAttribute('content','width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover')
  let multiTouch=false,ignoreClickUntil=0
  function block(event){if(event.cancelable)event.preventDefault();event.stopImmediatePropagation()}
  function gesture(event){block(event);onInterrupt()}
  document.addEventListener('gesturestart',gesture,{passive:false,capture:true})
  document.addEventListener('gesturechange',gesture,{passive:false,capture:true})
  function touch(event){
    if(event.touches.length>1&&!multiTouch){multiTouch=true;onInterrupt()}
    if(!multiTouch)return
    block(event)
    if(!event.touches.length){multiTouch=false;ignoreClickUntil=Date.now()+400}
  }
  for(const type of ['touchstart','touchmove','touchend','touchcancel'])document.addEventListener(type,touch,{passive:false,capture:true})
  document.addEventListener('click',event=>{if(multiTouch||Date.now()<ignoreClickUntil)block(event)},{capture:true})
  document.addEventListener('dblclick',event=>{if(event.cancelable)event.preventDefault()},{passive:false})
  window.addEventListener('blur',()=>{multiTouch=false})
}

export function tabletViewportHeight(){
  const viewport=window.visualViewport
  // Pinch zoom reduces visualViewport.height; undo the scale for layout sizing.
  return Math.round(viewport?viewport.height*(viewport.scale||1):window.innerHeight)
}
