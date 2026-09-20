export function connectScreen({display,room,onState,onStatus,getState}) {
  const peerId = `gamepoem-v1-screen-${room}`
  const sender = crypto.randomUUID()
  let peer = null, connection = null, retry = null, closed = false, generation = 0
  let lastAck = 0, lastState = null
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(`gamepoem-v1-${room}`) : null
  const connections = new Set()
  const packet = (type, extra={}) => ({app:'gamepoem-v1',type,sender,...extra})
  const send = (target,data) => {try { if(target?.open) target.send(data) } catch {}}
  function status(message) {onStatus?.(Date.now()-lastAck < 7000,message)}
  function receive(data,target) {
    if(!data || data.app!=='gamepoem-v1' || data.sender===sender) return
    if(display && data.type==='state' && Array.isArray(data.items) && data.items.length<=80) {
      lastState=Date.now(); onState(data.items)
      const ack=packet('ack'); if(target) send(target,ack); else channel?.postMessage(ack)
    } else if(!display && data.type==='ack') {
      lastAck=Date.now(); status('영상 화면과 연결되어 있습니다.')
    } else if(display && data.type==='hello') {
      if(target) send(target,packet('ack')); else channel?.postMessage(packet('ack'))
    }
  }
  if(channel) channel.onmessage=event=>receive(event.data)
  function publish(items) {
    const data=packet('state',{items})
    channel?.postMessage(data)
    send(connection,data)
  }
  function schedule() {
    if(retry || closed) return
    retry=setTimeout(()=>{retry=null;boot()},7000)
  }
  function boot() {
    if(closed) return
    if(typeof window.Peer!=='function') {status('연결 기능을 불러오지 못했습니다. 새로고침해주세요.');return}
    const current=++generation
    connection=null
    connections.clear()
    if(peer) peer.destroy()
    try {peer=display?new Peer(peerId,{debug:0}):new Peer({debug:0})} catch {schedule();return}
    peer.on('open',()=>{
      if(current!==generation)return
      if(display) return
      connection=peer.connect(peerId,{serialization:'json',reliable:true})
      connection.on('open',()=>{send(connection,packet('hello'));publish(getState())})
      connection.on('data',data=>receive(data,connection))
      connection.on('close',()=>{if(current===generation){connection=null;schedule()}})
      connection.on('error',()=>{if(current===generation)schedule()})
    })
    peer.on('connection',conn=>{
      if(!display || connections.size>=4) {conn.close();return}
      connections.add(conn)
      conn.on('data',data=>receive(data,conn))
      conn.on('open',()=>send(conn,packet('ack')))
      conn.on('close',()=>connections.delete(conn))
      conn.on('error',()=>connections.delete(conn))
    })
    peer.on('disconnected',()=>{if(current===generation)schedule()})
    peer.on('error',error=>{
      if(current!==generation)return
      status(error.type==='peer-unavailable'?'영상 화면을 먼저 열어주세요.':'연결을 다시 시도하고 있습니다. 두 기기의 인터넷 연결을 확인해주세요.')
      schedule()
    })
  }
  const heartbeat=setInterval(()=>{
    if(display) {
      channel?.postMessage(packet('ack'))
      connections.forEach(conn=>send(conn,packet('ack')))
      if(lastState && Date.now()-lastState>95000) {onState([]);lastState=null}
    } else {
      channel?.postMessage(packet('hello'))
      send(connection,packet('hello'))
      // Send complete state periodically so reconnects never retain outdated layers.
      if(Date.now()-lastAck<7000) publish(getState())
      status(Date.now()-lastAck<7000?'영상 화면과 연결되어 있습니다.':'영상 화면을 먼저 열어주세요. 연결되지 않아도 문장은 움직일 수 있습니다.')
    }
  },2000)
  window.addEventListener('online',()=>schedule())
  boot()
  return {publish,close(){closed=true;clearInterval(heartbeat);clearTimeout(retry);channel?.close();peer?.destroy()}}
}
