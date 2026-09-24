// Keep the transcript intact while limiting repeated selectable occurrences.
export function limitRepeatedRanges(parts,maximum=2){
 const occurrences=new Map(),keep=new Set()
 function collect(items,depth=0){for(const part of items){
  if(part.id){if(!occurrences.has(part.id))occurrences.set(part.id,[]);occurrences.get(part.id).push({part,depth})}
  if(part.children)collect(part.children,depth+(part.id?1:0))
 }}
 collect(parts)
 for(const all of occurrences.values()){
  if(all.length<=maximum){all.forEach(({part})=>keep.add(part));continue}
  // Prefer independently selectable words over the same word inside another phrase.
  const shallowest=Math.min(...all.map(p=>p.depth)),independent=all.filter(p=>p.depth===shallowest)
  const pool=independent.length>=maximum?independent:all
  for(let i=0;i<maximum;i++)keep.add(pool[Math.round(i*(pool.length-1)/Math.max(1,maximum-1))].part)
 }
 function prune(items){return items.flatMap(part=>{
  const children=part.children?prune(part.children):null
  if(part.id&&!keep.has(part))return children||[{text:part.text}]
  return [{...part,...(children?{children}:{})}]
 })}
 return prune(parts)
}
