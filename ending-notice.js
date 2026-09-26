const messages={
  ko:['여러분의 시가 떠오르는 스크린을 봐주세요.','잠시 후 다시 시를 만들 수 있습니다.'],
  en:['Please look at the screen as your poem appears.','In a moment, you can make poetry again.'],
  tr:['Şiiriniz belirirken lütfen ekrana bakın.','Birazdan yeniden şiir oluşturabilirsiniz.']
}

export function createEndingNotice(tablet){
  const overlay=document.createElement('div')
  overlay.className='ending-notice';overlay.hidden=true
  const card=document.createElement('section')
  card.className='ending-notice-card';card.tabIndex=-1
  card.setAttribute('role','dialog');card.setAttribute('aria-modal','true')
  card.setAttribute('aria-labelledby','ending-notice-title')
  card.setAttribute('aria-describedby','ending-notice-description')
  const title=document.createElement('h2');title.id='ending-notice-title'
  const description=document.createElement('p');description.id='ending-notice-description'
  card.append(title,description);overlay.append(card);document.body.append(overlay)
  let visible=false,previousFocus=null
  // Keep keyboard focus inside the notice on older iPads without inert support.
  document.addEventListener('focusin',event=>{if(visible&&!overlay.contains(event.target))card.focus({preventScroll:true})})
  overlay.addEventListener('keydown',event=>{if(event.key==='Tab'||event.key==='Escape')event.preventDefault()})
  return {update(ending,language){
    const copy=messages[language]||messages.ko
    overlay.lang=language
    if(title.textContent!==copy[0]){title.textContent=copy[0];description.textContent=copy[1]}
    if(visible===ending)return
    visible=ending;overlay.hidden=!ending
    if(ending){
      previousFocus=document.activeElement
      card.focus({preventScroll:true})
      tablet.setAttribute('inert','');tablet.setAttribute('aria-hidden','true')
    }else{
      tablet.removeAttribute('inert');tablet.removeAttribute('aria-hidden')
      if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true})
    }
  }}
}
