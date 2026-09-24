import {enablePoemReorder} from './poem-reorder.js?v=touch-recovery2'
import {getPromptCatalog,shuffledPrompts} from './blackout-prompts.js?v=word-boundaries1'
import {getBlackoutLocale, composeInLocale} from './blackout-locales.js?v=word-boundaries1'
import {createPoemPictures} from './poem-pictures.js?v=ipad-safari2'
import {canFill} from './blackout-content.js?v=word-boundaries1'
export function setupBlackout({room,startConnection,send}){
  const tablet=document.querySelector('#tablet')
  tablet.className='blackout-tablet running'
  tablet.textContent=''
  let language='ko'
  try{const saved=localStorage.getItem('blackout-language');if(['tr','en','ko'].includes(saved))language=saved}catch{}
  let locale=getBlackoutLocale(language),prompts=getPromptCatalog(language)
  const languageBar=document.createElement('nav');languageBar.className='blackout-languages';languageBar.setAttribute('aria-label','Language')
  const languageButtons=new Map()
  for(const [code,label] of [['tr','Türkçe'],['en','English'],['ko','한국어']]){
    const button=document.createElement('button');button.type='button';button.textContent=label;button.lang=code
    button.addEventListener('click',()=>changeLanguage(code));languageBar.append(button);languageButtons.set(code,button)
  }
  tablet.append(languageBar)
  const upper=document.createElement('section');upper.className='blackout-upper'
  const sentence=document.createElement('div');sentence.className='blackout-sentence';sentence.setAttribute('aria-live','polite')
  upper.append(sentence)
  const field=document.createElement('div');field.className='blackout-field'
  const viewport=document.createElement('div');viewport.className='blackout-viewport'
  const text=document.createElement('div');text.className='blackout-text'
  const lens=document.createElement('div');lens.className='blackout-lens';lens.tabIndex=0;lens.setAttribute('role','button');lens.setAttribute('aria-label','탐색 사각형. 방향키로 이동하고 잠시 멈추면 어구를 선택합니다.')
  const work=document.createElement('div');work.className='blackout-work'
  const memory=document.createElement('div');memory.className='blackout-memory'
  const pictures=createPoemPictures(memory)
  const poemTitle=document.createElement('h2');poemTitle.className='poem-title';poemTitle.textContent='Game Poem';poemTitle.lang='en';tablet.append(poemTitle)
  const poem=document.createElement('aside');poem.className='blackout-poem';poem.tabIndex=0
  poem.setAttribute('aria-label','관객의 시');poem.setAttribute('aria-live','polite')
  const bookHeading=document.createElement('header');bookHeading.className='poem-book-heading'
  const bookLabel=document.createElement('span');bookLabel.textContent='Game Poem';bookLabel.lang='en'
  const bookTitle=document.createElement('h2');bookHeading.append(bookLabel,bookTitle)
  const poemLines=document.createElement('div');poemLines.className='blackout-poem-lines';poem.append(bookHeading,poemLines)
  let reading=false,editorScrollTop=0
  const finishPoem=document.createElement('button');finishPoem.type='button';finishPoem.className='poem-finish';finishPoem.disabled=true
  function updateFinish(){
    tablet.classList.toggle('reading-mode',reading)
    bookTitle.textContent={ko:'읽기',en:'Read',tr:'Oku'}[language]
    finishPoem.textContent=reading?{ko:'다시 편집',en:'Edit again',tr:'Yeniden düzenle'}[language]:{ko:'읽기',en:'Read',tr:'Oku'}[language]
    finishPoem.setAttribute('aria-pressed',String(reading));finishPoem.disabled=ending||!poemNodes.size
  }
  finishPoem.addEventListener('click',()=>{
    if(ending)return
    interrupt();if(pendingCompletion)finishCompletion();if(!reading)editorScrollTop=poem.scrollTop;reading=!reading;memory.classList.toggle('reading',reading);updateFinish();poem.scrollTop=reading?0:editorScrollTop
    poemNodes.forEach(line=>{line.tabIndex=reading?-1:0})
    token=`blackout-${Date.now()}-${Math.random().toString(36).slice(2)}`;send(snapshot())
  })
  const poemNodes=new Map()
  let lineSequence=0
  viewport.append(text);field.append(viewport,lens);work.append(upper,field);memory.append(poem,finishPoem);tablet.append(work,memory)
  const nodes=[]
  function appendRanges(parent,parts){
    parts.forEach(p=>{
      if(!p.id){parent.append(document.createTextNode(p.text));return}
      const span=document.createElement('span');span.dataset.id=p.id;if(p.atomic)span.className='phrase-unit'
      appendRanges(span,p.children);parent.append(span);nodes.push({el:span,...p})
    })
  }
  appendRanges(text,locale.passages)
  const deck=shuffledPrompts(),fills=new Map()
  let index=0,current=prompts.byId.get(deck[0].id),selected=null,candidate=null,timer=null,pointer=null,token='',ending=false
  let completionTimer=null,pendingCompletion=false
  let x=.5,y=.12,lensWidth=116,lensHeight=36,geometry=[],lineCenters=[],activeLine=-1,candidateKey=null
  let touchPoint=null,grabX=0,grabY=0,lift=1,liftFrame=0,liftStart=0,windowBox=null,visualX=0,visualY=0,fromX=0,fromY=0
  const snapshot=()=>poemNodes.size?[{kind:'poem',token,language,finalized:reading,lines:[...poemLines.children].map(node=>node.dataset.sentenceId),fills:[...poemLines.children].map(node=>({sentenceId:node.dataset.sentenceId,answerId:node.dataset.answerId,lineId:node.dataset.lineId}))}]:[]
  const reorder=enablePoemReorder(poemLines,poem,{disabled:()=>ending||reading,onStart:cancel,onChange:()=>{
    token=`blackout-${Date.now()}-${Math.random().toString(36).slice(2)}`;send(snapshot())
  }})
  function updateLanguageUI(){
    updateFinish()
    pictures.setLanguage(language)
    poemNodes.forEach(line=>line.querySelector('.poem-delete').setAttribute('aria-label',deleteLabel()))
    document.documentElement.lang=language
    tablet.dataset.language=language
    languageButtons.forEach((button,code)=>button.setAttribute('aria-pressed',String(code===language)))
    poem.setAttribute('aria-label',{tr:'İzleyicinin şiiri',en:'Your poem',ko:'관객의 시'}[language])
    lens.setAttribute('aria-label',{tr:'Keşif penceresi',en:'Exploration window',ko:'탐색창'}[language])
  }
  function changeLanguage(next){
    if(next===language)return
    interrupt();language=next;locale=getBlackoutLocale(language);prompts=getPromptCatalog(language)
    current=prompts.byId.get(deck[index].id)
    selected=fills.has(current.id)?locale.answerById.get(fills.get(current.id)):null
    candidate=null;candidateKey=null;activeLine=-1;geometry=[];lineCenters=[];nodes.length=0;text.textContent=''
    appendRanges(text,locale.passages)
    for(const line of poemNodes.values()){
      const sentence=prompts.byId.get(line.dataset.sentenceId),answer=locale.answerById.get(line.dataset.answerId)
      line.querySelector('.poem-line-text').textContent=composeInLocale(sentence,answer)
    }
    updateLanguageUI();paint();measure()
    if(pendingCompletion)scheduleCompletion()
    try{localStorage.setItem('blackout-language',language)}catch{}
    if(fills.size)send(snapshot())
  }
  function fitSentence(){
    sentence.style.fontSize=''
    if(!window.matchMedia('(orientation:landscape)').matches)return
    const style=getComputedStyle(upper)
    const available=upper.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)
    let fontSize=parseFloat(getComputedStyle(sentence).fontSize)
    while(sentence.offsetHeight>available&&fontSize>18){sentence.style.fontSize=`${--fontSize}px`}
  }
  function sizeLens(){
    lensWidth=Math.min(lensWidth,field.clientWidth)
    lensHeight=Math.ceil(parseFloat(getComputedStyle(text).fontSize)*1.6+6)
  }

  function paint(){
    sentence.textContent=''
    sentence.append(document.createTextNode(selected?(current.heads?.[selected.id]??current.before):current.before))
    const blank=document.createElement('span');blank.className=selected?'blackout-fill':'blackout-blank';blank.textContent=selected?current.forms[selected.id]:current.answer
    if(!selected)blank.setAttribute('aria-label','빈칸')
    sentence.append(blank,document.createTextNode(selected?(current.tails?.[selected.id]??current.after):current.originalAfter))
    sentence.dataset.sentenceId=current.id
    fitSentence();sizeLens();locate()
  }
  function cancel(){clearTimeout(timer);timer=null;lens.classList.remove('settling')}
  function deleteLabel(){return {ko:'문장 삭제',en:'Delete sentence',tr:'Cümleyi sil'}[language]}
  function recordLine(){
    const follow=poem.scrollHeight-poem.scrollTop-poem.clientHeight<48
    const line=document.createElement('p'),lineId=`line-${++lineSequence}`
    line.tabIndex=0;line.setAttribute('aria-keyshortcuts','ArrowUp ArrowDown')
    line.dataset.sentenceId=current.id;line.dataset.answerId=selected.id;line.dataset.lineId=lineId
    const words=document.createElement('span');words.className='poem-line-text';words.textContent=composeInLocale(current,selected)
    const remove=document.createElement('button');remove.type='button';remove.className='poem-delete';remove.setAttribute('aria-label',deleteLabel())
    remove.addEventListener('click',()=>{
      if(ending||reading)return
      reorder.cancel()
      const next=line.nextElementSibling||line.previousElementSibling
      poemNodes.delete(lineId);line.remove();updateFinish()
      token=`blackout-${Date.now()}-${Math.random().toString(36).slice(2)}`;send(snapshot())
      if(!poemNodes.size)poem.focus({preventScroll:true})
      else next?.focus({preventScroll:true})
    })
    line.append(words,remove)
    poemNodes.set(lineId,line);poemLines.append(line);pictures.reveal(lineId);updateFinish()
    poemNodes.forEach(node=>node.classList.toggle('current',node===line))
    if(follow)poem.scrollTop=poem.scrollHeight
  }
  function commit(){
    if(!canFill(current,candidate)||selected||ending||reading||document.hidden)return
    cancel()
    selected=candidate;fills.set(current.id,selected.id);token=`blackout-${Date.now()}-${Math.random().toString(36).slice(2)}`
    pointer=null;pendingCompletion=true
    paint();lens.classList.add('chosen');scheduleCompletion()
  }
  function scheduleCompletion(){
    clearTimeout(completionTimer)
    sentence.classList.remove('dissolving')
    completionTimer=setTimeout(()=>{
      if(document.hidden||!pendingCompletion)return
      sentence.classList.add('dissolving')
      const duration=window.matchMedia('(prefers-reduced-motion:reduce)').matches?200:1200
      completionTimer=setTimeout(()=>{if(!document.hidden)finishCompletion()},duration)
    },2000)
  }
  function finishCompletion(){
    if(!pendingCompletion)return
    clearTimeout(completionTimer);completionTimer=null;pendingCompletion=false
    sentence.classList.remove('dissolving')
    reorder.cancel();recordLine();send(snapshot())
    if(!ending&&index<deck.length-1){
      current=prompts.byId.get(deck[++index].id);selected=null
      candidate?.el.classList.remove('target');candidate=null;candidateKey=null
      lens.classList.remove('chosen');paint();measure()
    }
  }
  function alignToLine(){
    if(!lineCenters.length)return
    const travel=field.clientHeight-lensHeight+Math.max(0,text.scrollHeight-field.clientHeight)
    const center=y*travel+lensHeight/2
    let nearest=0
    for(let i=1;i<lineCenters.length;i++)if(Math.abs(lineCenters[i]-center)<Math.abs(lineCenters[nearest]-center))nearest=i
    // A little vertical tolerance keeps hand tremor from flipping adjacent rows.
    if(activeLine>=0&&activeLine<lineCenters.length){
      const previous=lineCenters[activeLine],spacing=parseFloat(getComputedStyle(text).lineHeight)
      if(Math.abs(previous-center)<spacing*.58)nearest=activeLine
    }
    activeLine=nearest
    y=Math.max(0,Math.min(1,(lineCenters[nearest]-lensHeight/2)/Math.max(1,travel)))
    lens.dataset.line=String(activeLine)
  }
  function locate(arm=false){
    // Match the reading line only. Horizontal exploration never snaps to a word.
    alignToLine()
    const width=field.clientWidth,height=field.clientHeight
    let left=x*(width-lensWidth)
    const top=y*(height-lensHeight),scroll=y*Math.max(0,text.scrollHeight-height)
    const cx=left+lensWidth/2
    let best=null,bestRect=null,bestGeometry=null,distance=Infinity
    geometry.forEach(g=>{if(!canFill(current,g.node)||g.rects.some(r=>r.line!==activeLine))return;for(const r of g.rects){
      // The window's centre must touch the phrase, not merely its far edge.
      if(r.line!==activeLine||cx<r.left||cx>r.right)continue
      const needed=2*Math.max(cx-r.left,r.right-cx)+12
      if(needed>Math.min(width,sentence.clientWidth))continue
      const d=Math.abs((r.left+r.right)/2-cx)
      if(d<distance){distance=d;best=g.node;bestRect=r;bestGeometry=g}
    }})
    lensWidth=Math.min(width,sentence.clientWidth,Math.max(44,bestRect?Math.ceil(2*Math.max(cx-bestRect.left,bestRect.right-cx)+12):116))
    left=Math.max(0,Math.min(width-lensWidth,cx-lensWidth/2))
    x=left/Math.max(1,width-lensWidth)
    windowBox={left,top,scroll,width,height};renderWindow()
    // The whole source phrase must be visible, including every rendered rectangle.
    const visibleTop=top+scroll,tolerance=.5
    if(bestGeometry&&!bestGeometry.rects.every(r=>r.left>=left-tolerance&&r.right<=left+lensWidth+tolerance&&r.top>=visibleTop-tolerance&&r.bottom<=visibleTop+lensHeight+tolerance))best=null
    const nextKey=best?`${best.id}:${activeLine}`:null
    if(nextKey!==candidateKey){cancel();candidateKey=nextKey}
    if(candidate!==best){candidate?.el.classList.remove('target');candidate=best;candidate?.el.classList.add('target')}
    if(arm&&candidate&&!timer&&!selected){
      lens.classList.remove('chosen')
      void lens.offsetWidth
      lens.classList.add('settling')
      timer=setTimeout(commit,1100)
    }
  }
  function measure(){
    fitSentence();sizeLens()
    cancel();text.style.transform='none'
    const base=text.getBoundingClientRect()
    geometry=nodes.map(node=>({node,rects:[...node.el.getClientRects()].map(r=>({left:r.left-base.left,top:r.top-base.top,right:r.right-base.left,bottom:r.bottom-base.top}))}))
    // Measure every text line, including lines with no acceptable answer.
    const walker=document.createTreeWalker(text,NodeFilter.SHOW_TEXT),range=document.createRange(),centers=[]
    while(walker.nextNode()){
      if(!walker.currentNode.textContent.trim())continue
      range.selectNodeContents(walker.currentNode)
      for(const rect of range.getClientRects())if(rect.width&&rect.height)centers.push((rect.top+rect.bottom)/2-base.top)
    }
    centers.sort((a,b)=>a-b);lineCenters=[]
    const rowTolerance=parseFloat(getComputedStyle(text).lineHeight)*.4,rows=[]
    for(const center of centers){
      const row=rows[rows.length-1]
      if(!row||center-row[0]>rowTolerance)rows.push([center]);else row.push(center)
    }
    lineCenters=rows.map(row=>row.reduce((sum,value)=>sum+value,0)/row.length)
    for(const g of geometry)for(const rect of g.rects){
      const center=(rect.top+rect.bottom)/2
      rect.line=0
      for(let i=1;i<lineCenters.length;i++)if(Math.abs(lineCenters[i]-center)<Math.abs(lineCenters[rect.line]-center))rect.line=i
    }
    // Nested short words can give one phrase several rectangles on the same row.
    // Merge those rectangles so its centre selects the whole phrase, not only its tail.
    for(const g of geometry){
      const rows=new Map()
      for(const r of g.rects){
        const merged=rows.get(r.line)
        if(merged){merged.left=Math.min(merged.left,r.left);merged.right=Math.max(merged.right,r.right);merged.top=Math.min(merged.top,r.top);merged.bottom=Math.max(merged.bottom,r.bottom)}
        else rows.set(r.line,{...r})
      }
      g.rects=[...rows.values()]
    }
    activeLine=-1;candidateKey=null
    locate()
  }
  function renderWindow(){
    if(!windowBox)return
    const {left,top,scroll,width,height}=windowBox
    let targetX=0,targetY=0
    if(touchPoint){
      // Move the aperture and the underlying text together: the reading row and
      // valid phrase stay unchanged during the lift, including at the edges.
      let cx=touchPoint.x,cy=touchPoint.y-76
      if(cy<lensHeight/2){
        const clearance=lensWidth/2+40
        cx=touchPoint.x+clearance<=width-lensWidth/2?touchPoint.x+clearance:touchPoint.x-clearance
        cy=touchPoint.y
        if(cx<lensWidth/2){cx=touchPoint.x;cy=touchPoint.y+76}
      }
      targetX=Math.max(0,Math.min(width-lensWidth,cx-lensWidth/2))-left
      targetY=Math.max(0,Math.min(height-lensHeight,cy-lensHeight/2))-top
    }
    const ease=1-Math.pow(1-lift,3)
    visualX=fromX+(targetX-fromX)*ease;visualY=fromY+(targetY-fromY)*ease
    const visibleLeft=left+visualX,visibleTop=top+visualY
    lens.style.cssText=`left:${visibleLeft}px;top:${visibleTop}px;width:${lensWidth}px;height:${lensHeight}px`
    viewport.style.clipPath=`inset(${visibleTop}px ${Math.max(0,width-visibleLeft-lensWidth)}px ${Math.max(0,height-visibleTop-lensHeight)}px ${visibleLeft}px)`
    viewport.style.webkitClipPath=viewport.style.clipPath
    text.style.transform=`translate(${visualX}px,${visualY-scroll}px)`
  }
  function animateLift(now){
    lift=Math.min(1,(now-liftStart)/180);renderWindow()
    if(lift<1)liftFrame=requestAnimationFrame(animateLift)
    else{liftFrame=0;if(!pendingCompletion&&!reading&&!ending)locate(true)}
  }
  function move(e){
    const r=field.getBoundingClientRect()
    if(touchPoint)touchPoint={x:e.clientX-r.left,y:e.clientY-r.top}
    x=Math.max(0,Math.min(1,(e.clientX-r.left+grabX-lensWidth/2)/Math.max(1,r.width-lensWidth)))
    y=Math.max(0,Math.min(1,(e.clientY-r.top+grabY-lensHeight/2)/Math.max(1,r.height-lensHeight)))
    locate(lift===1)
  }
  field.addEventListener('pointerdown',e=>{
    if(ending||reading||pendingCompletion||pointer!==null||e.button>0)return
    e.preventDefault();pointer=e.pointerId;cancelAnimationFrame(liftFrame);cancel()
    const r=field.getBoundingClientRect(),l=lens.getBoundingClientRect()
    const grabbed=e.clientX>=l.left&&e.clientX<=l.right&&e.clientY>=l.top&&e.clientY<=l.bottom
    const touch=e.pointerType==='touch'||e.pointerType==='pen'
    grabX=touch&&grabbed&&windowBox?windowBox.left+lensWidth/2-(e.clientX-r.left):0
    grabY=touch&&grabbed&&windowBox?windowBox.top+lensHeight/2-(e.clientY-r.top):0
    touchPoint=touch?{x:e.clientX-r.left,y:e.clientY-r.top}:null
    fromX=touch&&grabbed?visualX:0;fromY=touch&&grabbed?visualY:0;lift=touch?0:1
    try{field.setPointerCapture(pointer)}catch{}
    move(e)
    if(touch){liftStart=performance.now();liftFrame=requestAnimationFrame(animateLift)}
  })
  window.addEventListener('pointermove',e=>{if(e.pointerId===pointer){e.preventDefault();move(e)}},{passive:false})
  window.addEventListener('pointerup',e=>{if(e.pointerId===pointer){move(e);pointer=null}})
  function interrupt(){pointer=null;cancelAnimationFrame(liftFrame);liftFrame=0;lift=1;cancel();reorder.cancel()}
  window.addEventListener('pointercancel',e=>{if(e.pointerId===pointer)interrupt()})
  field.addEventListener('lostpointercapture',e=>{if(e.pointerId===pointer)interrupt()})
  window.addEventListener('blur',interrupt)
  document.addEventListener('visibilitychange',()=>{if(document.hidden){interrupt();clearTimeout(completionTimer)}else if(pendingCompletion)scheduleCompletion()})
  lens.addEventListener('keydown',e=>{
    if(ending||reading||pendingCompletion)return
    const delta={ArrowLeft:[-.025,0],ArrowRight:[.025,0],ArrowUp:[0,-.025],ArrowDown:[0,.025]}[e.key]
    if(delta){e.preventDefault();x=Math.max(0,Math.min(1,x+delta[0]));y=Math.max(0,Math.min(1,y+delta[1]));locate(true)}
    else if(!e.repeat&&(e.key==='Enter'||e.key===' ')){e.preventDefault();cancel();commit()}
  })
  function fit(){interrupt();document.documentElement.style.setProperty('--viewport-height',`${Math.round(window.visualViewport?.height||innerHeight)}px`);requestAnimationFrame(measure)}
  window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit)
  if(typeof ResizeObserver==='function')new ResizeObserver(measure).observe(field)
  document.fonts?.ready.then(measure)
  updateLanguageUI();paint();fit()
  function resetCompletedPoem(data){
    if(!reading||data.token!==token)return
    interrupt();clearTimeout(completionTimer);pendingCompletion=false
    fills.clear();poemNodes.clear();poemLines.textContent='';pictures.reset();lineSequence=0
    reading=false;ending=false;memory.classList.remove('reading');poem.scrollTop=0
    deck.splice(0,deck.length,...shuffledPrompts());index=0;current=prompts.byId.get(deck[0].id)
    selected=null;candidate?.el.classList.remove('target');candidate=null;candidateKey=null;token=''
    lens.classList.remove('chosen');updateFinish();paint();measure();send([])
  }
  startConnection({display:false,room,getState:snapshot,onControl:resetCompletedPoem,onProgress(data){ending=data.phase==='ending';if(ending){interrupt();finishCompletion()}updateFinish();poemNodes.forEach(line=>line.querySelector('.poem-delete').disabled=ending)}})
}
