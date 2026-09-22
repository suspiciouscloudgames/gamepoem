export const EFFECT_LIFETIME=18000
export const directions=['up','down','left','right']
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v))
export function seed(index,salt=0){const n=Math.sin((index+1)*127.1+salt*311.7)*43758.5453;return n-Math.floor(n)}
export function pilePosition(index,portrait=false){
  const angle=seed(index)*Math.PI*2,radius=Math.sqrt(seed(index,1))
  return {x:.5+Math.cos(angle)*radius*(portrait?.27:.32),y:(portrait?.56:.64)+Math.sin(angle)*radius*(portrait?.30:.23),angle:(seed(index,2)-.5)*(portrait?46:58),scale:.78+seed(index,3)*.32,depth:Math.round(seed(index,4)*100)}
}
// Releasing at an edge sends the phrase; the closest edge wins at corners.
export function directionAt(x,y){
  const distances={left:x,right:1-x,up:y,down:1-y}
  const direction=Object.keys(distances).sort((a,b)=>distances[a]-distances[b])[0]
  return distances[direction]<=.12?direction:null
}
export function isEmission(item,now=Date.now()){
  return item.active===true&&directions.includes(item.direction)&&Number.isFinite(item.sentAt)&&item.sentAt<=now+2000&&now-item.sentAt<EFFECT_LIFETIME
}
