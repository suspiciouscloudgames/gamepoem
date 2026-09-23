// Listen outside individual buttons: they can be replaced during a gesture.
export function bindDragRecovery(host,doc,current,{move,release,cancel}){
  const owned=event=>current()?.pointer===event.pointerId
  host.addEventListener('pointermove',event=>{if(owned(event))move(event)})
  host.addEventListener('pointerup',event=>{if(owned(event))release(event)})
  host.addEventListener('pointercancel',event=>{if(owned(event))cancel()})
  host.addEventListener('lostpointercapture',event=>{
    if(owned(event)&&event.target===current()?.el)cancel()
  })
  host.addEventListener('blur',()=>{if(current())cancel()})
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden&&current())cancel()})
}
