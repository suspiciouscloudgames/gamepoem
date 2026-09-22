// Authored slot rules only: no network, AI, or grammatical inference.
export function attachParticle(text,rule){
  if(!rule)return text
  const stem=text.trimEnd()
  const code=stem.charCodeAt(stem.length-1)
  const final=code>=0xac00&&code<=0xd7a3?(code-0xac00)%28:null
  const pairs={'이/가':['이','가'],'을/를':['을','를'],'은/는':['은','는'],'과/와':['과','와'],'으로/로':['으로','로']}
  const pair=pairs[rule]
  if(!pair)return stem+rule // Fixed particles such as 에 and 에만.
  if(final===null)throw new Error('A non-Hangul phrase needs an authored form')
  return stem+pair[final===0||(rule==='으로/로'&&final===8)?1:0]
}

export function composeSentence(sentence,answer){
  // A specific pair can override the rule when the author needs an exception.
  const fill=sentence.forms?.[answer.id]??attachParticle(answer.text,sentence.particle)
  return sentence.before+fill+sentence.after
}
