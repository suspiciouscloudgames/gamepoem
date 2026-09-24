const folder=new URL('./pictures/',import.meta.url)
const supported=/\.(jpe?g|png|webp|avif)$/i
export async function loadPictureList(){
  const files=new Set()
  // Static hosting uses the manifest; the local preview can also discover newly dropped files.
  await Promise.all([
    fetch(new URL('manifest.json',folder),{cache:'no-store'}).then(r=>r.ok?r.json():[]).then(list=>{
      if(Array.isArray(list))for(const name of list)if(typeof name==='string'&&!/[\\/]/.test(name)&&supported.test(name))files.add(name)
    }).catch(()=>{}),
    fetch(folder,{cache:'no-store'}).then(r=>r.ok?r.text():'').then(html=>{
      const doc=new DOMParser().parseFromString(html,'text/html')
      for(const a of doc.querySelectorAll('a[href]')){
        try{const url=new URL(a.getAttribute('href'),folder)
          if(url.origin!==folder.origin||!url.pathname.startsWith(folder.pathname))continue
          const name=decodeURIComponent(url.pathname.slice(folder.pathname.length))
          if(name&&!/[\\/]/.test(name)&&supported.test(name))files.add(name)
        }catch{}
      }
    }).catch(()=>{})
  ])
  return [...files].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).map(name=>new URL(encodeURIComponent(name),folder).href)
}
export function createPoemPictures(host){
  const gallery=document.createElement('section');gallery.className='poem-pictures empty';gallery.setAttribute('aria-label','시노프 사진')
  const stage=document.createElement('div');stage.className='poem-photo-stage'
  gallery.append(stage);host.append(gallery)
  const entries=new Map();let active=null,files=[],loading=null,language='ko'
  const labels=()=>({ko:['시노프 사진','나타난 사진들','시노프에서 찍은 사진'],en:['Sinop photographs','Revealed photographs','Photograph taken in Sinop'],tr:['Sinop fotoğrafları','Ortaya çıkan fotoğraflar','Sinop’ta çekilen fotoğraf']}[language])
  function show(entry){
    if(!entry.url||active===entry)return
    active=entry
    const image=document.createElement('img');image.alt=labels()[2];image.decoding='async'
    // onload is sufficient here; some Safari versions stall decode() on detached images.
    image.onload=()=>{
      if(active!==entry)return
      image.alt=labels()[2]
      // Keep the fully visible previous photograph underneath until the new one is opaque.
      const previous=[...stage.children]
      const finish=()=>{previous.forEach(node=>node.remove());image.classList.remove('arriving')}
      if(!window.matchMedia('(prefers-reduced-motion:reduce)').matches){
        image.classList.add('arriving')
        image.addEventListener('animationend',finish,{once:true})
      }
      stage.append(image);gallery.classList.remove('empty')
      if(!image.classList.contains('arriving'))finish()
    }
    // A failed replacement must not erase the photograph already on screen.
    image.onerror=()=>{}
    image.src=entry.url
  }
  async function populate(){
    if(!loading)loading=loadPictureList().then(list=>{files=list}).finally(()=>{loading=null})
    await loading
    if(!files.length)return
    let index=0,last=null
    for(const entry of entries.values()){
      if(!entry.url){
        entry.url=files[index%files.length]
        last=entry
      }
      index++
    }
    if(last)show(last)
  }
  return {reset(){active=null;entries.clear();stage.textContent='';gallery.classList.add('empty')},setLanguage(code){language=code;gallery.setAttribute('aria-label',labels()[0]);stage.querySelectorAll('img').forEach(img=>img.alt=labels()[2])},reveal(id){if(entries.has(id))return;entries.set(id,{id});void populate()}}
}
