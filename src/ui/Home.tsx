import React from 'react'
import type { SourcePack } from '../types'
import { readZip } from '../lib/zip'

export function Home({packs,setPacks,onOpenHUD}:{packs:SourcePack[],setPacks:(p:SourcePack[])=>void,onOpenHUD:()=>void}){
  const onDrop = async (files: FileList | null) => {
    if (!files) return
    const loaded: SourcePack[] = []
    for (const f of Array.from(files)) {
      if (!f.name.toLowerCase().endsWith('.zip')) continue
      loaded.push(await readZip(f))
    }
    setPacks([...packs, ...loaded])
  }
  return (
    <div className="grid" style={{marginTop:16, gap:16}}>
      <section className="panel">
        <div className="row" style={{justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:18, fontWeight:800}}>Your packs</div>
            <div className="muted">Drag & drop .zip resource packs below</div>
          </div>
          <button className="btn" onClick={()=>document.getElementById('file')?.click()}>Import packs</button>
          <input id="file" type="file" accept=".zip" multiple style={{display:'none'}} onChange={e=>onDrop(e.target.files)} />
        </div>
        <div className="drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault(); onDrop(e.dataTransfer.files)}}>
          Drop .zip packs here
        </div>
        <div style={{marginTop:10, display:'flex', gap:8, flexWrap:'wrap'}}>
          {packs.map(p=> <span key={p.id} className="pill">{p.name}{p.packFormat?` · format ${p.packFormat}`:''}</span>)}
          {packs.length===0 && <span className="muted">No packs yet</span>}
        </div>
      </section>
      <section>
        <div className="grid collections">
          <div className="card">
            <h3>HUD</h3>
            <p>Hotbar, hearts, XP bar, horse HUD. Visually pick sources and preview live.</p>
            <button className="btn primary" onClick={onOpenHUD}>Open Builder</button>
          </div>
          <div className="card">
            <h3>Blocks (CTM)</h3>
            <p>Coming soon: Connected textures preview + rules.</p>
            <button className="btn" disabled>Coming soon</button>
          </div>
          <div className="card">
            <h3>Entities</h3>
            <p>Mob galleries & variant picker.</p>
            <button className="btn" disabled>Coming soon</button>
          </div>
        </div>
      </section>
    </div>
  )
}
