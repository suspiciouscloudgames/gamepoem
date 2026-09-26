// Only the tablet installs this updater. Display/Electron pages never reload here.
export function createTabletUpdater({canReload}){
  const current=document.querySelector('meta[name="tablet-release"]')?.content
  if(!current)return {atRestart(){},check(){}}
  let pending=null,checking=false,reloading=false,lastInteraction=Date.now(),verifiedAt=0
  const markActive=()=>{lastInteraction=Date.now()}
  for(const event of ['pointerdown','pointermove','touchstart','keydown'])document.addEventListener(event,markActive,{passive:true,capture:true})
  function apply(restarted=false){
    if(!pending||reloading||document.hidden||navigator.onLine===false||Date.now()-verifiedAt>90000||!canReload())return
    if(!restarted&&Date.now()-lastInteraction<60000)return
    // A failed/cached navigation must not cause a reload loop for the same release.
    try{if(sessionStorage.getItem('tablet-update-attempt')===pending)return}catch{}
    reloading=true
    try{sessionStorage.setItem('tablet-update-attempt',pending)}catch{}
    const url=new URL(location.href)
    url.searchParams.set('_release',pending)
    location.replace(url.href)
  }
  async function check(){
    if(checking||reloading||document.hidden||navigator.onLine===false)return
    checking=true;pending=null
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000)
    try{
      const url=new URL('./index.html',location.href)
      url.searchParams.set('_versionCheck',String(Date.now()))
      const response=await fetch(url,{cache:'no-store',signal:controller.signal})
      if(!response.ok)return
      const html=new DOMParser().parseFromString(await response.text(),'text/html')
      const version=html.querySelector('meta[name="tablet-release"]')?.content
      if(!version||version===current||!/^[a-zA-Z0-9._-]{1,80}$/.test(version)){pending=null;return}
      // Check module dependencies too: a successful entry file alone cannot boot the app.
      const verified=new Set()
      async function verifyAsset(asset,module=false){
        if(asset.origin!==location.origin)throw new Error('Unexpected external release asset')
        if(verified.has(asset.href))return
        if(verified.size>=80)throw new Error('Release asset graph too large')
        verified.add(asset.href)
        const result=await fetch(asset,{cache:'reload',signal:controller.signal})
        if(!result.ok||/text\/html/i.test(result.headers.get('content-type')||''))throw new Error('Release asset unavailable')
        const source=await result.text()
        if(!module)return
        const imports=[...source.matchAll(/\b(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"]([^'"]+)['"]/g),...source.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)]
        await Promise.all(imports.map(match=>verifyAsset(new URL(match[1],asset),true)))
      }
      for(const node of html.querySelectorAll('script[type="module"][src],link[rel="stylesheet"][href]')){
        const asset=new URL(node.getAttribute('src')||node.getAttribute('href'),url)
        await verifyAsset(asset,node.tagName==='SCRIPT')
      }
      pending=version;verifiedAt=Date.now();apply()
    }catch{
      pending=null
      // Offline/timeouts leave the current poem and page intact.
    }finally{clearTimeout(timeout);checking=false}
  }
  setInterval(check,30000)
  window.addEventListener('online',check)
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()})
  void check()
  return {check,atRestart(){apply(true)}}
}
