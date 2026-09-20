// Only real gestures publish state. Idle tabs must never erase another tablet.
export function connectScreen({display,room,onState,onStatus,getState}) {
  const hostId=`gamepoem-v2-screen-${room}`
  const sender=crypto.randomUUID()
  const role=display?'display':'tablet'
  const channel=typeof BroadcastChannel==='function'?new BroadcastChannel(`gamepoem-v2-${room}`):null
  let peer=null,upstream=null,retry=null,closed=false,generation=0,isHost=false,follower=false
  let lastAck=0,lastUpstreamAck=0,openedAt=0,lastAttempt=0,revision=0,latest=null,localState=null
  const clients=new Set()
  const packet=(type,extra={})=>({app:'gamepoem-v2',type,sender,role,...extra})
  const send=(conn,data)=>{try{if(conn?.open)conn.send(data)}catch{}}
  const fresh=data=>data&&Date.now()-data.changedAt<95000
  function status(message) {
    const connected=display?(isHost||Date.now()-lastAck<7000):Date.now()-lastAck<7000
    document.documentElement.dataset.screenConnection=connected?'connected':'waiting'
    document.documentElement.dataset.screenConnectionDetail=message
    onStatus?.(connected,message)
  }
  function sync(conn) {
    const data=display?latest:localState
    if(fresh(data))send(conn,data)
  }
  function receive(data,conn) {
    if(!data||data.app!=='gamepoem-v2'||data.sender===sender)return
    if(data.type==='ack') {
      lastAck=Date.now();if(conn===upstream)lastUpstreamAck=lastAck
      status('자동 연결됨')
      return
    }
    if(data.type==='hello') {
      if(display){const ack=packet('ack');conn?send(conn,ack):channel?.postMessage(ack)}
      if(conn)sync(conn)
      return
    }
    if(data.type!=='state'||!display||!Array.isArray(data.items)||data.items.length>80||!Number.isFinite(data.changedAt)||!Number.isFinite(data.revision)||!fresh(data))return
    // Full snapshots are replayed on reconnection, but old ones cannot take over.
    if(latest && (data.changedAt<latest.changedAt || (data.changedAt===latest.changedAt && (data.sender<latest.sender || (data.sender===latest.sender&&data.revision<=latest.revision)))))return
    latest=data;onState(data.items)
    channel?.postMessage(data)
    if(isHost)clients.forEach(client=>{if(client!==conn)send(client,data)})
    else if(conn!==upstream)send(upstream,data)
    conn?send(conn,packet('ack')):channel?.postMessage(packet('ack'))
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
      send(conn,packet('hello'));sync(conn)
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
      conn.on('open',()=>{send(conn,packet('ack'));sync(conn)})
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
      channel?.postMessage(packet('ack'))
      clients.forEach(conn=>send(conn,packet('ack')))
      if(latest&&!fresh(latest)){onState([]);latest=null}
    } else channel?.postMessage(packet('hello'))
    if(upstream?.open) {
      send(upstream,packet('hello'))
      if(Date.now()-lastUpstreamAck>12000){const stale=upstream;upstream=null;stale.close()}
    }
    if(peer?.open&&!isHost&&!upstream&&Date.now()-lastAttempt>3000)dial()
    if(!peer?.open&&Date.now()-openedAt>15000)schedule()
    if(!display)status(Date.now()-lastAck<7000?'자동 연결됨':'영상 화면을 기다리는 중')
  },2000)
  const resume=()=>{if(closed)return;if(peer?.disconnected)schedule(300);else if(!isHost)dial()}
  window.addEventListener('online',resume)
  const visible=()=>{if(!document.hidden)resume()}
  document.addEventListener('visibilitychange',visible)
  boot()
  return {publish,close(){closed=true;++generation;clearInterval(heartbeat);clearTimeout(retry);channel?.close();peer?.destroy();window.removeEventListener('online',resume);document.removeEventListener('visibilitychange',visible)}}
}
