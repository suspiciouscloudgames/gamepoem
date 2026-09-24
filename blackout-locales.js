import * as ko from './blackout-content.js?v=phrase-without-demonstrative1'
import {translations} from './blackout-translations.js?v=revised-film1'
const cache={ko:{...ko,answerById:new Map(ko.answers.map(a=>[a.id,a]))}}
const number=id=>Number(id.split('-').pop())
const trCases=['dat','nom','nom','nom','loc','ins','nom','ins','nom','abl','acc','loc','nom','dat','dat','nom','loc','nom','nom','nom','acc','acc','past','ins','abl','acc','nom','loc','nom','nom','loc','clause','nom','gen','calm','acc','gen','nom','ins','dat','dat','nom','nom','acc','abl','nom','acc','nom','nom','nom','gen','nom','acc','nom']
const possessed=new Set([1,5,6,14,17,18,19,20,32,39,40,42,43,45,46,47,49,59,63,64,66,67])
export function turkishForm(base,id,kind){
 if(kind==='nom')return base
 if(kind==='past')return base+' idi'
 if(kind==='clause')return base+' hâlâ oradaymış'
 if(kind==='calm')return id===3?'mümkün olduğunca sakin kalmaya':turkishForm(base,id,'acc')+' korumaya'
 const special={
 10:{acc:'seni',dat:'sana',loc:'sende',abl:'senden',gen:'senin',ins:'seninle'},
 13:{acc:'evlerini ve sık vakit geçirdiğin yerleri',dat:'evlerine ve sık vakit geçirdiğin yerlere',loc:'evlerinde ve sık vakit geçirdikleri yerlerde',abl:'evlerinden ve sık vakit geçirdiğin yerlerden',gen:'evlerinin ve sık vakit geçirdiğin yerlerin',ins:'evlerinle ve sık vakit geçirdiğin yerlerle'},
 59:{acc:'burayı',dat:'buraya',loc:'burada',abl:'buradan',gen:'buranın',ins:'burayla'},
 66:{acc:'orayı',dat:'oraya',loc:'orada',abl:'oradan',gen:'oranın',ins:'orayla'},
 71:{acc:'kendini',dat:'kendine',loc:'kendinde',abl:'kendinden',gen:'kendinin',ins:'kendinle'}
 }
 if(special[id]?.[kind])return special[id][kind]
 const vowels=base.toLocaleLowerCase('tr').match(/[aeıioöuüâîû]/g)||['e']
 const last=vowels[vowels.length-1].replace('â','a').replace('î','i').replace('û','u')
 const a='aıou'.includes(last)?'a':'e',i='aı'.includes(last)?'ı':'ei'.includes(last)?'i':'ou'.includes(last)?'u':'ü'
 const vowel=/[aeıioöuü]$/i.test(base),p=possessed.has(id)
 let stem=base
 if(['acc','dat','gen'].includes(kind)){
  if((id===69||id===70)&&base.endsWith('k'))stem=base.slice(0,-1)
  else if(/(?:varlık|köpek|yiyecek|yakınlık|bağlılık)$/.test(base))stem=base.slice(0,-1)+'ğ'
 }
 const nowVowel=/[aeıioöuü]$/i.test(stem)
 if(kind==='acc')return stem+(p?'n':nowVowel?'y':'')+i
 if(kind==='dat')return stem+(p?'n':nowVowel?'y':'')+a
 if(kind==='gen')return stem+(nowVowel?'n':'')+i+'n'
 if(kind==='ins')return base+(vowel?'y':'')+'l'+a
 const d=/[fstkçşhp]$/.test(base)?'t':'d'
 return base+(p?'n':'')+d+a+(kind==='abl'?'n':'')
}
const plural=new Set([1,2,4,5,6,8,11,13,17,18,19,20,21,22,26,27,33,34,35,46,49,56,57,64,65])
function englishForm(base,id,slot){
 if(slot===15)return base+' was'
 if(slot===29)return 'no '+base.replace(/^(?:a|the) /,'')
 if(slot===31)return base+' had not quite left'
 if(slot===34)return id===3?'remain as calm as possible':'maintain '+base
 if(slot===12&&id===24)return 'fixed-type companion entities'
 if(slot===11)return base.replace(' and the places',' and in the places')
 return base
}
const enAliases={3:['calm'],7:['the one where the dog had rested'],13:['their homes','places where they often spent time'],29:['the day you arrived here'],30:['One day'],34:['personality, mood'],35:['intimacy, and attachment'],40:['the face of the dog'],46:['longstanding feelings of loss'],49:['distribution, and recurrence','distribution and recurrence'],60:['the one in the dog’s resting place'],66:['the spot'],68:['space'],70:['Continuing to observe the companion entity']}
const trAliases={3:['sakin','huzurlu'],7:['köpeğin dinlendiği yerdekine'],13:['evlerinde ve sık vakit geçirdikleri yerlerde'],29:['Buraya vardığın gün'],30:['Bir gün'],34:['kişilik, ruh hâli'],35:['yakınlık ve bağlılık'],45:['su kabının'],46:['uzun süredir taşınan kayıp duygularıyla'],47:['sinyallerin gücünü'],48:['süresini'],49:['dağılımını ve tekrarlanma özelliklerini'],53:['güven'],54:['yakınlık'],55:['bağlılık'],58:['limana'],59:['burada','buraya'],63:['kalma hakkı'],64:['varoluşun koşullarını'],66:['oraya','orada'],67:['suyun kenarındaki','su kenarındaki'],70:['Yoldaş varlığı gözlemlemeye devam etmek']}
const isLetter=char=>Boolean(char&&/[A-Za-zÀ-žİıŞşĞğÇçÖöÜü]/.test(char))
export function getBlackoutLocale(language){
 if(cache[language])return cache[language]
 const data=translations[language]
 if(!data)return cache.ko
 const answers=ko.answers.map(a=>({...a,text:data.terms[number(a.id)]}))
 const answerById=new Map(answers.map(a=>[a.id,a]))
 const sentences=ko.sentences.map((original,index)=>{
  const text=data.texts[index],answer=data.slots[index],start=text.indexOf(answer)
  const before=text.slice(0,start),after=text.slice(start+answer.length)
  const own=ko.answers.find(a=>a.text===original.answer).id
  const forms={},tails={}
  for(const {id} of answers){
   const n=number(id),base=answerById.get(id).text
   let form=language==='tr'?turkishForm(base,n,trCases[index]):englishForm(base,n,index)
   if(!before)form=form[0].toLocaleUpperCase(language)+form.slice(1)
   forms[id]=id===own?answer:form
   tails[id]=after
   if(language==='en'&&id!==own){
    if(index===2&&!plural.has(n))tails[id]=after.replace(/^ were /,' was ')
    if((index===32||index===50)&&plural.has(n))tails[id]=after.replace(/^ was /,' were ')
   }
  }
  return {...original,text,before,answer,after,originalAfter:after,forms,tails,own}
 })
 const transcript=data.texts.join(' '),aliases=[]
 for(const a of answers){
  const id=number(a.id),names=new Set([a.text,...((language==='en'?enAliases:trAliases)[id]||[])])
  if(language==='tr')for(const kind of ['acc','dat','loc','abl','gen','ins'])names.add(turkishForm(a.text,id,kind))
  for(const sentence of sentences)if(sentence.own===a.id)names.add(sentence.answer)
  for(const name of names)if(name)aliases.push({...a,text:name})
 }
 aliases.sort((a,b)=>b.text.length-a.text.length)
 const byInitial=new Map()
 for(const alias of aliases){
  alias.lower=alias.text.toLocaleLowerCase(language)
  const initial=alias.lower[0]
  if(!byInitial.has(initial))byInitial.set(initial,[])
  byInitial.get(initial).push(alias)
 }
 function markRanges(part,excluded=new Set()){
  const result=[],lower=part.toLocaleLowerCase(language);let offset=0,plain=''
  while(offset<part.length){
   const a=(byInitial.get(lower[offset])||[]).find(a=>!excluded.has(a.id)&&lower.startsWith(a.lower,offset)&&!isLetter(part[offset-1])&&!isLetter(part[offset+a.text.length]))
   if(a){
    if(plain){result.push({text:plain});plain=''}
    const actual=part.slice(offset,offset+a.text.length)
    result.push({...a,text:actual,children:markRanges(actual,new Set([...excluded,a.id]))});offset+=actual.length
   }else plain+=part[offset++]
  }
  if(plain)result.push({text:plain})
  return result
 }
 const passages=markRanges(transcript)
 const result={sentences,answers,answerById,passages,transcript,fragmentById:new Map([...sentences,...answers].map(item=>[item.id,item]))}
 cache[language]=result
 return result
}
export function composeInLocale(sentence,answer){return sentence.before+sentence.forms[answer.id]+(sentence.tails?.[answer.id]??sentence.after)}
