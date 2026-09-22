import {composeSentence} from './korean-particles.js?v=particles1'
// The film owns the ending timing; the tablet supplies ordered phrase IDs.
export function connectPoemEnding({byId,complete,progress}){
  let latest=null,showing=false
  const ending=document.createElement('section');ending.id='projection-poem';ending.hidden=true
  const paper=document.createElement('div');ending.append(paper);document.body.append(ending)
  const parentOrigin=document.referrer?new URL(document.referrer).origin:location.origin
  const reply=data=>parent.postMessage(data,parentOrigin)
  window.addEventListener('message',event=>{
    if(event.source!==parent||event.origin!==parentOrigin)return
    if(event.data?.type==='film-progress'){
      if(Number.isFinite(event.data.progress)&&['playing','paused','ending'].includes(event.data.phase))progress(event.data.progress,event.data.phase,event.data.currentTime,event.data.cycle)
      return
    }
    if(event.data?.type!=='film-ended'||showing)return
    const poem=latest&&{...latest,lines:latest.lines.slice()}
    if(!poem?.lines.length){reply({type:'poem-ending',duration:0});return}
    showing=true;paper.textContent=''
    poem.lines.forEach(id=>{const line=document.createElement('p');line.textContent=poem.texts?.[id]??byId.get(id).text;paper.append(line)})
    const duration=20000
    ending.hidden=false;paper.scrollTop=0
    reply({type:'poem-ending',duration})
    const start=performance.now()
    function scroll(now){if(!showing)return;paper.scrollTop=Math.max(0,(now-start-3000)/(duration-6000))*(paper.scrollHeight-paper.clientHeight);requestAnimationFrame(scroll)}
    requestAnimationFrame(scroll)
    setTimeout(()=>{showing=false;ending.hidden=true;complete(poem.token);if(latest?.token===poem.token)latest=null;reply({type:'poem-finished'})},duration)
  })
  return {set(items){
    const p=items.find(item=>item.kind==='poem')
    if(!p||typeof p.token!=='string'||!Array.isArray(p.lines)){latest=null;return}
    const texts=Object.create(null)
    for(const fill of Array.isArray(p.fills)?p.fills.slice(0,132):[]){
      if(!fill)continue
      const sentence=byId.get(fill.sentenceId),answer=byId.get(fill.answerId)
      if(sentence?.kind==='sentence'&&answer?.kind==='answer'&&(!sentence.accepts||sentence.accepts.includes(answer.id)))texts[fill.sentenceId]=composeSentence(sentence,answer)
    }
    latest={token:p.token,lines:p.lines.filter(id=>byId.has(id)).slice(0,132),texts}
  }}
}
