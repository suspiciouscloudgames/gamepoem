import {getBlackoutLocale,turkishForm} from './blackout-locales.js?v=phrase-without-demonstrative1'
import {promptIndices,promptTexts} from './blackout-prompt-texts.js?v=prompts38-1'
const cache={}
export function getPromptCatalog(language){
 if(cache[language])return cache[language]
 const locale=getBlackoutLocale(language),data=promptTexts[language]
 const sentences=promptIndices.map((sourceIndex,index)=>{
  const base=locale.fragmentById.get(`blackout-s-${sourceIndex}`)
  const text=data.texts[index],answer=data.slots[index],start=text.indexOf(answer)
  const before=text.slice(0,start),originalAfter=text.slice(start+answer.length)
  const own=base.own||locale.answers.find(a=>a.text===base.answer).id
  let after=originalAfter
  const forms={},tails={}
  if(language==='ko'&&sourceIndex!==23)after=after.slice(base.originalAfter.length-base.after.length)
  for(const {id} of locale.answers){
   const term=locale.answerById.get(id),n=Number(id.split('-').pop())
   let form=base.forms[id]
   if(language==='ko'&&sourceIndex===23)form=term.text
   if(language==='en'&&sourceIndex===15)form=term.text
   if(language==='tr'&&sourceIndex===23)form=turkishForm(term.text,n,'gen')
   if(language==='tr'&&sourceIndex===36)form=term.text
   if(language!=='ko'){
    if(!before)form=form[0].toLocaleUpperCase(language)+form.slice(1)
    else if(!base.before)form=form[0].toLocaleLowerCase(language)+form.slice(1)
   }
   forms[id]=id===own?(language==='ko'?answer+originalAfter.slice(0,originalAfter.length-after.length):answer):form
   // Carry only the grammatical tail variation, never the old sentence wording.
   tails[id]=after
   if(language==='en'&&base.tails?.[id]!==base.after&&base.tails?.[id]){
    if(base.tails[id].startsWith(' were '))tails[id]=after.replace(/^ was /,' were ')
    if(base.tails[id].startsWith(' was '))tails[id]=after.replace(/^ were /,' was ')
   }
  }
  return {...base,text,before,answer,originalAfter,after,forms,tails,own,accepts:locale.answers.map(a=>a.id)}
 })
 return cache[language]={sentences,byId:new Map(sentences.map(s=>[s.id,s]))}
}
export function shuffledPrompts(random=Math.random){
 const deck=getPromptCatalog('ko').sentences.slice()
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}
 return deck
}
