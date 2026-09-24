// Reliable event queue, separate from the frequently replaced visual snapshot.
export class SentenceEvents {
  constructor(sender){this.sender=sender;this.sequence=0;this.session=null;this.pending=new Map();this.discarded=0}
  enqueue(phraseId){
    if(this.pending.size>=2048)throw new Error('문장 전송 대기열이 가득 찼습니다. 상영 연결을 확인하세요.')
    const sequence=++this.sequence,event={eventId:`${this.sender}:${sequence}`,senderId:this.sender,sequence,phraseId,sessionId:this.session}
    this.pending.set(event.eventId,event);return event
  }
  setSession(session){
    if(typeof session!=='string'||!session||session.length>100||session===this.session)return
    this.session=session
    for(const [id,event] of this.pending){
      if(event.sessionId&&event.sessionId!==session){this.pending.delete(id);this.discarded++}
      else event.sessionId=session
    }
  }
  acknowledge(id,session){if(session===this.session)this.pending.delete(id)}
  packets(){return this.session?[...this.pending.values()]:[]}
}
export function validSentenceEvent(event,session){
 return event&&event.sessionId===session&&typeof event.senderId==='string'&&event.senderId.length<=100&&Number.isSafeInteger(event.sequence)&&event.sequence>0&&event.eventId===`${event.senderId}:${event.sequence}`&&typeof event.phraseId==='string'&&event.phraseId.length>0&&event.phraseId.length<=100
}
