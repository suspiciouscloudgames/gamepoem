import {extraPhrase} from './blackout-extra-phrases.js?v=expanded1'
// Keep metaphor broad; restrict only slots that need a place, feeling, or noun.
const places=new Set([12,13,14,15,16,19,57,58,59,65,66,67,68])
const feelings=new Set([1,2,3,4,17,18,20,34,35,43,46,53,54,55,56])
export function acceptsPhrase(sourceIndex,answer,own){
 if(answer.id===own)return true
 const n=Number(answer.id.split('-').pop()),tags=extraPhrase(answer.id)?.tags||[]
 // Second-person pronouns need different predicate endings in Turkish.
 // Keep them in object/preposition slots where the existing case forms are valid.
 if(n===10&&![18,20,21,24,25,35,37,39,40,46,52].includes(sourceIndex))return false
 if(sourceIndex===29&&[0,52,69,70].includes(n))return false
 if(n===61)return sourceIndex===41 // "what" belongs to the question slot.
 if(n===71)return sourceIndex===52 // a reflexive pronoun needs its antecedent.
 if([16,30,44].includes(sourceIndex))return places.has(n)||tags.some(t=>['place','phenomenon'].includes(t))
 if([23,34].includes(sourceIndex))return feelings.has(n)||tags.some(t=>['emotion','phenomenon'].includes(t))
 return true
}
export function englishNoun(text,id){
 const n=Number(id.split('-').pop())
 if(n===34)return 'personality and mood'
 if(n===35)return 'intimacy and attachment'
 if(n===49)return 'distribution and recurrence'
 if(n===59)return 'this place'
 if(n===70)return 'keeping the companion entity under observation'
 return text
}

export function englishNegativeNoun(text,id){
 const n=Number(id.split('-').pop()),noun=englishNoun(text,id)
 if(n===92)return 'no one else'
 if(n===30)return 'no day'
 if(/^(?:your|their|these|those) /.test(noun))return 'none of '+noun
 return 'no '+noun.replace(/^(?:a|an|the|this) /,'')
}
export function turkishQuestionParticle(text){
 const vowels=text.toLocaleLowerCase('tr').match(/[aeıioöuü]/g)||['e'],v=vowels.at(-1)
 return 'aı'.includes(v)?'mı':'ei'.includes(v)?'mi':'ou'.includes(v)?'mu':'mü'
}
