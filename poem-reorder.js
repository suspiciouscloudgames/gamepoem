// Pointer events support both a finger on iPad and a mouse on desktop.
export function enablePoemReorder(container, scroller, {disabled, onChange, onStart}) {
  let drag=null,frame=0
  const items=()=>[...container.children]
  function position(){
    if(!drag?.ghost)return
    const d=drag
    d.ghost.style.top=`${d.y-d.offset}px`
    const others=items().filter(node=>node!==d.line)
    const next=others.find(node=>{const r=node.getBoundingClientRect();return d.y<r.top+r.height/2})
    container.insertBefore(d.line,next||null)
  }
  function tick(){
    if(!drag?.ghost)return
    const bounds=scroller.getBoundingClientRect(),y=drag.y
    const speed=y<bounds.top+48?-Math.min(12,(bounds.top+48-y)/4):y>bounds.bottom-48?Math.min(12,(y-bounds.bottom+48)/4):0
    scroller.scrollTop+=speed
    position();frame=requestAnimationFrame(tick)
  }
  function finish(commit=false){
    if(!drag)return
    const d=drag;drag=null;cancelAnimationFrame(frame)
    const changed=items().some((node,i)=>node!==d.order[i])
    if(!commit)d.order.forEach(node=>container.append(node))
    d.line.classList.remove('poem-placeholder');d.ghost?.remove()
    scroller.setAttribute('aria-live','polite')
    try{container.releasePointerCapture(d.pointer)}catch{}
    if(commit&&changed)onChange()
  }
  container.addEventListener('pointerdown',e=>{
    if(e.target.closest('button'))return
    const line=e.target.closest('[data-sentence-id]')
    if(!line||disabled()||drag||e.button>0)return
    onStart?.()
    const r=line.getBoundingClientRect()
    drag={line,pointer:e.pointerId,order:items(),start:e.clientY,y:e.clientY,offset:e.clientY-r.top,rect:r}
    try{container.setPointerCapture(e.pointerId)}catch{finish();return}
  })
  window.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.pointer)return
    e.preventDefault();drag.y=e.clientY
    if(!drag.ghost&&Math.abs(drag.y-drag.start)>5){
      const ghost=drag.line.cloneNode(true)
      ghost.removeAttribute('data-sentence-id');ghost.removeAttribute('tabindex');ghost.setAttribute('aria-hidden','true')
      ghost.classList.add('poem-drag-ghost')
      ghost.style.cssText=`position:fixed;left:${drag.rect.left}px;width:${drag.rect.width}px;top:${drag.rect.top}px`
      scroller.append(ghost);drag.ghost=ghost
      drag.line.classList.add('poem-placeholder');scroller.setAttribute('aria-live','off');tick()
    }
    position()
  },{passive:false})
  window.addEventListener('pointerup',e=>{if(e.pointerId===drag?.pointer)finish(true)})
  window.addEventListener('pointercancel',e=>{if(e.pointerId===drag?.pointer)finish()})
  container.addEventListener('lostpointercapture',e=>{if(e.pointerId===drag?.pointer)finish()})
  window.addEventListener('blur',()=>finish())
  document.addEventListener('visibilitychange',()=>{if(document.hidden)finish()})
  container.addEventListener('keydown',e=>{
    if(e.target.closest('button'))return
    const line=e.target.closest('[data-sentence-id]')
    if(e.key==='Escape'){finish();return}
    if(!line||disabled()||drag||!['ArrowUp','ArrowDown'].includes(e.key))return
    e.preventDefault()
    const sibling=e.key==='ArrowUp'?line.previousElementSibling:line.nextElementSibling
    if(!sibling)return
    container.insertBefore(line,e.key==='ArrowUp'?sibling:sibling.nextElementSibling)
    line.focus({preventScroll:true});line.scrollIntoView({block:'nearest'});onChange()
  })
  return {cancel:()=>finish()}
}
