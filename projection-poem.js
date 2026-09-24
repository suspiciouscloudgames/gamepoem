import {getPromptCatalog} from './blackout-prompts.js?v=word-boundaries1'
import {getBlackoutLocale,composeInLocale} from './blackout-locales.js?v=word-boundaries1'
// Only an explicitly finalized poem is eligible; reset follows the actual film restart.
export function connectPoemEnding({complete,progress}){
  let latest=null,showing=false,shownToken=null,hideTimer=null,scrollFrame=null
  const ending=document.createElement('section');ending.id='projection-poem';ending.hidden=true
  const paper=document.createElement('div');ending.append(paper);document.body.append(ending)
  const parentOrigin=document.referrer?new URL(document.referrer).origin:location.origin
  const reply=data=>parent.postMessage(data,parentOrigin)
  window.addEventListener('message',event=>{
    if(event.source!==parent||event.origin!==parentOrigin)return
    const data=event.data
    if(data?.type==='film-progress'){
      if(Number.isFinite(data.progress)&&['playing','paused','ending'].includes(data.phase))progress(data.progress,data.phase,data.currentTime,data.cycle)
      return
    }
    if(data?.type==='film-restarted'){
      clearTimeout(hideTimer);cancelAnimationFrame(scrollFrame);showing=false;ending.hidden=true
      if(shownToken&&data.resetToken===shownToken){complete(shownToken);if(latest?.token===shownToken)latest=null;shownToken=null}
      return
    }
    if(data?.type!=='film-ended'||showing)return
    const poem=latest
    if(!poem?.texts.length){reply({type:'poem-ending',duration:0});return}
    showing=true;shownToken=poem.token;paper.replaceChildren()
    paper.lang=poem.language
    for(const text of poem.texts){const line=document.createElement('p');line.textContent=text;paper.append(line)}
    const duration=10000
    ending.hidden=false;paper.scrollTop=0
    reply({type:'poem-ending',duration,token:poem.token})
    const start=performance.now()
    function scroll(now){if(!showing)return;paper.scrollTop=Math.max(0,Math.min(1,(now-start-1500)/7000))*(paper.scrollHeight-paper.clientHeight);scrollFrame=requestAnimationFrame(scroll)}
    scrollFrame=requestAnimationFrame(scroll)
    hideTimer=setTimeout(()=>{showing=false;ending.hidden=true;cancelAnimationFrame(scrollFrame);reply({type:'poem-finished',token:poem.token})},duration)
  })
  return {set(items){
    const p=items.find(item=>item?.kind==='poem'&&item.finalized===true)
    if(!p||typeof p.token!=='string'||!['ko','tr','en'].includes(p.language)||!Array.isArray(p.fills)){latest=null;return}
    const locale=getBlackoutLocale(p.language),prompts=getPromptCatalog(p.language),texts=[]
    for(const fill of p.fills.slice(0,132)){
      const sentence=prompts.byId.get(fill?.sentenceId),answer=locale.answerById.get(fill?.answerId)
      if(sentence&&answer&&sentence.accepts.includes(answer.id))texts.push(composeInLocale(sentence,answer))
    }
    latest={token:p.token,language:p.language,texts}
  }}
}
