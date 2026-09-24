import {SentenceEvents,validSentenceEvent} from './sentence-events.js'
// Only real gestures publish state. Idle tabs must never erase another tablet.
export function connectScreen({display,room,onState,onStatus,getState,onControl,onProgress,onTrigger,screenSession}) {
  const hostId=`gamepoem-v2-screen-${room}`
  const sender=typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():`tablet-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
  const role=display?'display':'tablet'
  const events=new SentenceEvents(sender)
  const screenAck=()=>packet('ack',screenSession?{screenSession}:{})
  function flushEvents(){for(const event of events.packets()){const data=packet('sentence-trigger',{event,room});channel?.postMessage(data);send(upstream,data)}}
  let channel=null
  try{if(typeof BroadcastChannel==='function')channel=new BroadcastChannel(`gamepoem-v2-${room}`)}catch{}
  let peer=null,upstream=null,retry=null,closed=false,generation=0,isHost=false,follower=false
  let lastAck=0,lastUpstreamAck=0,openedAt=0,lastAttempt=0,revision=0,latest=null,localState=null
  const clients=new Set()
  let latestProgress=null,latestControl=null,progressRevision=0
  const packet=(type,extra={})=>({app:'gamepoem-v2',type,sender,role,...extra})
  const send=(conn,data)=>{try{if(conn?.open)conn.send(data)}catch{}}
  const fresh=data=>data&&Date.now()-data.changedAt<(data.items?.some(item=>item.kind==='poem')?1800000:95000)
  const seenControls=new Set()
  function status(message) {
    const connected=display?(isHost||Date.now()-lastAck<7000):Date.now()-lastAck<7000
    document.documentElement.dataset.screenConnection=connected?'connected':'waiting'
    document.documentElement.dataset.screenConnectionDetail=message
    onStatus?.(connected,message)
  }
  function sync(conn) {
    const data=display?latest:localState
    if(fresh(data))send(conn,data)
    if(latestControl)send(conn,latestControl)
    if(latestProgress&&Date.now()-latestProgress.sentAt<6000)send(conn,latestProgress)
  }
  function receive(data,conn) {
    if(!data||data.app!=='gamepoem-v2'||data.sender===sender)return
    if(data.type==='progress'&&data.role==='display'){
      if(!Number.isFinite(data.progress)||data.progress<0||data.progress>1||!Number.isFinite(data.sentAt)||Date.now()-data.sentAt>6000||!['playing','paused','ending'].includes(data.phase)||typeof data.eventId!=='string')return
      if(seenControls.has(data.eventId)||latestProgress&&data.sentAt<latestProgress.sentAt)return
      seenControls.add(data.eventId);if(seenControls.size>100)seenControls.delete(seenControls.values().next().value)
      latestProgress=data;onProgress?.(data)
      channel?.postMessage(data)
      if(isHost)clients.forEach(client=>{if(client!==conn)send(client,data)})
      else if(conn!==upstream)send(upstream,data)
      return
    }
    if(data.type==='cycle'&&data.role==='display'&&typeof data.token==='string'&&typeof data.eventId==='string'){
      if(seenControls.has(data.eventId))return
      seenControls.add(data.eventId);if(seenControls.size>100)seenControls.delete(seenControls.values().next().value)
      latestControl=data;onControl?.(data)
      channel?.postMessage(data)
      if(isHost)clients.forEach(client=>{if(client!==conn)send(client,data)})
      else if(conn!==upstream)send(upstream,data)
      return
    }
    if(data.type==='trigger-ack'&&!display&&data.room===room){events.acknowledge(data.eventId,data.sessionId);return}
    if(data.type==='sentence-trigger'&&display&&data.room===room&&screenSession&&validSentenceEvent(data.event,screenSession)){
      onTrigger?.(data.event,()=>{const ack=packet('trigger-ack',{room,eventId:data.event.eventId,sessionId:screenSession});conn?send(conn,ack):channel?.postMessage(ack)})
      return
    }
    if(data.type==='ack') {
      if(!display&&data.screenSession){events.setSession(data.screenSession);flushEvents()}
      lastAck=Date.now();if(conn===upstream)lastUpstreamAck=lastAck
      status('자동 연결됨')
      return
    }
    if(data.type==='hello') {
      if(display){const ack=screenAck();conn?send(conn,ack):channel?.postMessage(ack)}
      if(conn)sync(conn)
      return
    }
    if(data.type!=='state'||!display||!Array.isArray(data.items)||data.items.length>256||!Number.isFinite(data.changedAt)||!Number.isFinite(data.revision)||!fresh(data))return
    // Full snapshots are replayed on reconnection, but old ones cannot take over.
    if(latest && (data.changedAt<latest.changedAt || (data.changedAt===latest.changedAt && (data.sender<latest.sender || (data.sender===latest.sender&&data.revision<=latest.revision)))))return
    latest=data;onState(data.items)
    channel?.postMessage(data)
    if(isHost)clients.forEach(client=>{if(client!==conn)send(client,data)})
    else if(conn!==upstream)send(upstream,data)
    conn?send(conn,screenAck()):channel?.postMessage(screenAck())
  }
  if(channel)channel.onmessage=event=>receive(event.data)
  function publish(items) {
    if(display||closed)return
    localState=packet('state',{items,changedAt:Date.now(),revision:++revision})
    channel?.postMessage(localState);send(upstream,localState)
  }
  function schedule(delay=2500) {
    if(retry||closed)return
    retry=setTimeout(()=>{retry=null;boot()},delay)
  }
  function dial() {
    if(closed||!peer?.open||isHost||upstream)return
    lastAttempt=Date.now()
    const current=generation,conn=peer.connect(hostId,{serialization:'json',reliable:true})
    upstream=conn;lastUpstreamAck=Date.now()
    const timeout=setTimeout(()=>{if(upstream===conn&&!conn.open){upstream=null;conn.close()}},10000)
    conn.on('open',()=>{
      if(current!==generation)return
      clearTimeout(timeout);lastUpstreamAck=Date.now()
      send(conn,packet('hello'));sync(conn);flushEvents()
    })
    conn.on('data',data=>receive(data,conn))
    const lost=()=>{clearTimeout(timeout);if(upstream===conn)upstream=null}
    conn.on('close',lost);conn.on('error',lost)
  }
  function boot() {
    if(closed)return
    const current=++generation
    upstream=null;clients.clear();isHost=false;openedAt=Date.now()
    peer?.destroy()
    if(typeof window.Peer!=='function'){status('연결 준비 중');schedule();return}
    try{peer=display&&!follower?new Peer(hostId,{debug:0}):new Peer({debug:0})}catch{schedule();return}
    peer.on('open',()=>{
      if(current!==generation)return
      isHost=display&&!follower;openedAt=Date.now()
      status(isHost?'자동 연결 대기':'자동 연결 중')
      if(!isHost)dial()
    })
    peer.on('connection',conn=>{
      if(!display||current!==generation||clients.size>=16){conn.close();return}
      clients.add(conn)
      conn.on('data',data=>receive(data,conn))
      conn.on('open',()=>{send(conn,screenAck());sync(conn)})
      conn.on('close',()=>clients.delete(conn));conn.on('error',()=>clients.delete(conn))
    })
    peer.on('disconnected',()=>{if(current===generation)schedule()})
    peer.on('error',error=>{
      if(current!==generation)return
      if(error.type==='unavailable-id'&&display){follower=true;schedule(300);return}
      if(error.type==='peer-unavailable') {
        upstream?.close();upstream=null
        // Another screen may have closed: this screen can take over hosting.
        if(display&&follower){follower=false;schedule()}
        return
      }
      status('자동 재연결 중');schedule()
    })
  }
  const heartbeat=setInterval(()=>{
    if(display) {
      channel?.postMessage(screenAck())
      clients.forEach(conn=>send(conn,screenAck()))
      if(latest&&!fresh(latest)){onState([]);latest=null}
    } else channel?.postMessage(packet('hello'))
    if(upstream?.open) {
      send(upstream,packet('hello'))
      if(Date.now()-lastUpstreamAck>12000){const stale=upstream;upstream=null;stale.close()}
    }
    if(peer?.open&&!isHost&&!upstream&&Date.now()-lastAttempt>3000)dial()
    if(!peer?.open&&Date.now()-openedAt>15000)schedule()
    if(!display){flushEvents();document.documentElement.dataset.triggerPending=String(events.pending.size)}
    if(!display)status(Date.now()-lastAck<7000?'자동 연결됨':'영상 화면을 기다리는 중')
  },2000)
  const resume=()=>{if(closed)return;if(peer?.disconnected)schedule(300);else if(!isHost)dial()}
  window.addEventListener('online',resume)
  const visible=()=>{if(!document.hidden)resume()}
  document.addEventListener('visibilitychange',visible)
  boot()
  return {publish,publishTrigger(phraseId){events.enqueue(phraseId);flushEvents()},reportProgress(progress,phase,currentTime,cycle){
    if(!display||closed||!Number.isFinite(progress))return
    const data=packet('progress',{progress:Math.max(0,Math.min(1,progress)),phase,...(Number.isFinite(currentTime)&&currentTime>=0&&typeof cycle==='string'?{currentTime,cycle}:{}),sentAt:Date.now(),eventId:sender+'-progress-'+(++progressRevision)})
    latestProgress=data;seenControls.add(data.eventId);if(seenControls.size>100)seenControls.delete(seenControls.values().next().value)
    channel?.postMessage(data);clients.forEach(client=>send(client,data));send(upstream,data)
  },completePoem(token){if(!display||closed)return;const data=packet('cycle',{token,eventId:sender+'-'+Date.now()});latestControl=data;seenControls.add(data.eventId);channel?.postMessage(data);clients.forEach(client=>send(client,data));send(upstream,data)},close(){closed=true;++generation;clearInterval(heartbeat);clearTimeout(retry);channel?.close();peer?.destroy();window.removeEventListener('online',resume);document.removeEventListener('visibilitychange',visible)}}
}
